use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use rodio::{Decoder, OutputStream, OutputStreamHandle, Sink, Source};
use std::collections::{HashMap, VecDeque};
use std::fs::File;
use std::io::BufReader;
use std::sync::{mpsc, Arc, Mutex};
use std::thread;
use std::time::Duration;

use crate::voice_fx::SharedVoiceFx;

pub enum AudioCommand {
    Play {
        id: String,
        file_path: String,
        volume: f32,
        looping: bool,
        speed: f32,
        fade_in: f64,
        fade_out: f64,
    },
    Stop {
        id: String,
    },
    StopAll,
    SetVolume {
        id: String,
        volume: f32,
    },
    SetMasterVolume {
        volume: f32,
    },
    SetSpeed {
        id: String,
        speed: f32,
    },
    SetOutputDevice {
        device_name: String,
        reply: mpsc::Sender<Result<(), String>>,
    },
    SetSecondaryDevice {
        device_name: String,
        reply: mpsc::Sender<Result<(), String>>,
    },
    SetDualOutput {
        enabled: bool,
    },
    GetPlaying {
        reply: mpsc::Sender<Vec<String>>,
    },
    PlayTestSecondary {
        reply: mpsc::Sender<Result<(), String>>,
    },
    SetSilentMode {
        enabled: bool,
    },
}

fn open_output_for_device(device_name: &str) -> Result<(OutputStream, OutputStreamHandle), String> {
    println!("[AUDIO] open_output_for_device: '{}'", device_name);
    if device_name == "default" || device_name.is_empty() {
        OutputStream::try_default().map_err(|e| format!("Failed to open default output: {}", e))
    } else {
        let host = cpal::default_host();
        let devices = host.output_devices().map_err(|e| format!("Cannot list devices: {}", e))?;
        let mut found_names = Vec::new();
        for dev in devices {
            if let Ok(name) = dev.name() {
                found_names.push(name.clone());
                if name == device_name {
                    println!("[AUDIO] Found matching device: '{}'", name);
                    return OutputStream::try_from_device(&dev)
                        .map_err(|e| format!("Failed to open device '{}': {}", device_name, e));
                }
            }
        }
        println!("[AUDIO] Device '{}' NOT found. Available devices: {:?}", device_name, found_names);
        Err(format!("Audio device '{}' not found. Available: {:?}", device_name, found_names))
    }
}

struct SoundSinks {
    primary: Sink,
    secondary: Option<Sink>,
}

pub struct AudioHandle {
    sender: mpsc::Sender<AudioCommand>,
}

impl AudioHandle {
    pub fn clone_handle(&self) -> Self {
        Self { sender: self.sender.clone() }
    }

