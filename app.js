// ==========================================
// BEZPEČNOSTNÍ VRSTVA (XSS OCHRANA)
// ==========================================
function sanitize(str) {
    if (!str) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        "/": '&#x2F;'
    };
    const reg = /[&<>"'/]/ig;
    return str.replace(reg, (match) => (map[match]));
}
let waitingRoomTimer = null;
let pendingCreds = { u: "", p: "" }; // Dočasné úložiště pro čekajícího učitele
const MAPA_OBDOBI = { "do18": "Do konce 18. st.", "19": "19. století", "cz20": "ČR 20. a 21. st.", "svet20": "Svět 20. a 21. st." };
const STORAGE_KEY = 'kanon_selekce_state'; // Opět jen jeden pevný klíč
const KNIHY_DB = window.OMEGA_CONFIG.KNIHY_DB;
const REQUIREMENTS = window.OMEGA_CONFIG.REQUIREMENTS;
// 🖼️ OMEGA ASSET: SPŠPB Logo (Base64 pro spolehlivý tisk)
const OMEGA_LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAADNQTFRF////S0tLVVVVW1tbY2Njampqa2trdXV1e3t7gYGBiYmJkZGRmZmZqampra2tsbGxtbW1////9F/7bAAAABh0Uk5T////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................A98L6AAAAnHRFWHRDcmVhdGlvbiBUaW1lAFV0IDI4IG9yYyAyMDIyIDEyOjMxOjE5ICswMTAwM/b89AAAByh6VFh0U2lnbmF0dXJlAGYxNmMzNWM3NTQwMjVhNmI2MDdhODhhODRhMjZmMjA5MjYwNTRhYWNkOWIyZDZlODRiMDZkOTQzMWIwODUyZmMxU3L1AAAAAElFTkSuQmCC";
// ==========================================
// 🧬 ZERO-TRUST: GENERÁTOR KRYPTOGRAFICKÉ IDENTITY (NAT BYPASS)
// ==========================================
function getDeviceIdentity() {
    let deviceId = localStorage.getItem('omega_device_id');
    
    // Pokud zařízení ještě nemá identitu, vytvoříme absolutní entropii
    if (!deviceId) {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        deviceId = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        localStorage.setItem('omega_device_id', deviceId);
    }
    return deviceId;
}

/* ==========================================
   OMEGA TELEMETRY ENGINE
   ========================================== */
const OMEGA_VERSION = '9.0.0';

function trackOmegaEvent(eventName, eventData = {}) {
    if (typeof umami !== 'undefined') {
        umami.track(eventName, { version: OMEGA_VERSION, ...eventData });
    }
}

// ⏱️ OMEGA CHRONOMETRY ENGINE
const getOmegaChronology = () => {
    const now = new Date();
    const y = now.getFullYear();
    const startYear = now.getMonth() >= 8 ? y : y - 1;
    return {
        start: startYear,
        short1: startYear.toString().slice(-2),
        short2: (startYear + 1).toString().slice(-2),
        format: `${startYear}/${startYear + 1}`
    };
};

// ==========================================
// INSTITUCIONÁLNÍ BRANDING A THEME ENGINE
// ==========================================

// 1. 🛡️ URL SYNC: Adresa má vždy přednost před lokální pamětí
const urlInitParams = new URLSearchParams(window.location.search);
const themeFromUrl = urlInitParams.get('theme');

if (themeFromUrl) {
    // Pokud je v odkazu explicitní téma (např. někdo nám poslal link), uložíme ho jako pravdu
    localStorage.setItem('omega_theme', themeFromUrl);
}

// Nyní můžeme bezpečně načíst aktuální instituci
const currentRozcestnik = localStorage.getItem('omega_theme') || 'default';

// 2. Dynamická injekce loga (Pouze pro SPŠPB režim)
if (currentRozcestnik === 'spspb') {
    const brandEl = document.querySelector('.brand');
    if (brandEl && !document.getElementById('brand-logo')) {
        brandEl.innerHTML = `<img id="brand-logo" src="spspb-logo-2000px.png" alt="SPŠ Logo" style="height: 1.1em; vertical-align: text-bottom; margin-right: 8px; border-radius: 2px;">` + brandEl.innerHTML;
    }
}
// 2. State Machine pro Dark/Light Mode
const themeToggleBtns = document.querySelectorAll('.theme-switch');
const themeIcon = document.getElementById('theme-icon');

function applyColorTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('omega_color_theme', theme);
}

// Inicializace při startu: 1. LocalStorage -> 2. OS Preference -> 3. Dark default
const savedColorTheme = localStorage.getItem('omega_color_theme');
const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
const initialTheme = savedColorTheme || (systemPrefersLight ? 'light' : 'dark');
applyColorTheme(initialTheme);

// Event Listener na tlačítko
themeToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        applyColorTheme(newTheme);
        trackOmegaEvent('Theme_Switched', { mode: newTheme });
    });
});
// ==========================================


function generateDbHash(db) {
    const str = db.map(k => k.id + k.dilo).join('|');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0; 
    }
    return hash.toString(36); // Generuje např. "1j4k2a"
}
const DB_VERSION = generateDbHash(KNIHY_DB);


// Dynamická injekce formuláře a navázání event listenerů
document.getElementById('dynamic-form-container').innerHTML = window.OMEGA_CONFIG.FORM_HTML;

const rulesContainer = document.getElementById('school-rules');
if (rulesContainer) {
    rulesContainer.innerHTML = window.OMEGA_CONFIG.RULES_HTML || "";
}
const state = { 
    selectedIds: new Set(), 
    filters: { obdobi: null, druh: null }, 
    searchQuery: "",
    student: { name: "", dob: "", klasa: "", year: getOmegaChronology().format }, // Vynucený startovní rok
    showOnlyMyList: false
};

const elements = {
    tableBody: document.getElementById('table-body'),
    searchBox: document.getElementById('search-box'),
    btnReset: document.getElementById('btn-reset'),
    btnClear: document.getElementById('btn-clear'),
    btnExport: document.getElementById('btn-export'),
    statTotal: document.getElementById('stat-total'),
    btnScrollTop: document.getElementById('btn-scroll-top'),
    inputName: document.getElementById('student-name'),
    inputDob: document.getElementById('student-dob'),
    inputClass: document.getElementById('student-class'),
    inputYear: document.getElementById('student-year')
};

// ==========================================
// STATELESS TRANSFER A NOTIFIKACE
// ==========================================

let currentShareUrl = "";

window.showToast = function(message) {
    let toast = document.getElementById("toast");
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    
    // 🚀 OMEGA FIX: Měkčí design pro oba režimy (povrchová barva + akcent)
    toast.style.cssText = "position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%); background: var(--bg-surface); color: var(--text-main); border: 1px solid var(--accent-primary); padding: 12px 25px; border-radius: 8px; font-weight: bold; z-index: 2147483647; box-shadow: 0 10px 30px rgba(0,0,0,0.5); opacity: 1; transition: opacity 0.3s ease; pointer-events: none; text-align: center; white-space: nowrap;";

    setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
};

window.generateShareLink = function() {
    if (state.selectedIds.size === 0) {
        showToast("⚠️ Vyberte alespoň jednu knihu pro sdílení.");
        return;
    }
    
    // Sort zajišťuje deterministické URL (vždy stejný odkaz pro stejné knihy)
    const ids = Array.from(state.selectedIds).sort((a, b) => a - b).join('-');
    const currentTheme = localStorage.getItem('omega_theme') || 'default';
    const baseUrl = window.location.origin + window.location.pathname;
    currentShareUrl = `${baseUrl}?theme=${currentTheme}&v=${DB_VERSION}&p=${ids}`;

    document.getElementById("share-modal").style.display = "flex";

    const qrBox = document.getElementById("qr-code-box");
    qrBox.innerHTML = ""; 
    
    new QRCode(qrBox, {
        text: currentShareUrl,
        width: 400, 
        height: 400,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.M 
    });

    trackOmegaEvent('Share_QR_Created', { books_count: state.selectedIds.size });

};

window.closeShareModal = function() {
    document.getElementById("share-modal").style.display = "none";
};

window.copyShareUrl = function() {
    navigator.clipboard.writeText(currentShareUrl).then(() => {
        showToast("✅ Odkaz zkopírován do schránky");
        trackOmegaEvent('Share_Link_Copied');
        closeShareModal();
    }).catch(err => {
        console.error("Schránka selhala: ", err);
        showToast("❌ Chyba při kopírování");
    });
};

window.downloadQR = function() {
    const qrCanvas = document.querySelector("#qr-code-box canvas");
    if (!qrCanvas) {
        showToast("⚠️ QR kód se ještě nevygeneroval.");
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
    
    showToast("⬇️ Stahování zahájeno");
};

// ==========================================
// PREVIEW SANDBOX (SMART IMPORT ENGINE)
// ==========================================

function loadStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    const payload = params.get('p');
    const currentTheme = localStorage.getItem('omega_theme') || 'default';
    const incomingVersion = params.get('v');
    
    if (!payload) return;

    trackOmegaEvent('Import_Loaded', { method: 'URL_Payload' });

    const ids = payload.split('-').map(Number);
    const validIds = ids.filter(id => KNIHY_DB.some(k => k.id === id));
    
    if (validIds.length === 0) return;

    // Odstranění payload parametru z URL (ponechá pouze aktivní téma)
    window.history.replaceState({}, document.title, window.location.pathname + "?theme=" + currentTheme);

    // 🛡️ HARD BLOCK: Kontrola kompatibility odkazů
    if (incomingVersion !== DB_VERSION) {
        document.getElementById('outdated-modal').style.display = 'flex';
        return; // Zastaví celý import
    }

    // Krok 1: Výpočet nových děl
    const newBooksCount = validIds.filter(id => !state.selectedIds.has(id)).length;
    
    if (newBooksCount === 0 && state.selectedIds.size === validIds.length) {
        setTimeout(() => showToast("ℹ️ Odkaz obsahuje identický seznam, jaký už máte."), 500);
        return;
    }

    // Krok 2: Vykreslení Preview Modalu
    showPreviewModal(validIds, newBooksCount);
}

function showPreviewModal(importedIds, newCount) {
    const modal = document.getElementById("preview-modal");
    const metaEl = document.getElementById("preview-meta");
    const listEl = document.getElementById("preview-list");
    const validationEl = document.getElementById("preview-validation");

    const importedBooks = importedIds.map(id => KNIHY_DB.find(k => k.id === id)).sort((a, b) => a.id - b.id);

    // Virtuální simulace platnosti cizího seznamu
    const stats = { do18: 0, "19": 0, svet20: 0, cz20: 0, lyrika: 0, epika: 0, drama: 0 };
    importedBooks.forEach(k => {
        stats[k.obdobi]++;
        stats[k.druh]++;
    });

    const isFullyValid = importedIds.length === 20 && 
                         stats.do18 >= REQUIREMENTS.do18 && stats["19"] >= REQUIREMENTS["19"] && 
                         stats.svet20 >= REQUIREMENTS.svet20 && stats.cz20 >= REQUIREMENTS.cz20 &&
                         stats.lyrika >= REQUIREMENTS.lyrika && stats.epika >= REQUIREMENTS.epika && stats.drama >= REQUIREMENTS.drama;

    // Metainformace s přesnou analytikou
    let text = `Odkaz obsahuje <strong>${importedIds.length} děl</strong>`;
    if (state.selectedIds.size > 0) {
        text += ` (z toho ${newCount} děl ve vašem seznamu není).`;
    } else {
        text += ".";
    }
    metaEl.innerHTML = text;

    // Vykreslení validace s institucionálními barvami
    if (isFullyValid) {
        validationEl.innerHTML = `<span style="background: rgba(34, 197, 94, 0.1); color: var(--accent-green); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--accent-green); font-size: 0.8rem; font-weight: bold;">✅ Seznam splňuje všechna maturitní kritéria</span>`;
    } else {
        validationEl.innerHTML = `<span style="background: rgba(239, 68, 68, 0.1); color: var(--accent-red); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--accent-red); font-size: 0.8rem; font-weight: bold;">⚠️ Odkaz NESPLŇUJE všechna kritéria</span>`;
    }

    // Vykreslení posuvného seznamu
    // Vykreslení posuvného seznamu
    listEl.innerHTML = importedBooks.map((k) => {
        const alreadyHave = state.selectedIds.has(k.id);
        return `<div style="padding: 6px 0; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
            <span style="color: ${alreadyHave ? 'var(--text-muted)' : 'var(--text-main)'};">
                <strong>${k.id}.</strong> ${sanitize(k.dilo)} <small style="opacity:0.7">(${sanitize(k.autor)})</small>
            </span>
            ${alreadyHave ? '<span style="font-size: 0.7rem; color: var(--accent-green);">Již máte</span>' : '<span style="font-size: 0.7rem; color: var(--accent-primary-light);">Nové</span>'}
        </div>`;
    }).join('');

    modal.style.display = "flex";

    // Akce: PŘEPSAT SEZNAM
    document.getElementById("btn-import-replace").onclick = () => {
        state.selectedIds.clear();
        importedIds.forEach(id => state.selectedIds.add(id));
        finalizeImport(`✅ Seznam přepsán. Načteno ${importedIds.length} děl.`);
    };

    // Akce: DOPLNIT CHYBĚJÍCÍ (Sloučení)
    document.getElementById("btn-import-merge").onclick = () => {
        let addedCount = 0;
        let overflow = false;
        importedIds.forEach(id => {
            if (state.selectedIds.size < 20) {
                if (!state.selectedIds.has(id)) {
                    state.selectedIds.add(id);
                    addedCount++;
                }
            } else if (!state.selectedIds.has(id)) {
                overflow = true;
            }
        });
        
        let msg = `✅ Doplněno ${addedCount} nových děl.`;
        if (overflow) msg += " (Některá z odkazu přeskočena kvůli limitu 20).";
        if (addedCount === 0 && !overflow) msg = "ℹ️ Žádná nová díla nebyla přidána.";
        finalizeImport(msg);
    };
}

function finalizeImport(toastMsg) {
    saveState();
    renderTable();
    updateStatsAndSidebar();
    closePreviewModal();
    setTimeout(() => showToast(toastMsg), 300);
}

window.closePreviewModal = function() {
    document.getElementById("preview-modal").style.display = "none";
};


// ======= LOCAL STORAGE: SERIALIZACE A DESERIALIZACE =======
function saveState() {
    const stateToSave = {
        v: DB_VERSION, // 🛡️ Uložení otisku aktuálních osnov
        selectedIds: Array.from(state.selectedIds),
        filters: state.filters,
        student: state.student
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
}
// 🛡️ OMEGA MEMORY: Obnova paměti a pre-fill
function loadState() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    const chrono = getOmegaChronology();

    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            
            if (parsed.v && parsed.v !== DB_VERSION) {
                console.warn("Detekována mutace osnov. Paměť vymazána.");
                localStorage.removeItem(STORAGE_KEY);
                setTimeout(() => showToast("⚠️ Maturitní seznam byl školou aktualizován. Váš výběr byl resetován."), 1000);
                return; 
            }

            if (Array.isArray(parsed.selectedIds)) {
                state.selectedIds = new Set(parsed.selectedIds.map(Number));
            }
            
            if (parsed.filters) state.filters = parsed.filters;
            
            if (parsed.student) {
                state.student = parsed.student;
                window.OMEGA_CONFIG.FORM_FIELDS.forEach(key => {
                    const el = document.getElementById(`student-${key}`);
                    if (el) {
                        if (key === 'year' && state.student.year) {
                            const match = state.student.year.match(/^20(\d{2})\/20(\d{2})$/);
                            if (match) {
                                el.value = match[1];
                                const nextSpan = document.getElementById('student-year-next');
                                if (nextSpan) nextSpan.textContent = match[2];
                            } else {
                                state.student.year = chrono.format;
                                el.value = chrono.short1;
                                const nextSpan = document.getElementById('student-year-next');
                                if (nextSpan) nextSpan.textContent = chrono.short2;
                            }
                        } else {
                            el.value = state.student[key] || "";
                        }
                    }
                });
            } else {
                preFillChronology();
            }
        } catch (error) {
            localStorage.removeItem(STORAGE_KEY);
            preFillChronology();
        }
    } else {
        preFillChronology();
    }
}

// ⏱️ OMEGA CHRONOMETRY: Deterministický pre-fill hodnot
function preFillChronology() {
    const chrono = getOmegaChronology();
    const el = document.getElementById('student-year');
    const nextSpan = document.getElementById('student-year-next');
    
    if (el) el.value = chrono.short1; // 🚀 Vynucená HODNOTA (ne placeholder)
    if (nextSpan) nextSpan.textContent = chrono.short2;
    
    // Zapíšeme defaultní hodnotu i do stavu aplikace
    state.student.year = chrono.format;
    saveState();
}

// Data-binding pro osobní údaje s OMEGA Kvantovou Validací
window.OMEGA_CONFIG.FORM_FIELDS.forEach(key => {
    const el = document.getElementById(`student-${key}`);
    if (el) {
        el.addEventListener('input', (e) => {
            let val = e.target.value;
            
            if (key === 'name') {
                // 🛡️ OMEGA PURIFIER: Povolí pouze písmena, mezery a pomlčky.
                val = val.replace(/[^a-zA-ZěščřžýáíéóúůďťňĚŠČŘŽÝÁÍÉÓÚŮĎŤŇ\s-]/g, '')
                         .replace(/\s{2,}/g, ' ') // Zploštění vícenásobných mezer
                         .trimStart();
                el.value = val;
                
                // Oprava: Odřízneme mezery na konci, než zkontrolujeme, zda je jméno ze dvou slov
                const isValid = val.trim().length >= 5 && val.trim().includes(' ');
                el.style.borderColor = (val === '' || isValid) ? 'var(--border)' : 'var(--accent-red)';
            } else if (key === 'class') {
                // ... (ponech CapsLock pro třídu beze změny)
                val = val.toUpperCase().replace(/\s/g, '');
                el.value = val;
                const isValid = /^[1-4]\.(IT|EA|EB|EM|SP|PA|PB)$/.test(val);
                el.style.borderColor = (val === '' || isValid) ? 'var(--border)' : 'var(--accent-red)';
            
            } else if (key === 'dob') {
                val = val.replace(/^0+([1-9])/, '$1').replace(/\.\s*0+([1-9])/g, '. $1').replace(/\s+/g, ' ').replace(/\.([^\s])/g, '. $1').trim();
                el.value = val;

                let isValid = false;
                const dobMatch = val.match(/^([1-9]|[12][0-9]|3[01])\.\s*([1-9]|1[0-2])\.\s*(\d{4})$/);
                
                if (dobMatch) {
                    const bYear = parseInt(dobMatch[3], 10);
                    const currentY = getOmegaChronology().start;
                    
                    // 🛡️ OMEGA DYNAMIC BOUNDS: Věk 14 až 21 let
                    if (bYear >= (currentY - 21) && bYear <= (currentY - 14)) {
                        isValid = true;
                    }
                }
                
                el.style.borderColor = (val === '' || isValid) ? 'var(--border)' : 'var(--accent-red)';
            
            } else if (key === 'year') {
                // Vezme pouze 2 číslice
                val = val.replace(/\D/g, '').slice(0, 2);
                el.value = val;

                const nextSpan = document.getElementById('student-year-next');
                let isValid = false;

                if (val.length === 2) {
                    const y1 = parseInt("20" + val, 10);
                    isValid = true;
                    // 🚀 OMEGA FIX: Přechod století (celé 4 číslice)
                    const y2Full = (y1 + 1).toString();
                    
                    if (nextSpan) nextSpan.textContent = y2Full;
                    state.student.year = `${y1}/${y2Full}`; // Uloží plný formát
                } else {
                    if (nextSpan) nextSpan.textContent = "----";
                    state.student.year = "";
                }

                el.style.borderBottomColor = (val === '' || isValid) ? 'var(--accent-primary)' : 'var(--accent-red)';
                
                saveState();
                if (typeof updateStatsAndSidebar === 'function') updateStatsAndSidebar();
                return; 
            }

            state.student[key] = val;
            saveState();
            updateStatsAndSidebar(); // Real-time přepočet
        });
    }
});

// ======= NATIVNÍ TAB FOCUS TRAP =======
document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== elements.searchBox) {
        if (document.activeElement.tagName === 'INPUT') return; 
        e.preventDefault();
        elements.searchBox.focus();
        return;
    }

    if (e.key === 'Tab') {
        const focusable = Array.from(document.querySelectorAll(
            'input, .accordion-summary, #table-body tr[tabindex="0"], .sidebar button:not([disabled])'
        )).filter(el => el !== null && (el.offsetWidth > 0 || el.offsetHeight > 0));

        if (focusable.length === 0) return;

        const firstEl = focusable[0];
        const lastEl = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
        }
    }
});

function renderTable() {
    const q = state.searchQuery.toLowerCase().trim();
    const filtered = KNIHY_DB.filter(kniha => {
        // 🚀 OMEGA FIX 1: Hlavní propust "Můj výběr" - zařízne vše, co není ve state.selectedIds
        if (state.showOnlyMyList && !state.selectedIds.has(kniha.id)) return false;
        if (state.filters.obdobi && state.filters.obdobi !== kniha.obdobi) return false;
        if (state.filters.druh && state.filters.druh !== kniha.druh) return false;
        if (q && !(kniha.dilo.toLowerCase().includes(q) || kniha.autor.toLowerCase().includes(q))) return false;
        return true;
    });

    const tableEl = document.getElementById('data-table');
    const emptyStateEl = document.getElementById('empty-search-state');

    // UX: Empty State Logic
    if (filtered.length === 0) {
        tableEl.style.display = 'none';
        if (emptyStateEl) emptyStateEl.style.display = 'block'; // 🛡️ Ochrana proti null pointeru

            // 🚀 OMEGA FIX 2: Dynamická zpráva pro uživatele
            if (state.showOnlyMyList && state.selectedIds.size === 0) {
                emptyStateEl.innerHTML = `<h3>Váš seznam je prázdný</h3><p>Nejprve si vyberte díla kliknutím na řádky v databázi.</p>`;
            } else {
                emptyStateEl.innerHTML = `<h3>Nic nenalezeno</h3><p>Zkuste upravit filtry nebo vyhledávání.</p>`;
            }

        elements.tableBody.innerHTML = '';
        return;
    } else {
        tableEl.style.display = 'table';
        if (emptyStateEl) emptyStateEl.style.display = 'none';  // 🛡️ Ochrana proti null pointeru
    }

    // UX: Funkce pro zvýraznění textu (Highlighting)
    const highlight = (text) => {
        if (!q) return text;
        const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    };

    elements.tableBody.innerHTML = filtered.map((kniha, index) => {
        const isSelected = state.selectedIds.has(kniha.id);
        const tIndex = index === 0 ? "0" : "-1";
        return `
            <tr data-id="${kniha.id}" class="${isSelected ? 'selected' : ''}" tabindex="${tIndex}">
                <td>${kniha.id}</td>
                <td>${isSelected ? '✔ ' : ''}${highlight(sanitize(kniha.dilo))}</td>
                <td>${highlight(sanitize(kniha.autor))}</td>
                <td>${kniha.druh}</td>
                <td>${MAPA_OBDOBI[kniha.obdobi]}</td>
            </tr>
        `;
    }).join('');
}

// OMEGA Kvantové vyhledávání (Debouncing)
let searchTelemetryTimeout;
elements.searchBox.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderTable();

    // 🎯 TELEMETRIE: Vyhledávání (odešle se, až když uživatel na 1.5s přestane psát)
    clearTimeout(searchTelemetryTimeout);
    if (state.searchQuery.trim().length > 1) {
        searchTelemetryTimeout = setTimeout(() => {
            trackOmegaEvent('Search_Used', { query_length: state.searchQuery.length });
            
            // Sledování slepých uliček
            if (document.getElementById('empty-search-state').style.display === 'block') {
                trackOmegaEvent('Search_Zero_Results');
            }
        }, 1500);
    }
});

