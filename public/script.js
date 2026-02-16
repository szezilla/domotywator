// @ts-check
// ==========================================
// 7. INICJALIZACJA I EVENT LISTENERY
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    /**
     * @param {any} response
     * @param {string} fallback
     */
    const resolveApiMessage = (response, fallback) => {
        if (window.i18n && response && typeof response.messageKey === 'string') {
            return window.i18n.t(response.messageKey);
        }
        return (response && response.wiadomosc) ? response.wiadomosc : fallback;
    };
    /**
     * @param {string} key
     * @param {string} fallback
     */
    const tr = (key, fallback) => (window.i18n ? window.i18n.t(key) : fallback);
    const aboutVersionEl = document.getElementById('about-version-value');
    if (aboutVersionEl) {
        try {
            const metaRes = await fetch('/api/meta');
            if (metaRes.ok) {
                const meta = await metaRes.json();
                aboutVersionEl.textContent = (meta && meta.version) ? String(meta.version) : '-';
            }
        } catch {
            aboutVersionEl.textContent = '-';
        }
    }
    
    // Obsługa formularzy (te muszą być w JS, bo submit przeładowuje stronę)
    
    // Logowanie
    const loginForm = document.getElementById('login-form');
    if(loginForm) {
        loginForm.addEventListener('submit', async e => {
            e.preventDefault();
            const form = /** @type {HTMLFormElement} */ (e.currentTarget);
            const btn = /** @type {HTMLButtonElement|null} */ (form.querySelector('button'));
            const msgDiv = document.getElementById('auth-message');

            if (!btn || !msgDiv) return;
            
            btn.disabled = true;
            btn.innerText = window.i18n ? window.i18n.t('auth.login_loading') : 'Logowanie...';
            msgDiv.innerHTML = '';

            const loginInput = /** @type {HTMLInputElement|null} */ (document.getElementById('login-login'));
            const passInput = /** @type {HTMLInputElement|null} */ (document.getElementById('login-password'));
            const res = await apiCall('/auth/login', 'POST', {
                login: loginInput ? loginInput.value : '',
                haslo: passInput ? passInput.value : ''
            });

            btn.disabled = false;
            btn.innerText = window.i18n ? window.i18n.t('auth.login_button') : 'Zaloguj się';

            if (res.sukces) {
    window.token = res.token || null;
    if (window.token) localStorage.setItem('token', window.token);
    
    // Sprawdzamy czy było oczekujące zaproszenie (z URL lub z LocalStorage)
    const pendingCode = window.pendingInviteCode || localStorage.getItem('pendingInvite');
    
    if (pendingCode) {
        // Czyścimy localStorage, żeby nie wisiało wiecznie
        localStorage.removeItem('pendingInvite');
        
        // Pokazujemy ekran zaproszenia zamiast od razu wchodzić do domu
        // Funkcja pokazEkranZaproszenia (z invites.js) sama sprawdzi czy user ma już dom
        // i wyświetli odpowiednie ostrzeżenie
        window.pokazEkranZaproszenia(pendingCode);
    } else {
        // Standardowa ścieżka
        window.sprawdzDom();
    }
            }       else {
                // --- TUTAJ JEST FIX ---
                // Jeśli logowanie się nie uda, wyświetlamy komunikat
                msgDiv.innerHTML = `<div class="alert-red">
                                        <span style="margin-right: 8px;"></span>
                                        <span>${res.wiadomosc}</span>
                                    </div>`;
                setTimeout(() => { msgDiv.innerHTML = ''; }, 2500);
                
                // Opcjonalnie: trzęsienie formularzem lub inputami (dla lepszego UX)
                if (loginInput) loginInput.classList.add('input-error');
                if (passInput) passInput.classList.add('input-error');
            }
        });
    }

    // Rejestracja
    const regForm = document.getElementById('register-form');
    if(regForm) {
        const regEmailField = /** @type {HTMLInputElement|null} */ (document.getElementById('reg-email'));
        if (regEmailField) {
            regEmailField.addEventListener('input', () => {
                const val = regEmailField.value.trim();
                const ok = /^[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(val);
                if (ok) regEmailField.classList.remove('input-error');
            });
        }
        regForm.addEventListener('submit', async e => {
            e.preventDefault();
            const form = /** @type {HTMLFormElement} */ (e.currentTarget);
            const btn = /** @type {HTMLButtonElement|null} */ (form.querySelector('button'));
            const msgDiv = document.getElementById('auth-message');

            if (!btn || !msgDiv) return;

            const regPass = /** @type {HTMLInputElement|null} */ (document.getElementById('reg-password'));
            const regPassConfirm = /** @type {HTMLInputElement|null} */ (document.getElementById('reg-password-confirm'));
            if((regPass ? regPass.value : '') !== (regPassConfirm ? regPassConfirm.value : '')) {
                msgDiv.innerHTML = `<div class="alert-red">${tr('auth.passwords_mismatch', 'Hasła nie są identyczne!')}</div>`;
                setTimeout(() => { msgDiv.innerHTML = ''; }, 2500);
                return;
            }

            const regLogin = /** @type {HTMLInputElement|null} */ (document.getElementById('reg-login'));
            const regEmail = /** @type {HTMLInputElement|null} */ (document.getElementById('reg-email'));
            const emailVal = regEmail ? regEmail.value.trim() : '';
            const emailOk = /^[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(emailVal);
            if (!emailOk) {
                msgDiv.innerHTML = `<div class="alert-red">${tr('auth.invalid_email', 'Podaj poprawny adres e-mail.')}</div>`;
                if (regEmail) regEmail.classList.add('input-error');
                btn.disabled = false;
                btn.innerText = tr('auth.register_button', 'Zarejestruj się');
                setTimeout(() => { msgDiv.innerHTML = ''; }, 2500);
                return;
            }

            btn.disabled = true;
            btn.innerText = tr('auth.register_loading', 'Zakładanie konta...');
            const res = await apiCall('/auth/rejestracja', 'POST', {
                login: regLogin ? regLogin.value : '',
                email: emailVal,
                haslo: regPass ? regPass.value : '',
                lang: window.i18n ? window.i18n.getLanguage() : 'pl'
            });

            btn.disabled = false;
            btn.innerText = tr('auth.register_button', 'Zarejestruj się');

            if (res.sukces) {
                const successText = (res && typeof res.wiadomosc === 'string' && res.wiadomosc.trim() === 'Konto założone! Sprawdź maila.')
                    ? tr('auth.register_success_check_email', 'Konto założone! Sprawdź maila.')
                    : resolveApiMessage(res, tr('auth.register_success_check_email', 'Konto założone! Sprawdź maila.'));
                msgDiv.innerHTML = `<div class="alert-green">${successText}</div>`;
                form.reset();
                setTimeout(() => { msgDiv.innerHTML = ''; }, 2500);
                setTimeout(window.pokazLogowanie, 2500);
            } else {
                const takenText = (res && typeof res.wiadomosc === 'string' && res.wiadomosc.trim() === 'Login/Email zajęty')
                    ? tr('auth.login_email_taken', 'Login/Email zajęty')
                    : resolveApiMessage(res, '');
                msgDiv.innerHTML = `<div class="alert-red">${takenText}</div>`;
                setTimeout(() => { msgDiv.innerHTML = ''; }, 2500);
            }
        });
    }

    // obsługa resetu hasła

   

// 2. Formularz wysyłki maila
const forgotForm = document.getElementById('forgot-password-form');
if (forgotForm) {
    const forgotEmailField = /** @type {HTMLInputElement|null} */ (document.getElementById('forgot-email'));
    if (forgotEmailField) {
        forgotEmailField.addEventListener('input', () => {
            const val = forgotEmailField.value.trim();
            const ok = /^[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(val);
            if (ok) forgotEmailField.classList.remove('input-error');
        });
    }
    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = /** @type {HTMLFormElement} */ (e.currentTarget);
        const btn = /** @type {HTMLButtonElement|null} */ (form.querySelector('button[type="submit"]'));
        if (!btn) return;
        btn.disabled = true;
        btn.textContent = tr('auth.forgot_submit_loading', 'Wysyłanie...');
        const emailInput = /** @type {HTMLInputElement|null} */ (document.getElementById('forgot-email'));
        const emailVal = emailInput ? emailInput.value.trim() : '';
        const emailOk = /^[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(emailVal);
        if (!emailOk) {
            const msgDiv = document.getElementById('forgot-message');
            if (msgDiv) {
                msgDiv.innerHTML = `<div class="alert-red">${tr('auth.invalid_email', 'Podaj poprawny adres e-mail.')}</div>`;
                setTimeout(() => { msgDiv.innerHTML = ''; }, 2500);
            }
            if (emailInput) emailInput.classList.add('input-error');
            btn.disabled = false;
            btn.textContent = tr('auth.forgot_submit_button', 'Wyślij link');
            return;
        }

        const res = await apiCall('/auth/zapomnialem-haslo', 'POST', {
            email: emailVal,
            lang: window.i18n ? window.i18n.getLanguage() : 'pl'
        });
        
        btn.disabled = false;
        btn.textContent = tr('auth.forgot_submit_button', 'Wyślij link');
        
        const msgDiv = document.getElementById('forgot-message');
        if (msgDiv) {
            const messageText = resolveApiMessage(res, '');
            msgDiv.innerHTML = res.sukces
                ? `<div class="alert-info">${messageText}</div>`
                : `<div class="alert-red">${messageText}</div>`;
            setTimeout(() => { msgDiv.innerHTML = ''; }, 2500);
        }
    });
}

    // Profil: zmiana hasła
    const profileChangeForm = document.getElementById('profile-change-password-form');
    if (profileChangeForm) {
        profileChangeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = /** @type {HTMLFormElement} */ (e.currentTarget);
            const btn = /** @type {HTMLButtonElement|null} */ (form.querySelector('button[type=\"submit\"]'));
            const msgDiv = document.getElementById('profile-change-message');
            if (!btn || !msgDiv) return;

            const currentPass = (/** @type {HTMLInputElement|null} */ (document.getElementById('profile-current-pass')))?.value || '';
            const newPass = (/** @type {HTMLInputElement|null} */ (document.getElementById('profile-new-pass')))?.value || '';
            const newPassConfirm = (/** @type {HTMLInputElement|null} */ (document.getElementById('profile-new-pass-confirm')))?.value || '';

            if (newPass !== newPassConfirm) {
                msgDiv.innerHTML = `<div class="alert-red">${tr('profile.passwords_mismatch', 'Hasła nie są identyczne!')}</div>`;
                setTimeout(() => { msgDiv.innerHTML = ''; }, 2500);
                return;
            }
            if (currentPass && newPass && currentPass === newPass) {
                msgDiv.innerHTML = `<div class="alert-red">${tr('profile.new_same_as_current', 'Nowe hasło nie może być takie samo jak obecne.')}</div>`;
                setTimeout(() => { msgDiv.innerHTML = ''; }, 2500);
                return;
            }

            btn.disabled = true;
            btn.textContent = tr('profile.submit_change_password_loading', 'Zmiana...');

            const res = await apiCall('/auth/zmien-haslo-zalogowany', 'POST', {
                obecneHaslo: currentPass,
                noweHaslo: newPass
            });

            btn.disabled = false;
            btn.textContent = tr('profile.submit_change_password', 'Zmień hasło');

            if (res.sukces) {
                msgDiv.innerHTML = `<div class="alert-green">${tr('profile.password_changed_logout', 'Hasło zostało zmienione, zostaniesz wylogowany.')}</div>`;
                form.reset();
                setTimeout(() => { window.wyloguj(); }, 3000);
            } else {
                msgDiv.innerHTML = `<div class="alert-red">${resolveApiMessage(res, '')}</div>`;
            }
            setTimeout(() => { msgDiv.innerHTML = ''; }, 2500);
        });
    }

    // Profil: usuwanie konta
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            const confirmed = await window.showModal({
                title: tr('profile.delete_confirm_title', 'Potwierdź usunięcie konta'),
                body: tr(
                    'profile.delete_confirm_body',
                    'Czy na pewno chcesz usunąć konto?<br><br>Operacja jest nieodwracalna. Jeśli jesteś właścicielem domu, dom również zostanie usunięty.'
                ),
                okText: tr('profile.delete_confirm_ok', 'Tak, usuń'),
                cancelText: tr('profile.delete_confirm_cancel', 'Anuluj'),
                type: 'confirm'
            });
            if (!confirmed) return;

            const btn = /** @type {HTMLButtonElement} */ (deleteAccountBtn);
            const msgDiv = document.getElementById('profile-delete-message');
            btn.disabled = true;
            btn.textContent = tr('profile.delete_account_loading', 'Usuwanie...');

            const res = await apiCall('/auth/usun-konto-zalogowany', 'DELETE');

            btn.disabled = false;
            btn.textContent = tr('profile.delete_account_button', '🗑️ Usuń konto');

            if (!msgDiv) return;
            if (res.sukces) {
                msgDiv.innerHTML = `<div class="alert-green">${resolveApiMessage(res, tr('api.auth.profile.account_deleted', 'Konto zostało usunięte.'))}</div>`;
                setTimeout(() => { msgDiv.innerHTML = ''; }, 2500);
                setTimeout(() => window.wyloguj(), 3000);
            } else {
                msgDiv.innerHTML = `<div class="alert-red">${resolveApiMessage(res, tr('profile.delete_failed', 'Nie udało się usunąć konta.'))}</div>`;
                setTimeout(() => { msgDiv.innerHTML = ''; }, 2500);
            }
        });
    }

    // Toggle hasła (ikonka oka)
    document.querySelectorAll('.toggle-pass').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            if (!targetId) return;
            const input = /** @type {HTMLInputElement|null} */ (document.getElementById(targetId));
            if (!input) return;
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            btn.textContent = isPassword
                ? tr('profile.hide_password', 'Ukryj')
                : tr('profile.show_password', 'Pokaż');
        });
    });





    // Dodawanie punktów
    const taskForm = document.getElementById('task-form');
    if(taskForm) {
        taskForm.addEventListener('submit', async e => {
            e.preventDefault();
            const input = /** @type {HTMLInputElement|null} */ (document.getElementById('task-search-input'));
            const zadanieNazwa = input ? input.value : '';
            
            const zadanieIstnieje = window.globalTasks.find(t => t.zadanie === zadanieNazwa);
            if(!zadanieNazwa || !zadanieIstnieje) {
                const msg = document.getElementById('main-message');
                if (msg) {
                    msg.textContent = tr('main.invalid_task', 'Wybierz poprawne zadanie z listy!');
                    msg.classList.add('alert-red');
                    msg.classList.remove('alert-info', 'alert-orange');
                    msg.classList.remove('hidden');
                    setTimeout(() => {
                        msg.textContent = '';
                        msg.classList.add('hidden');
                    }, 2500);
                }
                return;
            }
            
            const btn = /** @type {HTMLButtonElement|null} */ (document.getElementById('add-points-btn'));
            if (!btn) return;
            btn.disabled = true;
            btn.innerText = tr('main.add_points_saving', 'Zapisywanie...');

                       const res = await apiCall('/punkty', 'POST', { zadanie: zadanieNazwa });
            
            if(res.sukces) {
                const msg = document.getElementById('main-message');
                if (msg) {
                    msg.textContent = tr('main.points_added', 'Dodano punkty!');
                    msg.classList.add('alert-info');
                    msg.classList.remove('alert-red', 'alert-orange');
                    msg.classList.remove('hidden');
                }
                if (input) input.value = "";
                if (res.zwyciezca) {
                    window.currentWinner = res.zwyciezca;
                }

                if (window.renderRank) {
                    const goal = (typeof window.currentGoal !== 'undefined') ? window.currentGoal : 0;
                    window.renderRank(res.ranking, goal);
                }
                if (typeof window.updateGoalDisplay === 'function') {
                    window.updateGoalDisplay(res.ranking);
                }

                setTimeout(() => { 
                    if (msg) {
                        msg.textContent='';
                        msg.classList.add('hidden');
                    }
                    btn.disabled=false; 
                    btn.innerText = tr('main.add_points_button', 'Dodaj punkty'); 
                }, 2000);
            } else {
                btn.disabled = false;
                btn.innerText = tr('main.add_points_button', 'Dodaj punkty');
                
                // Obsługa usunięcia domu przez właściciela
                if (res.wiadomosc === 'Brak domu') {
                    const msg = document.getElementById('main-message');
                    if (msg) {
                        msg.textContent = tr('main.house_removed_or_not_member', 'Dom został usunięty lub nie jesteś jego członkiem.');
                        msg.classList.add('alert-red');
                        msg.classList.remove('alert-info', 'alert-orange');
                        msg.classList.remove('hidden');
                        setTimeout(() => { 
                            msg.textContent=''; 
                            msg.classList.add('hidden'); 
                        }, 2500);
                    }
                    window.sprawdzDom(); // Przeładowuje stan i pokazuje ekran wyboru domu
                } else {
                    const msg = document.getElementById('main-message');
                    if (msg) {
                        msg.textContent = res.wiadomosc;
                        msg.classList.add('alert-red');
                        msg.classList.remove('alert-info', 'alert-orange');
                        msg.classList.remove('hidden');
                        setTimeout(() => { 
                            msg.textContent=''; 
                            msg.classList.add('hidden'); 
                        }, 2500);
                    }
                }
            }

        });
    }

    // Dodawanie nowego zadania (Admin)
    const addTaskForm = document.getElementById('add-task-form');
    const newTaskPointsInput = /** @type {HTMLInputElement|null} */ (document.getElementById('new-task-points'));
    const editTaskPointsInput = /** @type {HTMLInputElement|null} */ (document.getElementById('edit-task-points'));
    const goalInput = /** @type {HTMLInputElement|null} */ (document.getElementById('goal-input'));
    if (newTaskPointsInput) {
        newTaskPointsInput.addEventListener('input', () => {
            newTaskPointsInput.value = newTaskPointsInput.value.replace(/\D/g, '').slice(0, 4);
        });
    }
    if (editTaskPointsInput) {
        editTaskPointsInput.addEventListener('input', () => {
            editTaskPointsInput.value = editTaskPointsInput.value.replace(/\D/g, '').slice(0, 4);
        });
    }
    if (goalInput) {
        goalInput.addEventListener('input', () => {
            goalInput.value = goalInput.value.replace(/\D/g, '').slice(0, 6);
        });
    }
    if(addTaskForm) {
        addTaskForm.addEventListener('submit', async e => {
            e.preventDefault();
            const msgDiv = document.getElementById('task-add-message');
            const res = await apiCall('/dodaj-zadanie', 'POST', { 
                nazwa: (/** @type {HTMLInputElement|null} */ (document.getElementById('new-task-name')))?.value || '', 
                punkty: (/** @type {HTMLInputElement|null} */ (document.getElementById('new-task-points')))?.value || '' 
            });
            if(res.sukces) {
                if (msgDiv) {
                    msgDiv.textContent = tr('task_add.saved_message', 'Zadanie dodane!');
                    msgDiv.classList.add('alert-info');
                    msgDiv.classList.remove('alert-red', 'alert-orange');
                    msgDiv.style.color = "";
                    msgDiv.classList.remove('hidden');
                }
                if (addTaskForm instanceof HTMLFormElement) {
                    addTaskForm.reset();
                }
                window.globalTasks = res.zadania || [];
                if (msgDiv) {
                    setTimeout(() => { 
                        msgDiv.textContent = ''; 
                        msgDiv.classList.add('hidden');
                    }, 2000);
                }
            } else {
                if (msgDiv) {
                    msgDiv.textContent = res.wiadomosc;
                    msgDiv.classList.add('alert-red');
                    msgDiv.classList.remove('alert-info', 'alert-orange');
                    msgDiv.style.color = "";
                    msgDiv.classList.remove('hidden');
                }
            }
        });
    }

    // Edycja zadania (Admin)
    const editTaskForm = document.getElementById('edit-task-form');
    if(editTaskForm) {
        editTaskForm.addEventListener('submit', async e => {
            e.preventDefault();
            const id = (/** @type {HTMLInputElement|null} */ (document.getElementById('edit-task-id')))?.value || '';
            const msgDiv = document.getElementById('task-edit-message');
            const res = await apiCall(`/zadania/${id}`, 'PUT', {
                nazwa: (/** @type {HTMLInputElement|null} */ (document.getElementById('edit-task-name')))?.value || '',
                punkty: (/** @type {HTMLInputElement|null} */ (document.getElementById('edit-task-points')))?.value || ''
            });
            if(res.sukces) {
                if (msgDiv) {
                    msgDiv.textContent = tr('task_edit.saved_message', 'Zapisano zmiany!');
                    msgDiv.classList.add('alert-info');
                    msgDiv.classList.remove('alert-red', 'alert-orange');
                    msgDiv.style.color = "";
                    msgDiv.classList.remove('hidden');
                }
                window.globalTasks = res.zadania || [];
                setTimeout(window.pokazListeZadan, 1000);
            } else {
                if (msgDiv) {
                    msgDiv.textContent = res.wiadomosc;
                    msgDiv.classList.add('alert-red');
                    msgDiv.classList.remove('alert-info', 'alert-orange');
                    msgDiv.style.color = "";
                    msgDiv.classList.remove('hidden');
                }
            }
        });
    }

    // Wyszukiwarka (Eventy)
    const searchInput = /** @type {HTMLInputElement|null} */ (document.getElementById('task-search-input'));
    const dropdownList = document.getElementById('task-dropdown-list');
    if (searchInput && dropdownList) {
        searchInput.addEventListener('focus', () => window.filterTasks(searchInput.value));
        searchInput.addEventListener('input', (e) => {
            const target = /** @type {HTMLInputElement} */ (e.currentTarget);
            window.filterTasks(target.value);
        });
        document.addEventListener('click', (e) => {
            const target = /** @type {Node|null} */ (e.target);
            if (!target) return;
            if (!searchInput.contains(target) && !dropdownList.contains(target)) {
                dropdownList.classList.add('hidden-list');
            }
        });
    }

    // START APLIKACJI
    if (window.i18n && window.i18n.ready) {
        await window.i18n.ready;
    }

    if (window.pendingInviteCode) {
        window.pokazEkranZaproszenia(window.pendingInviteCode);
    } else if (window.token) {
        window.sprawdzDom();
    } else {
        openScreen('auth-screen');
    }


    // AUTOMATYCZNE ODŚWIEŻANIE (co 30 sekund)
    // public/script.js (Zastąp całą sekcję setInterval tym kodem)

