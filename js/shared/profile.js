/**
 * OMEGA SHARED: Profile Management & Session Authentication
 * Správa e-mailového profilu pro notifikace a bezpečné odhlášení.
 */

window.Omega = window.Omega || {};

/**
 * Získá data aktuálně přihlášeného uživatele z relace
 * @returns {object|null}
 */
window.getOmegaAuth = function() {
    const user = sessionStorage.getItem('omega_active_user');
    const token = sessionStorage.getItem('omega_session_token');
    if (user && token) return { username: user };
    return null;
};

/**
 * Uloží nastavení profilu (e-mail a notifikace) na Cloudflare Worker
 */
window.saveOmegaProfile = async function() {
    const auth = window.getOmegaAuth();
    if (!auth) return window.showToast("⚠️ Relace vypršela. Obnovte stránku a přihlaste se znovu.");

    const emailInput = document.getElementById('profile-email-input');
    const toggleInput = document.getElementById('profile-email-toggle');
    const email = emailInput ? emailInput.value.trim() : "";
    const enabled = toggleInput ? toggleInput.checked : false;

    if (enabled && !email.includes('@')) return window.showToast("⚠️ Zadejte platný e-mail.");

    window.showToast("⏳ Ukládám profil...");
    try {
        const res = await fetch(window.OMEGA_ADMIN_CONFIG.WORKER_URL + "/profile/save", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "X-Omega-Device-Id": window.getDeviceIdentity() 
            },
            body: JSON.stringify({ 
                profile: { email, notifications: enabled }
            })
        });
        if (!res.ok) throw new Error("Chyba serveru");
        window.showToast("✅ Nastavení profilu uloženo.");
        const modal = document.getElementById('omega-profile-modal');
        if (modal) modal.style.display = 'none';
    } catch (e) { 
        window.showToast("❌ Nepodařilo se uložit profil."); 
    }
};

/**
 * Načte uložený profil uživatele ze serveru a předvyplní formulář
 */
window.loadOmegaProfile = async function() {
    const auth = window.getOmegaAuth();
    if (!auth) return;

    try {
        const res = await fetch(window.OMEGA_ADMIN_CONFIG.WORKER_URL + "/profile/get", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "X-Omega-Device-Id": window.getDeviceIdentity() 
            },
            body: JSON.stringify({})
        });
        const data = await res.json();
        if (data.profile) {
            const emailInput = document.getElementById('profile-email-input');
            const toggleInput = document.getElementById('profile-email-toggle');
            if (emailInput) emailInput.value = data.profile.email || "";
            if (toggleInput) toggleInput.checked = data.profile.notifications || false;
        }
    } catch (e) { 
        console.warn("Nepodařilo se načíst profil", e); 
    }
};

/**
 * Bezpečně odhlásí administrátora a zničí relaci
 */
window.logoutOmega = function() {
    try {
        fetch(window.OMEGA_ADMIN_CONFIG.WORKER_URL + "/logout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Omega-Device-Id": window.getDeviceIdentity()
            }
        }).catch(() => {});
    } catch (e) {}

    sessionStorage.removeItem('omega_session_token');
    sessionStorage.removeItem('omega_active_user');
    
    if (typeof sessionCredentials !== 'undefined' && sessionCredentials) {
        sessionCredentials.username = ""; 
    }
    window.sessionCredentials = null;
    
    window.showToast("🔒 Bezpečně odhlášeno. Propustka zničena.");
    setTimeout(() => { window.location.reload(); }, 1000);
};

window.Omega.profile = {
    getAuth: window.getOmegaAuth,
    saveProfile: window.saveOmegaProfile,
    loadProfile: window.loadOmegaProfile,
    logout: window.logoutOmega
};
