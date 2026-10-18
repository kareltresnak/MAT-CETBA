/**
 * OMEGA DIFF: LIS Math Engine & Visual Diffing
 * Matematický algoritmus nejdelší rostoucí podposloupnosti (Longest Increasing Subsequence)
 * pro rozlišení manuálních přesunů od kaskádových posunů ID, plus textový a vizuální generátor diffu.
 */

window.Omega = window.Omega || {};

/**
 * Provede detailní analýzu změn mezi produkční databází a návrhem (draftDb)
 * Využívá LIS k nalezení páteře děl, která se vůči sobě neposunula.
 * @param {Array} draftDb - Databáze návrhu
 * @returns {object} { added, deleted, edited, manuallyMoved, cascadeMoved, prodDb }
 */
window.analyzeDraftChanges = function(draftDb) {
    const prodDb = (window.OMEGA_CONFIG.KNIHY_DB || []).map((k, i) => ({...k, id: i + 1}));

    let draftMapped = draftDb.map((draftBook, idx) => {
        // 1. Pokus o exaktní shodu názvu díla
        let prodMatch = prodDb.find(p => p.dilo.toLowerCase().trim() === draftBook.dilo.toLowerCase().trim());
        
        // 2. DNA FALLBACK: Pokud učitel přepsal název, spárujeme přes původní ID stopu
        if (!prodMatch) {
            if (draftBook.origId === null) {
                prodMatch = null;
            } else {
                const targetId = draftBook.origId || (draftBook._original ? draftBook._original.id : draftBook.id);
                prodMatch = prodDb.find(p => p.id === targetId);
            }
        }

        return {
            ...draftBook,
            draftIndex: idx + 1,
            prodMatch: prodMatch || null
        };
    });

    const added = draftMapped.filter(k => !k.prodMatch);
    const draftMatchedProdIds = draftMapped.filter(k => k.prodMatch).map(k => k.prodMatch.id);
    const deleted = prodDb.filter(p => !draftMatchedProdIds.includes(p.id));

    const draftSurviving = draftMapped.filter(k => k.prodMatch);

    // LIS Algoritmus: Dynamické programování O(N^2) pro nalezení páteře neposunutých děl
    let lisItems = [];
    if (draftSurviving.length > 0) {
        let dp = Array(draftSurviving.length).fill(1);
        let prev = Array(draftSurviving.length).fill(-1);
        let maxLen = 1;
        let maxIdx = 0;

        for (let i = 1; i < draftSurviving.length; i++) {
            for (let j = 0; j < i; j++) {
                if (draftSurviving[i].prodMatch.id > draftSurviving[j].prodMatch.id && dp[i] < dp[j] + 1) {
                    dp[i] = dp[j] + 1;
                    prev[i] = j;
                }
            }
            if (dp[i] > maxLen) {
                maxLen = dp[i];
                maxIdx = i;
            }
        }

        let curr = maxIdx;
        while (curr !== -1) {
            lisItems.push(draftSurviving[curr].prodMatch.id);
            curr = prev[curr];
        }
        lisItems.reverse();
    }

    let edited = [];
    let manuallyMoved = [];
    let cascadeMoved = [];

    draftSurviving.forEach(draftBook => {
        const prodBook = draftBook.prodMatch;
        const textChanged = (
            draftBook.dilo !== prodBook.dilo || 
            draftBook.autor !== prodBook.autor || 
            draftBook.obdobi !== prodBook.obdobi || 
            draftBook.druh !== prodBook.druh
        );
        const isInLIS = lisItems.includes(prodBook.id);
        const idChanged = draftBook.draftIndex !== prodBook.id;

        if (textChanged) {
            edited.push(draftBook);
        } else if (!isInLIS) {
            manuallyMoved.push(draftBook);
        } else if (idChanged) {
            cascadeMoved.push(draftBook);
        }
    });

    return { added, deleted, edited, manuallyMoved, cascadeMoved, prodDb };
};

/**
 * Vygeneruje textový HTML výpis provedených změn (pro modály a inbox náhledy)
 * @param {Array} draftDb - Databáze návrhu
 * @returns {string} HTML reprezentace diffu
 */
