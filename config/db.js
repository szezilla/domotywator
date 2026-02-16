// config/db.js
// @ts-check
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.NODE_ENV === 'test' 
    ? ':memory:' // Baza w pamięci RAM (najszybsza, czyści się po testach)
    : './baza.sqlite';
    
const db = new sqlite3.Database('./baza.sqlite', (err) => {
    if (err) console.error('Błąd bazy:', err.message);
    else console.log('✅ Połączono z bazą SQLite.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS domy (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nazwa TEXT,
        kod_dolaczenia TEXT UNIQUE,
        wlasciciel_id INTEGER,
        cel_punktow INTEGER DEFAULT 0,
        zwyciezca_id INTEGER
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS uzytkownicy (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        login TEXT UNIQUE,
        haslo TEXT,
        email TEXT UNIQUE,
        punkty INTEGER DEFAULT 0,
        czy_potwierdzony INTEGER DEFAULT 0,
        token_weryfikacyjny TEXT,
        dom_id INTEGER REFERENCES domy(id)
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS zadania (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nazwa TEXT,
        punkty INTEGER,
        dom_id INTEGER REFERENCES domy(id)
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS historia (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT,
        login TEXT,
        zadanie TEXT,
        punkty INTEGER,
        dom_id INTEGER REFERENCES domy(id)
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_dom_id ON zadania(dom_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_user_dom ON uzytkownicy(dom_id)`);
    db.run("ALTER TABLE uzytkownicy ADD COLUMN token_reset TEXT", (err) => {}); 
    db.run("ALTER TABLE uzytkownicy ADD COLUMN token_reset_expires INTEGER", (err)=> {});
    db.run("ALTER TABLE domy ADD COLUMN cel_punktow INTEGER DEFAULT 0", (err) => {});
    db.run("ALTER TABLE domy ADD COLUMN zwyciezca_id INTEGER", (err) => {});
});

module.exports = db;
