// @ts-check
// public/js/house.js


// ==========================================
// LOGIKA DOMU
// ==========================================
/**
 * @param {string} key
 * @param {string} fallback
 * @param {Record<string, string|number>=} params
 * @returns {string}
 */
const houseT = (key, fallback, params) => (window.i18n ? window.i18n.t(key, params) : fallback);
/**
 * @param {any} res
 * @param {string} fallbackKey
 * @param {string} fallbackText
 * @returns {string}
 */
const resolveHouseMessage = (res, fallbackKey, fallbackText) => {
    if (window.i18n && res && typeof res.messageKey === 'string') {
        return window.i18n.t(res.messageKey);
    }
    if (res && res.wiadomosc) return res.wiadomosc;
    return houseT(fallbackKey, fallbackText);
};
/**
 * @param {string} text
 * @returns {void}
 */
const showNoHouseMessage = (text) => {
    const msg = document.getElementById('no-house-message');
    if (!msg) return;
    msg.textContent = text;
    msg.classList.add('alert-red');
    msg.classList.remove('alert-info', 'alert-orange');
    msg.classList.remove('hidden');
    setTimeout(() => {
        msg.textContent = '';
        msg.classList.add('hidden');
    }, 2500);
};
/**
 * @param {any} res
 * @param {string} fallbackKey
 * @param {string} fallbackText
 * @returns {string}
 */
const resolveGoalMessage = (res, fallbackKey, fallbackText) => {
    if (window.i18n && res && typeof res.messageKey === 'string') {
        return window.i18n.t(res.messageKey);
    }
    if (res && res.wiadomosc === 'Brak uprawnień') {
        return houseT('goal_screen.no_permissions', 'Brak uprawnień');
    }
    if (res && res.wiadomosc) return res.wiadomosc;
    return houseT(fallbackKey, fallbackText);
};

// Sprawdza czy user ma dom i kieruje na odpowiedni ekran
window.sprawdzDom = async function() {
    const res = await apiCall('/domy/moj-dom');
    if (res.sukces) {
        if (res.dom) {
            // ✅ KLUCZOWE: Resetujemy cel przed inicjalizacją ekranu
            window.currentGoal = res.dom.cel_punktow || 0;
            window.currentWinner = res.dom.zwyciezca_id
                ? { id: res.dom.zwyciezca_id, login: res.dom.zwyciezca_login }
                : null;
            window.initializeMainScreen(res.dom, res.is_owner);
        } else {
            // Reset gdy brak domu
            window.currentGoal = 0;
            window.currentWinner = null;
            openScreen('no-house-screen');
        }
    } else {
        window.wyloguj();
    }
}

// Ustawia widok głównego ekranu (menu, tytuł, dane)
/**
 * @param {Dom} dom
 * @param {boolean} isOwner
 */
