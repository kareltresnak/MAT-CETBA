/**
 * OMEGA SHARED: Toast Notifications
 * Plovoucí notifikační zprávy pro uživatelskou odezvu.
 */

window.Omega = window.Omega || {};

/**
 * Zobrazí stylové plovoucí upozornění
 * @param {string} message - Text zprávy
 */
window.showToast = function(message) {
    let toast = document.getElementById("toast");
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    
    // Měkký design pro oba barevné režimy (povrchová barva + akcent)
    toast.style.cssText = "position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%); background: var(--bg-surface); color: var(--text-main); border: 1px solid var(--accent-primary); padding: 12px 25px; border-radius: 8px; font-weight: bold; z-index: 2147483647; box-shadow: 0 10px 30px rgba(0,0,0,0.5); opacity: 1; transition: opacity 0.3s ease; pointer-events: none; text-align: center; white-space: nowrap;";

    if (window._toastTimer) clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
};

window.Omega.toast = {
    show: window.showToast
};