// 8. AUTOMATYCZNE ODŚWIEŻANIE
// public/script.js - KOŃCÓWKA PLIKU

// ==========================================
// 8. AUTOMATYCZNE ODŚWIEŻANIE
// ==========================================

// Funkcja pomocnicza do odświeżania danych na aktywnym ekranie
async function refreshCurrentScreen() {
    if (!window.token) return;

    // A. Jeśli jesteśmy na ekranie głównym -> Odśwież Ranking i Cache Zadań
    const mainScreen = document.getElementById('main-screen');
    if (mainScreen && !mainScreen.classList.contains('hidden')) {
    // DOM dla celu
    const houseRes = await apiCall('/domy/moj-dom');
    if (houseRes.sukces && houseRes.dom) {
        window.currentGoal = houseRes.dom.cel_punktow || 0;
        window.currentWinner = houseRes.dom.zwyciezca_id
            ? { id: houseRes.dom.zwyciezca_id, login: houseRes.dom.zwyciezca_login }
            : null;
    }
    
    // Ranking + aktualizacja celu/zwycięzcy
    const rankRes = await apiCall('/ranking');
    if (rankRes.sukces) {
        if (window.renderRank) {
            window.renderRank(rankRes.ranking, window.currentGoal || 0);
        }
        if (window.updateGoalDisplay) {
            window.updateGoalDisplay(rankRes.ranking);
        }
    }
    
    // Zadania
    const taskRes = await apiCall('/zadania');
    if (taskRes.sukces) {
        window.globalTasks = taskRes.zadania;
    }
}

    // B. Jeśli jesteśmy na ekranie historii -> Odśwież Historię
    const historyScreen = document.getElementById('history-screen');
    if (historyScreen && !historyScreen.classList.contains('hidden')) {
        if (window.pokazHistorie) window.pokazHistorie();
    }

    // C. Jeśli jesteśmy na liście zadań (edycja) -> Odśwież Listę
    const taskListScreen = document.getElementById('task-list-screen');
    if (taskListScreen && !taskListScreen.classList.contains('hidden')) {
        if (window.pokazListeZadan) window.pokazListeZadan();
    }
    
    // D. Jeśli jesteśmy na liście domowników -> Odśwież Domowników
    const membersScreen = document.getElementById('manage-members-screen');
    if (membersScreen && !membersScreen.classList.contains('hidden')) {
        if (window.pokazZarzadzanieDomownikami) window.pokazZarzadzanieDomownikami();
    }
}

