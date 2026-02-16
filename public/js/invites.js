// @ts-check
// public/js/invites.js

// Pokazuje ekran z informacją o zaproszeniu po pobraniu danych z API
// public/js/invites.js
/**
 * @param {string} key
 * @param {string} fallback
 * @param {Record<string, string|number>=} params
 * @returns {string}
 */
const inviteT = (key, fallback, params) => (window.i18n ? window.i18n.t(key, params) : fallback);

/**
 * @param {string} kod
 */
window.pokazEkranZaproszenia = async function(kod) {
    window.hideAll();
    
    const promises = [
        fetch(`/api/domy/zaproszenie/${kod}`).then(r => r.json())
    ];
    
    if (window.token) {
        promises.push(apiCall('/domy/moj-dom'));
    }

    const [inviteRes, userHouseRes] = await Promise.all(promises);

    if(inviteRes.sukces) {
        const screen = document.getElementById('invite-screen');
        if (screen) screen.classList.remove('hidden');
        
        const houseNameEl = document.getElementById('invite-house-name');
        const ownerEl = document.getElementById('invite-owner');
        if (houseNameEl) houseNameEl.textContent = inviteRes.nazwa;
        if (ownerEl) ownerEl.textContent = inviteRes.wlasciciel;

        // Pobieramy przyciski akcji, żeby móc je ukryć/zablokować
        const joinBtn = document.getElementById('confirm-join-btn'); // Dodaj to ID w HTML jeśli nie ma (przycisk "Dołączam!")
        // W Twoim HTML przycisk "Dołączam!" miał id="confirm-join-btn" w jednym z listingów, sprawdź to.

        const warningDiv = document.getElementById('invite-warning');
        
        // Resetujemy stan UI (ukrywamy ostrzeżenie, pokazujemy przycisk)
        if (warningDiv) warningDiv.classList.add('hidden');
        if (joinBtn) joinBtn.classList.remove('hidden');

        // Konflikt domów
        if (userHouseRes && userHouseRes.sukces && userHouseRes.dom) {
            
            // LOGIKA DLA WŁAŚCICIELA
            if (userHouseRes.is_owner) {
                if (warningDiv) {
                    warningDiv.textContent = inviteT(
                        'invites.owner_blocked_warning',
                        `Jesteś założycielem domu "${userHouseRes.dom.nazwa}". Aby dołączyć do innego domu, najpierw usuń swój obecny dom w sekcji Ustawienia.`,
                        { houseName: userHouseRes.dom.nazwa }
                    );
                    warningDiv.classList.remove('hidden');
                    warningDiv.style.color = "#dc3545"; // Czerwony dla błędu krytycznego
                    warningDiv.style.borderColor = "#dc3545";
                }
                
                // Blokujemy możliwość dołączenia
                if (joinBtn) joinBtn.classList.add('hidden');
                
            } else {
                // LOGIKA DLA ZWYKŁEGO DOMOWNIKA (bez zmian)
                if (warningDiv) {
                    warningDiv.textContent = inviteT(
                        'invites.member_warning',
                        `Uwaga: Jesteś już w domu "${userHouseRes.dom.nazwa}". Dołączenie do nowego domu spowoduje opuszczenie obecnego domu i wyzerowanie punktów.`,
                        { houseName: userHouseRes.dom.nazwa }
                    );
                    warningDiv.classList.remove('hidden');
                    // Reset stylu (jeśli był zmieniony dla admina)
                    warningDiv.style.color = ""; 
                    warningDiv.style.borderColor = "";
                }
            }
        }

    } else {
        await window.showModal({
            title: inviteT('invites.screen_title', '💌 Zaproszenie'),
            body: inviteT('invites.invalid_code', 'Błędny kod zaproszenia.'),
            okText: 'OK'
        });
        window.location.href = "/";
    }
}



// Akcja po kliknięciu "Dołączam!" na ekranie zaproszenia
window.potwierdzDolaczenie = async function() {
    // Sprawdzamy czy użytkownik jest zalogowany (window.token ze state.js)
    if(!window.token) {
        const msg = document.getElementById('invite-message');
        if (msg) {
            msg.textContent = inviteT('invites.login_required', 'Najpierw się zaloguj lub zarejestruj.');
            msg.classList.add('alert-info');
            msg.classList.remove('alert-red', 'alert-orange');
            msg.classList.remove('hidden');
            setTimeout(() => {
                msg.textContent = '';
                msg.classList.add('hidden');
            }, 2500);
        }
        
        // Przekierowujemy do logowania po krótkim opóźnieniu
        setTimeout(() => {
            window.pokazLogowanie(); // z ui.js
            window.openScreen('auth-screen'); // z ui.js
        }, 3000);
        
        // Zapisujemy kod, żeby po zalogowaniu automatycznie dołączyć
        // window.pendingInviteCode jest w state.js (tylko do odczytu przy starcie),
        // ale zapisujemy go w LocalStorage, bo po refreshu zmienna zniknie.
        // pendingInviteCode w script.js był używany przy starcie.
        if (window.pendingInviteCode) {
            localStorage.setItem('pendingInvite', window.pendingInviteCode);
        }
        return;
    }

     try {
        const checkRes = await apiCall('/domy/moj-dom');
    
    if (checkRes.sukces && checkRes.dom) {
            const potwierdzenie = await window.showModal({
                title: inviteT('invites.already_in_house_title', 'Masz już dom'),
                body: inviteT(
                    'invites.already_in_house_body',
                    `Jesteś już członkiem domu "<b>${checkRes.dom.nazwa}</b>".<br>` +
                    `Musisz go opuścić, aby dołączyć do nowego.<br><br>` +
                    `Czy chcesz teraz opuścić obecny dom i dołączyć do nowego?<br><br>` +
                    `UWAGA! Dołączenie do nowego domu lub ponowne dołączenie usuwa wszystkie punkty!`,
                    { houseName: checkRes.dom.nazwa }
                ),
                type: 'confirm',
                okText: inviteT('invites.confirm_join', 'Dołącz'),
                cancelText: inviteT('invites.cancel_button', 'Anuluj')
            });

            if (!potwierdzenie) return;

            // Użytkownik chce zamienić dom -> najpierw opuszczamy stary
            const leaveRes = await apiCall('/domy/opusc', 'POST');
            if (!leaveRes.sukces) {
                await window.showModal({
                    title: inviteT('invites.already_in_house_title', 'Masz już dom'),
                    body: inviteT(
                        'invites.leave_house_failed',
                        `Nie udało się opuścić obecnego domu: ${leaveRes.wiadomosc || ''}`,
                        { reason: leaveRes.wiadomosc || '' }
                    ),
                    okText: 'OK'
                });
                return;
            }
        }
    } catch (e) {
        console.error("Błąd sprawdzania domu:", e);
        // Kontynuujemy, najwyżej serwer zwróci błąd przy dołączaniu
    }

    // 3. Dołączamy do nowego domu (tu już jesteśmy czyści)
    const res = await apiCall('/domy/dolacz', 'POST', { kod: window.pendingInviteCode });
    
    if(res.sukces) {
        window.location.href = "/";
    } else {
        await window.showModal({
            title: inviteT('invites.screen_title', '💌 Zaproszenie'),
            body: res.wiadomosc || inviteT('invites.join_failed', 'Nie udało się dołączyć do domu.'),
            okText: 'OK'
        });
    }
}


// Akcja po kliknięciu "Anuluj"
window.anulujZaproszenie = function() {
    window.location.href = "/";
}

console.log("✅ Moduł zaproszeń załadowany");
