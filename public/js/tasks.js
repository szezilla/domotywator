// @ts-check
// public/js/tasks.js


// ==========================================
// RENDEROWANIE RANKINGU
// ==========================================
// public/js/tasks.js

// ==========================================
// RENDEROWANIE RANKINGU (Z OBSŁUGĄ CELU)
// ==========================================
/**
 * @param {RankingEntry[]} list
 * @param {number} [goal=0]
 */
window.renderRank = function(list, goal = 0) {
    /**
     * @param {string} key
     * @param {string} fallback
     * @returns {string}
     */
    const t = (key, fallback) => (window.i18n ? window.i18n.t(key) : fallback);
    const div = document.getElementById('ranking-list');
    
    // Zabezpieczenie: jeśli nie ma elementu listy, nic nie robimy
    if(!div) return;
    
    // Czyścimy obecną listę
    div.innerHTML = '';
    
    // Jeśli lista jest pusta lub null
    if(!list || list.length === 0) {
        div.innerHTML = `<p class="center-text">${t('main.no_members', 'Brak domowników.')}</p>`;
        return;
    }

    // Sortowanie malejące (najwięcej punktów na górze)
    list.sort((a, b) => b.punkty - a.punkty);

    // Sekcja zwycięzcy jest obsługiwana w updateGoalDisplay (na podstawie zwycięzcy z bazy)

    // --- RENDEROWANIE LISTY ---
    list.forEach((user, index) => {
        // Sprawdzamy, czy to "JA" (do podświetlenia wiersza)
        let myLogin = '';
        if (window.token && window.parseJwt) {
            const decoded = window.parseJwt(window.token);
            if(decoded) myLogin = decoded.login;
        }
        const isMe = (myLogin === user.login);
        
        // --- 1. IKONY MEDALI (Zależą od miejsca w rankingu) ---
        let rankIcon = '';
        if (index === 0) rankIcon = '🥇';
        else if (index === 1) rankIcon = '🥈';
        else if (index === 2) rankIcon = '🥉';

        // --- 2. IKONA KORONY (Tylko dla zwycięzcy celu) ---
        // Jeśli zwycięzca jest zapisany w bazie, pokazujemy koronę tylko jemu
        let crownIcon = '';
        const winnerLogin = window.currentWinner ? window.currentWinner.login : null;
        if (winnerLogin) {
            if (user.login === winnerLogin) {
                crownIcon = ' <span style="font-size: 1.2em;">👑</span>';
            }
        } else if (goal > 0 && user.punkty >= goal) {
            crownIcon = ' <span style="font-size: 1.2em;">👑</span>';
        }

        // --- 3. PASEK POSTĘPU ---
        let progressBar = '';
        if (goal > 0) {
            const percent = Math.min(100, Math.round((user.punkty / goal) * 100));
            // Kolor: zielony jeśli osiągnięto cel, fioletowy w trakcie
            const barColor = user.punkty >= goal ? '#28a745' : '#667eea';
            
            progressBar = `
                <div style="width: 100%; background: #eee; height: 6px; border-radius: 3px; margin-top: 8px; overflow: hidden;">
                    <div style="width: ${percent}%; background: ${barColor}; height: 100%; transition: width 0.5s;"></div>
                </div>
            `;
        }

        // --- HTML WIERSZA ---
        const html = `
            <div class="list-item ranking-item ${index === 0 ? 'top-1' : ''} ${isMe ? 'current-user' : ''}" 
                 style="display: block;">
                
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 1.1em; display: flex; align-items: center; gap: 6px;">
                        <strong>${index + 1}.</strong> 
                        ${rankIcon} 
                        ${user.login} 
                        ${crownIcon}
                    </span>
                    <span style="font-weight: bold; color: #667eea; background: #f0f4ff; padding: 2px 8px; border-radius: 10px;">
                        ${user.punkty} ${t('main.points_short', 'pkt')}
                    </span>
                </div>
                
                ${progressBar}
            </div>
        `;
        
        div.insertAdjacentHTML('beforeend', html);
    });
};


