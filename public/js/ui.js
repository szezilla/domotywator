// @ts-check
// public/js/ui.js

// --- Konfiguracja Tytułów Ekranów ---
/** @type {Record<string, string | ((houseName: string) => string)>} */
const SCREEN_TITLES = {
    'main-screen': (houseName) => `🏡 ${houseName}`,
    'settings-house-screen': () => (window.i18n ? window.i18n.t('settings_house.screen_title') : "⚙️ Ustawienia Domu"),
    'house-invites-screen': () => (window.i18n ? window.i18n.t('house_invites.screen_title') : "✉️ Zaproszenia"),
    'goal-screen': () => (window.i18n ? window.i18n.t('goal_screen.screen_title') : "🎯 Cel Gry"),
    'house-settings-screen': () => (window.i18n ? window.i18n.t('house_settings.screen_title') : "⚙️ Ustawienia"),
    'profile-screen': () => (window.i18n ? window.i18n.t('profile.screen_title') : "👤 Profil"),
    'profile-change-password-screen': () => (window.i18n ? window.i18n.t('profile.change_password_title') : "🔑 Zmiana hasła"),
    'profile-delete-account-screen': () => (window.i18n ? window.i18n.t('profile.delete_account_title') : "🗑️ Usuwanie konta"),
    'manage-members-screen': () => (window.i18n ? window.i18n.t('manage_members.screen_title') : "👥 Domownicy"),
    'task-menu-screen': () => (window.i18n ? window.i18n.t('task_menu.screen_title') : "📝 Zarządzanie"),
    'task-add-screen': () => (window.i18n ? window.i18n.t('task_add.screen_title') : "➕ Nowe Zadanie"),
    'task-list-screen': () => (window.i18n ? window.i18n.t('task_list.screen_title') : "📋 Lista Zadań"),
    'task-edit-screen': () => (window.i18n ? window.i18n.t('task_edit.screen_title') : "✏️ Edycja"),
    'history-screen': () => (window.i18n ? window.i18n.t('history.screen_title') : "📜 Historia"),
    'about-screen': () => (window.i18n ? window.i18n.t('about.screen_title') : "ℹ️ O aplikacji"),
    'auth-screen': "DOMotywator", // Domyślny dla auth
    'no-house-screen': "DOMotywator",
    'invite-screen': "Zaproszenie",
    'forgot-password-screen': "Reset Hasła",
    'reset-password-screen': "Nowe Hasło"
};

const ALL_SCREENS = [
    'auth-screen', 'no-house-screen', 'main-screen', 'settings-house-screen',
    'house-invites-screen', 'goal-screen', 'house-settings-screen',
    'profile-screen', 'profile-change-password-screen', 'profile-delete-account-screen',
    'task-menu-screen', 'task-add-screen', 'task-list-screen',
    'task-edit-screen', 'history-screen', 'about-screen', 'manage-members-screen',
    'invite-screen', 'forgot-password-screen', 'reset-password-screen'
];

// --- Funkcje UI ---

window.hideAll = function() {
    ALL_SCREENS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    
    // Ukryj menu dropdown przy zmianie ekranu
    const menu = document.getElementById('menu-dropdown');
    if (menu) menu.classList.add('hidden');
}

/**
 * @param {string} screenId
 */
window.openScreen = function(screenId) {
    window.hideAll();
    updateHeader(screenId);
    const el = document.getElementById(screenId);
    if (el) el.classList.remove('hidden');
    if (screenId === 'house-settings-screen') {
        const msg = document.getElementById('house-settings-message');
        if (msg) {
            msg.textContent = '';
            msg.classList.add('hidden');
        }
    }
}

window.toggleMenu = function() {
    const menu = document.getElementById('menu-dropdown');
    if (menu) menu.classList.toggle('hidden');
}

window.openCoffeeLink = async function() {
    const lang = window.i18n ? window.i18n.getLanguage() : 'pl';
    const url = lang === 'en' ? window.CONFIG.DONATE_EN : window.CONFIG.DONATE_PL;
    if (!url) {
        await window.showModal({
            title: window.i18n ? window.i18n.t('about.coffee_unavailable_title') : 'Info',
            body: window.i18n ? window.i18n.t('about.coffee_unavailable_body') : 'Link do wsparcia nie jest jeszcze skonfigurowany.',
            okText: window.i18n ? window.i18n.t('common.ok') : 'OK'
        });
        return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
}

document.addEventListener('click', (e) => {
    const menu = document.getElementById('menu-dropdown');
    const btn = document.querySelector('.hamburger-btn');
    if (!menu || !btn) return;
    if (menu.classList.contains('hidden')) return;
    const target = /** @type {Node} */ (e.target);
    if (!menu.contains(target) && !btn.contains(target)) {
        menu.classList.add('hidden');
    }
});

window.zapomnialemHasla = function() {
    window.openScreen('forgot-password-screen');
};

/**
 * @param {string} screenId
 */
function updateHeader(screenId) {
    const header = document.getElementById('app-header');
    const title = document.getElementById('header-title');
    if (!header || !title) return;

    // Lista ekranów, które NIE mają nagłówka
    const screensWithoutHeader = ['auth-screen', 'no-house-screen', 'invite-screen', 'forgot-password-screen', 'reset-password-screen'];

    if (screensWithoutHeader.includes(screenId)) {
        header.classList.add('hidden');
    } else {
        header.classList.remove('hidden');
        
        // Pobieramy tytuł z konfiguracji
        let text = SCREEN_TITLES[screenId] || "DOMotywator";
        
        // Jeśli to funkcja (dla nazwy domu), wywołujemy ją
        if (typeof text === 'function') {
            // currentHouseName musi być dostępne globalnie (zdefiniowane w script.js)
            text = text(window.currentHouseName || "Mój Dom");
        }
        
        title.textContent = text;
    }
}

// Pomocnicze funkcje UI dla Auth (przełączanie formularzy)
window.pokazRejestracje = function() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const title = document.querySelector('#auth-screen h1');
    if (loginForm) loginForm.classList.add('hidden');
    if (registerForm) registerForm.classList.remove('hidden');
    if (title) {
        title.setAttribute('data-i18n', 'auth.register_screen_title');
        title.textContent = window.i18n ? window.i18n.t('auth.register_screen_title') : "Rejestracja";
    }
}

window.pokazLogowanie = function() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const title = document.querySelector('#auth-screen h1');
    if (registerForm) registerForm.classList.add('hidden');
    if (loginForm) loginForm.classList.remove('hidden');
    if (title) {
        title.removeAttribute('data-i18n');
        title.textContent = "🔐 DOMotywator";
    }
}
