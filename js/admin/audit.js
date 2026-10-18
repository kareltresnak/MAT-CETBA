/**
 * OMEGA ADMIN: Audit Log Generator & Private Revert Engine
 * Human-readable audit log rozpracovaných změn, privátní Git historie z Edge a Smart Revert preview engine.
 */

window.Omega = window.Omega || {};

(function() {
    let targetRevertHash = "";

    /**
     * Vygeneruje a zobrazí přehledný audit log všech změn provedených v aktuální relaci
     */
    window.renderAdminSummary = function() {
        const container = document.getElementById('admin-summary-content');
        if (!container) return;

        let added = [];
        let editedContent = [];
        let moved = [];
        let deleted = [];

        window.adminVirtualDb.forEach(book => {
            if (book._isDeleted) {
                deleted.push(`<strong>${window.sanitize(book.dilo)}</strong> (Původní ID ${book._original.id})`);
                return;
            }
            if (book._isAdded) {
                added.push(`<strong>${window.sanitize(book.dilo)}</strong> (Nové ID ${book.id})`);
                return;
            }
            if (book._isEdited) {
                const orig = book._original || book;
                let textChanges = [];
                
                if (book.dilo !== orig.dilo) textChanges.push("Název");
                if (book.autor !== orig.autor) textChanges.push("Autor");
                if (book.obdobi !== orig.obdobi) textChanges.push("Období");
                if (book.druh !== orig.druh) textChanges.push("Druh");

                const explicitMove = book._moveHistory && book._moveHistory.length > 0;

                if (textChanges.length > 0 || explicitMove) {
                    let reason = textChanges.length > 0 ? textChanges.join(', ') : "Manuální přesun";
                    if (explicitMove && textChanges.length > 0) reason += " + Přesun";
                    editedContent.push(`<strong>${window.sanitize(book.dilo)}</strong> (Změna: ${reason})`);
                } 
                
                if (book.id !== orig.id && !explicitMove && textChanges.length === 0) {
                    moved.push(`<strong>${window.sanitize(book.dilo)}</strong> (Pozice: ID ${orig.id} ➔ ${book.id})`);
                }
            }
        });

        // Inteligentní agregace hromadných kaskádových posunů
        if (moved.length > 4) {
            moved = [`V databázi došlo k hromadnému posunu (kaskádový efekt) u <strong>${moved.length} děl</strong>.`];
        }

        let html = '';
        
        if (added.length > 0) {
            html += `<div style="margin-bottom: 15px; padding-left: 12px; border-left: 4px solid #10b981; background: rgba(16, 185, 129, 0.05); padding-top: 8px; padding-bottom: 8px; border-radius: 0 6px 6px 0; display: flex; align-items: flex-start;">
                <span style="color: #10b981; font-weight: 800; width: 110px; white-space: nowrap; flex-shrink: 0; font-size: 0.8rem;">➕ PŘIDÁNO:</span> 
                <div style="line-height: 1.5;">${added.join('<span style="color: var(--border); margin: 0 8px;">|</span>')}</div>
            </div>`;
        }
        if (editedContent.length > 0) {
            html += `<div style="margin-bottom: 15px; padding-left: 12px; border-left: 4px solid #f59e0b; background: rgba(245, 158, 11, 0.05); padding-top: 8px; padding-bottom: 8px; border-radius: 0 6px 6px 0; display: flex; align-items: flex-start;">
                <span style="color: #f59e0b; font-weight: 800; width: 110px; white-space: nowrap; flex-shrink: 0; font-size: 0.8rem;">✏️ ZMĚNĚNO:</span> 
                <div style="line-height: 1.5;">${editedContent.join('<span style="color: var(--border); margin: 0 8px;">|</span>')}</div>
            </div>`;
        }
        if (deleted.length > 0) {
            html += `<div style="margin-bottom: 15px; padding-left: 12px; border-left: 4px solid #ef4444; background: rgba(239, 68, 68, 0.05); padding-top: 8px; padding-bottom: 8px; border-radius: 0 6px 6px 0; display: flex; align-items: flex-start;">
                <span style="color: #ef4444; font-weight: 800; width: 110px; white-space: nowrap; flex-shrink: 0; font-size: 0.8rem;">🗑️ ODEBRÁNO:</span> 
                <div style="line-height: 1.5;">${deleted.join('<span style="color: var(--border); margin: 0 8px;">|</span>')}</div>
            </div>`;
        }
        if (moved.length > 0) {
            html += `<div style="margin-bottom: 15px; padding-left: 12px; border-left: 4px solid #3b82f6; background: rgba(59, 130, 246, 0.05); padding-top: 8px; padding-bottom: 8px; border-radius: 0 6px 6px 0; display: flex; align-items: flex-start;">
                <span style="color: #3b82f6; font-weight: 800; width: 110px; white-space: nowrap; flex-shrink: 0; font-size: 0.8rem;">↕️ POŘADÍ:</span> 
                <div style="line-height: 1.5;">${moved.join('<span style="color: var(--border); margin: 0 8px;">|</span>')}</div>
            </div>`;
        }

        if (!html) {
            html = '<div style="color: var(--text-muted); font-style: italic; padding: 10px;">Zatím nebyly provedeny žádné databázové mutace.</div>';
        }

        const gitLayer = document.getElementById('omega-git-history-layer');
        container.innerHTML = html;
        if (gitLayer) {
            container.appendChild(gitLayer);
        }
    };

    /**
     * Načte privátní Git audit log z Cloudflare Workeru (pouze pro roli omega)
     */
    window.fetchPrivateAuditLog = async function() {
        const container = document.getElementById('admin-summary-content');
        if (!container) return;
        
        let gitContainer = document.getElementById('omega-git-history-layer');
        if (!gitContainer) {
            gitContainer = document.createElement('div');
            gitContainer.id = 'omega-git-history-layer';
            container.appendChild(gitContainer);
        }

        if (window.sessionCredentials.username !== 'omega') {
            gitContainer.innerHTML = ''; 
            return;
        }

        gitContainer.innerHTML = `<div id="audit-loading-msg" style="margin-top: 20px; padding: 15px; border-top: 1px dashed var(--border);"><span style="color: var(--accent-primary);">⏳ Kontaktuji privátní repozitář pro stažení historie...</span></div>`;

        try {
            const response = await fetch(window.OMEGA_ADMIN_CONFIG.WORKER_URL + "/audit-log", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "X-Omega-Device-Id": window.getDeviceIdentity() 
                },
                body: JSON.stringify({})
            });
            const data = await response.json();
            
            const loadingMsgEl = document.getElementById('audit-loading-msg');
            if (loadingMsgEl) loadingMsgEl.remove();
            
            if (!response.ok) throw new Error(data.error || "Přístup odepřen.");

            let logHtml = `<h4 style="margin-top: 20px; color: var(--text-main);">Historie z produkce (Git)</h4>`;
            const validLogs = (data.logs || []).filter(log => log.user !== "Neznámý" && log.user !== "Systém");

            if (validLogs.length === 0) {
                logHtml += `<p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 10px;">Zatím nejsou k dispozici žádné uživatelské úpravy.</p>`;
            } else {
                validLogs.forEach(log => {
                    logHtml += `
                        <div style="margin-bottom: 10px; padding: 10px; background: var(--bg-base); border-left: 3px solid var(--accent-primary-light, var(--accent-rust-light)); font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="color: var(--text-muted); margin-bottom: 4px;">📅 ${log.date} | 👤 <strong>${log.user}</strong></div>
                                <div style="color: var(--text-main);">${log.message}</div>
                            </div>
                            <button onclick="prepareRevert('${log.hash}')" style="background: transparent; border: 1px solid var(--accent-red); color: var(--accent-red); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem; transition: 0.2s;" onmouseover="this.style.background='rgba(218, 33, 40, 0.1)'" onmouseout="this.style.background='transparent'">
                                ⏪ Obnovit
                            </button>
                        </div>`;
                });
            }
            
            gitContainer.innerHTML = logHtml;
            
        } catch (error) {
            const loadingMsg = document.getElementById('audit-loading-msg');
            if (loadingMsg) loadingMsg.remove();
            
            gitContainer.innerHTML = `
                <h4 style="margin-top: 20px; color: var(--text-main);">Historie z produkce (Git)</h4>
                <div style="margin-top: 10px; color: var(--accent-red); font-size: 0.85rem;">❌ Chyba připojení: ${error.message}</div>
            `;
        }
    };

    /**
     * Připraví a zobrazí náhled rozdílů před provedením rollbacku (Revert)
     * @param {string} hash - Commit hash
     */
    window.prepareRevert = async function(hash) {
        targetRevertHash = hash;
        const hashEl = document.getElementById('revert-commit-hash');
        if (hashEl) hashEl.innerText = hash;
        
        const modal = document.getElementById('omega-revert-modal');
        if (modal) modal.style.display = 'flex';
        
        const diffBox = document.getElementById('revert-diff-container');
        if (diffBox) diffBox.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-muted);">⏳ Analyzuji historická data přes API GitHubu...</div>';

        try {
            if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
                throw new Error("LOKALNI_VYVOJ");
            }

            const res = await fetch(`https://raw.githubusercontent.com/kareltresnak/MAT-CETBA/${hash}/data-spspb.js?t=${Date.now()}`);
            if (!res.ok) throw new Error("Chyba při stahování snapshotu.");
            
            const text = await res.text();
            const jsonMatch = text.match(/KNIHY_DB:\s*(\[[\s\S]*?\])\s*};/);
            if (!jsonMatch) throw new Error("Nelze dekódovat historickou databázi.");
            
            const oldDb = JSON.parse(jsonMatch[1]);
            const currDb = window.getKnihyDb();
            
            const oldNames = oldDb.map(k => k.dilo.toLowerCase().trim());
            const currNames = currDb.map(k => k.dilo.toLowerCase().trim());
            
            const toRestore = oldDb.filter(k => !currNames.includes(k.dilo.toLowerCase().trim()));
            const toLose = currDb.filter(k => !oldNames.includes(k.dilo.toLowerCase().trim()));
            
            let diffHtml = "";
            if (toRestore.length === 0 && toLose.length === 0) {
                diffHtml = "<div style='padding:10px; text-align:center; color: var(--accent-primary);'>Seznam děl je prakticky identický s aktuálním stavem. Bude proveden pouze rollback textových detailů.</div>";
            } else {
                if (toRestore.length > 0) {
                    diffHtml += `<div style="color: var(--accent-green); margin-bottom: 12px;"><strong>➕ Tato díla se vrátí zpět do databáze:</strong><ul style="margin: 5px 0 0 0; padding-left: 20px;">` + 
                        toRestore.map(k => `<li>${window.sanitize(k.dilo)}</li>`).join('') + `</ul></div>`;
                }
                if (toLose.length > 0) {
                    diffHtml += `<div style="color: var(--accent-red);"><strong>🗑️ O tato novější díla přijdete (v této staré záloze ještě neexistují):</strong><ul style="margin: 5px 0 0 0; padding-left: 20px;">` + 
                        toLose.map(k => `<li>${window.sanitize(k.dilo)}</li>`).join('') + `</ul></div>`;
                }
            }
            if (diffBox) diffBox.innerHTML = diffHtml;

        } catch (err) {
            if (diffBox) {
                if (err.message === "LOKALNI_VYVOJ") {
                    diffBox.innerHTML = '<div style="color:var(--accent-primary); padding:10px; text-align: center;">⚠️ [SIMULACE]<br>Analýzu nelze provést. V produkci zde uvidíte přesný rozdíl knih.</div>';
                } else {
                    diffBox.innerHTML = `<div style="color:var(--accent-red); padding:10px;">❌ Nelze vygenerovat náhled: ${err.message}</div>`;
                }
            }
        }
    };

    /**
     * Vykoná Revert databáze na cílový commit na Cloudflare Edge
     */
    window.executeRevert = async function() {
        const modal = document.getElementById('omega-revert-modal');
        if (modal) modal.style.display = 'none';
        
        window.showToast("⏳ Odesílám požadavek na Revert do Cloudflare...");
        try {
            const response = await fetch(window.OMEGA_ADMIN_CONFIG.WORKER_URL + "/revert", {
                method: "POST", 
                headers: { 
                    "Content-Type": "application/json",
                    "X-Omega-Device-Id": window.getDeviceIdentity()
                },
                body: JSON.stringify({ target_commit: targetRevertHash })
            });
            if (!response.ok) throw new Error("Revert selhal na straně serveru.");
            window.showToast("✅ Databáze úspěšně obnovena! Obnovte stránku.");
            setTimeout(() => window.location.reload(), 2000);
        } catch (error) { 
            window.showToast("❌ Chyba: " + error.message); 
        }
    };

    window.Omega.audit = {
        renderSummary: window.renderAdminSummary,
        fetchPrivateAuditLog: window.fetchPrivateAuditLog,
        prepareRevert: window.prepareRevert,
        executeRevert: window.executeRevert
    };
})();
