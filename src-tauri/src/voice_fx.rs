use std::collections::VecDeque;
use std::sync::{Arc, Mutex};
use rustfft::num_complex::Complex;
use rustfft::FftPlanner;

// ── Voice Effect Preset IDs ──

pub const PRESET_NONE: &str = "none";
pub const PRESET_DEEP: &str = "deep";
pub const PRESET_CHIPMUNK: &str = "chipmunk";
pub const PRESET_ROBOT: &str = "robot";
pub const PRESET_DEMON: &str = "demon";
pub const PRESET_HELIUM: &str = "helium";
pub const PRESET_CAVE: &str = "cave";
pub const PRESET_RADIO: &str = "radio";
pub const PRESET_MEGAPHONE: &str = "megaphone";
pub const PRESET_WHISPER: &str = "whisper";
pub const PRESET_ALIEN: &str = "alien";
pub const PRESET_GHOST: &str = "ghost";
pub const PRESET_DARTH_VADER: &str = "darth_vader";
pub const PRESET_ANIME: &str = "anime";
pub const PRESET_GIANT: &str = "giant";
pub const PRESET_BABY: &str = "baby";
pub const PRESET_OLD_MAN: &str = "old_man";
pub const PRESET_UNDERWATER: &str = "underwater";
pub const PRESET_FAN: &str = "fan";
pub const PRESET_CHORUS: &str = "chorus";
pub const PRESET_CUSTOM: &str = "custom";

/// Describes a voice preset for the frontend
#[derive(Clone, serde::Serialize)]
pub struct VoicePresetInfo {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub category: String,
}

pub fn list_presets() -> Vec<VoicePresetInfo> {
    vec![
        VoicePresetInfo { id: PRESET_NONE.into(), name: "Normal".into(), icon: "🎤".into(), category: "base".into() },
        VoicePresetInfo { id: PRESET_DEEP.into(), name: "Voix Grave".into(), icon: "🔊".into(), category: "pitch".into() },
        VoicePresetInfo { id: PRESET_CHIPMUNK.into(), name: "Chipmunk".into(), icon: "🐿️".into(), category: "pitch".into() },
        VoicePresetInfo { id: PRESET_HELIUM.into(), name: "Hélium".into(), icon: "🎈".into(), category: "pitch".into() },
        VoicePresetInfo { id: PRESET_BABY.into(), name: "Bébé".into(), icon: "👶".into(), category: "pitch".into() },
        VoicePresetInfo { id: PRESET_GIANT.into(), name: "Géant".into(), icon: "🗿".into(), category: "pitch".into() },
        VoicePresetInfo { id: PRESET_OLD_MAN.into(), name: "Vieux Sage".into(), icon: "👴".into(), category: "pitch".into() },
        VoicePresetInfo { id: PRESET_ANIME.into(), name: "Anime".into(), icon: "🌸".into(), category: "pitch".into() },
        VoicePresetInfo { id: PRESET_ROBOT.into(), name: "Robot".into(), icon: "🤖".into(), category: "character".into() },
        VoicePresetInfo { id: PRESET_DEMON.into(), name: "Démon".into(), icon: "😈".into(), category: "character".into() },
        VoicePresetInfo { id: PRESET_DARTH_VADER.into(), name: "Dark Vador".into(), icon: "⚔️".into(), category: "character".into() },
        VoicePresetInfo { id: PRESET_ALIEN.into(), name: "Alien".into(), icon: "👽".into(), category: "character".into() },
        VoicePresetInfo { id: PRESET_GHOST.into(), name: "Fantôme".into(), icon: "👻".into(), category: "character".into() },
        VoicePresetInfo { id: PRESET_RADIO.into(), name: "Radio Vintage".into(), icon: "📻".into(), category: "effect".into() },
        VoicePresetInfo { id: PRESET_MEGAPHONE.into(), name: "Mégaphone".into(), icon: "📢".into(), category: "effect".into() },
        VoicePresetInfo { id: PRESET_CAVE.into(), name: "Grotte".into(), icon: "🏔️".into(), category: "effect".into() },
        VoicePresetInfo { id: PRESET_UNDERWATER.into(), name: "Sous l'eau".into(), icon: "🌊".into(), category: "effect".into() },
        VoicePresetInfo { id: PRESET_WHISPER.into(), name: "Chuchotement".into(), icon: "🤫".into(), category: "effect".into() },
        VoicePresetInfo { id: PRESET_FAN.into(), name: "Ventilateur".into(), icon: "💨".into(), category: "effect".into() },
        VoicePresetInfo { id: PRESET_CHORUS.into(), name: "Chorale".into(), icon: "🎶".into(), category: "effect".into() },
        VoicePresetInfo { id: PRESET_CUSTOM.into(), name: "Personnalisé".into(), icon: "🎛️".into(), category: "custom".into() },
    ]
}

