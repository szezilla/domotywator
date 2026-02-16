// @ts-check
(function initI18n() {
    const SUPPORTED = ['pl', 'en'];
    const FALLBACK = 'pl';
    /** @type {Record<string, any>} */
    const dictionaries = {};
    let currentLang = FALLBACK;
    /** @type {() => void} */
    let resolveReady = () => {};
    const ready = new Promise((resolve) => {
        resolveReady = resolve;
    });

    /**
     * @param {string} lang
     * @returns {Promise<Record<string, any>>}
     */
    async function loadDictionary(lang) {
        if (!SUPPORTED.includes(lang)) return {};
        if (dictionaries[lang]) return dictionaries[lang];
        try {
            const res = await fetch(`/i18n/${lang}.json?t=${Date.now()}`);
            if (!res.ok) return {};
            const data = await res.json();
            dictionaries[lang] = data;
            return data;
        } catch (_) {
            return {};
        }
    }

    /**
     * @param {Record<string, any>} obj
     * @param {string} key
     * @returns {string | null}
     */
    function resolveKey(obj, key) {
        const value = key.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : null), obj);
        return typeof value === 'string' ? value : null;
    }

    /**
     * @param {string} key
     * @param {Record<string, string | number>} [params]
     * @returns {string}
     */
    function t(key, params) {
        const fromCurrent = resolveKey(dictionaries[currentLang] || {}, key);
        const fromFallback = resolveKey(dictionaries[FALLBACK] || {}, key);
        let text = fromCurrent || fromFallback || key;

        if (params) {
            for (const [paramKey, paramValue] of Object.entries(params)) {
                text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
            }
        }
        return text;
    }

    /**
     * @param {ParentNode} [root]
     */
    function applyTranslations(root = document) {
        root.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (!key) return;
            el.textContent = t(key);
        });

        root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (!key || !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
            el.placeholder = t(key);
        });

        root.querySelectorAll('[data-i18n-title]').forEach((el) => {
            const key = el.getAttribute('data-i18n-title');
            if (!key) return;
            el.setAttribute('title', t(key));
        });

        root.querySelectorAll('[data-lang]').forEach((el) => {
            const lang = el.getAttribute('data-lang');
            if (!(el instanceof HTMLButtonElement) || !lang) return;
            el.classList.toggle('active', lang === currentLang);
        });
    }

    /**
     * @param {string} lang
     */
    async function setLanguage(lang) {
        const normalized = SUPPORTED.includes(lang) ? lang : FALLBACK;
        await loadDictionary(FALLBACK);
        await loadDictionary(normalized);
        currentLang = normalized;
        localStorage.setItem('lang', currentLang);
        document.documentElement.lang = currentLang;
        applyTranslations(document);
    }

    function getLanguage() {
        return currentLang;
    }

    async function setup() {
        const saved = localStorage.getItem('lang') || '';
        const browserLang = (navigator.language || '').slice(0, 2).toLowerCase();
        const initial = SUPPORTED.includes(saved) ? saved : (SUPPORTED.includes(browserLang) ? browserLang : FALLBACK);
        await setLanguage(initial);

        document.addEventListener('click', async (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const button = target.closest('[data-lang]');
            if (!(button instanceof HTMLButtonElement)) return;
            const lang = button.getAttribute('data-lang');
            if (!lang) return;
            await setLanguage(lang);
        });

        resolveReady();
    }

    window.i18n = {
        t,
        setLanguage,
        getLanguage,
        applyTranslations,
        ready
    };

    document.addEventListener('DOMContentLoaded', () => {
        setup();
    });
})();
