use rusqlite::{params, Connection, Result};

pub fn open_or_create(db_path: &str) -> Result<Connection> {
    let conn = Connection::open(db_path)?;
    initialize_schema(&conn)?;
    Ok(conn)
}

fn initialize_schema(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS book (
          id INTEGER PRIMARY KEY,
          title TEXT NOT NULL,
          author TEXT,
          created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS section (
          id INTEGER PRIMARY KEY,
          book_id INTEGER NOT NULL REFERENCES book(id) ON DELETE CASCADE,
          parent_id INTEGER REFERENCES section(id) ON DELETE CASCADE,
          title TEXT,
          order_index INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS paragraph (
          id INTEGER PRIMARY KEY,
          section_id INTEGER NOT NULL REFERENCES section(id) ON DELETE CASCADE,
          order_index INTEGER NOT NULL,
          text TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS commentary (
          id INTEGER PRIMARY KEY,
          paragraph_id INTEGER REFERENCES paragraph(id) ON DELETE CASCADE,
          section_id INTEGER REFERENCES section(id) ON DELETE CASCADE,
          author TEXT,
          text TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS note_link (
          id INTEGER PRIMARY KEY,
          from_type TEXT NOT NULL CHECK(from_type IN ('paragraph','commentary')),
          from_id INTEGER NOT NULL,
          to_type TEXT NOT NULL CHECK(to_type IN ('paragraph','commentary')),
          to_id INTEGER NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_note_link_from ON note_link(from_type, from_id);
        CREATE INDEX IF NOT EXISTS idx_note_link_to ON note_link(to_type, to_id);

        CREATE TABLE IF NOT EXISTS edit_log (
          id INTEGER PRIMARY KEY,
          target_type TEXT NOT NULL CHECK(target_type IN ('paragraph','commentary','section','book')),
          target_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS review_item (
          id INTEGER PRIMARY KEY,
          target_type TEXT NOT NULL CHECK(target_type IN ('paragraph','section')),
          target_id INTEGER NOT NULL,
          next_review_at INTEGER NOT NULL,
          ease REAL NOT NULL DEFAULT 2.5,
          interval_days INTEGER NOT NULL DEFAULT 1
        );
        "#,
    )?;
    Ok(())
}

pub fn log_edit(conn: &Connection, target_type: &str, target_id: i64, action: &str) -> Result<()> {
    let now = chrono::Utc::now().timestamp();
    conn.execute(
        "INSERT INTO edit_log (target_type, target_id, action, at) VALUES (?1, ?2, ?3, ?4)",
        params![target_type, target_id, action, now],
    )?;
    Ok(())
}

pub fn create_link(conn: &Connection, from_type: &str, from_id: i64, to_type: &str, to_id: i64) -> Result<()> {
    let now = chrono::Utc::now().timestamp();
    conn.execute(
        "INSERT INTO note_link (from_type, from_id, to_type, to_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![from_type, from_id, to_type, to_id, now],
    )?;
    Ok(())
}

pub fn get_backlinks(conn: &Connection, to_type: &str, to_id: i64) -> Result<Vec<(String, i64)>> {
    let mut stmt = conn.prepare(
        "SELECT from_type, from_id FROM note_link WHERE to_type = ?1 AND to_id = ?2 ORDER BY created_at DESC",
    )?;
    let rows = stmt
        .query_map(params![to_type, to_id], |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?)))?;
    let mut result = Vec::new();
    for r in rows {
        result.push(r?);
    }
    Ok(result)
}

