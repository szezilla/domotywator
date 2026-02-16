// routes/authRoutes.js
// @ts-check
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../config/db');
const emailTemplates = require('../config/emailTemplates');
const resetTemplate = require('../config/resetEmailTemplate');
const weryfikujToken = require('../middleware/auth');
const SECRET_KEY = process.env.SECRET_KEY || 'TWOJE_SUPER_TAJNE_HASLO_SERWERA_ZMIEN_MNIE';
const DOMENA = process.env.DOMENA || `http://localhost:${process.env.PORT || 3000}`;

// Konfiguracja Mailera
const mailPort = parseInt(process.env.MAIL_PORT || '', 10) || 465;
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: mailPort,
    secure: (process.env.MAIL_SECURE === 'true' || mailPort === 465),
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
});

/**
 * @param {string} sql
 * @param {unknown[]} [params]
 * @returns {Promise<any>}
 */
function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

/**
 * @param {string} sql
 * @param {unknown[]} [params]
 * @returns {Promise<{ changes?: number, lastID?: number }>}
 */
function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) return reject(err);
            resolve({ changes: this.changes, lastID: this.lastID });
        });
    });
}

/**
 * @param {unknown} value
 * @returns {'pl'|'en'}
 */
function normalizeLang(value) {
    return value === 'en' ? 'en' : 'pl';
}

router.post('/login', (req, res) => {
    const { login, haslo } = req.body;
    db.get("SELECT * FROM uzytkownicy WHERE login = ?", [login], async (err, user) => {
        if (!user) {
            return res.json({ sukces: false, wiadomosc: 'Błędny login lub hasło' });
        }
        if (user.czy_potwierdzony !== 1) {
            return res.json({ sukces: false, wiadomosc: 'Konto nieaktywne. Sprawdź email.' });
        }
        if (!user || !(await bcrypt.compare(haslo, user.haslo))) {
            return res.json({ sukces: false, wiadomosc: 'Błędny login lub hasło' });
        }
        
        const token = jwt.sign({ login: user.login, id: user.id }, SECRET_KEY, { expiresIn: '7d' });
        res.json({ sukces: true, login: user.login, token: token, dom_id: user.dom_id });
    });
});

router.post('/rejestracja', async (req, res) => {
    const { login, haslo, email } = req.body;
    const lang = normalizeLang(req.body ? req.body.lang : undefined);
    if (!login || !haslo || !email) return res.json({ sukces: false, wiadomosc: 'Wypełnij pola' });

    try {
        const hash = await bcrypt.hash(haslo, 10);
        const token = crypto.randomBytes(32).toString('hex');
        
        db.run("INSERT INTO uzytkownicy (login, haslo, email, token_weryfikacyjny, czy_potwierdzony) VALUES (?, ?, ?, ?, 0)", 
            [login, hash, email, token], async function(err) {
            if (err) return res.json({ sukces: false, wiadomosc: 'Login/Email zajęty' });

            const link = `${DOMENA}/api/auth/weryfikacja/${token}?lang=${lang}`;
            


// NOWY KOD: Pobieramy temat i treść z szablonu
const template = emailTemplates.rejestracja(link, lang);

const mailOptions = {
    from: `"DOMotywator" <${process.env.MAIL_USER}>`,
    to: email,
    subject: template.subject, // Tytuł z pliku config
    html: template.html        // Treść HTML z pliku config
};

            try {
                // Używamy zmiennej mailOptions, którą zdefiniowaliśmy wyżej
                await transporter.sendMail(mailOptions);
                
                res.json({ sukces: true, wiadomosc: 'Konto założone! Sprawdź maila.' });
            } catch (e) {
                console.error(e);
                res.json({ sukces: true, wiadomosc: 'Konto założone, ale wystąpił błąd wysyłania maila.' });
            }
        });
    } catch (e) { res.json({ sukces: false, wiadomosc: 'Błąd serwera' }); }
});

router.get('/weryfikacja/:token', (req, res) => {
    const lang = normalizeLang(req.query ? req.query.lang : undefined);
    const invalidText = lang === 'en' ? 'Invalid activation link.' : 'Link nieprawidłowy';
    const successTitle = lang === 'en' ? 'Account activated!' : 'Konto aktywowane!';
    const successLink = lang === 'en' ? 'Sign in' : 'Zaloguj się';

    db.get("SELECT id FROM uzytkownicy WHERE token_weryfikacyjny = ?", [req.params.token], (err, user) => {
        if (!user) return res.send(invalidText);
        db.run("UPDATE uzytkownicy SET czy_potwierdzony = 1, token_weryfikacyjny = NULL WHERE id = ?", [user.id], () => {
            res.send(`<h1>${successTitle}</h1><a href='/'>${successLink}</a>`);
        });
    });
});


