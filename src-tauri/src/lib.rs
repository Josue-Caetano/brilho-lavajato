mod db;

pub const DB_URL: &str = "sqlite:brilho.db";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
        .invoke_handler(tauri::generate_handler![
            db::db_transaction,
            db::db_backup,
            db::db_file_path,
            db::db_restore,
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Brilho");
}
