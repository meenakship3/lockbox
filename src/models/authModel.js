const db = require('./db');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

function isPasswordSetup() {
    const row = db.prepare('SELECT id FROM auth_config WHERE id = 1').get();
    return !!row;
}

function setupPassword(password) {
    if (isPasswordSetup()) {
        throw new Error('Password already set up');
    }
    const salt = bcrypt.genSaltSync(SALT_ROUNDS);
    const hash = bcrypt.hashSync(password, salt);

    db.prepare('INSERT INTO auth_config (id, password_hash, salt) VALUES (1, ?, ?)')
      .run(hash, salt);
}

function verifyPassword(password) {
    const row = db.prepare('SELECT password_hash FROM auth_config WHERE id = 1').get();

    if (!row) {
        throw new Error('Password not set up');
    }

    return bcrypt.compareSync(password, row.password_hash);
}

module.exports = {
    isPasswordSetup,
    setupPassword,
    verifyPassword
};
