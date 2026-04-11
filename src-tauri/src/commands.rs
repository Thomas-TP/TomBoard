use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;
use std::fs;
use std::io::{Read, Write};
use std::process::Command;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use cpal::traits::{DeviceTrait, HostTrait};

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

use crate::audio::{AudioHandle, MicPassthroughHandle, build_mic_passthrough};
use crate::storage::{self, AppData, Sound, Profile, Category, AppSettings};

pub struct AudioState(pub AudioHandle);
pub struct DataState(pub Mutex<AppData>);
pub struct MicPassthroughState(pub Mutex<Option<MicPassthroughHandle>>);

// ── Audio Commands ──

#[tauri::command]
pub fn play_sound(
    id: String,
    file_path: String,
    volume: f32,
    looping: bool,
    speed: Option<f32>,
    fade_in: Option<f64>,
    fade_out: Option<f64>,
    audio: State<AudioState>,
) -> Result<(), String> {
    audio.0.play(&id, &file_path, volume, looping, speed.unwrap_or(1.0), fade_in.unwrap_or(0.0), fade_out.unwrap_or(0.0))
}

#[tauri::command]
pub fn stop_sound(id: String, audio: State<AudioState>) -> Result<(), String> {
    audio.0.stop(&id)
}

#[tauri::command]
pub fn set_speed(id: String, speed: f32, audio: State<AudioState>) -> Result<(), String> {
    audio.0.set_speed(&id, speed)
}

#[tauri::command]
pub fn stop_all(audio: State<AudioState>) -> Result<(), String> {
    audio.0.stop_all()
}

#[tauri::command]
pub fn set_volume(id: String, volume: f32, audio: State<AudioState>) -> Result<(), String> {
    audio.0.set_volume(&id, volume)
}

#[tauri::command]
pub fn set_master_volume(volume: f32, audio: State<AudioState>) -> Result<(), String> {
    audio.0.set_master_volume(volume)
}

#[tauri::command]
pub fn get_playing(audio: State<AudioState>) -> Result<Vec<String>, String> {
    audio.0.get_playing()
}

#[tauri::command]
pub fn get_waveform(file_path: String, bars: Option<usize>) -> Result<Vec<f32>, String> {
    use rodio::{Decoder, Source};
    use std::io::BufReader;

    let bar_count = bars.unwrap_or(24);
    let file = std::fs::File::open(&file_path)
        .map_err(|e| format!("Cannot open file: {}", e))?;
    let source = Decoder::new(BufReader::new(file))
        .map_err(|e| format!("Cannot decode audio: {}", e))?;

    let channels = source.channels() as usize;
    let samples: Vec<f32> = source.convert_samples::<f32>().collect();
    if samples.is_empty() {
        return Ok(vec![0.0; bar_count]);
    }

    // Mono-mix
    let mono: Vec<f32> = if channels > 1 {
        samples.chunks(channels).map(|ch| ch.iter().sum::<f32>() / channels as f32).collect()
    } else {
        samples
    };

    let chunk_size = (mono.len() / bar_count).max(1);
    let waveform: Vec<f32> = (0..bar_count)
        .map(|i| {
            let start = i * chunk_size;
            let end = (start + chunk_size).min(mono.len());
            if start >= mono.len() {
                return 0.0;
            }
            let rms = (mono[start..end].iter().map(|s| s * s).sum::<f32>() / (end - start) as f32).sqrt();
            rms.min(1.0)
        })
        .collect();

    // Normalize to 0..1
    let max_val = waveform.iter().cloned().fold(0.0f32, f32::max);
    if max_val > 0.0 {
        Ok(waveform.iter().map(|v| v / max_val).collect())
    } else {
        Ok(waveform)
    }
}

#[tauri::command]
pub fn set_output_device(device_name: String, audio: State<AudioState>) -> Result<(), String> {
    audio.0.set_output_device(&device_name)
}

#[tauri::command]
pub fn set_secondary_device(device_name: String, audio: State<AudioState>) -> Result<(), String> {
    audio.0.set_secondary_device(&device_name)
}

#[tauri::command]
pub fn set_dual_output(enabled: bool, audio: State<AudioState>) -> Result<(), String> {
    audio.0.set_dual_output(enabled)
}

#[tauri::command]
pub fn test_secondary_output(audio: State<AudioState>) -> Result<(), String> {
    audio.0.play_test_secondary()
}

// ── Video → Audio extraction ──