function updateStatsAndSidebar() {
    const stats = { do18: 0, "19": 0, svet20: 0, cz20: 0, lyrika: 0, epika: 0, drama: 0 };
    
    state.selectedIds.forEach(id => {
        const kniha = KNIHY_DB.find(k => k.id === id);
        if (kniha) {
            stats[kniha.obdobi]++; 
            stats[kniha.druh]++;
        } else {
            state.selectedIds.delete(id);
        }
    });

    const total = state.selectedIds.size;
    let isFullyValid = total === 20;
    
    for (const key in REQUIREMENTS) {
        if ((stats[key] || 0) < REQUIREMENTS[key]) {
            isFullyValid = false;
            break;
        }
    }
    // ======= INVERSION OF CONTROL: EXTERNÍ VALIDACE & PII STRICT MODE =======
    let customErrorsHtml = "";
    let localErrors = [];
    let emptyFields = 0; // Agregátor prázdných polí

    const nameVal = state.student.name || "";
    const classVal = state.student.class || "";
    const yearVal = state.student.year || "";
    const dobVal = state.student.dob || "";
    const chrono = getOmegaChronology();

    // 1. Jméno
    if (!nameVal) emptyFields++;
    else if (nameVal.trim().length < 5 || !nameVal.trim().includes(' ')) {
        localErrors.push("Jméno musí obsahovat i příjmení.");
    }

    // 2. Datum narození s dynamickou kontrolou věku
    if (!dobVal) emptyFields++;
    else {
        const dobMatch = dobVal.match(/^([1-9]|[12][0-9]|3[01])\.\s*([1-9]|1[0-2])\.\s*(\d{4})$/);
        if (!dobMatch) {
            localErrors.push("Datum narození musí být bez nul (např. 1. 1. 2005).");
        } else {
            const bYear = parseInt(dobMatch[3], 10);
            const minYear = chrono.start - 21;
            const maxYear = chrono.start - 14;
            
            if (bYear < minYear || bYear > maxYear) {
                localErrors.push(`Věková anomálie: Rok narození musí ležet v intervalu ${minYear} až ${maxYear}.`);
            }
        }
    }

    // 3. Třída
    if (!classVal) emptyFields++;
    else if (!/^[1-4]\.(IT|EA|EB|EM|SP|PA|PB)$/.test(classVal)) {
        localErrors.push("Třída musí být ve formátu 'Ročník.Obor' (např. 4.IT).");
    }

    // 4. Školní rok
    if (!yearVal) emptyFields++;
    else {
        const yearMatch = yearVal.match(/^(\d{4})\/(\d{4})$/);
        if (!yearMatch || parseInt(yearMatch[2], 10) !== parseInt(yearMatch[1], 10) + 1) {
            localErrors.push("Školní rok není kompletní.");
        } else {
            const y1 = parseInt(yearMatch[1], 10);
            if (y1 < chrono.start || y1 > chrono.start + 3) {
                localErrors.push(`Časová anomálie: Školní rok je omezen na interval ${chrono.start}/${chrono.start + 1} až ${chrono.start + 3}/${chrono.start + 4}`);
            }
        }
    }

    // UX: Konsolidace prázdných polí do jedné jediné výzvy
    if (emptyFields > 0) {
        isFullyValid = false;
        localErrors.unshift("Doplňte chybějící osobní údaje.");
    }
    
    if (localErrors.length > 0) {
        isFullyValid = false;
    }

    const selectedBooks = Array.from(state.selectedIds).map(id => KNIHY_DB.find(k => k.id === id));
    if (typeof window.OMEGA_CONFIG.customValidation === 'function') {
        const validation = window.OMEGA_CONFIG.customValidation(selectedBooks);
        if (!validation.isValid) {
            isFullyValid = false;
            localErrors.push(...validation.errors);
        }
    }

    if (localErrors.length > 0) {
        customErrorsHtml = localErrors.map(err => `<div>❌ ${err}</div>`).join('');
    }

    const errorBox = document.getElementById('validation-errors');
    if (errorBox) {
        errorBox.innerHTML = customErrorsHtml;
        errorBox.style.display = customErrorsHtml ? "block" : "none";
    }
    // ======================================================
    elements.statTotal.textContent = total;
    
    const box = document.getElementById('stat-total-container');
    if (isFullyValid) {
        box.style.borderColor = "var(--accent-green)";
    } else if (total === 20) {
        box.style.borderColor = "var(--accent-red)";
    } else {
        box.style.borderColor = "var(--border)";
    }
    const navBadge = document.getElementById('nav-badge-count');
    if (navBadge) {
        navBadge.textContent = total;
        if (isFullyValid) {
            navBadge.style.backgroundColor = "var(--accent-green)";
            navBadge.style.color = "#000";
        } else if (total === 20) {
            navBadge.style.backgroundColor = "var(--accent-red)";
            navBadge.style.color = "#fff";
        } else {
            navBadge.style.backgroundColor = "var(--border)";
            navBadge.style.color = "#fff";
        }
    }
    if (isFullyValid) {
        elements.btnExport.removeAttribute('disabled');
    } else {
        elements.btnExport.setAttribute('disabled', 'true');
    }

    // 1. Změna selektoru, aby ignoroval samostatné tlačítko Můj Výběr
    document.querySelectorAll('.filter-group .filter-btn').forEach(btn => {
        const type = btn.parentElement.dataset.type;
        const val = btn.dataset.val;
        if (state.filters[type] === val) btn.classList.add('active');
        else btn.classList.remove('active');

        const badge = btn.querySelector('.badge');
        const current = stats[val] || 0;
        const req = REQUIREMENTS[val];
        badge.textContent = `${current}/${req}`;
        badge.className = `badge ${current >= req ? 'ok' : 'fail'}`;
    });

    // 2. Manuální aktualizace odznaku pro Můj výběr
    const mylistBadge = document.getElementById('badge-mylist-count');
    if (mylistBadge) {
        mylistBadge.textContent = `${total}/20`;
        // Modrý/červený odznak se přizpůsobí tomu, zda už máš hotovo
        mylistBadge.className = `badge ${total === 20 ? 'ok' : 'fail'}`; 
    }
}

window.toggleBook = function(id) {
    if (state.selectedIds.has(id)) {
        state.selectedIds.delete(id);
    } else {
        if (state.selectedIds.size >= 20) {
            showToast("⚠️ Kapacita naplněna (20). Odstraňte některé dílo.");
            return;
        }
        state.selectedIds.add(id);
    }
    
    const focusedRow = document.activeElement;
    const focusedId = focusedRow && focusedRow.tagName === 'TR' ? focusedRow.dataset.id : null;
    
    renderTable();
    updateStatsAndSidebar();
    saveState(); 

    if (focusedId) {
        const rows = Array.from(elements.tableBody.querySelectorAll('tr'));
        rows.forEach(r => r.setAttribute('tabindex', '-1'));
        const rowToFocus = elements.tableBody.querySelector(`tr[data-id="${focusedId}"]`);
        if (rowToFocus) {
            rowToFocus.setAttribute('tabindex', '0');
            rowToFocus.focus();
        } else if (rows.length > 0) {
            rows[0].setAttribute('tabindex', '0');
        }
    }
}

elements.tableBody.addEventListener('click', (e) => {
    const tr = e.target.closest('tr');
    if (tr) toggleBook(parseInt(tr.dataset.id, 10));
});

elements.tableBody.addEventListener('keydown', (e) => {
    const currentTr = e.target.closest('tr');
    if (!currentTr) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextTr = currentTr.nextElementSibling;
        if (nextTr) {
            currentTr.setAttribute('tabindex', '-1');
            currentTr.setAttribute('tabindex', '0');
            nextTr.focus();
            nextTr.scrollIntoView({ block: 'nearest' });
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevTr = currentTr.previousElementSibling;
        if (prevTr) {
            currentTr.setAttribute('tabindex', '-1');
            currentTr.setAttribute('tabindex', '0');
            prevTr.focus();
            prevTr.scrollIntoView({ block: 'nearest' });
        }
    } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleBook(parseInt(currentTr.dataset.id, 10));
    }
});

elements.searchBox.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderTable();
});

elements.searchBox.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        state.searchQuery = "";
        elements.searchBox.value = "";
        renderTable();
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const firstRow = elements.tableBody.querySelector('tr');
        if (firstRow) firstRow.focus();
    }
});



// 1. Klikání na období a druhy (Striktní omezení na filter-group)
document.querySelectorAll('.filter-group .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.parentElement.dataset.type;
        const val = btn.dataset.val;
        state.filters[type] = (state.filters[type] === val) ? null : val;
        renderTable();
        updateStatsAndSidebar();
        saveState(); 
    });
});

// 2. Klikání na "Můj Výběr" (Zavolá se jen jednou při startu!)
const btnFilterMyList = document.getElementById('btn-filter-mylist');
if (btnFilterMyList) {
    btnFilterMyList.addEventListener('click', () => {
        state.showOnlyMyList = !state.showOnlyMyList;
        
        if (state.showOnlyMyList) {
            btnFilterMyList.classList.add('active');
        } else {
            btnFilterMyList.classList.remove('active');
        }
        
        if (typeof renderTable === 'function') renderTable();
        if (typeof trackOmegaEvent === 'function') trackOmegaEvent('Filter_MyList_Toggled', { active: state.showOnlyMyList });
    });
}

elements.btnReset.addEventListener('click', () => {
    // Reset standardních filtrů
    state.filters = { obdobi: null, druh: null };
    state.searchQuery = "";
    elements.searchBox.value = "";
    
    // 🚀 OMEGA FIX: Reset filtru Můj seznam
    state.showOnlyMyList = false;
    const btnFilterMyList = document.getElementById('btn-filter-mylist');
    if (btnFilterMyList) btnFilterMyList.classList.remove('active');

    renderTable();
    updateStatsAndSidebar();
    saveState(); 
});

// ======= ASYNCHRONNÍ DESTRUKCE STAVU (GRANULÁRNÍ) =======

// Modul 1: Výmaz samotných knih
const clearListLogic = () => {
    state.selectedIds.clear();
    renderTable();
    updateStatsAndSidebar();
};

// Modul 2: Výmaz PII (osobních údajů) - Robustní verze
const clearDataLogic = () => {
    const chrono = getOmegaChronology();
    state.student = { name: "", dob: "", klasa: "", year: chrono.format };

    window.OMEGA_CONFIG.FORM_FIELDS.forEach(key => {
        const el = document.getElementById(`student-${key}`);
        if (el) {
            if (key === 'year') {
                el.value = chrono.short1;
                const nextSpan = document.getElementById('student-year-next');
                if (nextSpan) nextSpan.textContent = chrono.short2;
                el.style.borderBottomColor = 'var(--accent-primary)'; // 🛡️ Reset červené čáry
            } else {
                el.value = "";
                el.style.borderColor = 'var(--border)'; // 🛡️ Reset červených okrajů
            }
        }
    });
};

// Hlavní trigger (otevře okno, i když je seznam prázdný, protože mohou chtít smazat údaje)
elements.btnClear.addEventListener('click', () => {
    document.getElementById("clear-modal").style.display = "flex";
});

window.closeClearModal = function() {
    document.getElementById("clear-modal").style.display = "none";
};

// Akce A: Jen knihy
document.getElementById("btn-clear-list").addEventListener('click', () => {
    if (state.selectedIds.size === 0) {
        showToast("ℹ️ Váš seznam knih je již prázdný.");
    } else {
        clearListLogic();
        saveState();
        showToast("🗑️ Seznam knih byl úspěšně vymazán.");
    }
    closeClearModal();
});

// Akce B: Jen osobní údaje
document.getElementById("btn-clear-data").addEventListener('click', () => {
    clearDataLogic();
    saveState();
    updateStatsAndSidebar(); // 🚀 Exaktní synchronizace s UI (smazání fantomové chyby)
    closeClearModal();
    showToast("🗑️ Osobní údaje byly vymazány.");
});

// Akce C: Nukleární reset (Vše)
document.getElementById("btn-clear-all").addEventListener('click', () => {
    clearListLogic();
    clearDataLogic();
    saveState();
    updateStatsAndSidebar(); // 🚀 Exaktní synchronizace s UI
    closeClearModal();
    showToast("☢️ Kompletní paměť byla vymazána.");
});

// ======= GENERÁTOR DOKUMENTŮ (Nativní Studentský Tisk) =======
elements.btnExport.addEventListener('click', () => {
    if (elements.btnExport.disabled) return;

    try {
        const selectedBooks = Array.from(state.selectedIds)
            .map(id => KNIHY_DB.find(k => k.id === id))
            .sort((a, b) => a.id - b.id);

        const printArea = document.getElementById('print-area');

        // 🚀 OMEGA FIX: Injekce dokumentu + izolované CSS výhradně pro studenta
        printArea.innerHTML = `
            <style>
                @media print {
                    /* Schová kompletně celou aplikaci kromě tiskové vrstvy */
                    .layout, .mobile-nav, #toast, #share-modal, #preview-modal, #clear-modal, #omega-admin-portal, .fab-btn, #admin-print-editor-modal {
                        display: none !important;
                    }
                    body {
                        background: white !important;
                        overflow: visible !important;
                    }
                    #print-area {
                        display: block !important;
                        visibility: visible !important;
                        background: white !important;
                        color: black !important;
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                    }
                    #print-area * {
                        color: black !important;
                        visibility: visible !important;
                        text-shadow: none !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            </style>
            ${window.OMEGA_CONFIG.renderPdf(selectedBooks, state.student, sanitize)}
        `;

        trackOmegaEvent('Export_PDF_Generated', { books_count: state.selectedIds.size });

        // Krátká prodleva pro aplikaci CSS
        setTimeout(() => {
            window.print();
        }, 150);

    } catch (error) {
        console.error("Print Engine Error:", error);
        showToast("❌ Chyba tisku: " + error.message);
    }
});

let deferredPrompt;
const installBtn = document.getElementById('btn-pwa-install');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.hidden = false;
});

if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('PWA: Aplikace byla nainstalována');
        }
        deferredPrompt = null;
        installBtn.hidden = true;
    });
}

window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.hidden = true;
});

window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        elements.btnScrollTop?.classList.add('visible');
    } else {
        elements.btnScrollTop?.classList.remove('visible');
    }
}, { passive: true });

// 🛡️ OMEGA PRINT HOOK: Automatická příprava vrstvy před tiskem
window.addEventListener('beforeprint', () => {
    if (typeof window.prepareOmegaPrintLayer === 'function') {
        window.prepareOmegaPrintLayer();
    }
});

elements.btnScrollTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ==========================================
// AUTO-DETEKCE VERZE (Z CACHE API)
// ==========================================

// Auto-detekce a propsání do tlačítka
if ('caches' in window) {
    caches.keys().then(keys => {
        const cacheName = keys.find(key => key.includes('SPS_Selekce_MAT_CETBY'));
        const versionEl = document.getElementById('app-version-val');
        const btnLogText = document.getElementById('btn-public-changelog-text'); // 🚀 OMEGA FIX: Míříme jen na text!
        
        let finalVer = 'v' + OMEGA_VERSION;
        if (cacheName) {
            const version = cacheName.split('_').pop(); 
            finalVer = version.startsWith('v') ? version : 'v' + version;
        }
        
        if (versionEl) versionEl.textContent = finalVer;
        if (btnLogText) btnLogText.textContent = 'Release Notes ' + finalVer; // Dynamický text
    }).catch(err => {
        // Fallback pro případ chyby
        const btnLogText = document.getElementById('btn-public-changelog-text');
        if (btnLogText) btnLogText.textContent = 'Release Notes v' + OMEGA_VERSION;
    });
}

// ======= MOBILE NAVIGATION ENGINE =======
const mobileTabs = document.querySelectorAll('.nav-tab');

mobileTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const target = tab.dataset.target;
        
        // 1. Změna aktivního tlačítka
        mobileTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // 2. Přepnutí View (výměna CSS třídy na body)
        if (target === 'sidebar') {
            document.body.classList.remove('mobile-view-main');
            document.body.classList.add('mobile-view-sidebar');
        } else {
            document.body.classList.remove('mobile-view-sidebar');
            document.body.classList.add('mobile-view-main');
        }
        
        // 3. Posun nahoru při přepnutí
        window.scrollTo({ top: 0, behavior: 'instant' });
    });
});

// ==========================================
// 🚀 ZERO-LATENCY INICIALIZACE (Brute-Force)
// ==========================================
const initOmegaEngine = () => {
    loadState(); 
    loadStateFromURL(); 
    
    if (window.matchMedia("(pointer: fine)").matches) {
        elements.searchBox.focus(); 
    }
    
    renderTable(); 
    updateStatsAndSidebar();

    if (sessionStorage.getItem('omega_session_expired') === 'true') {
        sessionStorage.removeItem('omega_session_expired'); 
        const timeoutModal = document.getElementById('omega-timeout-modal');
        if (timeoutModal) timeoutModal.style.display = 'flex';
    }
};

// Spouštíme okamžitě, bez čekání na prohlížeč.
initOmegaEngine();



