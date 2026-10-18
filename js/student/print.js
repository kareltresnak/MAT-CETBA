/**
 * OMEGA STUDENT: Document Generator & Native Print Engine
 * Generování tiskové sestavy studenta ve formátu PDF přes skrytý iFrame a CSS klonování.
 */

window.Omega = window.Omega || {};

/**
 * Univerzální generátor a tiskový spouštěč maturitního formuláře
 * @param {Object} options - { noPersonalData: boolean, student: Object }
 */
window.printMaturitniDocument = function(options = {}) {
    try {
        const knihaDb = window.getKnihyDb();
        const selectedBooks = Array.from(window.state?.selectedIds || [])
            .map(id => knihaDb.find(k => k.id === id))
            .filter(Boolean)
            .sort((a, b) => a.id - b.id);

        if (selectedBooks.length !== 20) {
            window.showToast("⚠️ Pro export do PDF musíte mít vybráno přesně 20 děl.");
            return;
        }

        window.showToast("⏳ Připravuji PDF dokument...");

        let isNoPersonal = options.noPersonalData;
        if (isNoPersonal === undefined) {
            try {
                isNoPersonal = localStorage.getItem('omega_teacher_mode') === 'true';
            } catch (e) {
                isNoPersonal = false;
            }
        }

        let studentData = {};
        if (isNoPersonal) {
            studentData = {
                name: '',
                dob: '',
                class: '',
                year: '' // 🚀 ZÁMĚRNĚ PRÁZDNÉ I PRO ŠKOLNÍ ROK (vytiskne prázdný řádek s linkou)
            };
        } else {
            const chrono = window.getOmegaChronology ? window.getOmegaChronology() : { format: '' };
            studentData = {
                name: options.student?.name ?? (window.state?.student?.name || document.getElementById('student-name')?.value || ''),
                dob: options.student?.dob ?? (window.state?.student?.dob || document.getElementById('student-dob')?.value || ''),
                class: options.student?.class ?? (window.state?.student?.class || document.getElementById('student-class')?.value || ''),
                year: options.student?.year ?? (window.state?.student?.year || document.getElementById('student-year')?.value || chrono.format || '')
            };
        }

        if (!window.OMEGA_CONFIG || typeof window.OMEGA_CONFIG.renderPdf !== 'function') {
            throw new Error("Tisková šablona není v konfiguraci dostupná.");
        }

        const rawHtml = window.OMEGA_CONFIG.renderPdf(selectedBooks, studentData, window.sanitize);

        // Odstranění případného starého tiskového rámce
        let oldFrame = document.getElementById('omega-student-print-frame');
        if (oldFrame) oldFrame.remove();

        const printFrame = document.createElement('iframe');
        printFrame.id = 'omega-student-print-frame';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        printFrame.style.zIndex = '-1';
        document.body.appendChild(printFrame);

        // Naklonování aktivních CSS stylů do iFramu pro věrný tisk
        const cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .map(link => `<link rel="stylesheet" href="${link.href}">`)
            .join('\n');

        const doc = printFrame.contentWindow.document;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Maturitní seznam četby</title>
                ${cssLinks}
            </head>
            <body style="margin: 0; padding: 0; background: white;">
                <div id="print-area">
                    ${rawHtml}
                </div>
            </body>
            </html>
        `);
        doc.close();

        window.trackOmegaEvent(isNoPersonal ? 'Teacher_Recommendation_PDF_Printed' : 'Export_PDF_Generated', { books_count: selectedBooks.length });

        // Prodleva pro stažení a aplikaci CSS v Safari a mobilních prohlížečích
        setTimeout(() => {
            try {
                printFrame.contentWindow.focus();
                printFrame.contentWindow.print();
            } catch (e) {
                console.error("Print blocked:", e);
                window.showToast("❌ Vaše zařízení blokuje tiskový dialog.");
            }
        }, 800); 

    } catch (error) {
        console.error("Print Engine Error:", error);
        window.showToast("❌ Chyba tisku: " + error.message);
    }
};

/**
 * Stealth režim učitele (5-klik na nadpis "SELEKCE ČETBY")
 */
window.initTeacherModeToggle = function() {
    const brandHeading = document.querySelector('.brand');
    const btnExport = document.getElementById('btn-export');

    function syncTeacherModeUI() {
        let isTeacherMode = false;
        try {
            isTeacherMode = localStorage.getItem('omega_teacher_mode') === 'true';
        } catch (e) {}

        if (btnExport) {
            if (isTeacherMode) {
                btnExport.textContent = '📄 Export bez os. údajů (Učitel)';
                btnExport.title = 'Režim učitele: Export doporučeného seznamu bez osobních údajů a šk. roku (5× klik na nadpis pro vypnutí)';
                btnExport.style.borderColor = 'var(--accent-primary, #e67e22)';
            } else {
                btnExport.textContent = '📄 Export do PDF';
                btnExport.title = 'Uložit výběr jako PDF';
                btnExport.style.borderColor = '';
            }
        }
    }

    // Synchronizace při načtení
    syncTeacherModeUI();

    if (brandHeading) {
        brandHeading.style.cursor = 'pointer';
        brandHeading.style.userSelect = 'none';

        let clicks = 0;
        let timer = null;

        brandHeading.addEventListener('click', (e) => {
            if (e && e.target && typeof e.target.closest === 'function' && e.target.closest('#sidebar-student-guide')) return;

            clicks++;
            clearTimeout(timer);

            // Jemný puls při kliku
            brandHeading.style.opacity = "0.7";
            setTimeout(() => { brandHeading.style.opacity = "1"; }, 100);

            if (clicks >= 5) {
                clicks = 0;
                let wasActive = false;
                try {
                    wasActive = localStorage.getItem('omega_teacher_mode') === 'true';
                } catch (e) {}

                if (wasActive) {
                    try { localStorage.removeItem('omega_teacher_mode'); } catch (e) {}
                    syncTeacherModeUI();
                    if (window.showToast) window.showToast("🔒 Režim učitele vypnut (Standardní studentský export)");
                } else {
                    try { localStorage.setItem('omega_teacher_mode', 'true'); } catch (e) {}
                    syncTeacherModeUI();
                    if (window.showToast) window.showToast("🔓 Aktivován režim učitele (Export bez osobních údajů a šk. roku)");
                }

                if (typeof window.updateStatsAndSidebar === 'function') {
                    window.updateStatsAndSidebar();
                }
            } else {
                timer = setTimeout(() => {
                    clicks = 0;
                }, 1500);
            }
        });
    }
};

/**
 * Inicializuje posluchač pro tlačítko exportu PDF pro studenta
 */
window.initStudentPrint = function() {
    if (!window.elements.btnExport) return;

    window.elements.btnExport.addEventListener('click', () => {
        if (window.elements.btnExport.disabled) return;
        let isTeacher = false;
        try {
            isTeacher = localStorage.getItem('omega_teacher_mode') === 'true';
        } catch (e) {}
        window.printMaturitniDocument({ noPersonalData: isTeacher });
    });

    // Tiskový hook před vyvoláním tisku
    window.addEventListener('beforeprint', () => {
        if (typeof window.prepareOmegaPrintLayer === 'function') {
            window.prepareOmegaPrintLayer();
        }
    });

    // Inicializace stealth režimu učitele
    window.initTeacherModeToggle();
};

window.Omega.studentPrint = {
    init: window.initStudentPrint,
    printDocument: window.printMaturitniDocument,
    initTeacherModeToggle: window.initTeacherModeToggle
};