#[tauri::command]
pub async fn extract_audio_from_video(source_path: String) -> Result<String, String> {
    let sounds_dir = storage::get_sounds_dir();
    let sound_id = Uuid::new_v4().to_string();
    let dest_path = sounds_dir.join(format!("{}.wav", sound_id));

    // Try ffmpeg first
    let result = Command::new("ffmpeg")
        .args([
            "-i", &source_path,
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "44100",
            "-ac", "2",
            "-y",
            &dest_path.to_string_lossy(),
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    match result {
        Ok(output) if output.status.success() => {
            Ok(dest_path.to_string_lossy().to_string())
        }
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(format!("ffmpeg error: {}", stderr))
        }
        Err(_) => {
            // ffmpeg not found — fall back to PowerShell + Windows Media Foundation
            let ps_script = format!(
                r#"
Add-Type -AssemblyName PresentationCore
$src = '{}'
$dest = '{}'
$player = New-Object System.Windows.Media.MediaPlayer
$player.Open([Uri]$src)
Start-Sleep -Milliseconds 500
$duration = $player.NaturalDuration.TimeSpan.TotalSeconds
$player.Close()
if ($duration -le 0) {{ throw "Cannot read media duration" }}

# Use ffmpeg alternative: Windows built-in via Shell.Application
throw "ffmpeg_not_found"
"#,
                source_path.replace('\'', "''"),
                dest_path.to_string_lossy().replace('\'', "''"),
            );

            let ps_result = Command::new("powershell")
                .args(["-NoProfile", "-Command", &ps_script])
                .creation_flags(CREATE_NO_WINDOW)
                .output()
                .map_err(|e| format!("PowerShell failed: {}", e))?;

            let stderr = String::from_utf8_lossy(&ps_result.stderr);
            Err(format!(
                "ffmpeg n'est pas installé. Installez ffmpeg (https://ffmpeg.org) et ajoutez-le au PATH, puis réessayez.\nDétail: {}",
                stderr.trim()
            ))
        }
    }
}

// ── Text-to-Speech ──

fn list_onecore_voices() -> Result<Vec<TtsVoiceInfo>, String> {
    use windows::Media::SpeechSynthesis::{SpeechSynthesizer, VoiceGender};

    let voices = SpeechSynthesizer::AllVoices().map_err(|e| format!("OneCore voices error: {}", e))?;
    let mut result = Vec::new();
    let count = voices.Size().map_err(|e| e.to_string())?;

    for i in 0..count {
        let voice = voices.GetAt(i).map_err(|e| e.to_string())?;
        let name = voice.DisplayName().map_err(|e| e.to_string())?.to_string();
        let culture = voice.Language().map_err(|e| e.to_string())?.to_string();
        let gender = voice.Gender().map_err(|e| e.to_string())?;
        let gender_str = if gender == VoiceGender::Male { "Male" } else { "Female" };

        result.push(TtsVoiceInfo {
            name,
            culture,
            gender: gender_str.to_string(),
            age: "Adult".to_string(),
            engine: "OneCore".to_string(),
        });
    }

    Ok(result)
}

fn list_sapi_voices() -> Result<Vec<TtsVoiceInfo>, String> {
    let ps_script = r#"
$voices = @()
try {
    Add-Type -AssemblyName System.Speech -ErrorAction SilentlyContinue
    $sapi = New-Object System.Speech.Synthesis.SpeechSynthesizer
    foreach ($iv in ($sapi.GetInstalledVoices() | Where-Object { $_.Enabled })) {
        $info = $iv.VoiceInfo
        $voices += [PSCustomObject]@{
            Name = $info.Name
            Culture = $info.Culture.Name
            Gender = $info.Gender.ToString()
            Age = $info.Age.ToString()
            Engine = 'SAPI'
        }
    }
    $sapi.Dispose()
} catch {}
$voices | ConvertTo-Json -Compress
"#;

    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", ps_script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("PowerShell failed: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let trimmed = stdout.trim();
    if trimmed.is_empty() {
        return Ok(vec![]);
    }

    if trimmed.starts_with('[') {
        serde_json::from_str(trimmed).map_err(|e| format!("JSON parse error: {}", e))
    } else {
        let single: TtsVoiceInfo = serde_json::from_str(trimmed)
            .map_err(|e| format!("JSON parse error: {}", e))?;
        Ok(vec![single])
    }
}

#[tauri::command]
pub async fn list_tts_voices() -> Result<Vec<TtsVoiceInfo>, String> {
    let mut voices = list_onecore_voices().unwrap_or_default();

    // Add SAPI voices that aren't already in OneCore list
    if let Ok(sapi_voices) = list_sapi_voices() {
        for sv in sapi_voices {
            if !voices.iter().any(|v| v.name == sv.name) {
                voices.push(sv);
            }
        }
    }

    Ok(voices)
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct TtsVoiceInfo {
    #[serde(alias = "Name")]
    pub name: String,
    #[serde(alias = "Culture")]
    pub culture: String,
    #[serde(alias = "Gender")]
    pub gender: String,
    #[serde(alias = "Age")]
    pub age: String,
    #[serde(alias = "Engine", default)]
    pub engine: String,
}

fn synthesize_onecore(voice_name: &str, text: &str, rate: i32, output_path: &str) -> Result<(), String> {
    use windows::Media::SpeechSynthesis::SpeechSynthesizer;
    use windows::Storage::Streams::DataReader;

    let synth = SpeechSynthesizer::new().map_err(|e| format!("Failed to create synthesizer: {}", e))?;

    // Set voice
    let voices = SpeechSynthesizer::AllVoices().map_err(|e| e.to_string())?;
    for i in 0..voices.Size().map_err(|e| e.to_string())? {
        let voice = voices.GetAt(i).map_err(|e| e.to_string())?;
        if voice.DisplayName().map_err(|e| e.to_string())?.to_string() == voice_name {
            synth.SetVoice(&voice).map_err(|e| e.to_string())?;
            break;
        }
    }

    // Set rate: convert from [-10, 10] to [0.5, 3.0]
    let speaking_rate = (1.0 + rate as f64 * 0.2).max(0.5).min(3.0);
    synth.Options().map_err(|e| e.to_string())?
        .SetSpeakingRate(speaking_rate).map_err(|e| e.to_string())?;

    // Synthesize
    let hstring = windows::core::HSTRING::from(text);
    let stream = synth.SynthesizeTextToStreamAsync(&hstring)
        .map_err(|e| format!("Synthesis start failed: {}", e))?
        .get()
        .map_err(|e| format!("Synthesis failed: {}", e))?;

    // Read stream to bytes
    let size = stream.Size().map_err(|e| e.to_string())? as u32;
    let input_stream = stream.GetInputStreamAt(0).map_err(|e| e.to_string())?;
    let reader = DataReader::CreateDataReader(&input_stream).map_err(|e| e.to_string())?;
    reader.LoadAsync(size)
        .map_err(|e| e.to_string())?
        .get()
        .map_err(|e| e.to_string())?;

    let mut bytes = vec![0u8; size as usize];
    reader.ReadBytes(&mut bytes).map_err(|e| e.to_string())?;

    std::fs::write(output_path, &bytes).map_err(|e| format!("Write failed: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn synthesize_speech(
    text: String,
    voice_name: String,
    rate: Option<i32>,
    engine: Option<String>,
    data: State<'_, DataState>,
) -> Result<Sound, String> {
    let sounds_dir = storage::get_sounds_dir();
    let sound_id = Uuid::new_v4().to_string();
    let use_engine = engine.unwrap_or_else(|| "SAPI".into());

    let speech_rate = rate.unwrap_or(0).max(-10).min(10);

    let dest_path = sounds_dir.join(format!("{}.wav", sound_id));
    let dest_str = dest_path.to_string_lossy().to_string();

    if use_engine == "OneCore" {
        let voice = voice_name.clone();
        let txt = text.clone();
        let dest = dest_str.clone();
        tokio::task::spawn_blocking(move || {
            synthesize_onecore(&voice, &txt, speech_rate, &dest)
        })
        .await
        .map_err(|e| format!("Task failed: {}", e))??;
    } else {
        // SAPI via PowerShell (synchronous, works fine)
        let escaped_text = text.replace('\'', "''").replace('"', "\\\"");
        let escaped_voice = voice_name.replace('\'', "''");
        let escaped_dest = dest_str.replace('\'', "''");

        let ps_script = format!(
            r#"
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice('{}')
$synth.Rate = {}
$synth.SetOutputToWaveFile('{}')
$synth.Speak('{}')
$synth.Dispose()
"#,
            escaped_voice,
            speech_rate,
            escaped_dest,
            escaped_text,
        );

        let output = Command::new("powershell")
            .args(["-NoProfile", "-Command", &ps_script])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("PowerShell failed: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("TTS failed: {}", stderr));
        }
    }

    if !dest_path.exists() {
        return Err("TTS file was not created".to_string());
    }

    let sound_name = if text.len() > 40 {
        format!("{}...", &text[..40])
    } else {
        text.clone()
    };

    let mut d = data.0.lock().map_err(|e| e.to_string())?;
    let order = d
        .profiles
        .iter()
        .find(|p| p.id == d.settings.active_profile_id)
        .map(|p| p.sounds.len() as u32)
        .unwrap_or(0);

    let sound = Sound {
        id: sound_id,
        name: sound_name,
        file_path: dest_path.to_string_lossy().to_string(),
        category: "all".to_string(),
        tags: vec!["tts".to_string()],
        icon: "🗣️".to_string(),
        color: "#1565C0".to_string(),
        volume: 1.0,
        speed: 1.0,
        hotkey: None,
        is_favorite: false,
        is_looping: false,
        trim_start: 0.0,
        trim_end: None,
        fade_in: 0.0,
        fade_out: 0.0,
        added_at: chrono_now(),
        play_count: 0,
        order,
    };

    let profile_id = d.settings.active_profile_id.clone();
    if let Some(profile) = d.profiles.iter_mut().find(|p| p.id == profile_id) {
        profile.sounds.push(sound.clone());
    }

    storage::save_data(&d)?;
    Ok(sound)
}

// ── Piper TTS ──

#[tauri::command]
pub fn check_piper(piper_path: String) -> Result<bool, String> {
    let path = std::path::Path::new(&piper_path);
    Ok(path.exists() && path.is_file())
}

#[tauri::command]
pub async fn synthesize_piper(
    text: String,
    piper_path: String,
    model_path: String,
    data: State<'_, DataState>,
) -> Result<Sound, String> {
    if !std::path::Path::new(&piper_path).exists() {
        return Err("piper.exe introuvable. Configurez le chemin dans les paramètres.".to_string());
    }
    if !std::path::Path::new(&model_path).exists() {
        return Err("Modèle Piper introuvable. Configurez le chemin dans les paramètres.".to_string());
    }

    let sounds_dir = storage::get_sounds_dir();
    let sound_id = Uuid::new_v4().to_string();
    let dest_path = sounds_dir.join(format!("{}.wav", sound_id));
    let dest_str = dest_path.to_string_lossy().to_string();

    // Piper reads from stdin and writes WAV to --output_file
    let mut child = Command::new(&piper_path)
        .args(["--model", &model_path, "--output_file", &dest_str])
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::piped())
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| format!("Piper launch failed: {}", e))?;

    if let Some(mut stdin) = child.stdin.take() {
        use std::io::Write;
        stdin.write_all(text.as_bytes()).map_err(|e| format!("Stdin write failed: {}", e))?;
        drop(stdin); // Close stdin to signal EOF
    }

    let output = child.wait_with_output().map_err(|e| format!("Piper failed: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Piper error: {}", stderr.trim()));
    }

    if !dest_path.exists() {
        return Err("Piper n'a pas créé le fichier audio.".to_string());
    }

    let sound_name = if text.len() > 40 {
        format!("{}...", &text[..40])
    } else {
        text.clone()
    };

    let mut d = data.0.lock().map_err(|e| e.to_string())?;
    let order = d
        .profiles
        .iter()
        .find(|p| p.id == d.settings.active_profile_id)
        .map(|p| p.sounds.len() as u32)
        .unwrap_or(0);

    let sound = Sound {
        id: sound_id,
        name: sound_name,
        file_path: dest_path.to_string_lossy().to_string(),
        category: "all".to_string(),
        tags: vec!["tts".to_string(), "piper".to_string()],
        icon: "🤖".to_string(),
        color: "#00897B".to_string(),
        volume: 1.0,
        speed: 1.0,
        hotkey: None,
        is_favorite: false,
        is_looping: false,
        trim_start: 0.0,
        trim_end: None,
        fade_in: 0.0,
        fade_out: 0.0,
        added_at: chrono_now(),
        play_count: 0,
        order,
    };

    let profile_id = d.settings.active_profile_id.clone();
    if let Some(profile) = d.profiles.iter_mut().find(|p| p.id == profile_id) {
        profile.sounds.push(sound.clone());
    }

    storage::save_data(&d)?;
    Ok(sound)
}

// ── Sound Library ──

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct LibrarySound {
    pub id: String,
    pub name: String,
    pub preview_url: String,
    pub download_url: String,
    pub duration: f64,
    pub source: String,
    pub tags: Vec<String>,
    pub description: String,
    pub username: String,
    pub image_url: String,
    pub num_downloads: u64,
    pub avg_rating: f64,
}

#[tauri::command]
pub async fn search_myinstants(query: String) -> Result<Vec<LibrarySound>, String> {
    let encoded = query.replace(' ', "+");
    // If empty query, get popular/recent sounds
    let url = if query.trim().is_empty() {
        "https://www.myinstants.com/api/v1/instants/?format=json&page_size=30".to_string()
    } else {
        format!("https://www.myinstants.com/api/v1/instants/?format=json&name={}&page_size=30", encoded)
    };

    let ps_script = format!(
        r#"
try {{
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $resp = Invoke-RestMethod -Uri '{}' -Method Get -TimeoutSec 15 -Headers @{{'User-Agent'='TomBoard/1.0'}}
    $results = @()
    foreach ($r in $resp.results) {{
        if ($r.sound) {{
            $soundUrl = $r.sound
            if ($soundUrl -and -not $soundUrl.StartsWith('http')) {{
                $soundUrl = 'https://www.myinstants.com' + $soundUrl
            }}
            $imageUrl = ''
            if ($r.image -and $r.image -ne $null) {{
                $imageUrl = $r.image
                if ($imageUrl -and -not $imageUrl.StartsWith('http')) {{
                    $imageUrl = 'https://www.myinstants.com' + $imageUrl
                }}
            }}
            $results += [PSCustomObject]@{{
                id = if ($r.slug) {{ [string]$r.slug }} else {{ [string]$r.name }}
                name = $r.name
                preview_url = $soundUrl
                download_url = $soundUrl
                duration = 0.0
                source = 'myinstants'
                tags = @()
                description = if ($r.description) {{ [string]$r.description }} else {{ '' }}
                username = ''
                image_url = $imageUrl
                num_downloads = if ($r.favorites) {{ [int64]$r.favorites }} else {{ 0 }}
                avg_rating = 0.0
            }}
        }}
    }}
    $results | ConvertTo-Json -Compress -Depth 5
}} catch {{
    throw "MyInstants API error: $_"
}}
"#,
        url.replace('\'', "''")
    );

    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", &ps_script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("PowerShell failed: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Search failed: {}", stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let trimmed = stdout.trim();
    if trimmed.is_empty() { return Ok(vec![]); }

    if trimmed.starts_with('[') {
        serde_json::from_str(trimmed).map_err(|e| format!("JSON parse: {}", e))
    } else {
        let single: LibrarySound = serde_json::from_str(trimmed).map_err(|e| format!("JSON parse: {}", e))?;
        Ok(vec![single])
    }
}

#[tauri::command]
pub async fn search_freesound(
    query: String,
    api_key: String,
) -> Result<Vec<LibrarySound>, String> {
    if api_key.trim().is_empty() {
        return Err("Clé API Freesound non configurée. Ajoutez-la dans les paramètres.".to_string());
    }

    let encoded = query.replace(' ', "+");
    let url = if query.trim().is_empty() {
        format!(
            "https://freesound.org/apiv2/search/text/?query=*&sort=downloads_desc&page_size=30&fields=id,name,previews,duration,tags,description,username,num_downloads,avg_rating&token={}",
            api_key.trim()
        )
    } else {
        format!(
            "https://freesound.org/apiv2/search/text/?query={}&page_size=30&fields=id,name,previews,duration,tags,description,username,num_downloads,avg_rating&token={}",
            encoded, api_key.trim()
        )
    };

    let ps_script = format!(
        r#"
try {{
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $resp = Invoke-RestMethod -Uri '{}' -Method Get -TimeoutSec 15 -Headers @{{'User-Agent'='TomBoard/1.0'}}
    $results = @()
    foreach ($r in $resp.results) {{
        $previewUrl = ''
        $downloadUrl = ''
        if ($r.previews) {{
            if ($r.previews.'preview-hq-mp3') {{ $previewUrl = $r.previews.'preview-hq-mp3' }}
            elseif ($r.previews.'preview-lq-mp3') {{ $previewUrl = $r.previews.'preview-lq-mp3' }}
            $downloadUrl = $previewUrl
        }}
        $tags = @()
        if ($r.tags) {{ $tags = @($r.tags | Select-Object -First 5) }}
        $results += [PSCustomObject]@{{
            id = [string]$r.id
            name = $r.name
            preview_url = $previewUrl
            download_url = $downloadUrl
            duration = if ($r.duration) {{ [double]$r.duration }} else {{ 0.0 }}
            source = 'freesound'
            tags = $tags
            description = if ($r.description) {{ [string]$r.description.Substring(0, [Math]::Min(200, $r.description.Length)) }} else {{ '' }}
            username = if ($r.username) {{ [string]$r.username }} else {{ '' }}
            image_url = ''
            num_downloads = if ($r.num_downloads) {{ [int64]$r.num_downloads }} else {{ 0 }}
            avg_rating = if ($r.avg_rating) {{ [double]$r.avg_rating }} else {{ 0.0 }}
        }}
    }}
    $results | ConvertTo-Json -Compress -Depth 5
}} catch {{
    throw "Freesound API error: $_"
}}
"#,
        url.replace('\'', "''")
    );

    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", &ps_script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("PowerShell failed: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Freesound search failed: {}", stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let trimmed = stdout.trim();
    if trimmed.is_empty() { return Ok(vec![]); }

    if trimmed.starts_with('[') {
        serde_json::from_str(trimmed).map_err(|e| format!("JSON parse: {}", e))
    } else {
        let single: LibrarySound = serde_json::from_str(trimmed).map_err(|e| format!("JSON parse: {}", e))?;
        Ok(vec![single])
    }
}

#[tauri::command]
pub async fn preview_library_sound(
    url: String,
    audio: State<'_, AudioState>,
) -> Result<(), String> {
    // Download to temp file
    let temp_dir = std::env::temp_dir().join("tomboard_preview");
    fs::create_dir_all(&temp_dir).map_err(|e| format!("Temp dir: {}", e))?;
    let ext = if url.contains(".wav") { "wav" } else { "mp3" };
    let temp_path = temp_dir.join(format!("preview.{}", ext));

    let ps_script = format!(
        r#"[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '{}' -OutFile '{}' -TimeoutSec 15 -Headers @{{'User-Agent'='TomBoard/1.0'}}"#,
        url.replace('\'', "''"),
        temp_path.to_string_lossy().replace('\'', "''"),
    );

    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", &ps_script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Download failed: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Preview download failed: {}", stderr.trim()));
    }

    if !temp_path.exists() {
        return Err("Preview file not found".to_string());
    }

    // Play via audio engine with special ID
    audio.0.play("__library_preview__", &temp_path.to_string_lossy(), 1.0, false, 1.0, 0.0, 0.0)
}