// 🚀 OMEGA MATH ENGINE: Exaktní výpočet kaskád vs. manuálních přesunů (LIS Algoritmus)
window.analyzeDraftChanges = function(draftDb) {
    const prodDb = window.OMEGA_CONFIG.KNIHY_DB.map((k, i) => ({...k, id: i + 1}));

    let draftMapped = draftDb.map((draftBook, idx) => {
        // 1. Zkusíme exaktní shodu jména
        let prodMatch = prodDb.find(p => p.dilo.toLowerCase().trim() === draftBook.dilo.toLowerCase().trim());
        
        // 2. 🚀 OMEGA DNA FALLBACK: Pokud učitel přepsal název, spárujeme bezpečně přes DNA stopu
        if (!prodMatch) {
            const targetId = draftBook.origId || (draftBook._original ? draftBook._original.id : draftBook.id);
            prodMatch = prodDb.find(p => p.id === targetId);
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

    // LIS Výpočet (Hledá páteř děl, která se vůči sobě neposunula)
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
        const textChanged = (draftBook.dilo !== prodBook.dilo || draftBook.autor !== prodBook.autor || draftBook.obdobi !== prodBook.obdobi || draftBook.druh !== prodBook.druh);
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

// 🚀 OMEGA TEXT ENGINE: Výpis do modálů
window.generateDiffHtml = function(draftDb) {
    const analysis = window.analyzeDraftChanges(draftDb);
    let html = "";
    
    if (analysis.added.length === 0 && analysis.deleted.length === 0 && analysis.edited.length === 0 && analysis.manuallyMoved.length === 0 && analysis.cascadeMoved.length === 0) {
        return "<div style='color: var(--text-muted); font-style: italic; font-size: 0.85rem;'>Žádné fyzické změny. Databáze je identická.</div>";
    } 

    if (analysis.added.length > 0) html += `<div style="color: var(--accent-green); font-size: 0.85rem;"><strong>➕ Přidáno (${analysis.added.length}):</strong> ${analysis.added.map(k=> sanitize(k.dilo)).join(', ')}</div>`;
    if (analysis.deleted.length > 0) html += `<div style="color: var(--accent-red); font-size: 0.85rem; margin-top: 4px;"><strong>🗑️ Odebráno (${analysis.deleted.length}):</strong> ${analysis.deleted.map(k=> sanitize(k.dilo)).join(', ')}</div>`;
    if (analysis.edited.length > 0) html += `<div style="color: #f59e0b; font-size: 0.85rem; margin-top: 4px;"><strong>✏️ Upraven text (${analysis.edited.length}):</strong> ${analysis.edited.map(k=> sanitize(k.dilo)).join(', ')}</div>`;
    if (analysis.manuallyMoved.length > 0) html += `<div style="color: #f59e0b; font-size: 0.85rem; margin-top: 4px;"><strong>↕️ Manuálně přesunuto (${analysis.manuallyMoved.length}):</strong> ${analysis.manuallyMoved.map(k=> sanitize(k.dilo)).join(', ')}</div>`;
    if (analysis.cascadeMoved.length > 0) html += `<div style="color: #3b82f6; font-size: 0.85rem; margin-top: 4px;"><strong>🌊 Kaskádově posunuto:</strong> ${analysis.cascadeMoved.length} děl.</div>`;
    
    return html;
};

// 🚀 OMEGA VISUAL ENGINE: Tabulka včetně Legendy a Barviček
window.generateColoredPreviewTable = function(draftDb) {
    const analysis = window.analyzeDraftChanges(draftDb);
    let rowsHtml = "";
    let virtualView = [];

    draftDb.forEach((k) => {
        let state = 'normal';
        let origId = k.id; 
        if (analysis.added.find(a => a.id === k.id)) state = 'added';
        else {
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

        if (book.state === 'deleted') { bg = 'rgba(239, 68, 68, 0.04)'; leftBorder = '4px solid #ef4444'; opacity = '0.5'; idText = `<strike>${book.origId}.</strike>`; } 
        else if (book.state === 'added') { bg = 'rgba(16, 185, 129, 0.06)'; leftBorder = '4px solid #10b981'; } 
        else if (book.state === 'edited' || book.state === 'manual_move') { bg = 'rgba(245, 158, 11, 0.08)'; leftBorder = '4px solid #f59e0b'; } 
        else if (book.state === 'cascade_move') { bg = 'rgba(59, 130, 246, 0.05)'; leftBorder = '4px solid #3b82f6'; }

        // 🚀 OMEGA FIX: Druh je nyní PŘED Obdobím
        rowsHtml += `
        <tr style="background: ${bg}; opacity: ${opacity}; border-bottom: 1px solid var(--border); transition: background 0.2s;" onmouseover="this.style.background='var(--bg-base)'" onmouseout="this.style.background='${bg}'">
            <td style="padding: 8px; text-align: center; color: var(--text-muted); border-left: ${leftBorder};">${idText}</td>
            <td style="padding: 8px; font-weight: bold; color: var(--text-main);">${sanitize(book.dilo)}</td>
            <td style="padding: 8px; color: var(--text-muted);">${sanitize(book.autor)}</td>
            <td style="padding: 8px; color: var(--text-muted); font-size: 0.9em;">${book.druh}</td>
            <td style="padding: 8px; color: var(--text-muted); font-size: 0.9em;">${MAPA_OBDOBI[book.obdobi] || book.obdobi}</td>
        </tr>`;
    });

    // 🚀 OMEGA FIX: Symetrický CSS Grid 2x2 pro legendu (perfektní zarovnání na všech displejích)
    const legendHtml = `
        <div style="background: var(--bg-surface); padding: 12px; border-bottom: 1px solid var(--border); border-top: 1px solid var(--border); display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8rem;">
            <div style="color: #10b981; font-weight: bold; padding: 6px 8px; background: rgba(16, 185, 129, 0.1); border-radius: 4px; text-align: center; white-space: nowrap;">➕ Přidáno</div>
            <div style="color: #f59e0b; font-weight: bold; padding: 6px 8px; background: rgba(245, 158, 11, 0.1); border-radius: 4px; text-align: center; white-space: nowrap;">✏️ Upraveno/Přesunuto</div>
            <div style="color: #3b82f6; font-weight: bold; padding: 6px 8px; background: rgba(59, 130, 246, 0.1); border-radius: 4px; text-align: center; white-space: nowrap;">🌊 Kaskádový posun</div>
            <div style="color: #ef4444; font-weight: bold; padding: 6px 8px; background: rgba(239, 68, 68, 0.1); border-radius: 4px; text-align: center; white-space: nowrap;">🗑️ Smazáno</div>
        </div>`;

    return legendHtml + `
    <div style="max-height: 400px; overflow-y: auto;">
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem;">
            <thead style="background: #111827; border-bottom: 2px solid var(--accent-primary); position: sticky; top: 0; z-index: 10;">
                <tr>
                    <th style="padding: 8px; text-align: center; color: white; width: 8%;">ID</th>
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

/* ==========================================
   OMEGA ADMIN ENGINE v7.1.0 (Enterprise)
   ========================================== */

const OMEGA_ADMIN_CONFIG = {
    WORKER_URL: "https://spspb-mat-cet.tresnakkarel77.workers.dev"
};

let adminVirtualDb = [];
let sessionCredentials = { username: "", password: "" };
let pendingExportPayload = null;

// --- 🎛️ UI: SEGMENTED CONTROL (Záložky) ---
window.switchAdminMode = function(mode) {
    const forms = { 
        add: document.getElementById('admin-form-add'), 
        edit: document.getElementById('admin-form-edit'), 
        summary: document.getElementById('admin-form-summary'), 
        changelog: document.getElementById('admin-form-changelog') // 🚀 OMEGA FIX: Musí tu být!
    };
    const tabs = { 
        add: document.getElementById('tab-add'), 
        edit: document.getElementById('tab-edit'), 
        summary: document.getElementById('tab-summary'),
        changelog: document.getElementById('tab-changelog') // 🚀 OMEGA FIX: Musí tu být! 
    };

    // Ochrana proti chybám v DOMu
    if (!forms.add || !forms.edit || !forms.summary) return;

    Object.keys(forms).forEach(key => {
        // Přepínání viditelnosti kontejnerů
        if (forms[key]) {
            forms[key].style.display = (key === mode) ? (key === 'add' ? 'grid' : 'flex') : 'none';
        }
        // Přepínání stylů tlačítek
        if (tabs[key]) {
            tabs[key].style.borderBottom = (key === mode) ? '2px solid var(--accent-primary)' : '2px solid transparent';
            tabs[key].style.opacity = (key === mode) ? '1' : '0.5';
        }
    });

    // 🚀 OMEGA FIX: Přepočet a stažení dat POUZE při kliknutí na záložku
    if (mode === 'summary') {
        if (typeof window.renderAdminSummary === 'function') window.renderAdminSummary();
        // Zde voláme historii - díky izolovanému kontejneru už NIKDY nebude 2x
        if (typeof window.fetchPrivateAuditLog === 'function') window.fetchPrivateAuditLog();
    }
    if (mode === 'changelog') {
        if (typeof window.renderAdminChangelog === 'function') window.renderAdminChangelog();
    }
};

// --- 📊 AUDIT LOG GENERATOR (Human-Readable Edition) ---
window.renderAdminSummary = function() {
    const container = document.getElementById('admin-summary-content');
    if (!container) return;

    let added = [];
    let editedContent = [];
    let moved = [];
    let deleted = [];

    adminVirtualDb.forEach(book => {
        if (book._isDeleted) {
            deleted.push(`<strong>${sanitize(book.dilo)}</strong> (Původní ID ${book._original.id})`);
            return;
        }
        if (book._isAdded) {
            added.push(`<strong>${sanitize(book.dilo)}</strong> (Nové ID ${book.id})`);
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

            // 🚀 ŽLUTÁ SEKCE: Vypíše, pokud se změnil text, nebo pokud to uživatel explicitně přesunul
            if (textChanges.length > 0 || explicitMove) {
                let reason = textChanges.length > 0 ? textChanges.join(', ') : "Manuální přesun";
                if (explicitMove && textChanges.length > 0) reason += " + Přesun";
                editedContent.push(`<strong>${sanitize(book.dilo)}</strong> (Změna: ${reason})`);
            } 
            
            // 🚀 MODRÁ SEKCE: Zaznamená se JEN tehdy, když nedošlo k explicitnímu přesunu ani změně textu, ale ID nesedí
            if (book.id !== orig.id && !explicitMove && textChanges.length === 0) {
                moved.push(`<strong>${sanitize(book.dilo)}</strong> (Pozice: ID ${orig.id} ➔ ${book.id})`);
            }
        }
    });

    // Inteligentní agregace přesunů (aby log nepsal 50 knih, když něco smažeš)
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

    // 🚀 OMEGA FIX: DOM Detach & Attach (Záchrana Git historie před přepsáním)
    const gitLayer = document.getElementById('omega-git-history-layer');
    
    // Nekompromisní přepis lokálního logu
    container.innerHTML = html;

    // Vrácení ušetřené Git historie zpět na konec
    if (gitLayer) {
        container.appendChild(gitLayer);
    }

};

// 🚀 ZDE ZAČÍNÁ ŘEZ 5: Nový Audit Log a Revert Engine
// --- 🕵️ PRIVÁTNÍ AUDIT LOG & REVERT ENGINE ---
let targetRevertHash = "";

window.fetchPrivateAuditLog = async function() {
    const container = document.getElementById('admin-summary-content');
    
    let gitContainer = document.getElementById('omega-git-history-layer');
    if (!gitContainer) {
        gitContainer = document.createElement('div');
        gitContainer.id = 'omega-git-history-layer';
        container.appendChild(gitContainer);
    }

    // 🚀 OMEGA FIX: Historii (Git) vidí POUZE Omega. Všem ostatním ji zcela zatajíme (ani čárka).
    if (sessionCredentials.username !== 'omega') {
        gitContainer.innerHTML = ''; 
        return;
    }

    // Vyčistíme kontejner před novým stahováním a vložíme loading
    gitContainer.innerHTML = `<div id="audit-loading-msg" style="margin-top: 20px; padding: 15px; border-top: 1px dashed var(--border);"><span style="color: var(--accent-primary);">⏳ Kontaktuji privátní repozitář pro stažení historie...</span></div>`;

    try {
        const response = await fetch(OMEGA_ADMIN_CONFIG.WORKER_URL + "/audit-log", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "X-Omega-Device-Id": getDeviceIdentity() 
            },
            body: JSON.stringify({ username: sessionCredentials.username, password: sessionCredentials.password })
        });
        const data = await response.json();
        
        const loadingMsgEl = document.getElementById('audit-loading-msg');
        if (loadingMsgEl) loadingMsgEl.remove();
        
        if (!response.ok) throw new Error(data.error || "Přístup odepřen.");

        let logHtml = `<h4 style="margin-top: 20px; color: var(--text-main);">Historie z produkce (Git)</h4>`;

        // 🚀 OMEGA FIX: Filtrace systémových zpráv
        const validLogs = data.logs.filter(log => log.user !== "Neznámý" && log.user !== "Systém");

        if (validLogs.length === 0) {
            logHtml += `<p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 10px;">Zatím nejsou k dispozici žádné uživatelské úpravy.</p>`;
        } else {
            // 🚀 ZDE JE OPRAVA: Iterujeme přes validLogs!
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
        
        // Vkládáme POUZE do izolovaného kontejneru (přepisujeme ho, nepřilepujeme!)
        gitContainer.innerHTML = logHtml;
        
    } catch (error) {
        const loadingMsg = document.getElementById('audit-loading-msg');
        if (loadingMsg) loadingMsg.remove();
        
        // Chybová hláška se také zapíše izolovaně
        gitContainer.innerHTML = `
            <h4 style="margin-top: 20px; color: var(--text-main);">Historie z produkce (Git)</h4>
            <div style="margin-top: 10px; color: var(--accent-red); font-size: 0.85rem;">❌ Chyba připojení: ${error.message}</div>
        `;
    }
};

// --- 🚀 OMEGA SMART REVERT PREVIEW ---
window.prepareRevert = async function(hash) {
    targetRevertHash = hash;
    document.getElementById('revert-commit-hash').innerText = hash;
    document.getElementById('omega-revert-modal').style.display = 'flex';
    
    const diffBox = document.getElementById('revert-diff-container');
    diffBox.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-muted);">⏳ Analyzuji historická data přes API GitHubu...</div>';

    try {
        // 🛡️ Bezpečnostní pojistka pro Wargaming (na lokálu by reálný Git fetch selhal)
        if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
            throw new Error("LOKALNI_VYVOJ");
        }

        // Dekódování historického JS souboru z raw githubu
        const res = await fetch(`https://raw.githubusercontent.com/kareltresnak/MAT-CETBA/${hash}/data-spspb.js?t=${Date.now()}`);
        if (!res.ok) throw new Error("Chyba při stahování snapshotu.");
        
        const text = await res.text();
        const jsonMatch = text.match(/KNIHY_DB:\s*(\[[\s\S]*?\])\s*};/);
        if (!jsonMatch) throw new Error("Nelze dekódovat historickou databázi.");
        
        const oldDb = JSON.parse(jsonMatch[1]);
        const currDb = window.OMEGA_CONFIG.KNIHY_DB; // Aktuální produkce
        
        const oldNames = oldDb.map(k => k.dilo.toLowerCase().trim());
        const currNames = currDb.map(k => k.dilo.toLowerCase().trim());
        
        // Co se obnovením ZACHRÁNÍ (Je ve staré DB, ale v aktuální chybí)
        const toRestore = oldDb.filter(k => !currNames.includes(k.dilo.toLowerCase().trim()));
        // O co obnovením PŘIJDEME (Je v aktuální DB, ale ve staré to ještě nebylo)
        const toLose = currDb.filter(k => !oldNames.includes(k.dilo.toLowerCase().trim()));
        
        let diffHtml = "";
        if (toRestore.length === 0 && toLose.length === 0) {
            diffHtml = "<div style='padding:10px; text-align:center; color: var(--accent-primary);'>Seznam děl je prakticky identický s aktuálním stavem. Bude proveden pouze rollback textových detailů.</div>";
        } else {
            if (toRestore.length > 0) {
                // 🚀 OMEGA UX: Jasná formulace návratu
                diffHtml += `<div style="color: var(--accent-green); margin-bottom: 12px;"><strong>➕ Tato díla se vrátí zpět do databáze:</strong><ul style="margin: 5px 0 0 0; padding-left: 20px;">` + 
                    toRestore.map(k => `<li>${sanitize(k.dilo)}</li>`).join('') + `</ul></div>`;
            }
            if (toLose.length > 0) {
                // 🚀 OMEGA UX: Jasná formulace ztráty
                diffHtml += `<div style="color: var(--accent-red);"><strong>🗑️ O tato novější díla přijdete (v této staré záloze ještě neexistují):</strong><ul style="margin: 5px 0 0 0; padding-left: 20px;">` + 
                    toLose.map(k => `<li>${sanitize(k.dilo)}</li>`).join('') + `</ul></div>`;
            }
        }
        diffBox.innerHTML = diffHtml;

    } catch (err) {
        if (err.message === "LOKALNI_VYVOJ") {
            diffBox.innerHTML = '<div style="color:var(--accent-primary); padding:10px; text-align: center;">⚠️ [SIMULACE]<br>Analýzu nelze provést. V produkci zde uvidíte přesný rozdíl knih.</div>';
        } else {
            diffBox.innerHTML = `<div style="color:var(--accent-red); padding:10px;">❌ Nelze vygenerovat náhled: ${err.message}</div>`;
        }
    }
};

window.executeRevert = async function() {
    document.getElementById('omega-revert-modal').style.display = 'none';
    showToast("⏳ Odesílám požadavek na Revert do Cloudflare...");
    try {
        const response = await fetch(OMEGA_ADMIN_CONFIG.WORKER_URL + "/revert", {
            method: "POST", 
            headers: { 
                "Content-Type": "application/json",
                "X-Omega-Device-Id": getDeviceIdentity()
            },
            body: JSON.stringify({ username: sessionCredentials.username, password: sessionCredentials.password, target_commit: targetRevertHash })
        });
        if (!response.ok) throw new Error("Revert selhal na straně serveru.");
        showToast("✅ Databáze úspěšně obnovena! Obnovte stránku.");
        setTimeout(() => window.location.reload(), 2000);
    } catch (error) { showToast("❌ Chyba: " + error.message); }
};
// --- 👑 MASTER ADMIN ENGINE: Kompletní správa identit ---

let isPasswordValid = false;

// Otevření modálu a spuštění načítání
window.openUserModal = function() {
    document.getElementById('omega-user-modal').style.display = 'flex';
    fetchAdminUsers();
};

window.closeUserModal = function() {
    document.getElementById('omega-user-modal').style.display = 'none';
};

// Pokud je v HTML starý inline onclick, přepíšeme ho na tuto novou funkci
const masterBtnNode = document.getElementById('btn-master-admin');
if (masterBtnNode) masterBtnNode.onclick = window.openUserModal;

// 🛡️ OMEGA PASSWORD VALIDATOR (Real-time Kinetika)
const pwdInput = document.getElementById('new-user-pwd');
if (pwdInput) {
    pwdInput.addEventListener('input', (e) => {
        const val = e.target.value;
        
        // Matematické ověření entropie
        const rules = {
            len: val.length >= 12,
            upper: (val.match(/[A-Z]/g) || []).length >= 2,
            num: (val.match(/[0-9]/g) || []).length >= 2,
            sym: (val.match(/[^a-zA-Z0-9]/g) || []).length >= 2
        };

        // Vizuální odezva na Checkliste
        document.getElementById('rule-len').innerHTML = rules.len ? '✅ Min. 12 znaků' : '❌ Min. 12 znaků';
        document.getElementById('rule-upper').innerHTML = rules.upper ? '✅ 2 velká písmena' : '❌ 2 velká písmena';
        document.getElementById('rule-num').innerHTML = rules.num ? '✅ 2 číslice' : '❌ 2 číslice';
        document.getElementById('rule-sym').innerHTML = rules.sym ? '✅ 2 speciální znaky' : '❌ 2 speciální znaky';

        // Výpočet naplnění (25% za každé pravidlo)
        let score = Object.values(rules).filter(Boolean).length;
        const bar = document.getElementById('pwd-strength-bar');
        const btn = document.getElementById('btn-create-user');

        bar.style.width = (score * 25) + '%';
        
        if (score < 2) bar.style.background = 'var(--accent-red)';
        else if (score < 4) bar.style.background = '#f59e0b'; // Oranžová
        else bar.style.background = 'var(--accent-green)'; // Zelená

        isPasswordValid = (score === 4);
        btn.disabled = !isPasswordValid;
    });
}

// 1. ZÁPIS UŽIVATELE (Optimistic UI)
window.executeCreateUser = async function() {
    const newUser = document.getElementById('new-user-name').value.trim();
    const newPwd = document.getElementById('new-user-pwd').value;

    if (!newUser || !isPasswordValid) return showToast("❌ Formulář nesplňuje bezpečnostní požadavky.");

    showToast("⏳ Zapisuji identitu do Cloudflare...");
    document.getElementById('btn-create-user').disabled = true;

    try {
        const response = await fetch(OMEGA_ADMIN_CONFIG.WORKER_URL + "/add-user", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Omega-Device-Id": getDeviceIdentity() },
            body: JSON.stringify({ 
                admin_username: sessionCredentials.username, 
                admin_password: sessionCredentials.password,
                new_username: newUser,
                new_password: newPwd
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Operace selhala.");
        
        showToast("✅ Účet bezpečně uložen.");
        document.getElementById('new-user-name').value = '';
        document.getElementById('new-user-pwd').value = '';
        pwdInput.dispatchEvent(new Event('input')); 
        
        // 🚀 OMEGA OPTIMISTIC UI: Okamžité vizuální přidání bez čekání na 10s zpoždění Cloudflare KV
        const listContainer = document.getElementById('admin-user-list');
        if (listContainer.innerHTML.includes('Zatím nejsou') || listContainer.innerHTML.includes('Načítám')) {
            listContainer.innerHTML = '';
        }
        listContainer.innerHTML += `
            <div id="user-row-${newUser.toLowerCase()}" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-bottom: 1px solid var(--border);">
                <span style="font-weight: bold; color: var(--text-main);">👤 ${sanitize(newUser)}</span>
                <button onclick="promptDeleteUser('${newUser.toLowerCase()}')" style="background: transparent; border: 1px solid var(--accent-red); color: var(--accent-red); border-radius: 4px; cursor: pointer; padding: 4px 8px; font-size: 0.75rem; transition: 0.2s;" onmouseover="this.style.background='rgba(218,33,40,0.1)'" onmouseout="this.style.background='transparent'">Odstranit</button>
            </div>
        `;
    } catch (error) { showToast("❌ Chyba: " + error.message); }
};

// 2. VÝPIS UŽIVATELŮ
window.fetchAdminUsers = async function() {
    const listContainer = document.getElementById('admin-user-list');
    listContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 10px;">⏳ Načítám uzly z Edge sítě...</div>';

    try {
        const response = await fetch(OMEGA_ADMIN_CONFIG.WORKER_URL + "/list-users", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Omega-Device-Id": getDeviceIdentity() },
            body: JSON.stringify({ admin_username: sessionCredentials.username, admin_password: sessionCredentials.password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        if (data.users.length === 0) {
            listContainer.innerHTML = '<div style="padding: 10px;">Zatím nejsou vytvořeni žádní učitelé.</div>';
            return;
        }

        listContainer.innerHTML = data.users.map(u => `
            <div id="user-row-${u}" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-bottom: 1px solid var(--border);">
                <span style="font-weight: bold; color: var(--text-main);">👤 ${sanitize(u)}</span>
                <button onclick="promptDeleteUser('${u}')" style="background: transparent; border: 1px solid var(--accent-red); color: var(--accent-red); border-radius: 4px; cursor: pointer; padding: 4px 8px; font-size: 0.75rem; transition: 0.2s;" onmouseover="this.style.background='rgba(218,33,40,0.1)'" onmouseout="this.style.background='transparent'">Odstranit</button>
            </div>
        `).join('');

    } catch (error) { listContainer.innerHTML = `<div style="color: var(--accent-red); padding: 10px;">❌ Nelze načíst uživatele.</div>`; }
};

// 3. ODSTRANĚNÍ UŽIVATELE (Nativní Omega Modál)
let pendingUserToDelete = null;

window.promptDeleteUser = function(targetUser) {
    pendingUserToDelete = targetUser;
    document.getElementById('delete-user-name').innerText = targetUser;
    document.getElementById('omega-delete-user-modal').style.display = 'flex';
};

window.closeDeleteUserModal = function() {
    document.getElementById('omega-delete-user-modal').style.display = 'none';
    pendingUserToDelete = null;
};

window.confirmDeleteUser = async function() {
    if (!pendingUserToDelete) return;
    const targetUser = pendingUserToDelete;
    closeDeleteUserModal();
    showToast(`⏳ Odstraňuji účet ${targetUser}...`);
    
    try {
        const response = await fetch(OMEGA_ADMIN_CONFIG.WORKER_URL + "/delete-user", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Omega-Device-Id": getDeviceIdentity() },
            body: JSON.stringify({ 
                admin_username: sessionCredentials.username, 
                admin_password: sessionCredentials.password,
                target_user: targetUser
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        
        showToast("🗑️ Účet trvale odstraněn.");
        
        // 🚀 OMEGA OPTIMISTIC UI: Okamžitě vymažeme řádek z DOMu
        const row = document.getElementById(`user-row-${targetUser}`);
        if (row) row.remove();
        
    } catch (error) { showToast("❌ Nelze odstranit: " + error.message); }
};

window.adminAddChangelogEntry = function() {
    const ver = document.getElementById('ch-version').value.trim();
    const dat = document.getElementById('ch-date').value.trim();
    const notes = document.getElementById('ch-notes').value.split('\n').filter(l => l.trim() !== "");

    if (!ver || !dat || notes.length === 0) return showToast("⚠️ Vyplňte kompletní údaje o verzi.");

    // Přidáme na začátek (nejnovější nahoře)
    adminChangelogDb.unshift({ version: ver, date: dat, notes: notes });
    
    renderAdminChangelog();
    showToast("📄 Záznam připraven k uložení.");
    
    // Vyčištění
    document.getElementById('ch-version').value = '';
    document.getElementById('ch-notes').value = '';
};

function renderAdminChangelog() {
    const cont = document.getElementById('admin-changelog-preview');
    if (!cont) return;
    cont.innerHTML = adminChangelogDb.map((entry, idx) => `
        <div style="padding: 10px; border: 1px solid var(--border); border-radius: 6px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong>${sanitize(entry.version)}</strong> (${sanitize(entry.date)})
                <div style="font-size: 0.8rem; opacity: 0.6;">${entry.notes.length} bodů změn</div>
            </div>
            <button onclick="adminDeleteChangelog(${idx})" style="background: transparent; border: none; color: var(--accent-red); cursor: pointer;">🗑️</button>
        </div>
    `).join('');
}

window.adminDeleteChangelog = function(idx) {
    adminChangelogDb.splice(idx, 1);
    renderAdminChangelog();
};


// --- ⏳ SECURITY: HYBRIDNÍ SESSION DECAY (HUD -> MODAL) ---
let adminIdleTime = 0;
const ADMIN_IDLE_LIMIT = 300; 
const ADMIN_IDLE_HUD_START = 10;   // Zobrazení HUD (4:50)
const ADMIN_IDLE_MODAL_START = 240; // Bod zlomu: Modál (1:00)

let decayInterval = null;

const resetDecayTimer = () => {
    adminIdleTime = 0;
    const hud = document.getElementById('omega-idle-timer-small');
    const modal = document.getElementById('omega-session-modal');
    if (hud) hud.style.display = 'none';
    if (modal) modal.style.display = 'none';
};

// Senzory aktivity
['mousemove', 'keypress', 'click', 'touchstart'].forEach(ev => 
    window.addEventListener(ev, resetDecayTimer)
);

const formatDecayTime = (s) => 
    `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

decayInterval = setInterval(() => {
    const portal = document.getElementById('omega-admin-portal');
    if (portal && portal.style.display === 'block') {
        adminIdleTime++;
        const timeRemaining = ADMIN_IDLE_LIMIT - adminIdleTime;

        if (adminIdleTime >= ADMIN_IDLE_LIMIT) {
            clearInterval(decayInterval);
            isSafeToExit = true; 
            sessionStorage.setItem('omega_session_expired', 'true');
            window.location.href = window.location.pathname;
            return;
        }

        const hud = document.getElementById('omega-idle-timer-small');
        const modal = document.getElementById('omega-session-modal');
        const hudVal = document.getElementById('idle-time-val-small');
        const modalVal = document.getElementById('session-timer-val');

        // --- ZÓNA 3: MODÁL (Poslední minuta: 01:00 - 00:00) ---
        if (adminIdleTime >= ADMIN_IDLE_MODAL_START) {
            if (hud) hud.style.display = 'none';
            if (modal) {
                modal.style.display = 'flex';
                modalVal.textContent = formatDecayTime(timeRemaining);
                
                // Kritický vizuální puls (posledních 20s)
                if (timeRemaining <= 20) {
                    modalVal.style.color = '#da2128';
                    document.getElementById('omega-session-card').style.boxShadow = '0 0 30px rgba(218, 33, 40, 0.3)';
                }
            }
        } 
        // --- ZÓNA 2: HUD (Od 4:50 do 1:01) ---
        else if (adminIdleTime >= ADMIN_IDLE_HUD_START) {
            if (modal) modal.style.display = 'none';
            if (hud) {
                hud.style.display = 'flex';
                hudVal.textContent = formatDecayTime(timeRemaining);
            }
        }
    }
}, 1000);

// --- 🤖 CUSTOM AUTOCOMPLETE & HEURISTICS ---
let unikatniAutori = [];

function initAuthorAutocomplete() {
    // 1. Vytažení a seřazení autorů z DB
    unikatniAutori = [...new Set(window.OMEGA_CONFIG.KNIHY_DB.map(k => k.autor))].sort((a, b) => a.localeCompare(b, 'cs'));
    
    const input = document.getElementById('admin-autor');
    const dropdown = document.getElementById('custom-author-dropdown');
    if (!input || !dropdown) return;

    // 2. Renderovací funkce
    const renderDropdown = (query) => {
        const hledano = query.trim().toLowerCase();
        // Pokud je prázdno, ukážeme všechny. Jinak filtrujeme.
        const filtered = hledano ? unikatniAutori.filter(a => a.toLowerCase().includes(hledano)) : unikatniAutori;
        
        if (filtered.length === 0) {
            dropdown.style.display = 'none';
            return;
        }

        dropdown.innerHTML = filtered.map(autor => {
            // Zvýraznění shodujícího se textu (Highlighting)
            const regex = new RegExp(`(${hledano})`, 'gi');
            const highlighted = hledano ? autor.replace(regex, '<strong style="color: var(--accent-primary, #e67e22); font-weight: 900;">$1</strong>') : autor;
            
            return `<div class="autocomplete-item" style="padding: 12px 15px; cursor: pointer; border-bottom: 1px solid var(--border); font-size: 0.9rem; color: var(--text-main); transition: background 0.1s;" onmouseover="this.style.background='var(--bg-active)'" onmouseout="this.style.background='transparent'" data-val="${autor}">${highlighted}</div>`;
        }).join('');
        
        dropdown.style.display = 'flex';
    };

    // 3. Posluchače událostí (Otevření při kliknutí a psaní)
    input.addEventListener('focus', () => renderDropdown(input.value));
    
    input.addEventListener('input', (e) => {
        renderDropdown(e.target.value);
        
        // 🚀 OMEGA HEURISTICS: Auto-fill pro Custom Dropdown
        const hledanyAutor = e.target.value.trim().toLowerCase();
        const nalezeneDilo = window.OMEGA_CONFIG.KNIHY_DB.find(k => k.autor.toLowerCase() === hledanyAutor);
        if (nalezeneDilo) {
            const obdobiInput = document.getElementById('admin-obdobi');
            const obdobiLabel = document.getElementById('admin-obdobi-label');
            const obdobiTrigger = document.getElementById('admin-obdobi-trigger');
            
            if (obdobiInput && obdobiInput.value !== nalezeneDilo.obdobi) {
                obdobiInput.value = nalezeneDilo.obdobi;
                if (obdobiLabel) obdobiLabel.textContent = MAPA_OBDOBI[nalezeneDilo.obdobi];
                
                if (obdobiTrigger) {
                    obdobiTrigger.style.transition = "background-color 0.3s";
                    obdobiTrigger.style.backgroundColor = "var(--bg-active)";
                    setTimeout(() => obdobiTrigger.style.backgroundColor = "transparent", 600);
                }
            }
        }
    });

    // 4. Výběr autora kliknutím/dotykem
    dropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.autocomplete-item');
        if (item) {
            input.value = item.dataset.val;
            dropdown.style.display = 'none';
            
            // Uměle vyvoláme input event, aby heuristika doplnila období i po kliknutí myší
            input.dispatchEvent(new Event('input'));
            
            // UX Kinetika: Přepneme focus na další pole (Druh)
            document.getElementById('admin-druh')?.focus();
        }
    });

    // 5. Zavření při kliknutí mimo (Click-away listener)
    document.addEventListener('click', (e) => {
        if (e.target !== input && e.target !== dropdown && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}

function navrhniDalsiVolneId() {
    const dbSize = window.OMEGA_CONFIG.KNIHY_DB.length;
    const qSize = typeof stagingQueue !== 'undefined' ? stagingQueue.length : 0;
    const dSize = typeof deleteQueue !== 'undefined' ? deleteQueue.length : 0;
    const idInput = document.getElementById('admin-index');
    if (idInput) idInput.value = dbSize - dSize + qSize + 1;
}

// --- 🚀 OMEGA KINETICS: Drag & Drop Engine ---
let draggedUid = null;

window.adminDragStart = function(e, uid) {
    draggedUid = uid;
    e.dataTransfer.effectAllowed = 'move';
    e.target.closest('tr').style.opacity = '0.4';
    setTimeout(() => e.target.closest('tr').classList.add('dragging'), 0);
};

window.adminDragOver = function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const tr = e.target.closest('tr');
    if (tr && !tr.classList.contains('dragging')) {
        tr.style.borderTop = '2px solid var(--accent-primary-light)';
    }
};

window.adminDragLeave = function(e) {
    const tr = e.target.closest('tr');
    if (tr) tr.style.borderTop = '';
};

window.adminDrop = function(e, targetUid) {
    e.preventDefault();
    const tr = e.target.closest('tr');
    if (tr) tr.style.borderTop = '';

    if (draggedUid === targetUid) return;

    const fromIndex = adminVirtualDb.findIndex(k => k._uid === draggedUid);
    const toIndex = adminVirtualDb.findIndex(k => k._uid === targetUid);

    if (fromIndex !== -1 && toIndex !== -1) {
        const [movedItem] = adminVirtualDb.splice(fromIndex, 1);
        
        // 🚀 OMEGA HACK: Vizuální a logická izolace přesunu
        if (!movedItem._isAdded) {
            movedItem._isEdited = true;
            if (!movedItem._moveHistory) movedItem._moveHistory = [];
            movedItem._moveHistory.push({ from: fromIndex + 1, to: toIndex + 1 });
        }

        adminVirtualDb.splice(toIndex, 0, movedItem);
        
        // Tichý kaskádový přepočet ID (nahrazuje potenciálně toxický přepočet)
        adminVirtualDb.forEach((book, idx) => {
            book.id = idx + 1;
        });
        
        // ⚠️ DŮLEŽITÉ: Tvá původní funkce adminEvaluateChanges() pravděpodobně plošně nastavovala 
        // book._isEdited = true všem posunutým dílům. Zakomentoval jsem ji.
        // adminEvaluateChanges(); 
        
        isSafeToExit = false;
        renderAdminTable();
        if (typeof window.renderAdminSummary === 'function') window.renderAdminSummary();
        showToast("↕️ Pořadí upraveno.");
    }
    draggedUid = null;
};

window.adminDragEnd = function(e) {
    e.target.closest('tr').style.opacity = '1';
    e.target.closest('tr').classList.remove('dragging');
    renderAdminTable(); 
};

// --- 🎨 OMEGA CUSTOM SELECT ENGINE ---
window.adminOpenCustomDropdown = function(uid, field, event, isAddForm = false) {
    document.querySelectorAll('.omega-custom-select-menu').forEach(el => el.remove());
    event.stopPropagation();
    
    const rect = event.currentTarget.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'omega-custom-select-menu';
    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 5}px`;
    menu.style.left = `${rect.left}px`;
    menu.style.width = `${rect.width}px`;
    menu.style.background = 'var(--bg-surface)';
    menu.style.border = '1px solid var(--accent-primary-light)';
    menu.style.borderRadius = '6px';
    menu.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
    menu.style.zIndex = '10000';
    menu.style.overflow = 'hidden';

    const options = field === 'obdobi' 
        ? [ {val: 'do18', label: 'Do konce 18. st.'}, {val: '19', label: '19. století'}, {val: 'svet20', label: 'Svět 20. a 21. st.'}, {val: 'cz20', label: 'ČR 20. a 21. st.'} ]
        : [ {val: 'epika', label: 'Epika'}, {val: 'lyrika', label: 'Lyrika'}, {val: 'drama', label: 'Drama'} ];

    menu.innerHTML = options.map(opt => `
        <div class="autocomplete-item" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid var(--border); font-size: 0.9rem; color: var(--text-main);"
             onmouseover="this.style.background='rgba(118, 203, 161, 0.1)'; this.style.color='var(--accent-primary)'" 
             onmouseout="this.style.background='transparent'; this.style.color='var(--text-main)'"
             onclick="adminSelectCustomOption('${uid}', '${field}', '${opt.val}', '${opt.label}', ${isAddForm})">
            ${opt.label}
        </div>
    `).join('');

    document.body.appendChild(menu);
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 0);
};

window.adminSelectCustomOption = function(uid, field, val, label, isAddForm) {
    document.querySelectorAll('.omega-custom-select-menu').forEach(el => el.remove());
    
    if (isAddForm) {
        document.getElementById(`admin-${field}`).value = val;
        document.getElementById(`admin-${field}-label`).textContent = label;
    } else {
        adminUpdateBook(uid, field, val);
    }
};

// --- 🚪 EGRESS PROTOKOL (Úniková cesta) ---

// 🚀 OMEGA HACK: Globální propustka pro potlačení nativního alertu prohlížeče
window.OMEGA_SAFE_EXIT = false; 

const checkForUnsavedChanges = () => {
    if (!adminVirtualDb || adminVirtualDb.length === 0) return false;
    return adminVirtualDb.some(k => k._isAdded || k._isDeleted || (k._isEdited && !k._isDeleted));
};

window.attemptAdminExit = async function() {
    if (!checkForUnsavedChanges()) {
        window.OMEGA_SAFE_EXIT = true; 
        
        // 🧹 OMEGA HACK: Zastavení živého radaru (prevence memory leaku)
        if (window.statusPollingTimer) clearInterval(window.statusPollingTimer);
        
        const currentTheme = localStorage.getItem('omega_theme') || 'default';
        window.location.href = window.location.pathname + "?theme=" + currentTheme;
    } else {
        document.getElementById('omega-exit-modal').style.display = 'flex';
    }
};

window.confirmAdminExit = async function() {
    window.OMEGA_SAFE_EXIT = true; 
    
    // 🧹 OMEGA HACK: Zastavení živého radaru i při nuceném odchodu
    if (window.statusPollingTimer) clearInterval(window.statusPollingTimer);
    
    const currentTheme = localStorage.getItem('omega_theme') || 'default';
    window.location.href = window.location.pathname + "?theme=" + currentTheme;
};

window.closeExitModal = function() {
    document.getElementById('omega-exit-modal').style.display = 'none';
};

window.addEventListener('beforeunload', (event) => {
    // Pokud máme propustku z našeho vlastního tlačítka, okamžitě ukončíme kontrolu
    if (window.OMEGA_SAFE_EXIT) return undefined;

    if (checkForUnsavedChanges()) {
        event.preventDefault();
        event.returnValue = '';
        return '';
    }
});

window.addEventListener('popstate', (event) => {
    // Ochrana i proti tlačítku "Zpět" v prohlížeči
    if (checkForUnsavedChanges() && !window.OMEGA_SAFE_EXIT) {
        history.pushState(null, document.title, window.location.href);
        document.getElementById('omega-exit-modal').style.display = 'flex';
    }
});
// 🚀 OMEGA UI TRANSITION: Čistý vstup do administrace (Bypass Turnstile)
async function enterAdminUI(user, pwd) {
    sessionCredentials = { username: user, password: pwd };
    sessionPassword = pwd;

    const appElements = ['.layout', 'header', '.mobile-nav', 'footer', '.brand', 'main', '#toast', '#omega-print-layer'];
    appElements.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => el.style.setProperty('display', 'none', 'important'));
    });
    
    document.body.style.setProperty('overflow-y', 'auto', 'important');
    document.body.style.setProperty('padding-bottom', '0', 'important');
    
    if (authModalNode) authModalNode.style.display = 'none';

    // 🚀 OMEGA FIX: Zabití Lock Modálu (Odstranění neprůhledné zdi)
    const lockModal = document.getElementById('omega-lock-modal');
    if (lockModal) lockModal.style.display = 'none';

    const adminPortal = document.getElementById('omega-admin-portal');
    if (adminPortal) adminPortal.style.display = 'block';
    
    const currentTheme = localStorage.getItem('omega_theme') || 'default';
    history.pushState({ page: 'admin_active' }, "Administrace OMEGA", window.location.pathname + "?theme=" + currentTheme);
    
    setTimeout(() => {
        if (typeof window.initAuthorAutocomplete === 'function') window.initAuthorAutocomplete();
        if (typeof window.initAdminVirtualDb === 'function') window.initAdminVirtualDb(); 
        
        const activeUser = sessionCredentials.username.toLowerCase();

        // 🚀 OMEGA UX: Kontextové hlavní tlačítko pro export
        const saveBtn = document.querySelector('button[onclick="prepareDatabaseExport()"]');
        if (saveBtn) {
            if (activeUser === 'omega') saveBtn.innerHTML = '💾 Uložit změny a přepsat databázi';
            else if (activeUser === 'vedouci') saveBtn.innerHTML = '📩 Odeslat návrh ke schválení';
            else saveBtn.innerHTML = '💡 Odeslat nápady komisi';
        }

        // 🚀 OMEGA UX: Schránka pro vedoucí a Omegu
        // 🚀 OMEGA UX: Schránka pro vedoucí a Omegu
        if (activeUser === 'vedouci' || activeUser === 'omega') {
            const inboxBtn = document.getElementById('btn-admin-inbox');
            const starredBtn = document.getElementById('btn-admin-starred');
            const masterBtn = document.getElementById('btn-master-admin');
            if (inboxBtn) inboxBtn.style.display = 'block';
            if (starredBtn) starredBtn.style.display = 'block';
            if (masterBtn) masterBtn.style.display = 'block';
        }

        // 🚀 OMEGA RBAC: Protokol pro vedení školy
        if (activeUser === 'vedeni') {
            // Skryje staré prvky UI
            ['#tab-add', '#tab-edit', '#tab-summary', '#tab-changelog'].forEach(sel => {
                const el = document.querySelector(sel);
                if (el) el.style.display = 'none';
            });
            ['#admin-form-add', '#admin-form-edit', '#admin-form-summary', '#admin-form-changelog'].forEach(sel => {
                const el = document.querySelector(sel);
                if (el) el.style.display = 'none';
            });
            
            if (saveBtn) saveBtn.style.display = 'none';
            const tsExport = document.getElementById('ts-status-export')?.parentElement;
            if (tsExport) tsExport.style.display = 'none';

            // 🚀 OMEGA UX: Nemilosrdně zničíme ošklivý šedý obdélník pro Vedení
            const editorContainerWrapper = document.getElementById('tab-add')?.closest('div[style*="background: var(--bg-surface)"]');
            if (editorContainerWrapper) editorContainerWrapper.style.display = 'none';
            
            // Instrukce pro Vedení
            const desc = document.querySelector('#omega-admin-portal p');
            if (desc) desc.textContent = "Přihlášen režim: Audit a schvalování maturitních seznamů.";

            // 🚀 OMEGA FIX: Vymazání nesmyslného textu "Změny provádějte..."
            Array.from(document.querySelectorAll('#omega-admin-portal p')).forEach(p => {
                if (p.textContent.includes('Změny provádějte')) p.style.display = 'none';
            });

            // 🚀 OMEGA FIX: Odstranění "Disaster Recovery" (Obnova ze zálohy) přes vyhledání nadpisu
            const recoveryHeaders = Array.from(document.querySelectorAll('#omega-admin-portal h3'));
            const recoveryH = recoveryHeaders.find(h => h.textContent.includes('Obnova ze zálohy'));
            if (recoveryH && recoveryH.parentElement) {
                recoveryH.parentElement.style.display = 'none';
            }
        }

        if (activeUser === 'omega') {
            const changelogTab = document.getElementById('tab-changelog');
            if (changelogTab) changelogTab.style.display = 'block'; 
        }

        // 🚀 OMEGA RBAC: Izolace UI prvků
        if (activeUser !== 'vedeni' && activeUser !== 'omega') {
            // PDF Editor vidí jen Vedení a Omega
            const pdfBtn = document.querySelector('button[onclick="openAdminPdfEditor()"]');
            if (pdfBtn) pdfBtn.style.display = 'none';
            // 🚀 OMEGA FIX: Odstranění "Disaster Recovery" (Obnova ze zálohy) přes vyhledání nadpisu
            const recoveryHeaders = Array.from(document.querySelectorAll('#omega-admin-portal h3'));
            const recoveryH = recoveryHeaders.find(h => h.textContent.includes('Obnova ze zálohy'));
            if (recoveryH && recoveryH.parentElement) {
                recoveryH.parentElement.style.display = 'none';
            }
        }

        // Běžní učitelé nemají přístup k Disaster Recovery, ale ukládat (navrhovat) mohou
        if (activeUser !== 'vedouci' && activeUser !== 'omega' && activeUser !== 'vedeni') {
            const recoveryDiv = document.querySelector('div[style*="margin-top: 3rem"]');
            if (recoveryDiv) recoveryDiv.style.display = 'none';
        }

        if (typeof window.startIdleTimer === 'function') window.startIdleTimer();
        if (typeof window.checkSystemStatus === 'function') window.checkSystemStatus();
        // 🚀 OMEGA LIVE RADAR: Spustí polling stavu dodávky každých 15 sekund
        if (typeof window.checkSystemStatus === 'function') {
            window.checkSystemStatus(); // První okamžitý check
            if (window.statusPollingTimer) clearInterval(window.statusPollingTimer);
            window.statusPollingTimer = setInterval(window.checkSystemStatus, 15000);
        }
    }, 50);
}
// --- 🔐 ZERO-TRUST BRÁNA (SECURE AUTH MODE) ---
const btnAuthSubmit = document.getElementById('btn-auth-submit');
const btnAuthCancel = document.getElementById('btn-auth-cancel');
const authModalNode = document.getElementById('omega-auth-modal');
const userNode = document.getElementById('admin-username-input');
const passwordInputNode = document.getElementById('admin-password-input');
const authErrorMsgNode = document.getElementById('auth-error-msg');

if (btnAuthSubmit && authModalNode) {
    btnAuthSubmit.addEventListener('click', async () => {
        const user = userNode ? userNode.value.trim() : '';
        const pwd = passwordInputNode ? passwordInputNode.value.trim() : '';
        pendingCreds = { u: user, p: pwd }; // 🚀 Uložíme pro případné čekání

        // 1. Lokální validace formuláře
        if (!pwd || !user) {
            if (authErrorMsgNode) {
                authErrorMsgNode.innerText = "Zadejte platné přihlašovací údaje.";
                authErrorMsgNode.style.display = "block";
            }
            return;
        }

        // 2. Lokální validace Turnstile tokenu (Zamezí bypassu popupu)
        const tsInput = document.querySelector('#omega-auth-ts [name="cf-turnstile-response"]');
        const tsToken = tsInput ? tsInput.value : null;

        if (!tsToken) {
            if (authErrorMsgNode) {
                authErrorMsgNode.innerText = "Vyčkejte na ověření ochrany proti botům.";
                authErrorMsgNode.style.display = "block";
            }
            return;
        }

        // UX: Zneaktivnění tlačítka během komunikace
        btnAuthSubmit.disabled = true;
        btnAuthSubmit.innerText = "Ověřuji...";
        authErrorMsgNode.style.display = "none";

        try {
            // 3. ABSOLUTNÍ VERIFIKACE: Dotaz na CFW před vpuštěním do UI
            const response = await fetch(OMEGA_ADMIN_CONFIG.WORKER_URL + "/login", {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-Omega-Device-Id": getDeviceIdentity() },
                body: JSON.stringify({ username: user, password: pwd })
            });

            if (response.status === 401 || response.status === 429) {
                const errData = await response.json();
                throw new Error(errData.error || "Neplatné přihlašovací údaje.");
            }

            if (!response.ok) throw new Error("Chyba při komunikaci se serverem.");

            enterAdminUI(user,pwd);

        } catch (err) {
            authErrorMsgNode.innerText = err.message;
            authErrorMsgNode.style.display = "block";
            
            // Reset Turnstile po chybě
            if (typeof turnstile !== 'undefined') {
                try { turnstile.reset('#omega-auth-ts'); } catch(e) {}
            }
        } finally {
            btnAuthSubmit.disabled = false;
            btnAuthSubmit.innerText = "Vstoupit";
        }
    });

    if (passwordInputNode) {
        passwordInputNode.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') btnAuthSubmit.click();
        });
    }

    if (btnAuthCancel) {
        btnAuthCancel.addEventListener('click', () => {
            authModalNode.style.display = 'none';
            if (passwordInputNode) passwordInputNode.value = '';
            if (userNode) userNode.value = '';
            if (authErrorMsgNode) authErrorMsgNode.style.display = "none";
        });
    }
}

// --- ⌨️ KINETIKA KLÁVESNICE ---
['admin-dilo', 'admin-autor', 'admin-index'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                adminAddBook();
            }
        });
    }
});

