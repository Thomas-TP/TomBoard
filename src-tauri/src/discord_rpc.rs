/// Discord Rich Presence via local IPC (named pipe on Windows, Unix socket on Linux/macOS)
/// Protocol: 4-byte LE opcode + 4-byte LE length + JSON payload
/// Runs in a background thread; reconnects automatically on disconnect.

use std::sync::Mutex;
use std::thread;
use std::time::Duration;

#[cfg(target_os = "windows")]
use std::io::{Read, Write};

// The public state maintained by the background thread
pub struct RpcState {
    pub enabled: bool,
    pub detail: String,
    pub state: String,
}

static RPC_STATE: Mutex<Option<RpcState>> = Mutex::new(None);

/// Call this to update the presence text. Thread-safe.
pub fn update(detail: impl Into<String>, state: impl Into<String>) {
    if let Ok(mut guard) = RPC_STATE.lock() {
        if let Some(rpc) = guard.as_mut() {
            if rpc.enabled {
                rpc.detail = detail.into();
                rpc.state = state.into();
            }
        }
    }
}

/// Enable or disable Rich Presence.
pub fn set_enabled(enabled: bool) {
    if let Ok(mut guard) = RPC_STATE.lock() {
        if let Some(rpc) = guard.as_mut() {
            rpc.enabled = enabled;
        } else if enabled {
            *guard = Some(RpcState {
                enabled: true,
                detail: "TomBoard ouvert".into(),
                state: "".into(),
            });
        }
    }
}

/// Start the background thread (idempotent — safe to call multiple times).
pub fn start() {
    {
        let mut guard = RPC_STATE.lock().unwrap();
        if guard.is_none() {
            *guard = Some(RpcState {
                enabled: true,
                detail: "TomBoard ouvert".into(),
                state: "".into(),
            });
        }
    }
    thread::spawn(run_loop);
}

const CLIENT_ID: &str = "1234567890123456789"; // Replace with your Discord App ID
const OPCODE_HANDSHAKE: u32 = 0;
const OPCODE_FRAME: u32 = 1;

fn run_loop() {
    loop {
        if let Err(e) = connect_and_run() {
            eprintln!("[Discord RPC] Disconnected: {}", e);
        }
        // Wait before reconnecting
        thread::sleep(Duration::from_secs(15));
    }
}

fn connect_and_run() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::fs::OpenOptions;
        use std::os::windows::fs::OpenOptionsExt;

        // Try pipes 0-9
        let mut pipe = None;
        for i in 0..10u8 {
            let path = format!(r"\\.\pipe\discord-ipc-{}", i);
            match OpenOptions::new()
                .read(true)
                .write(true)
                .custom_flags(0) // FILE_FLAG_OVERLAPPED not needed for simple sync use
                .open(&path)
            {
                Ok(f) => { pipe = Some(f); break; }
                Err(_) => continue,
            }
        }
        let mut pipe = pipe.ok_or_else(|| "Discord not running".to_string())?;

        // Handshake
        let handshake = serde_json::json!({
            "v": 1,
            "client_id": CLIENT_ID
        });
        send_frame(&mut pipe, OPCODE_HANDSHAKE, &handshake.to_string())?;

        // Read handshake response (opcode 1 = FRAME with READY event)
        let (_op, _payload) = read_frame(&mut pipe)?;

        // Main loop: send presence every 15 s or on change
        let mut last_detail = String::new();
        let mut last_state = String::new();

        loop {
            let (detail, state, enabled) = {
                let guard = RPC_STATE.lock().map_err(|e| e.to_string())?;
                match guard.as_ref() {
                    Some(rpc) => (rpc.detail.clone(), rpc.state.clone(), rpc.enabled),
                    None => return Ok(()),
                }
            };

            if !enabled {
                // Send clear presence
                let payload = build_update_payload("", "");
                send_frame(&mut pipe, OPCODE_FRAME, &payload)?;
                thread::sleep(Duration::from_secs(5));
                continue;
            }

            if detail != last_detail || state != last_state {
                let payload = build_update_payload(&detail, &state);
                send_frame(&mut pipe, OPCODE_FRAME, &payload)?;
                last_detail = detail;
                last_state = state;
            }

            thread::sleep(Duration::from_secs(5));

            // Read any pending frames (non-blocking via short read attempt)
            // We just drain them — errors = disconnect
            match read_frame_nonblocking(&mut pipe) {
                Ok(_) => {}
                Err(_) => return Err("pipe closed".into()),
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        use std::os::unix::net::UnixStream;

        let mut stream = None;
        for i in 0..10u8 {
            let path = format!("/tmp/discord-ipc-{}", i);
            match UnixStream::connect(&path) {
                Ok(s) => { stream = Some(s); break; }
                Err(_) => continue,
            }
        }
        let mut stream = stream.ok_or_else(|| "Discord not running".to_string())?;

        let handshake = serde_json::json!({ "v": 1, "client_id": CLIENT_ID });
        send_frame(&mut stream, OPCODE_HANDSHAKE, &handshake.to_string())?;
        let _ = read_frame(&mut stream)?;

        let mut last_detail = String::new();
        let mut last_state = String::new();

        loop {
            let (detail, state, enabled) = {
                let guard = RPC_STATE.lock().map_err(|e| e.to_string())?;
                match guard.as_ref() {
                    Some(rpc) => (rpc.detail.clone(), rpc.state.clone(), rpc.enabled),
                    None => return Ok(()),
                }
            };

            if !enabled {
                let payload = build_update_payload("", "");
                send_frame(&mut stream, OPCODE_FRAME, &payload)?;
                thread::sleep(Duration::from_secs(5));
                continue;
            }

            if detail != last_detail || state != last_state {
                let payload = build_update_payload(&detail, &state);
                send_frame(&mut stream, OPCODE_FRAME, &payload)?;
                last_detail = detail;
                last_state = state;
            }

            thread::sleep(Duration::from_secs(5));
            match read_frame_nonblocking(&mut stream) {
                Ok(_) => {}
                Err(_) => return Err("socket closed".into()),
            }
        }
    }
}

