const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// For development
const dbPath = path.join(__dirname, '../../chinese_whispers.db')
// For production
// const dbPath = path.join(app.getPath('userData'), 'chinese_whispers.db')

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Database connection failed", err);
    } else {
        console.log("Database connected successfully");
    }
});
module.exports = db;