// --- ⚙️ VIRTUÁLNÍ DATABÁZE (SHADOW DOM) ---
window.initAdminVirtualDb = function() {
    adminVirtualDb = JSON.parse(JSON.stringify(window.OMEGA_CONFIG.KNIHY_DB)).map(k => ({
        ...k,
        _isDeleted: false,
        _isAdded: false,
        _isEdited: false,
        _uid: Math.random().toString(36).substr(2, 9),
        _original: { ...k } // 🚀 Uložení prvotního otisku (Pristine State)
    }));
    renderAdminTable();
    window.adminChangelogDb = window.OMEGA_CONFIG.CHANGELOG_DB ? [...window.OMEGA_CONFIG.CHANGELOG_DB] : [];
    renderAdminChangelog();
};

// 🚀 OMEGA EDITOR ENGINE: Aplikace LIS Algoritmu přímo na aktivní tabulku editoru
window.adminEvaluateChanges = function() {
    const prodDb = window.OMEGA_CONFIG.KNIHY_DB.map((k, i) => ({...k, id: i + 1}));
    
    // Vyčleníme si pouze živé knihy a přečíslujeme je
    let activeBooks = adminVirtualDb.filter(b => !b._isDeleted);
    activeBooks.forEach((b, idx) => b.id = idx + 1);

    // Které knihy přežily z originálu?
    const surviving = activeBooks.filter(b => !b._isAdded && b._original);
    
    // Vypočteme LIS (Nejdelší rostoucí podposloupnost) pro detekci kaskád
    let lisItems = [];
    if (surviving.length > 0) {
        let dp = Array(surviving.length).fill(1);
        let prev = Array(surviving.length).fill(-1);
        let maxLen = 1;
        let maxIdx = 0;
        
        for (let i = 1; i < surviving.length; i++) {
            for (let j = 0; j < i; j++) {
                if (surviving[i]._original.id > surviving[j]._original.id && dp[i] < dp[j] + 1) {
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
            lisItems.push(surviving[curr]._original.id);
            curr = prev[curr];
        }
        lisItems.reverse();
    }

    // Aplikace zjištění na vizuál v editoru
    adminVirtualDb.forEach(book => {
        if (book._isAdded || book._isDeleted) return;

        const orig = book._original;
        const textChanged = (book.dilo !== orig.dilo || book.autor !== orig.autor || book.obdobi !== orig.obdobi || book.druh !== orig.druh);
        const isInLIS = lisItems.includes(orig.id);
        const idChanged = book.id !== orig.id;

        // 🚀 MAPOVÁNÍ BAREV:
        if (textChanged) {
            book._isEdited = true;  // ŽLUTÁ (Textová úprava)
            book._isMoved = false;
        } else if (!isInLIS) {
            book._isEdited = true;  // ŽLUTÁ (Manuální vytržení z řady se rovná úpravě)
            book._isMoved = false;
        } else if (idChanged) {
            book._isEdited = false;
            book._isMoved = true;   // MODRÁ (Kaskádový posun)
        } else {
            book._isEdited = false;
            book._isMoved = false;  // BEZ BARVY (Nic se nestalo)
        }
    });
};

window.renderAdminTable = function() {
    const container = document.getElementById('admin-live-table-container');
    
    // 🛡️ HLAVIČKA: Roztažená min-width pro mobil, zvětšené font-size
    let html = `<table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.95rem; min-width: 1000px; table-layout: fixed;">
        <thead style="position: sticky; top: 0; z-index: 10; background: var(--accent-primary); box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <tr>
                <th style="padding: 10px 2px; width: 6%; text-align: center; color: #ffffff; font-weight: bold;">↕</th>
                <th style="padding: 10px 2px; width: 6%; color: #ffffff; font-weight: bold;">ID</th>
                <th style="padding: 10px 4px; width: 30%; color: #ffffff; font-weight: bold;">Dílo</th>
                <th style="padding: 10px 4px; width: 20%; color: #ffffff; font-weight: bold;">Autor</th>
                <th style="padding: 10px 4px; width: 17%; color: #ffffff; font-weight: bold;">Období</th>
                <th style="padding: 10px 4px; width: 13%; color: #ffffff; font-weight: bold;">Druh</th>
                <th style="padding: 10px 2px; width: 8%; text-align: center; color: #ffffff; font-weight: bold;">Akce</th>
            </tr>
        </thead>
        <tbody>`;

    let visualId = 1;
    
    adminVirtualDb.forEach((book) => {
        const isDel = book._isDeleted;
        const isAdd = book._isAdded;
        const isEdit = book._isEdited && !isDel;
        
        let bg = 'transparent';
        let leftBorder = '4px solid transparent';
        let opacity = '1';
        
        if (isDel) {
            bg = 'rgba(239, 68, 68, 0.04)';
            leftBorder = '4px solid #ef4444'; 
            opacity = '0.5';
        } else if (isAdd) {
            bg = 'rgba(16, 185, 129, 0.06)';
            leftBorder = '4px solid #10b981'; 
        } else if (isEdit) {
            // Detekce úpravy textu
            const contentChanged = (
                book.dilo !== book._original.dilo ||
                book.autor !== book._original.autor ||
                book.obdobi !== book._original.obdobi ||
                book.druh !== book._original.druh
            );
            // Detekce explicitního (úmyslného) přesunu přes Teleport nebo Drag&Drop
            const explicitMove = book._moveHistory && book._moveHistory.length > 0;

            // 🚀 OMEGA FIX: Žlutá pro text a úmyslný posun, Modrá pro kaskádový pád
            if (contentChanged || explicitMove) {
                bg = 'rgba(245, 158, 11, 0.08)';
                leftBorder = '4px solid #f59e0b'; // Žlutá
            } else if (book.id !== book._original.id) {
                bg = 'rgba(59, 130, 246, 0.05)';
                leftBorder = '4px solid #3b82f6'; // Modrá
            }
        }

        // 🚀 OMEGA HACK: Decentní Teleport štítek (Dark Mode Safe)
        let idDisplay = isDel 
            ? `<strike>${book.id || '-'}</strike>` 
            : `<span onclick="openTeleportModal(${book.id})" style="cursor: pointer; padding: 2px 8px; border-radius: 4px; background: var(--bg-surface); border: 1px solid var(--border); color: var(--text-main); font-weight: bold; transition: all 0.2s ease; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);" title="Teleport (Přesunout dílo)" onmouseover="this.style.borderColor='var(--accent-primary)'; this.style.color='var(--accent-primary)';" onmouseout="this.style.borderColor='var(--border)'; this.style.color='var(--text-main)';">${visualId++} <span style="font-size:0.7em; opacity:0.5;">⇅</span></span>`;
        
        // 🚀 OMEGA UX: Kinetika Focusu s menším paddingem pro mobily
        const inputStyle = `width: 100%; background: transparent; border: 1px solid transparent; color: var(--text-main); padding: 8px 6px; border-radius: 6px; outline: none; transition: all 0.2s; font-family: inherit; font-size: 0.95rem; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;`;
        const focusLogic = `onmouseover="this.style.background='rgba(118, 203, 161, 0.05)'" onmouseout="this.style.background='transparent'" onfocus="this.style.background='var(--bg-base)'; this.style.borderColor='var(--accent-primary-light)'; this.style.boxShadow='0 0 0 3px rgba(118, 203, 161, 0.2)'" onblur="this.style.background='transparent'; this.style.borderColor='transparent'; this.style.boxShadow='none'"`;

        // 🚀 OMEGA KINETICS: Draggable řádek
        html += `<tr id="row-${book._uid}"
            ondragstart="adminDragStart(event, '${book._uid}')" ondragover="adminDragOver(event)" ondragleave="adminDragLeave(event)" ondrop="adminDrop(event, '${book._uid}')" ondragend="adminDragEnd(event)"
            style="background: ${bg}; opacity: ${opacity}; border-bottom: 1px solid var(--border); transition: all 0.2s;">
            
            <td onmousedown="document.getElementById('row-${book._uid}').setAttribute('draggable', 'true')" 
                onmouseup="document.getElementById('row-${book._uid}').removeAttribute('draggable')" 
                onmouseleave="document.getElementById('row-${book._uid}').removeAttribute('draggable')" 
                ontouchstart="document.getElementById('row-${book._uid}').setAttribute('draggable', 'true')"
                ontouchend="document.getElementById('row-${book._uid}').removeAttribute('draggable')"
                style="padding: 8px 2px; text-align: center; cursor: grab; color: var(--text-muted); opacity: 0.4; border-left: ${leftBorder}; user-select: none;">☰</td>
            
            <td style="padding: 8px 2px; color: var(--text-muted);">${idDisplay}</td>
            
            <td style="padding: 4px 2px;"><input type="text" value="${sanitize(book.dilo)}" onchange="adminUpdateBook('${book._uid}', 'dilo', this.value)" style="${inputStyle}" ${isDel ? 'disabled' : focusLogic}></td>
            <td style="padding: 4px 2px;"><input type="text" value="${sanitize(book.autor)}" onchange="adminUpdateBook('${book._uid}', 'autor', this.value)" style="${inputStyle}" ${isDel ? 'disabled' : focusLogic}></td>
            
            <td style="padding: 4px 2px;">
                <div style="${inputStyle} cursor: ${isDel ? 'not-allowed' : 'pointer'}; display: flex; justify-content: space-between; align-items: center;" 
                     ${isDel ? '' : `onclick="adminOpenCustomDropdown('${book._uid}', 'obdobi', event)" ${focusLogic}`}>
                    <span style="overflow: hidden; text-overflow: ellipsis;">${MAPA_OBDOBI[book.obdobi]}</span><span style="font-size:0.6em; opacity:0.5;">▼</span>
                </div>
            </td>
            <td style="padding: 4px 2px;">
                <div style="${inputStyle} cursor: ${isDel ? 'not-allowed' : 'pointer'}; display: flex; justify-content: space-between; align-items: center;" 
                     ${isDel ? '' : `onclick="adminOpenCustomDropdown('${book._uid}', 'druh', event)" ${focusLogic}`}>
                    <span style="overflow: hidden; text-overflow: ellipsis;">${book.druh.charAt(0).toUpperCase() + book.druh.slice(1)}</span><span style="font-size:0.6em; opacity:0.5;">▼</span>
                </div>
            </td>
            
            <td style="padding: 8px 2px; text-align: center;">
                ${isDel 
                    ? `<button type="button" onclick="adminToggleDelete('${book._uid}')" style="background: var(--bg-base); border: 1px solid var(--border); color: var(--text-main); padding: 6px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: 0.2s;" onmouseover="this.style.borderColor='var(--text-main)'" onmouseout="this.style.borderColor='var(--border)'" title="Obnovit">↩️</button>`
                    : `<button type="button" onclick="adminToggleDelete('${book._uid}')" style="background: transparent; border: none; font-size: 1.1rem; cursor: pointer; opacity: 0.5; transition: 0.2s; display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 6px;" onmouseover="this.style.opacity='1'; this.style.background='rgba(239, 68, 68, 0.1)'" onmouseout="this.style.opacity='0.5'; this.style.background='transparent'" title="Odstranit dílo">🗑️</button>`
                }
            </td>
        </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
    
    const indexInput = document.getElementById('admin-index');
    if (indexInput) indexInput.value = visualId;
};

window.adminAddBook = function() {
    const dilo = document.getElementById('admin-dilo').value.replace(/[“”„]/g, '"').replace(/[‘’]/g, "'").trim().replace(/\s+/g, ' ');
    const autor = document.getElementById('admin-autor').value.replace(/[“”„]/g, '"').replace(/[‘’]/g, "'").trim().replace(/\s+/g, ' ');
    const obdobi = document.getElementById('admin-obdobi').value;
    const druh = document.getElementById('admin-druh').value;
    let targetId = parseInt(document.getElementById('admin-index').value, 10);

    if (!dilo || !autor) return showToast("⚠️ Název a autor jsou povinní.");

    let insertIndex = adminVirtualDb.length;
    let currentVisId = 1;
    
    for (let i = 0; i < adminVirtualDb.length; i++) {
        if (currentVisId === targetId) { insertIndex = i; break; }
        if (!adminVirtualDb[i]._isDeleted) currentVisId++;
    }

    adminVirtualDb.splice(insertIndex, 0, {
        dilo, autor, obdobi, druh,
        _isAdded: true, _isDeleted: false, _isEdited: false,
        _uid: Math.random().toString(36).substr(2, 9)
    });

    adminEvaluateChanges(); // Přepočet indexů pro všechny pod ním
    isSafeToExit = false;
    renderAdminTable();
    document.getElementById('admin-dilo').value = '';
    document.getElementById('admin-autor').value = '';
    showToast("➕ Dílo vloženo do databáze.");
};

window.adminUpdateBook = function(uid, field, value) {
    const book = adminVirtualDb.find(k => k._uid === uid);
    if (!book) return;
    book[field] = value.trim();
    
    adminEvaluateChanges(); // Okamžitá evaluace vůči originálu
    isSafeToExit = false;
    renderAdminTable();
};

window.adminToggleDelete = function(uid) {
    const bookIndex = adminVirtualDb.findIndex(k => k._uid === uid);
    if (bookIndex === -1) return;
    
    if (adminVirtualDb[bookIndex]._isAdded) {
        adminVirtualDb.splice(bookIndex, 1);
        showToast("🗑️ Nové dílo zrušeno.");
    } else {
        adminVirtualDb[bookIndex]._isDeleted = !adminVirtualDb[bookIndex]._isDeleted;
        showToast(adminVirtualDb[bookIndex]._isDeleted ? "🗑️ Označeno ke smazání." : "↩️ Dílo obnoveno.");
    }
    
    // 🚀 OMEGA FIX: Mozek se postará o přepočet barev a Audit logu
    adminEvaluateChanges(); 
    isSafeToExit = false;
    
    renderAdminTable();
    if (typeof window.renderAdminSummary === 'function') window.renderAdminSummary();
};

// --- 🚀 OMEGA TELEPORT ENGINE (Nativní Modál s telemetrií) ---
let currentTeleportId = null;

window.openTeleportModal = function(oldId) {
    currentTeleportId = oldId;
    document.getElementById('teleport-old-id-display').innerText = oldId;
    
    const input = document.getElementById('teleport-new-id-input');
    const errorDisplay = document.getElementById('teleport-error-msg');
    
    // 🚀 OMEGA FIX: Max hodnota musí odrážet jen reálně VIDITELNÁ díla
    const visibleCount = adminVirtualDb.filter(b => !b._isDeleted).length;

    input.value = '';
    input.max = visibleCount;
    input.style.borderColor = "var(--border, #d1d5db)"; // Reset UI
    if (errorDisplay) errorDisplay.innerText = ''; // Vyčištění starých chyb
    
    document.getElementById('omega-teleport-modal').style.display = 'flex';
    setTimeout(() => input.focus(), 100);
};

window.closeTeleportModal = function() {
    document.getElementById('omega-teleport-modal').style.display = 'none';
    currentTeleportId = null;
};

window.confirmTeleport = function() {
    if (!currentTeleportId) return;

    const input = document.getElementById('teleport-new-id-input');
    const errorDisplay = document.getElementById('teleport-error-msg');
    let newId = parseInt(input.value);
    let oldId = currentTeleportId;
    
    // 🚀 OMEGA FIX: Skutečný počet dostupných pozic
    let maxId = adminVirtualDb.filter(b => !b._isDeleted).length;

    // Reset chybového stavu před novou evaluací
    input.style.borderColor = "var(--border, #d1d5db)";
    if (errorDisplay) errorDisplay.innerText = '';

    // Helper pro výpis chyby
    const throwError = (msg) => {
        input.style.borderColor = "var(--accent-red, #ef4444)";
        if (errorDisplay) errorDisplay.innerText = msg;
    };

    // Exaktní sémantická validace
    if (isNaN(newId)) return throwError("Zadejte platné číslo.");
    if (newId < 1) return throwError("ID nemůže být menší než 1.");
    if (newId > maxId) return throwError(`Databáze má pouze ${maxId} děl. Nelze přeskočit limit.`);
    if (newId === oldId) return throwError("Dílo se již na této pozici nachází.");

    // 🚀 OMEGA FIX: Nalezení reálného indexu v poli paměti
    let oldIndex = adminVirtualDb.findIndex(b => b.id === oldId && !b._isDeleted);
    if (oldIndex === -1) return throwError("Dílo nebylo v paměti nalezeno.");

    // Vyjmutí z původní pozice
    let movedItem = adminVirtualDb.splice(oldIndex, 1)[0];

    // Zvýrazníme žlutě (Audit Log si to přebere jako modrou díky předchozí opravě)
    if (!movedItem._isAdded) {
        movedItem._isEdited = true;
        if (!movedItem._moveHistory) movedItem._moveHistory = [];
        movedItem._moveHistory.push({ from: oldId, to: newId });
    }

    // 🚀 OMEGA FIX: Výpočet nového indexu tak, abychom přeskočili "neviditelná" smazaná díla
    let visibleCount = 0;
    let insertIndex = adminVirtualDb.length;
    for (let i = 0; i < adminVirtualDb.length; i++) {
        if (!adminVirtualDb[i]._isDeleted) {
            visibleCount++;
            if (visibleCount === newId) {
                insertIndex = i;
                break;
            }
        }
    }

    // Vložení na vypočítanou pozici
    adminVirtualDb.splice(insertIndex, 0, movedItem);

    // Tiše přepočítáme ID u zbytku (ignorujeme smazané položky!)
    let currentVisualId = 1;
    adminVirtualDb.forEach(book => {
        if (!book._isDeleted) {
            book.id = currentVisualId++;
        }
    });

    closeTeleportModal();
    renderAdminTable(); 
    if (typeof window.renderAdminSummary === 'function') window.renderAdminSummary();
};

// Záchyt Enter klávesy v modálu (odstranil jsem tvou duplikaci tohoto event listeneru)
document.getElementById('teleport-new-id-input')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') confirmTeleport();
});

// --- 🚑 DISASTER RECOVERY & AUTO-SNAPSHOT ---

const createAutoSnapshot = async () => {
    try {
        const res = await fetch('data-spspb.js');
        const content = await res.text();
        const dateStr = new Date().toISOString().slice(0,10);
        const blob = new Blob([content], { type: "text/javascript" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `data-spspb-zaloha-${dateStr}.js`;
        link.click();
    } catch (e) {
        console.error("Auto-záloha selhala.", e);
    }
};

// --- 🚑 DISASTER RECOVERY (Two-Step Verification) ---

let pendingRecoveryPayload = null; // Buffer pro záložní data

window.executeDisasterRecovery = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 🛡️ OBRANA PROTI RAM OVERFLOW: Max 1 MB (Databáze má reálně cca 20 KB)
    if (file.size > 1048576) { 
        showToast("❌ Soubor je abnormálně velký. Operace zablokována.");
        event.target.value = '';
        return;
    }

    try {
        const text = await file.text();
        if (!text.includes('window.OMEGA_CONFIG')) {
            throw new Error("Soubor neobsahuje platnou OMEGA databázi.");
        }
        
        // Místo nativního confirm() uložíme payload do RAM a otevřeme vlastní UI
        pendingRecoveryPayload = text;
        document.getElementById('omega-recovery-modal').style.display = 'flex';
        document.getElementById('recovery-step-1').style.display = 'block';
        document.getElementById('recovery-step-2').style.display = 'none';

    } catch (err) {
        showToast("❌ Chyba při čtení zálohy: " + err.message);
    }
    
    event.target.value = ''; // Reset file inputu
};

// Logika pro dvoufázový modál
window.showRecoveryStep2 = function() {
    document.getElementById('recovery-step-1').style.display = 'none';
    document.getElementById('recovery-step-2').style.display = 'block';
};

window.closeRecoveryModal = function() {
    document.getElementById('omega-recovery-modal').style.display = 'none';
    pendingRecoveryPayload = null; // Bezpečnostní výmaz RAM
    showToast("ℹ️ Obnova ze zálohy byla zrušena.");
};

window.executeFinalRecovery = function() {
    // 1. 🛡️ ZERO-TRUST BARIÉRA: Získání tokenu z administračního uzlu
    const turnstileInput = document.querySelector('#omega-export-ts [name="cf-turnstile-response"]');
    const turnstileToken = turnstileInput ? turnstileInput.value : null;

    if (!turnstileToken) {
        showToast("⚠️ Bezpečnostní systém Edge ještě nevygeneroval podpis. Vyčkejte sekundu a zkuste to znovu.");
        return;
    }

    // 2. 💾 KOPIE DO BEZPEČÍ: Vytáhneme payload před destrukcí
    const payloadToPush = pendingRecoveryPayload;

    // 3. 🧹 LOKÁLNÍ ÚKLID: Zavřeme modál napřímo (bez vyvolání Toastu o zrušení)
    document.getElementById('omega-recovery-modal').style.display = 'none';
    pendingRecoveryPayload = null; // Bezpečnostní výmaz RAM
    
    // 4. 🚀 TRANSPORT: Odeslání plných dat + důkazu
    pushToCloudflare(payloadToPush, turnstileToken); 
};

// --- 🧬 OMEGA EXPORT ENGINE (Zero-Trust Edition) ---

window.prepareDatabaseExport = async function() {
    const turnstileInput = document.querySelector('[name="cf-turnstile-response"]');
    const turnstileToken = turnstileInput ? turnstileInput.value : null;

    if (!turnstileToken) {
        showToast("⚠️ Bezpečnostní systém Cloudflare vás ještě neověřil.");
        return;
    }

    const addedCount = adminVirtualDb.filter(k => k._isAdded).length;
    const editedCount = adminVirtualDb.filter(k => k._isEdited && !k._isDeleted).length;
    const deletedCount = adminVirtualDb.filter(k => k._isDeleted && !k._isAdded).length;

    // 🚀 STRIKTNÍ OCHRANA: Hledí pouze na fyzické změny knih
    if (addedCount === 0 && editedCount === 0 && deletedCount === 0) {
        showToast("⚠️ Nebyly provedeny žádné změny v databázi knih.");
        return;
    }

    // 🚀 OMEGA FIX: Zálohu (snapshot) stahuje na disk POUZE hlavní architekt
    if (sessionCredentials.username === 'omega') {
        await createAutoSnapshot();
    }

    let newDb = [];
    let counter = 1;

    adminVirtualDb.forEach(book => {
        if (!book._isDeleted) {
            book._finalId = counter; // 🚀 INJEKCE PRO DETAILNÍ AUDIT LOG
            newDb.push({
                id: counter++,
                origId: book.origId || (book._original ? book._original.id : book.id),
                dilo: sanitize(book.dilo), 
                autor: sanitize(book.autor),
                druh: book.druh, 
                obdobi: book.obdobi
            });
        }
    });

    // 🚀 Aplikace DNA stopy do finálního JSONu
    const formattedDbString = "[\n" + newDb.map(book => `{ "id": ${book.id}, "origId": ${book.origId}, "dilo": ${JSON.stringify(book.dilo)}, "autor": ${JSON.stringify(book.autor)}, "druh": "${book.druh}", "obdobi": "${book.obdobi}" }`).join(',\n') + "\n    ]";
    const today = new Date().toLocaleDateString('cs-CZ');

    const modal = document.getElementById('omega-confirm-modal');
    const summary = document.getElementById('confirm-modal-summary');
    const titleEl = modal.querySelector('h3');
    const warningEl = modal.querySelector('p');
    const executeBtn = document.getElementById('btn-final-execute');
    
    const user = sessionCredentials.username.toLowerCase();
    
    // 🚀 OMEGA UX: Kontextový Copywriting podle role
    let titleText, warningText, btnText, placeholderText;

    if (user === 'omega') {
        titleText = "Potvrdit nevratné změny?";
        warningText = "Tato akce okamžitě přepíše produkční databázi školy. Změny se projeví všem studentům.";
        btnText = "🔥 Přepsat databázi";
        placeholderText = "Popis změn (POVINNÉ, např. 'Oprava překlepu')";
    } else if (user === 'vedouci') {
        titleText = "Odeslat návrh ke schválení?";
        warningText = "Návrh bude odeslán vedení školy. Dokud nebude schválen, na webu se nic nezmění.";
        btnText = "📩 Odeslat vedení";
        placeholderText = "Zdůvodnění úprav pro vedení školy (POVINNÉ)";
    } else {
        titleText = "Odeslat nápady vedoucí(mu) katedry?";
        warningText = "Vaše úpravy se nikam veřejně nepropíší. Budou uloženy jako doporučení pro vedoucí(ho) katedry.";
        btnText = "💡 Odeslat nápad";
        placeholderText = "Vzkaz pro vedoucí(ho) katedry (POVINNÉ)";
    }

    if (titleEl) titleEl.innerText = titleText;
    if (warningEl) warningEl.innerText = warningText;
    if (executeBtn) executeBtn.innerText = btnText;

    summary.innerHTML = `
        • Počet děl k odstranění: <strong style="color: var(--accent-red)">${deletedCount}</strong><br>
        • Počet nových děl k přidání: <strong style="color: var(--accent-green)">${addedCount}</strong><br>
        • Počet upravených děl: <strong style="color: #f59e0b">${editedCount}</strong><br>
        • Výsledný počet knih v DB: <strong>${newDb.length}</strong><br>
        <input type="text" id="export-commit-msg" placeholder="${placeholderText}" style="width: 100%; margin-top: 15px; padding: 10px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-base); color: var(--text-main); font-family: inherit; font-size: 0.85rem;">
    `;

    modal.style.display = 'flex';
    
    const finalExecuteBtn = document.getElementById('btn-final-execute');
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
            showToast("⚠️ Popis změn je povinný.");
            return; 
        }

        // 🚀 OMEGA SMART AUDIT v3: Enterprise Grid Formatting & No Comments
        let notes = [];

        // CSS Grid formátovač (Dokonalé lícování sloupců)
        const formatBook = (id, k) => `
            <div style="display: grid; grid-template-columns: 55px 3fr 2.5fr 1fr 1.5fr; gap: 10px; align-items: center; width: 100%;">
                <strong style="color: var(--accent-primary-light);">ID ${id}</strong>
                <span style="font-weight: bold; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${sanitize(k.dilo)}</span>
                <span style="color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${sanitize(k.autor)}</span>
                <span style="color: var(--text-muted); font-size: 0.9em;">${k.druh}</span>
                <span style="color: var(--text-muted); font-size: 0.9em; text-align: right;">${MAPA_OBDOBI[k.obdobi] || k.obdobi}</span>
            </div>`;

        const added = adminVirtualDb.filter(k => k._isAdded && !k._isDeleted);
        if (added.length > 0) {
            let html = `<strong style="color: #10b981; display: block; margin-bottom: 10px; font-size: 1.1em; letter-spacing: 0.5px;">➕ PŘIDÁNY:</strong><div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px;">`;
            added.sort((a,b) => a._finalId - b._finalId).forEach(k => {
                html += `<div style="padding: 8px 12px; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.15); border-radius: 6px;">${formatBook(k._finalId, k)}</div>`;
            });
            html += `</div>`;
            notes.push(html);
        }

        const deleted = adminVirtualDb.filter(k => k._isDeleted && !k._isAdded);
        if (deleted.length > 0) {
            let html = `<strong style="color: #ef4444; display: block; margin-bottom: 10px; font-size: 1.1em; letter-spacing: 0.5px;">🗑️ ODEBRÁNY:</strong><div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px;">`;
            deleted.sort((a,b) => a._original.id - b._original.id).forEach(k => {
                html += `<div style="padding: 8px 12px; background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.15); border-radius: 6px; opacity: 0.6; text-decoration: line-through;">${formatBook(k._original.id, k._original)}</div>`;
            });
            html += `</div>`;
            notes.push(html);
        }

        const edited = adminVirtualDb.filter(k => k._isEdited && !k._isDeleted);
        if (edited.length > 0) {
            let html = `<strong style="color: #f59e0b; display: block; margin-bottom: 10px; font-size: 1.1em; letter-spacing: 0.5px;">✏️ UPRAVENY / PŘESUNUTY:</strong><div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px;">`;
            edited.sort((a,b) => a._finalId - b._finalId).forEach(k => {
                html += `<div style="padding: 8px 12px; background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.15); border-radius: 6px;">${formatBook(k._finalId, k)}</div>`;
            });
            html += `</div>`;
            notes.push(html);
        }

        const appVerEl = document.getElementById('app-version-val');
        const appVer = appVerEl ? appVerEl.textContent : 'v9.0.2';

        // Zápis do lokální instance changelogu (Komentář už neukládáme jako vizuální prvek)
        adminChangelogDb.unshift({
            type: 'db', version: `Revize databáze (${appVer})`, date: today, notes: notes
        });

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
    CHANGELOG_DB: ${JSON.stringify(adminChangelogDb, null, 8)},
    KNIHY_DB: ${formattedDbString}
};`;

        finalExecuteBtn.disabled = true; 
        closeConfirmModal();
        pushToCloudflare(finalExportPayload, turnstileToken, customMsg);
    };
};

// --- 🚀 OMEGA DIRECT PUSH (Changelog Only) ---
window.prepareChangelogExport = async function() {
    const turnstileInput = document.querySelector('[name="cf-turnstile-response"]');
    const turnstileToken = turnstileInput ? turnstileInput.value : null;

    if (!turnstileToken) {
        showToast("⚠️ Bezpečnostní systém Edge ještě nevygeneroval podpis.");
        return;
    }

    const oldChangelog = JSON.stringify(window.OMEGA_CONFIG.CHANGELOG_DB || []);
    const newChangelog = JSON.stringify(adminChangelogDb);

    if (oldChangelog === newChangelog) {
        showToast("⚠️ V historii nejsou žádné nové neuložené změny.");
        return;
    }

    // 🚀 OMEGA FIX: Zálohu (snapshot) stahuje na disk POUZE hlavní architekt
    if (sessionCredentials.username === 'omega') {
        await createAutoSnapshot();
    }

    // 🚀 Použijeme originální databázi knih (žádné mutace)
    const currentDb = window.OMEGA_CONFIG.KNIHY_DB;
    // 🚀 Aplikace DNA stopy do finálního JSONu
    const formattedDbString = "[\n" + newDb.map(book => `{ "id": ${book.id}, "origId": ${book.origId}, "dilo": ${JSON.stringify(book.dilo)}, "autor": ${JSON.stringify(book.autor)}, "druh": "${book.druh}", "obdobi": "${book.obdobi}" }`).join(',\n') + "\n    ]";
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
    CHANGELOG_DB: ${JSON.stringify(adminChangelogDb, null, 8)},
    KNIHY_DB: ${formattedDbString}
};`;

    // Okamžitý direct push (obejde modál)
    pushToCloudflare(finalExportPayload, turnstileToken, "Aktualizace systému (Release Notes)");
};

window.closeConfirmModal = function() {
    document.getElementById('omega-confirm-modal').style.display = 'none';
};

// --- 🌐 CLOUDFLARE TRANSPORT (Zero-Trust Edition) ---

function pushToCloudflare(fileContent, turnstileToken, customMsg = "") {
    const modal = document.getElementById('admin-confirmation-modal');
    const msgEl = document.getElementById('admin-confirmation-msg');
    const downloadBtn = document.getElementById('btn-actual-download');
    
    modal.style.display = 'flex';
    msgEl.innerHTML = `⏳ <strong>Kompiluji databázi a ověřuji identitu přes Edge...</strong><br>Prosím, nezavírejte okno.`;
    if (downloadBtn) downloadBtn.style.display = (sessionCredentials.username === 'omega') ? 'block' : 'none';

    // 🚀 OMEGA FIX: Výhybka pro State Machine
    // Pokud jsi přihlášený ty (omega), pošleme to rovnou na ostrej Git ('/')
    // Pokud jsou to učitelé, pošleme to jen jako návrh ('/draft/submit')
    const targetEndpoint = (sessionCredentials.username === 'omega') ? "/" : "/draft/submit";

    fetch(OMEGA_ADMIN_CONFIG.WORKER_URL + targetEndpoint, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "X-Omega-Device-Id": getDeviceIdentity() 
        },
        body: JSON.stringify({ 
            fileContent: fileContent, 
            username: sessionCredentials.username, 
            password: sessionCredentials.password, 
            cf_token: turnstileToken ,
            commit_message: customMsg, 
            base_version: DB_VERSION 
        })
    })
    .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Neznámá chyba serveru.");
        
        // 🚀 OMEGA FIX: Vyčištění RAM a UI po produkčním uložení
        adminVirtualDb = adminVirtualDb.filter(book => !book._isDeleted);
        adminVirtualDb.forEach((book, idx) => {
            book.id = idx + 1;
            book._isAdded = false;
            book._isEdited = false;
            book._moveHistory = [];
            book._original = { ...book }; 
        });
        if (typeof renderAdminTable === 'function') renderAdminTable();
        if (typeof renderAdminSummary === 'function') renderAdminSummary();

        if (data.isSuggestion) {
            // 🚀 OMEGA FIX: Odpověď pro běžného učitele
            msgEl.innerHTML = `✅ <strong>NÁPAD BYL ODESLÁN</strong><br>Vaše myšlenky a úpravy byly odeslány katedře ČJL k nahlédnutí.<br><br><button onclick="closeAdminConfirmationModal(); checkSystemStatus();" class="btn" style="width:100%; padding:10px; background:var(--bg-base); border:1px solid var(--border); color:var(--text-main);">Rozumím</button>`;
            
            // 🚀 OMEGA FIX: Tvrdý reset paměti a překreslení tabulky do výchozího stavu
            if (typeof window.initAdminVirtualDb === 'function') window.initAdminVirtualDb();
            if (typeof window.renderAdminTable === 'function') window.renderAdminTable();
            
        } else if (data.isDraft) {
            // Oficiální návrh od Vedoucího pro Vedení
            msgEl.innerHTML = `✅ <strong>NÁVRH BYL ODESLÁN VEDENÍ</strong><br>Vaše změny byly uloženy na zabezpečený server. Na webu se propíší, jakmile je vedení školy schválí.<br><br><button onclick="closeAdminConfirmationModal(); checkSystemStatus();" class="btn" style="width:100%; padding:10px; background:var(--bg-base); border:1px solid var(--border); color:var(--text-main);">Rozumím</button>`;
            
            // 🚀 OMEGA FIX: Tvrdý reset paměti a překreslení tabulky do výchozího stavu
            if (typeof window.initAdminVirtualDb === 'function') window.initAdminVirtualDb();
            if (typeof window.renderAdminTable === 'function') window.renderAdminTable();
            
        } else {
            // Přímý zápis (Omega)
            msgEl.innerHTML = `✅ <strong>AKTUALIZACE ÚSPĚŠNÁ!</strong><br>Databáze byla exaktně zapsána do repozitáře.<br><br><button onclick="closeAdminConfirmationModal()" class="btn" style="width:100%; padding:10px; background:var(--bg-base); border:1px solid var(--border); color:var(--text-main);">Zavřít okno</button>`;
        }
        
        pendingExportPayload = null;
        if (typeof navrhniDalsiVolneId === 'function') navrhniDalsiVolneId();
        
        // 🛡️ Bezpečnostní reset pro EXPORT widget
        if (typeof turnstile !== 'undefined') {
            try { turnstile.reset('#omega-export-ts'); } catch (e) { turnstile.reset(); }
            const statusEl = document.getElementById('ts-status-export');
            if (statusEl) {
                statusEl.innerHTML = "⏳ Zajišťuji kryptografický podpis pro zápis...";
                statusEl.style.color = "var(--accent-primary, #e67e22)";
            }
        }
    })
    .catch((error) => {
        msgEl.innerHTML = `❌ <strong>BEZPEČNOSTNÍ NEBO SÍŤOVÁ CHYBA:</strong><br>${error.message}`;
        if (downloadBtn) {
            downloadBtn.style.display = 'block';
            downloadBtn.textContent = "Zavřít a vygenerovat nový podpis";
            // Obrana proti Replay Attack: Zavřeme okno a nutíme uživatele vygenerovat čerstvý token.
            downloadBtn.onclick = () => {
                // 🧹 DRUHÝ VÝMAZ RAM: Zničení payloadu při zavření chybového modálu
                pendingExportPayload = null;
                if (typeof closeAdminConfirmationModal === 'function') {
                    closeAdminConfirmationModal();
                } else {
                    modal.style.display = 'none';
                }
            }; 
        }
        
        // 🛡️ Bezpečnostní reset pro EXPORT widget při chybě
        if (typeof turnstile !== 'undefined') {
            try { turnstile.reset('#omega-export-ts'); } catch (e) { turnstile.reset(); }
            const statusEl = document.getElementById('ts-status-export');
            if (statusEl) {
                statusEl.innerHTML = "⏳ Generuji nový klíč po chybě...";
                statusEl.style.color = "var(--accent-primary, #e67e22)";
            }
        }
    });
}