    pub fn new() -> Result<Self, String> {
        let (sender, receiver) = mpsc::channel::<AudioCommand>();

        thread::spawn(move || {
            let (mut _stream, mut stream_handle) = OutputStream::try_default()
                .expect("Failed to open audio output");

            let mut _secondary_stream: Option<OutputStream> = None;
            let mut secondary_handle: Option<OutputStreamHandle> = None;
            let mut dual_output: bool = false;

            let mut sinks: HashMap<String, SoundSinks> = HashMap::new();
            let mut volumes: HashMap<String, f32> = HashMap::new();
            let mut master_volume: f32 = 1.0;
            let mut silent_mode: bool = false;

            loop {
                // Clean finished sinks
                let finished: Vec<String> = sinks
                    .iter()
                    .filter(|(_, ss)| ss.primary.empty() && ss.secondary.as_ref().map_or(true, |s| s.empty()))
                    .map(|(id, _)| id.clone())
                    .collect();
                for id in finished {
                    sinks.remove(&id);
                    volumes.remove(&id);
                }

                match receiver.recv() {
                    Ok(cmd) => match cmd {
                        AudioCommand::Play { id, file_path, volume, looping, speed, fade_in, fade_out } => {
                            // Stop existing
                            if let Some(ss) = sinks.remove(&id) {
                                ss.primary.stop();
                                if let Some(sec) = ss.secondary { sec.stop(); }
                            }

                            // Primary sink — muted in silent mode (sounds only go to Discord/secondary)
                            let file = match File::open(&file_path) {
                                Ok(f) => f,
                                Err(e) => { eprintln!("Cannot open file {}: {}", file_path, e); continue; }
                            };
                            let source = match Decoder::new(BufReader::new(file)) {
                                Ok(s) => s,
                                Err(e) => { eprintln!("Cannot decode audio {}: {}", file_path, e); continue; }
                            };
                            let sink = match Sink::try_new(&stream_handle) {
                                Ok(s) => s,
                                Err(e) => { eprintln!("Cannot create sink: {}", e); continue; }
                            };
                            let effective_volume = volume * master_volume;
                            // When silent mode is on, mute primary (speakers) so only secondary (Discord) gets audio
                            sink.set_volume(if silent_mode { 0.0 } else { effective_volume });
                            sink.set_speed(speed.max(0.1).min(3.0));
                            let fi_dur = Duration::from_secs_f64(fade_in.max(0.0));
                            let _ = fade_out; // fade_out persisted for future implementation
                            if looping {
                                if fi_dur.as_millis() > 0 {
                                    sink.append(source.repeat_infinite().fade_in(fi_dur));
                                } else {
                                    sink.append(source.repeat_infinite());
                                }
                            } else if fi_dur.as_millis() > 0 {
                                sink.append(source.fade_in(fi_dur));
                            } else {
                                sink.append(source);
                            }

                            // Secondary sink (dual output)
                            let secondary_sink = if dual_output {
                                if let Some(ref sec_handle) = secondary_handle {
                                    let file2 = match File::open(&file_path) {
                                        Ok(f) => f,
                                        Err(_) => { volumes.insert(id.clone(), volume); sinks.insert(id, SoundSinks { primary: sink, secondary: None }); continue; }
                                    };
                                    let source2 = match Decoder::new(BufReader::new(file2)) {
                                        Ok(s) => s,
                                        Err(_) => { volumes.insert(id.clone(), volume); sinks.insert(id, SoundSinks { primary: sink, secondary: None }); continue; }
                                    };
                                    match Sink::try_new(sec_handle) {
                                        Ok(s2) => {
                                            s2.set_volume(effective_volume);
                                            s2.set_speed(speed.max(0.1).min(3.0));
                                            if looping {
                                                if fi_dur.as_millis() > 0 {
                                                    s2.append(source2.repeat_infinite().fade_in(fi_dur));
                                                } else {
                                                    s2.append(source2.repeat_infinite());
                                                }
                                            } else if fi_dur.as_millis() > 0 {
                                                s2.append(source2.fade_in(fi_dur));
                                            } else {
                                                s2.append(source2);
                                            }
                                            Some(s2)
                                        }
                                        Err(e) => { eprintln!("Secondary sink error: {}", e); None }
                                    }
                                } else { None }
                            } else { None };

                            volumes.insert(id.clone(), volume);
                            sinks.insert(id, SoundSinks { primary: sink, secondary: secondary_sink });
                        }
                        AudioCommand::Stop { id } => {
                            if let Some(ss) = sinks.remove(&id) {
                                ss.primary.stop();
                                if let Some(sec) = ss.secondary { sec.stop(); }
                            }
                            volumes.remove(&id);
                        }
                        AudioCommand::StopAll => {
                            for (_, ss) in sinks.drain() {
                                ss.primary.stop();
                                if let Some(sec) = ss.secondary { sec.stop(); }
                            }
                            volumes.clear();
                        }
                        AudioCommand::SetVolume { id, volume } => {
                            volumes.insert(id.clone(), volume);
                            if let Some(ss) = sinks.get(&id) {
                                let eff = volume * master_volume;
                                ss.primary.set_volume(eff);
                                if let Some(ref sec) = ss.secondary { sec.set_volume(eff); }
                            }
                        }
                        AudioCommand::SetMasterVolume { volume } => {
                            master_volume = volume;
                            for (id, ss) in &sinks {
                                let individual = volumes.get(id).copied().unwrap_or(1.0);
                                let eff = individual * master_volume;
                                ss.primary.set_volume(eff);
                                if let Some(ref sec) = ss.secondary { sec.set_volume(eff); }
                            }
                        }
                        AudioCommand::SetSpeed { id, speed } => {
                            if let Some(ss) = sinks.get(&id) {
                                let s = speed.max(0.1).min(3.0);
                                ss.primary.set_speed(s);
                                if let Some(ref sec) = ss.secondary { sec.set_speed(s); }
                            }
                        }
                        AudioCommand::SetOutputDevice { device_name, reply } => {
                            for (_, ss) in sinks.drain() {
                                ss.primary.stop();
                                if let Some(sec) = ss.secondary { sec.stop(); }
                            }
                            volumes.clear();
                            match open_output_for_device(&device_name) {
                                Ok((new_stream, new_handle)) => {
                                    _stream = new_stream;
                                    stream_handle = new_handle;
                                    reply.send(Ok(())).ok();
                                }
                                Err(e) => {
                                    eprintln!("Device switch failed: {}", e);
                                    reply.send(Err(e)).ok();
                                }
                            }
                        }
                        AudioCommand::SetSecondaryDevice { device_name, reply } => {
                            println!("[AUDIO] SetSecondaryDevice: '{}'", device_name);
                            // Stop secondary sinks
                            for (_, ss) in sinks.iter_mut() {
                                if let Some(sec) = ss.secondary.take() { sec.stop(); }
                            }
                            if device_name.is_empty() || device_name == "none" {
                                println!("[AUDIO] Clearing secondary device");
                                _secondary_stream = None;
                                secondary_handle = None;
                                reply.send(Ok(())).ok();
                            } else {
                                match open_output_for_device(&device_name) {
                                    Ok((new_stream, new_handle)) => {
                                        println!("[AUDIO] Secondary device opened successfully: '{}'", device_name);
                                        _secondary_stream = Some(new_stream);
                                        secondary_handle = Some(new_handle);
                                        reply.send(Ok(())).ok();
                                    }
                                    Err(e) => {
                                        eprintln!("[AUDIO] Secondary device FAILED: {}", e);
                                        _secondary_stream = None;
                                        secondary_handle = None;
                                        reply.send(Err(e)).ok();
                                    }
                                }
                            }
                        }
                        AudioCommand::SetDualOutput { enabled } => {
                            println!("[AUDIO] SetDualOutput: {}", enabled);
                            dual_output = enabled;
                            if !enabled {
                                // Stop all secondary sinks
                                for (_, ss) in sinks.iter_mut() {
                                    if let Some(sec) = ss.secondary.take() { sec.stop(); }
                                }
                            }
                        }
                        AudioCommand::PlayTestSecondary { reply } => {
                            println!("[AUDIO] PlayTestSecondary - dual_output: {}, secondary_handle: {}", dual_output, secondary_handle.is_some());
                            if let Some(ref sec_handle) = secondary_handle {
                                match Sink::try_new(sec_handle) {
                                    Ok(test_sink) => {
                                        let source = rodio::source::SineWave::new(440.0)
                                            .take_duration(std::time::Duration::from_millis(800))
                                            .amplify(0.3 * master_volume);
                                        test_sink.append(source);
                                        // Remove old test if any
                                        if let Some(old) = sinks.remove("__test__") {
                                            old.primary.stop();
                                            if let Some(s) = old.secondary { s.stop(); }
                                        }
                                        // Keep the sink alive with a dummy primary
                                        let dummy = Sink::try_new(&stream_handle).unwrap();
                                        sinks.insert("__test__".to_string(), SoundSinks { primary: dummy, secondary: Some(test_sink) });
                                        reply.send(Ok(())).ok();
                                    }
                                    Err(e) => { reply.send(Err(format!("Impossible de jouer le test: {}", e))).ok(); }
                                }
                            } else {
                                reply.send(Err("Aucun périphérique secondaire configuré".into())).ok();
                            }
                        }
                        AudioCommand::GetPlaying { reply } => {
                            let playing: Vec<String> = sinks
                                .iter()
                                .filter(|(_, ss)| !ss.primary.empty())
                                .map(|(id, _)| id.clone())
                                .collect();
                            reply.send(playing).ok();
                        }
                        AudioCommand::SetSilentMode { enabled } => {
                            silent_mode = enabled;
                            // Update volume on all playing sinks immediately
                            for (id, ss) in &sinks {
                                let individual = volumes.get(id).copied().unwrap_or(1.0);
                                let eff = if enabled { 0.0 } else { individual * master_volume };
                                ss.primary.set_volume(eff);
                            }
                        }
                    },
                    Err(_) => break,
                }
            }
        });

        Ok(Self { sender })
    }

