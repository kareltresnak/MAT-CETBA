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
const OMEGA_VERSION = '7.6.1';

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
    student: { name: "", dob: "", klasa: "", year: getOmegaChronology().format } // Vynucený startovní rok
};

const elements = {
    tableBody: document.getElementById('table-body'),
    searchBox: document.getElementById('search-box'),
    btnReset: document.getElementById('btn-reset'),
    btnClear: document.getElementById('btn-clear'),
    btnExport: document.getElementById('btn-export'),
    statTotal: document.getElementById('stat-total'),
    myList: document.getElementById('my-list'),
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

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

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
                    isValid = true; // Absolutní svoboda: Cokoliv zadají, to platí
                    const y2Short = (y1 + 1).toString().slice(-2);
                    
                    if (nextSpan) nextSpan.textContent = y2Short;
                    state.student.year = `20${val}/20${y2Short}`; // Uloží plný formát do PDF
                } else {
                    if (nextSpan) nextSpan.textContent = "--";
                    state.student.year = "";
                }

                // Obarvení spodní linky
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

    document.querySelectorAll('.filter-btn').forEach(btn => {
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

    if (total === 0) {
        elements.myList.innerHTML = "<em>Zatím prázdno...</em>";
    } else {
        const sortedSelected = Array.from(state.selectedIds)
            .map(id => KNIHY_DB.find(k => k.id === id))
            .sort((a, b) => a.id - b.id);
        
        elements.myList.innerHTML = sortedSelected.map(k => 
            `<div class="selected-item">
                <div class="selected-item-info">
                    <strong>${k.id}. ${sanitize(k.dilo)}</strong>
                    <small>${sanitize(k.autor)}</small>
                </div>
                <button type="button" class="remove-btn" data-id="${k.id}" aria-label="Odstranit">×</button>
            </div>`
        ).join('');
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

elements.myList.addEventListener('click', (e) => {
    const btn = e.target.closest('.remove-btn');
    if (btn) toggleBook(parseInt(btn.dataset.id, 10));
});

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

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.parentElement.dataset.type;
        const val = btn.dataset.val;
        state.filters[type] = (state.filters[type] === val) ? null : val;
        renderTable();
        updateStatsAndSidebar();
        saveState(); 
    });
});