window.initializeMainScreen = async function(dom, isOwner) {
    // Aktualizujemy zmienną globalną (dla ui.js)
    window.currentHouseName = dom.nazwa;
    window.currentGoal = dom.cel_punktow || 0;
    if (window.updateGoalDisplay) window.updateGoalDisplay([]);
    
    // UI właściciela (pokazujemy/ukrywamy odpowiednie przyciski)
    const taskMenuItem = document.getElementById('menu-task-settings');
    const deleteZone = document.getElementById('owner-delete-zone');
    const leaveBtn = document.getElementById('leave-btn');
    const managementZone = document.getElementById('owner-management-zone');
    const goalResetZone = document.getElementById('goal-reset-zone');
    
    if (isOwner) {
        if(taskMenuItem) taskMenuItem.classList.remove('hidden');
        if(deleteZone) deleteZone.classList.remove('hidden');
        if(managementZone) managementZone.classList.remove('hidden');
        if(goalResetZone) goalResetZone.classList.remove('hidden');
        if(leaveBtn) leaveBtn.classList.add('hidden');
    } else {
        if(taskMenuItem) taskMenuItem.classList.add('hidden');
        if(deleteZone) deleteZone.classList.add('hidden');
        if(managementZone) managementZone.classList.add('hidden');
        if(goalResetZone) goalResetZone.classList.add('hidden');
        if(leaveBtn) leaveBtn.classList.remove('hidden');
    }

    const goalInput = /** @type {HTMLInputElement|null} */ (document.getElementById('goal-input'));
    if (goalInput) goalInput.value = String(window.currentGoal || 0);

    // ========================================
    // ✅ WYŚWIETLANIE CELU NA EKRANIE GŁÓWNYM
    // ========================================
    const goalContainer = document.getElementById('goal-display-container');
    const goalValue = document.getElementById('current-goal-display');
    
    
    if (window.currentGoal > 0) {
        // POKAŻ CEL
        if (goalContainer && goalValue) {
            goalContainer.style.display = 'block';
            goalValue.textContent = window.currentGoal.toLocaleString(); // 1 000 zamiast 1000
        }
    } else {
        // UKRYJ CEL (0 lub brak)
        if (goalContainer) {
            goalContainer.style.display = 'none';
        }
    }
    

    // Wyświetlamy kod domu
    const codeDisplay = document.getElementById('display-code');
    if(codeDisplay) codeDisplay.textContent = dom.kod_dolaczenia;

    // Pobranie danych startowych (Zadania i Ranking)
    // apiCall jest globalne
    const [tasksRes, rankRes] = await Promise.all([
        apiCall('/zadania'),
        apiCall('/ranking')
    ]);
    window.globalTasks = tasksRes.zadania || [];

// ✅ ETAP 2: Pełna logika z rankingiem
    if (rankRes?.sukces) {
        if (window.updateGoalDisplay) window.updateGoalDisplay(rankRes.ranking);
        if (window.renderRank) {
            window.renderRank(rankRes.ranking, window.currentGoal || 0);
        }
    }

    // Reset inputa wyszukiwarki
    const searchInput = /** @type {HTMLInputElement|null} */ (document.getElementById('task-search-input'));
    if(searchInput) searchInput.value = '';

    // Renderujemy ranking (funkcja z tasks.js)
    if(window.renderRank && window.currentGoal !== undefined) {
        window.renderRank(rankRes.ranking, window.currentGoal);
    }

    openScreen('main-screen');

    // Obsługa oczekującego zaproszenia (jeśli ktoś wszedł z linku, ale musiał się zalogować)
    // To jest fallback, główna logika jest w invites.js, ale warto tu zostawić
    // dla spójności ze starym kodem (jeśli pendingInvite jest w localStorage).
    const pending = localStorage.getItem('pendingInvite');
    if(pending) {
        localStorage.removeItem('pendingInvite');
        const shouldJoin = await window.showModal({
            title: houseT('house_fallback.pending_invite_title', 'Zaproszenie'),
            body: houseT('house_fallback.pending_invite_body', 'Masz oczekujące zaproszenie. Czy chcesz dołączyć do domu?'),
            type: 'confirm',
            okText: houseT('house_fallback.pending_invite_ok', 'Dołącz'),
            cancelText: houseT('house_fallback.pending_invite_cancel', 'Anuluj')
        });
        if(shouldJoin) {
            const joinRes = await apiCall('/domy/dolacz', 'POST', { kod: pending });
            if(joinRes.sukces) window.sprawdzDom();
            else {
                await window.showModal({
                    title: houseT('house_fallback.pending_invite_error_title', 'Błąd'),
                    body: joinRes.wiadomosc || houseT('house_fallback.pending_invite_error_body', 'Nie udało się dołączyć do domu.'),
                    okText: houseT('common.ok', 'OK')
                });
            }
        }
    }
}

// === NOWE FUNKCJE DLA WŁAŚCICIELA ===

window.zapiszCel = async function() {
    const goalInputEl = /** @type {HTMLInputElement|null} */ (document.getElementById('goal-input'));
    const val = goalInputEl ? goalInputEl.value : '';
    const res = await apiCall('/domy/ustaw-cel', 'POST', { cel: val });
    
    if (res.sukces) {
        // ✅ AKTUALIZUJ GLOBALNY CEL
        window.currentGoal = parseInt(val) || 0;
        const msgEl = document.getElementById('goal-message');
        if (msgEl) {
            msgEl.textContent = houseT('goal_screen.saved_message', '✅ Cel zapisany: {goal} pkt!', { goal: window.currentGoal });
            msgEl.classList.add('alert-info');
            msgEl.classList.remove('alert-red', 'alert-orange');
            msgEl.classList.remove('hidden');
            setTimeout(() => msgEl.classList.add('hidden'), 2500);
        }
        
        // ODŚWIEŻ WYŚWIETLANIE CELU
        const goalContainer = document.getElementById('goal-display-container');
        const goalValue = document.getElementById('current-goal-display');
        if (window.currentGoal > 0 && goalContainer && goalValue) {
            goalContainer.style.display = 'block';
            goalValue.textContent = window.currentGoal.toLocaleString();
        }
        
        // Pozostań na ekranie celu gry
    } else {
        const msgEl = document.getElementById('goal-message');
        if (msgEl) {
            msgEl.textContent = resolveGoalMessage(res, 'goal_screen.save_failed', 'Nie udało się zapisać celu.');
            msgEl.classList.add('alert-red');
            msgEl.classList.remove('alert-info', 'alert-orange');
            msgEl.classList.remove('hidden');
            setTimeout(() => msgEl.classList.add('hidden'), 2500);
        }
    }
}