// ==========================================
// HISTORIA
// ==========================================
window.pokazHistorie = async function() {
    /**
     * @param {string} key
     * @param {string} fallback
     * @returns {string}
     */
    const t = (key, fallback) => (window.i18n ? window.i18n.t(key) : fallback);
    openScreen('history-screen');
    const div = document.getElementById('history-list');
    if(div) {
        div.innerHTML = `<div class="center-text">${t('history.loading', 'Ładowanie...')}</div>`;
        const res = await apiCall('/historia');
        div.innerHTML = '';
        if(res.sukces && res.historia) {
            /** @type {HistoryEntry[]} */
            const historia = res.historia;
            historia.forEach(h => {
                div.innerHTML += `
                    <div class="history-item">
                        <div>
                            <b>${h.login}</b>: ${h.zadanie} 
                            <span class="history-points">+${h.punkty}</span>
                        </div>
                        <div style="color:#aaa; font-size:11px">${h.data}</div>
                    </div>`;
            });
        } else {
            div.innerHTML = `<div class="center-text">${t('history.empty', 'Brak historii')}</div>`;
        }
    }
}

// ==========================================
// LISTA ZADAŃ (CRUD)
// ==========================================
/**
 * @param {string} [successMessageKey]
 */
window.pokazListeZadan = async function(successMessageKey) {
    /**
     * @param {string} key
     * @param {string} fallback
     * @returns {string}
     */
    const t = (key, fallback) => (window.i18n ? window.i18n.t(key) : fallback);
    openScreen('task-list-screen');
    const div = document.getElementById('full-tasks-list');
    const msgEl = document.getElementById('task-list-message');
    if (msgEl) {
        msgEl.textContent = '';
        msgEl.classList.add('hidden');
        msgEl.classList.remove('alert-red', 'alert-orange', 'alert-green');
        msgEl.classList.add('alert-info');
    }
    if(div) {
        div.innerHTML = `<div class="center-text">${t('task_list.loading', 'Ładowanie...')}</div>`;
        const res = await apiCall('/zadania');
        
        // Aktualizujemy globalny cache zadań
        window.globalTasks = res.zadania || []; 
        
        div.innerHTML = '';
        if(res.zadania && res.zadania.length > 0) {
            /** @type {Task[]} */
            const zadania = res.zadania;
            zadania.forEach(t => {
                const item = document.createElement('div');
                item.className = 'task-list-item';
                item.innerHTML = `
                    <div>
                        <span style="font-weight:600; font-size:16px">${t.zadanie}</span><br>
                        <span style="font-size:12px; color:#667eea; font-weight:bold">${t.punkty} ${window.i18n ? window.i18n.t('main.points_short') : 'pkt'}</span>
                    </div>
                    <div class="task-actions">
                        <button class="btn-icon edit-btn">✏️</button>
                        <button class="btn-icon del delete-btn">🗑</button>
                    </div>`;
                
                // Eventy dynamiczne
                // Używamy funkcji globalnych otworzEdycje i usunZadanie
                const editBtn = /** @type {HTMLButtonElement|null} */ (item.querySelector('.edit-btn'));
                const deleteBtn = /** @type {HTMLButtonElement|null} */ (item.querySelector('.delete-btn'));
                if (editBtn) editBtn.onclick = () => window.otworzEdycje(t.id, t.zadanie, t.punkty);
                if (deleteBtn) deleteBtn.onclick = () => window.usunZadanie(t.id);
                div.appendChild(item);
            });
        } else {
            div.innerHTML = `<div class="center-text" style="color:#999">${t('task_list.empty', 'Brak zadań.')}</div>`;
        }

        if (successMessageKey && msgEl) {
            msgEl.textContent = t(successMessageKey, 'Zadanie zostało usunięte.');
            msgEl.classList.remove('hidden');
            setTimeout(() => {
                msgEl.textContent = '';
                msgEl.classList.add('hidden');
            }, 2500);
        }
    }
}

