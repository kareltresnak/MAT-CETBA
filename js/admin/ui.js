/**
 * OMEGA ADMIN: UI Controls, Custom Selects & Heuristics
 * Přepínání záložek administrace, custom výběrové seznamy, našeptávač autorů a auto-fill období.
 */

window.Omega = window.Omega || {};

/**
 * Přepíná režim administrace (Přidat, Upravit, Audit log, Changelog)
 * @param {string} mode - 'add' | 'edit' | 'summary' | 'changelog'
 */
window.switchAdminMode = function(mode) {
    const forms = { 
        add: document.getElementById('admin-form-add'), 
        edit: document.getElementById('admin-form-edit'), 
        summary: document.getElementById('admin-form-summary'), 
        changelog: document.getElementById('admin-form-changelog')
    };
    const tabs = { 
        add: document.getElementById('tab-add'), 
        edit: document.getElementById('tab-edit'), 
        summary: document.getElementById('tab-summary'),
        changelog: document.getElementById('tab-changelog')
    };

    if (!forms.add || !forms.edit || !forms.summary) return;

    Object.keys(forms).forEach(key => {
        if (forms[key]) {
            forms[key].style.display = (key === mode) ? (key === 'add' ? 'grid' : 'flex') : 'none';
        }
        if (tabs[key]) {
            tabs[key].style.borderBottom = (key === mode) ? '2px solid var(--accent-primary)' : '2px solid transparent';
            tabs[key].style.opacity = (key === mode) ? '1' : '0.5';
        }
    });

    if (mode === 'summary') {
        if (typeof window.renderAdminSummary === 'function') window.renderAdminSummary();
        if (typeof window.fetchPrivateAuditLog === 'function') window.fetchPrivateAuditLog();
    }
    if (mode === 'changelog') {
        if (typeof window.renderAdminChangelog === 'function') window.renderAdminChangelog();
    }
};

/**
 * Otevře stylový kontextový výběrový seznam (období / druh) na pozici kliknutí
 */
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
        ? [ 
            { val: 'do18', label: 'Do konce 18. st.' }, 
            { val: '19', label: '19. století' }, 
            { val: 'svet20', label: 'Svět 20. a 21. st.' }, 
            { val: 'cz20', label: 'ČR 20. a 21. st.' } 
          ]
        : [ 
            { val: 'epika', label: 'Epika' }, 
            { val: 'lyrika', label: 'Lyrika' }, 
            { val: 'drama', label: 'Drama' } 
          ];

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

/**
 * Zvolí položku z kontextového výběrového menu
 */
window.adminSelectCustomOption = function(uid, field, val, label, isAddForm) {
    document.querySelectorAll('.omega-custom-select-menu').forEach(el => el.remove());
    
    if (isAddForm) {
        const inputEl = document.getElementById(`admin-${field}`);
        const labelEl = document.getElementById(`admin-${field}-label`);
        if (inputEl) inputEl.value = val;
        if (labelEl) labelEl.textContent = label;
    } else {
        if (typeof window.adminUpdateBook === 'function') {
            window.adminUpdateBook(uid, field, val);
        }
    }
};

/**
 * Inicializuje našeptávač autorů s automatickým vyplněním literárního období
 */
window.initAuthorAutocomplete = function() {
    const knihaDb = window.getKnihyDb();
    const unikatniAutori = [...new Set(knihaDb.map(k => k.autor))].sort((a, b) => a.localeCompare(b, 'cs'));
    
    const input = document.getElementById('admin-autor');
    const dropdown = document.getElementById('custom-author-dropdown');
    if (!input || !dropdown) return;

    const renderDropdown = (query) => {
        const hledano = query.trim().toLowerCase();
        const filtered = hledano ? unikatniAutori.filter(a => a.toLowerCase().includes(hledano)) : unikatniAutori;
        
        if (filtered.length === 0) {
            dropdown.style.display = 'none';
            return;
        }

        dropdown.innerHTML = filtered.map(autor => {
            const regex = new RegExp(`(${hledano})`, 'gi');
            const highlighted = hledano ? autor.replace(regex, '<strong style="color: var(--accent-primary, #e67e22); font-weight: 900;">$1</strong>') : autor;
            
            return `<div class="autocomplete-item" style="padding: 12px 15px; cursor: pointer; border-bottom: 1px solid var(--border); font-size: 0.9rem; color: var(--text-main); transition: background 0.1s;" onmouseover="this.style.background='var(--bg-active)'" onmouseout="this.style.background='transparent'" data-val="${autor}">${highlighted}</div>`;
        }).join('');
        
        dropdown.style.display = 'flex';
    };

    input.addEventListener('focus', () => renderDropdown(input.value));
    
    input.addEventListener('input', (e) => {
        renderDropdown(e.target.value);
        
        // Auto-fill heuristika: Doplní období podle předchozích děl stejného autora
        const hledanyAutor = e.target.value.trim().toLowerCase();
        const nalezeneDilo = knihaDb.find(k => k.autor.toLowerCase() === hledanyAutor);
        if (nalezeneDilo) {
            const obdobiInput = document.getElementById('admin-obdobi');
            const obdobiLabel = document.getElementById('admin-obdobi-label');
            const obdobiTrigger = document.getElementById('admin-obdobi-trigger');
            
            if (obdobiInput && obdobiInput.value !== nalezeneDilo.obdobi) {
                obdobiInput.value = nalezeneDilo.obdobi;
                if (obdobiLabel) obdobiLabel.textContent = window.MAPA_OBDOBI[nalezeneDilo.obdobi] || nalezeneDilo.obdobi;
                
                if (obdobiTrigger) {
                    obdobiTrigger.style.transition = "background-color 0.3s";
                    obdobiTrigger.style.backgroundColor = "var(--bg-active)";
                    setTimeout(() => obdobiTrigger.style.backgroundColor = "transparent", 600);
                }
            }
        }
    });

    dropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.autocomplete-item');
        if (item) {
            input.value = item.dataset.val;
            dropdown.style.display = 'none';
            input.dispatchEvent(new Event('input'));
            document.getElementById('admin-druh')?.focus();
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target !== input && e.target !== dropdown && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
};

/**
 * Navrhne další volné ID knihy pro formulář přidání díla
 */
window.navrhniDalsiVolneId = function() {
    const activeCount = window.adminVirtualDb.filter(k => !k._isDeleted).length;
    const idInput = document.getElementById('admin-index');
    if (idInput) idInput.value = activeCount + 1;
};

// Klávesové zkratky v admin formuláři
document.addEventListener('DOMContentLoaded', () => {
    ['admin-dilo', 'admin-autor', 'admin-index'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (typeof window.adminAddBook === 'function') window.adminAddBook();
                }
            });
        }
    });
});

window.Omega.adminUi = {
    switchAdminMode: window.switchAdminMode,
    adminOpenCustomDropdown: window.adminOpenCustomDropdown,
    adminSelectCustomOption: window.adminSelectCustomOption,
    initAuthorAutocomplete: window.initAuthorAutocomplete,
    navrhniDalsiVolneId: window.navrhniDalsiVolneId
};
