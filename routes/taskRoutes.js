// @ts-check
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const weryfikujToken = require('../middleware/auth');

// === POMOCNICZE FUNKCJE ===
/**
 * @param {number} userId
 * @param {(domId: number | null) => void} callback
 */
function pobierzDomWlasciciela(userId, callback) {
    db.get("SELECT id FROM domy WHERE wlasciciel_id = ?", [userId], (err, row) => {
        if (err || !row) return callback(null);
        callback(row.id);
    });
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
function getUser(req, res) {
    if (!req.user) {
        res.status(401).json({ sukces: false, wiadomosc: 'Brak dostępu' });
        return null;
    }
    return req.user;
}

// === ENDPOINTY (Wszystkie chronione tokenem) ===

// 1. POBIERANIE LISTY ZADAŃ (GET /zadania)
router.get('/zadania', weryfikujToken, (req, res) => {
    const user = getUser(req, res);
    if (!user) return;
    let domId = user.dom_id;

    const returnTasks = (/** @type {number} */ targetDomId) => {
        db.all("SELECT id, nazwa as zadanie, punkty FROM zadania WHERE dom_id = ?", [targetDomId], (err, rows) => {
            res.json({ sukces: true, zadania: rows || [] });
        });
    };

    if (domId) {
        returnTasks(domId);
    } else {
        // Fallback: może user jest właścicielem, ale jeszcze nie ma dom_id w tokenie
        pobierzDomWlasciciela(user.id, (foundId) => {
            if (foundId) returnTasks(foundId);
            else res.json({ sukces: true, zadania: [] });
        });
    }
});

// 2. DODAWANIE ZADANIA (POST /dodaj-zadanie)
router.post('/dodaj-zadanie', weryfikujToken, (req, res) => {
    const user = getUser(req, res);
    if (!user) return;
    const { nazwa, punkty } = req.body;
    if (!nazwa || !punkty) return res.json({ sukces: false, wiadomosc: 'Uzupełnij dane' });

    pobierzDomWlasciciela(user.id, (domId) => {
        if (!domId) return res.json({ sukces: false, wiadomosc: 'Nie jesteś właścicielem domu' });

        db.run("INSERT INTO zadania (nazwa, punkty, dom_id) VALUES (?, ?, ?)", [nazwa, punkty, domId], function(err) {
            if (err) return res.json({ sukces: false, wiadomosc: 'Błąd bazy' });
            
            db.all("SELECT id, nazwa as zadanie, punkty FROM zadania WHERE dom_id = ?", [domId], (err, rows) => {
                res.json({ sukces: true, wiadomosc: 'Zadanie dodane', zadania: rows });
            });
        });
    });
});

// 3. EDYCJA ZADANIA (PUT /zadania/:id)
router.put('/zadania/:id', weryfikujToken, (req, res) => {
    const user = getUser(req, res);
    if (!user) return;
    const { nazwa, punkty } = req.body;
    const zadanieId = req.params.id;

    pobierzDomWlasciciela(user.id, (domId) => {
        if (!domId) return res.json({ sukces: false, wiadomosc: 'Brak uprawnień' });

        db.run("UPDATE zadania SET nazwa = ?, punkty = ? WHERE id = ? AND dom_id = ?", 
            [nazwa, punkty, zadanieId, domId], 
            function(err) {
                if (err) return res.json({ sukces: false, wiadomosc: 'Błąd bazy' });
                if (this.changes === 0) return res.json({ sukces: false, wiadomosc: 'Nie znaleziono zadania' });

                db.all("SELECT id, nazwa as zadanie, punkty FROM zadania WHERE dom_id = ?", [domId], (err, rows) => {
                    res.json({ sukces: true, wiadomosc: 'Zaktualizowano', zadania: rows });
                });
            }
        );
    });
});

// 4. USUWANIE ZADANIA (DELETE /zadania/:id)
router.delete('/zadania/:id', weryfikujToken, (req, res) => {
    const user = getUser(req, res);
    if (!user) return;
    const zadanieId = req.params.id;

    pobierzDomWlasciciela(user.id, (domId) => {
        if (!domId) return res.json({ sukces: false, wiadomosc: 'Brak uprawnień' });

        db.run("DELETE FROM zadania WHERE id = ? AND dom_id = ?", [zadanieId, domId], function(err) {
            if (this.changes === 0) return res.json({ sukces: false, wiadomosc: 'Nie można usunąć' });

            db.all("SELECT id, nazwa as zadanie, punkty FROM zadania WHERE dom_id = ?", [domId], (err, rows) => {
                res.json({ sukces: true, wiadomosc: 'Usunięto', zadania: rows });
            });
        });
    });
});

// 5. DODAWANIE PUNKTÓW (POST /punkty)
router.post('/punkty', weryfikujToken, (req, res) => {
    const user = getUser(req, res);
    if (!user) return;
    const { zadanie } = req.body;
    if (!user.dom_id) return res.json({ sukces: false, wiadomosc: 'Brak domu' });

    db.get("SELECT punkty FROM zadania WHERE nazwa = ? AND dom_id = ?", [zadanie, user.dom_id], (err, taskRow) => {
        if (!taskRow) return res.json({ sukces: false, wiadomosc: 'Zadanie nie istnieje' });

        const punkty = taskRow.punkty;
        
        // Formatowanie daty (Wersja Poprawiona)
        const now = new Date();
        const plDate = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Warsaw"}));
        const pad = (/** @type {number} */ n) => n.toString().padStart(2, '0');
        const teraz = `${pad(plDate.getDate())}/${pad(plDate.getMonth()+1)}/${plDate.getFullYear()}, ${pad(plDate.getHours())}:${pad(plDate.getMinutes())}:${pad(plDate.getSeconds())}`;

        db.serialize(() => {
            // Dodaj punkty userowi
            db.run("UPDATE uzytkownicy SET punkty = punkty + ? WHERE id = ?", [punkty, user.id]);
            
            // Dodaj do historii
            db.run("INSERT INTO historia (data, login, zadanie, punkty, dom_id) VALUES (?, ?, ?, ?, ?)", 
                [teraz, user.login, zadanie, punkty, user.dom_id]);

            // Sprawdź zwycięzcę i zwróć ranking
            db.get("SELECT punkty FROM uzytkownicy WHERE id = ?", [user.id], (err, userRow) => {
                db.get("SELECT cel_punktow, zwyciezca_id FROM domy WHERE id = ?", [user.dom_id], (err, domRow) => {
                    const goal = domRow?.cel_punktow || 0;
                    const winnerId = domRow?.zwyciezca_id || null;
                    const userPoints = userRow?.punkty || 0;

                    /** @param {{ id: number, login: string } | null} winner */
                    const sendResponse = (winner) => {
                        db.all("SELECT login, punkty FROM uzytkownicy WHERE dom_id = ? ORDER BY punkty DESC", [user.dom_id], (err, ranking) => {
                            res.json({ sukces: true, wiadomosc: `Dodano ${punkty} pkt`, ranking: ranking, zwyciezca: winner });
                        });
                    };

                    if (goal > 0 && !winnerId && userPoints >= goal) {
                        db.run("UPDATE domy SET zwyciezca_id = ? WHERE id = ?", [user.id, user.dom_id], (err) => {
                            sendResponse({ id: user.id, login: user.login });
                        });
                    } else if (winnerId) {
                        db.get("SELECT login FROM uzytkownicy WHERE id = ?", [winnerId], (err, winnerRow) => {
                            if (winnerRow) return sendResponse({ id: winnerId, login: winnerRow.login });
                            return sendResponse(null);
                        });
                    } else {
                        sendResponse(null);
                    }
                });
            });
        });
    });
});

// 6. RANKING (GET /ranking)
router.get('/ranking', weryfikujToken, (req, res) => {
    const user = getUser(req, res);
    if (!user) return;
    if (!user.dom_id) return res.json({ sukces: true, ranking: [] });
    db.all("SELECT login, punkty FROM uzytkownicy WHERE dom_id = ? ORDER BY punkty DESC", [user.dom_id], (err, rows) => {
        res.json({ sukces: true, ranking: rows });
    });
});

// 7. HISTORIA (GET /historia)
router.get('/historia', weryfikujToken, (req, res) => {
    const user = getUser(req, res);
    if (!user) return;
    if (!user.dom_id) return res.json({ sukces: true, historia: [] });
    const limit = req.query.limit || 50;
    db.all("SELECT id, data, login, zadanie, punkty FROM historia WHERE dom_id = ? ORDER BY id DESC LIMIT ?", [user.dom_id, limit], (err, rows) => {
        res.json({ sukces: true, historia: rows });
    });
});

module.exports = router;
