const db = require('./db');
const { encrypt, decrypt } = require('../utils/encryption')

require('dotenv').config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY not found in environment variables');
}

function getTokens() {
    return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM api_tokens ORDER BY id DESC";
        db.all(sql, [], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            const tokens = rows.map(row => ({
                id: String(row.id),
                service: row.service_name,
                token: row.token_name,
                value: row.token_value,
                description: row.description,
                type: row.token_type,
                expiryDate: row.expiry_date
            }));

            resolve(tokens);
        });
    });
}

// for viewing, editing and export
function getTokensById(ids) {
    return new Promise((resolve, reject) => {
        if (!ids || ids.length === 0) {
            resolve([]);
            return;
        }
        const placeholders = ids.map(() => '?').join(',');

        const sql = `SELECT * FROM api_tokens WHERE id IN (${placeholders})`;

        db.all(sql, ids, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            const tokens = rows.map(row => ({
                id: String(row.id),
                service: row.service_name,
                token: row.token_name,
                value: decrypt(ENCRYPTION_KEY, row.token_value),
                description: row.description,
                type: row.token_type,
                expiryDate: row.expiry_date
            }));
            resolve(tokens);
        })
    })

}

function updateToken(id, updates) {
    return new Promise((resolve, reject) => {
        const fields = [];
        const params = [];

        if (updates.serviceName) {
            fields.push('service_name = ?');
            params.push(updates.serviceName);
        }
        if (updates.tokenName) {
            fields.push('token_name = ?');
            params.push(updates.tokenName);
        }
        if (updates.tokenValue) {
            const encryptedValue = encrypt(updates.tokenValue, ENCRYPTION_KEY);
            fields.push('token_value = ?');
            params.push(encryptedValue);
        }
        if (updates.description !== undefined) {
            fields.push('description = ?');
            params.push(updates.description);
        }
        if (updates.tokenType) {
            fields.push('token_type = ?');
            params.push(updates.tokenType);
        }
        if (updates.expiryDate !== undefined) {
            fields.push('expiry_date = ?');
            params.push(updates.expiryDate);
        }

        params.push(id);

        const sql = `UPDATE api_tokens SET ${fields.join(', ')} WHERE id = ?`;

        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
                return;
            }

            if (updates.expiryDate !== undefined) {
                const notificationModels = require('./notificationModels');
                notificationModels.clearNotificationHistory(id)
                    .then(() => {
                        console.log(`Cleared notification history for token ${id}`);
                        resolve({ id: String(id), ...updates });
                    })
                    .catch((clearErr) => {
                        console.error('Error clearing notification history:', clearErr);
                        resolve({ id: String(id), ...updates });
                    });
            } else {
                resolve({ id: String(id), ...updates });
            }
        });
    });
}

function addToken(tokenData) {
    return new Promise((resolve, reject) => {
        const encryptedValue = encrypt(ENCRYPTION_KEY, tokenData.tokenValue);
        const sql = `INSERT INTO api_tokens(token_name, service_name, token_value, description, token_type, expiry_date) VALUES (?, ?, ?, ?, ?, ?)`;
        const params = [
            tokenData.tokenName,
            tokenData.serviceName,
            encryptedValue,
            tokenData.description,
            tokenData.tokenType,
            tokenData.expiryDate
        ];
        db.run(sql, params, function(err) {
            if(err) {
                reject(err);
                return;
            }
            resolve({
                id: String(this.lastID),
                ...tokenData
            });
        });
    });
}

function deleteToken(id) {
    return new Promise((resolve, reject) => {
        const sql = `DELETE FROM api_tokens WHERE id = ?`
        db.run(sql, [id], function(err) {
            if (err) {
                reject(err);
                return;
            }
            if (this.changes === 0) {
                reject(new Error(`Token with id ${id} not found`));
                return;
            }
            resolve({ deleted: true, id: String(id) });
        });
    });
}

module.exports = {
    getTokens,
    getTokensById,
    updateToken,
    addToken,
    deleteToken
}