/**
 * @param {number} id
 * @param {string} nazwa
 * @param {number} punkty
 */
window.otworzEdycje = function(id, nazwa, punkty) {
    const idEl = /** @type {HTMLInputElement|null} */ (document.getElementById('edit-task-id'));
    const nameEl = /** @type {HTMLInputElement|null} */ (document.getElementById('edit-task-name'));
    const pointsEl = /** @type {HTMLInputElement|null} */ (document.getElementById('edit-task-points'));
    const msgEl = document.getElementById('task-edit-message');

    if (idEl) idEl.value = String(id);
    if (nameEl) nameEl.value = nazwa;
    if (pointsEl) pointsEl.value = String(punkty);
    if (msgEl) {
        msgEl.textContent = '';
        msgEl.classList.add('hidden');
        msgEl.classList.remove('alert-info', 'alert-red', 'alert-orange', 'alert-green');
    }
    openScreen('task-edit-screen');
}

/**
 * @param {number} id
 */
window.usunZadanie = async function(id) {
    /**
     * @param {string} key
     * @param {string} fallback
     * @returns {string}
     */
    const t = (key, fallback) => (window.i18n ? window.i18n.t(key) : fallback);
    const ok = await window.showModal({
        title: t('task_list.delete_confirm_title', 'Usuń zadanie'),
        body: t('task_list.delete_confirm_body', 'Czy na pewno chcesz usunąć to zadanie?'),
        type: 'confirm',
        okText: t('task_list.delete_confirm_ok', 'Usuń'),
        cancelText: t('task_list.delete_confirm_cancel', 'Anuluj')
    });
    if(!ok) return;
    const res = await apiCall(`/zadania/${id}`, 'DELETE');
    if(res.sukces) window.pokazListeZadan('task_list.delete_success');
    else {
        await window.showModal({
            title: t('task_list.delete_failed_title', 'Błąd'),
            body: res.wiadomosc || t('task_list.delete_failed_body', 'Nie udało się usunąć zadania.'),
            okText: t('task_list.delete_failed_ok', 'OK')
        });
    }
}

// ==========================================
// WYSZUKIWARKA (LIVE SEARCH)
// ==========================================
// Ta funkcja nie musi być window.*, jeśli jest używana tylko w event listenerach wewnątrz tego pliku,
// ALE w Twoim script.js była używana w listenerach DOMContentLoaded.
// Dla bezpieczeństwa zróbmy ją globalną, bo w script.js (sekcja Event listenery) nadal jej używasz.
/**
 * @param {string} query
 */
window.filterTasks = function(query) {
    const dropdownList = document.getElementById('task-dropdown-list');
    const searchInput = /** @type {HTMLInputElement|null} */ (document.getElementById('task-search-input'));
    if (!dropdownList) return;

    dropdownList.innerHTML = '';
    const lowerQuery = query.toLowerCase();
    
    // Używamy window.globalTasks ze state.js
    const filtered = window.globalTasks.filter(t => t.zadanie.toLowerCase().includes(lowerQuery));

    if (filtered.length === 0) {
        dropdownList.classList.add('hidden-list');
        return;
    }

    filtered.forEach(t => {
        const item = document.createElement('div');
        item.className = 'task-option-item';
        item.innerHTML = `<span>${t.zadanie}</span><span class="task-option-points">+${t.punkty}</span>`;
        item.onclick = () => {
            if(searchInput) searchInput.value = t.zadanie;
            dropdownList.classList.add('hidden-list');
        };
        dropdownList.appendChild(item);
    });
    dropdownList.classList.remove('hidden-list');
}

console.log("✅ Moduł zadań załadowany");