elements.btnReset.addEventListener('click', () => {
    state.filters = { obdobi: null, druh: null };
    state.searchQuery = "";
    elements.searchBox.value = "";
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

// Zobrazení času poslední aktualizace
const auditEl = document.getElementById('audit-trail-date');
if (auditEl && window.OMEGA_CONFIG.LAST_UPDATE) {
    auditEl.innerHTML = `AKTUALIZOVÁNO: <strong>${window.OMEGA_CONFIG.LAST_UPDATE}</strong>`;
}

if ('caches' in window) {
    caches.keys().then(keys => {
        const cacheName = keys.find(key => key.includes('SPS_Selekce_MAT_CETBY'));
        const versionEl = document.getElementById('app-version-val');
        if (versionEl) {
            if (cacheName) {
                const version = cacheName.split('_').pop(); 
                versionEl.textContent = version.startsWith('v') ? version : 'v' + version;
            } else {
                versionEl.textContent = 'v' + OMEGA_VERSION; // Fallback na konstantu 7.4.0
            }
        }
    }).catch(err => {
        const versionEl = document.getElementById('app-version-val');
        if (versionEl) versionEl.textContent = 'v' + OMEGA_VERSION;
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

/* ==========================================
   OMEGA ADMIN ENGINE v7.1.0 (Enterprise)
   ========================================== */

const OMEGA_ADMIN_CONFIG = {
    WORKER_URL: "https://spspb-mat-cet.tresnakkarel77.workers.dev"
};

let adminVirtualDb = [];
let sessionPassword = "";
let pendingExportPayload = null;

// --- 🎛️ UI: SEGMENTED CONTROL (Záložky) ---
window.switchAdminMode = function(mode) {
    const forms = { 
        add: document.getElementById('admin-form-add'), 
        edit: document.getElementById('admin-form-edit'), 
        summary: document.getElementById('admin-form-summary') 
    };
    const tabs = { 
        add: document.getElementById('tab-add'), 
        edit: document.getElementById('tab-edit'), 
        summary: document.getElementById('tab-summary') 
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

    // Pokud uživatel klikl na Audit Log, okamžitě ho matematicky přepočítáme
    if (mode === 'summary' && typeof window.renderAdminSummary === 'function') {
        window.renderAdminSummary();
    }
};

// --- 📊 AUDIT LOG GENERATOR (Human-Readable Edition) ---
window.renderAdminSummary = function() {
    const container = document.getElementById('admin-summary-content');
    if (!container) return;

    let added = [];
    let edited = [];
    let deleted = [];
    let orderChanged = false; // 🚀 OMEGA: Binární detektor změn pořadí
    let visualId = 1;

    adminVirtualDb.forEach(book => {
        if (book._isDeleted) {
            if (!book._isAdded) deleted.push(`<strong>${sanitize(book._original.dilo)}</strong> <span style="opacity:0.6; font-size:0.85em;">(Původní ID ${book.id})</span>`);
            return;
        }
        
        if (book._isAdded) {
            added.push(`<strong>${sanitize(book.dilo)}</strong> <span style="opacity:0.6; font-size:0.85em;">(Nové ID ${visualId})</span>`);
        } else {
            // 🚀 OMEGA: Granulární detekce úprav
            let changedFields = [];
            if (book.dilo !== book._original.dilo) changedFields.push("Název");
            if (book.autor !== book._original.autor) changedFields.push("Autor");
            if (book.obdobi !== book._original.obdobi) changedFields.push("Období");
            if (book.druh !== book._original.druh) changedFields.push("Druh");

            // 🚀 OMEGA HACK: Zachycení konkrétního explicitního přesunu (Teleportu)
            if (book._moveHistory && book._moveHistory.length > 0) {
                const firstMove = book._moveHistory[0];
                const lastMove = book._moveHistory[book._moveHistory.length - 1];
                if (firstMove.from !== lastMove.to) {
                    changedFields.push(`Pozice (ID ${firstMove.from} ➔ ${lastMove.to})`);
                }
            }

            if (changedFields.length > 0) {
                edited.push(`<strong>${sanitize(book.dilo)}</strong> <span style="opacity:0.6; font-size:0.85em;">(Změna: ${changedFields.join(', ')})</span>`);
            } else if (book.id !== visualId) {
                orderChanged = true;
            }
        }
        visualId++;
    });

    if (added.length === 0 && edited.length === 0 && deleted.length === 0 && !orderChanged) {
        container.innerHTML = '<em style="color: var(--text-muted);">Zatím nebyly provedeny žádné databázové mutace.</em>';
        return;
    }

    let html = "";

    if (added.length > 0) {
        html += `<div style="margin-bottom: 15px; padding-left: 12px; border-left: 4px solid #10b981; background: rgba(16, 185, 129, 0.05); padding-top: 8px; padding-bottom: 8px; border-radius: 0 6px 6px 0; display: flex; align-items: flex-start;">
            <span style="color: #10b981; font-weight: 800; width: 90px; flex-shrink: 0; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px; font-size: 0.8rem;">➕ Přidáno:</span> 
            <div style="line-height: 1.5;">${added.join('<span style="color: var(--border); margin: 0 8px;">|</span>')}</div>
        </div>`;
    }

    if (edited.length > 0) {
        html += `<div style="margin-bottom: 15px; padding-left: 12px; border-left: 4px solid #f59e0b; background: rgba(245, 158, 11, 0.05); padding-top: 8px; padding-bottom: 8px; border-radius: 0 6px 6px 0; display: flex; align-items: flex-start;">
            <span style="color: #f59e0b; font-weight: 800; width: 90px; flex-shrink: 0; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px; font-size: 0.8rem;">✏️ Změněno:</span> 
            <div style="line-height: 1.5;">${edited.join('<span style="color: var(--border); margin: 0 8px;">|</span>')}</div>
        </div>`;
    }

    if (deleted.length > 0) {
        html += `<div style="margin-bottom: 15px; padding-left: 12px; border-left: 4px solid #ef4444; background: rgba(239, 68, 68, 0.05); padding-top: 8px; padding-bottom: 8px; border-radius: 0 6px 6px 0; display: flex; align-items: flex-start;">
            <span style="color: #ef4444; font-weight: 800; width: 90px; flex-shrink: 0; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px; font-size: 0.8rem;">🗑️ Odebráno:</span> 
            <div style="line-height: 1.5;">${deleted.join('<span style="color: var(--border); margin: 0 8px;">|</span>')}</div>
        </div>`;
    }

    if (orderChanged) {
        html += `<div style="padding-left: 12px; border-left: 4px solid #3b82f6; background: rgba(59, 130, 246, 0.05); padding-top: 8px; padding-bottom: 8px; border-radius: 0 6px 6px 0; display: flex; align-items: center;">
            <span style="color: #3b82f6; font-weight: 800; width: 90px; flex-shrink: 0; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px; font-size: 0.8rem;">↕️ Pořadí:</span> 
            <div style="line-height: 1.5; color: var(--text-muted); font-size: 0.9em;">V databázi došlo ke změně pořadí děl (Drag & Drop posun).</div>
        </div>`;
    }

    container.innerHTML = html;
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

window.attemptAdminExit = function() {
    if (!checkForUnsavedChanges()) {
        window.OMEGA_SAFE_EXIT = true; // Žádné změny nejsou, můžeme v klidu odejít
        const currentTheme = localStorage.getItem('omega_theme') || 'default';
        window.location.href = window.location.pathname + "?theme=" + currentTheme;
    } else {
        document.getElementById('omega-exit-modal').style.display = 'flex';
    }
};

window.confirmAdminExit = function() {
    window.OMEGA_SAFE_EXIT = true; // 🚀 ZVEDÁME ZÁVORU! Od této chvíle prohlížeč nesmí protestovat.
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

// --- 🔐 ZERO-TRUST BRÁNA (SECURE AUTH MODE) ---
const btnAuthSubmit = document.getElementById('btn-auth-submit');
const btnAuthCancel = document.getElementById('btn-auth-cancel');
const authModalNode = document.getElementById('omega-auth-modal');
const passwordInputNode = document.getElementById('admin-password-input');
const authErrorMsgNode = document.getElementById('auth-error-msg');

if (btnAuthSubmit && authModalNode) {
    btnAuthSubmit.addEventListener('click', () => {
        const pwd = passwordInputNode ? passwordInputNode.value.trim() : '';
        if (!pwd) {
            if (authErrorMsgNode) {
                authErrorMsgNode.innerText = "Zadejte heslo.";
                authErrorMsgNode.style.display = "block";
            }
            return;
        }

        // 1. Uložíme heslo do paměti relace pro Cloudflare Worker
        sessionPassword = pwd;

        // 2. Skrytí klientské aplikace
        const appElements = ['.layout', 'header', '.mobile-nav', 'footer', '.brand', 'main', '#toast', '#omega-print-layer'];
        appElements.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => el.style.setProperty('display', 'none', 'important'));
        });
        
        document.body.style.setProperty('overflow-y', 'auto', 'important');
        document.body.style.setProperty('padding-bottom', '0', 'important');
        
        // 3. Zavření modálu a spuštění Admin UI
        authModalNode.style.display = 'none';
        const adminPortal = document.getElementById('omega-admin-portal');
        if (adminPortal) adminPortal.style.display = 'block';
        
        // 4. Očištění URL (bez bypass parametrů)
        const currentTheme = localStorage.getItem('omega_theme') || 'default';
        history.pushState({ page: 'admin_active' }, "Administrace OMEGA", window.location.pathname + "?theme=" + currentTheme);
        
        // 5. Inicializace admin enginu
        setTimeout(() => {
            if (typeof window.initAuthorAutocomplete === 'function') window.initAuthorAutocomplete();
            if (typeof window.initAdminVirtualDb === 'function') window.initAdminVirtualDb(); 
            if (typeof window.trackOmegaEvent === 'function') window.trackOmegaEvent('Admin_Portal_Accessed_Secure');
        }, 50);
    });

    // UX Kinetika: Enter v poli pro heslo odpaluje Submit
    if (passwordInputNode) {
        passwordInputNode.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') btnAuthSubmit.click();
        });
    }

    // Tlačítko Zrušit
    if (btnAuthCancel) {
        btnAuthCancel.addEventListener('click', () => {
            authModalNode.style.display = 'none';
            if (passwordInputNode) passwordInputNode.value = '';
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
};

// 🚀 OMEGA SMART EVALUATOR: Deterministický výpočet změn
window.adminEvaluateChanges = function() {
    let visualId = 1;

    adminVirtualDb.forEach(book => {
        if (book._isDeleted) return; 

        if (book._isAdded) {
            visualId++; 
            return; 
        }
        
        // 1. Změnilo se finální exportní ID vůči originálnímu? (Absolutní pravda)
        const positionChanged = (visualId !== book.id);
        
        // 2. Změnil se text nebo dropdown vůči originálu?
        const contentChanged = (
            book.dilo !== book._original.dilo ||
            book.autor !== book._original.autor ||
            book.obdobi !== book._original.obdobi ||
            book.druh !== book._original.druh
        );

        book._isEdited = positionChanged || contentChanged;
        
        visualId++;
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
            bg = 'rgba(245, 158, 11, 0.08)';
            leftBorder = '4px solid #f59e0b'; 
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
            
            <!-- CUSTOM DROPDOWNY V TABULCE -->
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
    
    adminEvaluateChanges(); // Přepočet posunů vzniklých smazáním/obnovením
    isSafeToExit = false;
    renderAdminTable();
};

// --- 🚀 OMEGA TELEPORT ENGINE (Nativní Modál s telemetrií) ---
let currentTeleportId = null;

window.openTeleportModal = function(oldId) {
    currentTeleportId = oldId;
    document.getElementById('teleport-old-id-display').innerText = oldId;
    
    const input = document.getElementById('teleport-new-id-input');
    const errorDisplay = document.getElementById('teleport-error-msg');
    
    input.value = '';
    input.max = adminVirtualDb.length;
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
    let maxId = adminVirtualDb.length;

    // Reset chybového stavu před novou evaluací
    input.style.borderColor = "var(--border, #d1d5db)";
    if (errorDisplay) errorDisplay.innerText = '';

    // Helper pro výpis chyby
    const throwError = (msg) => {
        input.style.borderColor = "var(--accent-red, #ef4444)";
        if (errorDisplay) errorDisplay.innerText = msg;
    };

    // 🚀 OMEGA: Exaktní sémantická validace
    if (isNaN(newId)) return throwError("Zadejte platné číslo.");
    if (newId < 1) return throwError("ID nemůže být menší než 1.");
    if (newId > maxId) return throwError(`Databáze má pouze ${maxId} děl. Nelze přeskočit limit.`);
    if (newId === oldId) return throwError("Dílo se již na této pozici nachází.");

    // Matematický posun v poli
    let oldIndex = oldId - 1;
    let newIndex = newId - 1;
    let movedItem = adminVirtualDb.splice(oldIndex, 1)[0];

    // Zvýrazníme žlutě POUZE to dílo, které s uživatel explicitně přesunul
    if (!movedItem._isAdded) {
        movedItem._isEdited = true;
        if (!movedItem._moveHistory) movedItem._moveHistory = [];
        movedItem._moveHistory.push({ from: oldId, to: newId });
    }

    adminVirtualDb.splice(newIndex, 0, movedItem);

    // Tiše přepočítáme ID u zbytku
    adminVirtualDb.forEach((book, idx) => {
        book.id = idx + 1;
    });

    closeTeleportModal();
    renderAdminTable(); 
    if (typeof window.renderAdminSummary === 'function') window.renderAdminSummary();
};

// Záchyt Enter klávesy
document.getElementById('teleport-new-id-input')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') confirmTeleport();
});

// Enter key v modálu potvrdí teleport
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

    if (addedCount === 0 && editedCount === 0 && deletedCount === 0) {
        showToast("⚠️ Nebyly provedeny žádné změny.");
        return;
    }

    await createAutoSnapshot();

    let newDb = [];
    let counter = 1;

    adminVirtualDb.forEach(book => {
        if (!book._isDeleted) {
            newDb.push({
                id: counter++,
                dilo: sanitize(book.dilo),
                autor: sanitize(book.autor),
                druh: book.druh,
                obdobi: book.obdobi
            });
        }
    });

    const formattedDbString = JSON.stringify(newDb, null, 8).replace(/^/gm, '    ');
    const today = new Date().toLocaleDateString('cs-CZ');

    pendingExportPayload = `// =====================================================================
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

    KNIHY_DB: ${formattedDbString}
};`;

    const modal = document.getElementById('omega-confirm-modal');
    const summary = document.getElementById('confirm-modal-summary');
    
    summary.innerHTML = `
        • Počet děl k odstranění: <strong style="color: var(--accent-red)">${deletedCount}</strong><br>
        • Počet nových děl k přidání: <strong style="color: var(--accent-green)">${addedCount}</strong><br>
        • Počet upravených děl: <strong style="color: #f59e0b">${editedCount}</strong><br>
        • Výsledný počet knih v DB: <strong>${newDb.length}</strong>
    `;

    modal.style.display = 'flex';
    
    const finalExecuteBtn = document.getElementById('btn-final-execute');
    finalExecuteBtn.disabled = false; 
    
    finalExecuteBtn.onclick = () => {
        finalExecuteBtn.disabled = true; 
        closeConfirmModal();
        pushToCloudflare(pendingExportPayload, turnstileToken);
    };
};

window.closeConfirmModal = function() {
    document.getElementById('omega-confirm-modal').style.display = 'none';
};

// --- 🌐 CLOUDFLARE TRANSPORT (Zero-Trust Edition) ---

function pushToCloudflare(fileContent, turnstileToken) {
    const modal = document.getElementById('admin-confirmation-modal');
    const msgEl = document.getElementById('admin-confirmation-msg');
    const downloadBtn = document.getElementById('btn-actual-download');
    
    modal.style.display = 'flex';
    msgEl.innerHTML = `⏳ <strong>Kompiluji databázi a ověřuji identitu přes Edge...</strong><br>Prosím, nezavírejte okno.`;
    if (downloadBtn) downloadBtn.style.display = 'none';

    fetch(OMEGA_ADMIN_CONFIG.WORKER_URL, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "X-Omega-Device-Id": getDeviceIdentity() // <-- Zajištění perzistence identity při pushi
        },
        // 🛡️ ZERO-TRUST: Integrace tokenu do tělíčka požadavku
        body: JSON.stringify({ 
            fileContent: fileContent, 
            password: sessionPassword,
            cf_token: turnstileToken 
        })
    })
    .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Neznámá chyba serveru.");
        
        msgEl.innerHTML = `✅ <strong>AKTUALIZACE ÚSPĚŠNÁ!</strong><br>Databáze byla exaktně zapsána do repozitáře.<br><br><span style="color:var(--accent-primary)">Změny se plně propagují za cca 30-60 sekund.</span>`;
        pendingExportPayload = null;
        renderStagingQueue();
        if (typeof navrhniDalsiVolneId === 'function') navrhniDalsiVolneId();
        
        // 🛡️ Bezpečnostní reset pro EXPORT widget (Exaktní zacílení v paměti DOMu)
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
                setTimeout(() => { if (pwdInput) pwdInput.focus(); }, 100);
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

    let dataSource = typeof adminVirtualDb !== 'undefined' && adminVirtualDb.length > 0 
                     ? adminVirtualDb.filter(k => !k._isDeleted) 
                     : window.OMEGA_CONFIG.KNIHY_DB;

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