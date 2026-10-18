/**
 * OMEGA SHARED: Public Changelog Engine
 * Auto-detekce verze sestavení z cache a interaktivní zobrazení veřejného changelogu.
 */

window.Omega = window.Omega || {};

(function() {
    // 1. Zjištění verze z cache paměti pro patičku
    if ('caches' in window) {
        caches.keys().then(keys => {
            const cacheName = keys.find(key => key.includes('SPS_Selekce_MAT_CETBY'));
            const versionEl = document.getElementById('app-version-val');
            
            let finalVer = 'v' + (window.OMEGA_VERSION || '10.0.0');
            if (cacheName) {
                const version = cacheName.split('_').pop(); 
                finalVer = version.startsWith('v') ? version : 'v' + version;
            }
            if (versionEl) versionEl.textContent = finalVer;
        }).catch(() => {
            const versionEl = document.getElementById('app-version-val');
            if (versionEl) versionEl.textContent = 'v' + (window.OMEGA_VERSION || '10.0.0');
        });
    }

    // 2. Skrytí / Zobrazení tlačítka pro úpravy knih v patičce
    document.addEventListener('DOMContentLoaded', () => {
        const dbData = (window.OMEGA_CONFIG && window.OMEGA_CONFIG.CHANGELOG_DB) ? window.OMEGA_CONFIG.CHANGELOG_DB : [];
        const dbChanges = dbData.filter(i => i.type === 'db');
        const changelogBtn = document.getElementById('btn-public-changelog') || document.querySelector('button[onclick="openChangelog()"]');
        const btnLogText = document.getElementById('btn-public-changelog-text');

        if (changelogBtn) {
            if (dbChanges.length > 0) {
                changelogBtn.style.display = 'flex'; 
                changelogBtn.style.margin = '20px auto';
                changelogBtn.style.justifyContent = 'center';
                changelogBtn.style.width = 'fit-content';
                changelogBtn.style.padding = '8px 25px';
                if (btnLogText) btnLogText.textContent = 'Úpravy seznamu knih';
            } else {
                changelogBtn.style.display = 'none';
            }
        }
    });

    /**
     * Vypočítá školní rok, od kterého změna v seznamu nabývá účinnosti.
     * Pravidlo: Změny provedené mezi 1. 9. Y a 31. 8. (Y+1) nabývají platnost pro školní rok (Y+1)/(Y+2).
     * Příklad: Změna z 11. 6. 2026 -> Školní rok 2026/2027.
     * @param {string|Date} dateVal - Datum (řetězec "11. 6. 2026", "2026-06-11" nebo instance Date)
     * @returns {string} Text školního roku např. "2026/2027"
     */
    window.getEffectiveSchoolYear = function(dateVal) {
        let d;
        if (dateVal instanceof Date) {
            d = dateVal;
        } else if (typeof dateVal === 'string') {
            const czParts = dateVal.trim().match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
            if (czParts) {
                d = new Date(parseInt(czParts[3], 10), parseInt(czParts[2], 10) - 1, parseInt(czParts[1], 10));
            } else {
                d = new Date(dateVal);
            }
        }
        if (!d || isNaN(d.getTime())) {
            d = new Date();
        }

        const month = d.getMonth() + 1; // 1-12
        const year = d.getFullYear();

        if (month >= 9) {
            return `${year + 1}/${year + 2}`;
        } else {
            return `${year}/${year + 1}`;
        }
    };

    /**
     * Otevře modál s veřejnou historií změn v databázi děl
     */
    window.openChangelog = function() {
        const modal = document.getElementById('omega-changelog-modal');
        const dbData = (window.OMEGA_CONFIG && window.OMEGA_CONFIG.CHANGELOG_DB) ? window.OMEGA_CONFIG.CHANGELOG_DB : [];
        const dbChanges = dbData.filter(i => i.type === 'db');

        const gridStyles = `
            <style>
                .omega-history-grid {
                    display: flex !important;
                    align-items: center !important;
                    gap: 12px !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                }
                .omega-history-grid > strong:first-child {
                    font-size: 0.78rem !important;
                    font-weight: 800 !important;
                    font-family: monospace !important;
                    background: var(--bg-surface-hover) !important;
                    color: var(--text-muted) !important;
                    padding: 3px 8px !important;
                    border-radius: 6px !important;
                    border: 1px solid var(--border) !important;
                    white-space: nowrap !important;
                    flex-shrink: 0 !important;
                    margin-right: 6px !important;
                }
                .omega-history-grid > span:nth-child(2) {
                    font-weight: bold !important;
                    color: var(--text-main) !important;
                    font-size: 0.95rem !important;
                    margin-right: 8px !important;
                    white-space: normal !important;
                }
                .omega-history-grid > span:nth-child(3) {
                    color: var(--text-muted) !important;
                    font-size: 0.88rem !important;
                    margin-right: auto !important;
                    white-space: normal !important;
                }
                .omega-history-grid > span:nth-child(4),
                .omega-history-grid > span:nth-child(5) {
                    font-size: 0.75rem !important;
                    padding: 3px 8px !important;
                    border-radius: 6px !important;
                    white-space: nowrap !important;
                    background: var(--bg-surface) !important;
                    border: 1px solid var(--border) !important;
                    color: var(--text-muted) !important;
                    flex-shrink: 0 !important;
                }
                @media (max-width: 650px) {
                    .changelog-entry-body {
                        padding: 12px 10px !important;
                    }
                    .omega-history-grid {
                        display: flex !important;
                        flex-direction: row !important;
                        flex-wrap: wrap !important;
                        align-items: center !important;
                        gap: 4px 8px !important;
                        width: 100% !important;
                        padding: 2px 0 !important;
                    }
                    .omega-history-grid > strong:first-child {
                        margin: 0 !important;
                        flex-shrink: 0 !important;
                    }
                    .omega-history-grid > span:nth-child(2) {
                        font-weight: 700 !important;
                        color: var(--text-main) !important;
                        font-size: 0.95rem !important;
                        margin: 0 !important;
                        flex-grow: 1 !important;
                    }
                    .omega-history-grid > span:nth-child(3) {
                        flex-basis: 100% !important;
                        width: 100% !important;
                        margin: 0 0 2px 0 !important;
                        color: var(--text-muted) !important;
                        font-size: 0.85rem !important;
                    }
                    .omega-history-grid > span:nth-child(4),
                    .omega-history-grid > span:nth-child(5) {
                        font-size: 0.75rem !important;
                        padding: 2px 8px !important;
                        border-radius: 6px !important;
                        background: var(--bg-surface) !important;
                        border: 1px solid var(--border) !important;
                        color: var(--text-muted) !important;
                        margin: 0 !important;
                    }
                }
            </style>
        `;

        const renderHtml = gridStyles + dbChanges.map((entry, index) => {
            const isFirst = index === 0; 
            const contentDisplay = isFirst ? 'block' : 'none';
            const icon = isFirst ? '▲' : '▼';
            const effectiveYear = window.getEffectiveSchoolYear(entry.date);
            
            let rawNotes = Array.isArray(entry.notes) ? entry.notes.join('') : (entry.notes || '');
            rawNotes = rawNotes.replace(/<div style="display: grid; grid-template-columns: 55px[^>]+">/g, '<div class="omega-history-grid">');
            rawNotes = rawNotes.replace(/<div style="display: flex; flex-wrap: wrap; column-gap: 15px[^>]+">/g, '<div class="omega-history-grid">');
            rawNotes = rawNotes.replace(/<\/strong><span/g, '</strong> <span').replace(/<\/span><span/g, '</span> <span');

            return `
            <div style="margin-bottom: 14px; background: var(--bg-surface); border-radius: 10px; border: 1px solid var(--border); overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.08); transition: border-color 0.2s;">
                <div onclick="const body = this.nextElementSibling; const icon = this.querySelector('.toggle-icon'); if(body.style.display === 'none') { body.style.display = 'block'; icon.textContent = '▲'; } else { body.style.display = 'none'; icon.textContent = '▼'; }" 
                     style="padding: 11px 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface-hover); border-bottom: 1px solid var(--border); transition: background 0.2s;" 
                     onmouseover="this.style.background='var(--bg-active)'" 
                     onmouseout="this.style.background='var(--bg-surface-hover)'">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; text-align: left;">
                        <span style="background: var(--bg-surface); color: var(--text-main); font-weight: 700; font-size: 0.86rem; padding: 4px 10px; border-radius: 20px; border: 1px solid var(--border); display: inline-flex; align-items: center; gap: 6px;">
                            <span>🎓</span> <span>Platné od šk. roku <strong style="color: var(--accent-primary-light, var(--accent-primary)); font-weight: 800;">${effectiveYear}</strong></span>
                        </span>
                    </div>
                    <span class="toggle-icon" style="color: var(--text-muted); font-size: 0.85rem; font-weight: bold; padding-left: 10px;">${icon}</span>
                </div>
                <div class="changelog-entry-body" style="padding: 14px; display: ${contentDisplay}; background: var(--bg-surface);">
                    ${rawNotes}
                </div>
            </div>`;
        }).join('') || '<div style="color: var(--text-muted); font-style: italic; text-align: center; padding: 25px;">Zatím nebyly provedeny žádné úpravy v seznamu děl.</div>';

        const cont = document.getElementById('changelog-content');
        if (cont) cont.innerHTML = renderHtml;
        if (modal) modal.style.display = 'flex';
    };

    /**
     * Zavře modál veřejného changelogu
     */
    window.closeChangelog = function() {
        const modal = document.getElementById('omega-changelog-modal');
        if (modal) modal.style.display = 'none';
    };

    window.Omega.changelog = {
        open: window.openChangelog,
        close: window.closeChangelog,
        getEffectiveSchoolYear: window.getEffectiveSchoolYear
    };
})();
