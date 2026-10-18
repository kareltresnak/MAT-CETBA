/**
 * OMEGA SHARED: Governance & System Status Polling
 * Smart polling pro kontrolu nových produkčních sestavení, vyčištění Service Worker cache
 * a příjem notifikací pro vedoucího a učitele.
 */

window.Omega = window.Omega || {};

/**
 * Zkontroluje stav systému na Cloudflare Edge a vyvolá invalidaci cache při detekci nové verze
 */
window.checkSystemStatus = async function() {
    // Šetření limitů: Neodesílat dotaz, pokud je okno minimalizované nebo skryté
    if (document.hidden) return; 

    const token = sessionStorage.getItem('omega_session_token');
    if (!token) return;

    try {
        const res = await fetch(window.OMEGA_ADMIN_CONFIG.WORKER_URL + '/sync', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({})
        });
        
        if (!res.ok) return;
        const data = await res.json();

        // CACHE PURGE: Okamžitá invalidace cache při zjištění nového buildu na produkci
        if (data.latestBuild && data.latestBuild > window.OMEGA_APP_BOOT_TIME) {
            console.warn("Detekována nová produkční verze. Kontroluji rozpracované změny...");
            
            // Pokud má administrátor rozpracované úpravy v databázi, neprovádíme reload, ale zobrazíme modál konfliktu
            if (typeof window.checkForUnsavedChanges === 'function' && window.checkForUnsavedChanges()) {
                const conflictModal = document.getElementById('omega-write-conflict-modal');
                if (conflictModal) conflictModal.style.display = 'flex';
                return;
            }

            // 1. Vymazání paměti Service Workeru
            if ('caches' in window) {
                const names = await caches.keys();
                for (let name of names) {
                    await caches.delete(name);
                }
            }
            
            // 2. Upozornění uživatele
            window.showToast("🚀 Byla nasazena nová verze! Aplikace se aktualizuje...", "success");
            
            // 3. Tvrdý refresh s Cache-Busterem (obejití CDN i lokální cache prohlížeče)
            setTimeout(() => {
                window.location.href = window.location.pathname + "?v=" + new Date().getTime();
            }, 2500);
            
            return;
        }

        // Zpracování počtu nepřečtených zpráv v poště pro vedoucího
        const inboxBadge = document.getElementById('omega-inbox-badge');
        if (inboxBadge) {
            inboxBadge.innerText = data.inboxCount || 0;
            inboxBadge.style.display = (data.inboxCount > 0) ? 'inline-block' : 'none';
        }

        // Zobrazení pop-up zpětné vazby pro řadového učitele (schválení/zamítnutí návrhu)
        if (data.feedback) {
            const isAccepted = data.feedback.status === 'accepted';
            window.showToast(
                `🔔 Notifikace: Váš návrh byl ${isAccepted ? 'schválen' : 'zamítnut'}.`, 
                isAccepted ? 'success' : 'error'
            );
        }

    } catch (e) {
        console.warn("Sync failed:", e.message);
    }
};

window.Omega.status = {
    checkSystemStatus: window.checkSystemStatus
};