// ── DSP Parameters ──

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct VoiceFxParams {
    pub preset: String,
    /// Pitch shift in semitones (-24 to +24)
    pub pitch_shift: f32,
    /// Reverb mix (0.0 = dry, 1.0 = full wet)
    pub reverb_mix: f32,
    /// Reverb decay (0.0 - 1.0), how long tail rings
    pub reverb_decay: f32,
    /// Ring modulator frequency in Hz (0 = off)
    pub ring_mod_freq: f32,
    /// Ring mod mix (0.0 - 1.0)
    pub ring_mod_mix: f32,
    /// Distortion amount (0.0 = clean, 1.0 = max)
    pub distortion: f32,
    /// Low-pass filter cutoff in Hz (20 - 20000)
    pub lowpass_cutoff: f32,
    /// High-pass filter cutoff in Hz (20 - 20000)
    pub highpass_cutoff: f32,
    /// Vibrato rate in Hz
    pub vibrato_rate: f32,
    /// Vibrato depth in semitones
    pub vibrato_depth: f32,
    /// Chorus mix (0.0 - 1.0)
    pub chorus_mix: f32,
    /// Noise gate threshold (0.0 - 1.0)
    pub gate_threshold: f32,
    /// Output gain multiplier
    pub gain: f32,
    /// Noise suppression (RNNoise) — works independently of voice preset
    #[serde(default)]
    pub noise_suppression: bool,
}

impl Default for VoiceFxParams {
    fn default() -> Self {
        Self {
            preset: PRESET_NONE.into(),
            pitch_shift: 0.0,
            reverb_mix: 0.0,
            reverb_decay: 0.5,
            ring_mod_freq: 0.0,
            ring_mod_mix: 0.0,
            distortion: 0.0,
            lowpass_cutoff: 20000.0,
            highpass_cutoff: 20.0,
            vibrato_rate: 0.0,
            vibrato_depth: 0.0,
            chorus_mix: 0.0,
            gate_threshold: 0.0,
            gain: 1.0,
            noise_suppression: false,
        }
    }
}

