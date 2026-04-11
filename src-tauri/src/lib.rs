mod audio;
mod commands;
mod storage;
mod voice_fx;

use std::sync::Mutex;

use audio::AudioHandle;
use commands::{AudioState, DataState, MicPassthroughState};
use tauri::{
    image::Image,
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    Manager, WindowEvent,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let audio_handle = AudioHandle::new().expect("Failed to initialize audio engine");
    let app_data = storage::load_data();
    let launch_minimized = app_data.settings.launch_minimized;

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(AudioState(audio_handle))
        .manage(DataState(Mutex::new(app_data)))
        .manage(MicPassthroughState(Mutex::new(None)))
        .setup(move |app| {
            // Build tray menu
            let show_item = MenuItemBuilder::with_id("show", "Afficher TomBoard")
                .build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Quitter")
                .build(app)?;
            let menu = MenuBuilder::new(app)
                .item(&show_item)
                .separator()
                .item(&quit_item)
                .build()?;

            // Build tray icon (embedded at compile time to avoid path issues in production)
            let icon = Image::from_bytes(include_bytes!("../icons/32x32.png"))
                .expect("Failed to load tray icon");

            let _tray = TrayIconBuilder::new()
                .icon(icon)
                .tooltip("TomBoard")
                .menu(&menu)
                .show_menu_on_left_click(false)                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, button_state: tauri::tray::MouseButtonState::Up, .. } = event {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // Show window unless launch_minimized is enabled
            if !launch_minimized {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Check minimize_to_tray setting
                let minimize_to_tray = {
                    if let Some(data_state) = window.try_state::<DataState>() {
                        let d = data_state.0.lock().unwrap();
                        d.settings.minimize_to_tray
                    } else {
                        false
                    }
                };
                if minimize_to_tray {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::play_sound,
            commands::stop_sound,
            commands::stop_all,
            commands::set_volume,
            commands::set_speed,
            commands::set_master_volume,
            commands::set_output_device,
            commands::set_secondary_device,
            commands::set_dual_output,
            commands::test_secondary_output,
            commands::extract_audio_from_video,
            commands::list_tts_voices,
            commands::synthesize_speech,
            commands::search_myinstants,
            commands::download_library_sound,
            commands::preview_library_sound,
            commands::stop_preview_library,
            commands::check_virtual_cable,
            commands::install_virtual_cable,
            commands::get_playing,
            commands::get_waveform,
            commands::get_data,
            commands::save_settings,
            commands::add_sound,
            commands::update_sound,
            commands::delete_sound,
            commands::add_category,
            commands::delete_category,
            commands::reorder_categories,
            commands::add_profile,
            commands::switch_profile,
            commands::rename_profile,
            commands::delete_profile,
            commands::duplicate_profile,
            commands::save_recording,
            commands::list_audio_devices,
            commands::list_audio_input_devices,
            commands::start_mic_passthrough,
            commands::stop_mic_passthrough,
            commands::set_silent_mode,
            commands::list_voice_presets,
            commands::set_voice_preset,
            commands::set_voice_custom_params,
            commands::get_voice_params,
            commands::set_noise_suppression,
            commands::get_app_data_dir,
            commands::export_data,
            commands::import_data,
            commands::get_current_version,
            commands::check_for_updates,
            commands::download_and_apply_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running TomBoard");
}
