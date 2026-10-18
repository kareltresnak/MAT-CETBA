/**
 * OMEGA STUDENT: Stateless Transfer & Preview Sandbox
 * Bezztrátové sdílení výběru knih přes komprimované URL parametry, generování QR kódů
 * a bezpečný náhled a import cizího výběru (Sandbox).
 */

window.Omega = window.Omega || {};

(function() {
    let currentShareUrl = "";

    /**
     * Vygeneruje unikátní odkaz a QR kód pro sdílení aktuálního výběru
     */
    window.generateShareLink = function() {
        if (window.state.selectedIds.size === 0) {
            window.showToast("⚠️ Vyberte alespoň jednu knihu pro sdílení.");
            return;
        }
        
        // Seřazení ID pro deterministické URL
        const ids = Array.from(window.state.selectedIds).sort((a, b) => a - b).join('-');
        const currentTheme = localStorage.getItem('omega_theme') || 'default';
        const baseUrl = window.location.origin + window.location.pathname;
        currentShareUrl = `${baseUrl}?theme=${currentTheme}&v=${window.DB_VERSION}&p=${ids}`;

        const modal = document.getElementById("share-modal");
        if (modal) modal.style.display = "flex";

        const qrBox = document.getElementById("qr-code-box");
        if (qrBox && typeof QRCode !== 'undefined') {
            qrBox.innerHTML = ""; 
            new QRCode(qrBox, {
                text: currentShareUrl,
                width: 400, 
                height: 400,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.M 
            });
        }

        window.trackOmegaEvent('Share_QR_Created', { books_count: window.state.selectedIds.size });
    };

    /**
     * Zavře modál sdílení
     */
    window.closeShareModal = function() {
        const modal = document.getElementById("share-modal");
        if (modal) modal.style.display = "none";
    };

    /**
     * Zkopíruje odkaz na sdílení do schránky
     */
    window.copyShareUrl = function() {
        navigator.clipboard.writeText(currentShareUrl).then(() => {
            window.showToast("✅ Odkaz zkopírován do schránky");
            window.trackOmegaEvent('Share_Link_Copied');
            window.closeShareModal();
        }).catch(err => {
            console.error("Schránka selhala: ", err);
            window.showToast("❌ Chyba při kopírování");
        });
    };

    /**
     * Stáhne vygenerovaný QR kód jako PNG obrázek s bílým okrajem
     */
    window.downloadQR = function() {
        const qrCanvas = document.querySelector("#qr-code-box canvas");
        if (!qrCanvas) {
            window.showToast("⚠️ QR kód se ještě nevygeneroval.");
            return;
        }
        
        const padding = 40; 
        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = qrCanvas.width + (padding * 2);
        exportCanvas.height = qrCanvas.height + (padding * 2);
        
        const ctx = exportCanvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        ctx.drawImage(qrCanvas, padding, padding);
        
        const imgData = exportCanvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = imgData;
        a.download = "maturita-vyber-qr.png";
        a.click();
        
        window.showToast("⬇️ Stahování zahájeno");
    };

    /**
     * Načte a analyzuje stav z parametrů v URL při otevření odkazu
     */
    window.loadStateFromURL = function() {
        const params = new URLSearchParams(window.location.search);
        const payload = params.get('p');
        const currentTheme = localStorage.getItem('omega_theme') || 'default';
        const incomingVersion = params.get('v');
        const knihaDb = window.getKnihyDb();
        
        if (!payload) return;

        window.trackOmegaEvent('Import_Loaded', { method: 'URL_Payload' });

        const ids = payload.split('-').map(Number);
        const validIds = ids.filter(id => knihaDb.some(k => k.id === id));
        
        if (validIds.length === 0) return;

        // Odstranění payloadu z adresního řádku (ponechá pouze téma)
        window.history.replaceState({}, document.title, window.location.pathname + "?theme=" + currentTheme);

        // Kontrola kompatibility odkazů se školním seznamem
        if (incomingVersion !== window.DB_VERSION) {
            const outdatedModal = document.getElementById('outdated-modal');
            if (outdatedModal) outdatedModal.style.display = 'flex';
            return;
        }

        // Výpočet nových děl vůči aktuálnímu výběru
        const newBooksCount = validIds.filter(id => !window.state.selectedIds.has(id)).length;
        
        if (newBooksCount === 0 && window.state.selectedIds.size === validIds.length) {
            setTimeout(() => window.showToast("ℹ️ Odkaz obsahuje identický seznam, jaký už máte."), 500);
            return;
        }

        window.showPreviewModal(validIds, newBooksCount);
    };

    /**
     * Zobrazí náhledový sandbox modál s importovanými díly
     * @param {Array<number>} importedIds - Pole načtených ID knih
     * @param {number} newCount - Počet děl, které student ještě nemá vybrané
     */
    window.showPreviewModal = function(importedIds, newCount) {
        const modal = document.getElementById("preview-modal");
        const metaEl = document.getElementById("preview-meta");
        const listEl = document.getElementById("preview-list");
        const validationEl = document.getElementById("preview-validation");
        const knihaDb = window.getKnihyDb();
        const requirements = window.getRequirements();

        const importedBooks = importedIds.map(id => knihaDb.find(k => k.id === id)).sort((a, b) => a.id - b.id);

        // Simulace platnosti načteného seznamu
        const stats = { do18: 0, "19": 0, svet20: 0, cz20: 0, lyrika: 0, epika: 0, drama: 0 };
        importedBooks.forEach(k => {
            if (k) {
                stats[k.obdobi]++;
                stats[k.druh]++;
            }
        });

        const isFullyValid = importedIds.length === 20 && 
                             stats.do18 >= requirements.do18 && stats["19"] >= requirements["19"] && 
                             stats.svet20 >= requirements.svet20 && stats.cz20 >= requirements.cz20 &&
                             stats.lyrika >= requirements.lyrika && stats.epika >= requirements.epika && stats.drama >= requirements.drama;

        let text = `Odkaz obsahuje <strong>${importedIds.length} děl</strong>`;
        if (window.state.selectedIds.size > 0) {
            text += ` (z toho ${newCount} děl ve vašem seznamu není).`;
        } else {
            text += ".";
        }
        if (metaEl) metaEl.innerHTML = text;

        if (validationEl) {
            if (isFullyValid) {
                validationEl.innerHTML = `<span style="background: rgba(34, 197, 94, 0.1); color: var(--accent-green); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--accent-green); font-size: 0.8rem; font-weight: bold;">✅ Seznam splňuje všechna maturitní kritéria</span>`;
            } else {
                validationEl.innerHTML = `<span style="background: rgba(239, 68, 68, 0.1); color: var(--accent-red); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--accent-red); font-size: 0.8rem; font-weight: bold;">⚠️ Odkaz NESPLŇUJE všechna kritéria</span>`;
            }
        }

        if (listEl) {
            listEl.innerHTML = importedBooks.map((k) => {
                if (!k) return '';
                const alreadyHave = window.state.selectedIds.has(k.id);
                return `<div style="padding: 6px 0; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: ${alreadyHave ? 'var(--text-muted)' : 'var(--text-main)'};">
                        <strong>${k.id}.</strong> ${window.sanitize(k.dilo)} <small style="opacity:0.7">(${window.sanitize(k.autor)})</small>
                    </span>
                    ${alreadyHave ? '<span style="font-size: 0.7rem; color: var(--accent-green);">Již máte</span>' : '<span style="font-size: 0.7rem; color: var(--accent-primary-light);">Nové</span>'}
                </div>`;
            }).join('');
        }

        if (modal) modal.style.display = "flex";

        // Akce: PŘEPSAT SEZNAM
        const btnReplace = document.getElementById("btn-import-replace");
        if (btnReplace) {
            btnReplace.onclick = () => {
                window.state.selectedIds.clear();
                importedIds.forEach(id => window.state.selectedIds.add(id));
                window.finalizeImport(`✅ Seznam přepsán. Načteno ${importedIds.length} děl.`);
            };
        }

        // Akce: DOPLNIT CHYBĚJÍCÍ (Sloučení)
        const btnMerge = document.getElementById("btn-import-merge");
        if (btnMerge) {
            btnMerge.onclick = () => {
                let addedCount = 0;
                let overflow = false;
                importedIds.forEach(id => {
                    if (window.state.selectedIds.size < 20) {
                        if (!window.state.selectedIds.has(id)) {
                            window.state.selectedIds.add(id);
                            addedCount++;
                        }
                    } else if (!window.state.selectedIds.has(id)) {
                        overflow = true;
                    }
                });
                
                let msg = `✅ Doplněno ${addedCount} nových děl.`;
                if (overflow) msg += " (Některá z odkazu přeskočena kvůli limitu 20).";
                if (addedCount === 0 && !overflow) msg = "ℹ️ Žádná nová díla nebyla přidána.";
                window.finalizeImport(msg);
            };
        }
    };

    /**
     * Dokončí import, uloží stav a překreslí aplikaci
     */
    window.finalizeImport = function(toastMsg) {
        window.saveState();
        window.renderTable();
        window.updateStatsAndSidebar();
        window.closePreviewModal();
        setTimeout(() => window.showToast(toastMsg), 300);
    };

    window.closePreviewModal = function() {
        const modal = document.getElementById("preview-modal");
        if (modal) modal.style.display = "none";
    };

    window.Omega.transfer = {
        generateShareLink: window.generateShareLink,
        closeShareModal: window.closeShareModal,
        copyShareUrl: window.copyShareUrl,
        downloadQR: window.downloadQR,
        loadStateFromURL: window.loadStateFromURL,
        showPreviewModal: window.showPreviewModal,
        closePreviewModal: window.closePreviewModal,
        finalizeImport: window.finalizeImport
    };
})();
