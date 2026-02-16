// @ts-check
// public/js/auth.js

/**
 * @typedef {Object} ApiResult
 * @property {boolean} sukces
 * @property {string=} wiadomosc
 */

/**
 * @typedef {Object} ApiAuthResult
 * @property {boolean} sukces
 * @property {string=} wiadomosc
 * @property {string=} token
 */

// ==========================================
// API I AUTORYZACJA
// ==========================================

// public/js/auth.js

/**
 * @param {string} endpoint
 * @param {'GET'|'POST'|'PUT'|'DELETE'} [method='GET']
 * @param {Object|null} [body=null]
 * @returns {Promise<ApiResult|ApiAuthResult|any>}
 */
window.apiCall = async function(endpoint, method = 'GET', body = null) {
    /** @type {Record<string, string>} */
    const headers = { 'Content-Type': 'application/json' };
    if (window.token) headers['Authorization'] = `Bearer ${window.token}`;

    /** @type {{ method: 'GET'|'POST'|'PUT'|'DELETE', headers: Record<string,string>, body?: string }} */
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    // --- POPRAWKA ANTY-CACHE ---
    // Dodajemy losowy parametr 't' z aktualnym czasem do każdego zapytania GET
    // Dzięki temu przeglądarka nigdy nie użyje starej wersji z pamięci podręcznej
    let url = `/api${endpoint}`;
    if (method === 'GET') {
        const separator = url.includes('?') ? '&' : '?';
        url += `${separator}t=${Date.now()}`;
    }
    // ---------------------------

    try {
        const res = await fetch(url, opts);

        if (res.status === 401) {
            window.wyloguj();
            return { sukces: false, wiadomosc: "Sesja wygasła" };
        }

        return await res.json();
    } catch (e) {
        console.error("API Error:", e);
        return { sukces: false, wiadomosc: "Błąd połączenia z serwerem" };
    }
};


window.parseJwt = function(token) {
    try { return JSON.parse(atob(token.split('.')[1])); } catch (e) { return {}; }
}

window.wyloguj = function() {
    localStorage.removeItem('token');
    window.token = null;
    window.openScreen('auth-screen');
}

console.log("✅ Moduł autoryzacji załadowany");