window.resetujGre = async function() {
    const ok = await window.showModal({
        title: houseT('goal_screen.reset_confirm_title', 'Reset gry'),
        body: houseT('goal_screen.reset_confirm_body', 'Wyzeruje punkty WSZYSTKIM i wyczyści historię.<br><br>Rozpocząć NOWĄ GRĘ?'),
        type: 'confirm',
        okText: houseT('goal_screen.reset_confirm_ok', 'Resetuj'),
        cancelText: houseT('goal_screen.reset_confirm_cancel', 'Anuluj')
    });
    if (ok) {
        const goalInputEl = /** @type {HTMLInputElement|null} */ (document.getElementById('goal-input'));
        const currentInputVal = goalInputEl ? goalInputEl.value : '';
        const res = await apiCall('/domy/reset-gry', 'POST', { cel: currentInputVal });
        
        if (res.sukces) {
            await window.showModal({
                title: houseT('goal_screen.reset_success_title', 'Gotowe'),
                body: houseT('goal_screen.reset_success_body', '🎮 Nowa gra rozpoczęta!'),
                okText: houseT('goal_screen.reset_success_ok', 'OK')
            });
            window.sprawdzDom(); // Pełne odświeżenie
        } else {
            await window.showModal({
                title: houseT('goal_screen.reset_failed_title', 'Błąd'),
                body: resolveGoalMessage(res, 'goal_screen.reset_failed_body', 'Nie udało się zresetować gry.'),
                okText: houseT('goal_screen.reset_failed_ok', 'OK')
            });
        }
    }
}

// --- AKCJE UŻYTKOWNIKA ---

window.stworzDom = async function() {
    const nameInput = /** @type {HTMLInputElement|null} */ (document.getElementById('new-house-name'));
    const nazwa = nameInput ? nameInput.value : '';
    if(nazwa) {
        const res = await apiCall('/domy', 'POST', { nazwa });
        if(res.sukces) {
            window.sprawdzDom();
        } else {
            showNoHouseMessage(resolveHouseMessage(res, 'api.house.create_failed', 'Błąd tworzenia domu.'));
        }
    }
}

window.dolaczDoDomu = async function() {
    const codeInput = /** @type {HTMLInputElement|null} */ (document.getElementById('join-code'));
    const kod = codeInput ? codeInput.value : '';
    if(kod) {
        const res = await apiCall('/domy/dolacz', 'POST', { kod });
        if(res.sukces) {
            window.sprawdzDom();
        } else {
            showNoHouseMessage(resolveHouseMessage(res, 'api.house.join_failed', 'Błąd dołączania.'));
        }
    }
}

window.copyLink = function() {
    // window.location.origin to np. "http://localhost:3000"
    const codeEl = document.getElementById('display-code');
    const kod = codeEl ? codeEl.textContent || '' : '';
    const link = `${window.location.origin}?kod=${kod}`;
    const msgEl = document.getElementById('invite-copy-message');
    
    navigator.clipboard.writeText(link).then(() => {
        if (msgEl) {
            msgEl.textContent = houseT('house_invites.copy_success', 'Skopiowano link do schowka!');
            msgEl.classList.remove('hidden');
            setTimeout(() => msgEl.classList.add('hidden'), 2500);
        }
    }).catch(err => {
        console.error('Błąd kopiowania:', err);
        if (msgEl) {
            msgEl.textContent = houseT('house_invites.copy_failed', 'Nie udało się skopiować. Skopiuj ręcznie poniższy link.');
            msgEl.classList.remove('hidden');
        }
        prompt(houseT('house_invites.copy_manual_prompt', 'Skopiuj link ręcznie:'), link);
    });
}