#[tauri::command]
pub fn stop_preview_library(audio: State<AudioState>) -> Result<(), String> {
    audio.0.stop("__library_preview__")
}

#[tauri::command]
pub async fn download_library_sound(
    url: String,
    name: String,
    category: String,
    data: State<'_, DataState>,
) -> Result<Sound, String> {
    let sounds_dir = storage::get_sounds_dir();
    let sound_id = Uuid::new_v4().to_string();
    let extension = if url.contains(".wav") { "wav" } else { "mp3" };
    let dest_path = sounds_dir.join(format!("{}.{}", sound_id, extension));

    let ps_script = format!(
        r#"Invoke-WebRequest -Uri '{}' -OutFile '{}' -TimeoutSec 30"#,
        url.replace('\'', "''"),
        dest_path.to_string_lossy().replace('\'', "''"),
    );

    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", &ps_script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Download failed: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Download failed: {}", stderr.trim()));
    }

    if !dest_path.exists() {
        return Err("Downloaded file not found".to_string());
    }

    let mut d = data.0.lock().map_err(|e| e.to_string())?;
    let order = d
        .profiles
        .iter()
        .find(|p| p.id == d.settings.active_profile_id)
        .map(|p| p.sounds.len() as u32)
        .unwrap_or(0);

    let sound = Sound {
        id: sound_id,
        name,
        file_path: dest_path.to_string_lossy().to_string(),
        category,
        tags: vec!["library".to_string()],
        icon: "📚".to_string(),
        color: "#00897B".to_string(),
        volume: 1.0,
        speed: 1.0,
        hotkey: None,
        is_favorite: false,
        is_looping: false,
        trim_start: 0.0,
        trim_end: None,
        fade_in: 0.0,
        fade_out: 0.0,
        added_at: chrono_now(),
        play_count: 0,
        order,
    };

    let profile_id = d.settings.active_profile_id.clone();
    if let Some(profile) = d.profiles.iter_mut().find(|p| p.id == profile_id) {
        profile.sounds.push(sound.clone());
    }

    storage::save_data(&d)?;
    Ok(sound)
}

