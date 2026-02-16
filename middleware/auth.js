// middleware/auth.js
// @ts-check
const jwt = require('jsonwebtoken');
const db = require('../config/db'); // Importujemy bazę
const SECRET_KEY = process.env.SECRET_KEY || 'TWOJE_SUPER_TAJNE_HASLO_SERWERA_ZMIEN_MNIE';

/**
 * @typedef {{ id: number, login: string, dom_id?: number | null }} AuthUser
 */

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function weryfikujToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ sukces: false, wiadomosc: 'Brak dostępu' });

    jwt.verify(token, SECRET_KEY, (/** @type {Error | null} */ err, /** @type {AuthUser} */ user) => {
        if (err) return res.status(403).json({ sukces: false, wiadomosc: 'Token nieważny' });
        const verifiedUser = user;
        req.user = verifiedUser;
        
        // Zawsze pobieramy aktualny dom_id z bazy
        db.get("SELECT dom_id, id, login FROM uzytkownicy WHERE id = ?", [verifiedUser.id], (err, row) => {
            if (row) {
                verifiedUser.dom_id = row.dom_id;
                verifiedUser.id = row.id;
                verifiedUser.login = row.login;
            }
            next();
        });
    });
}

module.exports = weryfikujToken;