// --- 1. PROŚBA O RESET (Wysyłka maila) ---
router.post('/zapomnialem-haslo', (req, res) => {
    const { email } = req.body;
    const lang = normalizeLang(req.body ? req.body.lang : undefined);
    
    // Sprawdzamy czy user istnieje
    db.get("SELECT id FROM uzytkownicy WHERE email = ?", [email], (err, user) => {
        if (!user) {
            // Ze względów bezpieczeństwa nie mówimy wprost "nie ma takiego maila", 
            // żeby hackerzy nie skanowali bazy. Mówimy "Jeśli konto istnieje, wysłaliśmy maila".
            return res.json({
                sukces: true,
                messageKey: 'api.auth.reset.request_sent_if_exists',
                wiadomosc: 'Jeśli konto istnieje, wysłaliśmy link resetujący.'
            });
        }

        // Generujemy token i datę ważności (1 godzina = 3600000 ms)
        const token = crypto.randomBytes(32).toString('hex');
        const expires = Date.now() + 3600000;

        // Zapisujemy do bazy
        db.run("UPDATE uzytkownicy SET token_reset = ?, token_reset_expires = ? WHERE id = ?", 
            [token, expires, user.id], 
            async (err) => {
                if (err) {
                    return res.json({
                        sukces: false,
                        messageKey: 'api.common.database_error',
                        wiadomosc: 'Błąd bazy danych'
                    });
                }

                // Generujemy link (frontend obsłuży parametr ?reset=TOKEN)
                const link = `${DOMENA}/reset.html?token=${token}&lang=${lang}`;
                const mailData = resetTemplate.resetHasla(link, lang);

                const mailOptions = {
                    from: `\"DOMotywator\" <${process.env.MAIL_USER}>`,
                    to: email,
                    subject: mailData.subject,
                    html: mailData.html
                };

                try {
                    await transporter.sendMail(mailOptions);
                    res.json({
                        sukces: true,
                        messageKey: 'api.auth.reset.request_sent',
                        wiadomosc: 'Wysłano link resetujący na e-mail.'
                    });
                } catch (e) {
                    console.error(e);
                    res.json({
                        sukces: false,
                        messageKey: 'api.auth.reset.mail_send_error',
                        wiadomosc: 'Błąd wysyłki e-maila.'
                    });
                }
            }
        );
    });
});

// --- 2. ZMIANA HASŁA (Z nowym hasłem) ---
router.post('/zmien-haslo', async (req, res) => {
    const { token, noweHaslo } = req.body;

    // Szukamy usera z tym tokenem, który jest wciąż ważny
    db.get("SELECT id FROM uzytkownicy WHERE token_reset = ? AND token_reset_expires > ?", 
        [token, Date.now()], 
        async (err, user) => {
            if (!user) {
                return res.json({
                    sukces: false,
                    messageKey: 'api.auth.reset.invalid_or_expired_link',
                    wiadomosc: 'Link jest nieprawidłowy lub wygasł.'
                });
            }

            // Hashujemy nowe hasło
            const hash = await bcrypt.hash(noweHaslo, 10);

            // Aktualizujemy hasło i czyścimy token
            db.run("UPDATE uzytkownicy SET haslo = ?, token_reset = NULL, token_reset_expires = NULL WHERE id = ?", 
                [hash, user.id], 
                (err) => {
                    if (err) {
                        return res.json({
                            sukces: false,
                            messageKey: 'api.common.database_error',
                            wiadomosc: 'Błąd bazy danych'
                        });
                    }
                    res.json({
                        sukces: true,
                        messageKey: 'api.auth.reset.password_changed',
                        wiadomosc: 'Hasło zostało zmienione. Zaloguj się.'
                    });
                }
            );
        }
    );
});

