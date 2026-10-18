/**
 * OMEGA STUDENT: Book Table & Search Engine
 * Vykreslování katalogu děl, interaktivní výběr knih, debounced vyhledávání a klávesová navigace.
 */

window.Omega = window.Omega || {};

/**
 * Vykreslí tabulku děl dle aktivních filtrů a vyhledávacího dotazu
 */
window.renderTable = function() {
    const q = (window.state.searchQuery || "").toLowerCase().trim();
    const knihaDb = window.getKnihyDb();

    const filtered = knihaDb.filter(kniha => {
        // Propust "Můj výběr"
        if (window.state.showOnlyMyList && !window.state.selectedIds.has(kniha.id)) return false;
        if (window.state.filters.obdobi && window.state.filters.obdobi !== kniha.obdobi) return false;
        if (window.state.filters.druh && window.state.filters.druh !== kniha.druh) return false;
        if (q && !(kniha.dilo.toLowerCase().includes(q) || kniha.autor.toLowerCase().includes(q))) return false;
        return true;
    });

    const tableEl = document.getElementById('data-table');
    const emptyStateEl = document.getElementById('empty-search-state');

    if (filtered.length === 0) {
        if (tableEl) tableEl.style.display = 'none';
        if (emptyStateEl) {
            emptyStateEl.style.display = 'block';
            if (window.state.showOnlyMyList && window.state.selectedIds.size === 0) {
                emptyStateEl.innerHTML = `<h3>Váš seznam je prázdný</h3><p>Nejprve si vyberte díla kliknutím na řádky v databázi.</p>`;
            } else {
                emptyStateEl.innerHTML = `<h3>Nic nenalezeno</h3><p>Zkuste upravit filtry nebo vyhledávání.</p>`;
            }
        }
        if (window.elements.tableBody) window.elements.tableBody.innerHTML = '';
        return;
    } else {
        if (tableEl) tableEl.style.display = 'table';
        if (emptyStateEl) emptyStateEl.style.display = 'none';
    }

    // Zvýraznění nalezeného textu
    const highlight = (text) => {
        if (!q) return text;
        const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    };

    if (window.elements.tableBody) {
        window.elements.tableBody.innerHTML = filtered.map((kniha, index) => {
            const isSelected = window.state.selectedIds.has(kniha.id);
            const tIndex = (index === 0) ? "0" : "-1";
            return `
                <tr data-id="${kniha.id}" class="${isSelected ? 'selected' : ''}" tabindex="${tIndex}">
                    <td>${kniha.id}</td>
                    <td>${isSelected ? '✔ ' : ''}${highlight(window.sanitize(kniha.dilo))}</td>
                    <td>${highlight(window.sanitize(kniha.autor))}</td>
                    <td>${kniha.druh}</td>
                    <td>${window.MAPA_OBDOBI[kniha.obdobi] || kniha.obdobi}</td>
                </tr>
            `;
        }).join('');
    }
};

/**
 * Přepne stav výběru knihy (vybráno / nevybráno) s kontrolou limitu 20 děl
 * @param {number} id - ID knihy
 */
window.toggleBook = function(id) {
    if (window.state.selectedIds.has(id)) {
        window.state.selectedIds.delete(id);
    } else {
        if (window.state.selectedIds.size >= 20) {
            window.showToast("⚠️ Kapacita naplněna (20). Odstraňte některé dílo.");
            return;
        }
        window.state.selectedIds.add(id);
    }
    
    const focusedRow = document.activeElement;
    const focusedId = focusedRow && focusedRow.tagName === 'TR' ? focusedRow.dataset.id : null;
    
    window.renderTable();
    window.updateStatsAndSidebar();
    window.saveState(); 

    // Obnova focusu po překreslení tabulky
    if (focusedId && window.elements.tableBody) {
        const rows = Array.from(window.elements.tableBody.querySelectorAll('tr'));
        rows.forEach(r => r.setAttribute('tabindex', '-1'));
        const rowToFocus = window.elements.tableBody.querySelector(`tr[data-id="${focusedId}"]`);
        if (rowToFocus) {
            rowToFocus.setAttribute('tabindex', '0');
            rowToFocus.focus();
        } else if (rows.length > 0) {
            rows[0].setAttribute('tabindex', '0');
        }
    }
};

/**
 * Inicializuje posluchače událostí pro tabulku, hledání a klávesovou navigaci
 */
window.initTableEvents = function() {
    let searchTelemetryTimeout = null;

    if (window.elements.tableBody) {
        window.elements.tableBody.addEventListener('click', (e) => {
            const tr = e.target.closest('tr');
            if (tr && tr.dataset.id) window.toggleBook(parseInt(tr.dataset.id, 10));
        });

        window.elements.tableBody.addEventListener('keydown', (e) => {
            const currentTr = e.target.closest('tr');
            if (!currentTr) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const nextTr = currentTr.nextElementSibling;
                if (nextTr) {
                    currentTr.setAttribute('tabindex', '-1');
                    nextTr.setAttribute('tabindex', '0');
                    nextTr.focus();
                    nextTr.scrollIntoView({ block: 'nearest' });
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prevTr = currentTr.previousElementSibling;
                if (prevTr) {
                    currentTr.setAttribute('tabindex', '-1');
                    prevTr.setAttribute('tabindex', '0');
                    prevTr.focus();
                    prevTr.scrollIntoView({ block: 'nearest' });
                }
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                window.toggleBook(parseInt(currentTr.dataset.id, 10));
            }
        });
    }

    if (window.elements.searchBox) {
        window.elements.searchBox.addEventListener('input', (e) => {
            window.state.searchQuery = e.target.value;
            window.renderTable();

            // Telemetrie hledání (debounce 1.5s po dopsání)
            clearTimeout(searchTelemetryTimeout);
            if (window.state.searchQuery.trim().length > 1) {
                searchTelemetryTimeout = setTimeout(() => {
                    window.trackOmegaEvent('Search_Used', { query_length: window.state.searchQuery.length });
                    const emptyState = document.getElementById('empty-search-state');
                    if (emptyState && emptyState.style.display === 'block') {
                        window.trackOmegaEvent('Search_Zero_Results');
                    }
                }, 1500);
            }
        });

        window.elements.searchBox.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                window.state.searchQuery = "";
                window.elements.searchBox.value = "";
                window.renderTable();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const firstRow = window.elements.tableBody?.querySelector('tr');
                if (firstRow) firstRow.focus();
            }
        });
    }

    // Globální klávesová zkratka: Stisknutí '/' kdekoli přenese kurzor do hledání
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement !== window.elements.searchBox) {
            if (document.activeElement && document.activeElement.tagName === 'INPUT') return; 
            e.preventDefault();
            if (window.elements.searchBox) window.elements.searchBox.focus();
        }
    });
};

window.Omega.table = {
    renderTable: window.renderTable,
    toggleBook: window.toggleBook,
    initTableEvents: window.initTableEvents
};
