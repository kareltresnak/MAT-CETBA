/**
 * OMEGA CORE: Telemetry & Chronometry Engine
 * Analytika přes Umami a deterministický výpočet školních roků.
 */

window.Omega = window.Omega || {};

/**
 * Zaznamenání analytické události přes Umami
 * @param {string} eventName - Název sledované události
 * @param {object} eventData - Volitelná metadata události
 */
window.trackOmegaEvent = function(eventName, eventData = {}) {
    if (typeof umami !== 'undefined' && typeof umami.track === 'function') {
        umami.track(eventName, { version: window.OMEGA_VERSION || '10.0.0', ...eventData });
    }
};

/**
 * Deterministický výpočet aktuálního školního roku (vychází ze zářijového zlomu)
 * @returns {object} Objekt s formátovanými ročníky: { start, short1, short2, format }
 */
window.getOmegaChronology = function() {
    const now = new Date();
    const y = now.getFullYear();
    // Pokud je měsíc září (8) nebo později, začal nový školní rok y/y+1, jinak y-1/y
    const startYear = now.getMonth() >= 8 ? y : y - 1;
    return {
        start: startYear,
        short1: startYear.toString().slice(-2),
        short2: (startYear + 1).toString().slice(-2),
        format: `${startYear}/${startYear + 1}`
    };
};

// Export do jmenného prostoru Omega
window.Omega.telemetry = {
    track: window.trackOmegaEvent,
    getChronology: window.getOmegaChronology
};
