// @ts-check
// public/js/state.js

// --- Konfiguracja globalna ---
window.CONFIG = {
    API_PREFIX: '/api',
    DONATE_PL: 'https://buycoffee.to/szezilla',
    DONATE_EN: 'https://buymeacoffee.com/szezilla',
    // Tutaj w przyszłości mogą trafić inne stałe
};

// --- Stan aplikacji (Zmienne Globalne) ---

// Token JWT (inicjalizacja z LocalStorage)
window.token = localStorage.getItem('token') || null;

// Nazwa aktualnego domu
window.currentHouseName = "Mój Dom";

// Cache zadań dla wyszukiwarki (Live Search)
window.globalTasks = [];

// Sprawdzenie zaproszenia z URL (Kod zaproszenia)
const urlParams = new URLSearchParams(window.location.search);
window.pendingInviteCode = urlParams.get('kod');

console.log("✅ Stan aplikacji zainicjalizowany");
