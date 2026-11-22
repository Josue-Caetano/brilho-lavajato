//! Comandos de banco que o tauri-plugin-sql não oferece:
//! transações atômicas (o pool do plugin usa várias conexões, então
//! BEGIN/COMMIT em chamadas separadas não é seguro) e backup consistente.

use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::{sqlite::SqliteArguments, Arguments, Sqlite};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_sql::DbInstances;

#[derive(Deserialize)]
pub struct Statement {
    sql: String,
    #[serde(default)]
    params: Vec<JsonValue>,
}

#[derive(Serialize)]
pub struct StatementResult {
    #[serde(rename = "rowsAffected")]
    rows_affected: u64,
    #[serde(rename = "lastInsertId")]
    last_insert_id: i64,
}

/// Um parâmetro `{"$ref": n}` é substituído pelo id inserido pelo comando `n`
/// da mesma transação — assim uma ordem e seus itens entram juntos.
fn bind_value(
    args: &mut SqliteArguments<'_>,
    value: &JsonValue,
    results: &[StatementResult],
) -> Result<(), String> {
    let r = match value {
        JsonValue::Null => args.add(None::<i64>),
        JsonValue::Bool(b) => args.add(*b as i64),
        JsonValue::Number(n) => {
            if let Some(i) = n.as_i64() {
                args.add(i)
            } else {
                args.add(n.as_f64().unwrap_or_default())
            }
        }
        JsonValue::String(s) => args.add(s.clone()),
        JsonValue::Object(obj) if obj.contains_key("$ref") => {
            let idx = obj["$ref"].as_u64().ok_or("referência inválida")? as usize;
            let id = results
                .get(idx)
                .ok_or("referência a um comando que ainda não rodou")?
                .last_insert_id;
            args.add(id)
        }
        other => args.add(other.to_string()),
    };
    r.map_err(|e| e.to_string())
}

async fn pool(db: &State<'_, DbInstances>) -> Result<sqlx::Pool<Sqlite>, String> {
    let instances = db.0.read().await;
    match instances.get(crate::DB_URL) {
        Some(tauri_plugin_sql::DbPool::Sqlite(pool)) => Ok(pool.clone()),
        _ => Err("banco de dados não carregado".into()),
    }
}

#[tauri::command]
pub async fn db_transaction(
    db: State<'_, DbInstances>,
    statements: Vec<Statement>,
) -> Result<Vec<StatementResult>, String> {
    let pool = pool(&db).await?;
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    let mut results: Vec<StatementResult> = Vec::with_capacity(statements.len());
    for st in &statements {
        let mut args = SqliteArguments::default();
        for v in &st.params {
            bind_value(&mut args, v, &results)?;
        }
        let res = sqlx::query_with(&st.sql, args)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        results.push(StatementResult {
            rows_affected: res.rows_affected(),
            last_insert_id: res.last_insert_rowid(),
        });
    }
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(results)
}

/// Copia o banco para `destino` usando VACUUM INTO (cópia consistente mesmo com o app aberto).
#[tauri::command]
pub async fn db_backup(db: State<'_, DbInstances>, destino: String) -> Result<(), String> {
    let pool = pool(&db).await?;
    if std::path::Path::new(&destino).exists() {
        std::fs::remove_file(&destino).map_err(|e| e.to_string())?;
    }
    sqlx::query("VACUUM INTO ?")
        .bind(&destino)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Caminho do arquivo do banco (usado na restauração de backup).
#[tauri::command]
pub fn db_file_path(app: AppHandle) -> Result<String, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("brilho.db").to_string_lossy().into_owned())
}

/// Restaura um backup: guarda uma cópia de segurança do banco atual, fecha o pool,
/// substitui o arquivo e reinicia o app para reabrir tudo do zero.
#[tauri::command]
pub async fn db_restore(
    app: AppHandle,
    db: State<'_, DbInstances>,
    origem: String,
) -> Result<(), String> {
    let mut cabecalho = [0u8; 16];
    {
        use std::io::Read;
        let mut f = std::fs::File::open(&origem).map_err(|e| e.to_string())?;
        f.read_exact(&mut cabecalho)
            .map_err(|_| "O arquivo escolhido não é um backup válido.".to_string())?;
    }
    if &cabecalho != b"SQLite format 3\0" {
        return Err("O arquivo escolhido não é um backup válido.".into());
    }

    let destino = std::path::PathBuf::from(db_file_path(app.clone())?);
    let seguranca = destino.with_extension("antes-da-restauracao.db");
    db_backup(db.clone(), seguranca.to_string_lossy().into_owned()).await?;

    {
        let mut instances = db.0.write().await;
        if let Some(tauri_plugin_sql::DbPool::Sqlite(pool)) = instances.remove(crate::DB_URL) {
            pool.close().await;
        }
    }
    for sufixo in ["-wal", "-shm"] {
        let p = format!("{}{}", destino.to_string_lossy(), sufixo);
        let _ = std::fs::remove_file(p);
    }
    std::fs::copy(&origem, &destino).map_err(|e| e.to_string())?;
    app.restart();
}