#[tauri::command]
pub fn check_virtual_cable() -> Result<Vec<String>, String> {
    let host = cpal::default_host();
    let mut found = Vec::new();
    if let Ok(devices) = host.output_devices() {
        for dev in devices {
            if let Ok(name) = dev.name() {
                let lower = name.to_lowercase();
                if lower.contains("cable") || lower.contains("vb-audio")
                    || lower.contains("voicemeeter") || lower.contains("virtual")
                {
                    found.push(name);
                }
            }
        }
    }
    Ok(found)
}

#[tauri::command]
pub async fn install_virtual_cable() -> Result<String, String> {
    let temp_dir = std::env::temp_dir().join("tomboard_vbcable");
    fs::create_dir_all(&temp_dir).map_err(|e| format!("Cannot create temp dir: {}", e))?;

    let zip_path = temp_dir.join("VBCABLE_Driver_Pack.zip");

    // Download VB-Cable from official VB-Audio site
    let download_status = std::process::Command::new("powershell")
        .args([
            "-NoProfile", "-Command",
            &format!(
                "Invoke-WebRequest -Uri 'https://download.vb-audio.com/Download_CABLE/VBCABLE_Driver_Pack43.zip' -OutFile '{}'",
                zip_path.to_string_lossy()
            ),
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .status()
        .map_err(|e| format!("Failed to download: {}", e))?;

    if !download_status.success() {
        return Err("Download failed. Check your internet connection.".to_string());
    }

    if !zip_path.exists() {
        return Err("Download file not found after download.".to_string());
    }

    // Extract the zip
    let extract_dir = temp_dir.join("extracted");
    fs::create_dir_all(&extract_dir).ok();
    let file = fs::File::open(&zip_path).map_err(|e| format!("Cannot open zip: {}", e))?;
    let mut archive = zip::ZipArchive::new(std::io::BufReader::new(file))
        .map_err(|e| format!("Invalid zip: {}", e))?;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| format!("Zip entry error: {}", e))?;
        if let Some(name) = entry.enclosed_name() {
            let out_path = extract_dir.join(name);
            if entry.is_dir() {
                fs::create_dir_all(&out_path).ok();
            } else {
                if let Some(parent) = out_path.parent() {
                    fs::create_dir_all(parent).ok();
                }
                let mut outfile = fs::File::create(&out_path)
                    .map_err(|e| format!("Cannot extract {}: {}", out_path.display(), e))?;
                std::io::copy(&mut entry, &mut outfile)
                    .map_err(|e| format!("Extract copy error: {}", e))?;
            }
        }
    }

    // Find the setup exe (64-bit preferred)
    let setup_exe = if extract_dir.join("VBCABLE_Setup_x64.exe").exists() {
        extract_dir.join("VBCABLE_Setup_x64.exe")
    } else if extract_dir.join("VBCABLE_Setup.exe").exists() {
        extract_dir.join("VBCABLE_Setup.exe")
    } else {
        return Err("Setup executable not found in the archive.".to_string());
    };

    // Run with admin elevation
    let install_status = std::process::Command::new("powershell")
        .args([
            "-NoProfile", "-Command",
            &format!(
                "Start-Process '{}' -Verb RunAs -Wait",
                setup_exe.to_string_lossy()
            ),
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .status()
        .map_err(|e| format!("Failed to launch installer: {}", e))?;

    // Cleanup temp files
    fs::remove_dir_all(&temp_dir).ok();

    if install_status.success() {
        Ok("VB-Cable installed successfully. You may need to restart TomBoard.".to_string())
    } else {
        Err("Installation was cancelled or failed.".to_string())
    }
}

// ── Data Commands ──

#[tauri::command]
pub fn get_data(data: State<DataState>) -> Result<AppData, String> {
    let d = data.0.lock().map_err(|e| e.to_string())?;
    Ok(d.clone())
}

#[tauri::command]
pub fn set_data(data_payload: AppData, data: State<DataState>) -> Result<(), String> {
    let mut d = data.0.lock().map_err(|e| e.to_string())?;
    *d = data_payload;
    storage::save_data(&d)
}

#[tauri::command]
pub fn save_settings(settings: AppSettings, data: State<DataState>) -> Result<(), String> {
    let mut d = data.0.lock().map_err(|e| e.to_string())?;
    d.settings = settings;
    storage::save_data(&d)
}

#[tauri::command]
pub fn add_sound(
    name: String,
    source_path: String,
    category: String,
    data: State<DataState>,
) -> Result<Sound, String> {
    let mut d = data.0.lock().map_err(|e| e.to_string())?;

    // Copy file to sounds directory
    let sounds_dir = storage::get_sounds_dir();
    let src_path = std::path::Path::new(&source_path);
    let extension = src_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("wav");
    let sound_id = Uuid::new_v4().to_string();
    let dest_filename = format!("{}.{}", sound_id, extension);
    let dest_path = sounds_dir.join(&dest_filename);

    fs::copy(&source_path, &dest_path)
        .map_err(|e| format!("Failed to copy sound file: {}", e))?;

    let order = d
        .profiles
        .iter()
        .find(|p| p.id == d.settings.active_profile_id)
        .map(|p| p.sounds.len() as u32)
        .unwrap_or(0);

    let sound = Sound {
        id: sound_id,
        name,
        file_path: dest_path.to_string_lossy().to_string(),
        category,
        tags: Vec::new(),
        icon: "🔊".to_string(),
        color: "#6750A4".to_string(),
        volume: 1.0,
        speed: 1.0,
        hotkey: None,
        is_favorite: false,
        is_looping: false,
        trim_start: 0.0,
        trim_end: None,
        fade_in: 0.0,
        fade_out: 0.0,
        added_at: chrono_now(),
        play_count: 0,
        order,
    };

    let profile_id = d.settings.active_profile_id.clone();
    if let Some(profile) = d.profiles.iter_mut().find(|p| p.id == profile_id) {
        profile.sounds.push(sound.clone());
    }

    storage::save_data(&d)?;
    Ok(sound)
}

#[tauri::command]
pub fn import_audio_bytes(file_name: String, bytes: Vec<u8>) -> Result<String, String> {
    let sounds_dir = storage::get_sounds_dir();
    let src_path = std::path::Path::new(&file_name);
    let extension = src_path.extension().and_then(|e| e.to_str()).unwrap_or("wav");
    let sound_id = Uuid::new_v4().to_string();
    let dest_filename = format!("{}.{}", sound_id, extension);
    let dest_path = sounds_dir.join(&dest_filename);
    fs::write(&dest_path, &bytes).map_err(|e| format!("Failed to write audio file: {}", e))?;
    Ok(dest_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn update_sound(sound: Sound, data: State<DataState>) -> Result<(), String> {
    let mut d = data.0.lock().map_err(|e| e.to_string())?;
    let profile_id = d.settings.active_profile_id.clone();
    if let Some(profile) = d.profiles.iter_mut().find(|p| p.id == profile_id) {
        if let Some(existing) = profile.sounds.iter_mut().find(|s| s.id == sound.id) {
            *existing = sound;
        }
    }
    storage::save_data(&d)
}

#[tauri::command]
pub fn delete_sound(
    id: String,
    data: State<DataState>,
    audio: State<AudioState>,
) -> Result<(), String> {
    // Stop playback first
    audio.0.stop(&id).ok();

    let mut d = data.0.lock().map_err(|e| e.to_string())?;
    let profile_id = d.settings.active_profile_id.clone();
    if let Some(profile) = d.profiles.iter_mut().find(|p| p.id == profile_id) {
        // Remove file
        if let Some(sound) = profile.sounds.iter().find(|s| s.id == id) {
            fs::remove_file(&sound.file_path).ok();
        }
        profile.sounds.retain(|s| s.id != id);
    }
    storage::save_data(&d)
}

#[tauri::command]
pub fn add_category(
    name: String,
    icon: String,
    color: String,
    data: State<DataState>,
) -> Result<Category, String> {
    let mut d = data.0.lock().map_err(|e| e.to_string())?;
    let profile_id = d.settings.active_profile_id.clone();
    let cat = Category {
        id: Uuid::new_v4().to_string(),
        name,
        icon,
        color,
        order: 0,
    };
    if let Some(profile) = d.profiles.iter_mut().find(|p| p.id == profile_id) {
        let order = profile.categories.len() as u32;
        let mut cat = cat;
        cat.order = order;
        profile.categories.push(cat.clone());
        storage::save_data(&d)?;
        Ok(cat)
    } else {
        Err("Profile not found".to_string())
    }
}

#[tauri::command]
pub fn delete_category(
    category_id: String,
    data: State<DataState>,
) -> Result<(), String> {
    if category_id == "all" {
        return Err("Cannot delete the default category".to_string());
    }
    let mut d = data.0.lock().map_err(|e| e.to_string())?;
    let profile_id = d.settings.active_profile_id.clone();
    if let Some(profile) = d.profiles.iter_mut().find(|p| p.id == profile_id) {
        // Move sounds from deleted category to "all"
        for sound in profile.sounds.iter_mut() {
            if sound.category == category_id {
                sound.category = "all".to_string();
            }
        }
        profile.categories.retain(|c| c.id != category_id);
        storage::save_data(&d)
    } else {
        Err("Profile not found".to_string())
    }
}

#[tauri::command]
pub fn reorder_categories(
    category_ids: Vec<String>,
    data: State<DataState>,
) -> Result<(), String> {
    let mut d = data.0.lock().map_err(|e| e.to_string())?;
    let profile_id = d.settings.active_profile_id.clone();
    if let Some(profile) = d.profiles.iter_mut().find(|p| p.id == profile_id) {
        let mut reordered: Vec<Category> = Vec::new();
        for (i, id) in category_ids.iter().enumerate() {
            if let Some(cat) = profile.categories.iter().find(|c| c.id == *id) {
                let mut c = cat.clone();
                c.order = i as u32;
                reordered.push(c);
            }
        }
        // Keep any categories not in the list
        for cat in &profile.categories {
            if !category_ids.contains(&cat.id) {
                reordered.push(cat.clone());
            }
        }
        profile.categories = reordered;
        storage::save_data(&d)
    } else {
        Err("Profile not found".to_string())
    }
}

#[tauri::command]
pub fn add_profile(name: String, data: State<DataState>) -> Result<Profile, String> {
    let mut d = data.0.lock().map_err(|e| e.to_string())?;
    let profile = Profile {
        id: Uuid::new_v4().to_string(),
        name,
        sounds: Vec::new(),
        categories: vec![Category {
            id: "all".to_string(),
            name: "Tous".to_string(),
            icon: "apps".to_string(),
            color: "#6750A4".to_string(),
            order: 0,
        }],
    };
    d.profiles.push(profile.clone());
    storage::save_data(&d)?;
    Ok(profile)
}

#[tauri::command]
pub fn switch_profile(profile_id: String, data: State<DataState>) -> Result<(), String> {
    let mut d = data.0.lock().map_err(|e| e.to_string())?;
    if d.profiles.iter().any(|p| p.id == profile_id) {
        d.settings.active_profile_id = profile_id;
        storage::save_data(&d)
    } else {
        Err("Profile not found".to_string())
    }
}

#[tauri::command]
pub fn rename_profile(profile_id: String, name: String, data: State<DataState>) -> Result<(), String> {
    let mut d = data.0.lock().map_err(|e| e.to_string())?;
    if let Some(profile) = d.profiles.iter_mut().find(|p| p.id == profile_id) {
        profile.name = name;
        storage::save_data(&d)
    } else {
        Err("Profile not found".to_string())
    }
}

#[tauri::command]
pub fn delete_profile(profile_id: String, data: State<DataState>) -> Result<(), String> {
    let mut d = data.0.lock().map_err(|e| e.to_string())?;
    if d.profiles.len() <= 1 {
        return Err("Cannot delete the last profile".to_string());
    }
    d.profiles.retain(|p| p.id != profile_id);
    // If deleted the active profile, switch to first available
    if d.settings.active_profile_id == profile_id {
        if let Some(first) = d.profiles.first() {
            d.settings.active_profile_id = first.id.clone();
        }
    }
    storage::save_data(&d)
}

#[tauri::command]
pub fn duplicate_profile(profile_id: String, name: String, data: State<DataState>) -> Result<Profile, String> {
    let mut d = data.0.lock().map_err(|e| e.to_string())?;
    let source = d.profiles.iter().find(|p| p.id == profile_id)
        .ok_or("Profile not found")?.clone();
    let new_profile = Profile {
        id: Uuid::new_v4().to_string(),
        name,
        sounds: source.sounds.clone(),
        categories: source.categories.clone(),
    };
    d.profiles.push(new_profile.clone());
    storage::save_data(&d)?;
    Ok(new_profile)
}

#[tauri::command]
pub fn save_recording(
    audio_data: Vec<u8>,
    name: String,
    category: String,
    data: State<DataState>,
) -> Result<Sound, String> {
    let mut d = data.0.lock().map_err(|e| e.to_string())?;

    let sounds_dir = storage::get_sounds_dir();
    let sound_id = Uuid::new_v4().to_string();
    let dest_filename = format!("{}.wav", sound_id);
    let dest_path = sounds_dir.join(&dest_filename);

    // Write WAV data directly
    fs::write(&dest_path, &audio_data)
        .map_err(|e| format!("Failed to save recording: {}", e))?;

    let order = d
        .profiles
        .iter()
        .find(|p| p.id == d.settings.active_profile_id)
        .map(|p| p.sounds.len() as u32)
        .unwrap_or(0);

    let sound = Sound {
        id: sound_id,
        name,
        file_path: dest_path.to_string_lossy().to_string(),
        category,
        tags: vec!["enregistrement".to_string()],
        icon: "🎤".to_string(),
        color: "#C2185B".to_string(),
        volume: 1.0,
        speed: 1.0,
        hotkey: None,
        is_favorite: false,
        is_looping: false,
        trim_start: 0.0,
        trim_end: None,
        fade_in: 0.0,
        fade_out: 0.0,
        added_at: chrono_now(),
        play_count: 0,
        order,
    };

    let profile_id = d.settings.active_profile_id.clone();
    if let Some(profile) = d.profiles.iter_mut().find(|p| p.id == profile_id) {
        profile.sounds.push(sound.clone());
    }

    storage::save_data(&d)?;
    Ok(sound)
}

fn chrono_now() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("{}", now)
}

#[tauri::command]
pub fn list_audio_devices() -> Result<Vec<String>, String> {
    let host = cpal::default_host();
    let mut devices = vec!["default".to_string()];
    match host.output_devices() {
        Ok(devs) => {
            for dev in devs {
                if let Ok(name) = dev.name() {
                    devices.push(name);
                }
            }
        }
        Err(e) => {
            eprintln!("Failed to enumerate audio devices: {}", e);
        }
    }
    Ok(devices)
}

#[tauri::command]
pub fn list_audio_input_devices() -> Result<Vec<String>, String> {
    let host = cpal::default_host();
    let mut devices = vec!["default".to_string()];
    match host.input_devices() {
        Ok(devs) => {
            for dev in devs {
                if let Ok(name) = dev.name() {
                    devices.push(name);
                }
            }
        }
        Err(e) => eprintln!("Failed to enumerate input devices: {}", e),
    }
    Ok(devices)
}

#[tauri::command]
pub fn start_mic_passthrough(
    input_device: String,
    output_device: String,
    state: State<MicPassthroughState>,
) -> Result<(), String> {
    let handle = build_mic_passthrough(&input_device, &output_device)?;
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    *guard = Some(handle);
    Ok(())
}

#[tauri::command]
pub fn stop_mic_passthrough(state: State<MicPassthroughState>) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    *guard = None;
    Ok(())
}

#[tauri::command]
pub fn get_app_data_dir() -> Result<String, String> {
    let base = dirs::data_local_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    let dir = base.join("TomBoard");
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn export_data(dest_path: String, data: State<DataState>) -> Result<(), String> {
    let d = data.0.lock().map_err(|e| e.to_string())?;
    let sounds_dir = storage::get_sounds_dir();

    let file = fs::File::create(&dest_path)
        .map_err(|e| format!("Cannot create export file: {}", e))?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    // Write data.json
    let json = serde_json::to_string_pretty(&*d).map_err(|e| e.to_string())?;
    zip.start_file("data.json", options).map_err(|e| e.to_string())?;
    zip.write_all(json.as_bytes()).map_err(|e| e.to_string())?;

    // Write sound files
    if sounds_dir.exists() {
        for entry in walkdir::WalkDir::new(&sounds_dir).into_iter().filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.is_file() {
                let relative = path.strip_prefix(&sounds_dir).map_err(|e| e.to_string())?;
                let name = format!("sounds/{}", relative.to_string_lossy().replace('\\', "/"));
                zip.start_file(&name, options).map_err(|e| e.to_string())?;
                let mut f = fs::File::open(path).map_err(|e| e.to_string())?;
                let mut buf = Vec::new();
                f.read_to_end(&mut buf).map_err(|e| e.to_string())?;
                zip.write_all(&buf).map_err(|e| e.to_string())?;
            }
        }
    }

    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn import_data(source_path: String, data: State<DataState>) -> Result<(), String> {
    let file = fs::File::open(&source_path)
        .map_err(|e| format!("Cannot open import file: {}", e))?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    let sounds_dir = storage::get_sounds_dir();
    let mut imported_data: Option<AppData> = None;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().to_string();

        if name == "data.json" {
            let mut content = String::new();
            entry.read_to_string(&mut content).map_err(|e| e.to_string())?;
            imported_data = Some(serde_json::from_str(&content).map_err(|e| e.to_string())?);
        } else if let Some(relative) = name.strip_prefix("sounds/") {
            if !relative.is_empty() {
                let dest = sounds_dir.join(relative);
                if let Some(parent) = dest.parent() {
                    fs::create_dir_all(parent).ok();
                }
                let mut buf = Vec::new();
                entry.read_to_end(&mut buf).map_err(|e| e.to_string())?;
                fs::write(&dest, &buf).map_err(|e| e.to_string())?;
            }
        }
    }

    if let Some(new_data) = imported_data {
        let mut d = data.0.lock().map_err(|e| e.to_string())?;
        *d = new_data;
        storage::save_data(&d)?;
    }

    Ok(())
}

#[tauri::command]
pub fn set_silent_mode(enabled: bool, audio: State<AudioState>) -> Result<(), String> {
    audio.0.set_silent_mode(enabled)
}

// ── Voice Changer ──

#[tauri::command]
pub fn list_voice_presets() -> Vec<crate::voice_fx::VoicePresetInfo> {
    crate::voice_fx::list_presets()
}

#[tauri::command]
pub fn set_voice_preset(preset: String, state: State<MicPassthroughState>) -> Result<(), String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    let handle = guard.as_ref().ok_or("Le micro passthrough n'est pas actif — activez-le dans les paramètres pour utiliser le changeur de voix.")?;
    let mut fx = handle.voice_fx.lock().map_err(|e| e.to_string())?;
    // Preserve noise_suppression when switching presets
    let keep_ns = fx.params.noise_suppression;
    let mut params = crate::voice_fx::VoiceFxParams::from_preset(&preset);
    params.noise_suppression = keep_ns;
    fx.set_params(params);
    Ok(())
}

#[tauri::command]
pub fn set_voice_custom_params(
    params: crate::voice_fx::VoiceFxParams,
    state: State<MicPassthroughState>,
) -> Result<(), String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    let handle = guard.as_ref().ok_or("Le micro passthrough n'est pas actif.")?;
    let mut fx = handle.voice_fx.lock().map_err(|e| e.to_string())?;
    fx.set_params(params);
    Ok(())
}

