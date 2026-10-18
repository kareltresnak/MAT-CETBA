/**
 * OMEGA ADMIN: Zero-Trust Gateway & Authentication
 * Vstupní brána do administrace, 5-klikový tajný trigger na patičce, Cloudflare Turnstile a RBAC.
 */

window.Omega = window.Omega || {};

/**
 * Přepne zobrazení z veřejného webu na administrační portál a aplikuje oprávnění (RBAC)
 * @param {string} userRole - Role uživatele ('ucitel', 'vedouci', 'omega')
 */
window.enterAdminUI = async function(userRole) {
    window.sessionCredentials.username = userRole;
    window.sessionCredentials = window.sessionCredentials;

    const appElements = ['.layout', 'header', '.mobile-nav', 'footer', '.brand', 'main', '#toast', '#omega-print-layer'];
    appElements.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => el.style.setProperty('display', 'none', 'important'));
    });
    
    document.body.style.setProperty('overflow-y', 'auto', 'important');
    document.body.style.setProperty('padding-bottom', '0', 'important');
    
    const authModal = document.getElementById('omega-auth-modal');
    if (authModal) authModal.style.display = 'none';

    const lockModal = document.getElementById('omega-lock-modal');
    if (lockModal) lockModal.style.display = 'none';

    const adminPortal = document.getElementById('omega-admin-portal');
    if (adminPortal) adminPortal.style.display = 'block';
    
    const currentTheme = localStorage.getItem('omega_theme') || 'default';
    history.pushState({ page: 'admin_active' }, "Administrace OMEGA", window.location.pathname + "?theme=" + currentTheme);
    
    setTimeout(() => {
        if (typeof window.initAuthorAutocomplete === 'function') window.initAuthorAutocomplete();
        if (typeof window.initAdminVirtualDb === 'function') window.initAdminVirtualDb(); 
        
        const activeUser = (window.sessionCredentials.username || "").toLowerCase();

        // Zobrazení prvků pro Vedoucího a Omegu
        const inboxBtn = document.getElementById('btn-admin-inbox');
        const starredBtn = document.getElementById('btn-admin-starred');
        const masterBtn = document.getElementById('btn-master-admin');
        if (activeUser === 'vedouci' || activeUser === 'omega') {
            if (inboxBtn) inboxBtn.style.display = 'block';
            if (starredBtn) starredBtn.style.display = 'block';
            if (masterBtn) masterBtn.style.display = 'block';
        }

        if (activeUser === 'omega') {
            const changelogTab = document.getElementById('tab-changelog');
            if (changelogTab) changelogTab.style.display = 'block'; 
        }

        // RBAC: Izolace akčních tlačítek dle role
        const btnInbox = document.getElementById('btn-action-inbox');
        const gridL2Top = document.getElementById('grid-action-l2-top');
        const btnCommitL2 = document.getElementById('btn-commit-l2');
        
        const recoveryHeaders = Array.from(document.querySelectorAll('#omega-admin-portal h3'));
        const recoveryH = recoveryHeaders.find(h => h.textContent.includes('Obnova ze zálohy'));
        const recoveryDiv = recoveryH ? recoveryH.parentElement : null;

        if (activeUser !== 'omega' && activeUser !== 'vedouci') {
            if (btnInbox) btnInbox.style.display = 'block';
            if (gridL2Top) gridL2Top.style.display = 'none';
            if (btnCommitL2) btnCommitL2.style.display = 'none';
            if (recoveryDiv) recoveryDiv.style.display = 'none';
        } else if (activeUser === 'vedouci') {
            if (btnInbox) btnInbox.style.display = 'none';
            if (gridL2Top) gridL2Top.style.display = 'block';
            if (btnCommitL2) btnCommitL2.style.display = 'block';
            if (recoveryDiv) recoveryDiv.style.display = 'none'; 
        } else if (activeUser === 'omega') {
            if (btnInbox) btnInbox.style.display = 'none';
            if (gridL2Top) gridL2Top.style.display = 'block';
            if (btnCommitL2) btnCommitL2.style.display = 'block';
            if (recoveryDiv) recoveryDiv.style.display = 'block';
        }

        if (typeof window.startIdleTimer === 'function') window.startIdleTimer();
        
        // Smart Sync Polling (každých 60s)
        if (typeof window.checkSystemStatus === 'function') {
            window.checkSystemStatus(); 
            if (window.statusPollingTimer) clearInterval(window.statusPollingTimer);
            window.statusPollingTimer = setInterval(window.checkSystemStatus, 60000);
        }
        
        if (typeof window.loadOmegaProfile === 'function') {
            window.loadOmegaProfile();
        }

        // Automatické zobrazení nápovědy pro administraci po přihlášení (pokud není potlačeno)
        if (typeof window.checkAdminManualAutoOpen === 'function') {
            window.checkAdminManualAutoOpen();
        }
    }, 50);
};