impl VoiceFxParams {
    pub fn from_preset(preset: &str) -> Self {
        let mut p = Self::default();
        p.preset = preset.to_string();
        match preset {
            PRESET_NONE => {}
            PRESET_DEEP => {
                p.pitch_shift = -6.0;
                p.gain = 1.1;
            }
            PRESET_CHIPMUNK => {
                p.pitch_shift = 10.0;
                p.gain = 0.9;
            }
            PRESET_HELIUM => {
                p.pitch_shift = 14.0;
                p.gain = 0.85;
            }
            PRESET_BABY => {
                p.pitch_shift = 8.0;
                p.lowpass_cutoff = 5000.0;
                p.gain = 0.9;
            }
            PRESET_GIANT => {
                p.pitch_shift = -10.0;
                p.reverb_mix = 0.25;
                p.reverb_decay = 0.6;
                p.gain = 1.2;
            }
            PRESET_OLD_MAN => {
                p.pitch_shift = -4.0;
                p.vibrato_rate = 5.0;
                p.vibrato_depth = 0.3;
                p.lowpass_cutoff = 4000.0;
            }
            PRESET_ANIME => {
                p.pitch_shift = 6.0;
                p.lowpass_cutoff = 8000.0;
                p.gain = 1.1;
            }
            PRESET_ROBOT => {
                p.ring_mod_freq = 150.0;
                p.ring_mod_mix = 0.6;
                p.distortion = 0.15;
                p.reverb_mix = 0.1;
                p.reverb_decay = 0.3;
            }
            PRESET_DEMON => {
                p.pitch_shift = -12.0;
                p.ring_mod_freq = 50.0;
                p.ring_mod_mix = 0.35;
                p.distortion = 0.3;
                p.reverb_mix = 0.4;
                p.reverb_decay = 0.7;
                p.gain = 1.3;
            }
            PRESET_DARTH_VADER => {
                p.pitch_shift = -8.0;
                p.ring_mod_freq = 30.0;
                p.ring_mod_mix = 0.2;
                p.distortion = 0.05;
                p.reverb_mix = 0.15;
                p.reverb_decay = 0.4;
                p.lowpass_cutoff = 3500.0;
                p.gain = 1.2;
                // Breathing-like vibrato
                p.vibrato_rate = 0.8;
                p.vibrato_depth = 0.15;
            }
            PRESET_ALIEN => {
                p.pitch_shift = 4.0;
                p.ring_mod_freq = 300.0;
                p.ring_mod_mix = 0.45;
                p.reverb_mix = 0.3;
                p.reverb_decay = 0.5;
                p.vibrato_rate = 8.0;
                p.vibrato_depth = 0.5;
            }
            PRESET_GHOST => {
                p.pitch_shift = -2.0;
                p.reverb_mix = 0.7;
                p.reverb_decay = 0.85;
                p.chorus_mix = 0.5;
                p.lowpass_cutoff = 4000.0;
                p.gain = 0.8;
            }
            PRESET_RADIO => {
                p.highpass_cutoff = 400.0;
                p.lowpass_cutoff = 3000.0;
                p.distortion = 0.2;
                p.gain = 1.3;
            }
            PRESET_MEGAPHONE => {
                p.highpass_cutoff = 600.0;
                p.lowpass_cutoff = 4000.0;
                p.distortion = 0.35;
                p.gain = 1.5;
            }
            PRESET_CAVE => {
                p.reverb_mix = 0.7;
                p.reverb_decay = 0.9;
                p.lowpass_cutoff = 6000.0;
            }
            PRESET_UNDERWATER => {
                p.lowpass_cutoff = 800.0;
                p.reverb_mix = 0.4;
                p.reverb_decay = 0.6;
                p.vibrato_rate = 3.0;
                p.vibrato_depth = 0.4;
                p.gain = 0.8;
            }
            PRESET_WHISPER => {
                p.distortion = 0.5;
                p.highpass_cutoff = 1000.0;
                p.lowpass_cutoff = 6000.0;
                p.gain = 0.5;
            }
            PRESET_FAN => {
                p.ring_mod_freq = 80.0;
                p.ring_mod_mix = 0.15;
                p.vibrato_rate = 12.0;
                p.vibrato_depth = 0.2;
                p.lowpass_cutoff = 5000.0;
            }
            PRESET_CHORUS => {
                p.chorus_mix = 0.7;
                p.reverb_mix = 0.2;
                p.reverb_decay = 0.5;
            }
            _ => {}
        }
        p
    }
}

// ── DSP Processor ──

// ── STFT Phase Vocoder Pitch Shifter ──
// Based on the Bernsee smbPitchShift algorithm — high-quality STFT approach
// with proper phase coherence (Laroche & Dolson).

const FFT_SIZE: usize = 2048;
const OVERLAP: usize = 4; // 75% overlap
const STEP_SIZE: usize = FFT_SIZE / OVERLAP; // 512
const HALF_PLUS_1: usize = FFT_SIZE / 2 + 1;

struct StftPitchShifter {
    sample_rate: f32,

    // FIFO buffers
    in_fifo: Vec<f32>,
    out_fifo: Vec<f32>,
    rover: usize,

    // Phase vocoder state
    last_phase: Vec<f32>,
    sum_phase: Vec<f32>,

    // Analysis/synthesis arrays
    ana_magn: Vec<f32>,
    ana_freq: Vec<f32>,
    syn_magn: Vec<f32>,
    syn_freq: Vec<f32>,

    // Output overlap-add accumulation
    output_accum: Vec<f32>,

    // FFT engine
    fft_forward: Arc<dyn rustfft::Fft<f32>>,
    fft_inverse: Arc<dyn rustfft::Fft<f32>>,
    fft_buf: Vec<Complex<f32>>,
    fft_scratch: Vec<Complex<f32>>,

