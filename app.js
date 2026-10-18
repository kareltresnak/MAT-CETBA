/**
 * =====================================================================
 * MAT-ČETBA OMEGA - Hlavní orchestrátor aplikace
 * =====================================================================
 * Centrální vstupní bod webové aplikace. Inicializuje a koordinuje jednotlivé 
 * subsystémy (student, filtry, vyhledávání, statistiky, tisk, administrace).
 */

(function(window) {
    'use strict';

    window.Omega = window.Omega || {};

    /**
     * Inicializuje posluchače událostí všech subsystémů
     */
    function initSubsystems() {
        // 1. Inicializace studentského formuláře a kvantové validace
        if (typeof window.initStudentForm === 'function') {
            window.initStudentForm();
        }

        // 2. Inicializace vyhledávání a klávesových zkratek tabulky
        if (typeof window.initTableEvents === 'function') {
            window.initTableEvents();
        }

        // 3. Inicializace filtrů, "Můj výběr" a mobilní navigace
        if (typeof window.initFiltersAndNavigation === 'function') {
            window.initFiltersAndNavigation();
        }

        // 4. Inicializace studentského PDF tisku
        if (typeof window.initStudentPrint === 'function') {
            window.initStudentPrint();
        }

        // 5. Inicializace resetovacích tlačítek a dialogu
        if (typeof window.initResetEvents === 'function') {
            window.initResetEvents();
        }

        // 6. Inicializace administrátorské autentizace a easter eggu
        if (typeof window.initAdminAuth === 'function') {
            window.initAdminAuth();
        }
    }

    /**
     * Spuštění aplikačního jádra Omega (Zero-Latency Engine)
     * - Načtení uloženého stavu ze Storage a parametrů z URL
     * - Autofokus vyhledávacího pole na zařízeních s myší
     * - Vykreslení veřejného katalogu a souhrnných statistik
     * - Kontrola bezpečnostních signálů relace (vypršení, incident)
     * - Zpracování deep linku do administrace (?admin=true)
     */
    window.initOmegaEngine = function() {
        if (typeof window.loadState === 'function') {
            window.loadState();
        }
        if (typeof window.loadStateFromURL === 'function') {
            window.loadStateFromURL();
        }
        
        // Autofokus na vyhledávací pole u desktopových zařízení
        if (window.matchMedia && window.matchMedia("(pointer: fine)").matches) {
            if (window.elements && window.elements.searchBox) {
                window.elements.searchBox.focus();
            }
        }
        
        // Vykreslení katalogu a kalkulace požadavků
        if (typeof window.renderTable === 'function') {
            window.renderTable();
        }
        if (typeof window.updateStatsAndSidebar === 'function') {
            window.updateStatsAndSidebar();
        }

        // Dynamická aktualizace copyrightu na aktuální kalendářní rok (vždy k 1. 1.)
        const copyrightYearEl = document.getElementById('omega-copyright-year');
        if (copyrightYearEl) {
            copyrightYearEl.textContent = new Date().getFullYear();
        }

        // Kontrola vypršení administrátorské relace
        if (sessionStorage.getItem('omega_session_expired') === 'true') {
            sessionStorage.removeItem('omega_session_expired'); 
            const timeoutModal = document.getElementById('omega-timeout-modal');
            if (timeoutModal) timeoutModal.style.display = 'flex';
        }

        // Detekce a hlášení ukončení relace kvůli souběžnému přihlášení z jiného zařízení
        if (sessionStorage.getItem('omega_session_terminated') === 'true') {
            sessionStorage.removeItem('omega_session_terminated');
            setTimeout(() => {
                if (typeof window.showToast === 'function') {
                    window.showToast("🛑 RELACE UKONČENA: Byli jste odhlášeni, protože se váš účet přihlásil na jiném zařízení.");
                }
            }, 500);
            const authModal = document.getElementById('omega-auth-modal');
            if (authModal) authModal.style.display = 'flex';
        }

        // Detekce a hlášení bezpečnostního incidentu / neplatné relace
        if (sessionStorage.getItem('omega_security_breach') === 'true') {
            sessionStorage.removeItem('omega_security_breach'); 
            setTimeout(() => {
                if (typeof window.showToast === 'function') {
                    window.showToast("🛑 BEZPEČNOSTNÍ INCIDENT: Relace neplatná. Přístup odepřen.");
                }
            }, 500);
            const authModal = document.getElementById('omega-auth-modal');
            if (authModal) authModal.style.display = 'flex';
        }

        // 🚀 OMEGA DEEP LINKING (Multi-Param Safe)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('admin') === 'true') {
            const authModal = document.getElementById('omega-auth-modal');
            if (authModal) {
                authModal.style.display = 'flex';
                setTimeout(() => { 
                    const userInput = document.getElementById('admin-username-input');
                    if (userInput) userInput.focus(); 
                }, 100);
            }
            
            // Chirurgické odstranění pouze parametru 'admin' se zachováním ostatních parametrů (např. theme=spspb)
            urlParams.delete('admin');
            const remainingQuery = urlParams.toString();
            const cleanUrl = window.location.pathname + (remainingQuery ? '?' + remainingQuery : '');
            window.history.replaceState({}, document.title, cleanUrl);
        }

        // Automatické zobrazení nápovědy pro studenty při otevření aplikace (pokud není potlačeno)
        if (typeof window.checkStudentManualAutoOpen === 'function') {
            window.checkStudentManualAutoOpen();
        }
    };

    /**
     * Start aplikace: Spuštění inicializace všech subsystémů a jádra
     */
    function bootstrap() {
        initSubsystems();
        window.initOmegaEngine();
    }

    // Bezpečný start aplikace: pokud se DOM ještě načítá, počkáme na DOMContentLoaded, jinak spustíme ihned
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

})(window);