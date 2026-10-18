/**
 * OMEGA STUDENT: State Management & Form Validation
 * Správa stavu výběru studenta, data-binding, ukládání do LocalStorage a validace osobních údajů.
 */

window.Omega = window.Omega || {};

// Globální stav klientské aplikace studenta
window.state = { 
    selectedIds: new Set(), 
    filters: { obdobi: null, druh: null }, 
    searchQuery: "",
    student: { 
        name: "", 
        dob: "", 
        class: "", 
        year: (typeof window.getOmegaChronology === 'function') ? window.getOmegaChronology().format : "" 
    },
    showOnlyMyList: false
};

// Kešované DOM elementy pro studenta
window.elements = {
    tableBody: null,
    searchBox: null,
    btnReset: null,
    btnClear: null,
    btnExport: null,
    statTotal: null,
    btnScrollTop: null,
    inputName: null,
    inputDob: null,
    inputClass: null,
    inputYear: null
};

/**
 * Uloží aktuální stav studenta do LocalStorage
 */
window.saveState = function() {
    const stateToSave = {
        v: window.DB_VERSION,
        selectedIds: Array.from(window.state.selectedIds),
        filters: window.state.filters,
        student: window.state.student
    };
    localStorage.setItem(window.STORAGE_KEY, JSON.stringify(stateToSave));
};

/**
 * Deterministický pre-fill školního roku do formuláře a stavu
 */
window.preFillChronology = function() {
    const chrono = window.getOmegaChronology();
    const el = document.getElementById('student-year');
    const nextSpan = document.getElementById('student-year-next');
    
    if (el) el.value = chrono.short1;
    if (nextSpan) nextSpan.textContent = chrono.short2;
    
    window.state.student.year = chrono.format;
    window.saveState();
};

/**
 * Načte uložený stav studenta z LocalStorage, ověří konzistenci s verzí osnov a obnoví formulář
 */
window.loadState = function() {
    const savedData = localStorage.getItem(window.STORAGE_KEY);
    const chrono = window.getOmegaChronology();

    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            
            // Kontrola verze osnov: Pokud škola změnila seznam, paměť se bezpečně vymaže
            if (parsed.v && parsed.v !== window.DB_VERSION) {
                console.warn("Detekována mutace osnov. Paměť vymazána.");
                localStorage.removeItem(window.STORAGE_KEY);
                setTimeout(() => window.showToast("⚠️ Maturitní seznam byl školou aktualizován. Váš výběr byl resetován."), 1000);
                return; 
            }

            if (Array.isArray(parsed.selectedIds)) {
                window.state.selectedIds = new Set(parsed.selectedIds.map(Number));
            }
            
            if (parsed.filters) window.state.filters = parsed.filters;
            
            if (parsed.student) {
                window.state.student = parsed.student;
                const formFields = (window.OMEGA_CONFIG && window.OMEGA_CONFIG.FORM_FIELDS) || ['name', 'dob', 'class', 'year'];
                formFields.forEach(key => {
                    const el = document.getElementById(`student-${key}`);
                    if (el) {
                        if (key === 'year' && window.state.student.year) {
                            const match = window.state.student.year.match(/^20(\d{2})\/20(\d{2})$/);
                            if (match) {
                                el.value = match[1];
                                const nextSpan = document.getElementById('student-year-next');
                                if (nextSpan) nextSpan.textContent = match[2];
                            } else {
                                window.state.student.year = chrono.format;
                                el.value = chrono.short1;
                                const nextSpan = document.getElementById('student-year-next');
                                if (nextSpan) nextSpan.textContent = chrono.short2;
                            }
                        } else {
                            el.value = window.state.student[key] || "";
                        }
                    }
                });
            } else {
                window.preFillChronology();
            }
        } catch (error) {
            localStorage.removeItem(window.STORAGE_KEY);
            window.preFillChronology();
        }
    } else {
        window.preFillChronology();
    }
};

/**
 * Inicializace formuláře a navázání kvantové validace na vstupní pole
 */
window.initStudentForm = function() {
    const formContainer = document.getElementById('dynamic-form-container');
    if (formContainer && window.OMEGA_CONFIG && window.OMEGA_CONFIG.FORM_HTML) {
        formContainer.innerHTML = window.OMEGA_CONFIG.FORM_HTML;
    }

    const rulesContainer = document.getElementById('school-rules');
    if (rulesContainer && window.OMEGA_CONFIG) {
        rulesContainer.innerHTML = window.OMEGA_CONFIG.RULES_HTML || "";
    }

    // Aktualizace referencí na prvky
    window.elements = {
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

    const formFields = (window.OMEGA_CONFIG && window.OMEGA_CONFIG.FORM_FIELDS) || ['name', 'dob', 'class', 'year'];

    // Data-binding pro osobní údaje s kvantovou validací
    formFields.forEach(key => {
        const el = document.getElementById(`student-${key}`);
        if (el) {
            el.addEventListener('input', (e) => {
                let val = e.target.value;
                
                if (key === 'name') {
                    // Purifier: Povolí písmena české abecedy, mezery a pomlčky
                    val = val.replace(/[^a-zA-ZěščřžýáíéóúůďťňĚŠČŘŽÝÁÍÉÓÚŮĎŤŇ\s-]/g, '')
                             .replace(/\s{2,}/g, ' ')
                             .trimStart();
                    el.value = val;
                    const isValid = val.trim().length >= 5 && val.trim().includes(' ');
                    el.style.borderColor = (val === '' || isValid) ? 'var(--border)' : 'var(--accent-red)';
                } else if (key === 'class') {
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
                        const currentY = window.getOmegaChronology().start;
                        // Dynamické meze: Věk 14 až 21 let
                        if (bYear >= (currentY - 21) && bYear <= (currentY - 14)) {
                            isValid = true;
                        }
                    }
                    el.style.borderColor = (val === '' || isValid) ? 'var(--border)' : 'var(--accent-red)';
                } else if (key === 'year') {
                    val = val.replace(/\D/g, '').slice(0, 2);
                    el.value = val;

                    const nextSpan = document.getElementById('student-year-next');
                    let isValid = false;

                    if (val.length === 2) {
                        const y1 = parseInt("20" + val, 10);
                        isValid = true;
                        const y2Full = (y1 + 1).toString();
                        if (nextSpan) nextSpan.textContent = y2Full;
                        window.state.student.year = `${y1}/${y2Full}`;
                    } else {
                        if (nextSpan) nextSpan.textContent = "----";
                        window.state.student.year = "";
                    }

                    el.style.borderBottomColor = (val === '' || isValid) ? 'var(--accent-primary)' : 'var(--accent-red)';
                    window.saveState();
                    if (typeof window.updateStatsAndSidebar === 'function') window.updateStatsAndSidebar();
                    return; 
                }

                window.state.student[key] = val;
                window.saveState();
                if (typeof window.updateStatsAndSidebar === 'function') window.updateStatsAndSidebar();
            });
        }
    });
};

window.Omega.studentState = {
    state: window.state,
    saveState: window.saveState,
    loadState: window.loadState,
    preFillChronology: window.preFillChronology,
    initStudentForm: window.initStudentForm
};
