/**
 * OMEGA SHARED: Browser Notification Engine
 * Dynamická manipulace s titulkem okna a vykreslení červeného notifikačního odznaku na favicon přes Canvas.
 */

window.Omega = window.Omega || {};

(function() {
    window.OMEGA_ORIGINAL_TITLE = document.title;
    window.OMEGA_ORIGINAL_FAVICON = document.querySelector("link[rel*='icon']")?.href || 'spspb-logo-2000px.png';
    window.OMEGA_IS_NOTIFYING = false;

    /**
     * Spustí vizuální upozornění v záložce prohlížeče (červená tečka na faviconu a změna titulku)
     * @param {string} message - Zpráva pro titulek záložky
     */
    window.triggerBrowserNotification = function(message = "Nová aktivita!") {
        if (window.OMEGA_IS_NOTIFYING || document.hasFocus()) return;
        
        window.OMEGA_IS_NOTIFYING = true;
        document.title = `🔴 ${message}`;
        
        // Generování Faviconu s červenou tečkou přes HTML5 Canvas
        const canvas = document.createElement('canvas');
        canvas.width = 32; 
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = window.OMEGA_ORIGINAL_FAVICON;
        
        img.onload = () => {
            ctx.drawImage(img, 0, 0, 32, 32);
            ctx.beginPath();
            ctx.arc(24, 8, 8, 0, 2 * Math.PI); // Červená tečka vpravo nahoře
            ctx.fillStyle = '#ef4444'; 
            ctx.fill();
            ctx.strokeStyle = '#0a0a0a'; // Tmavý kontrastní okraj
            ctx.lineWidth = 2;
            ctx.stroke();
            
            let link = document.querySelector("link[rel*='icon']");
            if (!link) { 
                link = document.createElement('link'); 
                link.rel = 'icon'; 
                document.head.appendChild(link); 
            }
            link.href = canvas.toDataURL("image/png");
        };
    };

    /**
     * Vrátí titulek záložky i ikonu do výchozího stavu
     */
    window.clearBrowserNotification = function() {
        if (!window.OMEGA_IS_NOTIFYING) return;
        window.OMEGA_IS_NOTIFYING = false;
        document.title = window.OMEGA_ORIGINAL_TITLE;
        let link = document.querySelector("link[rel*='icon']");
        if (link && window.OMEGA_ORIGINAL_FAVICON) {
            link.href = window.OMEGA_ORIGINAL_FAVICON;
        }
    };

    // Vyčištění upozornění při návratu uživatele do aplikace
    window.addEventListener('focus', window.clearBrowserNotification);
    window.addEventListener('click', window.clearBrowserNotification);

    window.Omega.notifications = {
        trigger: window.triggerBrowserNotification,
        clear: window.clearBrowserNotification
    };
})();
