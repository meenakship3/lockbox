const db = require('./db');

function getTokens() {
    return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM api_tokens";
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

function updateToken(id, updates) {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE api_tokens SET token_name = ?, service_name = ?, token_value = ?, description = ?, token_type = ?, expiry_date = ? WHERE id = ?`;
        const params = [
            updates.tokenName,
            updates.serviceName, 
            updates.tokenValue, 
            updates.description,
            updates.tokenType,
            updates.expiryDate,
            id
        ];

        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
                return;
            }
            if (this.changes === 0) {
                reject(new Error(`Token with id ${id} not found`));
            }
            resolve({ id: String(id), ...updates });
        });
    });
}

function addToken(tokenData) {
    return new Promise((resolve, reject) => {
        const sql = `INSERT INTO api_tokens(token_name, service_name, token_value, description, token_type, expiry_date) VALUES (?, ?, ?, ?, ?, ?)`;
        const params = [
            tokenData.tokenName,
            tokenData.serviceName,
            tokenData.tokenValue,
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
    updateToken,
    addToken,
    deleteToken
}
