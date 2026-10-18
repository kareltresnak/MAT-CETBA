/**
 * OMEGA ADMIN: Hybrid Session Decay
 * Detekce neaktivity administrátora: HUD odpočet, převzetí obrazovky modálem a automatické odhlášení.
 */

window.Omega = window.Omega || {};

(function() {
    let adminIdleTime = 0;
    const ADMIN_IDLE_LIMIT = 300;       // 5 minut celkem
    const ADMIN_IDLE_HUD_START = 10;     // Od 10s se zobrazí malý HUD (4:50 do konce)
    const ADMIN_IDLE_MODAL_START = 240;  // Poslední minuta (bod zlomu: modál)

    let decayInterval = null;

    /**
     * Vynuluje časovač neaktivity a skryje HUD/modál
     */
    window.resetDecayTimer = function() {
        adminIdleTime = 0;
        const hud = document.getElementById('omega-idle-timer-small');
        const modal = document.getElementById('omega-session-modal');
        if (hud) hud.style.display = 'none';
        if (modal) modal.style.display = 'none';
    };

    /**
     * Zformátuje zbývající sekundy do tvaru MM:SS
     * @param {number} s - Počet sekund
     * @returns {string}
     */
    window.formatDecayTime = function(s) {
        return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
    };

    // Senzory uživatelské aktivity
    ['mousemove', 'keypress', 'click', 'touchstart'].forEach(ev => {
        window.addEventListener(ev, window.resetDecayTimer, { passive: true });
    });

    /**
     * Spustí časovací smyčku pro sledování neaktivity
     */
    window.startIdleTimer = function() {
        if (decayInterval) clearInterval(decayInterval);
        adminIdleTime = 0;

        decayInterval = setInterval(() => {
            const portal = document.getElementById('omega-admin-portal');
            if (portal && portal.style.display === 'block') {
                adminIdleTime++;
                const timeRemaining = ADMIN_IDLE_LIMIT - adminIdleTime;

                // Terminace sezení po vypršení limitu
                if (adminIdleTime >= ADMIN_IDLE_LIMIT) {
                    clearInterval(decayInterval);
                    window.isSafeToExit = true; 
                    sessionStorage.setItem('omega_session_expired', 'true');
                    window.location.href = window.location.pathname;
                    return;
                }

                const hud = document.getElementById('omega-idle-timer-small');
                const modal = document.getElementById('omega-session-modal');
                const hudVal = document.getElementById('idle-time-val-small');
                const modalVal = document.getElementById('session-timer-val');

                // ZÓNA 3: MODÁL (Poslední minuta: 01:00 - 00:00)
                if (adminIdleTime >= ADMIN_IDLE_MODAL_START) {
                    if (hud) hud.style.display = 'none';
                    if (modal) {
                        modal.style.display = 'flex';
                        if (modalVal) modalVal.textContent = window.formatDecayTime(timeRemaining);
                        
                        // Kritický vizuální puls (posledních 20s)
                        if (timeRemaining <= 20) {
                            if (modalVal) modalVal.style.color = '#da2128';
                            const card = document.getElementById('omega-session-card');
                            if (card) card.style.boxShadow = '0 0 30px rgba(218, 33, 40, 0.3)';
                        }
                    }
                } 
                // ZÓNA 2: HUD (Od 4:50 do 1:01)
                else if (adminIdleTime >= ADMIN_IDLE_HUD_START) {
                    if (modal) modal.style.display = 'none';
                    if (hud) {
                        hud.style.display = 'flex';
                        if (hudVal) hudVal.textContent = window.formatDecayTime(timeRemaining);
                    }
                }
            }
        }, 1000);
    };

    window.Omega.session = {
        resetDecayTimer: window.resetDecayTimer,
        startIdleTimer: window.startIdleTimer,
        formatDecayTime: window.formatDecayTime
    };
})();