#[tauri::command]
pub fn get_voice_params(state: State<MicPassthroughState>) -> Result<crate::voice_fx::VoiceFxParams, String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    let handle = guard.as_ref().ok_or("Le micro passthrough n'est pas actif.")?;
    let fx = handle.voice_fx.lock().map_err(|e| e.to_string())?;
    Ok(fx.params.clone())
}

#[tauri::command]
pub fn set_noise_suppression(enabled: bool, state: State<MicPassthroughState>) -> Result<(), String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    let handle = guard.as_ref().ok_or("Le micro passthrough n'est pas actif.")?;
    let mut fx = handle.voice_fx.lock().map_err(|e| e.to_string())?;
    fx.params.noise_suppression = enabled;
    Ok(())
}

// ── Update Commands ──

const GITHUB_RELEASES_URL: &str = "https://github.com/Thomas-TP/TomBoard/releases/latest/download";

#[tauri::command]
pub fn get_current_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
pub fn check_for_updates() -> Result<String, String> {
    let source = velopack::sources::HttpSource::new(GITHUB_RELEASES_URL);
    let um = velopack::UpdateManager::new(source, None, None)
        .map_err(|e| format!("L'application n'est pas installée via l'installeur : {}", e))?;
    match um.check_for_updates() {
        Ok(velopack::UpdateCheck::UpdateAvailable(info)) => {
            Ok(format!("{}", info.TargetFullRelease.Version))
        }
        Ok(_) => Ok("up-to-date".to_string()),
        Err(e) => Err(format!("Erreur lors de la vérification : {}", e)),
    }
}