    // Hann window (precomputed)
    window: Vec<f32>,
}

impl StftPitchShifter {
    fn new(sample_rate: f32) -> Self {
        let mut planner = FftPlanner::<f32>::new();
        let fft_forward = planner.plan_fft_forward(FFT_SIZE);
        let fft_inverse = planner.plan_fft_inverse(FFT_SIZE);
        let scratch_len = fft_forward
            .get_inplace_scratch_len()
            .max(fft_inverse.get_inplace_scratch_len());

        // Hann window
        let window: Vec<f32> = (0..FFT_SIZE)
            .map(|i| {
                0.5 * (1.0
                    - (2.0 * std::f32::consts::PI * i as f32 / FFT_SIZE as f32).cos())
            })
            .collect();

        let latency = FFT_SIZE - STEP_SIZE;

        Self {
            sample_rate,
            in_fifo: vec![0.0; FFT_SIZE],
            out_fifo: vec![0.0; FFT_SIZE],
            rover: latency,
            last_phase: vec![0.0; HALF_PLUS_1],
            sum_phase: vec![0.0; HALF_PLUS_1],
            ana_magn: vec![0.0; HALF_PLUS_1],
            ana_freq: vec![0.0; HALF_PLUS_1],
            syn_magn: vec![0.0; HALF_PLUS_1],
            syn_freq: vec![0.0; HALF_PLUS_1],
            output_accum: vec![0.0; 2 * FFT_SIZE],
            fft_forward,
            fft_inverse,
            fft_buf: vec![Complex::new(0.0, 0.0); FFT_SIZE],
            fft_scratch: vec![Complex::new(0.0, 0.0); scratch_len],
            window,
        }
    }

