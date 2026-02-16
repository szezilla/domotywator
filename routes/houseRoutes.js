// routes/houseRoutes.js
// @ts-check
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const weryfikujToken = require('../middleware/auth');

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

router.post('/', weryfikujToken, (req, res) => {
    const user = getUser(req, res);
    if (!user) return;
    const { nazwa } = req.body;
    if (user.dom_id) {
        return res.json({
            sukces: false,
            messageKey: 'api.house.already_has_house',
            wiadomosc: 'Masz już dom!'
        });
    }
    const kod = Math.floor(100000 + Math.random() * 900000).toString();
    db.run("INSERT INTO domy (nazwa, kod_dolaczenia, wlasciciel_id) VALUES (?, ?, ?)", [nazwa, kod, user.id], function(err) {
        if(err) return res.json({sukces:false});
        const id = this.lastID;
        db.run("UPDATE uzytkownicy SET dom_id = ? WHERE id = ?", [id, user.id], () => {
            res.json({ sukces: true, dom_id: id, kod: kod, nazwa: nazwa, is_owner: true });
        });
    });
});

// routes/houseRoutes.js

// ZASTĄP ISTNIEJĄCY ENDPOINT TYM KODEM:
router.get('/moj-dom', weryfikujToken, (req, res) => {
    const user = getUser(req, res);
    if (!user) return;
    // 1. Najpierw sprawdzamy w tabeli uzytkownicy, gdzie user faktycznie mieszka
    // (Ignorujemy dom_id z tokena JWT, bo może być nieaktualny)
    db.get("SELECT dom_id FROM uzytkownicy WHERE id = ?", [user.id], (err, userRow) => {
        
        // Jeśli nie ma usera lub nie ma dom_id -> zwracamy null
        if (!userRow || !userRow.dom_id) {
            return res.json({ sukces: true, dom: null });
        }

        const realDomId = userRow.dom_id;

        // 2. Skoro wiemy, że ma dom, pobieramy szczegóły tego domu
        db.get(
            "SELECT d.*, u.login as zwyciezca_login FROM domy d LEFT JOIN uzytkownicy u ON d.zwyciezca_id = u.id WHERE d.id = ?",
            [realDomId],
            (err, houseRow) => {
            if (!houseRow) {
                // Sytuacja rzadka: User ma dom_id, ale dom nie istnieje (np. błąd spójności)
                // Naprawiamy to automatycznie
                db.run("UPDATE uzytkownicy SET dom_id = NULL WHERE id = ?", [user.id]);
                return res.json({ sukces: true, dom: null });
            }

            // 3. Zwracamy dane domu
            res.json({ 
                sukces: true, 
                dom: houseRow, 
                is_owner: houseRow.wlasciciel_id === user.id 
            });
        });
    });
});


router.post('/dolacz', weryfikujToken, (req, res) => {
    const user = getUser(req, res);
    if (!user) return;
    db.get("SELECT id FROM domy WHERE kod_dolaczenia = ?", [req.body.kod], (err, row) => {
        if (!row) {
            return res.json({
                sukces: false,
                messageKey: 'api.house.invalid_join_code',
                wiadomosc: 'Błędny kod'
            });
        }
        db.run("UPDATE uzytkownicy SET dom_id = ?, punkty = 0 WHERE id = ?", [row.id, user.id], () => res.json({ sukces: true }));
    });
});

router.get('/zaproszenie/:kod', (req, res) => {
    db.get("SELECT d.nazwa, u.login as wlasciciel FROM domy d JOIN uzytkownicy u ON d.wlasciciel_id = u.id WHERE d.kod_dolaczenia = ?", [req.params.kod], (err, row) => {
        res.json({ sukces: !!row, ...row });
    });
});

router.delete('/', weryfikujToken, (req, res) => {
    const user = getUser(req, res);
    if (!user) return;
    if (!user.dom_id) return res.json({ sukces: false, wiadomosc: 'Nie masz domu' });

    db.get("SELECT wlasciciel_id FROM domy WHERE id = ?", [user.dom_id], (err, row) => {
        if (!row || row.wlasciciel_id !== user.id) return res.json({ sukces: false, wiadomosc: 'Tylko właściciel może usunąć dom' });

        db.serialize(() => {
            // 1. Usuń zadania
            db.run("DELETE FROM zadania WHERE dom_id = ?", [user.dom_id]);
            // 2. Usuń historię (opcjonalnie)
            db.run("DELETE FROM historia WHERE dom_id = ?", [user.dom_id]);
            // 3. Wyrzuć domowników
            db.run("UPDATE uzytkownicy SET dom_id = NULL, punkty = 0 WHERE dom_id = ?", [user.dom_id]);
            // 4. Usuń dom
            db.run("DELETE FROM domy WHERE id = ?", [user.dom_id], (err) => {
                res.json({ sukces: true, wiadomosc: 'Dom został trwale usunięty.' });
            });
        });
    });
});