    pub fn play(&self, id: &str, file_path: &str, volume: f32, looping: bool, speed: f32, fade_in: f64, fade_out: f64) -> Result<(), String> {
        self.sender
            .send(AudioCommand::Play { id: id.to_string(), file_path: file_path.to_string(), volume, looping, speed, fade_in, fade_out })
            .map_err(|e| format!("Audio thread error: {}", e))
    }

    pub fn stop(&self, id: &str) -> Result<(), String> {
        self.sender.send(AudioCommand::Stop { id: id.to_string() }).map_err(|e| format!("Audio thread error: {}", e))
    }

    pub fn stop_all(&self) -> Result<(), String> {
        self.sender.send(AudioCommand::StopAll).map_err(|e| format!("Audio thread error: {}", e))
    }

    pub fn set_volume(&self, id: &str, volume: f32) -> Result<(), String> {
        self.sender.send(AudioCommand::SetVolume { id: id.to_string(), volume }).map_err(|e| format!("Audio thread error: {}", e))
    }

    pub fn set_speed(&self, id: &str, speed: f32) -> Result<(), String> {
        self.sender.send(AudioCommand::SetSpeed { id: id.to_string(), speed }).map_err(|e| format!("Audio thread error: {}", e))
    }

    pub fn set_master_volume(&self, volume: f32) -> Result<(), String> {
        self.sender.send(AudioCommand::SetMasterVolume { volume }).map_err(|e| format!("Audio thread error: {}", e))
    }

