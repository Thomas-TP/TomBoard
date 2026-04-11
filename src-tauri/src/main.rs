// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Write a crash log if something panics
    std::panic::set_hook(Box::new(|info| {
        let msg = format!("PANIC: {}\n{}", info, std::backtrace::Backtrace::force_capture());
        let log_path = std::env::current_exe()
            .unwrap()
            .parent()
            .unwrap()
            .join("crash.log");
        let _ = std::fs::write(&log_path, &msg);
        // Also try user desktop
        if let Some(home) = dirs::desktop_dir() {
            let _ = std::fs::write(home.join("tomboard_crash.log"), &msg);
        }
    }));

    // Velopack: must run first to handle install/update hooks
    velopack::VelopackApp::build().run();
    tomboard_lib::run()
}