fn build_update_payload(detail: &str, state: &str) -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    if detail.is_empty() {
        // Clear presence
        serde_json::json!({
            "cmd": "SET_ACTIVITY",
            "args": { "pid": std::process::id(), "activity": null },
            "nonce": now.to_string()
        }).to_string()
    } else {
        serde_json::json!({
            "cmd": "SET_ACTIVITY",
            "args": {
                "pid": std::process::id(),
                "activity": {
                    "details": detail,
                    "state": state,
                    "timestamps": { "start": now },
                    "assets": {
                        "large_image": "tomboard_logo",
                        "large_text": "TomBoard Soundboard"
                    }
                }
            },
            "nonce": now.to_string()
        }).to_string()
    }
}

fn send_frame<W: Write>(w: &mut W, opcode: u32, payload: &str) -> Result<(), String> {
    let bytes = payload.as_bytes();
    let len = bytes.len() as u32;
    let mut header = [0u8; 8];
    header[0..4].copy_from_slice(&opcode.to_le_bytes());
    header[4..8].copy_from_slice(&len.to_le_bytes());
    w.write_all(&header).map_err(|e| e.to_string())?;
    w.write_all(bytes).map_err(|e| e.to_string())?;
    Ok(())
}

fn read_frame<R: Read>(r: &mut R) -> Result<(u32, String), String> {
    let mut header = [0u8; 8];
    r.read_exact(&mut header).map_err(|e| e.to_string())?;
    let opcode = u32::from_le_bytes([header[0], header[1], header[2], header[3]]);
    let len = u32::from_le_bytes([header[4], header[5], header[6], header[7]]) as usize;
    let mut buf = vec![0u8; len];
    r.read_exact(&mut buf).map_err(|e| e.to_string())?;
    let payload = String::from_utf8_lossy(&buf).into_owned();
    Ok((opcode, payload))
}

// Non-blocking via a zero-byte read attempt; on Windows named pipes this
// returns immediately if no data is waiting (ERROR_NO_DATA → WouldBlock).
fn read_frame_nonblocking<R: Read>(r: &mut R) -> Result<Option<(u32, String)>, String> {
    let mut header = [0u8; 8];
    match r.read(&mut header[..1]) {
        Ok(0) => Err("EOF".into()),
        Ok(_) => {
            // There is data — read the rest
            r.read_exact(&mut header[1..]).map_err(|e| e.to_string())?;
            let opcode = u32::from_le_bytes([header[0], header[1], header[2], header[3]]);
            let len = u32::from_le_bytes([header[4], header[5], header[6], header[7]]) as usize;
            let mut buf = vec![0u8; len];
            r.read_exact(&mut buf).map_err(|e| e.to_string())?;
            let payload = String::from_utf8_lossy(&buf).into_owned();
            Ok(Some((opcode, payload)))
        }
        Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => Ok(None),
        Err(_) => Err("read error".into()),
    }
}
