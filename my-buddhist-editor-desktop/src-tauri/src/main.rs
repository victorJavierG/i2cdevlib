#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;

use std::sync::Mutex;
use tauri::State;

struct AppState {
    conn: Mutex<rusqlite::Connection>,
}

#[tauri::command]
fn cmd_log_edit(state: State<AppState>, target_type: String, target_id: i64, action: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|_| "lock error")?;
    db::log_edit(&conn, &target_type, target_id, &action).map_err(|e| e.to_string())
}

#[tauri::command]
fn cmd_create_link(state: State<AppState>, from_type: String, from_id: i64, to_type: String, to_id: i64) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|_| "lock error")?;
    db::create_link(&conn, &from_type, from_id, &to_type, to_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn cmd_get_backlinks(state: State<AppState>, to_type: String, to_id: i64) -> Result<Vec<(String, i64)>, String> {
    let conn = state.conn.lock().map_err(|_| "lock error")?;
    db::get_backlinks(&conn, &to_type, to_id).map_err(|e| e.to_string())
}

fn main() {
    let app_dir = tauri::api::path::app_dir(tauri::Config::default()).unwrap_or(std::path::PathBuf::from("."));
    let _ = std::fs::create_dir_all(&app_dir);
    let db_path = app_dir.join("buddhist_editor.sqlite3");
    let conn = db::open_or_create(db_path.to_string_lossy().as_ref()).expect("db open");

    tauri::Builder::default()
        .manage(AppState { conn: Mutex::new(conn) })
        .invoke_handler(tauri::generate_handler![cmd_log_edit, cmd_create_link, cmd_get_backlinks])
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

