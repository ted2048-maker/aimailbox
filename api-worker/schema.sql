-- AIMailbox D1 Database Schema
-- Migration from KV to D1

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS inboxes;

-- Inboxes table
CREATE TABLE inboxes (
    id TEXT PRIMARY KEY,
    token_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    message_count INTEGER DEFAULT 0,
    last_message_at TEXT
);

-- Messages table
CREATE TABLE messages (
    id TEXT NOT NULL,
    inbox_id TEXT NOT NULL,
    from_addr TEXT NOT NULL,
    from_name TEXT DEFAULT '',
    to_addr TEXT NOT NULL,
    subject TEXT NOT NULL,
    text_content TEXT DEFAULT '',
    html_content TEXT DEFAULT '',
    code_value TEXT,
    code_type TEXT,
    code_confidence REAL,
    timestamp INTEGER NOT NULL,
    received_at TEXT NOT NULL,
    PRIMARY KEY (inbox_id, id),
    FOREIGN KEY (inbox_id) REFERENCES inboxes(id) ON DELETE CASCADE
);

-- Index for efficient message listing (newest first)
CREATE INDEX idx_messages_inbox_timestamp ON messages(inbox_id, timestamp DESC);

-- Index for finding inboxes by token (for potential future use)
CREATE INDEX idx_inboxes_created ON inboxes(created_at);
