/**
 * OMEGA ADMIN: Virtual Database & CRUD Operations
 * Správa lokální shadow paměti (adminVirtualDb), přidávání, úpravy a mazání děl s LIS vyhodnocením.
 */

window.Omega = window.Omega || {};

/**
 * Inicializuje virtuální stínovou databázi z ostrých produkčních dat OMEGA_CONFIG
 */
window.initAdminVirtualDb = function() {
    const knihaDb = window.getKnihyDb();
    window.adminVirtualDb = JSON.parse(JSON.stringify(knihaDb)).map(k => ({
        ...k,
        _isDeleted: false,
        _isAdded: false,
        _isEdited: false,
        _uid: Math.random().toString(36).substr(2, 9),
        _original: { ...k }
    }));
    
    if (typeof window.renderAdminTable === 'function') window.renderAdminTable();
    window.adminChangelogDb = window.OMEGA_CONFIG.CHANGELOG_DB ? [...window.OMEGA_CONFIG.CHANGELOG_DB] : [];
    if (typeof window.renderAdminChangelog === 'function') window.renderAdminChangelog();
};

/**
 * Aplikuje LIS algoritmus přímo na virtuální tabulku editoru a dynamicky nastaví barvy
 */
window.adminEvaluateChanges = function() {
    window.OMEGA_STAGING_SAVED = false;
    
    // Aktivní nesmazané knihy přečíslujeme
    let activeBooks = window.adminVirtualDb.filter(b => !b._isDeleted);
    activeBooks.forEach((b, idx) => b.id = idx + 1);

    const surviving = activeBooks.filter(b => !b._isAdded && b._original);
    
    // LIS algoritmus pro nalezení nepohnutých knih
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

    // Aplikace zjištění do stavu každé knihy
    window.adminVirtualDb.forEach(book => {
        if (book._isAdded || book._isDeleted) return;

        const orig = book._original;
        const textChanged = (
            book.dilo !== orig.dilo || 
            book.autor !== orig.autor || 
            book.obdobi !== orig.obdobi || 
            book.druh !== orig.druh
        );
        const isInLIS = lisItems.includes(orig.id);
        const idChanged = (book.id !== orig.id);

        if (textChanged) {
            book._isEdited = true;
            book._isMoved = false;
        } else if (!isInLIS) {
            book._isEdited = true;
            book._isMoved = false;
        } else if (idChanged) {
            book._isEdited = false;
            book._isMoved = true;
        } else {
            book._isEdited = false;
            book._isMoved = false;
        }
    });
};

/**
 * Přidá nové dílo do virtuální databáze na specifikovanou pozici
 */
window.adminAddBook = function() {
    const diloInput = document.getElementById('admin-dilo');
    const autorInput = document.getElementById('admin-autor');
    const obdobiInput = document.getElementById('admin-obdobi');
    const druhInput = document.getElementById('admin-druh');
    const indexInput = document.getElementById('admin-index');

    const dilo = diloInput ? diloInput.value.replace(/[“”„]/g, '"').replace(/[‘’]/g, "'").trim().replace(/\s+/g, ' ') : '';
    const autor = autorInput ? autorInput.value.replace(/[“”„]/g, '"').replace(/[‘’]/g, "'").trim().replace(/\s+/g, ' ') : '';
    const obdobi = obdobiInput ? obdobiInput.value : 'do18';
    const druh = druhInput ? druhInput.value : 'epika';
    let targetId = indexInput ? parseInt(indexInput.value, 10) : window.adminVirtualDb.length + 1;

    if (!dilo || !autor) return window.showToast("⚠️ Název a autor jsou povinní.");

    let insertIndex = window.adminVirtualDb.length;
    let currentVisId = 1;
    
    for (let i = 0; i < window.adminVirtualDb.length; i++) {
        if (currentVisId === targetId) { insertIndex = i; break; }
        if (!window.adminVirtualDb[i]._isDeleted) currentVisId++;
    }

    window.adminVirtualDb.splice(insertIndex, 0, {
        dilo, autor, obdobi, druh,
        _isAdded: true, _isDeleted: false, _isEdited: false,
        _uid: Math.random().toString(36).substr(2, 9)
    });

    window.adminEvaluateChanges();
    window.isSafeToExit = false;
    window.renderAdminTable();
    
    if (diloInput) diloInput.value = '';
    if (autorInput) autorInput.value = '';
    window.showToast("➕ Dílo vloženo do databáze.");
};

/**
 * Aktualizuje pole knihy ve virtuální databázi
 * @param {string} uid - Unikátní identifikátor řádku
 * @param {string} field - Název pole ('dilo' | 'autor' | 'obdobi' | 'druh')
 * @param {string} value - Nová hodnota
 */
window.adminUpdateBook = function(uid, field, value) {
    const book = window.adminVirtualDb.find(k => k._uid === uid);
    if (!book) return;
    book[field] = value.trim();
    
    window.adminEvaluateChanges();
    window.isSafeToExit = false;
    window.renderAdminTable();
};

/**
 * Přepne příznak smazání díla (případně nově přidané dílo rovnou odstraní)
 * @param {string} uid - Unikátní identifikátor řádku
 */
window.adminToggleDelete = function(uid) {
    const bookIndex = window.adminVirtualDb.findIndex(k => k._uid === uid);
    if (bookIndex === -1) return;
    
    if (window.adminVirtualDb[bookIndex]._isAdded) {
        window.adminVirtualDb.splice(bookIndex, 1);
        window.showToast("🗑️ Nové dílo zrušeno.");
    } else {
        window.adminVirtualDb[bookIndex]._isDeleted = !window.adminVirtualDb[bookIndex]._isDeleted;
        window.showToast(window.adminVirtualDb[bookIndex]._isDeleted ? "🗑️ Označeno ke smazání." : "↩️ Dílo obnoveno.");
    }
    
    window.adminEvaluateChanges(); 
    window.isSafeToExit = false;
    
    window.renderAdminTable();
    if (typeof window.renderAdminSummary === 'function') window.renderAdminSummary();
};

window.Omega.adminDb = {
    init: window.initAdminVirtualDb,
    evaluate: window.adminEvaluateChanges,
    addBook: window.adminAddBook,
    updateBook: window.adminUpdateBook,
    toggleDelete: window.adminToggleDelete
};
