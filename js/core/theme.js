/**
 * OMEGA CORE: Theme & Institutional Branding Engine
 * Správa institucionálního tématu (SPŠPB vs Default) a přepínání Dark/Light módu.
 */

window.Omega = window.Omega || {};

(function() {
    // 1. URL synchronizace: Parametr v adrese má přednost před lokální pamětí
    const urlInitParams = new URLSearchParams(window.location.search);
    const themeFromUrl = urlInitParams.get('theme');

    if (themeFromUrl) {
        localStorage.setItem('omega_theme', themeFromUrl);
    }

    const currentRozcestnik = localStorage.getItem('omega_theme') || 'default';

    // 2. Dynamická injekce loga SPŠPB do hlavičky (pouze v režimu spspb)
    if (currentRozcestnik === 'spspb') {
        const injectLogo = () => {
            const brandEl = document.querySelector('.brand');
            if (brandEl && !document.getElementById('brand-logo')) {
                brandEl.insertAdjacentHTML('afterbegin', `<img id="brand-logo" class="brand-logo" src="spspb-logo-2000px.png" alt="SPŠ Logo">`);
            }
        };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', injectLogo);
        } else {
            injectLogo();
        }
    }

    let isInitialThemeBoot = true;

    /**
     * Aplikuje světlý nebo tmavý režim na dokument a uloží preferenci
     * @param {string} theme - 'dark' nebo 'light'
     * @param {boolean} animate - Zda provést plynulý přechod
     */
    window.applyColorTheme = function(theme, animate = false) {
        const shouldAnimate = animate || !isInitialThemeBoot;
        if (shouldAnimate && document.documentElement) {
            document.documentElement.classList.add('theme-transitioning');
        }

        if (document.documentElement) {
            document.documentElement.setAttribute('data-theme', theme);
        }
        localStorage.setItem('omega_color_theme', theme);

        if (shouldAnimate && document.documentElement) {
            setTimeout(() => {
                document.documentElement.classList.remove('theme-transitioning');
            }, 450);
        }
    };

    // Inicializace barevného tématu: 1. LocalStorage -> 2. OS preference -> 3. Tmavý default
    const savedColorTheme = localStorage.getItem('omega_color_theme');
    const systemPrefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const initialTheme = savedColorTheme || (systemPrefersLight ? 'light' : 'dark');
    window.applyColorTheme(initialTheme, false);
    isInitialThemeBoot = false;

    // Navázání posluchačů na přepínače témat po načtení DOMu
    document.addEventListener('DOMContentLoaded', () => {
        const themeToggleBtns = document.querySelectorAll('.theme-switch');
        themeToggleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const current = document.documentElement.getAttribute('data-theme');
                const nextTheme = current === 'light' ? 'dark' : 'light';
                window.applyColorTheme(nextTheme, true);
                if (typeof window.trackOmegaEvent === 'function') {
                    window.trackOmegaEvent('Theme_Switched', { mode: nextTheme });
                }
            });
        });
    });

    // Export do jmenného prostoru Omega
    window.Omega.theme = {
        applyColorTheme: window.applyColorTheme,
        getActiveTheme: () => localStorage.getItem('omega_theme') || 'default'
    };
})();
