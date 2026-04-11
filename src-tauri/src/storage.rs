use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

fn default_speed() -> f32 { 1.0 }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Sound {
    pub id: String,
    pub name: String,
    #[serde(rename = "filePath")]
    pub file_path: String,
    pub category: String,
    pub tags: Vec<String>,
    pub icon: String,
    pub color: String,
    pub volume: f32,
    #[serde(default = "default_speed")]
    pub speed: f32,
    pub hotkey: Option<String>,
    #[serde(rename = "isFavorite")]
    pub is_favorite: bool,
    #[serde(rename = "isLooping")]
    pub is_looping: bool,
    #[serde(rename = "trimStart")]
    pub trim_start: f64,
    #[serde(rename = "trimEnd")]
    pub trim_end: Option<f64>,
    #[serde(rename = "addedAt")]
    pub added_at: String,
    #[serde(rename = "playCount")]
    pub play_count: u32,
    pub order: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub color: String,
    pub order: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub sounds: Vec<Sound>,
    pub categories: Vec<Category>,
}

fn default_theme() -> String { "dark".to_string() }
fn default_seed_color() -> String { "#6750A4".to_string() }
fn default_master_volume() -> f32 { 0.8 }
fn default_active_profile() -> String { "default".to_string() }
fn default_output_device() -> String { "default".to_string() }
fn default_false() -> bool { false }
fn default_empty_string() -> String { String::new() }
fn default_none_string() -> String { "none".to_string() }
fn default_true() -> bool { true }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(rename = "customSeedColor", default = "default_seed_color")]
    pub custom_seed_color: String,
    #[serde(rename = "masterVolume", default = "default_master_volume")]
    pub master_volume: f32,
    #[serde(rename = "activeProfileId", default = "default_active_profile")]
    pub active_profile_id: String,
    #[serde(rename = "outputDevice", default = "default_output_device")]
    pub output_device: String,
    #[serde(rename = "secondaryDevice", default = "default_none_string")]
    pub secondary_device: String,
    #[serde(rename = "dualOutput", default = "default_false")]
    pub dual_output: bool,
    #[serde(rename = "minimizeToTray", default = "default_false")]
    pub minimize_to_tray: bool,
    #[serde(rename = "launchMinimized", default = "default_false")]
    pub launch_minimized: bool,
    #[serde(rename = "soundsFolder", default = "default_empty_string")]
    pub sounds_folder: String,
    #[serde(rename = "freesoundApiKey", default = "default_empty_string")]
    pub freesound_api_key: String,
    #[serde(rename = "micPassthroughDevice", default = "default_empty_string")]
    pub mic_passthrough_device: String,
    #[serde(rename = "silentMode", default = "default_false")]
    pub silent_mode: bool,
    #[serde(rename = "noiseSuppression", default = "default_true")]
    pub noise_suppression: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            custom_seed_color: "#6750A4".to_string(),
            master_volume: 0.8,
            active_profile_id: "default".to_string(),
            output_device: "default".to_string(),
            secondary_device: "none".to_string(),
            dual_output: false,
            minimize_to_tray: false,
            launch_minimized: false,
            sounds_folder: String::new(),
            freesound_api_key: String::new(),
            mic_passthrough_device: String::new(),
            silent_mode: false,
            noise_suppression: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppData {
    pub settings: AppSettings,
    pub profiles: Vec<Profile>,
}

impl Default for AppData {
    fn default() -> Self {
        Self {
            settings: AppSettings::default(),
            profiles: vec![Profile {
                id: "default".to_string(),
                name: "Default".to_string(),
                sounds: Vec::new(),
                categories: vec![
                    Category {
                        id: "all".to_string(),
                        name: "Tous".to_string(),
                        icon: "apps".to_string(),
                        color: "#6750A4".to_string(),
                        order: 0,
                    },
                    Category {
                        id: "gaming".to_string(),
                        name: "Gaming".to_string(),
                        icon: "sports_esports".to_string(),
                        color: "#D32F2F".to_string(),
                        order: 1,
                    },
                    Category {
                        id: "fun".to_string(),
                        name: "Fun".to_string(),
                        icon: "emoji_emotions".to_string(),
                        color: "#F57C00".to_string(),
                        order: 2,
                    },
                    Category {
                        id: "music".to_string(),
                        name: "Musique".to_string(),
                        icon: "music_note".to_string(),
                        color: "#1976D2".to_string(),
                        order: 3,
                    },
                ],
            }],
        }
    }
}

fn get_data_path() -> PathBuf {
    let base = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    let dir = base.join("TomBoard");
    fs::create_dir_all(&dir).ok();
    dir.join("data.json")
}

pub fn get_sounds_dir() -> PathBuf {
    let base = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    let dir = base.join("TomBoard").join("sounds");
    fs::create_dir_all(&dir).ok();
    dir
}

pub fn load_data() -> AppData {
    let path = get_data_path();
    if path.exists() {
        match fs::read_to_string(&path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
            Err(_) => AppData::default(),
        }
    } else {
        let data = AppData::default();
        save_data(&data).ok();
        data
    }
}

pub fn save_data(data: &AppData) -> Result<(), String> {
    let path = get_data_path();
    let json = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| format!("Failed to save data: {}", e))
}
