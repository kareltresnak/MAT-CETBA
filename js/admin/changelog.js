/**
 * OMEGA ADMIN: Changelog Engine (Release Notes)
 * Správa záznamů historie změn v administraci, přidávání verzí a přímý push do produkce.
 */

window.Omega = window.Omega || {};

window.adminChangelogDb = [];

/**
 * Vykreslí náhledy existujících záznamů verzí v administraci
 */
window.renderAdminChangelog = function() {
    const cont = document.getElementById('admin-changelog-preview');
    if (!cont) return;
    
    cont.innerHTML = window.adminChangelogDb.map((entry, idx) => {
        const sy = typeof window.getEffectiveSchoolYear === 'function' ? window.getEffectiveSchoolYear(entry.date) : '';
        return `
        <div style="padding: 10px; border: 1px solid var(--border); border-radius: 6px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; background: var(--bg-base);">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 1.2em;">📚</span>
                <strong>${window.sanitize(entry.version)}</strong>
                ${sy ? `<span style="font-size: 0.78rem; padding: 2px 8px; border-radius: 12px; background: color-mix(in srgb, var(--accent-primary) 15%, transparent); color: var(--accent-primary-light, var(--accent-primary)); font-weight: bold;">Šk. rok ${sy}</span>` : ''}
                <span style="opacity: 0.6; font-size: 0.82rem;">(${window.sanitize(entry.date)})</span>
            </div>
            <button onclick="adminDeleteChangelog(${idx})" style="background: transparent; border: none; color: var(--accent-red); cursor: pointer; padding: 5px;" title="Odstranit záznam">🗑️</button>
        </div>`;
    }).join('');
};

/**
 * Přidá nový záznam o verzi do historie
 */
window.adminAddChangelogEntry = function() {
    const verInput = document.getElementById('ch-version');
    const datInput = document.getElementById('ch-date');
    const notesInput = document.getElementById('ch-notes');

    const ver = verInput ? verInput.value.trim() : '';
    const dat = datInput ? datInput.value.trim() : '';
    const notes = notesInput ? notesInput.value.split('\n').filter(l => l.trim() !== "") : [];

    if (!ver || !dat || notes.length === 0) {
        return window.showToast("⚠️ Vyplňte kompletní údaje o verzi a poznámky.");
    }

    const formattedNotes = notes.map(n => `<div style="margin-bottom: 5px;">• ${window.sanitize(n)}</div>`);
    window.adminChangelogDb.unshift({ type: 'db', version: ver, date: dat, notes: formattedNotes });
    
    window.renderAdminChangelog();
    window.showToast("📄 Záznam přidán (nezapomeňte Uložit databázi).");
    if (notesInput) notesInput.value = '';
};

/**
 * Odstraní záznam z historie změn
 * @param {number} idx - Index v poli adminChangelogDb
 */
window.adminDeleteChangelog = function(idx) {
    window.adminChangelogDb.splice(idx, 1);
    window.renderAdminChangelog();
};

/**
 * Odešle pouze aktualizovaný changelog na Cloudflare Edge
 */
window.prepareChangelogExport = async function() {
    const turnstileInput = document.querySelector('[name="cf-turnstile-response"]');
    const turnstileToken = turnstileInput ? turnstileInput.value : null;

    if (!turnstileToken) {
        window.showToast("⚠️ Bezpečnostní systém Edge ještě nevygeneroval podpis.");
        return;
    }

    const oldChangelog = JSON.stringify(window.OMEGA_CONFIG?.CHANGELOG_DB || []);
    const newChangelog = JSON.stringify(window.adminChangelogDb);

    if (oldChangelog === newChangelog) {
        window.showToast("⚠️ V historii nejsou žádné nové neuložené změny.");
        return;
    }

    if (window.sessionCredentials.username === 'omega' && typeof window.createAutoSnapshot === 'function') {
        await window.createAutoSnapshot();
    }

    const currentDb = window.getKnihyDb();
    const formattedDbString = "[\n" + currentDb.map(book => `{ "id": ${book.id}, "origId": ${book.origId}, "dilo": ${JSON.stringify(book.dilo)}, "autor": ${JSON.stringify(book.autor)}, "druh": "${book.druh}", "obdobi": "${book.obdobi}" }`).join(',\n') + "\n    ]";
    const today = new Date().toLocaleDateString('cs-CZ');

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

    if (typeof window.pushToCloudflare === 'function') {
        window.pushToCloudflare(finalExportPayload, turnstileToken, "Aktualizace systému (Release Notes)");
    }
};

window.Omega.adminChangelog = {
    render: window.renderAdminChangelog,
    addEntry: window.adminAddChangelogEntry,
    deleteEntry: window.adminDeleteChangelog,
    prepareExport: window.prepareChangelogExport
};
