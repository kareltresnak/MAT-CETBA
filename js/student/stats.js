/**
 * OMEGA STUDENT: Statistics & Requirements Calculator
 * Přepočet splnění maturitních kritérií (období, žánry, celkový počet) a validace pro odemknutí exportu.
 */

window.Omega = window.Omega || {};

/**
 * Přepočítá statistiky výběru, ověří kompletnost údajů a aktualizuje postranní panel
 */
window.updateStatsAndSidebar = function() {
    const stats = { do18: 0, "19": 0, svet20: 0, cz20: 0, lyrika: 0, epika: 0, drama: 0 };
    const knihaDb = window.getKnihyDb();
    const requirements = window.getRequirements();
    
    window.state.selectedIds.forEach(id => {
        const kniha = knihaDb.find(k => k.id === id);
        if (kniha) {
            stats[kniha.obdobi]++; 
            stats[kniha.druh]++;
        } else {
            window.state.selectedIds.delete(id);
        }
    });

    const total = window.state.selectedIds.size;
    let isFullyValid = (total === 20);
    
    for (const key in requirements) {
        if ((stats[key] || 0) < requirements[key]) {
            isFullyValid = false;
            break;
        }
    }

    // Externí validace a PII kontrola
    let customErrorsHtml = "";
    let localErrors = [];
    let emptyFields = 0;

    let isTeacherMode = false;
    try {
        isTeacherMode = localStorage.getItem('omega_teacher_mode') === 'true';
    } catch (e) {}

    if (!isTeacherMode) {
        const nameVal = window.state.student.name || "";
        const classVal = window.state.student.class || "";
        const yearVal = window.state.student.year || "";
        const dobVal = window.state.student.dob || "";
        const chrono = window.getOmegaChronology();

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

        // Konsolidace chybějících polí do jedné výzvy
        if (emptyFields > 0) {
            isFullyValid = false;
            localErrors.unshift("Doplňte chybějící osobní údaje.");
        }
    }
    
    if (localErrors.length > 0) {
        isFullyValid = false;
    }

    const selectedBooks = Array.from(window.state.selectedIds).map(id => knihaDb.find(k => k.id === id));
    if (typeof window.OMEGA_CONFIG?.customValidation === 'function') {
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

    if (window.elements.statTotal) {
        window.elements.statTotal.textContent = total;
    }
    
    const box = document.getElementById('stat-total-container');
    if (box) {
        if (isFullyValid) {
            box.style.borderColor = "var(--accent-green)";
        } else if (total === 20) {
            box.style.borderColor = "var(--accent-red)";
        } else {
            box.style.borderColor = "var(--border)";
        }
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

    if (window.elements.btnExport) {
        if (isFullyValid) {
            window.elements.btnExport.removeAttribute('disabled');
        } else {
            window.elements.btnExport.setAttribute('disabled', 'true');
        }
    }

    // Aktualizace odznaků pro skupiny filtrů
    document.querySelectorAll('.filter-group .filter-btn').forEach(btn => {
        const type = btn.parentElement.dataset.type;
        const val = btn.dataset.val;
        if (window.state.filters[type] === val) btn.classList.add('active');
        else btn.classList.remove('active');

        const badge = btn.querySelector('.badge');
        if (badge) {
            const current = stats[val] || 0;
            const req = requirements[val] || 0;
            badge.textContent = `${current}/${req}`;
            badge.className = `badge ${current >= req ? 'ok' : 'fail'}`;
        }
    });

    // Aktualizace odznaku pro tlačítko "Můj výběr"
    const mylistBadge = document.getElementById('badge-mylist-count');
    if (mylistBadge) {
        mylistBadge.textContent = `${total}/20`;
        mylistBadge.className = `badge ${total === 20 ? 'ok' : 'fail'}`; 
    }
};

window.Omega.stats = {
    updateStatsAndSidebar: window.updateStatsAndSidebar
};