    /// Process a buffer of samples in-place with the given pitch shift factor.
    /// pitch_factor = 2^(semitones/12). E.g. 1.0 = no shift, 2.0 = octave up.
    fn process(&mut self, data: &mut [f32], pitch_factor: f32) {
        let latency = FFT_SIZE - STEP_SIZE;
        let freq_per_bin = self.sample_rate / FFT_SIZE as f32;
        let expected =
            2.0 * std::f32::consts::PI * STEP_SIZE as f32 / FFT_SIZE as f32;

        for i in 0..data.len() {
            // Feed sample into input FIFO
            self.in_fifo[self.rover] = data[i];
            // Read output (latency-compensated)
            data[i] = self.out_fifo[self.rover - latency];
            self.rover += 1;

            // Process a complete STFT frame when FIFO is full
            if self.rover >= FFT_SIZE {
                self.rover = latency;

                // ── ANALYSIS ──

                // Window input and fill FFT buffer
                for k in 0..FFT_SIZE {
                    self.fft_buf[k] =
                        Complex::new(self.in_fifo[k] * self.window[k], 0.0);
                }

                // Forward FFT
                self.fft_forward
                    .process_with_scratch(&mut self.fft_buf, &mut self.fft_scratch);

                // Extract magnitude and true frequency for each bin
                for k in 0..HALF_PLUS_1 {
                    let re = self.fft_buf[k].re;
                    let im = self.fft_buf[k].im;

                    // Magnitude (2x for one-sided spectrum)
                    let magn = 2.0 * (re * re + im * im).sqrt();
                    let phase = im.atan2(re);

                    // Phase difference from last frame
                    let mut dp = phase - self.last_phase[k];
                    self.last_phase[k] = phase;

                    // Subtract expected phase advance for this bin
                    dp -= k as f32 * expected;

                    // Wrap to [-π, π]
                    let mut qpd = (dp / std::f32::consts::PI) as i32;
                    if qpd >= 0 {
                        qpd += qpd & 1;
                    } else {
                        qpd -= qpd & 1;
                    }
                    dp -= std::f32::consts::PI * qpd as f32;

                    // Get frequency deviation (in bins)
                    let dp_bins = OVERLAP as f32 * dp / (2.0 * std::f32::consts::PI);

                    // True frequency of this bin
                    let true_freq = (k as f32 + dp_bins) * freq_per_bin;

                    self.ana_magn[k] = magn;
                    self.ana_freq[k] = true_freq;
                }

                // ── PITCH SHIFTING ──

                self.syn_magn.fill(0.0);
                self.syn_freq.fill(0.0);

                for k in 0..HALF_PLUS_1 {
                    let new_bin = (k as f32 * pitch_factor) as usize;
                    if new_bin < HALF_PLUS_1 {
                        self.syn_magn[new_bin] += self.ana_magn[k];
                        self.syn_freq[new_bin] = self.ana_freq[k] * pitch_factor;
                    }
                }

                // ── SYNTHESIS ──

                for k in 0..HALF_PLUS_1 {
                    let magn = self.syn_magn[k];
                    let mut tmp = self.syn_freq[k];

                    // Subtract bin mid frequency
                    tmp -= k as f32 * freq_per_bin;

                    // Convert frequency deviation to bin deviation
                    tmp /= freq_per_bin;

                    // Convert to phase delta (taking overlap into account)
                    tmp = 2.0 * std::f32::consts::PI * tmp / OVERLAP as f32;

                    // Add the expected phase advance for this bin
                    tmp += k as f32 * expected;

                    // Accumulate phase
                    self.sum_phase[k] += tmp;
                    let phase = self.sum_phase[k];

                    // Reconstruct complex spectrum (positive frequencies)
                    self.fft_buf[k] =
                        Complex::new(magn * phase.cos(), magn * phase.sin());
                }

                // Mirror for conjugate symmetry (negative frequencies)
                for k in (HALF_PLUS_1)..FFT_SIZE {
                    self.fft_buf[k] = Complex::new(0.0, 0.0);
                }

                // Inverse FFT
                self.fft_inverse
                    .process_with_scratch(&mut self.fft_buf, &mut self.fft_scratch);

                // Window and overlap-add
                // Normalization: divide by (FFT_SIZE/2 * OVERLAP) to match Bernsee
                let norm = 2.0 / (FFT_SIZE as f32 / 2.0 * OVERLAP as f32);
                for k in 0..FFT_SIZE {
                    self.output_accum[k] +=
                        norm * self.window[k] * self.fft_buf[k].re;
                }

                // Move STEP_SIZE samples to output FIFO
                for k in 0..STEP_SIZE {
                    self.out_fifo[k] = self.output_accum[k];
                }

                // Shift output accumulation buffer
                self.output_accum
                    .copy_within(STEP_SIZE..(2 * FFT_SIZE), 0);
                for k in (2 * FFT_SIZE - STEP_SIZE)..(2 * FFT_SIZE) {
                    self.output_accum[k] = 0.0;
                }

                // Shift input FIFO
                self.in_fifo.copy_within(STEP_SIZE..FFT_SIZE, 0);
            }
        }
    }
}

// ── RNNoise Denoiser Wrapper ──

const DENOISE_FRAME: usize = nnnoiseless::DenoiseState::FRAME_SIZE; // 480

struct NoiseProcessor {
    denoise: Box<nnnoiseless::DenoiseState<'static>>,
    in_buf: Vec<f32>,
    in_pos: usize,
    out_buf: VecDeque<f32>,
    first_frame: bool,
}

impl NoiseProcessor {
    fn new() -> Self {
        Self {
            denoise: nnnoiseless::DenoiseState::new(),
            in_buf: vec![0.0; DENOISE_FRAME],
            in_pos: 0,
            out_buf: VecDeque::with_capacity(DENOISE_FRAME * 2),
            first_frame: true,
        }
    }

    /// Process audio buffer in-place with RNNoise denoising.
    /// Expects f32 samples in [-1.0, 1.0] range.
    /// Operates at any sample rate but is optimized for 48 kHz.
    fn process(&mut self, data: &mut [f32]) {
        for i in 0..data.len() {
            // Accumulate input in i16 range (nnnoiseless expects [-32768, 32767])
            self.in_buf[self.in_pos] = data[i] * 32767.0;
            self.in_pos += 1;

            if self.in_pos >= DENOISE_FRAME {
                self.in_pos = 0;

                // Process frame
                let mut out_frame = vec![0.0f32; DENOISE_FRAME];
                self.denoise
                    .process_frame(&mut out_frame, &self.in_buf);

                if self.first_frame {
                    // Discard first output frame (contains fade-in artifacts)
                    self.first_frame = false;
                    // Push zeros to maintain timing
                    for _ in 0..DENOISE_FRAME {
                        self.out_buf.push_back(0.0);
                    }
                } else {
                    // Convert back to [-1.0, 1.0] and push to output
                    for &s in &out_frame {
                        self.out_buf.push_back(s / 32767.0);
                    }
                }
            }

            // Pop denoised sample (or 0 if not yet available)
            data[i] = self.out_buf.pop_front().unwrap_or(0.0);
        }
    }
}

