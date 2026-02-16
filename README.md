# DOMotywator - Dokumentacja Techniczna

**Wersja:** `1.0.0`  
**Data aktualizacji:** 13.02.2026

## 1. Opis projektu
DOMotywator to aplikacja webowa (SPA) do grywalizacji obowiązków domowych.  
Użytkownicy tworzą domy, dodają zadania punktowane, zdobywają punkty i rywalizują w rankingu.

## 2. Stos technologiczny
**Backend**
- Node.js
- Express.js
- SQLite3 (`baza.sqlite`)
- JWT (autoryzacja)
- bcryptjs (hashowanie haseł)
- Nodemailer (SMTP)

**Frontend**
- Vanilla JavaScript (moduły pod `window`)
- Fetch API
- CSS3 (custom UI)
- i18n (PL/EN, słowniki JSON)

## 3. Struktura projektu
```text
.
├── .env
├── README.md
├── baza.sqlite
├── package.json
├── server.js
├── config
│   ├── db.js
│   ├── emailTemplates.js
│   └── resetEmailTemplate.js
├── middleware
│   └── auth.js
├── routes
│   ├── authRoutes.js
│   ├── houseRoutes.js
│   └── taskRoutes.js
├── types
│   ├── express.d.ts
│   └── global.d.ts
└── public
    ├── index.html
    ├── reset.html
    ├── privacy.html
    ├── terms.html
    ├── license.html
    ├── style.css
    ├── script.js
    ├── i18n
    │   ├── pl.json
    │   └── en.json
    └── js
        ├── state.js
        ├── auth.js
        ├── i18n.js
        ├── modal.js
        ├── ui.js
        ├── tasks.js
        ├── house.js
        └── invites.js
```

## 4. Baza danych (SQLite)
Główne tabele:
- `domy`: nazwa domu, kod dołączenia, właściciel, cel punktowy, zapisany zwycięzca (`zwyciezca_id`)
- `uzytkownicy`: login, email, hash hasła, punkty, `dom_id`, tokeny resetu/weryfikacji
- `zadania`: zadania per dom (`nazwa`, `punkty`, `dom_id`)
- `historia`: log aktywności (kto, co, kiedy, ile punktów)

## 5. Najważniejsze funkcjonalności
- Rejestracja, logowanie, aktywacja konta e-mailem
- Reset hasła (token jednorazowy)
- Tworzenie domu / dołączanie po kodzie i linku zaproszenia
- Role właściciela i domownika
- Zarządzanie domownikami (owner)
- Zarządzanie zadaniami (CRUD, owner)
- Dodawanie punktów z wyszukiwarką zadań
- Ranking + historia aktywności
- Cel gry i zapis zwycięzcy w bazie (nie nadpisuje się przez kolejnych graczy)
- Reset gry (punkty + historia + reset zwycięzcy)
- Profil: zmiana hasła i usuwanie konta (natychmiastowe)
- UI: modale, komunikaty alert, hamburger menu, ekran „O aplikacji”
- Strony prawne: polityka prywatności, regulamin, licencja
- i18n PL/EN w głównych ekranach i komunikatach

## 6. API (skrót)
### Auth (`/api/auth`)
- `POST /login`
- `POST /rejestracja`
- `GET /weryfikacja/:token`
- `POST /zapomnialem-haslo`
- `POST /zmien-haslo`
- `POST /zmien-haslo-zalogowany`
- `DELETE /usun-konto-zalogowany`

### Domy (`/api/domy`)
- `GET /moj-dom`
- `POST /`
- `POST /dolacz`
- `GET /zaproszenie/:kod`
- `DELETE /`
- `POST /opusc`
- `GET /domownicy`
- `DELETE /domownicy/:id`
- `POST /ustaw-cel`
- `POST /reset-gry`

### Zadania i punkty (`/api`)
- `GET /zadania`
- `POST /dodaj-zadanie`
- `PUT /zadania/:id`
- `DELETE /zadania/:id`
- `POST /punkty`
- `GET /ranking`
- `GET /historia`

### Meta
- `GET /api/meta` - wersja aplikacji (używana na ekranie „O aplikacji”)

## 7. i18n
- Słowniki: `public/i18n/pl.json`, `public/i18n/en.json`
- Mechanizm: `public/js/i18n.js`
- Przełączanie tekstów przez `data-i18n` i `data-i18n-placeholder`
- Część widoków statycznych (`privacy.html`, `terms.html`, `license.html`) przełącza język na podstawie `?lang` i `localStorage`

## 8. Instalacja i uruchomienie
### Wymagania
- Node.js 18+

### Instalacja
```bash
npm install
```

### Konfiguracja `.env`
```env
PORT=3000
DOMENA=http://localhost:3000
SECRET_KEY=twoj_bardzo_dlugi_sekretny_klucz
MAIL_HOST=smtp.twoja-poczta.pl
MAIL_PORT=465
MAIL_USER=twoj@email.pl
MAIL_PASS=twoje_haslo
MAIL_SECURE=true
```

### Start
```bash
npm start
```

App: `http://localhost:3000`

## 9. TypeScript check (lekki tryb)
Projekt pozostaje w JS, ale używa statycznej kontroli typów:
- `@ts-check` w kluczowych plikach
- deklaracje typów w `types/`
- komenda:

```bash
npm run typecheck
```

## 10. Uwagi prawne
- Aplikacja przetwarza dane osobowe (m.in. e-mail), dlatego utrzymywane są:
  - `privacy.html`
  - `terms.html`
  - `license.html`