window.generateDiffHtml = function(draftDb) {
    const analysis = window.analyzeDraftChanges(draftDb);
    let html = "";
    
    if (analysis.added.length === 0 && analysis.deleted.length === 0 && analysis.edited.length === 0 && analysis.manuallyMoved.length === 0 && analysis.cascadeMoved.length === 0) {
        return "<div style='color: var(--text-muted); font-style: italic; font-size: 0.85rem;'>Žádné fyzické změny. Databáze je identická.</div>";
    } 

    if (analysis.added.length > 0) {
        const addedText = analysis.added.map(k => 
            `<div style="margin-bottom: 6px; padding-left: 10px; border-left: 2px solid #10b981;">
                <strong style="color: var(--text-main);">${window.sanitize(k.dilo)}</strong> 
                <span style="color: var(--text-muted); font-size: 0.9em;">(${window.sanitize(k.autor)})</span>
            </div>`
        ).join('');

        const isCollapsed = analysis.added.length > 2;
        const displayState = isCollapsed ? 'none' : 'block';
        const iconState = isCollapsed ? '▼ Zobrazit detaily' : '▲ Skrýt detaily';

        html += `
        <div style="margin-top: 12px; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 6px; overflow: hidden;">
            <div onclick="const b = this.nextElementSibling; const i = this.querySelector('.toggle-icon'); if(b.style.display==='none'){b.style.display='block';i.textContent='▲ Skrýt detaily';}else{b.style.display='none';i.textContent='▼ Zobrazit detaily';}" 
                 style="padding: 10px 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s;"
                 onmouseover="this.style.background='rgba(16, 185, 129, 0.1)'" onmouseout="this.style.background='transparent'">
                <strong style="color: #10b981; font-size: 0.85rem;">➕ Přidaná díla (${analysis.added.length})</strong>
                <span class="toggle-icon" style="color: #10b981; font-size: 0.75rem; background: rgba(16, 185, 129, 0.15); padding: 4px 8px; border-radius: 4px; font-weight: bold;">${iconState}</span>
            </div>
            <div style="display: ${displayState}; padding: 0 12px 10px 12px; border-top: 1px dashed rgba(16, 185, 129, 0.2); margin-top: 2px; padding-top: 12px;">
                ${addedText}
            </div>
        </div>`;
    }
    
    if (analysis.deleted.length > 0) {
        const deletedText = analysis.deleted.map(k => 
            `<div style="margin-bottom: 6px; padding-left: 10px; border-left: 2px solid #ef4444;">
                <strike style="color: var(--text-muted);"><strong style="color: #ef4444;">${window.sanitize(k.dilo)}</strong></strike> 
                <span style="color: var(--text-muted); font-size: 0.9em;">(${window.sanitize(k.autor)})</span>
            </div>`
        ).join('');

        const isCollapsed = analysis.deleted.length > 2;
        const displayState = isCollapsed ? 'none' : 'block';
        const iconState = isCollapsed ? '▼ Zobrazit detaily' : '▲ Skrýt detaily';

        html += `
        <div style="margin-top: 12px; background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 6px; overflow: hidden;">
            <div onclick="const b = this.nextElementSibling; const i = this.querySelector('.toggle-icon'); if(b.style.display==='none'){b.style.display='block';i.textContent='▲ Skrýt detaily';}else{b.style.display='none';i.textContent='▼ Zobrazit detaily';}" 
                 style="padding: 10px 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s;"
                 onmouseover="this.style.background='rgba(239, 68, 68, 0.1)'" onmouseout="this.style.background='transparent'">
                <strong style="color: #ef4444; font-size: 0.85rem;">🗑️ Smazaná díla (${analysis.deleted.length})</strong>
                <span class="toggle-icon" style="color: #ef4444; font-size: 0.75rem; background: rgba(239, 68, 68, 0.15); padding: 4px 8px; border-radius: 4px; font-weight: bold;">${iconState}</span>
            </div>
            <div style="display: ${displayState}; padding: 0 12px 10px 12px; border-top: 1px dashed rgba(239, 68, 68, 0.2); margin-top: 2px; padding-top: 12px;">
                ${deletedText}
            </div>
        </div>`;
    }
    
    if (analysis.edited.length > 0) {
        const editedText = analysis.edited.map(k => {
            const orig = k.prodMatch ? k.prodMatch : (k._original ? k._original : null);
            if (!orig) return `<strong>${window.sanitize(k.dilo)}</strong>`;

            let changes = [];
            if (orig.dilo.trim() !== k.dilo.trim()) {
                changes.push(`Dílo: <strike style="opacity: 0.6;">${window.sanitize(orig.dilo)}</strike> ➔ <strong>${window.sanitize(k.dilo)}</strong>`);
            }
            if (orig.autor.trim() !== k.autor.trim()) {
                changes.push(`Autor: <strike style="opacity: 0.6;">${window.sanitize(orig.autor)}</strike> ➔ <strong>${window.sanitize(k.autor)}</strong>`);
            }
            if (orig.druh !== k.druh) {
                changes.push(`Druh: <strike style="opacity: 0.6;">${orig.druh}</strike> ➔ <strong>${k.druh}</strong>`);
            }
            if (orig.obdobi !== k.obdobi) {
                changes.push(`Období: <strike style="opacity: 0.6;">${window.MAPA_OBDOBI[orig.obdobi] || orig.obdobi}</strike> ➔ <strong>${window.MAPA_OBDOBI[k.obdobi] || k.obdobi}</strong>`);
            }

            return `<div style="margin-bottom: 8px; border-left: 2px solid var(--border); padding-left: 10px;">
                        <strong style="color: var(--text-main);">${window.sanitize(orig.dilo)}</strong><br>
                        <span style="font-size: 0.85em; color: var(--text-muted); line-height: 1.4;">${changes.join('<br>')}</span>
                    </div>`;
        }).join('');

        const isCollapsed = analysis.edited.length > 2;
        const displayState = isCollapsed ? 'none' : 'block';
        const iconState = isCollapsed ? '▼ Zobrazit detaily' : '▲ Skrýt detaily';

        html += `
        <div style="margin-top: 12px; background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 6px; overflow: hidden;">
            <div onclick="const b = this.nextElementSibling; const i = this.querySelector('.toggle-icon'); if(b.style.display==='none'){b.style.display='block';i.textContent='▲ Skrýt detaily';}else{b.style.display='none';i.textContent='▼ Zobrazit detaily';}" 
                 style="padding: 10px 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s;"
                 onmouseover="this.style.background='rgba(245, 158, 11, 0.1)'" onmouseout="this.style.background='transparent'">
                <strong style="color: #f59e0b; font-size: 0.85rem;">✏️ Detailní úpravy (${analysis.edited.length})</strong>
                <span class="toggle-icon" style="color: #f59e0b; font-size: 0.75rem; background: rgba(245, 158, 11, 0.15); padding: 4px 8px; border-radius: 4px; font-weight: bold;">${iconState}</span>
            </div>
            <div style="display: ${displayState}; padding: 0 12px 10px 12px; border-top: 1px dashed rgba(245, 158, 11, 0.2); margin-top: 2px; padding-top: 12px;">
                ${editedText}
            </div>
        </div>`;
    }

    if (analysis.manuallyMoved.length > 0) {
        html += `<div style="color: #f59e0b; font-size: 0.85rem; margin-top: 4px;"><strong>↕️ Manuálně přesunuto (${analysis.manuallyMoved.length}):</strong> ${analysis.manuallyMoved.map(k => window.sanitize(k.dilo)).join(', ')}</div>`;
    }
    if (analysis.cascadeMoved.length > 0) {
        html += `<div style="color: #3b82f6; font-size: 0.85rem; margin-top: 4px;"><strong>🌊 Kaskádově posunuto:</strong> ${analysis.cascadeMoved.length} děl.</div>`;
    }
    
    return html;
};