// public/script.js - SEKJA AUTOMATYCZNEGO ODŚWIEŻANIA

setInterval(async () => {
    // Działamy tylko gdy użytkownik jest zalogowany
    if (!window.token) return;

    // --- POPRAWKA: WYJĄTKI DLA EKRANÓW STARTOWYCH ---
    const noHouseScreen = document.getElementById('no-house-screen');
    const inviteScreen = document.getElementById('invite-screen'); // <--- NOWY WYJĄTEK

    // Jeśli użytkownik jest na ekranie wyboru LUB na ekranie zaproszenia,
    // to NIE sprawdzamy statusu (pozwalamy mu podjąć decyzję)
    const isNoHouseActive = noHouseScreen && !noHouseScreen.classList.contains('hidden');
    const isInviteActive = inviteScreen && !inviteScreen.classList.contains('hidden');

    if (isNoHouseActive || isInviteActive) {
        return; 
    }
    // ------------------------------------------------

    // II. KROK KRYTYCZNY: Sprawdź czy nas nie wyrzucono
    try {
        const res = await apiCall('/domy/moj-dom');
        
        if (res.sukces && res.dom === null) {
            console.log("Wykryto utratę domu. Przekierowanie...");
            window.currentHouseName = "Mój Dom";
            window.sprawdzDom();
            return; 
        }
    } catch (e) {
        console.error("Błąd weryfikacji statusu:", e);
    }

    // III. KROK STANDARDOWY: Odśwież dane widoku
    await refreshCurrentScreen();

}, 10000);



    
});



