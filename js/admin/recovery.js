/**
 * MAT-ČETBA OMEGA - Disaster Recovery & Auto-Snapshot
 * Záchranný systém pro obnovu databáze ze zálohy a automatické vytváření snímků produkce
 */

(function(window) {
    'use strict';

    window.Omega = window.Omega || {};

    let pendingRecoveryPayload = null; // Buffer pro záložní data v RAM

    /**
     * Automatické stažení zálohy databáze na disk administrátora před kritickou změnou
     */
    const createAutoSnapshot = async () => {
        try {
            const res = await fetch('data-spspb.js');
            const content = await res.text();
            const dateStr = new Date().toISOString().slice(0, 10);
            const blob = new Blob([content], { type: "text/javascript" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `data-spspb-zaloha-${dateStr}.js`;
            link.click();
        } catch (e) {
            console.error("Auto-záloha selhala.", e);
        }
    };

    /**
     * Inicializace procesu Disaster Recovery načtením souboru
     */
    const executeDisasterRecovery = async function(event) {
        const file = event.target.files[0];
        if (!file) return;

        // 🛡️ OBRANA PROTI RAM OVERFLOW: Max 1 MB (Databáze má reálně cca 20 KB)
        if (file.size > 1048576) { 
            window.showToast("❌ Soubor je abnormálně velký. Operace zablokována.");
            event.target.value = '';
            return;
        }

        try {
            const text = await file.text();
            if (!text.includes('window.OMEGA_CONFIG')) {
                throw new Error("Soubor neobsahuje platnou OMEGA databázi.");
            }
            
            // Uložíme payload do RAM a otevřeme dvoufázový modál
            pendingRecoveryPayload = text;
            const recoveryModal = document.getElementById('omega-recovery-modal');
            const step1 = document.getElementById('recovery-step-1');
            const step2 = document.getElementById('recovery-step-2');
            
            if (recoveryModal) recoveryModal.style.display = 'flex';
            if (step1) step1.style.display = 'block';
            if (step2) step2.style.display = 'none';

        } catch (err) {
            window.showToast("❌ Chyba při čtení zálohy: " + err.message);
        }
        
        event.target.value = ''; // Reset file inputu
    };

    /**
     * Přechod na druhý krok potvrzení obnovy
     */
    const showRecoveryStep2 = function() {
        const step1 = document.getElementById('recovery-step-1');
        const step2 = document.getElementById('recovery-step-2');
        if (step1) step1.style.display = 'none';
        if (step2) step2.style.display = 'block';
    };

    /**
     * Zrušení obnovy a bezpečný výmaz bufferu v RAM
     */
    const closeRecoveryModal = function() {
        const recoveryModal = document.getElementById('omega-recovery-modal');
        if (recoveryModal) recoveryModal.style.display = 'none';
        pendingRecoveryPayload = null; // Bezpečnostní výmaz RAM
        window.showToast("ℹ️ Obnova ze zálohy byla zrušena.");
    };

    /**
     * Finální provedení obnovy odesláním na Cloudflare Edge uzel
     */
    const executeFinalRecovery = function() {
        // 1. 🛡️ ZERO-TRUST BARIÉRA: Získání tokenu z administračního uzlu
        const turnstileInput = document.querySelector('#omega-export-ts [name="cf-turnstile-response"]');
        const turnstileToken = turnstileInput ? turnstileInput.value : null;

        if (!turnstileToken) {
            window.showToast("⚠️ Bezpečnostní systém Edge ještě nevygeneroval podpis. Vyčkejte sekundu a zkuste to znovu.");
            return;
        }

        // 2. 💾 KOPIE DO BEZPEČÍ: Vytáhneme payload před destrukcí
        const payloadToPush = pendingRecoveryPayload;

        // 3. 🧹 LOKÁLNÍ ÚKLID: Zavřeme modál napřímo (bez vyvolání Toastu o zrušení)
        const recoveryModal = document.getElementById('omega-recovery-modal');
        if (recoveryModal) recoveryModal.style.display = 'none';
        pendingRecoveryPayload = null; // Bezpečnostní výmaz RAM
        
        // 4. 🚀 TRANSPORT: Odeslání plných dat + důkazu
        if (typeof window.pushToCloudflare === 'function') {
            window.pushToCloudflare(payloadToPush, turnstileToken);
        } else {
            window.showToast("❌ Chyba: Funkce pushToCloudflare není dostupná.");
        }
    };

    // Export do globálního kontextu pro inline handlery HTML
    window.createAutoSnapshot = createAutoSnapshot;
    window.executeDisasterRecovery = executeDisasterRecovery;
    window.showRecoveryStep2 = showRecoveryStep2;
    window.closeRecoveryModal = closeRecoveryModal;
    window.executeFinalRecovery = executeFinalRecovery;

    // Export do jmenného prostoru Omega
    window.Omega.createAutoSnapshot = createAutoSnapshot;
    window.Omega.executeDisasterRecovery = executeDisasterRecovery;
    window.Omega.showRecoveryStep2 = showRecoveryStep2;
    window.Omega.closeRecoveryModal = closeRecoveryModal;
    window.Omega.executeFinalRecovery = executeFinalRecovery;

})(window);