router.post('/opusc', weryfikujToken, (req, res) => {
    const user = getUser(req, res);
    if (!user) return;
    db.run("UPDATE uzytkownicy SET dom_id = NULL, punkty = 0 WHERE id = ?", [user.id], () => res.json({ sukces: true }));
});

// --- ZARZĄDZANIE DOMOWNIKAMI ---

// 1. Pobierz listę domowników (tylko ID i Login)
router.get('/domownicy', weryfikujToken, (req, res) => {
    const user = getUser(req, res);
    if (!user) return;
    // Sprawdzamy czy user ma dom
    if (!user.dom_id) return res.json({ sukces: false, wiadomosc: 'Brak domu' });

    // Sprawdzamy czy jest właścicielem
    db.get("SELECT wlasciciel_id FROM domy WHERE id = ?", [user.dom_id], (err, house) => {
        if (!house || house.wlasciciel_id !== user.id) {
            return res.json({ sukces: false, wiadomosc: 'Brak uprawnień' });
        }

        // Pobieramy listę (nie zwracamy haseł ani emaili)
        db.all("SELECT id, login FROM uzytkownicy WHERE dom_id = ?", [user.dom_id], (err, rows) => {
            res.json({ sukces: true, domownicy: rows });
        });
    });
});

// 2. Wyrzuć domownika
router.delete('/domownicy/:id', weryfikujToken, (req, res) => {
    const user = getUser(req, res);
    if (!user) return;
    const targetId = req.params.id;

    // Zabezpieczenie przed usunięciem samego siebie
    if (parseInt(targetId) === user.id) {
        return res.json({ sukces: false, wiadomosc: 'Nie możesz wyrzucić samego siebie.' });
    }

    db.get("SELECT wlasciciel_id FROM domy WHERE id = ?", [user.dom_id], (err, house) => {
        if (!house || house.wlasciciel_id !== user.id) {
            return res.json({ sukces: false, wiadomosc: 'Brak uprawnień' });
        }

        // Usuwamy delikwenta (dom_id = NULL, punkty = 0)
        db.run(
            "UPDATE uzytkownicy SET dom_id = NULL, punkty = 0 WHERE id = ? AND dom_id = ?",
            [targetId, user.dom_id],
            function(err) {
                if (err) return res.json({ sukces: false, wiadomosc: 'Błąd bazy' });
                res.json({ sukces: true, wiadomosc: 'Domownik usunięty' });
            }
        );
    });
});



// NOWE: Ustawianie Celu (Tylko właściciel)
router.post('/ustaw-cel', weryfikujToken, (req, res) => {
    const user = getUser(req, res);
    if (!user) return;
    const { cel } = req.body;
    // Walidacja (musi być liczba >= 0)
    const nowyCel = parseInt(cel);
    if (isNaN(nowyCel) || nowyCel < 0) return res.json({ sukces: false, wiadomosc: 'Nieprawidłowa wartość' });

    db.get("SELECT wlasciciel_id FROM domy WHERE id = ?", [user.dom_id], (err, row) => {
        if (!row || row.wlasciciel_id !== user.id) {
            return res.json({ sukces: false, wiadomosc: 'Brak uprawnień' });
        }

        db.run("UPDATE domy SET cel_punktow = ? WHERE id = ?", [nowyCel, user.dom_id], (err) => {
            if (err) return res.json({ sukces: false, wiadomosc: 'Błąd bazy' });
            res.json({ sukces: true, cel: nowyCel });
        });
    });
});

// NOWE: Reset Gry (Ustawia cel + zeruje punkty wszystkim)
router.post('/reset-gry', weryfikujToken, (req, res) => {
    const user = getUser(req, res);
    if (!user) return;
    const { cel } = req.body; // Można od razu ustawić nowy cel przy resecie
    
    db.get("SELECT wlasciciel_id FROM domy WHERE id = ?", [user.dom_id], (err, row) => {
        if (!row || row.wlasciciel_id !== user.id) {
            return res.json({ sukces: false, wiadomosc: 'Brak uprawnień' });
        }

        db.serialize(() => {
            // 1. Aktualizuj cel (jeśli podano, w przeciwnym razie zostaje stary) i wyczyść zwycięzcę
            if (cel !== undefined) {
                db.run("UPDATE domy SET cel_punktow = ?, zwyciezca_id = NULL WHERE id = ?", [cel, user.dom_id]);
            } else {
                db.run("UPDATE domy SET zwyciezca_id = NULL WHERE id = ?", [user.dom_id]);
            }

            // 2. Wyzeruj punkty użytkowników
            db.run("UPDATE uzytkownicy SET punkty = 0 WHERE dom_id = ?", [user.dom_id]);

            // 3. Wyczyść historię (opcjonalne, ale zalecane przy "nowej grze")
            db.run("DELETE FROM historia WHERE dom_id = ?", [user.dom_id]);

            res.json({ sukces: true, wiadomosc: 'Rozpoczęto nową grę!' });
        });
    });
});




module.exports = router;