/// Real-time voice effects processor.
/// Designed for buffer processing within cpal callbacks.
pub struct VoiceFxProcessor {
    sample_rate: f32,
    pub params: VoiceFxParams,

    // STFT Phase Vocoder pitch shifter
    pitch_shifter: StftPitchShifter,

    // RNNoise denoiser
    denoiser: NoiseProcessor,

    // Reverb (Schroeder design: 4 comb + 2 allpass)
    comb_bufs: [Vec<f32>; 4],
    comb_pos: [usize; 4],
    allpass_bufs: [Vec<f32>; 2],
    allpass_pos: [usize; 2],

    // Ring modulator
    ring_phase: f64,

    // Filters (biquad)
    lp_z1: f32,
    lp_z2: f32,
    lp_a1: f32,
    lp_a2: f32,
    lp_b0: f32,
    lp_b1: f32,
    lp_b2: f32,
    hp_z1: f32,
    hp_z2: f32,
    hp_a1: f32,
    hp_a2: f32,
    hp_b0: f32,
    hp_b1: f32,
    hp_b2: f32,

    // Vibrato LFO
    vibrato_phase: f64,

    // Chorus (3-voice)
    chorus_buf: Vec<f32>,
    chorus_write_pos: usize,
    chorus_phases: [f64; 3],

    // Noise gate
    gate_env: f32,
}

impl VoiceFxProcessor {
    pub fn new(sample_rate: f32) -> Self {
        let sr = sample_rate as usize;

        // Schroeder reverb comb filter delays (in samples, tuned for room)
        let comb_lens = [
            (sr as f32 * 0.0297) as usize, // 29.7ms
            (sr as f32 * 0.0371) as usize, // 37.1ms
            (sr as f32 * 0.0411) as usize, // 41.1ms
            (sr as f32 * 0.0437) as usize, // 43.7ms
        ];
        let comb_bufs = [
            vec![0.0f32; comb_lens[0].max(1)],
            vec![0.0f32; comb_lens[1].max(1)],
            vec![0.0f32; comb_lens[2].max(1)],
            vec![0.0f32; comb_lens[3].max(1)],
        ];

        // Allpass delays
        let allpass_lens = [
            (sr as f32 * 0.005) as usize,  // 5ms
            (sr as f32 * 0.0017) as usize, // 1.7ms
        ];
        let allpass_bufs = [
            vec![0.0f32; allpass_lens[0].max(1)],
            vec![0.0f32; allpass_lens[1].max(1)],
        ];

        // Chorus buffer: ~50ms
        let chorus_len = (sr as f32 * 0.05) as usize;

        let mut proc = Self {
            sample_rate,
            params: VoiceFxParams::default(),

            pitch_shifter: StftPitchShifter::new(sample_rate),
            denoiser: NoiseProcessor::new(),

            comb_bufs,
            comb_pos: [0; 4],
            allpass_bufs,
            allpass_pos: [0; 2],

            ring_phase: 0.0,

            lp_z1: 0.0,
            lp_z2: 0.0,
            lp_a1: 0.0,
            lp_a2: 0.0,
            lp_b0: 1.0,
            lp_b1: 0.0,
            lp_b2: 0.0,
            hp_z1: 0.0,
            hp_z2: 0.0,
            hp_a1: 0.0,
            hp_a2: 0.0,
            hp_b0: 1.0,
            hp_b1: 0.0,
            hp_b2: 0.0,

            vibrato_phase: 0.0,

            chorus_buf: vec![0.0; chorus_len.max(1)],
            chorus_write_pos: 0,
            chorus_phases: [0.0, 0.33, 0.66],

            gate_env: 0.0,
        };

        proc.recalc_filters();
        proc
    }

    pub fn set_params(&mut self, params: VoiceFxParams) {
        self.params = params;
        self.recalc_filters();
    }

