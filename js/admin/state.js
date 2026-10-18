/**
 * OMEGA ADMIN: State & Egress Protocol
 * Virtuální paměťová databáze administrace (Shadow DOM), správa relace a detekce neuložených změn (Egress).
 */

window.Omega = window.Omega || {};

// Lokální paměťová databáze pro úpravy v editoru
window.adminVirtualDb = [];
window.sessionCredentials = { username: "", password: "" };
window.pendingExportPayload = null;
window.isSafeToExit = true;

// Globální propustka pro potlačení nativního varovného dialogu prohlížeče
window.OMEGA_SAFE_EXIT = false;
window.OMEGA_STAGING_SAVED = false;

/**
 * Zkontroluje, zda administrátor provedl změny, které ještě nebyly uloženy do produkce ani stagingu
 * @returns {boolean}
 */
window.checkForUnsavedChanges = function() {
    if (window.OMEGA_STAGING_SAVED) return false;
    if (!window.adminVirtualDb || window.adminVirtualDb.length === 0) return false;
    return window.adminVirtualDb.some(k => k._isAdded || k._isDeleted || (k._isEdited && !k._isDeleted));
};

/**
 * Pokus o opuštění administrace s kontrolou neuložených změn
 */
window.attemptAdminExit = async function() {
    if (!window.checkForUnsavedChanges()) {
        window.OMEGA_SAFE_EXIT = true; 
        if (window.statusPollingTimer) clearInterval(window.statusPollingTimer);
        
        const currentTheme = localStorage.getItem('omega_theme') || 'default';
        window.location.href = window.location.pathname + "?theme=" + currentTheme;
    } else {
        const exitModal = document.getElementById('omega-exit-modal');
        if (exitModal) exitModal.style.display = 'flex';
    }
};

/**
 * Potvrzený odchod z administrace (zahození neuložených změn)
 */
window.confirmAdminExit = async function() {
    window.OMEGA_SAFE_EXIT = true; 
    if (window.statusPollingTimer) clearInterval(window.statusPollingTimer);
    
    const currentTheme = localStorage.getItem('omega_theme') || 'default';
    window.location.href = window.location.pathname + "?theme=" + currentTheme;
};

/**
 * Zavře modál výzvy k opuštění administrace
 */
window.closeExitModal = function() {
    const exitModal = document.getElementById('omega-exit-modal');
    if (exitModal) exitModal.style.display = 'none';
};

// Ochrana před nechtěným obnovením nebo zavřením záložky
window.addEventListener('beforeunload', (event) => {
    if (window.OMEGA_SAFE_EXIT) return undefined;

    if (window.checkForUnsavedChanges()) {
        event.preventDefault();
        event.returnValue = '';
        return '';
    }
});

// Ochrana proti tlačítku "Zpět" v historii prohlížeče
window.addEventListener('popstate', () => {
    if (window.checkForUnsavedChanges() && !window.OMEGA_SAFE_EXIT) {
        history.pushState(null, document.title, window.location.href);
        const exitModal = document.getElementById('omega-exit-modal');
        if (exitModal) exitModal.style.display = 'flex';
    }
});

window.Omega.adminState = {
    checkForUnsavedChanges: window.checkForUnsavedChanges,
    attemptAdminExit: window.attemptAdminExit,
    confirmAdminExit: window.confirmAdminExit,
    closeExitModal: window.closeExitModal
};