// --- 3. ZMIANA HASŁA (ZALOGOWANY UŻYTKOWNIK) ---
router.post('/zmien-haslo-zalogowany', weryfikujToken, async (req, res) => {
    try {
        const authUser = req.user;
        const { obecneHaslo, noweHaslo } = req.body;
        if (!obecneHaslo || !noweHaslo) {
            return res.json({ sukces: false, wiadomosc: 'Uzupełnij wszystkie pola.' });
        }
        if (!authUser) {
            return res.status(401).json({ sukces: false, wiadomosc: 'Brak dostępu.' });
        }
        if (obecneHaslo === noweHaslo) {
            return res.json({ sukces: false, wiadomosc: 'Nowe hasło nie może być takie samo jak obecne.' });
        }

        db.get("SELECT haslo FROM uzytkownicy WHERE id = ?", [authUser.id], async (err, userRow) => {
            if (err) return res.json({ sukces: false, wiadomosc: 'Błąd bazy danych.' });
            if (!userRow) return res.json({ sukces: false, wiadomosc: 'Nie znaleziono użytkownika.' });

            try {
                const ok = await bcrypt.compare(obecneHaslo, userRow.haslo);
                if (!ok) {
                    return res.json({
                        sukces: false,
                        messageKey: 'api.auth.profile.current_password_invalid',
                        wiadomosc: 'Obecne hasło jest nieprawidłowe.'
                    });
                }

                const hash = await bcrypt.hash(noweHaslo, 10);
                db.run("UPDATE uzytkownicy SET haslo = ? WHERE id = ?", [hash, authUser.id], (err) => {
                    if (err) return res.json({ sukces: false, wiadomosc: 'Błąd bazy danych.' });
                    res.json({ sukces: true, wiadomosc: 'Hasło zostało zmienione.' });
                });
            } catch (e) {
                res.json({ sukces: false, wiadomosc: 'Błąd przetwarzania hasła.' });
            }
        });
    } catch (e) {
        return res.json({ sukces: false, wiadomosc: 'Błąd serwera.' });
    }
});

// --- 4. USUWANIE KONTA (ZALOGOWANY UŻYTKOWNIK) ---
router.delete('/usun-konto-zalogowany', weryfikujToken, async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            return res.status(401).json({ sukces: false, wiadomosc: 'Brak dostępu.' });
        }

        const userRow = await dbGet(
            "SELECT id, login, dom_id FROM uzytkownicy WHERE id = ?",
            [authUser.id]
        );

        if (!userRow) {
            return res.json({ sukces: false, wiadomosc: 'Nie znaleziono użytkownika.' });
        }

        const domId = userRow.dom_id;
        if (!domId) {
            await dbRun("DELETE FROM historia WHERE login = ?", [userRow.login]);
            await dbRun("DELETE FROM uzytkownicy WHERE id = ?", [userRow.id]);
            return res.json({
                sukces: true,
                messageKey: 'api.auth.profile.account_deleted',
                wiadomosc: 'Konto zostało usunięte.'
            });
        }

        const domRow = await dbGet("SELECT id, wlasciciel_id FROM domy WHERE id = ?", [domId]);
        if (!domRow) {
            await dbRun("DELETE FROM historia WHERE login = ?", [userRow.login]);
            await dbRun("DELETE FROM uzytkownicy WHERE id = ?", [userRow.id]);
            return res.json({
                sukces: true,
                messageKey: 'api.auth.profile.account_deleted',
                wiadomosc: 'Konto zostało usunięte.'
            });
        }

        if (domRow.wlasciciel_id === userRow.id) {
            await dbRun("DELETE FROM zadania WHERE dom_id = ?", [domId]);
            await dbRun("DELETE FROM historia WHERE dom_id = ?", [domId]);
            await dbRun("UPDATE uzytkownicy SET dom_id = NULL, punkty = 0 WHERE dom_id = ?", [domId]);
            await dbRun("DELETE FROM domy WHERE id = ?", [domId]);
            await dbRun("DELETE FROM uzytkownicy WHERE id = ?", [userRow.id]);
            return res.json({
                sukces: true,
                messageKey: 'api.auth.profile.account_and_house_deleted',
                wiadomosc: 'Konto i dom zostały usunięte.'
            });
        }

        await dbRun("UPDATE domy SET zwyciezca_id = NULL WHERE id = ? AND zwyciezca_id = ?", [domId, userRow.id]);
        await dbRun("DELETE FROM historia WHERE dom_id = ? AND login = ?", [domId, userRow.login]);
        await dbRun("DELETE FROM uzytkownicy WHERE id = ?", [userRow.id]);
        return res.json({
            sukces: true,
            messageKey: 'api.auth.profile.account_deleted',
            wiadomosc: 'Konto zostało usunięte.'
        });
    } catch (e) {
        return res.status(500).json({ sukces: false, wiadomosc: 'Błąd serwera.' });
    }
});

module.exports = router;
