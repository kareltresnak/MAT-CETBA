/**
 * OMEGA CORE: Smart PWA Update & Install Engine
 * Životní cyklus Service Workeru, ochrana neuložené práce před nechtěným reloadem a instalace PWA.
 */

window.Omega = window.Omega || {};

(function() {
    let newWorker = null;
    let refreshing = false;
    let deferredPrompt = null;

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;

            // 1. Zjistíme, kde se uživatel nachází a zda má rozpracované změny
            const adminPortal = document.getElementById('omega-admin-portal');
            const isAdminActive = adminPortal && adminPortal.style.display === 'block';
            const hasChanges = typeof window.checkForUnsavedChanges === 'function' 
                ? window.checkForUnsavedChanges() 
                : false;

            // 2. Rozhodovací logika ochrany dat
            if (isAdminActive && hasChanges) {
                // Učitel upravuje data! Nesmíme stránku reloadnout, ukážeme varovný modál
                const modal = document.getElementById('update-warning-modal');
                if (modal) modal.style.display = 'flex';
            } else {
                // Student nebo administrátor bez rozpracovaných změn -> tichý hot-swap
                refreshing = true;
                window.location.reload();
            }
        });
    }

    /**
     * Vynutí bezpečný reload aplikace s povolením bypassu dialogu opuštění
     */
    window.executeSystemUpdate = function() {
        window.OMEGA_SAFE_EXIT = true;
        if (newWorker) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
        } else {
            window.location.reload();
        }
    };

    /**
     * Zobrazí modál s informací o nové aktualizaci jádra
     */
    window.showUpdateModal = function() {
        const updateModal = document.getElementById('omega-update-modal');
        if (updateModal) {
            updateModal.style.display = 'flex';
        } else {
            window.showToast("⚠️ Nová verze připravena k instalaci. Prosím obnovte stránku.");
        }
    };

    /**
     * Spustí instalaci nové verze ze zobrazeného modálu
     */
    window.executeOmegaUpdate = function() {
        window.showToast("🔄 Inicializuji aktualizační protokol...");
        if (newWorker) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
        } else {
            window.location.reload();
        }
    };

    /**
     * Zobrazí červené tlačítko a výstražný modál aktualizace
     */
    window.showUpdateUI = function() {
        const modal = document.getElementById('update-warning-modal');
        if (modal) modal.style.display = 'flex';

        const updateBtn = document.getElementById('btn-system-update');
        if (updateBtn) updateBtn.style.display = 'inline-block';
    };

    // Obsluha výzvy k instalaci PWA
    document.addEventListener('DOMContentLoaded', () => {
        const installBtn = document.getElementById('btn-pwa-install');

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            if (installBtn) installBtn.hidden = false;
        });

        if (installBtn) {
            installBtn.addEventListener('click', async () => {
                if (!deferredPrompt) return;
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    console.log('PWA: Aplikace byla nainstalována');
                }
                deferredPrompt = null;
                installBtn.hidden = true;
            });
        }

        window.addEventListener('appinstalled', () => {
            if (installBtn) installBtn.hidden = true;
        });
    });

    // Export do jmenného prostoru Omega
    window.Omega.pwa = {
        executeSystemUpdate: window.executeSystemUpdate,
        executeOmegaUpdate: window.executeOmegaUpdate,
        showUpdateModal: window.showUpdateModal,
        showUpdateUI: window.showUpdateUI
    };
})();