window.closeAdminConfirmationModal = function() {
    document.getElementById('admin-confirmation-modal').style.display = 'none';
};

// --- 🕵️ STEALTH GATEWAY (5-CLICK TRIGGER PRO MODÁL) ---
(function() {
    const buildNode = document.getElementById('app-build-info');
    if (!buildNode) return;

    let interactionCount = 0;
    let interactionTimer = null;

    buildNode.addEventListener('click', () => {
        interactionCount++;
        buildNode.style.opacity = "0.7";
        setTimeout(() => buildNode.style.opacity = "1", 100);
        clearTimeout(interactionTimer);

        // 🚀 OMEGA FIX: Po 5 kliknutích otevřeme modál, žádné přesměrování URL
        if (interactionCount >= 5) {
            interactionCount = 0; // Reset počítadla
            
            const authModal = document.getElementById('omega-auth-modal');
            const pwdInput = document.getElementById('admin-password-input');
            const errorMsg = document.getElementById('auth-error-msg');
            
            if (authModal) {
                if (pwdInput) pwdInput.value = '';
                if (errorMsg) errorMsg.style.display = 'none';
                
                authModal.style.display = 'flex';
                // 🚀 OMEGA FIX: Focus na uživatelské jméno
                setTimeout(() => { 
                    const userInput = document.getElementById('admin-username-input');
                    if (userInput) userInput.focus(); 
                }, 100);
            }
        }

        interactionTimer = setTimeout(() => {
            interactionCount = 0;
        }, 1500);
    });
})();

