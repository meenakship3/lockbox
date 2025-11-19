CREATE TABLE api_tokens (
	id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
	token_name TEXT NOT NULL,
	service_name TEXT NOT NULL,
	token_value TEXT NOT NULL,
	description TEXT,
	token_type TEXT NOT NULL CHECK(token_type IN ('API_KEY', 'OAUTH', 'JWT', 'PERSONAL_ACCESS_TOKEN', 'OTHER')),
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expiry_date DATETIME,
    is_active BOOLEAN DEFAULT 1
);
CREATE TABLE notification_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_id INTEGER NOT NULL,
    notify_days_before INTEGER DEFAULT 7,  -- Notify 7 days before expiry
    notification_enabled BOOLEAN DEFAULT 1,
    last_notification_sent DATETIME,
    FOREIGN KEY (token_id) REFERENCES api_tokens(id) ON DELETE CASCADE
);
CREATE TABLE notification_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_id INTEGER NOT NULL,
    notification_type TEXT CHECK(notification_type IN ('EXPIRY_WARNING', 'EXPIRED', 'CUSTOM')),
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    message TEXT,
    was_acknowledged BOOLEAN DEFAULT 0, days_before_expiry INTEGER, notification_category TEXT CHECK(notification_category IN ('SEVEN_DAYS', 'ONE_DAY', 'EXPIRED')), notification_message TEXT,
    FOREIGN KEY (token_id) REFERENCES api_tokens(id) ON DELETE CASCADE
);
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#3B82F6',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE token_tags (
    token_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (token_id, tag_id),
    FOREIGN KEY (token_id) REFERENCES api_tokens(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_id INTEGER,
    action TEXT NOT NULL CHECK(action IN ('CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT', 'COPY')),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    details TEXT,
    FOREIGN KEY (token_id) REFERENCES api_tokens(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS auth_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_tokens_expiry ON api_tokens(expiry_date) WHERE is_active = 1;
CREATE TRIGGER update_token_timestamp 
AFTER UPDATE ON api_tokens
BEGIN
    UPDATE api_tokens SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
CREATE INDEX idx_tokens_service ON api_tokens(service_name);
CREATE INDEX idx_tokens_active ON api_tokens(is_active);
CREATE INDEX idx_notifications_pending ON notification_settings(token_id) WHERE notification_enabled = 1;
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_token ON audit_log(token_id);
CREATE TRIGGER log_token_deletion
BEFORE DELETE ON api_tokens
BEGIN
    INSERT INTO audit_log (token_id, action, details)
    VALUES (OLD.id, 'DELETE', 'Token: ' || OLD.token_name || ' for ' || OLD.service_name);
END;
CREATE TRIGGER auto_create_notification_settings
AFTER INSERT ON api_tokens
WHEN NEW.expiry_date IS NOT NULL
BEGIN
    INSERT INTO notification_settings (token_id, notify_days_before)
    VALUES (NEW.id, 7);
END;
