/**
 * OMEGA STUDENT: Filters & Navigation Engine
 * Filtrování dle období a žánrů, přepínač "Můj výběr", reset filtrů a mobilní záložková navigace.
 */

window.Omega = window.Omega || {};

/**
 * Inicializuje posluchače pro filtrační tlačítka a mobilní navigaci
 */
window.initFiltersAndNavigation = function() {
    // 1. Klikání na období a literární druhy
    document.querySelectorAll('.filter-group .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.parentElement.dataset.type;
            const val = btn.dataset.val;
            window.state.filters[type] = (window.state.filters[type] === val) ? null : val;
            window.renderTable();
            window.updateStatsAndSidebar();
            window.saveState(); 
        });
    });

    // 2. Klikání na "Můj Výběr"
    const btnFilterMyList = document.getElementById('btn-filter-mylist');
    if (btnFilterMyList) {
        btnFilterMyList.addEventListener('click', () => {
            window.state.showOnlyMyList = !window.state.showOnlyMyList;
            
            if (window.state.showOnlyMyList) {
                btnFilterMyList.classList.add('active');
            } else {
                btnFilterMyList.classList.remove('active');
            }
            
            if (typeof window.renderTable === 'function') window.renderTable();
            if (typeof window.trackOmegaEvent === 'function') {
                window.trackOmegaEvent('Filter_MyList_Toggled', { active: window.state.showOnlyMyList });
            }
        });
    }

    // 3. Tlačítko pro celkový reset všech filtrů
    if (window.elements.btnReset) {
        window.elements.btnReset.addEventListener('click', () => {
            window.state.filters = { obdobi: null, druh: null };
            window.state.searchQuery = "";
            if (window.elements.searchBox) window.elements.searchBox.value = "";
            
            window.state.showOnlyMyList = false;
            const myBtn = document.getElementById('btn-filter-mylist');
            if (myBtn) myBtn.classList.remove('active');

            window.renderTable();
            window.updateStatsAndSidebar();
            window.saveState(); 
        });
    }

    // 4. Mobilní spodní navigace (přepínání zobrazení seznamu vs. detailu)
    const mobileTabs = document.querySelectorAll('.nav-tab');
    mobileTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.target;
            
            mobileTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            if (target === 'sidebar') {
                document.body.classList.remove('mobile-view-main');
                document.body.classList.add('mobile-view-sidebar');
            } else {
                document.body.classList.remove('mobile-view-sidebar');
                document.body.classList.add('mobile-view-main');
            }
            
            window.scrollTo({ top: 0, behavior: 'instant' });
        });
    });

    // 5. Tlačítko pro rychlý posun nahoru (Scroll-to-top)
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            window.elements.btnScrollTop?.classList.add('visible');
        } else {
            window.elements.btnScrollTop?.classList.remove('visible');
        }
    }, { passive: true });

    window.elements.btnScrollTop?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
};

window.Omega.filters = {
    initFiltersAndNavigation: window.initFiltersAndNavigation
};