// ==========================================
// 🛡️ ZERO-TRUST: EDGE CALLBACK LISTENERS
// ==========================================

window.turnstileSuccessAuth = function(token) {
    const statusEl = document.getElementById('ts-status-auth');
    if (statusEl) {
        statusEl.innerHTML = "✅ Pásmo zajištěno";
        statusEl.style.color = "var(--accent-green, #22c55e)";
    }
};

window.turnstileExpiredAuth = function() {
    const statusEl = document.getElementById('ts-status-auth');
    if (statusEl) {
        statusEl.innerHTML = "⚠️ Kryptografický klíč vypršel. Obnovuji...";
        statusEl.style.color = "var(--accent-red, #da2128)";
    }
    // Turnstile se sám pokusí o auto-refresh, pokud je v interakčním módu.
};

window.turnstileSuccessExport = function(token) {
    const statusEl = document.getElementById('ts-status-export');
    if (statusEl) {
        statusEl.innerHTML = "✅ Podpis připraven. Můžete bezpečně zapsat data.";
        statusEl.style.color = "var(--accent-green, #22c55e)";
    }
};

window.turnstileExpiredExport = function() {
    const statusEl = document.getElementById('ts-status-export');
    if (statusEl) {
        statusEl.innerHTML = "⚠️ Platnost podpisu vypršela. Obnovuji...";
        statusEl.style.color = "var(--accent-red, #da2128)";
    }
};


