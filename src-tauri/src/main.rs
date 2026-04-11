// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Velopack: must run first to handle install/update hooks
    velopack::VelopackApp::build().run();
    tomboard_lib::run()
}
