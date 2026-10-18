/**
 * OMEGA STUDENT: Granular State Destruction
 * Asynchronní granulární mazání stavu: výmaz vybraných knih, výmaz osobních údajů nebo kompletní nukleární reset.
 */

window.Omega = window.Omega || {};

/**
 * Vyčistí pouze seznam vybraných děl studenta
 */
window.clearListLogic = function() {
    window.state.selectedIds.clear();
    window.renderTable();
    window.updateStatsAndSidebar();
};

/**
 * Vyčistí pouze zadané osobní údaje studenta a zresetuje vizuální validátory
 */
window.clearDataLogic = function() {
    const chrono = window.getOmegaChronology();
    window.state.student = { name: "", dob: "", class: "", year: chrono.format };

    const formFields = (window.OMEGA_CONFIG && window.OMEGA_CONFIG.FORM_FIELDS) || ['name', 'dob', 'class', 'year'];
    formFields.forEach(key => {
        const el = document.getElementById(`student-${key}`);
        if (el) {
            if (key === 'year') {
                el.value = chrono.short1;
                const nextSpan = document.getElementById('student-year-next');
                if (nextSpan) nextSpan.textContent = chrono.short2;
                el.style.borderBottomColor = 'var(--accent-primary)';
            } else {
                el.value = "";
                el.style.borderColor = 'var(--border)';
            }
        }
    });
};

/**
 * Zavře modál pro potvrzení smazání dat
 */
window.closeClearModal = function() {
    const modal = document.getElementById("clear-modal");
    if (modal) modal.style.display = "none";
};

/**
 * Inicializuje posluchače pro tlačítka mazání
 */
window.initResetEvents = function() {
    if (window.elements.btnClear) {
        window.elements.btnClear.addEventListener('click', () => {
            const modal = document.getElementById("clear-modal");
            if (modal) modal.style.display = "flex";
        });
    }

    // Akce A: Pouze knihy
    const btnClearList = document.getElementById("btn-clear-list");
    if (btnClearList) {
        btnClearList.addEventListener('click', () => {
            if (window.state.selectedIds.size === 0) {
                window.showToast("ℹ️ Váš seznam knih je již prázdný.");
            } else {
                window.clearListLogic();
                window.saveState();
                window.showToast("🗑️ Seznam knih byl úspěšně vymazán.");
            }
            window.closeClearModal();
        });
    }

    // Akce B: Pouze osobní údaje
    const btnClearData = document.getElementById("btn-clear-data");
    if (btnClearData) {
        btnClearData.addEventListener('click', () => {
            window.clearDataLogic();
            window.saveState();
            window.updateStatsAndSidebar();
            window.closeClearModal();
            window.showToast("🗑️ Osobní údaje byly vymazány.");
        });
    }

    // Akce C: Nukleární reset (Knihy i údaje)
    const btnClearAll = document.getElementById("btn-clear-all");
    if (btnClearAll) {
        btnClearAll.addEventListener('click', () => {
            window.clearListLogic();
            window.clearDataLogic();
            window.saveState();
            window.updateStatsAndSidebar();
            window.closeClearModal();
            window.showToast("☢️ Kompletní paměť byla vymazána.");
        });
    }
};

window.Omega.reset = {
    clearListLogic: window.clearListLogic,
    clearDataLogic: window.clearDataLogic,
    closeClearModal: window.closeClearModal,
    initResetEvents: window.initResetEvents
};