/**
 * Vygeneruje kompletní barevnou náhledovou tabulku se symetrickou legendou změn
 * @param {Array} draftDb - Databáze návrhu
 * @returns {string} HTML tabulka s legendou
 */
window.generateColoredPreviewTable = function(draftDb) {
    const analysis = window.analyzeDraftChanges(draftDb);
    let rowsHtml = "";
    let virtualView = [];

    draftDb.forEach((k) => {
        let state = 'normal';
        let origId = k.id; 
        if (analysis.added.find(a => a.id === k.id)) {
            state = 'added';
        } else {
            const prodBook = analysis.prodDb.find(p => p.dilo.toLowerCase().trim() === k.dilo.toLowerCase().trim());
            origId = prodBook ? prodBook.id : (k._original ? k._original.id : k.id);
            if (analysis.edited.find(e => e.id === k.id)) state = 'edited';
            else if (analysis.manuallyMoved.find(m => m.id === k.id)) state = 'manual_move';
            else if (analysis.cascadeMoved.find(c => c.id === k.id)) state = 'cascade_move';
        }
        virtualView.push({ ...k, visualId: k.id, state, origId });
    });

    analysis.deleted.forEach(p => {
        virtualView.push({ ...p, visualId: p.id, state: 'deleted', origId: p.id });
    });

    virtualView.sort((a, b) => {
        if (a.state === 'deleted' && b.state !== 'deleted') return (a.origId - 0.5) - b.visualId;
        if (a.state !== 'deleted' && b.state === 'deleted') return a.visualId - (b.origId - 0.5);
        if (a.state === 'deleted' && b.state === 'deleted') return a.origId - b.origId;
        return a.visualId - b.visualId;
    });

    virtualView.forEach(book => {
        let bg = 'transparent', leftBorder = '4px solid transparent', opacity = '1', idText = book.visualId + ".";

        if (book.state === 'deleted') { 
            bg = 'rgba(239, 68, 68, 0.04)'; leftBorder = '4px solid #ef4444'; opacity = '0.5'; idText = `<strike>${book.origId}.</strike>`; 
        } else if (book.state === 'added') { 
            bg = 'rgba(16, 185, 129, 0.06)'; leftBorder = '4px solid #10b981'; 
        } else if (book.state === 'edited' || book.state === 'manual_move') { 
            bg = 'rgba(245, 158, 11, 0.08)'; leftBorder = '4px solid #f59e0b'; 
        } else if (book.state === 'cascade_move') { 
            bg = 'rgba(59, 130, 246, 0.05)'; leftBorder = '4px solid #3b82f6'; 
        }

        rowsHtml += `
        <tr style="background: ${bg}; opacity: ${opacity}; border-bottom: 1px solid var(--border); transition: background 0.2s;" onmouseover="this.style.background='var(--bg-base)'" onmouseout="this.style.background='${bg}'">
            <td style="padding: 8px; text-align: center; color: var(--text-muted); border-left: ${leftBorder};">${idText}</td>
            <td style="padding: 8px; font-weight: bold; color: var(--text-main);">${window.sanitize(book.dilo)}</td>
            <td style="padding: 8px; color: var(--text-muted);">${window.sanitize(book.autor)}</td>
            <td style="padding: 8px; color: var(--text-muted); font-size: 0.9em;">${book.druh}</td>
            <td style="padding: 8px; color: var(--text-muted); font-size: 0.9em;">${window.MAPA_OBDOBI[book.obdobi] || book.obdobi}</td>
        </tr>`;
    });

    // Symetrický CSS Grid 2x2 pro legendu barev
    const legendHtml = `
        <div style="background: var(--bg-surface); padding: 12px; border-bottom: 1px solid var(--border); border-top: 1px solid var(--border); display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8rem;">
            <div style="color: #10b981; font-weight: bold; padding: 6px 8px; background: rgba(16, 185, 129, 0.1); border-radius: 4px; text-align: center; white-space: nowrap;">➕ Přidáno</div>
            <div style="color: #f59e0b; font-weight: bold; padding: 6px 8px; background: rgba(245, 158, 11, 0.1); border-radius: 4px; text-align: center; white-space: nowrap;">✏️ Upraveno/Přesunuto</div>
            <div style="color: #3b82f6; font-weight: bold; padding: 6px 8px; background: rgba(59, 130, 246, 0.1); border-radius: 4px; text-align: center; white-space: nowrap;">🌊 Kaskádový posun</div>
            <div style="color: #ef4444; font-weight: bold; padding: 6px 8px; background: rgba(239, 68, 68, 0.1); border-radius: 4px; text-align: center; white-space: nowrap;">🗑️ Smazáno</div>
        </div>`;

    return legendHtml + `
    <div style="max-height: 400px; overflow-y: auto; overflow-x: auto; -webkit-overflow-scrolling: touch;">
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem; min-width: 800px;">
            <thead style="background: #111827; border-bottom: 2px solid var(--accent-primary); position: sticky; top: 0; z-index: 10;">
                <tr>
                    <th style="padding: 8px; color: white; width: 8%;">ID</th>
                    <th style="padding: 8px; color: white; width: 35%;">Dílo</th>
                    <th style="padding: 8px; color: white; width: 25%;">Autor</th>
                    <th style="padding: 8px; color: white; width: 15%;">Druh</th>
                    <th style="padding: 8px; color: white; width: 17%;">Období</th>
                </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
        </table>
    </div>`;
};

window.Omega.diff = {
    analyzeDraftChanges: window.analyzeDraftChanges,
    generateDiffHtml: window.generateDiffHtml,
    generateColoredPreviewTable: window.generateColoredPreviewTable
};