#[tauri::command]
pub fn download_and_apply_update() -> Result<(), String> {
    let source = velopack::sources::HttpSource::new(GITHUB_RELEASES_URL);
    let um = velopack::UpdateManager::new(source, None, None)
        .map_err(|e| format!("L'application n'est pas installée via l'installeur : {}", e))?;
    match um.check_for_updates().map_err(|e| e.to_string())? {
        velopack::UpdateCheck::UpdateAvailable(info) => {
            um.download_updates(&info, None).map_err(|e| e.to_string())?;
            um.apply_updates_and_restart(&info.TargetFullRelease).map_err(|e| e.to_string())?;
            Ok(())
        }
        _ => Err("Aucune mise à jour disponible.".to_string()),
    }
}

// ── Discord Rich Presence ──

#[tauri::command]
pub fn set_discord_rpc(enabled: bool) -> Result<(), String> {
    crate::discord_rpc::set_enabled(enabled);
    Ok(())
}

#[tauri::command]
pub fn update_discord_presence(detail: String, state: String) -> Result<(), String> {
    crate::discord_rpc::update(detail, state);
    Ok(())
}

// ── Trim Audio ──
/// Applies trim_start and trim_end to a sound file, producing a new WAV
/// at the same location (replaces in-place) or in a temp file.
/// Returns the path of the trimmed file.
#[tauri::command]
pub fn trim_audio(
    file_path: String,
    trim_start: f64,
    trim_end_opt: Option<f64>,
) -> Result<String, String> {
    use std::io::BufReader;
    use rodio::Source;

    let path = std::path::Path::new(&file_path);
    let file = std::fs::File::open(path).map_err(|e| format!("Cannot open file: {}", e))?;
    let reader = BufReader::new(file);

    // Decode audio with rodio
    let decoder = rodio::Decoder::new(reader).map_err(|e| format!("Decode error: {}", e))?;
    let sample_rate = decoder.sample_rate();
    let channels = decoder.channels() as usize;

    let samples: Vec<i16> = decoder.collect();

    let total_frames = samples.len() / channels;
    let start_frame = (trim_start * sample_rate as f64).round() as usize;
    let end_frame = trim_end_opt
        .map(|t| (t * sample_rate as f64).round() as usize)
        .unwrap_or(total_frames)
        .min(total_frames);

    if start_frame >= end_frame {
        return Err("Trim invalide : start >= end".to_string());
    }

    let trimmed: Vec<i16> = samples[(start_frame * channels)..(end_frame * channels)].to_vec();

    // Write trimmed audio to a new WAV file next to original (with _trimmed suffix)
    let stem = path.file_stem().map(|s| s.to_string_lossy()).unwrap_or_default();
    let out_name = format!("{}_trim.wav", stem);
    let out_path = path.parent().unwrap_or(path).join(out_name);
    let out_file = std::fs::File::create(&out_path).map_err(|e| format!("Cannot create output: {}", e))?;

    write_wav(out_file, &trimmed, channels as u16, sample_rate)?;

    Ok(out_path.to_string_lossy().to_string())
}

