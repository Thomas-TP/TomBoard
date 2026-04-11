/// Lightweight HTTP server exposing TomBoard's API to external integrations
/// (StreamDeck plugin, OBS scripts, companion apps, etc.)
/// Runs on port 47891 by default.
///
/// Endpoints:
///   GET  /api/status               → { version, profiles, activeProfile }
///   POST /api/play?id=<sound_id>   → play a sound
///   POST /api/stop?id=<sound_id>   → stop a sound (or "all")
///   GET  /api/sounds               → list all sounds in current profile
///   GET  /api/profiles             → list profiles
///   POST /api/profile?id=<p_id>    → switch active profile

use std::sync::{Arc, Mutex};
use std::thread;
use tiny_http::{Response, Server};

use crate::audio::AudioHandle;
use crate::storage::{self, AppData};

pub const HTTP_PORT: u16 = 47891;

pub fn start(audio: Arc<AudioHandle>, data: Arc<Mutex<AppData>>) {
    thread::spawn(move || {
        let addr = format!("127.0.0.1:{}", HTTP_PORT);
        let server = match Server::http(&addr) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("[HTTP] Failed to bind {}: {}", addr, e);
                return;
            }
        };
        eprintln!("[HTTP] TomBoard API listening on http://{}", addr);

        for request in server.incoming_requests() {
            let method = request.method().as_str().to_uppercase();
            let raw_url = request.url().to_owned();

            // Split path and query
            let (path, query) = if let Some(pos) = raw_url.find('?') {
                (&raw_url[..pos], &raw_url[pos + 1..])
            } else {
                (raw_url.as_str(), "")
            };

            // Helper: parse ?key=value
            let param = |key: &str| -> Option<String> {
                for part in query.split('&') {
                    if let Some(val) = part.strip_prefix(&format!("{}=", key)) {
                        return Some(
                            val.replace('+', " ")
                                .replace("%20", " ")
                                .replace("%2F", "/")
                                .replace("%5C", "\\"),
                        );
                    }
                }
                None
            };

            // CORS headers helper
            let cors = |resp: Response<std::io::Cursor<Vec<u8>>>| {
                resp.with_header(
                    tiny_http::Header::from_bytes("Access-Control-Allow-Origin", "*").unwrap(),
                )
                .with_header(
                    tiny_http::Header::from_bytes("Content-Type", "application/json").unwrap(),
                )
            };

            let response: Response<std::io::Cursor<Vec<u8>>> = match (method.as_str(), path) {
                ("GET", "/api/status") | ("GET", "/api/status/") => {
                    let guard = data.lock().unwrap();
                    let profile = guard
                        .profiles
                        .iter()
                        .find(|p| p.id == guard.settings.active_profile_id)
                        .map(|p| p.name.clone())
                        .unwrap_or_default();
                    let json = format!(
                        r#"{{"version":"{}","activeProfile":"{}","profileCount":{}}}"#,
                        env!("CARGO_PKG_VERSION"),
                        profile,
                        guard.profiles.len()
                    );
                    cors(Response::from_string(json))
                }

                ("GET", "/api/sounds") | ("GET", "/api/sounds/") => {
                    let guard = data.lock().unwrap();
                    let sounds: Vec<String> = guard
                        .profiles
                        .iter()
                        .find(|p| p.id == guard.settings.active_profile_id)
                        .map(|p| {
                            p.sounds
                                .iter()
                                .map(|s| {
                                    format!(
                                        r#"{{"id":"{}","name":"{}","category":"{}"}}"#,
                                        s.id, s.name, s.category
                                    )
                                })
                                .collect()
                        })
                        .unwrap_or_default();
                    let json = format!("[{}]", sounds.join(","));
                    cors(Response::from_string(json))
                }

                ("GET", "/api/profiles") | ("GET", "/api/profiles/") => {
                    let guard = data.lock().unwrap();
                    let profiles: Vec<String> = guard
                        .profiles
                        .iter()
                        .map(|p| {
                            format!(
                                r#"{{"id":"{}","name":"{}","active":{}}}"#,
                                p.id,
                                p.name,
                                p.id == guard.settings.active_profile_id
                            )
                        })
                        .collect();
                    let json = format!("[{}]", profiles.join(","));
                    cors(Response::from_string(json))
                }

                ("POST", "/api/play") | ("POST", "/api/play/") => {
                    let id = param("id");
                    let guard = data.lock().unwrap();
                    let profile = guard
                        .profiles
                        .iter()
                        .find(|p| p.id == guard.settings.active_profile_id);
                    let sound = id.as_ref().and_then(|sid| {
                        profile.and_then(|p| p.sounds.iter().find(|s| s.id == *sid || s.name == *sid))
                    });

                    if let Some(s) = sound {
                        let _ = audio.play(&s.id, &s.file_path, s.volume, false, 1.0, 0.0, 0.0);
                        cors(Response::from_string(format!(r#"{{"ok":true,"id":"{}"}}"#, s.id)))
                    } else {
                        cors(Response::from_string(r#"{"ok":false,"error":"sound not found"}"#)
                            .with_status_code(404))
                    }
                }

                ("POST", "/api/stop") | ("POST", "/api/stop/") => {
                    let id = param("id");
                    if id.as_deref() == Some("all") || id.is_none() {
                        let _ = audio.stop_all();
                    } else if let Some(sid) = id {
                        let _ = audio.stop(&sid);
                    }
                    cors(Response::from_string(r#"{"ok":true}"#))
                }

                ("POST", "/api/profile") | ("POST", "/api/profile/") => {
                    let id = param("id");
                    if let Some(pid) = id {
                        let mut guard = data.lock().unwrap();
                        if guard.profiles.iter().any(|p| p.id == pid) {
                            guard.settings.active_profile_id = pid.clone();
                            let _ = storage::save_data(&guard);
                            drop(guard);
                            cors(Response::from_string(format!(r#"{{"ok":true,"id":"{}"}}"#, pid)))
                        } else {
                            cors(Response::from_string(r#"{"ok":false,"error":"profile not found"}"#)
                                .with_status_code(404))
                        }
                    } else {
                        cors(Response::from_string(r#"{"ok":false,"error":"missing id"}"#)
                            .with_status_code(400))
                    }
                }

                ("OPTIONS", _) => {
                    // CORS preflight
                    cors(Response::from_string(""))
                        .with_header(
                            tiny_http::Header::from_bytes(
                                "Access-Control-Allow-Methods",
                                "GET, POST, OPTIONS",
                            )
                            .unwrap(),
                        )
                }

                _ => cors(
                    Response::from_string(r#"{"ok":false,"error":"not found"}"#)
                        .with_status_code(404),
                ),
            };

            let _ = request.respond(response);
        }
    });
}
