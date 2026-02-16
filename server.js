// @ts-check
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
// Jeśli nie podano domeny w .env, próbujemy zgadnąć localhost
const DOMENA = process.env.DOMENA || `http://localhost:${PORT}`;

// ================= MIDDLEWARE =================
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Serwuje pliki z folderu public

// ================= ROUTING (MODUŁY) =================



app.use('/api/auth', require('./routes/authRoutes')); // Logowanie będzie pod /api/auth/login
app.use('/api/domy', require('./routes/houseRoutes'));
app.use('/api', require('./routes/taskRoutes')); // Zadania zostawmy pod /api, żeby nie psuć wszystkiego naraz
app.get('/api/meta', (_req, res) => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    res.json({ version: pkg.version || '0.0.0' });
});


// ================= FRONTEND FALLBACK =================
// Każde inne zapytanie (które nie jest API) zwraca index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ================= START SERWERA =================
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Serwer działa na porcie ${PORT}`);
        console.log(`🌐 Domena: ${DOMENA}`);
    });
}

module.exports = app;