    pub fn set_output_device(&self, device_name: &str) -> Result<(), String> {
        let (reply_tx, reply_rx) = mpsc::channel();
        self.sender.send(AudioCommand::SetOutputDevice { device_name: device_name.to_string(), reply: reply_tx })
            .map_err(|e| format!("Audio thread error: {}", e))?;
        reply_rx.recv_timeout(std::time::Duration::from_secs(5)).map_err(|e| format!("Audio thread timeout: {}", e))?
    }

    pub fn set_secondary_device(&self, device_name: &str) -> Result<(), String> {
        let (reply_tx, reply_rx) = mpsc::channel();
        self.sender.send(AudioCommand::SetSecondaryDevice { device_name: device_name.to_string(), reply: reply_tx })
            .map_err(|e| format!("Audio thread error: {}", e))?;
        reply_rx.recv_timeout(std::time::Duration::from_secs(5)).map_err(|e| format!("Audio thread timeout: {}", e))?
    }

    pub fn set_dual_output(&self, enabled: bool) -> Result<(), String> {
        self.sender.send(AudioCommand::SetDualOutput { enabled }).map_err(|e| format!("Audio thread error: {}", e))
    }

    pub fn play_test_secondary(&self) -> Result<(), String> {
        let (reply_tx, reply_rx) = mpsc::channel();
        self.sender.send(AudioCommand::PlayTestSecondary { reply: reply_tx })
            .map_err(|e| format!("Audio thread error: {}", e))?;
        reply_rx.recv_timeout(std::time::Duration::from_secs(5)).map_err(|e| format!("Audio thread timeout: {}", e))?
    }

    pub fn get_playing(&self) -> Result<Vec<String>, String> {
        let (reply_tx, reply_rx) = mpsc::channel();
        self.sender.send(AudioCommand::GetPlaying { reply: reply_tx }).map_err(|e| format!("Audio thread error: {}", e))?;
        reply_rx.recv_timeout(std::time::Duration::from_secs(2)).map_err(|e| format!("Audio thread timeout: {}", e))
    }

    pub fn set_silent_mode(&self, enabled: bool) -> Result<(), String> {
        self.sender.send(AudioCommand::SetSilentMode { enabled }).map_err(|e| format!("Audio thread error: {}", e))
    }
}

// ── Mic Passthrough ──────────────────────────────────────────────────────────

/// Holds the cpal streams alive for the duration of the passthrough.
/// Dropping this struct stops the passthrough.
pub struct MicPassthroughHandle {
    _input_stream: cpal::Stream,
    _output_stream: cpal::Stream,
    pub voice_fx: SharedVoiceFx,
}
// cpal::Stream is Send on Windows (WASAPI) — safe to store in Mutex
unsafe impl Send for MicPassthroughHandle {}
unsafe impl Sync for MicPassthroughHandle {}