window.usunDom = async function() {
    const settingsMsgEl = document.getElementById('house-settings-message');
    const ok = await window.showModal({
        title: houseT('house_settings.delete_confirm_title', 'Usuń dom'),
        body: houseT('house_settings.delete_confirm_body', 'To usunie dom i wszystkich użytkowników z niego.<br><br>Czy kontynuować?'),
        type: 'confirm',
        okText: houseT('house_settings.delete_confirm_ok', 'Usuń'),
        cancelText: houseT('house_settings.delete_confirm_cancel', 'Anuluj')
    });
    if(ok) {
        const res = await apiCall('/domy', 'DELETE');
        if(res.sukces) {
            if (settingsMsgEl) {
                settingsMsgEl.textContent = houseT('house_settings.delete_success', 'Dom został usunięty.');
                settingsMsgEl.classList.remove('hidden');
            }
            setTimeout(() => { wyloguj(); }, 1200); // Lub openScreen('no-house-screen') - zależy od logiki API (czy usuwa usera czy tylko dom)
        } else {
            await window.showModal({
                title: houseT('house_settings.delete_failed_title', 'Błąd'),
                body: resolveHouseMessage(res, 'house_settings.delete_failed_body', 'Nie udało się usunąć domu.'),
                okText: houseT('house_settings.delete_failed_ok', 'OK')
            });
        }
    }
}

window.opuscDom = async function() {
    const settingsMsgEl = document.getElementById('house-settings-message');
    const ok = await window.showModal({
        title: houseT('house_settings.leave_confirm_title', 'Opuść dom'),
        body: houseT('house_settings.leave_confirm_body', 'Czy na pewno chcesz opuścić dom?'),
        type: 'confirm',
        okText: houseT('house_settings.leave_confirm_ok', 'Opuść'),
        cancelText: houseT('house_settings.leave_confirm_cancel', 'Anuluj')
    });
    if(ok) {
        const res = await apiCall('/domy/opusc', 'POST');
        if(res.sukces) {
            if (settingsMsgEl) {
                settingsMsgEl.textContent = houseT('house_settings.leave_success', 'Opuszczasz dom...');
                settingsMsgEl.classList.remove('hidden');
            }
            setTimeout(() => { window.location.reload(); }, 1200); // Najczystsze wyjście - resetuje stan
        } else {
            await window.showModal({
                title: houseT('house_settings.leave_failed_title', 'Błąd'),
                body: resolveHouseMessage(res, 'house_settings.leave_failed_body', 'Nie udało się opuścić domu.'),
                okText: houseT('house_settings.leave_failed_ok', 'OK')
            });
        }
    }
}


window.pokazZarzadzanieDomownikami = async function() {
    // 1. Standardowe przełączenie ekranu (ukrywa inne, zmienia nagłówek)
    window.openScreen('manage-members-screen');
    
    const container = document.getElementById('members-list-container');
    if (!container) return;
    container.innerHTML = `<div class="center-text">${houseT('manage_members.loading_list', 'Ładowanie listy...')}</div>`;

    // 2. Pobranie danych
    const res = await apiCall('/domy/domownicy');

    if (res.sukces) {
        container.innerHTML = ''; // Czyść loader

        // Jeśli nikogo innego nie ma
        if (res.domownicy.length <= 1) { // <= 1 bo wlasciciel tez tam jest
            container.innerHTML = `<div class="center-text" style="color:#999">${houseT('manage_members.empty', 'Mieszkasz sam(a). Zaproś kogoś!')}</div>`;
        }

        // Parsujemy token, żeby zidentyfikować siebie (nie wyświetlać kosza przy sobie)
        const myData = window.token ? window.parseJwt(window.token) : {}; 

        // 3. Renderowanie listy
        /** @type {{ id: number, login: string }[]} */
        const domownicy = res.domownicy || [];
        domownicy.forEach(user => {
            const isMe = (user.id === myData.id);
            
            // Tworzymy element listy identyczny jak w liście zadań
            const div = document.createElement('div');
            div.className = 'task-list-item'; // Używamy stylu z zadań dla spójności
            
            // Przycisk usuwania (tylko jeśli to nie ja)
            const actionHtml = isMe 
                ? `<span style="font-size:12px; color:#ccc; font-weight:bold;">${houseT('manage_members.you_badge', 'TY')}</span>` 
                : `<button class="btn-icon del" onclick="window.wyrzucDomownika(${user.id}, '${user.login}')">🗑️</button>`;

            div.innerHTML = `
                <div>
                    <span style="font-weight:600; font-size:16px;">${user.login}</span>
                </div>
                <div class="task-actions">
                    ${actionHtml}
                </div>
            `;
            container.appendChild(div);
        });

    } else {
        container.innerHTML = `<div class="alert-red">${res.wiadomosc}</div>`;
    }
};

