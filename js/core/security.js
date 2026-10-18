/**
 * OMEGA CORE: Security Layer
 * XSS Sanitization a kryptografický generátor identity zařízení (Device Fingerprint).
 */

window.Omega = window.Omega || {};

/**
 * Bezpečnostní vrstva (XSS ochrana): Sanitizuje nebezpečné HTML znaky
 * @param {string} str - Vstupní řetězec
 * @returns {string} Sanitizovaný řetězec bezpečný pro vložení do DOMu
 */
window.sanitize = function(str) {
    if (!str) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        "/": '&#x2F;'
    };
    const reg = /[&<>"'/]/ig;
    return String(str).replace(reg, (match) => (map[match]));
};

/**
 * ZERO-TRUST: Generátor kryptografické identity (NAT BYPASS)
 * Vytváří 256-bitovou entropii pro unikátní identifikaci zařízení bez nutnosti cookie sessions.
 * @returns {string} Hexadecimální otisk identity zařízení
 */
window.getDeviceIdentity = function() {
    let deviceId = localStorage.getItem('omega_device_id');
    
    // Pokud zařízení ještě nemá identitu, vytvoříme náhodný kryptografický vektor
    if (!deviceId) {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        deviceId = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        localStorage.setItem('omega_device_id', deviceId);
    }
    return deviceId;
};

// Export do jmenného prostoru Omega
window.Omega.security = {
    sanitize: window.sanitize,
    getDeviceIdentity: window.getDeviceIdentity
};