pub fn build_mic_passthrough(
    input_device_name: &str,
    output_device_name: &str,
) -> Result<MicPassthroughHandle, String> {
    let host = cpal::default_host();

    // Resolve input device
    let input_device = if input_device_name.is_empty() || input_device_name == "default" {
        host.default_input_device()
            .ok_or_else(|| "Aucun micro par défaut trouvé".to_string())?
    } else {
        host.input_devices()
            .map_err(|e| e.to_string())?
            .find(|d| d.name().map(|n| n == input_device_name).unwrap_or(false))
            .ok_or_else(|| format!("Micro '{}' non trouvé", input_device_name))?
    };

    // Resolve output device (VB-Cable)
    let output_device = host
        .output_devices()
        .map_err(|e| e.to_string())?
        .find(|d| d.name().map(|n| n == output_device_name).unwrap_or(false))
        .ok_or_else(|| format!("Périphérique de sortie '{}' non trouvé", output_device_name))?;

    let in_config = input_device
        .default_input_config()
        .map_err(|e| format!("Config entrée micro: {}", e))?;
    let out_default = output_device
        .default_output_config()
        .map_err(|e| format!("Config sortie câble: {}", e))?;

    let in_sr = in_config.sample_rate();
    let in_ch = in_config.channels() as usize;
    let out_ch = out_default.channels() as usize;

    let in_stream_cfg = cpal::StreamConfig {
        channels: in_config.channels(),
        sample_rate: in_sr,
        buffer_size: cpal::BufferSize::Default,
    };
    // Use the same sample rate for output (VB-Cable accepts any standard rate)
    let out_stream_cfg = cpal::StreamConfig {
        channels: out_default.channels(),
        sample_rate: in_sr,
        buffer_size: cpal::BufferSize::Default,
    };

    // Lock-free-ish shared ring buffer (f32 samples)
    let buffer: Arc<Mutex<VecDeque<f32>>> =
        Arc::new(Mutex::new(VecDeque::with_capacity(96000)));
    let buf_w = Arc::clone(&buffer);
    let buf_r = Arc::clone(&buffer);

    // Voice FX processor (shared so it can be updated from commands)
    let voice_fx = crate::voice_fx::create_shared_processor(in_sr.0 as f32);
    let fx_clone = Arc::clone(&voice_fx);

    // Build input stream (f32) — applies voice FX before writing to buffer
    let input_stream = input_device
        .build_input_stream::<f32, _, _>(
            &in_stream_cfg,
            move |data: &[f32], _| {
                // First, convert channels to output format into a temp buffer
                let mut processed: Vec<f32> = match (in_ch, out_ch) {
                    (1, 2) => {
                        let mut v = Vec::with_capacity(data.len() * 2);
                        for &s in data {
                            v.push(s);
                            v.push(s);
                        }
                        v
                    }
                    (2, 1) => {
                        data.chunks_exact(2)
                            .map(|chunk| (chunk[0] + chunk[1]) * 0.5)
                            .collect()
                    }
                    _ => data.to_vec(),
                };

                // Apply voice effects on mono (process per-channel for stereo)
                if let Ok(mut fx) = fx_clone.try_lock() {
                    if out_ch == 2 {
                        // Process left and right together (interleaved)
                        // Deinterleave → process mono → reinterleave
                        let frame_count = processed.len() / 2;
                        let mut mono: Vec<f32> = (0..frame_count)
                            .map(|i| (processed[i * 2] + processed[i * 2 + 1]) * 0.5)
                            .collect();
                        fx.process(&mut mono);
                        for i in 0..frame_count {
                            processed[i * 2] = mono[i];
                            processed[i * 2 + 1] = mono[i];
                        }
                    } else {
                        fx.process(&mut processed);
                    }
                }

                let Ok(mut buf) = buf_w.try_lock() else { return };
                buf.extend(processed.iter());
                // Cap at ~1 s of buffered audio
                while buf.len() > 192_000 {
                    buf.pop_front();
                }
            },
            |e| eprintln!("[MicPassthrough] Erreur entrée: {}", e),
            None,
        )
        .map_err(|e| format!("Impossible d'ouvrir le micro en f32: {}", e))?;

    // Build output stream (f32)
    let output_stream = output_device
        .build_output_stream::<f32, _, _>(
            &out_stream_cfg,
            move |data: &mut [f32], _| {
                let Ok(mut buf) = buf_r.try_lock() else {
                    data.fill(0.0);
                    return;
                };
                for s in data.iter_mut() {
                    *s = buf.pop_front().unwrap_or(0.0);
                }
            },
            |e| eprintln!("[MicPassthrough] Erreur sortie: {}", e),
            None,
        )
        .map_err(|e| format!("Impossible d'ouvrir {} en f32: {}", output_device_name, e))?;

    input_stream
        .play()
        .map_err(|e| format!("Démarrage micro échoué: {}", e))?;
    output_stream
        .play()
        .map_err(|e| format!("Démarrage câble virtuel échoué: {}", e))?;

    Ok(MicPassthroughHandle {
        _input_stream: input_stream,
        _output_stream: output_stream,
        voice_fx,
    })
}