window.wyrzucDomownika = async function(userId, userLogin) {
    const zgoda = await window.showModal({
        title: houseT('manage_members.remove_confirm_title', 'Potwierdź usunięcie'),
        body: houseT(
            'manage_members.remove_confirm_body',
            `Czy na pewno chcesz usunąć użytkownika "<b>${userLogin}</b>"?<br><br>Straci on dostęp do domu, a jego punkty zostaną wyzerowane.`,
            { userLogin }
        ),
        type: 'confirm',
        okText: houseT('manage_members.remove_ok', 'Usuń'),
        cancelText: houseT('manage_members.remove_cancel', 'Anuluj')
    });

    if (!zgoda) return;

    const res = await apiCall(`/domy/domownicy/${userId}`, 'DELETE');

    if (res.sukces) {
        const msg = document.getElementById('manage-members-message');
        if (msg) {
            msg.textContent = houseT('manage_members.remove_success', 'Domownik został usunięty.');
            msg.classList.remove('hidden');
            setTimeout(() => {
                msg.textContent = '';
                msg.classList.add('hidden');
            }, 2500);
        }
        // Odśwież widok po usunięciu
        window.pokazZarzadzanieDomownikami();
    } else {
        await window.showModal({
            title: houseT('manage_members.remove_failed_title', 'Błąd'),
            body: res.wiadomosc || houseT('manage_members.remove_failed_body', 'Nie udało się usunąć domownika.'),
            okText: houseT('common.ok', 'OK')
        });
    }
};

// --- WERYFIKACJA STATUSU (CZY NAS NIE WYRZUCONO) ---
window.weryfikujStatusDomownika = async function() {
    // Sprawdzamy tylko, jeśli jesteśmy zalogowani
    if (!window.token) return;

    // Sprawdzamy czy aktualnie jesteśmy na ekranie wyboru domu ("no-house-screen")
    // Jeśli tak, to nie ma sensu sprawdzać, czy nas wyrzucono (bo i tak nie mamy domu)
    const noHouseScreen = document.getElementById('no-house-screen');
    if (!noHouseScreen || !noHouseScreen.classList.contains('hidden')) return;

    // "Ciche" zapytanie do API
    const res = await apiCall('/domy/moj-dom');

    if (res.sukces && res.dom === null) {
        // API twierdzi, że nie mamy domu, a my nie jesteśmy na ekranie startowym
        // Znaczy to, że zostaliśmy usunięci!
        await window.showModal({
            title: houseT('house_fallback.removed_from_house_title', 'Uwaga'),
            body: houseT('house_fallback.removed_from_house_body', 'Zostałeś usunięty z domu przez właściciela.'),
            okText: houseT('common.ok', 'OK')
        });
        window.location.reload(); // Przeładowanie uruchomi window.sprawdzDom(), który pokaże odpowiedni ekran
    }
};


window.updateGoalDisplay = function(ranking = []) {
    const goalContainer = document.getElementById('goal-display-container');
    const goalValue = document.getElementById('current-goal-display');
    const winnerSection = document.getElementById('winner-section');
    
    // Reset - ukryj obie
    if (goalContainer) {
        goalContainer.style.display = 'none';
        goalContainer.classList.add('hidden');
    }
    if (winnerSection) {
        winnerSection.style.display = 'none';
        winnerSection.classList.add('hidden');
    }
    
    // Jest zwycięzca?
    const currentGoal = window.currentGoal || 0;
    const winner = window.currentWinner;
    const maZwyciezce = currentGoal > 0 && winner;
    
    // ZWYCIĘZCA
    if (maZwyciezce && winnerSection) {
        winnerSection.style.display = 'block';
        winnerSection.classList.remove('hidden');
        const winnerNameEl = document.getElementById('winner-name');
        const winnerGoalEl = document.getElementById('winner-goal-display');
        if (winnerNameEl && winner) winnerNameEl.textContent = winner.login;
        if (winnerGoalEl) winnerGoalEl.textContent = currentGoal.toLocaleString();
    }
    // CEL
    else if (currentGoal > 0 && goalContainer && goalValue) {
        goalContainer.style.display = 'block';
        goalContainer.classList.remove('hidden');
        goalValue.textContent = currentGoal.toLocaleString();
    }
};

console.log("✅ Moduł domu załadowany");
