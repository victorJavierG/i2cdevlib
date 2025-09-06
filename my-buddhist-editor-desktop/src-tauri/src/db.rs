use rusqlite::{params, Connection, Result};
use serde::Serialize;

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

#[derive(Debug, Serialize)]
pub struct ParagraphRow {
    pub id: i64,
    pub section_id: i64,
    pub order_index: i64,
    pub text: String,
}

#[derive(Debug, Serialize)]
pub struct CommentaryRow {
    pub id: i64,
    pub paragraph_id: i64,
    pub section_id: Option<i64>,
    pub text: String,
    pub created_at: i64,
}

pub fn ensure_default_book_and_section(conn: &Connection) -> Result<(i64, i64)> {
    let now = chrono::Utc::now().timestamp();
    conn.execute(
        "INSERT INTO book (id, title, author, created_at) SELECT 1, 'Default Book', 'Unknown', ?1 WHERE NOT EXISTS (SELECT 1 FROM book WHERE id = 1)",
        params![now],
    )?;
    conn.execute(
        "INSERT INTO section (id, book_id, parent_id, title, order_index) SELECT 1, 1, NULL, 'Default Section', 1 WHERE NOT EXISTS (SELECT 1 FROM section WHERE id = 1)",
        params![],
    )?;
    Ok((1, 1))
}

pub fn list_paragraphs(conn: &Connection, section_id: Option<i64>) -> Result<Vec<ParagraphRow>> {
    let mut stmt = if let Some(sid) = section_id {
        conn.prepare("SELECT id, section_id, order_index, text FROM paragraph WHERE section_id = ?1 ORDER BY order_index ASC, id ASC")?
    } else {
        conn.prepare("SELECT id, section_id, order_index, text FROM paragraph ORDER BY section_id ASC, order_index ASC, id ASC")?
    };
    let rows = if let Some(sid) = section_id {
        stmt.query_map(params![sid], |row| {
            Ok(ParagraphRow {
                id: row.get(0)?,
                section_id: row.get(1)?,
                order_index: row.get(2)?,
                text: row.get(3)?,
            })
        })?
    } else {
        stmt.query_map([], |row| {
            Ok(ParagraphRow {
                id: row.get(0)?,
                section_id: row.get(1)?,
                order_index: row.get(2)?,
                text: row.get(3)?,
            })
        })?
    };
    let mut result = Vec::new();
    for r in rows { result.push(r?); }
    Ok(result)
}

pub fn create_paragraph(conn: &Connection, text: &str) -> Result<ParagraphRow> {
    let (_book_id, section_id) = ensure_default_book_and_section(conn)?;
    let next_order: i64 = conn.query_row(
        "SELECT COALESCE(MAX(order_index), 0) + 1 FROM paragraph WHERE section_id = ?1",
        params![section_id],
        |row| row.get(0),
    )?;
    conn.execute(
        "INSERT INTO paragraph (section_id, order_index, text) VALUES (?1, ?2, ?3)",
        params![section_id, next_order, text],
    )?;
    let id = conn.last_insert_rowid();
    super::db::log_edit(conn, "paragraph", id, "create")?;
    Ok(ParagraphRow { id, section_id, order_index: next_order, text: text.to_string() })
}

pub fn update_paragraph_text(conn: &Connection, id: i64, text: &str) -> Result<()> {
    conn.execute("UPDATE paragraph SET text = ?1 WHERE id = ?2", params![text, id])?;
    super::db::log_edit(conn, "paragraph", id, "update")?;
    Ok(())
}

pub fn list_commentaries(conn: &Connection, paragraph_id: i64) -> Result<Vec<CommentaryRow>> {
    let mut stmt = conn.prepare("SELECT id, paragraph_id, section_id, text, created_at FROM commentary WHERE paragraph_id = ?1 ORDER BY id ASC")?;
    let rows = stmt.query_map(params![paragraph_id], |row| {
        Ok(CommentaryRow {
            id: row.get(0)?,
            paragraph_id: row.get(1)?,
            section_id: row.get(2)?,
            text: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?;
    let mut result = Vec::new();
    for r in rows { result.push(r?); }
    Ok(result)
}

pub fn create_commentary(conn: &Connection, paragraph_id: i64, text: &str) -> Result<CommentaryRow> {
    let now = chrono::Utc::now().timestamp();
    // derive section_id from paragraph
    let section_id: i64 = conn.query_row("SELECT section_id FROM paragraph WHERE id = ?1", params![paragraph_id], |row| row.get(0))?;
    conn.execute(
        "INSERT INTO commentary (paragraph_id, section_id, author, text, created_at) VALUES (?1, ?2, NULL, ?3, ?4)",
        params![paragraph_id, section_id, text, now],
    )?;
    let id = conn.last_insert_rowid();
    super::db::log_edit(conn, "commentary", id, "create")?;
    Ok(CommentaryRow { id, paragraph_id, section_id: Some(section_id), text: text.to_string(), created_at: now })
}

pub fn update_commentary_text(conn: &Connection, id: i64, text: &str) -> Result<()> {
    conn.execute("UPDATE commentary SET text = ?1 WHERE id = ?2", params![text, id])?;
    super::db::log_edit(conn, "commentary", id, "update")?;
    Ok(())
}