    fn recalc_filters(&mut self) {
        let lp_freq = self
            .params
            .lowpass_cutoff
            .max(20.0)
            .min(self.sample_rate * 0.49);
        self.calc_lowpass(lp_freq);

        let hp_freq = self
            .params
            .highpass_cutoff
            .max(20.0)
            .min(self.sample_rate * 0.49);
        self.calc_highpass(hp_freq);
    }

    fn calc_lowpass(&mut self, freq: f32) {
        let w0 = 2.0 * std::f32::consts::PI * freq / self.sample_rate;
        let cos_w0 = w0.cos();
        let sin_w0 = w0.sin();
        let alpha = sin_w0 / (2.0 * 0.707);
        let a0 = 1.0 + alpha;
        self.lp_b0 = ((1.0 - cos_w0) / 2.0) / a0;
        self.lp_b1 = (1.0 - cos_w0) / a0;
        self.lp_b2 = self.lp_b0;
        self.lp_a1 = (-2.0 * cos_w0) / a0;
        self.lp_a2 = (1.0 - alpha) / a0;
    }

    fn calc_highpass(&mut self, freq: f32) {
        let w0 = 2.0 * std::f32::consts::PI * freq / self.sample_rate;
        let cos_w0 = w0.cos();
        let sin_w0 = w0.sin();
        let alpha = sin_w0 / (2.0 * 0.707);
        let a0 = 1.0 + alpha;
        self.hp_b0 = ((1.0 + cos_w0) / 2.0) / a0;
        self.hp_b1 = (-(1.0 + cos_w0)) / a0;
        self.hp_b2 = self.hp_b0;
        self.hp_a1 = (-2.0 * cos_w0) / a0;
        self.hp_a2 = (1.0 - alpha) / a0;
    }

    /// Process a buffer of mono f32 samples in-place.
    pub fn process(&mut self, data: &mut [f32]) {
        // ── Step 1: Noise suppression (RNNoise) ──
        // Runs independently of voice preset — always active when enabled
        if self.params.noise_suppression {
            self.denoiser.process(data);
        }

        if self.params.preset == PRESET_NONE {
            return;
        }

        // ── Step 2: Noise gate (simple, before pitch shift) ──
        if self.params.gate_threshold > 0.0 {
            for s in data.iter_mut() {
                let abs = s.abs();
                if abs > self.gate_env {
                    self.gate_env = abs;
                } else {
                    self.gate_env *= 0.9995;
                }
                if self.gate_env < self.params.gate_threshold {
                    *s = 0.0;
                }
            }
        }

        // ── Step 3: Pitch shift (STFT phase vocoder) ──
        if self.params.pitch_shift.abs() > 0.01 {
            let ratio = 2.0_f32.powf(self.params.pitch_shift / 12.0);
            self.pitch_shifter.process(data, ratio);
        }

        // ── Step 4: Per-sample effects ──
        for i in 0..data.len() {
            let mut s = data[i];

            // Ring modulator
            if self.params.ring_mod_freq > 0.0 && self.params.ring_mod_mix > 0.0 {
                let modulator =
                    (2.0 * std::f64::consts::PI * self.ring_phase).sin() as f32;
                self.ring_phase +=
                    self.params.ring_mod_freq as f64 / self.sample_rate as f64;
                if self.ring_phase >= 1.0 {
                    self.ring_phase -= 1.0;
                }
                let ring = s * modulator;
                s = s * (1.0 - self.params.ring_mod_mix)
                    + ring * self.params.ring_mod_mix;
            }

            // Vibrato (amplitude modulation)
            if self.params.vibrato_rate > 0.0 && self.params.vibrato_depth > 0.0 {
                let lfo =
                    (2.0 * std::f64::consts::PI * self.vibrato_phase).sin() as f32;
                self.vibrato_phase +=
                    self.params.vibrato_rate as f64 / self.sample_rate as f64;
                if self.vibrato_phase >= 1.0 {
                    self.vibrato_phase -= 1.0;
                }
                let depth = self.params.vibrato_depth * 0.3;
                s *= 1.0 + lfo * depth;
            }

            // Distortion (soft clip)
            if self.params.distortion > 0.0 {
                let drive = 1.0 + self.params.distortion * 20.0;
                s = (s * drive).tanh();
            }

            // Low-pass filter (biquad)
            if self.params.lowpass_cutoff < 19900.0 {
                let out = self.lp_b0 * s + self.lp_b1 * self.lp_z1
                    + self.lp_b2 * self.lp_z2
                    - self.lp_a1 * self.lp_z1
                    - self.lp_a2 * self.lp_z2;
                self.lp_z2 = self.lp_z1;
                self.lp_z1 = out;
                s = out;
            }

            // High-pass filter (biquad)
            if self.params.highpass_cutoff > 25.0 {
                let out = self.hp_b0 * s + self.hp_b1 * self.hp_z1
                    + self.hp_b2 * self.hp_z2
                    - self.hp_a1 * self.hp_z1
                    - self.hp_a2 * self.hp_z2;
                self.hp_z2 = self.hp_z1;
                self.hp_z1 = out;
                s = out;
            }

            // Chorus
            if self.params.chorus_mix > 0.0 {
                s = self.process_chorus(s);
            }

            // Reverb (Schroeder)
            if self.params.reverb_mix > 0.0 {
                s = self.process_reverb(s);
            }

            // Output gain
            s *= self.params.gain;

            // Soft limiter
            s = s.max(-1.0).min(1.0);

            data[i] = s;
        }
    }

