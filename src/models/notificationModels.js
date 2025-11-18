const db = require('./db');

function getTokensExpiringWithin(days) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT
                t.id,
                t.token_name,
                t.service_name,
                t.expiry_date,
                t.token_type,
                ns.notification_enabled,
                ns.notify_days_before
            FROM api_tokens t
            LEFT JOIN notification_settings ns ON t.id = ns.token_id
            WHERE t.expiry_date IS NOT NULL
                AND julianday(t.expiry_date) - julianday('now') BETWEEN 0 AND ?
                AND (ns.notification_enabled = 1 OR ns.notification_enabled IS NULL)
            ORDER BY t.expiry_date ASC
        `;

        db.all(sql, [days], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
}

function hasNotificationBeenSent(tokenId, category) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT COUNT(*) as count
            FROM notification_history
            WHERE token_id = ? AND notification_category = ?
        `;

        db.get(sql, [tokenId, category], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(row.count > 0);
        });
    });
}

function recordNotification(tokenId, category, message, daysBeforeExpiry) {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO notification_history
            (token_id, notification_category, notification_message, days_before_expiry)
            VALUES (?, ?, ?, ?)
        `;
        db.run(sql, [tokenId, category, message, daysBeforeExpiry], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve({ id: this.lastID });
        });
    });
}

function clearNotificationHistory(tokenId) {
    return new Promise((resolve, reject) => {
        const sql = 'DELETE FROM notification_history WHERE token_id = ?';

        db.run(sql, [tokenId], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(({ deleted: this.changes }));
        });
    });
}

module.exports = {
    getTokensExpiringWithin,
    hasNotificationBeenSent,
    recordNotification,
    clearNotificationHistory
};