fn write_wav<W: Write>(mut w: W, samples: &[i16], channels: u16, sample_rate: u32) -> Result<(), String> {
    let data_len = (samples.len() * 2) as u32;
    let header_len: u32 = 44;

    // RIFF
    w.write_all(b"RIFF").map_err(|e| e.to_string())?;
    w.write_all(&(header_len - 8 + data_len).to_le_bytes()).map_err(|e| e.to_string())?;
    w.write_all(b"WAVE").map_err(|e| e.to_string())?;
    // fmt
    w.write_all(b"fmt ").map_err(|e| e.to_string())?;
    w.write_all(&16u32.to_le_bytes()).map_err(|e| e.to_string())?;   // chunk size
    w.write_all(&1u16.to_le_bytes()).map_err(|e| e.to_string())?;    // PCM
    w.write_all(&channels.to_le_bytes()).map_err(|e| e.to_string())?;
    w.write_all(&sample_rate.to_le_bytes()).map_err(|e| e.to_string())?;
    w.write_all(&(sample_rate * channels as u32 * 2).to_le_bytes()).map_err(|e| e.to_string())?;
    w.write_all(&(channels * 2).to_le_bytes()).map_err(|e| e.to_string())?;
    w.write_all(&16u16.to_le_bytes()).map_err(|e| e.to_string())?;   // bits per sample
    // data
    w.write_all(b"data").map_err(|e| e.to_string())?;
    w.write_all(&data_len.to_le_bytes()).map_err(|e| e.to_string())?;
    for &s in samples {
        w.write_all(&s.to_le_bytes()).map_err(|e| e.to_string())?;
    }
    Ok(())
}