// Turnstile Callbacks pro přihlášení
window.turnstileSuccessAuth = function(token) {
    const statusEl = document.getElementById('ts-status-auth');
    if (statusEl) {
        statusEl.innerHTML = "✅ Pásmo zajištěno";
        statusEl.style.color = "var(--accent-green, #22c55e)";
    }
};

window.turnstileExpiredAuth = function() {
    const statusEl = document.getElementById('ts-status-auth');
    if (statusEl) {
        statusEl.innerHTML = "⚠️ Kryptografický klíč vypršel. Obnovuji...";
        statusEl.style.color = "var(--accent-red, #da2128)";
    }
};

// Turnstile Callbacks pro export
window.turnstileSuccessExport = function(token) {
    const statusEl = document.getElementById('ts-status-export');
    if (statusEl) {
        statusEl.innerHTML = "✅ Podpis připraven. Můžete bezpečně zapsat data.";
        statusEl.style.color = "var(--accent-green, #22c55e)";
    }
};

window.turnstileExpiredExport = function() {
    const statusEl = document.getElementById('ts-status-export');
    if (statusEl) {
        statusEl.innerHTML = "⚠️ Platnost podpisu vypršela. Obnovuji...";
        statusEl.style.color = "var(--accent-red, #da2128)";
    }
};

/**
 * Inicializuje přihlašovací bránu a stealth 5-klikový spouštěč
 */
