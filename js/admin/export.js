/**
 * OMEGA ADMIN: Export Engine & Cloudflare Transport
 * Kompilace databáze do finálního JS formátu, odesílání návrhů (Inbox), staging konceptů a ostrý zápis do produkce.
 */

window.Omega = window.Omega || {};

(function() {
    // Globální router tlačítek
    window.sendToInbox = () => window.prepareDatabaseExport('/draft/submit');
    window.commitToProduction = () => window.prepareDatabaseExport('/');

    /**
     * Tichý Staging Engine: Uloží rozpracovaný koncept na Cloudflare Worker
     */
    window.saveToStaging = async function() {
        window.showToast("⏳ Ukládám koncept na pozadí...");

        let newDb = []; 
        let counter = 1;
        window.adminVirtualDb.forEach(book => {
            if (!book._isDeleted) {
                let exportOrigId = book.origId || (book._original ? book._original.id : book.id);
                if (book._isAdded) exportOrigId = null;
                newDb.push({ 
                    id: counter++, 
                    origId: exportOrigId, 
                    dilo: window.sanitize(book.dilo), 
                    autor: window.sanitize(book.autor), 
                    druh: book.druh, 
                    obdobi: book.obdobi 
                });
            }
        });

        const formattedDbString = "[\n" + newDb.map(book => `{ "id": ${book.id}, "origId": ${book.origId}, "dilo": ${JSON.stringify(book.dilo)}, "autor": ${JSON.stringify(book.autor)}, "druh": "${book.druh}", "obdobi": "${book.obdobi}" }`).join(',\n') + "\n    ]";
        const finalPayload = `window.OMEGA_CONFIG = { ...window.OMEGA_CONFIG, KNIHY_DB: ${formattedDbString} };`;

        try {
            const res = await fetch(window.OMEGA_ADMIN_CONFIG.WORKER_URL + '/staging', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${sessionStorage.getItem('omega_session_token')}` 
                },
                body: JSON.stringify({ fileContent: finalPayload, action: 'save' })
            });
            if (!res.ok) throw new Error("Chyba úložiště.");

            window.OMEGA_STAGING_SAVED = true;
            window.showToast("✅ Koncept úspěšně uložen.");
        } catch (e) { 
            window.showToast("❌ Uložení selhalo: " + e.message, "error"); 
        }
    };

    /**
     * Načte uložený rozpracovaný koncept ze Stagingu a rekonstruuje tabulku
     */
    window.loadFromStaging = async function() {
        try {
            window.showToast("⏳ Hledám uložený koncept...");
            const res = await fetch(window.OMEGA_ADMIN_CONFIG.WORKER_URL + '/staging', {
                method: 'POST',
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${sessionStorage.getItem('omega_session_token')}` 
                },
                body: JSON.stringify({ action: 'load' })
            });
            
            if (res.status === 404) return window.showToast("ℹ️ Žádný rozpracovaný koncept nebyl nalezen.");
            if (!res.ok) throw new Error("Chyba při komunikaci se serverem.");
            
            const data = await res.json();
            const dbMatch = data.payload.match(/KNIHY_DB:\s*(\[[\s\S]*?\])\s*};/);
            if (!dbMatch) throw new Error("Poškozená struktura dat ve Stagingu.");
            
            if (typeof window.reconstructVirtualDbFromDraft === 'function') {
                window.reconstructVirtualDbFromDraft(JSON.parse(dbMatch[1]));
            }
            window.showToast("✅ Koncept úspěšně načten z paměti!");
            
        } catch (e) {
            window.showToast("❌ Nelze načíst Staging: " + e.message);
        }
    };

    /**
     * Připraví export databáze: validuje změny, vyžádá Turnstile podpis a otevře potvrzovací modál
     * @param {string} targetEndpoint - '/' pro ostrou produkci, '/draft/submit' pro zaslání návrhu
     */
    window.prepareDatabaseExport = async function(targetEndpoint = '/') {
        const turnstileInput = document.querySelector('[name="cf-turnstile-response"]');
        const turnstileToken = turnstileInput ? turnstileInput.value : null;

        if (!turnstileToken) {
            window.showToast("⚠️ Bezpečnostní systém Cloudflare vás ještě neověřil.");
            return;
        }

        const addedCount = window.adminVirtualDb.filter(k => k._isAdded).length;
        const editedCount = window.adminVirtualDb.filter(k => k._isEdited && !k._isDeleted).length;
        const deletedCount = window.adminVirtualDb.filter(k => k._isDeleted && !k._isAdded).length;

        if (addedCount === 0 && editedCount === 0 && deletedCount === 0) {
            window.showToast("⚠️ Nebyly provedeny žádné fyzické změny v databázi knih.");
            return;
        }

        if (window.sessionCredentials.username === 'omega' && targetEndpoint === '/' && typeof window.createAutoSnapshot === 'function') {
            await window.createAutoSnapshot();
        }

        let newDb = [];
        let counter = 1;

        window.adminVirtualDb.forEach(book => {
            if (!book._isDeleted) {
                book._finalId = counter; 
                let exportOrigId = book.origId || (book._original ? book._original.id : book.id);
                if (book._isAdded) exportOrigId = counter;

                newDb.push({
                    id: counter++,
                    origId: exportOrigId,
                    dilo: window.sanitize(book.dilo), 
                    autor: window.sanitize(book.autor),
                    druh: book.druh, 
                    obdobi: book.obdobi
                });
            }
        });

        const formattedDbString = "[\n" + newDb.map(book => `{ "id": ${book.id}, "origId": ${book.origId}, "dilo": ${JSON.stringify(book.dilo)}, "autor": ${JSON.stringify(book.autor)}, "druh": "${book.druh}", "obdobi": "${book.obdobi}" }`).join(',\n') + "\n    ]";
        const today = new Date().toLocaleDateString('cs-CZ');

        const modal = document.getElementById('omega-confirm-modal');
        const summary = document.getElementById('confirm-modal-summary');
        const titleEl = modal?.querySelector('h3');
        const warningEl = modal?.querySelector('p');
        const executeBtn = document.getElementById('btn-final-execute');
        
        let placeholderText = "";

        if (targetEndpoint === '/') {
            if (titleEl) titleEl.innerHTML = "🚀 Ostrý zápis do produkce";
            if (warningEl) warningEl.innerHTML = "Tato akce <strong style='color: var(--accent-red);'>OKAMŽITĚ přepíše databázi</strong> pro všechny studenty. Jste si jisti, že máte papírový souhlas ředitele?";
            if (executeBtn) executeBtn.innerText = "Potvrdit a zapsat (GitHub)";
            placeholderText = "Popis změn pro historii (POVINNÉ)";
        } else {
            if (titleEl) titleEl.innerHTML = "💡 Odeslat nápady";
            if (warningEl) warningEl.innerHTML = "Váš návrh bude odeslán do pošty ke kontrole vedoucí(mu) katedry.";
            if (executeBtn) executeBtn.innerText = "Odeslat návrh";
            placeholderText = "Vzkaz pro vedoucího (POVINNÉ)";
        }

        if (summary) {
            summary.innerHTML = `
                • Počet děl k odstranění: <strong style="color: var(--accent-red)">${deletedCount}</strong><br>
                • Počet nových děl k přidání: <strong style="color: var(--accent-green)">${addedCount}</strong><br>
                • Počet upravených děl: <strong style="color: #f59e0b">${editedCount}</strong><br>
                • Výsledný počet knih v DB: <strong>${newDb.length}</strong><br>
                <input type="text" id="export-commit-msg" placeholder="${placeholderText}" style="width: 100%; margin-top: 15px; padding: 10px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-base); color: var(--text-main); font-family: inherit; font-size: 0.85rem;">
            `;
        }

        if (modal) modal.style.display = 'flex';
        
        const finalExecuteBtn = document.getElementById('btn-final-execute');
        if (finalExecuteBtn) {
            finalExecuteBtn.disabled = false; 
            
            finalExecuteBtn.onclick = () => {
                const msgInput = document.getElementById('export-commit-msg');
                const customMsg = msgInput ? msgInput.value.trim() : "";

                if (!customMsg) {
                    if (msgInput) {
                        msgInput.style.borderColor = "var(--accent-red)";
                        msgInput.style.boxShadow = "0 0 0 2px rgba(218, 33, 40, 0.2)";
                        msgInput.style.transform = "translateX(-5px)";
                        setTimeout(() => msgInput.style.transform = "translateX(5px)", 100);
                        setTimeout(() => msgInput.style.transform = "translateX(0)", 200);
                    }
                    window.showToast("⚠️ Popis změn je povinný.");
                    return; 
                }

                let notes = [];

                const formatBook = (id, k) => `
                    <div class="omega-history-grid">
                        <strong style="color: var(--text-muted); background: var(--bg-surface-hover); padding: 3px 8px; border-radius: 6px; border: 1px solid var(--border); font-family: monospace; font-size: 0.78rem;">ID ${id}</strong>
                        <span style="font-weight: bold; color: var(--text-main);">${window.sanitize(k.dilo)}</span>
                        <span style="color: var(--text-muted);">${window.sanitize(k.autor)}</span>
                        <span style="font-size: 0.8em; padding: 2px 8px; border-radius: 4px; background: var(--bg-surface); border: 1px solid var(--border); color: var(--text-muted);">${k.druh}</span>
                        <span style="font-size: 0.8em; padding: 2px 8px; border-radius: 4px; background: var(--bg-surface); border: 1px solid var(--border); color: var(--text-muted);">${window.MAPA_OBDOBI[k.obdobi] || k.obdobi}</span>
                    </div>`;

                const added = window.adminVirtualDb.filter(k => k._isAdded && !k._isDeleted);
                if (added.length > 0) {
                    let html = `<strong style="color: #22c55e; display: flex; align-items: center; gap: 6px; margin-bottom: 10px; font-size: 1.02em; letter-spacing: 0.3px;"><span>➕</span> PŘIDÁNO DO SEZNAMU:</strong><div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">`;
                    added.sort((a,b) => a._finalId - b._finalId).forEach(k => {
                        html += `<div style="padding: 10px 14px; background: rgba(34, 197, 94, 0.04); border: 1px solid rgba(34, 197, 94, 0.15); border-radius: 8px;">${formatBook(k._finalId, k)}</div>`;
                    });
                    html += `</div>`;
                    notes.push(html);
                }

                const deleted = window.adminVirtualDb.filter(k => k._isDeleted && !k._isAdded);
                if (deleted.length > 0) {
                    let html = `<strong style="color: #ef4444; display: flex; align-items: center; gap: 6px; margin-bottom: 10px; font-size: 1.02em; letter-spacing: 0.3px;"><span>🗑️</span> ODEBRÁNO ZE SEZNAMU:</strong><div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">`;
                    deleted.sort((a,b) => a._original.id - b._original.id).forEach(k => {
                        html += `<div style="padding: 10px 14px; background: rgba(239, 68, 68, 0.04); border: 1px solid rgba(239, 68, 68, 0.15); border-radius: 8px; opacity: 0.7; text-decoration: line-through;">${formatBook(k._original.id, k._original)}</div>`;
                    });
                    html += `</div>`;
                    notes.push(html);
                }

                const edited = window.adminVirtualDb.filter(k => k._isEdited && !k._isDeleted);
                if (edited.length > 0) {
                    let html = `<strong style="color: #f59e0b; display: flex; align-items: center; gap: 6px; margin-bottom: 10px; font-size: 1.02em; letter-spacing: 0.3px;"><span>✏️</span> UPRAVENÁ DĚLA:</strong><div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">`;
                    
                    edited.sort((a,b) => a._finalId - b._finalId).forEach(k => {
                        let diffHtml = `<div style="padding: 10px 14px; background: rgba(245, 158, 11, 0.04); border: 1px solid rgba(245, 158, 11, 0.15); border-radius: 8px;">`;
                        diffHtml += formatBook(k._finalId, k); 

                        let changes = [];
                        const orig = k._original || {};
                        
                        if (orig.dilo && orig.dilo !== k.dilo) changes.push(`<strong>Dílo:</strong> <span style="text-decoration:line-through; opacity:0.6;">${window.sanitize(orig.dilo)}</span> ➔ <span style="color: #f59e0b;">${window.sanitize(k.dilo)}</span>`);
                        if (orig.autor && orig.autor !== k.autor) changes.push(`<strong>Autor:</strong> <span style="text-decoration:line-through; opacity:0.6;">${window.sanitize(orig.autor)}</span> ➔ <span style="color: #f59e0b;">${window.sanitize(k.autor)}</span>`);
                        if (orig.druh && orig.druh !== k.druh) changes.push(`<strong>Druh:</strong> <span style="text-decoration:line-through; opacity:0.6;">${orig.druh}</span> ➔ <span style="color: #f59e0b;">${k.druh}</span>`);
                        if (orig.obdobi && orig.obdobi !== k.obdobi) changes.push(`<strong>Období:</strong> <span style="text-decoration:line-through; opacity:0.6;">${window.MAPA_OBDOBI[orig.obdobi] || orig.obdobi}</span> ➔ <span style="color: #f59e0b;">${window.MAPA_OBDOBI[k.obdobi] || k.obdobi}</span>`);

                        if (changes.length > 0) {
                            diffHtml += `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(245, 158, 11, 0.3); font-size: 0.85em; color: var(--text-muted); display: flex; flex-direction: column; gap: 4px;">`;
                            changes.forEach(c => { diffHtml += `<div>${c}</div>`; });
                            diffHtml += `</div>`;
                        }
                        
                        diffHtml += `</div>`;
                        html += diffHtml;
                    });
                    html += `</div>`;
                    notes.push(html);
                }

                if (targetEndpoint === '/') {
                    window.adminChangelogDb.unshift({
                        type: 'db', 
                        version: `Revize databáze (${window.OMEGA_VERSION})`, 
                        date: today, 
                        notes: notes
                    });
                }

                const finalExportPayload = `// =====================================================================
// KONFIGURACE PROSTŘEDÍ: SPŠ a VOŠ PŘÍBRAM (VÝCHOZÍ)
// =====================================================================

window.OMEGA_CONFIG = {
    LAST_UPDATE: "${today}",
    REQUIREMENTS: { do18: 2, "19": 3, svet20: 4, cz20: 5, lyrika: 2, epika: 2, drama: 2 },
    
    FORM_HTML: \`
        <div class="input-group">
            <input type="text" id="student-name" class="styled-input" placeholder="Jméno a příjmení" autocomplete="name">
            <input type="text" id="student-dob" class="styled-input" placeholder="Datum nar. (např. 1. 1. 2007)" autocomplete="bday">
            <input type="text" id="student-class" class="styled-input" placeholder="Třída (např. 4.IT)">
            <div class="styled-input" id="year-wrapper" style="display: flex; align-items: center; gap: 6px; color: var(--text-muted); cursor: text;" onclick="document.getElementById('student-year').focus()">
                <span>Školní rok: 20</span>
                <input type="text" id="student-year" maxlength="2" placeholder="25" autocomplete="off" style="width: 30px; border: none; background: transparent; color: var(--text-main); font-weight: 900; font-family: inherit; font-size: 1.15em; outline: none; text-align: center; border-bottom: 2px solid var(--accent-primary); padding: 0 0 2px 0; border-radius: 0; box-shadow: none; -webkit-appearance: none; appearance: none;">
                <span> / 20</span><span id="student-year-next" style="color: var(--text-main); font-weight: bold;">26</span>
            </div>
        </div>
    \`,
    RULES_HTML: "",
    FORM_FIELDS: ['name', 'dob', 'class', 'year'],

    renderPdf: ${window.OMEGA_CONFIG.renderPdf.toString()},
    CHANGELOG_DB: ${JSON.stringify(window.adminChangelogDb, null, 8)},
    KNIHY_DB: ${formattedDbString}
};`;

                finalExecuteBtn.disabled = true; 
                window.closeConfirmModal();
                
                window.pushToCloudflare(finalExportPayload, turnstileToken, customMsg, targetEndpoint);
            };
        }
    };

    /**
     * Zavře potvrzovací modál exportu
     */
    window.closeConfirmModal = function() {
        const modal = document.getElementById('omega-confirm-modal');
        if (modal) modal.style.display = 'none';
    };

    /**
     * Odeslání kompilovaných databáze a Turnstile tokenu na Edge uzel Cloudflare
     */
    window.pushToCloudflare = function(fileContent, turnstileToken, customMsg = "", targetEndpoint = "/") {
        const modal = document.getElementById('admin-confirmation-modal');
        const msgEl = document.getElementById('admin-confirmation-msg');
        const downloadBtn = document.getElementById('btn-actual-download');
        
        if (modal) modal.style.display = 'flex';
        if (msgEl) msgEl.innerHTML = `⏳ <strong>Kompiluji databázi a ověřuji identitu přes Edge...</strong><br>Prosím, nezavírejte okno.`;
        if (downloadBtn) downloadBtn.style.display = (window.sessionCredentials.username === 'omega') ? 'block' : 'none';

        fetch(window.OMEGA_ADMIN_CONFIG.WORKER_URL + targetEndpoint, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "X-Omega-Device-Id": window.getDeviceIdentity(),
                "Authorization": `Bearer ${sessionStorage.getItem('omega_session_token')}`
            },
            body: JSON.stringify({ 
                fileContent: fileContent,  
                cf_token: turnstileToken,
                commit_message: customMsg, 
                base_version: window.DB_VERSION || "BYPASS_OCC" 
            })
        })
        .then(async (response) => {
            const data = await response.json();
            if (!response.ok) {
                if (response.status === 409 || (data.error && (data.error.includes('Konflikt verzí') || data.error.includes('Error 409')))) {
                    if (modal) modal.style.display = 'none';
                    const conflictModal = document.getElementById('omega-write-conflict-modal');
                    if (conflictModal) conflictModal.style.display = 'flex';
                    return;
                }
                throw new Error(data.error || "Neznámá chyba serveru.");
            }
            
            // Vyčištění RAM od smazaných knih a reset stavu
            window.adminVirtualDb = window.adminVirtualDb.filter(book => !book._isDeleted);
            window.adminVirtualDb.forEach((book, idx) => {
                book.id = idx + 1; 
                book._isAdded = false; 
                book._isEdited = false; 
                book._moveHistory = []; 
                book._original = { ...book }; 
            });
            window.OMEGA_STAGING_SAVED = true; 

            if (typeof window.renderAdminTable === 'function') window.renderAdminTable();
            if (typeof window.renderAdminSummary === 'function') window.renderAdminSummary();

            if (msgEl) {
                if (targetEndpoint === '/draft/submit') {
                    msgEl.innerHTML = `✅ <strong>NÁPAD BYL ODESLÁN</strong><br>Vaše úpravy byly odeslány do pošty ke kontrole vedoucí(mu) katedry.<br><br><button onclick="closeAdminConfirmationModal(); if(typeof checkSystemStatus === 'function') checkSystemStatus();" class="btn" style="width:100%; padding:10px; background:var(--bg-base); border:1px solid var(--border); color:var(--text-main);">Rozumím</button>`;
                } else {
                    msgEl.innerHTML = `✅ <strong>AKTUALIZACE ÚSPĚŠNÁ!</strong><br>Databáze byla exaktně zapsána do repozitáře.<br><br><button onclick="closeAdminConfirmationModal()" class="btn" style="width:100%; padding:10px; background:var(--bg-base); border:1px solid var(--border); color:var(--text-main);">Zavřít okno</button>`;
                }
            }
            
            window.pendingExportPayload = null;
            if (typeof window.navrhniDalsiVolneId === 'function') window.navrhniDalsiVolneId();
            if (typeof turnstile !== 'undefined') { 
                try { turnstile.reset('#omega-export-ts'); } catch (e) { turnstile.reset(); } 
            }
        })
        .catch((error) => {
            if (msgEl) msgEl.innerHTML = `❌ <strong>CHYBA SERVERU:</strong><br>${error.message}`;
            if (downloadBtn) {
                downloadBtn.style.display = 'block'; 
                downloadBtn.textContent = "Zavřít okno";
                downloadBtn.onclick = () => {
                    window.pendingExportPayload = null;
                    window.closeAdminConfirmationModal();
                }; 
            }
        });
    };

    /**
     * Zavře potvrzovací modál odeslání
     */
    window.closeAdminConfirmationModal = function() {
        const modal = document.getElementById('admin-confirmation-modal');
        if (modal) modal.style.display = 'none';
    };

    window.Omega.export = {
        saveToStaging: window.saveToStaging,
        loadFromStaging: window.loadFromStaging,
        prepareDatabaseExport: window.prepareDatabaseExport,
        pushToCloudflare: window.pushToCloudflare,
        closeConfirmModal: window.closeConfirmModal,
        closeAdminConfirmationModal: window.closeAdminConfirmationModal
    };
})();