    fn process_reverb(&mut self, input: f32) -> f32 {
        let decay = self.params.reverb_decay.max(0.0).min(0.99);
        let fb_gains = [
            decay * 0.805,
            decay * 0.827,
            decay * 0.783,
            decay * 0.764,
        ];

        // Comb filters (parallel)
        let mut comb_out = 0.0f32;
        for i in 0..4 {
            let buf = &mut self.comb_bufs[i];
            let pos = self.comb_pos[i];
            let delayed = buf[pos];
            let new_val = input + delayed * fb_gains[i];
            buf[pos] = new_val;
            self.comb_pos[i] = (pos + 1) % buf.len();
            comb_out += delayed;
        }
        comb_out *= 0.25;

        // Allpass filters (series)
        let mut ap_out = comb_out;
        let ap_gain = 0.5;
        for i in 0..2 {
            let buf = &mut self.allpass_bufs[i];
            let pos = self.allpass_pos[i];
            let delayed = buf[pos];
            let new_val = ap_out + delayed * ap_gain;
            buf[pos] = new_val;
            self.allpass_pos[i] = (pos + 1) % buf.len();
            ap_out = delayed - ap_out * ap_gain;
        }

        // Mix dry/wet
        input * (1.0 - self.params.reverb_mix) + ap_out * self.params.reverb_mix
    }

    fn process_chorus(&mut self, input: f32) -> f32 {
        let buf_len = self.chorus_buf.len();
        self.chorus_buf[self.chorus_write_pos] = input;
        self.chorus_write_pos = (self.chorus_write_pos + 1) % buf_len;

        let rates = [1.1_f64, 1.5, 0.9]; // Different LFO rates for each voice
        let depths = [0.003_f64, 0.004, 0.0035]; // Delay modulation depth in seconds

        let mut chorus_sum = 0.0f32;
        for v in 0..3 {
            self.chorus_phases[v] += rates[v] / self.sample_rate as f64;
            if self.chorus_phases[v] >= 1.0 {
                self.chorus_phases[v] -= 1.0;
            }
            let lfo = (2.0 * std::f64::consts::PI * self.chorus_phases[v]).sin();
            let delay_samples = (depths[v] * self.sample_rate as f64 * (0.5 + 0.5 * lfo)) as usize;
            let read_idx = (self.chorus_write_pos + buf_len - delay_samples.min(buf_len - 1)) % buf_len;
            chorus_sum += self.chorus_buf[read_idx];
        }
        chorus_sum /= 3.0;

        input * (1.0 - self.params.chorus_mix) + chorus_sum * self.params.chorus_mix
    }
}

// ── Thread-safe shared state ──

pub type SharedVoiceFx = Arc<Mutex<VoiceFxProcessor>>;

pub fn create_shared_processor(sample_rate: f32) -> SharedVoiceFx {
    Arc::new(Mutex::new(VoiceFxProcessor::new(sample_rate)))
}