// --- 🖨️ WYSIWYG PDF GENERATOR (Precise Alignment Edition) ---
window.openAdminPdfEditor = function() {
    const container = document.getElementById('admin-print-document');
    const modal = document.getElementById('admin-print-editor-modal');
    if (!container || !modal) return;

    // 🚀 OMEGA FIX: Hierarchie zdrojů dat pro tisk (Kaskádový výběr)
    let dataSource = window.OMEGA_CONFIG.KNIHY_DB; // Záložní plán: Aktuální schválená produkce
    
    if (sessionCredentials.username === 'vedeni' && window.DRAFT_KNIHY_DB) {
        // 1. PRIORITA: Pokud to tiskne Vedení a existuje návrh, vytisknou návrh
        dataSource = window.DRAFT_KNIHY_DB;
    } else if (typeof adminVirtualDb !== 'undefined' && adminVirtualDb.length > 0) {
        // 2. PRIORITA: Učitel tiskne to, co má právě lokálně rozpracované
        dataSource = adminVirtualDb.filter(k => !k._isDeleted);
    }

    const chrono = getOmegaChronology();
    const imgUrl = window.location.origin + window.location.pathname.replace('index.html', '').replace(/\/$/, '') + '/spspb-logo-2000px.png';

    const printObdobi = {
        "do18": "Do konce 18. st.",
        "19": "19. století",
        "svet20": "Svět 20. a 21. st.",
        "cz20": "ČR 20. a 21. st."
    };

    // --- DYNAMICKÉ OVLÁDÁNÍ OBORŮ ---
    window.adminRemoveOborRow = function(btn) {
        btn.closest('tr').remove();
    };
    window.adminAddOborRow = function() {
        const tbody = document.getElementById('admin-obory-tbody');
        const tr = document.createElement('tr');
        const btnStyle = "position: absolute; left: 2px; top: 50%; transform: translateY(-50%); background: transparent; color: #ef4444; border: none; cursor: pointer; font-size: 14px; padding: 0; line-height: 1;";
        tr.innerHTML = `
            <td style="border-right: 1pt solid black; border-bottom: 0.5pt solid black; padding: 1.5px 5px 1.5px 20px; position: relative;" class="editable-field" contenteditable="true"><button class="no-print" onclick="adminRemoveOborRow(this)" style="${btnStyle}">×</button>NOVÝ OBOR</td>
            <td style="border-bottom: 0.5pt solid black; padding: 1.5px 5px;" class="editable-field" contenteditable="true">Nový ŠVP</td>
        `;
        tbody.insertBefore(tr, tbody.lastElementChild);
    };

    // --- GENERACE TABULKY KNIH ---
    let tableRows = `
        <tr style="background: white;">
            <td style="border-right: 0.5pt solid black; border-bottom: 1.5pt solid black; padding: 3px; text-align: center; vertical-align: middle; font-weight: bold; font-size: 9.5pt; text-transform: uppercase;">Č.S.</td>
            <td style="border-right: 0.5pt solid black; border-bottom: 1.5pt solid black; padding: 3px; text-align: center; vertical-align: middle; font-weight: bold; font-size: 9.5pt; text-transform: uppercase;">AUTOR</td>
            <td style="border-right: 0.5pt solid black; border-bottom: 1.5pt solid black; padding: 3px; text-align: center; vertical-align: middle; font-weight: bold; font-size: 9.5pt; text-transform: uppercase;">DÍLO</td>
            <td style="border-right: 0.5pt solid black; border-bottom: 1.5pt solid black; padding: 3px; text-align: center; vertical-align: middle; font-weight: bold; font-size: 9.5pt; text-transform: uppercase;">LIT. DRUH</td>
            <td style="border-bottom: 1.5pt solid black; padding: 3px; text-align: center; vertical-align: middle; font-weight: bold; font-size: 9.5pt; text-transform: uppercase;">OBDOBÍ</td>
        </tr>
    `;

    let counter = 1;
    dataSource.forEach((book, index) => {
        const isLast = index === dataSource.length - 1;
        const bottomBorder = isLast ? 'none' : '0.5pt solid black';
        
        tableRows += `
            <tr style="line-height: 1.15; page-break-inside: avoid;">
                <td style="border-right: 0.5pt solid black; border-bottom: ${bottomBorder}; padding: 1.5px 3px; text-align: center; vertical-align: middle; font-size: 9.5pt; font-weight: bold;">${counter}.</td>
                <td style="border-right: 0.5pt solid black; border-bottom: ${bottomBorder}; padding: 1.5px 3px; vertical-align: middle; font-size: 9.5pt; font-weight: bold;">${sanitize(book.autor)}</td>
                <td style="border-right: 0.5pt solid black; border-bottom: ${bottomBorder}; padding: 1.5px 3px; vertical-align: middle; font-size: 9.5pt; font-weight: bold;">${sanitize(book.dilo)}</td>
                <td style="border-right: 0.5pt solid black; border-bottom: ${bottomBorder}; padding: 1.5px 3px; text-align: left; vertical-align: middle; font-size: 9.5pt;">${book.druh}</td>
                <td style="border-bottom: ${bottomBorder}; padding: 1.5px 3px; text-align: left; vertical-align: middle; font-size: 9.5pt;">${printObdobi[book.obdobi] || book.obdobi}</td>
            </tr>
        `;
        counter++;
    });

    const btnStyle = "position: absolute; left: 2px; top: 50%; transform: translateY(-50%); background: transparent; color: #ef4444; border: none; cursor: pointer; font-size: 14px; padding: 0; line-height: 1;";

    // --- HLAVNÍ DOKUMENT ---
    container.innerHTML = `
        <style>
            /* 🚀 OMEGA HACK: Absolutní karanténa proti Dark Mode */
            #admin-print-document { background-color: white !important; }
            #admin-print-document td, 
            #admin-print-document th { background-color: white !important; color: black !important; border-color: black !important; }
            #admin-print-document .editable-field { color: black !important; }
        </style>
        <div style="font-family: Arial, Helvetica, sans-serif; color: black; line-height: 1.2; padding: 0; font-feature-settings: 'liga' 0, 'calt' 0; -webkit-font-smoothing: antialiased;">
            
            <table style="width: 100%; border: none; border-collapse: collapse;">
                
                <thead style="display: table-header-group; border: none;">
                    <tr>
                        <td style="width: 65px; border: none; padding: 0 0 10px 0; vertical-align: middle;">
                            <img src="${imgUrl}" style="width: 58px; height: auto; display: block; -webkit-print-color-adjust: exact;">
                        </td>
                        <td style="border: none; padding: 0 0 10px 5px; vertical-align: middle;">
                            <div class="editable-field" contenteditable="true" style="font-size: 10.5pt;">Střední průmyslová škola a Vyšší odborná škola Příbram II, Hrabákova 271</div>
                        </td>
                    </tr>
                </thead>

                <tbody style="border: none;">
                    <tr>
                        <td colspan="2" style="border: none; padding: 0;">

                            <div style="display: flex; width: 100%; margin-bottom: 12px; margin-top: -30px; position: relative; z-index: 10;">
                                <div style="width: 65px; flex-shrink: 0;"></div>
                                <div style="flex-grow: 1; padding-left: 5px;">
                                    <div class="editable-field" contenteditable="true" style="font-size: 10.5pt; font-weight: bold; text-transform: uppercase;">
                                        SEZNAM LITERÁRNÍCH DĚL K MZ - ÚSTNÍ ČÁST ŠK. ROK ${chrono.format}
                                    </div>
                                </div>
                            </div>

                            <div style="position: relative;">
                                <button class="no-print" onclick="adminAddOborRow()" style="position: absolute; right: 0; top: -30px; background: #10b981; color: white; border: none; padding: 3px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; z-index: 100;">➕ Přidat obor</button>
                                <table style="width: 100%; border: 1.5pt solid black; border-collapse: separate; border-spacing: 0; margin-bottom: 10px; font-size: 9.5pt;">
                                    <tbody id="admin-obory-tbody">
                                        <tr style="background: white;">
                                            <td style="width: 50%; border-right: 1pt solid black; border-bottom: 1pt solid black; padding: 2px 5px; font-weight: bold; text-align: left;">Obor vzdělávání:</td>
                                            <td style="width: 50%; border-bottom: 1pt solid black; padding: 2px 5px; font-weight: bold; text-align: left;">ŠVP:</td>
                                        </tr>
                                        <tr>
                                            <td style="border-right: 1pt solid black; border-bottom: 0.5pt solid black; padding: 1.5px 5px 1.5px 20px; position: relative;" class="editable-field" contenteditable="true"><button class="no-print" onclick="adminRemoveOborRow(this)" style="${btnStyle}">×</button>23-41-M/01 STROJÍRENSTVÍ</td>
                                            <td style="border-bottom: 0.5pt solid black; padding: 1.5px 5px;" class="editable-field" contenteditable="true">Strojírenství počítačové</td>
                                        </tr>
                                        <tr>
                                            <td style="border-right: 1pt solid black; border-bottom: 0.5pt solid black; padding: 1.5px 5px 1.5px 20px; position: relative;" class="editable-field" contenteditable="true"><button class="no-print" onclick="adminRemoveOborRow(this)" style="${btnStyle}">×</button>26-41-M/01 ELEKTROTECHNIKA</td>
                                            <td style="border-bottom: 0.5pt solid black; padding: 1.5px 5px;" class="editable-field" contenteditable="true">Multimedia a informatika</td>
                                        </tr>
                                        <tr>
                                            <td style="border-right: 1pt solid black; border-bottom: 0.5pt solid black; padding: 1.5px 5px 1.5px 20px; position: relative;" class="editable-field" contenteditable="true"><button class="no-print" onclick="adminRemoveOborRow(this)" style="${btnStyle}">×</button>26-41-M/01 ELEKTROTECHNIKA</td>
                                            <td style="border-bottom: 0.5pt solid black; padding: 1.5px 5px;" class="editable-field" contenteditable="true">Počítačové technologie</td>
                                        </tr>
                                        <tr>
                                            <td style="border-right: 1pt solid black; border-bottom: 0.5pt solid black; padding: 1.5px 5px 1.5px 20px; position: relative;" class="editable-field" contenteditable="true"><button class="no-print" onclick="adminRemoveOborRow(this)" style="${btnStyle}">×</button>18-20M/01 INFORMAČNÍ TECHNOLOGIE</td>
                                            <td style="border-bottom: 0.5pt solid black; padding: 1.5px 5px;" class="editable-field" contenteditable="true">Informační technologie</td>
                                        </tr>
                                        <tr>
                                            <td style="border-right: 1pt solid black; border-bottom: 0.5pt solid black; padding: 1.5px 5px 1.5px 20px; position: relative;" class="editable-field" contenteditable="true"><button class="no-print" onclick="adminRemoveOborRow(this)" style="${btnStyle}">×</button>36-47-M/01 STAVEBNICTVÍ</td>
                                            <td style="border-bottom: 0.5pt solid black; padding: 1.5px 5px;" class="editable-field" contenteditable="true">Pozemní stavitelství</td>
                                        </tr>
                                        <tr>
                                            <td style="border-right: 1pt solid black; padding: 1.5px 5px 1.5px 20px; position: relative;" class="editable-field" contenteditable="true"><button class="no-print" onclick="adminRemoveOborRow(this)" style="${btnStyle}">×</button>36-47-M/01 STAVEBNICTVÍ</td>
                                            <td style="padding: 1.5px 5px;" class="editable-field" contenteditable="true">Pozemní stavitelství a architektura</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <table style="width: 100%; border-collapse: collapse; border-left: 1.5pt solid black; border-right: 1.5pt solid black; margin-bottom: 12px; table-layout: fixed;">
                                <colgroup>
                                    <col style="width: 5.5%;">
                                    <col style="width: 26%;">
                                    <col style="width: 37.5%;">
                                    <col style="width: 13%;">
                                    <col style="width: 18%;">
                                </colgroup>
                                <thead style="display: table-header-group;">
                                    <tr><th colspan="5" style="padding: 0; height: 1px; border-top: 1.5pt solid black;"><div style="height: 0;"></div></th></tr>
                                </thead>
                                <tfoot style="display: table-footer-group;">
                                    <tr><td colspan="5" style="padding: 0; height: 1px; border-bottom: 1.5pt solid black;"><div style="height: 0;"></div></td></tr>
                                </tfoot>
                                <tbody>
                                    ${tableRows}
                                </tbody>
                            </table>

                            <table style="width: 100%; border: 1.5pt solid black; border-collapse: separate; border-spacing: 0; font-size: 9.5pt; margin-bottom: 12px; page-break-inside: avoid;">
                                <tbody style="border: none;">
                                    <tr>
                                        <td rowspan="4" style="width: 12%; text-align: center; vertical-align: middle; font-weight: bold; border-right: 1pt solid black; padding: 2px;">20<br>literárních<br>děl</td>
                                        <td style="width: 58%; border-right: 1pt solid black; border-bottom: 0.5pt solid black; padding: 2px 6px;">Světová a česká literatura do konce 18. stol.</td>
                                        <td style="width: 30%; border-bottom: 0.5pt solid black; padding: 2px 6px;">min. 2 díla</td>
                                    </tr>
                                    <tr>
                                        <td style="border-right: 1pt solid black; border-bottom: 0.5pt solid black; padding: 2px 6px;">Světová a česká literatura 19. stol.</td>
                                        <td style="border-bottom: 0.5pt solid black; padding: 2px 6px;">min. 3 díla</td>
                                    </tr>
                                    <tr>
                                        <td style="border-right: 1pt solid black; border-bottom: 0.5pt solid black; padding: 2px 6px;">Světová literatura 20. a 21. století</td>
                                        <td style="border-bottom: 0.5pt solid black; padding: 2px 6px;">min. 4 díla</td>
                                    </tr>
                                    <tr>
                                        <td style="border-right: 1pt solid black; padding: 2px 6px;">Česká literatura 20. a 21. století</td>
                                        <td style="padding: 2px 6px;">min. 5 děl</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div style="page-break-inside: avoid; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                                <div class="editable-field" contenteditable="true" style="font-size: 9.5pt; font-weight: bold; margin-bottom: 15px; line-height: 1.3; width: 100%;">
                                    Žák sestavuje svůj seznam = 20 lit. děl z předloženého školního seznamu, musí být zastoupena vždy alespoň 2x lyrika, epika, drama.
                                </div>

                                <div class="editable-field" contenteditable="true" style="font-size: 10pt; margin-top: 5px; width: 100%;">
                                    V Příbrami dne .................................. stanovil ředitel školy PaedDr. Tomáš Hlaváč
                                </div>
                            </div>

                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    modal.style.display = 'flex';
    document.body.classList.add('omega-admin-printing');
};

// 🚀 OMEGA FIX: Garbage Collector pro tiskové vlákno (Duální čištění)
window.addEventListener('afterprint', () => {
    // 1. Zničení studentské paměti a jejího agresivního CSS
    const studentPrintArea = document.getElementById('print-area');
    if (studentPrintArea) {
        studentPrintArea.innerHTML = ''; 
    }

    // 2. Zničení případné staré admin vrstvy (fallback)
    const oldOmegaLayer = document.getElementById('omega-print-layer');
    if (oldOmegaLayer) {
        oldOmegaLayer.innerHTML = '';
        oldOmegaLayer.style.display = 'none';
    }
    
    // 3. Očištění document.body od tiskových příznaků
    document.body.classList.remove('omega-admin-printing');
    document.body.style.overflow = 'auto';

    console.log("🧹 Tisková paměť byla úspěšně vyčištěna.");
});

// --- 📄 CHANGELOG ENGINE (Tri-Tab Edition) ---

window.switchPublicChangelog = function(tab) {
    const tabs = ['dev', 'features', 'db'];
    
    tabs.forEach(t => {
        const content = document.getElementById(`changelog-content-${t}`);
        const btn = document.getElementById(`tab-pub-${t}`);
        
        if (content) content.style.display = (tab === t) ? 'block' : 'none';
        if (btn) {
            btn.style.color = (tab === t) ? 'var(--accent-primary)' : 'var(--text-muted)';
            btn.style.borderBottomColor = (tab === t) ? 'var(--accent-primary)' : 'transparent';
            btn.style.opacity = (tab === t) ? '1' : '0.6';
        }
    });
};

window.openChangelog = function() {
    const modal = document.getElementById('omega-changelog-modal');
    const dbData = window.OMEGA_CONFIG.CHANGELOG_DB || [];
    
    // 🚀 OMEGA FIX: Dynamický render (Vývoj má odrážky, DB má čisté Grid bloky)
    const renderHtml = (items) => items.map(entry => `
        <div style="margin-bottom: 20px; background: var(--bg-base); padding: 15px; border-radius: 6px; border-left: 3px solid var(--accent-primary-light);">
            <h3 style="color: var(--text-main); margin-top: 0; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span>${sanitize(entry.version)} <span style="font-size: 0.75rem; opacity: 0.6; font-weight: normal; margin-left: 10px; color: var(--text-muted);">${sanitize(entry.date)}</span></span>
            </h3>
            ${entry.type === 'db' 
                ? `<div style="color: var(--text-main); margin-top: 15px;">${entry.notes.join('')}</div>`
                : `<ul style="color: var(--text-muted); padding-left: 20px; margin: 0; line-height: 1.5;">${entry.notes.map(n => `<li style="margin-bottom: 5px;">${n}</li>`).join('')}</ul>`
            }
        </div>
    `).join('') || '<div style="color: var(--text-muted); font-style: italic; text-align: center; padding: 20px;">Zatím žádné záznamy v této kategorii.</div>';

    // Filtrace
    const devCont = document.getElementById('changelog-content-dev');
    const featCont = document.getElementById('changelog-content-features');
    const dbCont = document.getElementById('changelog-content-db');

    if (devCont) devCont.innerHTML = renderHtml(dbData.filter(i => i.type === 'dev' || !i.type)); 
    if (featCont) featCont.innerHTML = renderHtml(dbData.filter(i => i.type === 'features'));
    if (dbCont) dbCont.innerHTML = renderHtml(dbData.filter(i => i.type === 'db'));

    // Všechny taby jsou veřejně přístupné
    const tabDev = document.getElementById('tab-pub-dev');
    const tabFeat = document.getElementById('tab-pub-features');
    if (tabDev) tabDev.style.display = 'inline-block';
    if (tabFeat) tabFeat.style.display = 'inline-block';

    switchPublicChangelog('features'); 

    if (modal) modal.style.display = 'flex';
};

window.closeChangelog = function() {
    const modal = document.getElementById('omega-changelog-modal');
    if (modal) modal.style.display = 'none';
};

// --- ADMIN CHANGELOG ENGINE ---
window.adminAddChangelogEntry = function() {
    const type = document.getElementById('ch-type').value;
    const ver = document.getElementById('ch-version').value.trim();
    const dat = document.getElementById('ch-date').value.trim();
    const notes = document.getElementById('ch-notes').value.split('\n').filter(l => l.trim() !== "");

    if (!ver || !dat || notes.length === 0) return showToast("⚠️ Vyplňte kompletní údaje o verzi a poznámky.");

    adminChangelogDb.unshift({ type: type, version: ver, date: dat, notes: notes });
    
    renderAdminChangelog();
    showToast("📄 Záznam přidán (nezapomeňte Uložit databázi).");
    
    document.getElementById('ch-notes').value = '';
};

window.renderAdminChangelog = function() {
    const cont = document.getElementById('admin-changelog-preview');
    if (!cont) return;
    
    const icons = { 'dev': '⚙️', 'features': '🚀', 'db': '📚' };
    
    cont.innerHTML = adminChangelogDb.map((entry, idx) => `
        <div style="padding: 10px; border: 1px solid var(--border); border-radius: 6px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; background: var(--bg-base);">
            <div>
                <span style="font-size: 1.2em; margin-right: 8px;">${icons[entry.type] || '⚙️'}</span>
                <strong>${sanitize(entry.version)}</strong> <span style="opacity: 0.6; font-size: 0.85em;">(${sanitize(entry.date)})</span>
            </div>
            <button onclick="adminDeleteChangelog(${idx})" style="background: transparent; border: none; color: var(--accent-red); cursor: pointer; padding: 5px;">🗑️</button>
        </div>
    `).join('');
};

window.adminDeleteChangelog = function(idx) {
    adminChangelogDb.splice(idx, 1);
    renderAdminChangelog();
};

// --- 🏛️ OMEGA GOVERNANCE ENGINE ---

// --- 🚀 OMEGA UI: Minimalizace Trackeru a State Management ---
window.OMEGA_TRACKER_DISMISSED = false;
window.LAST_SEEN_TRUCK_STATUS = null;

window.dismissTruckTracker = function() {
    window.OMEGA_TRACKER_DISMISSED = true; // Zapsáno do paměti relace
    const tracker = document.getElementById('omega-truck-tracker');
    if (tracker) tracker.style.display = 'none';
};

window.toggleTruckTracker = function() {
    const body = document.getElementById('truck-body-container');
    const btn = document.getElementById('truck-toggle-btn');
    
    // 🚀 OMEGA FIX: Plynulá interpolace přes max-height
    if (!body.style.maxHeight || body.style.maxHeight !== '0px') {
        body.style.maxHeight = '0px';
        body.style.opacity = '0';
        body.style.marginTop = '0px';
        btn.innerHTML = '➕ Rozbalit';
    } else {
        body.style.maxHeight = '150px'; 
        body.style.opacity = '1';
        body.style.marginTop = '30px';
        btn.innerHTML = '➖ Zabalit';
    }
};

function updateDeliveryTruck(status, feedback = "") {
    // 🚀 OMEGA FIX: Pokud Radar hlásí prázdno, ale my zrovna ukazujeme finální stav,
    // ignorujeme to, dokud uživatel dodávku sám nezavře křížkem.
    if ((!status || status === 'idle') && 
        (window.LAST_SEEN_TRUCK_STATUS === 'accepted' || window.LAST_SEEN_TRUCK_STATUS === 'rejected') && 
        !window.OMEGA_TRACKER_DISMISSED) {
        return;
    }

    if (window.LAST_SEEN_TRUCK_STATUS !== status) {
        window.OMEGA_TRACKER_DISMISSED = false;
        window.LAST_SEEN_TRUCK_STATUS = status;
    }

    const tracker = document.getElementById('omega-truck-tracker');
    if (window.OMEGA_TRACKER_DISMISSED) {
        if (tracker) tracker.style.display = 'none';
        return;
    }

    const line = document.getElementById('truck-progress-line');
    const truck = document.getElementById('truck-icon');
    const statusText = document.getElementById('truck-status-text');
    
    if (!tracker || !line || !truck) return;

    document.querySelectorAll('.truck-stop').forEach(s => {
        s.style.color = 'var(--text-muted)';
        s.style.textShadow = 'none';
    });

    const activateStop = (id, color) => {
        const stop = document.getElementById(id);
        if (stop) {
            stop.style.color = color;
            stop.style.textShadow = `0 0 10px ${color}`;
        }
    };

    if (status === 'pending') {
        tracker.style.display = 'block';
        tracker.style.borderColor = '#f59e0b';
        statusText.innerHTML = "Balíček je na celnici. Čeká se na audit vedení školy.";
        statusText.style.color = "#f59e0b";
        
        line.style.width = '63%'; 
        line.style.background = '#f59e0b';
        truck.style.left = '65%'; 
        truck.innerText = "🚚"; // Čistá dodávka
        truck.style.transform = "translateX(-50%) scaleX(-1)"; 
        
        activateStop('stop-1', '#f59e0b'); activateStop('stop-2', '#f59e0b'); activateStop('stop-3', '#f59e0b');
    } 
    else if (status === 'rejected') {
        tracker.style.display = 'block';
        tracker.style.borderColor = '#ef4444';
        statusText.innerHTML = `❌ Zásilka vrácena. Důvod: <span style="font-weight: normal;">"${sanitize(feedback)}"</span>`;
        statusText.style.color = "#ef4444";
        
        line.style.width = '0%';
        line.style.background = '#ef4444';
        // 🚀 Změněno z 12% na 7%, aby byla blíž u startu
        truck.style.left = '7%'; 
        truck.innerText = "🚐💨"; // Výfuk ponechán
        truck.style.transform = "translateX(-50%) scaleX(1)"; 
        
        activateStop('stop-1', '#ef4444');
    }
    else if (status === 'accepted') {
        tracker.style.display = 'block';
        tracker.style.borderColor = 'var(--accent-green)';
        statusText.innerHTML = `✅ Publikováno! <span style="font-weight: normal; color: var(--text-main);">"${sanitize(feedback)}"</span>`;
        statusText.style.color = "var(--accent-green)";
        
        line.style.width = '100%'; 
        line.style.background = 'var(--accent-green)';
        truck.style.left = '94%'; 
        // 🚀 Odebrána hvězdička
        truck.innerText = "🚚"; 
        truck.style.transform = "translateX(-50%) scaleX(-1)"; 
        
        activateStop('stop-1', 'var(--accent-green)'); 
        activateStop('stop-2', 'var(--accent-green)'); 
        activateStop('stop-3', 'var(--accent-green)');
        activateStop('stop-4', 'var(--accent-green)');
    }
    else {
        tracker.style.display = 'none';
    }
}

function renderDraftDiff(draftDb) {
    const container = document.getElementById('approval-diff-container');
    if (!container) return;

    // Využijeme nový textový generátor pro "Fyzické změny"
    let html = window.generateDiffHtml(draftDb);
    
    // 🚀 OMEGA FIX: Napojení nového barevného jádra pro detailní kontrolu vedením
    html += `
        <div style="margin-top: 15px; border-top: 1px dashed var(--border); padding-top: 15px;">
            <button onclick="const l = document.getElementById('full-draft-list'); const isHidden = l.style.display === 'none'; l.style.display = isHidden ? 'block' : 'none'; this.innerHTML = isHidden ? '➖ Skrýt vizualizaci změn' : '👁️ Zobrazit kompletní vizualizaci změn (${draftDb.length} děl)';" style="background: transparent; border: 1px solid var(--border); color: var(--text-main); padding: 8px 15px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; width: 100%; transition: 0.2s;" onmouseover="this.style.borderColor='var(--text-main)'" onmouseout="this.style.borderColor='var(--border)'">
                👁️ Zobrazit kompletní vizualizaci změn (${draftDb.length} děl)
            </button>
            <div id="full-draft-list" style="display: none; margin-top: 15px; background: var(--bg-surface); border-radius: 6px; border: 1px solid var(--border); box-shadow: inset 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
                ${window.generateColoredPreviewTable(draftDb)}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// --- 🕊️ OMEGA PULL REQUEST ENGINE (Inbox V3) ---
window.OMEGA_INBOX_CACHE = []; 
window.CURRENT_INBOX_TAB = 'new'; // 'new' nebo 'starred'

window.openInboxModal = function() {
    document.getElementById('omega-inbox-modal').style.display = 'flex';
    fetchInbox(); 
};

window.switchInboxTab = function(tab) {
    window.CURRENT_INBOX_TAB = tab;
    const isNew = tab === 'new';
    
    document.getElementById('tab-inbox-new').style.color = isNew ? 'var(--accent-green)' : 'var(--text-muted)';
    document.getElementById('tab-inbox-new').style.borderBottomColor = isNew ? 'var(--accent-green)' : 'transparent';
    
    document.getElementById('tab-inbox-starred').style.color = !isNew ? '#f59e0b' : 'var(--text-muted)';
    document.getElementById('tab-inbox-starred').style.borderBottomColor = !isNew ? '#f59e0b' : 'transparent';
    
    renderInboxContent();
};

window.fetchInbox = async function() {
    if (sessionCredentials.username !== 'vedouci' && sessionCredentials.username !== 'omega') return;
    try {
        const res = await fetch(OMEGA_ADMIN_CONFIG.WORKER_URL + "/inbox/list", {
            method: "POST", headers: { "Content-Type": "application/json", "X-Omega-Device-Id": getDeviceIdentity() },
            body: JSON.stringify({ admin_username: sessionCredentials.username, admin_password: sessionCredentials.password })
        });
        window.OMEGA_INBOX_CACHE = await res.json();
        
        // 🚀 OMEGA FIX: Badge počítá POUZE nepřečtené (neohvězdičkované)
        const unreadCount = window.OMEGA_INBOX_CACHE.filter(m => !m.starred).length;
        const badge = document.getElementById('inbox-badge');
        if (badge) {
            badge.innerText = unreadCount;
            badge.style.opacity = unreadCount > 0 ? '1' : '0';
        }
        
        renderInboxContent();
    } catch (e) {}
};

window.renderInboxContent = function() {
    const content = document.getElementById('inbox-content');
    if (!content) return;
    
    const isStarredTab = window.CURRENT_INBOX_TAB === 'starred';
    const filteredData = window.OMEGA_INBOX_CACHE.filter(m => isStarredTab ? m.starred : !m.starred).reverse();
    
    if (filteredData.length === 0) {
        content.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-muted); background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px dashed var(--border);">
                <div style="font-size: 3rem; margin-bottom: 15px;">${isStarredTab ? '⭐' : '🕊️'}</div>
                <h4 style="margin: 0 0 5px 0; color: var(--text-main);">${isStarredTab ? 'Žádné uložené nápady' : 'Poštovní holub hlásí prázdno'}</h4>
                <p style="margin: 0; font-size: 0.9rem;">${isStarredTab ? 'Zatím jste si žádný nápad neoznačili hvězdičkou.' : 'Zatím nedorazily žádné nové nápady od kolegů.'}</p>
            </div>`;
        return;
    }

    content.innerHTML = filteredData.map(msg => {
        let diffHtml = "Chyba analýzy";
        const jsonMatch = msg.payload.match(/KNIHY_DB:\s*(\[[\s\S]*?\])\s*};/);
        if (jsonMatch) diffHtml = generateDiffHtml(JSON.parse(jsonMatch[1]));
        
        const starColor = msg.starred ? '#f59e0b' : 'var(--text-muted)';
        const starIcon = msg.starred ? '★' : '☆';

        return `
        <div style="background: var(--bg-base); border: 1px solid ${msg.starred ? '#f59e0b' : 'var(--border)'}; padding: 15px; border-radius: 6px; margin-bottom: 15px; position: relative;">
            <button onclick="toggleStarInbox('${msg.id}')" style="position: absolute; top: 10px; right: 10px; background: transparent; border: none; color: ${starColor}; font-size: 1.5rem; cursor: pointer; transition: 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" title="Uložit k projednání">${starIcon}</button>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">📅 ${msg.date} | 👤 <strong style="color: var(--accent-primary);">${sanitize(msg.author)}</strong></div>
            <div style="color: var(--text-main); font-style: italic; margin-bottom: 12px; font-size: 0.95rem;">"${sanitize(msg.msg)}"</div>
            <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 4px; border-left: 2px solid var(--border); margin-bottom: 15px;">
                ${diffHtml}
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="previewInboxIdea('${msg.id}')" class="btn" style="flex: 1; border-color: var(--border); color: var(--text-main); transition: 0.2s;" onmouseover="this.style.background='var(--bg-surface)'">👁️ Zobrazit kompletní seznam</button>
                <button onclick="openIdeaRejectModal('${msg.id}')" class="btn" style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--accent-red); color: var(--accent-red); padding: 8px 15px; transition: 0.2s;" onmouseover="this.style.background='var(--accent-red)'; this.style.color='white';">❌ Zamítnout</button>
            </div>
        </div>`;
    }).join('');
};

window.toggleStarInbox = async function(id) {
    const msg = window.OMEGA_INBOX_CACHE.find(m => m.id === id);
    if (msg) {
        msg.starred = !msg.starred; 
        
        // 🚀 OMEGA FIX: 0ms latence. Překreslujeme lokálně. Žádné volání fetchInbox()!
        const unreadData = window.OMEGA_INBOX_CACHE.filter(m => !m.starred);
        const starredData = window.OMEGA_INBOX_CACHE.filter(m => m.starred);
        
        const badgeInbox = document.getElementById('inbox-badge');
        if (badgeInbox) { badgeInbox.innerText = unreadData.length; badgeInbox.style.opacity = unreadData.length > 0 ? '1' : '0'; }
        
        const badgeStarred = document.getElementById('starred-badge');
        if (badgeStarred) { badgeStarred.innerText = starredData.length; badgeStarred.style.opacity = starredData.length > 0 ? '1' : '0'; }
        
        renderInboxContent(unreadData, 'inbox-content', false);
        renderInboxContent(starredData, 'starred-content', true);
    }
    
    // Tichý zápis na pozadí. Nečekáme na odpověď.
    try {
        fetch(OMEGA_ADMIN_CONFIG.WORKER_URL + "/inbox/star", {
            method: "POST", headers: { "Content-Type": "application/json", "X-Omega-Device-Id": getDeviceIdentity() },
            body: JSON.stringify({ admin_username: sessionCredentials.username, admin_password: sessionCredentials.password, msg_id: id })
        });
    } catch (e) {}
};

// --- 👁️ OMEGA IDEA PREVIEW ENGINE ---
window.previewInboxIdea = function(msgId) {
    const msg = window.OMEGA_INBOX_CACHE.find(m => m.id === msgId);
    if (!msg) return;
    
    let draftDb;
    try {
        const jsonMatch = msg.payload.match(/KNIHY_DB:\s*(\[[\s\S]*?\])\s*};/);
        draftDb = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(msg.payload);
    } catch (err) { return showToast("❌ Nelze analyzovat data nápadu."); }
    
    document.getElementById('preview-idea-msg-id').value = msgId;
    document.getElementById('idea-preview-diff').innerHTML = window.generateDiffHtml(draftDb);
    
    // 🚀 OMEGA FIX: Odstraněn zastaralý HTML kód. Nyní se volá barevné vizualizační jádro!
    document.getElementById('idea-preview-table').innerHTML = window.generateColoredPreviewTable(draftDb);
    
    document.getElementById('omega-idea-preview-modal').style.display = 'flex';
};
// --- ☁️ OMEGA CLOUD STASH (Uložení práce na PIN) ---
window.stashCurrentWork = async function() {
    const currentDraft = adminVirtualDb.filter(k => !k._isDeleted).map((k, idx) => ({
        id: idx + 1, dilo: sanitize(k.dilo), autor: sanitize(k.autor), druh: k.druh, obdobi: k.obdobi
    }));
    showToast("⏳ Ukládám stav do cloudu...");
    try {
        const res = await fetch(OMEGA_ADMIN_CONFIG.WORKER_URL + "/draft/stash-save", {
            method: "POST", headers: { "Content-Type": "application/json", "X-Omega-Device-Id": getDeviceIdentity() },
            body: JSON.stringify({ admin_username: sessionCredentials.username, admin_password: sessionCredentials.password, fileContent: JSON.stringify(currentDraft) })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        document.getElementById('stash-pin-display').innerHTML = `<span style="cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;" onclick="navigator.clipboard.writeText('${data.pin}'); showToast('✅ PIN [${data.pin}] úspěšně zkopírován!');" title="Klikněte pro zkopírování">${data.pin}</span>`;
        
        document.getElementById('stash-copy-btn').onclick = () => {
            navigator.clipboard.writeText(data.pin).then(() => {
                showToast(`✅ PIN [${data.pin}] byl zkopírován do schránky!`);
            }).catch(e => showToast("⚠️ Kopírování selhalo. Zkopírujte kód ručně."));
        };
        document.getElementById('omega-pin-save-modal').style.display = 'flex';
    } catch(e) { showToast("❌ " + e.message); }
};

window.openPinLoadModal = function() {
    document.getElementById('load-pin-input').value = '';
    document.getElementById('omega-pin-load-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('load-pin-input').focus(), 100);
};

window.executeStashLoad = async function() {
    const pin = document.getElementById('load-pin-input').value.trim();
    if (pin.length !== 4) return showToast("⚠️ PIN musí mít přesně 4 znaky.");
    showToast("⏳ Stahuji data z cloudu...");
    try {
        const res = await fetch(OMEGA_ADMIN_CONFIG.WORKER_URL + "/draft/stash-load", {
            method: "POST", headers: { "Content-Type": "application/json", "X-Omega-Device-Id": getDeviceIdentity() },
            body: JSON.stringify({ admin_username: sessionCredentials.username, admin_password: sessionCredentials.password, pin: pin })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        // 🚀 OMEGA FIX: Přesměrováno na rekonstrukční jádro
        window.reconstructVirtualDbFromDraft(JSON.parse(data.data));
        
        document.getElementById('omega-pin-load-modal').style.display = 'none';
        showToast(`✅ Data z PINu [${pin.toUpperCase()}] byla úspěšně načtena!`);
    } catch(e) { showToast("❌ " + e.message); }
};

// --- 🕊️ OMEGA PULL REQUEST ENGINE (Inbox V5 - Finální verze) ---
window.OMEGA_INBOX_CACHE = []; 
window.CURRENT_INBOX_TAB = 'new'; // 'new' nebo 'starred'

window.openInboxModal = function() {
    document.getElementById('omega-inbox-modal').style.display = 'flex';
    fetchInbox(); 
};

window.openStarredModal = function() {
    document.getElementById('omega-starred-modal').style.display = 'flex';
    fetchInbox(); 
};

window.fetchInbox = async function() {
    if (sessionCredentials.username !== 'vedouci' && sessionCredentials.username !== 'omega') return;
    try {
        const res = await fetch(OMEGA_ADMIN_CONFIG.WORKER_URL + "/inbox/list", {
            method: "POST", headers: { "Content-Type": "application/json", "X-Omega-Device-Id": getDeviceIdentity() },
            body: JSON.stringify({ admin_username: sessionCredentials.username, admin_password: sessionCredentials.password })
        });
        window.OMEGA_INBOX_CACHE = await res.json();
        
        const unreadData = window.OMEGA_INBOX_CACHE.filter(m => !m.starred);
        const starredData = window.OMEGA_INBOX_CACHE.filter(m => m.starred);
        
        const badgeInbox = document.getElementById('inbox-badge');
        if (badgeInbox) { badgeInbox.innerText = unreadData.length; badgeInbox.style.opacity = unreadData.length > 0 ? '1' : '0'; }
        
        const badgeStarred = document.getElementById('starred-badge');
        if (badgeStarred) { badgeStarred.innerText = starredData.length; badgeStarred.style.opacity = starredData.length > 0 ? '1' : '0'; }
        
        renderInboxContent(unreadData, 'inbox-content', false);
        renderInboxContent(starredData, 'starred-content', true);
    } catch (e) {}
};

window.renderInboxContent = function(dataArray, containerId, isStarred) {
    const content = document.getElementById(containerId);
    if (!content) return;
    
    if (dataArray.length === 0) {
        content.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-muted); background: var(--bg-surface); border-radius: 8px; border: 1px dashed var(--border);">
                <div style="font-size: 3rem; margin-bottom: 15px;">${isStarred ? '⭐' : '🕊️'}</div>
                <h4 style="margin: 0 0 5px 0; color: var(--text-main);">${isStarred ? 'Žádné uložené nápady' : 'Schránka je prázdná'}</h4>
            </div>`;
        return;
    }

    content.innerHTML = dataArray.reverse().map(msg => {
        let diffHtml = "Chyba analýzy";
        let draftDb = [];
        try {
            const jsonMatch = msg.payload.match(/KNIHY_DB:\s*(\[[\s\S]*?\])\s*};/);
            draftDb = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(msg.payload);
            diffHtml = generateDiffHtml(draftDb);
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
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">📅 ${msg.date} | 👤 <strong style="color: var(--accent-primary);">${sanitize(msg.author)}</strong></div>
            <div style="color: var(--text-main); font-style: italic; margin-bottom: 12px; font-size: 0.95rem;">"${sanitize(msg.msg)}"</div>
            <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 4px; border-left: 2px solid ${isStarred ? '#f59e0b' : 'var(--border)'}; margin-bottom: 15px;">
                ${diffHtml}
            </div>
            <div style="display: flex; gap: 10px;">${actionButtons}</div>
        </div>`;
    }).join('');
};

window.toggleStarInbox = async function(id) {
    const msg = window.OMEGA_INBOX_CACHE.find(m => m.id === id);
    if (msg) { msg.starred = !msg.starred; fetchInbox(); } 
    try {
        await fetch(OMEGA_ADMIN_CONFIG.WORKER_URL + "/inbox/star", {
            method: "POST", headers: { "Content-Type": "application/json", "X-Omega-Device-Id": getDeviceIdentity() },
            body: JSON.stringify({ admin_username: sessionCredentials.username, admin_password: sessionCredentials.password, msg_id: id })
        });
    } catch (e) {}
};

window.dismissInboxMessage = async function(id) {
    // 🚀 OMEGA FIX: Vymazán nehezký alert. 0ms latence.
    window.OMEGA_INBOX_CACHE = window.OMEGA_INBOX_CACHE.filter(m => m.id !== id);
    
    const unreadData = window.OMEGA_INBOX_CACHE.filter(m => !m.starred);
    const starredData = window.OMEGA_INBOX_CACHE.filter(m => m.starred);
    
    const badgeInbox = document.getElementById('inbox-badge');
    if (badgeInbox) { badgeInbox.innerText = unreadData.length; badgeInbox.style.opacity = unreadData.length > 0 ? '1' : '0'; }
    
    const badgeStarred = document.getElementById('starred-badge');
    if (badgeStarred) { badgeStarred.innerText = starredData.length; badgeStarred.style.opacity = starredData.length > 0 ? '1' : '0'; }
    
    renderInboxContent(unreadData, 'inbox-content', false);
    renderInboxContent(starredData, 'starred-content', true);

    showToast("🗑️ Nápad odstraněn.");

    // Tichý výmaz na pozadí.
    try {
        fetch(OMEGA_ADMIN_CONFIG.WORKER_URL + "/inbox/delete", {
            method: "POST", headers: { "Content-Type": "application/json", "X-Omega-Device-Id": getDeviceIdentity() },
            body: JSON.stringify({ admin_username: sessionCredentials.username, admin_password: sessionCredentials.password, msg_id: id })
        });
    } catch (e) {}
};

// 🚀 OMEGA RECONSTRUCTOR: Propárování cizích dat na originál (Nutné pro LIS Algoritmus)
window.reconstructVirtualDbFromDraft = function(draftDb) {
    // FIX: Zde se původní databázi dodají IDčka, aby měl algoritmus podle čeho počítat osy
    const prodDb = window.OMEGA_CONFIG.KNIHY_DB.map((k, i) => ({...k, id: i + 1}));
    adminVirtualDb = [];

    draftDb.forEach((k, idx) => {
        const orig = prodDb.find(prodBook => prodBook.dilo.toLowerCase().trim() === k.dilo.toLowerCase().trim());
        adminVirtualDb.push({
            ...k,
            id: idx + 1,
            _isDeleted: false,
            _isAdded: !orig,
            _isEdited: false,
            _uid: Math.random().toString(36).substr(2, 9),
            _original: orig || {...k, id: idx + 1} 
        });
    });

    prodDb.forEach(prodBook => {
        const existsInDraft = draftDb.find(draftBook => draftBook.dilo.toLowerCase().trim() === prodBook.dilo.toLowerCase().trim());
        if (!existsInDraft) {
            adminVirtualDb.push({
                ...prodBook,
                _isDeleted: true,
                _isAdded: false,
                _isEdited: false,
                _uid: Math.random().toString(36).substr(2, 9),
                _original: {...prodBook}
            });
        }
    });

    // Spustí LIS algoritmus a rozzáří barvy
    if (typeof window.adminEvaluateChanges === 'function') window.adminEvaluateChanges();
    if (typeof window.renderAdminTable === 'function') window.renderAdminTable();
    if (typeof window.renderAdminSummary === 'function') window.renderAdminSummary();
};

window.confirmInboxMerge = async function() {
    try {
        const msgId = document.getElementById('preview-idea-msg-id').value;
        const msg = window.OMEGA_INBOX_CACHE.find(m => m.id === msgId);
        if (!msg) throw new Error("Zpráva nenalezena v paměti.");
        
        let draftDb;
        const jsonMatch = msg.payload.match(/KNIHY_DB:\s*(\[[\s\S]*?\])\s*};/);
        draftDb = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(msg.payload); 
        
        // 🚀 OMEGA FIX: Přesměrováno na rekonstrukční jádro (Opravuje kaskády)
        window.reconstructVirtualDbFromDraft(draftDb);
        
        document.getElementById('omega-idea-preview-modal').style.display = 'none';
        document.getElementById('omega-inbox-modal').style.display = 'none';
        document.getElementById('omega-starred-modal').style.display = 'none';
        showToast("✅ Nápad byl převzat do vašeho editoru.");
        
        const feedbackMsg = document.getElementById('accept-idea-msg') ? document.getElementById('accept-idea-msg').value.trim() : "";
        fetch(OMEGA_ADMIN_CONFIG.WORKER_URL + "/inbox/accept", {
            method: "POST", headers: { "Content-Type": "application/json", "X-Omega-Device-Id": getDeviceIdentity() },
            body: JSON.stringify({ admin_username: sessionCredentials.username, admin_password: sessionCredentials.password, msg_id: msgId, feedback: feedbackMsg })
        });
    } catch (err) {
        showToast("❌ Chyba při převzetí: " + err.message);
    }
};

// 🚀 OMEGA MERGE ENGINE: Třícestné slučování s řešením konfliktů
window.PENDING_MERGE_ANALYSIS = null;
window.PENDING_MERGE_MSG_ID = null;

window.mergeInboxIdea = async function() {
    try {
        const msgId = document.getElementById('preview-idea-msg-id').value;
        const msg = window.OMEGA_INBOX_CACHE.find(m => m.id === msgId);
        if (!msg) throw new Error("Zpráva nenalezena v paměti.");

        let draftDb;
        const jsonMatch = msg.payload.match(/KNIHY_DB:\s*(\[[\s\S]*?\])\s*};/);
        draftDb = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(msg.payload);

        // Analýza pomocí našeho LIS Enginu
        const analysis = window.analyzeDraftChanges(draftDb);

        // Pokud kolega něco ručně přesunul nebo přepsal, musíme vyvolat Conflict Resolver
        if (analysis.manuallyMoved.length > 0 || analysis.edited.length > 0) {
            window.PENDING_MERGE_ANALYSIS = analysis;
            window.PENDING_MERGE_MSG_ID = msgId;
            renderConflictUI(analysis);
            return; // Slučování se pozastaví, čekáme na výběr uživatele
        }

        // Pokud jde jen o čisté přidání/smazání bez konfliktů, provedeme Fast-Forward Merge
        window.PENDING_MERGE_ANALYSIS = analysis;
        window.PENDING_MERGE_MSG_ID = msgId;
        executeResolvedMerge(true); 

    } catch (err) {
        showToast("❌ Chyba při čtení dat: " + err.message);
    }
};

window.renderConflictUI = function(analysis) {
    const container = document.getElementById('conflict-items-container');
    let html = '';

    const createRadioUI = (type, bookId, labelLocal, labelIncoming, desc, title) => `
        <div class="conflict-item" style="background: var(--bg-base); border: 1px solid var(--border); padding: 15px; border-radius: 8px;">
            <strong style="color: var(--text-main); font-size: 1.05rem;">${sanitize(title)}</strong> <span style="color: var(--text-muted); font-size: 0.8rem; margin-left: 5px;">(${desc})</span>
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

    // Vykreslení přesunů (Žlutá osa LIS)
    analysis.manuallyMoved.forEach(book => {
        const localBook = adminVirtualDb.find(b => !b._isDeleted && b._original && b._original.id === book.prodMatch.id);
        const localPos = localBook ? localBook.id : 'Smazáno';
        html += createRadioUI('move', book.prodMatch.id, `Ponechat mou pozici (${localPos}.)`, `Převzít pozici kolegy (${book.draftIndex}.)`, 'Kolidující přesun', book.dilo);
    });

    // Vykreslení textových úprav
    analysis.edited.forEach(book => {
        html += createRadioUI('edit', book.prodMatch.id, `Ponechat můj text`, `Převzít text kolegy`, 'Kolidující úprava textu', book.dilo);
    });

    container.innerHTML = html;
    document.getElementById('omega-conflict-modal').style.display = 'flex';
};

// Finální exekuce (Po kliknutí na "Dokončit sloučení")
window.executeResolvedMerge = function(isFastForward = false) {
    const analysis = window.PENDING_MERGE_ANALYSIS;
    let changesCount = 0;
    let acceptedMoves = []; // Fyzické přesuny v paměti

    // 1. Přidání nových děl
    analysis.added.forEach(incomingBook => {
        const exists = adminVirtualDb.find(b => !b._isDeleted && b.dilo.toLowerCase().trim() === incomingBook.dilo.toLowerCase().trim());
        if (!exists) {
            adminVirtualDb.push({
                ...incomingBook,
                id: adminVirtualDb.length + 1, 
                _isDeleted: false, _isAdded: true, _isEdited: false,
                _uid: Math.random().toString(36).substr(2, 9), _original: null
            });
            changesCount++;
        }
    });

    // 2. Aplikace smazaných děl
    analysis.deleted.forEach(delBook => {
        const target = adminVirtualDb.find(b => !b._isDeleted && b._original && b._original.id === delBook.id);
        if (target) { target._isDeleted = true; changesCount++; }
    });

    // 3. Rozhodnutí z modálu (Pokud není Fast-Forward)
    if (!isFastForward) {
        analysis.manuallyMoved.forEach(book => {
            const choice = document.querySelector(`input[name="move_${book.prodMatch.id}"]:checked`).value;
            if (choice === 'incoming') acceptedMoves.push({ prodId: book.prodMatch.id, targetIndex: book.draftIndex - 1 });
        });

        analysis.edited.forEach(edBook => {
            const choice = document.querySelector(`input[name="edit_${edBook.prodMatch.id}"]:checked`).value;
            if (choice === 'incoming') {
                const target = adminVirtualDb.find(b => !b._isDeleted && b._original && b._original.id === edBook.prodMatch.id);
                if (target) {
                    target.dilo = edBook.dilo; target.autor = edBook.autor; target.obdobi = edBook.obdobi; target.druh = edBook.druh;
                    changesCount++;
                }
            }
        });
    }

    // 4. Aplikace odsouhlasených posunů (Vyjmutí a vložení na nový index v poli)
    acceptedMoves.sort((a,b) => a.targetIndex - b.targetIndex).forEach(m => {
        const currentIndex = adminVirtualDb.findIndex(b => b._original && b._original.id === m.prodId);
        if (currentIndex > -1) {
            const item = adminVirtualDb.splice(currentIndex, 1)[0];
            adminVirtualDb.splice(m.targetIndex, 0, item);
            changesCount++;
        }
    });

    // 5. Rekalibrace UI a barviček
    if (typeof window.adminEvaluateChanges === 'function') window.adminEvaluateChanges();
    if (typeof window.renderAdminTable === 'function') window.renderAdminTable();
    if (typeof window.renderAdminSummary === 'function') window.renderAdminSummary();

    // 6. Úklid
    document.getElementById('omega-conflict-modal').style.display = 'none';
    document.getElementById('omega-idea-preview-modal').style.display = 'none';
    document.getElementById('omega-inbox-modal').style.display = 'none';
    document.getElementById('omega-starred-modal').style.display = 'none';

    showToast(`✅ Sloučení úspěšné (${changesCount} provedených změn).`);

    // Potvrzení serveru
    const feedbackMsg = document.getElementById('accept-idea-msg') ? document.getElementById('accept-idea-msg').value.trim() : "";
    fetch(OMEGA_ADMIN_CONFIG.WORKER_URL + "/inbox/accept", {
        method: "POST", headers: { "Content-Type": "application/json", "X-Omega-Device-Id": getDeviceIdentity() },
        body: JSON.stringify({ admin_username: sessionCredentials.username, admin_password: sessionCredentials.password, msg_id: window.PENDING_MERGE_MSG_ID, feedback: feedbackMsg })
    }).catch(e => {});
};

window.openIdeaRejectModal = function(id) {
    document.getElementById('reject-idea-msg-id').value = id;
    document.getElementById('reject-idea-input').value = '';
    document.getElementById('omega-reject-idea-modal').style.display = 'flex';
};

window.executeIdeaReject = async function() {
    const id = document.getElementById('reject-idea-msg-id').value;
    const feedback = document.getElementById('reject-idea-input').value.trim();
    if (!feedback) return showToast("⚠️ Zadejte důvod zamítnutí.");
    
    document.getElementById('omega-reject-idea-modal').style.display = 'none';
    showToast("⏳ Odesílám zamítnutí učiteli...");
    try {
        await fetch(OMEGA_ADMIN_CONFIG.WORKER_URL + "/inbox/reject", {
            method: "POST", headers: { "Content-Type": "application/json", "X-Omega-Device-Id": getDeviceIdentity() },
            body: JSON.stringify({ admin_username: sessionCredentials.username, admin_password: sessionCredentials.password, msg_id: id, feedback: feedback })
        });
        fetchInbox(); 
    } catch (e) {}
};

// --- 🚀 OMEGA VEDENÍ ACTION ENGINE ---
window.handleDraftAction = function(action) {
    if (action === 'approve') {
        document.getElementById('omega-approve-modal').style.display = 'flex';
    } else if (action === 'reject') {
        window.openRejectModal(); // Vedení zamítá návrh
    }
};

window.executeDraftApprove = async function() {
    document.getElementById('omega-approve-modal').style.display = 'none';
    const feedbackMsg = document.getElementById('approve-draft-msg') ? document.getElementById('approve-draft-msg').value.trim() : "";
    window.executeDraftApi('/draft/approve', { feedback: feedbackMsg });
};

window.executeDraftApi = async function(endpoint, extraData) {
    showToast("⏳ Komunikuji s Edge sítí...");
    try {
        const res = await fetch(OMEGA_ADMIN_CONFIG.WORKER_URL + endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Omega-Device-Id": getDeviceIdentity() },
            body: JSON.stringify({ 
                admin_username: sessionCredentials.username, 
                admin_password: sessionCredentials.password,
                ...extraData
            })
        });
        if (!res.ok) throw new Error("Chyba při operaci na serveru.");
        showToast("✅ Operace proběhla úspěšně.");
        
        const approvalForm = document.getElementById('admin-form-approval');
        if (approvalForm) approvalForm.style.display = 'none'; 
        
        window.checkSystemStatus(); 
    } catch (err) {
        showToast("❌ Selhání: " + err.message);
    }
};