window.initAdminAuth = function() {
    // 1. Stealth 5-klik na verzi v patičce
    const buildNode = document.getElementById('app-build-info');
    if (buildNode) {
        let interactionCount = 0;
        let interactionTimer = null;

        buildNode.addEventListener('click', () => {
            interactionCount++;
            buildNode.style.opacity = "0.7";
            setTimeout(() => buildNode.style.opacity = "1", 100);
            clearTimeout(interactionTimer);

            if (interactionCount >= 5) {
                interactionCount = 0;
                
                const authModal = document.getElementById('omega-auth-modal');
                const pwdInput = document.getElementById('admin-password-input');
                const errorMsg = document.getElementById('auth-error-msg');
                
                if (authModal) {
                    if (pwdInput) pwdInput.value = '';
                    if (errorMsg) errorMsg.style.display = 'none';
                    
                    authModal.style.display = 'flex';
                    setTimeout(() => { 
                        const userInput = document.getElementById('admin-username-input');
                        if (userInput) userInput.focus(); 
                    }, 100);
                }
            }

            interactionTimer = setTimeout(() => {
                interactionCount = 0;
            }, 1500);
        });
    }

    // 2. Přihlašovací dialog
    const btnAuthSubmit = document.getElementById('btn-auth-submit');
    const btnAuthCancel = document.getElementById('btn-auth-cancel');
    const userNode = document.getElementById('admin-username-input');
    const passwordInputNode = document.getElementById('admin-password-input');
    const authErrorMsgNode = document.getElementById('auth-error-msg');

    if (btnAuthSubmit) {
        btnAuthSubmit.addEventListener('click', async () => {
            const user = userNode ? userNode.value.trim() : '';
            const pwd = passwordInputNode ? passwordInputNode.value.trim() : '';

            if (!pwd || !user) {
                if (authErrorMsgNode) {
                    authErrorMsgNode.innerText = "Zadejte platné přihlašovací údaje.";
                    authErrorMsgNode.style.display = "block";
                }
                return;
            }

            const tsInput = document.querySelector('#omega-auth-ts [name="cf-turnstile-response"]');
            const tsToken = tsInput ? tsInput.value : null;

            if (!tsToken) {
                if (authErrorMsgNode) {
                    authErrorMsgNode.innerText = "Vyčkejte na ověření ochrany proti botům.";
                    authErrorMsgNode.style.display = "block";
                }
                return;
            }

            btnAuthSubmit.disabled = true;
            btnAuthSubmit.innerText = "Ověřuji...";
            if (authErrorMsgNode) authErrorMsgNode.style.display = "none";

            try {
                const response = await fetch(window.OMEGA_ADMIN_CONFIG.WORKER_URL + "/login", {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json", 
                        "X-Omega-Device-Id": window.getDeviceIdentity() 
                    },
                    body: JSON.stringify({ username: user, password: pwd })
                });

                if (response.status === 401 || response.status === 429) {
                    const errData = await response.json();
                    throw new Error(errData.error || "Neplatné přihlašovací údaje.");
                }

                if (!response.ok) throw new Error("Chyba při komunikaci se serverem.");
                
                const data = await response.json();
                
                sessionStorage.setItem('omega_session_token', data.token);
                sessionStorage.setItem('omega_active_user', data.role);

                window.enterAdminUI(data.role);

            } catch (err) {
                if (authErrorMsgNode) {
                    authErrorMsgNode.innerText = err.message;
                    authErrorMsgNode.style.display = "block";
                }
                
                if (typeof turnstile !== 'undefined') {
                    try { turnstile.reset('#omega-auth-ts'); } catch(e) {}
                }
            } finally {
                btnAuthSubmit.disabled = false;
                btnAuthSubmit.innerText = "Vstoupit";
            }
        });
    }

    if (passwordInputNode && btnAuthSubmit) {
        passwordInputNode.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') btnAuthSubmit.click();
        });
    }

    if (btnAuthCancel) {
        btnAuthCancel.addEventListener('click', () => {
            const authModal = document.getElementById('omega-auth-modal');
            if (authModal) authModal.style.display = 'none';
            if (passwordInputNode) passwordInputNode.value = '';
            if (userNode) userNode.value = '';
            if (authErrorMsgNode) authErrorMsgNode.style.display = "none";
        });
    }
};

/**
 * Zavře modál konfliktu při zápisu
 */
window.closeWriteConflictModal = function() {
    const modal = document.getElementById('omega-write-conflict-modal');
    if (modal) modal.style.display = 'none';
};

/**
 * Uloží rozpracované úpravy do Cloud Stash na 4místný PIN a zavře konflikt
 */
window.stashAndReloadFromConflict = async function() {
    window.closeWriteConflictModal();
    if (typeof window.stashCurrentWork === 'function') {
        await window.stashCurrentWork();
    }
};

/**
 * Zahodí lokální neuložené změny a načte čerstvou produkční databázi
 */
window.forceReloadProductionDb = function() {
    window.closeWriteConflictModal();
    window.OMEGA_SAFE_EXIT = true;
    window.location.reload();
};

window.Omega.adminAuth = {
    enterAdminUI: window.enterAdminUI,
    init: window.initAdminAuth,
    closeWriteConflictModal: window.closeWriteConflictModal,
    stashAndReloadFromConflict: window.stashAndReloadFromConflict,
    forceReloadProductionDb: window.forceReloadProductionDb
};
