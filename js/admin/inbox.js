/**
 * OMEGA ADMIN: Collaborative Pull Request Engine (Inbox V5)
 * Zpracování návrhů změn od kolegů (Pošta), 3-cestné slučování (Merge), řešení konfliktů a Cloud Stash na PIN.
 */

window.Omega = window.Omega || {};

(function() {
    window.OMEGA_INBOX_CACHE = []; 
    window.CURRENT_INBOX_TAB = 'new';
    window.PENDING_MERGE_ANALYSIS = null;
    window.PENDING_MERGE_MSG_ID = null;

    /**
     * Otevře modál došlé pošty (nové návrhy)
     */
    window.openInboxModal = function() {
        const modal = document.getElementById('omega-inbox-modal');
        if (modal) modal.style.display = 'flex';
        window.fetchInbox(); 
    };

    /**
     * Otevře modál uložených nápadů (hvězdičkované + lokální koncept ze Stagingu)
     */
    window.openStarredModal = function() {
        const modal = document.getElementById('omega-starred-modal');
        if (modal) modal.style.display = 'flex';
        if (typeof window.fetchInbox === 'function') window.fetchInbox(); 
        window.loadStagingIntoModal();
    };

    /**
     * Stáhne seznam zpráv a návrhů z Edge schránky
     */
    window.fetchInbox = async function() {
        const username = window.sessionCredentials.username;
        if (username !== 'vedouci' && username !== 'omega') return;

        try {
            const res = await fetch(window.OMEGA_ADMIN_CONFIG.WORKER_URL + "/inbox/list", {
                method: "POST", 
                headers: { 
                    "Content-Type": "application/json", 
                    "X-Omega-Device-Id": window.getDeviceIdentity() 
                },
                body: JSON.stringify({ 
                    admin_username: window.sessionCredentials.username, 
                    admin_password: window.sessionCredentials.password 
                })
            });
            window.OMEGA_INBOX_CACHE = await res.json();
            
            const unreadData = window.OMEGA_INBOX_CACHE.filter(m => !m.starred);
            const starredData = window.OMEGA_INBOX_CACHE.filter(m => m.starred);
            
            const badgeInbox = document.getElementById('inbox-badge');
            if (badgeInbox) { 
                badgeInbox.innerText = unreadData.length; 
                badgeInbox.style.opacity = unreadData.length > 0 ? '1' : '0'; 
            }
            
            const badgeStarred = document.getElementById('starred-badge');
            if (badgeStarred) { 
                badgeStarred.innerText = starredData.length; 
                badgeStarred.style.opacity = starredData.length > 0 ? '1' : '0'; 
            }

            if (unreadData.length > 0 && typeof window.triggerBrowserNotification === 'function') {
                window.triggerBrowserNotification("Nová pošta!");
            }
            
            window.renderInboxContent(unreadData, 'inbox-content', false);
            window.renderInboxContent(starredData, 'starred-content', true);
        } catch (e) {
            console.warn("Chyba při stahování schránky:", e);
        }
    };

    /**
     * Vykreslí zprávy do zadaného kontejneru
     */
    window.renderInboxContent = function(dataArray, containerId, isStarred) {
        const content = document.getElementById(containerId);
        if (!content) return;
        
        if (!dataArray || dataArray.length === 0) {
            content.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: var(--text-muted); background: var(--bg-surface); border-radius: 8px; border: 1px dashed var(--border);">
                    <div style="font-size: 3rem; margin-bottom: 15px;">${isStarred ? '⭐' : '🕊️'}</div>
                    <h4 style="margin: 0 0 5px 0; color: var(--text-main);">${isStarred ? 'Žádné uložené nápady' : 'Schránka je prázdná'}</h4>
                </div>`;
            return;
        }

        content.innerHTML = dataArray.slice().reverse().map(msg => {
            let diffHtml = "Chyba analýzy";
            let draftDb = [];
            try {
                const jsonMatch = msg.payload.match(/KNIHY_DB:\s*(\[[\s\S]*?\])\s*};/);
                draftDb = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(msg.payload);
                diffHtml = window.generateDiffHtml(draftDb);
            } catch(e) {}
            
            const starColor = isStarred ? '#f59e0b' : 'var(--text-muted)';
            const starIcon = isStarred ? '★ Uloženo' : '☆ Uložit k projednání';
            
            const btnStyleBase = "flex: 1; background: var(--bg-base); border: 1px solid var(--border); color: var(--text-main); padding: 10px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: 0.2s;";
            const btnStyleAction = "flex: 1; background: rgba(16, 185, 129, 0.1); border: 1px solid var(--accent-green); color: var(--accent-green); padding: 10px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: 0.2s;";
            const btnStyleDanger = "flex: 1; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--accent-red); color: var(--accent-red); padding: 10px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: 0.2s;";

            const actionButtons = isStarred 
                ? `<button onclick="previewInboxIdea('${msg.id}')" style="${btnStyleAction}" onmouseover="this.style.background='var(--accent-green)'; this.style.color='white';">👁️ Zobrazit a převzít</button>
                   <button onclick="dismissInboxMessage('${msg.id}')" style="${btnStyleDanger}" onmouseover="this.style.background='var(--accent-red)'; this.style.color='white';">🗑️ Trvale odstranit</button>`
                : `<button onclick="previewInboxIdea('${msg.id}')" style="${btnStyleBase}" onmouseover="this.style.borderColor='var(--accent-primary)'; this.style.color='var(--accent-primary)';">👁️ Zobrazit návrh</button>
                   <button onclick="openIdeaRejectModal('${msg.id}')" style="${btnStyleDanger}" onmouseover="this.style.background='var(--accent-red)'; this.style.color='white';">❌ Zamítnout</button>`;

            return `
            <div style="background: var(--bg-base); border: 1px solid ${isStarred ? '#f59e0b' : 'var(--border)'}; padding: 15px; border-radius: 6px; margin-bottom: 15px; position: relative;">
                <button onclick="toggleStarInbox('${msg.id}')" style="position: absolute; top: 10px; right: 10px; background: transparent; border: none; color: ${starColor}; font-size: 0.85rem; font-weight: bold; cursor: pointer; transition: 0.2s;" title="Přesunout">${starIcon}</button>
                <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">📅 ${msg.date} | 👤 <strong style="color: var(--accent-primary);">${window.sanitize(msg.author)}</strong></div>
                <div style="color: var(--text-main); font-style: italic; margin-bottom: 12px; font-size: 0.95rem;">"${window.sanitize(msg.msg)}"</div>
                <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 4px; border-left: 2px solid ${isStarred ? '#f59e0b' : 'var(--border)'}; margin-bottom: 15px;">
                    ${diffHtml}
                </div>
                <div style="display: flex; gap: 10px;">${actionButtons}</div>
            </div>`;
        }).join('');
    };

    /**
     * Přepne hvězdičku (uloženo k projednání) s 0ms latencí a asynchronním zápisem
     */
    window.toggleStarInbox = async function(id) {
        const msg = window.OMEGA_INBOX_CACHE.find(m => m.id === id);
        if (msg) {
            msg.starred = !msg.starred; 
            
            const unreadData = window.OMEGA_INBOX_CACHE.filter(m => !m.starred);
            const starredData = window.OMEGA_INBOX_CACHE.filter(m => m.starred);
            
            const badgeInbox = document.getElementById('inbox-badge');
            if (badgeInbox) { badgeInbox.innerText = unreadData.length; badgeInbox.style.opacity = unreadData.length > 0 ? '1' : '0'; }
            
            const badgeStarred = document.getElementById('starred-badge');
            if (badgeStarred) { badgeStarred.innerText = starredData.length; badgeStarred.style.opacity = starredData.length > 0 ? '1' : '0'; }
            
            window.renderInboxContent(unreadData, 'inbox-content', false);
            window.renderInboxContent(starredData, 'starred-content', true);
        }
        
        try {
            fetch(window.OMEGA_ADMIN_CONFIG.WORKER_URL + "/inbox/star", {
                method: "POST", 
                headers: { 
                    "Content-Type": "application/json", 
                    "X-Omega-Device-Id": window.getDeviceIdentity() 
                },
                body: JSON.stringify({ msg_id: id })
            });
        } catch (e) {}
    };

    /**
     * Zobrazí kompletní náhled návrhu včetně vizuální tabulky
     */
    window.previewInboxIdea = function(msgId) {
        const msg = window.OMEGA_INBOX_CACHE.find(m => m.id === msgId);
        if (!msg) return;
        
        let draftDb;
        try {
            const jsonMatch = msg.payload.match(/KNIHY_DB:\s*(\[[\s\S]*?\])\s*};/);
            draftDb = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(msg.payload);
        } catch (err) { 
            return window.showToast("❌ Nelze analyzovat data nápadu."); 
        }
        
        const previewMsgIdInput = document.getElementById('preview-idea-msg-id');
        if (previewMsgIdInput) previewMsgIdInput.value = msgId;

        const diffEl = document.getElementById('idea-preview-diff');
        if (diffEl) diffEl.innerHTML = window.generateDiffHtml(draftDb);
        
        const tableEl = document.getElementById('idea-preview-table');
        if (tableEl) tableEl.innerHTML = window.generateColoredPreviewTable(draftDb);
        
        const modal = document.getElementById('omega-idea-preview-modal');
        if (modal) modal.style.display = 'flex';
    };

    /**
     * Trvale odstraní zprávu ze schránky
     */
    window.dismissInboxMessage = async function(id) {
        window.OMEGA_INBOX_CACHE = window.OMEGA_INBOX_CACHE.filter(m => m.id !== id);
        
        const unreadData = window.OMEGA_INBOX_CACHE.filter(m => !m.starred);
        const starredData = window.OMEGA_INBOX_CACHE.filter(m => m.starred);
        
        const badgeInbox = document.getElementById('inbox-badge');
        if (badgeInbox) { badgeInbox.innerText = unreadData.length; badgeInbox.style.opacity = unreadData.length > 0 ? '1' : '0'; }
        
        const badgeStarred = document.getElementById('starred-badge');
        if (badgeStarred) { badgeStarred.innerText = starredData.length; badgeStarred.style.opacity = starredData.length > 0 ? '1' : '0'; }
        
        window.renderInboxContent(unreadData, 'inbox-content', false);
        window.renderInboxContent(starredData, 'starred-content', true);

        window.showToast("🗑️ Nápad odstraněn.");

        try {
            fetch(window.OMEGA_ADMIN_CONFIG.WORKER_URL + "/inbox/delete", {
                method: "POST", 
                headers: { 
                    "Content-Type": "application/json", 
                    "X-Omega-Device-Id": window.getDeviceIdentity() 
                },
                body: JSON.stringify({ msg_id: id })
            });
        } catch (e) {}
    };

    /**
     * Rekonstruuje lokální virtuální databázi podle cizího návrhu a propáruje existující knihy přes DNA stopu
     */
    window.reconstructVirtualDbFromDraft = function(draftDb) {
        const prodDb = (window.OMEGA_CONFIG.KNIHY_DB || []).map((k, i) => ({...k, id: i + 1}));
        window.adminVirtualDb = [];

        draftDb.forEach((k, idx) => {
            let orig = prodDb.find(prodBook => prodBook.dilo.toLowerCase().trim() === k.dilo.toLowerCase().trim());
            
            if (!orig && k.origId !== null) {
                orig = prodDb.find(p => p.id === (k.origId || k.id));
            }

            const isReallyAdded = k.origId === null || (!orig && k.origId === null);

            window.adminVirtualDb.push({
                ...k,
                id: idx + 1,
                _isDeleted: false,
                _isAdded: isReallyAdded,
                _isEdited: false,
                _uid: Math.random().toString(36).substr(2, 9),
                _original: orig || {...k, id: idx + 1} 
            });
        });

        // Detekce smazaných děl
        prodDb.forEach(prodBook => {
            const isUsed = window.adminVirtualDb.find(v => v._original && v._original.id === prodBook.id);
            if (!isUsed) {
                window.adminVirtualDb.push({
                    ...prodBook,
                    _isDeleted: true,
                    _isAdded: false,
                    _isEdited: false,
                    _uid: Math.random().toString(36).substr(2, 9),
                    _original: {...prodBook}
                });
            }
        });

        if (typeof window.adminEvaluateChanges === 'function') window.adminEvaluateChanges();
        if (typeof window.renderAdminTable === 'function') window.renderAdminTable();
        if (typeof window.renderAdminSummary === 'function') window.renderAdminSummary();
    };

    /**
     * Potvrdí přímé převzetí návrhu do editoru
     */
    window.confirmInboxMerge = async function() {
        try {
            const msgId = document.getElementById('preview-idea-msg-id')?.value;
            const msg = window.OMEGA_INBOX_CACHE.find(m => m.id === msgId);
            if (!msg) throw new Error("Zpráva nenalezena v paměti.");
            
            let draftDb;
            const jsonMatch = msg.payload.match(/KNIHY_DB:\s*(\[[\s\S]*?\])\s*};/);
            draftDb = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(msg.payload); 
            
            window.reconstructVirtualDbFromDraft(draftDb);
            
            const previewModal = document.getElementById('omega-idea-preview-modal');
            const inboxModal = document.getElementById('omega-inbox-modal');
            const starredModal = document.getElementById('omega-starred-modal');

            if (previewModal) previewModal.style.display = 'none';
            if (inboxModal) inboxModal.style.display = 'none';
            if (starredModal) starredModal.style.display = 'none';
            window.showToast("✅ Nápad byl převzat do vašeho editoru.");
            
            const feedbackMsg = document.getElementById('accept-idea-msg') ? document.getElementById('accept-idea-msg').value.trim() : "";
            fetch(window.OMEGA_ADMIN_CONFIG.WORKER_URL + "/inbox/accept", {
                method: "POST", 
                headers: { 
                    "Content-Type": "application/json", 
                    "X-Omega-Device-Id": window.getDeviceIdentity() 
                },
                body: JSON.stringify({ msg_id: msgId, feedback: feedbackMsg })
            });
        } catch (err) {
            window.showToast("❌ Chyba při převzetí: " + err.message);
        }
    };

    /**
     * Slučovací logika: Zkontroluje kolize a buď otevře Conflict Resolver, nebo provede Fast-Forward Merge
     */
    window.mergeInboxIdea = async function() {
        try {
            const msgId = document.getElementById('preview-idea-msg-id')?.value;
            const msg = window.OMEGA_INBOX_CACHE.find(m => m.id === msgId);
            if (!msg) throw new Error("Zpráva nenalezena v paměti.");

            let draftDb;
            const jsonMatch = msg.payload.match(/KNIHY_DB:\s*(\[[\s\S]*?\])\s*};/);
            draftDb = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(msg.payload);

            const analysis = window.analyzeDraftChanges(draftDb);

            // Pokud kolega něco ručně přesunul nebo přepsal, vyvoláme Conflict Resolver
            if (analysis.manuallyMoved.length > 0 || analysis.edited.length > 0) {
                window.PENDING_MERGE_ANALYSIS = analysis;
                window.PENDING_MERGE_MSG_ID = msgId;
                window.renderConflictUI(analysis);
                return;
            }

            // Čisté přidání/smazání bez konfliktů -> Fast-Forward Merge
            window.PENDING_MERGE_ANALYSIS = analysis;
            window.PENDING_MERGE_MSG_ID = msgId;
            window.executeResolvedMerge(true); 

        } catch (err) {
            window.showToast("❌ Chyba při čtení dat: " + err.message);
        }
    };

    /**
     * Vykreslí modál pro řešení kolizí (výběr mezi lokálním a příchozím stavem)
     */
    window.renderConflictUI = function(analysis) {
        const container = document.getElementById('conflict-items-container');
        if (!container) return;
        let html = '';

        const createRadioUI = (type, bookId, labelLocal, labelIncoming, desc, title) => `
            <div class="conflict-item" style="background: var(--bg-base); border: 1px solid var(--border); padding: 15px; border-radius: 8px;">
                <strong style="color: var(--text-main); font-size: 1.05rem;">${window.sanitize(title)}</strong> <span style="color: var(--text-muted); font-size: 0.8rem; margin-left: 5px;">(${desc})</span>
                <div style="margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap;">
                    <label style="flex: 1; min-width: 200px; cursor: pointer; padding: 10px; border: 1px solid #10b981; border-radius: 6px; display: flex; align-items: center; gap: 10px; background: rgba(16, 185, 129, 0.05);" onclick="this.parentElement.querySelectorAll('label').forEach(l=>{l.style.borderColor='var(--border)'; l.style.background='transparent'}); this.style.borderColor='#10b981'; this.style.background='rgba(16, 185, 129, 0.05)';">
                        <input type="radio" name="${type}_${bookId}" value="local" checked>
                        <span style="font-size: 0.85rem; color: var(--text-muted);">${labelLocal}</span>
                    </label>
                    <label style="flex: 1; min-width: 200px; cursor: pointer; padding: 10px; border: 1px solid var(--border); border-radius: 6px; display: flex; align-items: center; gap: 10px;" onclick="this.parentElement.querySelectorAll('label').forEach(l=>{l.style.borderColor='var(--border)'; l.style.background='transparent'}); this.style.borderColor='#f59e0b'; this.style.background='rgba(245, 158, 11, 0.05)';">
                        <input type="radio" name="${type}_${bookId}" value="incoming">
                        <span style="font-size: 0.85rem; color: #f59e0b;">${labelIncoming}</span>
                    </label>
                </div>
            </div>`;

        analysis.manuallyMoved.forEach(book => {
            const localBook = window.adminVirtualDb.find(b => !b._isDeleted && b._original && b._original.id === book.prodMatch.id);
            const localPos = localBook ? localBook.id : 'Smazáno';
            html += createRadioUI('move', book.prodMatch.id, `Ponechat mou pozici (${localPos}.)`, `Převzít pozici kolegy (${book.draftIndex}.)`, 'Kolidující přesun', book.dilo);
        });

        analysis.edited.forEach(book => {
            html += createRadioUI('edit', book.prodMatch.id, `Ponechat můj text`, `Převzít text kolegy`, 'Kolidující úprava textu', book.dilo);
        });

        container.innerHTML = html;
        const conflictModal = document.getElementById('omega-conflict-modal');
        if (conflictModal) conflictModal.style.display = 'flex';
    };

    /**
     * Dokončí sloučení po vyřešení kolizí
     */
    window.executeResolvedMerge = function(isFastForward = false) {
        const analysis = window.PENDING_MERGE_ANALYSIS;
        if (!analysis) return;

        let changesCount = 0;
        let acceptedMoves = [];

        // 1. Přidání nových děl
        analysis.added.forEach(incomingBook => {
            const exists = window.adminVirtualDb.find(b => !b._isDeleted && b.dilo.toLowerCase().trim() === incomingBook.dilo.toLowerCase().trim());
            if (!exists) {
                window.adminVirtualDb.push({
                    ...incomingBook,
                    id: window.adminVirtualDb.length + 1, 
                    _isDeleted: false, _isAdded: true, _isEdited: false,
                    _uid: Math.random().toString(36).substr(2, 9), _original: null
                });
                changesCount++;
            }
        });

        // 2. Aplikace smazaných děl
        analysis.deleted.forEach(delBook => {
            const target = window.adminVirtualDb.find(b => !b._isDeleted && b._original && b._original.id === delBook.id);
            if (target) { target._isDeleted = true; changesCount++; }
        });

        // 3. Rozhodnutí z modálu kolizí
        if (!isFastForward) {
            analysis.manuallyMoved.forEach(book => {
                const choice = document.querySelector(`input[name="move_${book.prodMatch.id}"]:checked`)?.value;
                if (choice === 'incoming') acceptedMoves.push({ prodId: book.prodMatch.id, targetIndex: book.draftIndex - 1 });
            });

            analysis.edited.forEach(edBook => {
                const choice = document.querySelector(`input[name="edit_${edBook.prodMatch.id}"]:checked`)?.value;
                if (choice === 'incoming') {
                    const target = window.adminVirtualDb.find(b => !b._isDeleted && b._original && b._original.id === edBook.prodMatch.id);
                    if (target) {
                        target.dilo = edBook.dilo; 
                        target.autor = edBook.autor; 
                        target.obdobi = edBook.obdobi; 
                        target.druh = edBook.druh;
                        changesCount++;
                    }
                }
            });
        }

        // 4. Přesuny v poli paměti
        acceptedMoves.sort((a,b) => a.targetIndex - b.targetIndex).forEach(m => {
            const currentIndex = window.adminVirtualDb.findIndex(b => b._original && b._original.id === m.prodId);
            if (currentIndex > -1) {
                const item = window.adminVirtualDb.splice(currentIndex, 1)[0];
                window.adminVirtualDb.splice(m.targetIndex, 0, item);
                changesCount++;
            }
        });

        if (typeof window.adminEvaluateChanges === 'function') window.adminEvaluateChanges();
        if (typeof window.renderAdminTable === 'function') window.renderAdminTable();
        if (typeof window.renderAdminSummary === 'function') window.renderAdminSummary();

        const conflictModal = document.getElementById('omega-conflict-modal');
        const previewModal = document.getElementById('omega-idea-preview-modal');
        const inboxModal = document.getElementById('omega-inbox-modal');
        const starredModal = document.getElementById('omega-starred-modal');

        if (conflictModal) conflictModal.style.display = 'none';
        if (previewModal) previewModal.style.display = 'none';
        if (inboxModal) inboxModal.style.display = 'none';
        if (starredModal) starredModal.style.display = 'none';

        window.showToast(`✅ Sloučení úspěšné (${changesCount} provedených změn).`);

        const feedbackMsg = document.getElementById('accept-idea-msg') ? document.getElementById('accept-idea-msg').value.trim() : "";
        fetch(window.OMEGA_ADMIN_CONFIG.WORKER_URL + "/inbox/accept", {
            method: "POST", 
            headers: { 
                "Content-Type": "application/json", 
                "X-Omega-Device-Id": window.getDeviceIdentity() 
            },
            body: JSON.stringify({ msg_id: window.PENDING_MERGE_MSG_ID, feedback: feedbackMsg })
        }).catch(() => {});
    };

    /**
     * Otevře modál pro zadání důvodu zamítnutí nápadu
     */
    window.openIdeaRejectModal = function(id) {
        const idInput = document.getElementById('reject-idea-msg-id');
        const textInput = document.getElementById('reject-idea-input');
        if (idInput) idInput.value = id;
        if (textInput) textInput.value = '';
        const modal = document.getElementById('omega-reject-idea-modal');
        if (modal) modal.style.display = 'flex';
    };

    /**
     * Odešle zamítnutí nápadu se zpětnou vazbou
     */
    window.executeIdeaReject = async function() {
        const id = document.getElementById('reject-idea-msg-id')?.value;
        const feedback = document.getElementById('reject-idea-input')?.value.trim();
        if (!feedback) return window.showToast("⚠️ Zadejte důvod zamítnutí.");
        
        const modal = document.getElementById('omega-reject-idea-modal');
        if (modal) modal.style.display = 'none';
        window.showToast("⏳ Odesílám zamítnutí učiteli...");
        try {
            await fetch(window.OMEGA_ADMIN_CONFIG.WORKER_URL + "/inbox/reject", {
                method: "POST", 
                headers: { 
                    "Content-Type": "application/json", 
                    "X-Omega-Device-Id": window.getDeviceIdentity() 
                },
                body: JSON.stringify({ msg_id: id, feedback: feedback })
            });
            window.fetchInbox(); 
        } catch (e) {}
    };

    /**
     * Uloží rozpracovaný stav do cloudu a vygeneruje 4místný PIN
     */
    window.stashCurrentWork = async function() {
        const currentDraft = window.adminVirtualDb.filter(k => !k._isDeleted).map((k, idx) => ({
            id: idx + 1, dilo: window.sanitize(k.dilo), autor: window.sanitize(k.autor), druh: k.druh, obdobi: k.obdobi
        }));
        window.showToast("⏳ Ukládám stav do cloudu...");
        try {
            const res = await fetch(window.OMEGA_ADMIN_CONFIG.WORKER_URL + "/draft/stash-save", {
                method: "POST", 
                headers: { 
                    "Content-Type": "application/json", 
                    "X-Omega-Device-Id": window.getDeviceIdentity() 
                },
                body: JSON.stringify({ fileContent: JSON.stringify(currentDraft) })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            
            const pinDisplay = document.getElementById('stash-pin-display');
            if (pinDisplay) {
                pinDisplay.innerHTML = `<span style="cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;" onclick="navigator.clipboard.writeText('${data.pin}'); showToast('✅ PIN [${data.pin}] úspěšně zkopírován!');" title="Klikněte pro zkopírování">${data.pin}</span>`;
            }
            
            const copyBtn = document.getElementById('stash-copy-btn');
            if (copyBtn) {
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(data.pin).then(() => {
                        window.showToast(`✅ PIN [${data.pin}] byl zkopírován do schránky!`);
                    }).catch(() => window.showToast("⚠️ Kopírování selhalo. Zkopírujte kód ručně."));
                };
            }
            const saveModal = document.getElementById('omega-pin-save-modal');
            if (saveModal) saveModal.style.display = 'flex';
        } catch(e) { 
            window.showToast("❌ " + e.message); 
        }
    };

    /**
     * Otevře dialog pro zadání 4místného PIN kódu
     */
    window.openPinLoadModal = function() {
        const input = document.getElementById('load-pin-input');
        if (input) input.value = '';
        const modal = document.getElementById('omega-pin-load-modal');
        if (modal) modal.style.display = 'flex';
        setTimeout(() => input?.focus(), 100);
    };

    /**
     * Stáhne rozpracovanou práci podle zadaného PINu
     */
    window.executeStashLoad = async function() {
        const pinInput = document.getElementById('load-pin-input');
        const pin = pinInput ? pinInput.value.trim() : '';
        if (pin.length !== 4) return window.showToast("⚠️ PIN musí mít přesně 4 znaky.");
        
        window.showToast("⏳ Stahuji data z cloudu...");
        try {
            const res = await fetch(window.OMEGA_ADMIN_CONFIG.WORKER_URL + "/draft/stash-load", {
                method: "POST", 
                headers: { 
                    "Content-Type": "application/json", 
                    "X-Omega-Device-Id": window.getDeviceIdentity() 
                },
                body: JSON.stringify({ pin: pin })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            
            window.reconstructVirtualDbFromDraft(JSON.parse(data.data));
            
            const loadModal = document.getElementById('omega-pin-load-modal');
            if (loadModal) loadModal.style.display = 'none';
            window.showToast(`✅ Data z PINu [${pin.toUpperCase()}] byla úspěšně načtena!`);
        } catch(e) { 
            window.showToast("❌ " + e.message); 
        }
    };

    /**
     * Načte a vloží kartu se Staging konceptem do modálu uložených nápadů
     */
    window.loadStagingIntoModal = async function() {
        try {
            const res = await fetch(window.OMEGA_ADMIN_CONFIG.WORKER_URL + '/staging', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${sessionStorage.getItem('omega_session_token')}` 
                },
                body: JSON.stringify({ action: 'load' })
            });
            if (!res.ok) return;
            const data = await res.json();
            if (!data.payload) return;

            window._tempStagingPayload = data.payload;
            const starredContent = document.getElementById('starred-content');
            if (!starredContent) return;
            
            const oldCard = document.getElementById('omega-staging-inline-card');
            if (oldCard) oldCard.remove();

            const card = document.createElement('div');
            card.id = 'omega-staging-inline-card';
            card.style.cssText = "background: var(--bg-surface); border: 1px solid var(--border); padding: 15px; border-radius: 8px; margin-bottom: 10px;";
            
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <strong style="color: var(--text-main); font-size: 1.05rem;">Můj koncept (Tento počítač)</strong>
                    <span style="color: var(--text-muted); font-size: 0.85rem;">Rozpracováno</span>
                </div>
                <div style="color: var(--text-muted); margin-bottom: 12px; font-size: 0.95rem;">Dočasně uložená práce, čekající na dokončení.</div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="window.applyStagingToWorkspace()" class="btn" style="flex: 1; padding: 8px; background: var(--bg-base); border: 1px solid var(--border); color: var(--text-main); border-radius: 4px; font-weight: bold; cursor: pointer; transition: 0.2s;" onmouseover="this.style.borderColor='var(--text-main)'" onmouseout="this.style.borderColor='var(--border)'">
                        Otevřít koncept
                    </button>
                </div>
            `;
            starredContent.insertBefore(card, starredContent.firstChild);
        } catch (e) { 
            console.warn("Staging sync failed", e); 
        }
    };

    /**
     * Aplikuje Staging koncept do aktuálního pracovního prostoru
     */
    window.applyStagingToWorkspace = async function() {
        if (!window._tempStagingPayload) return;
        const dbMatch = window._tempStagingPayload.match(/KNIHY_DB:\s*(\[[\s\S]*?\])(?=\s*[\x7D;])/);
        if (!dbMatch) return window.showToast("Data jsou porušena.", "error");

        window.reconstructVirtualDbFromDraft(JSON.parse(dbMatch[1]));
        const modal = document.getElementById('omega-starred-modal');
        if (modal) modal.style.display = 'none';
        window.showToast("✅ Koncept nahozen. Odstraňuji dočasnou zálohu...");

        const oldCard = document.getElementById('omega-staging-inline-card');
        if (oldCard) oldCard.remove();
        window._tempStagingPayload = null;

        try {
            await fetch(window.OMEGA_ADMIN_CONFIG.WORKER_URL + '/staging', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${sessionStorage.getItem('omega_session_token')}` 
                },
                body: JSON.stringify({ action: 'delete' })
            });
        } catch(e) {}
    };

    window.Omega.inbox = {
        openInboxModal: window.openInboxModal,
        openStarredModal: window.openStarredModal,
        fetchInbox: window.fetchInbox,
        renderInboxContent: window.renderInboxContent,
        toggleStarInbox: window.toggleStarInbox,
        previewInboxIdea: window.previewInboxIdea,
        dismissInboxMessage: window.dismissInboxMessage,
        reconstructVirtualDbFromDraft: window.reconstructVirtualDbFromDraft,
        confirmInboxMerge: window.confirmInboxMerge,
        mergeInboxIdea: window.mergeInboxIdea,
        renderConflictUI: window.renderConflictUI,
        executeResolvedMerge: window.executeResolvedMerge,
        openIdeaRejectModal: window.openIdeaRejectModal,
        executeIdeaReject: window.executeIdeaReject,
        stashCurrentWork: window.stashCurrentWork,
        openPinLoadModal: window.openPinLoadModal,
        executeStashLoad: window.executeStashLoad,
        loadStagingIntoModal: window.loadStagingIntoModal,
        applyStagingToWorkspace: window.applyStagingToWorkspace
    };
})();