window.openRejectModal = function() {
    const modal = document.getElementById('omega-reject-modal');
    if (modal) {
        document.getElementById('reject-feedback-input').value = '';
        modal.style.display = 'flex';
    }
};

window.executeReject = function() {
    const feedback = document.getElementById('reject-feedback-input').value.trim();
    if (!feedback) {
        showToast("⚠️ Musíte zadat důvod zamítnutí.");
        document.getElementById('reject-feedback-input').style.borderColor = "var(--accent-red)";
        return;
    }
    document.getElementById('omega-reject-modal').style.display = 'none';
    window.executeDraftApi('/draft/reject', { feedback });
};

// --- 🚦 OMEGA GOVERNANCE & SYSTEM STATUS ---
window.checkSystemStatus = async function() {
    try {
        const res = await fetch(OMEGA_ADMIN_CONFIG.WORKER_URL + "/draft/status", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Omega-Device-Id": getDeviceIdentity() },
            body: JSON.stringify({ admin_username: sessionCredentials.username, admin_password: sessionCredentials.password })
        });
        const data = await res.json();
        const user = sessionCredentials.username.toLowerCase();
        
        let visualStatus = data.status;
        let visualFeedback = data.feedback;

        if (data.userFeedback) {
            visualStatus = data.userFeedback.status; // Nastaví 'accepted' nebo 'rejected'
            visualFeedback = data.userFeedback.feedback;

            // 🚀 Běžný učitel vidí textový banner (nemá dodávku)
            if (user !== 'vedouci' && user !== 'omega') {
                let feedbackBanner = document.getElementById('user-feedback-banner');
                if (!feedbackBanner) {
                    feedbackBanner = document.createElement('div');
                    feedbackBanner.id = 'user-feedback-banner';
                    const mainContent = document.querySelector('#omega-admin-portal > h2');
                    mainContent.parentNode.insertBefore(feedbackBanner, mainContent);
                }
                
                let rejectedDiff = "Chyba analýzy";
                try {
                    const jsonMatch = data.userFeedback.originalPayload.match(/KNIHY_DB:\s*(\[[\s\S]*?\])\s*};/);
                    if (jsonMatch) rejectedDiff = generateDiffHtml(JSON.parse(jsonMatch[1]));
                } catch(e) {}

                const isAccepted = data.userFeedback.status === 'accepted';
                const colorMain = isAccepted ? 'var(--accent-green)' : 'var(--accent-red)';
                const bgMain = isAccepted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
                const iconMain = isAccepted ? '✅' : '❌';
                const titleText = isAccepted ? 'Váš nápad byl přijat' : 'Váš návrh byl zamítnut';

                feedbackBanner.innerHTML = `
                    <div style="background: ${bgMain}; border: 1px solid ${colorMain}; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="width: 100%;">
                            <h4 style="margin: 0 0 10px 0; color: ${colorMain}; font-size: 1.1rem;">${iconMain} ${titleText}</h4>
                            <div style="font-size: 0.9rem; color: var(--text-main); font-weight: bold; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed ${colorMain}; opacity: 0.8;">
                                Zpětná vazba: "${sanitize(data.userFeedback.feedback)}"
                            </div>
                            <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 4px; border-left: 2px solid ${colorMain};">
                                ${rejectedDiff}
                            </div>
                        </div>
                        <button onclick="this.parentNode.parentNode.remove()" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.5rem; padding: 0 0 0 15px; transition: 0.2s;" onmouseover="this.style.color='${colorMain}'" onmouseout="this.style.color='var(--text-muted)'">×</button>
                    </div>
                `;
            }
        }

        // 🚀 OMEGA FIX: Tracker vizualizuje stavy pro Vedoucího
        if (user === 'vedouci' || user === 'omega') {
            updateDeliveryTruck(visualStatus, visualFeedback);
            if (typeof window.fetchInbox === 'function') window.fetchInbox();
        }

        const approvalForm = document.getElementById('admin-form-approval');
        const saveBtn = document.querySelector('button[onclick="prepareDatabaseExport()"]');

        if (data.status === 'pending') {
            if (user === 'vedouci' && saveBtn) saveBtn.style.display = 'none';

            if (user === 'vedeni') {
                const mainTitle = document.querySelector('#omega-admin-portal h2');
                if (mainTitle) mainTitle.innerHTML = '🛡️ Audit maturitního seznamu';
                if (approvalForm) approvalForm.style.display = 'flex';
                const emptyState = document.getElementById('vedeni-empty-state');
                if (emptyState) emptyState.style.display = 'none';

                document.getElementById('approval-info').innerHTML = `
                    <div style="display: flex; justify-content: space-between; color: var(--text-muted); font-size: 0.85rem; margin-bottom: 10px;">
                        <span>Vypracoval(a): <strong style="color: var(--text-main);">${sanitize(data.author)}</strong></span>
                        <span>📅 ${data.date}</span>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); border-left: 3px solid var(--accent-primary); padding: 10px 15px; font-style: italic; color: var(--text-main); border-radius: 0 4px 4px 0;">
                        "${sanitize(data.commitMsg)}"
                    </div>
                `;
                if (data.payload) {
                    const jsonMatch = data.payload.match(/KNIHY_DB:\s*(\[[\s\S]*?\])\s*};/);
                    if (jsonMatch) {
                        window.DRAFT_KNIHY_DB = JSON.parse(jsonMatch[1]);
                        if (typeof renderDraftDiff === 'function') renderDraftDiff(window.DRAFT_KNIHY_DB);
                    }
                }
            }
        } else {
            window.DRAFT_KNIHY_DB = null;
            if (user !== 'vedeni' && saveBtn) saveBtn.style.display = 'block';

            if (user === 'vedeni') {
                if (approvalForm) approvalForm.style.display = 'none';
                let emptyState = document.getElementById('vedeni-empty-state');
                if (!emptyState) {
                    emptyState = document.createElement('div');
                    emptyState.id = 'vedeni-empty-state';
                    emptyState.innerHTML = `<div style="text-align: center; padding: 40px 20px; color: var(--text-muted); background: rgba(52, 152, 219, 0.05); border: 1px dashed var(--accent-primary-light); border-radius: 8px; margin-bottom: 20px;">
                        <div style="font-size: 2.5rem; margin-bottom: 10px; opacity: 0.8;">☕</div>
                        <h3 style="margin: 0 0 5px 0; color: var(--accent-primary);">Vše je aktuální</h3>
                        <p style="margin: 0; font-size: 0.9rem;">Momentálně nečekají žádné návrhy komise na schválení.</p>
                    </div>`;
                    approvalForm.parentNode.insertBefore(emptyState, approvalForm);
                }
                emptyState.style.display = 'block';
            }
        }
    } catch (e) {}
};