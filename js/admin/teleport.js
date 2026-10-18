/**
 * OMEGA ADMIN: Book Teleport Engine
 * Rychlý přesun knihy na konkrétní cílové ID bez nutnosti ručního přetahování myší (Drag & Drop).
 */

window.Omega = window.Omega || {};

(function() {
    let currentTeleportId = null;

    /**
     * Otevře teleportační modál pro zadané ID knihy
     * @param {number} oldId - Původní ID knihy
     */
    window.openTeleportModal = function(oldId) {
        currentTeleportId = oldId;
        const oldIdEl = document.getElementById('teleport-old-id-display');
        if (oldIdEl) oldIdEl.innerText = oldId;
        
        const input = document.getElementById('teleport-new-id-input');
        const errorDisplay = document.getElementById('teleport-error-msg');
        
        const visibleCount = window.adminVirtualDb.filter(b => !b._isDeleted).length;

        if (input) {
            input.value = '';
            input.max = visibleCount;
            input.style.borderColor = "var(--border, #d1d5db)";
        }
        if (errorDisplay) errorDisplay.innerText = '';
        
        const modal = document.getElementById('omega-teleport-modal');
        if (modal) modal.style.display = 'flex';
        setTimeout(() => input?.focus(), 100);
    };

    /**
     * Zavře teleportační modál
     */
    window.closeTeleportModal = function() {
        const modal = document.getElementById('omega-teleport-modal');
        if (modal) modal.style.display = 'none';
        currentTeleportId = null;
    };

    /**
     * Potvrdí a provede teleport knihy na novou pozici
     */
    window.confirmTeleport = function() {
        if (!currentTeleportId) return;

        const input = document.getElementById('teleport-new-id-input');
        const errorDisplay = document.getElementById('teleport-error-msg');
        let newId = input ? parseInt(input.value) : NaN;
        let oldId = currentTeleportId;
        
        let maxId = window.adminVirtualDb.filter(b => !b._isDeleted).length;

        if (input) input.style.borderColor = "var(--border, #d1d5db)";
        if (errorDisplay) errorDisplay.innerText = '';

        const throwError = (msg) => {
            if (input) input.style.borderColor = "var(--accent-red, #ef4444)";
            if (errorDisplay) errorDisplay.innerText = msg;
        };

        if (isNaN(newId)) return throwError("Zadejte platné číslo.");
        if (newId < 1) return throwError("ID nemůže být menší než 1.");
        if (newId > maxId) return throwError(`Databáze má pouze ${maxId} děl. Nelze přeskočit limit.`);
        if (newId === oldId) return throwError("Dílo se již na této pozici nachází.");

        let oldIndex = window.adminVirtualDb.findIndex(b => b.id === oldId && !b._isDeleted);
        if (oldIndex === -1) return throwError("Dílo nebylo v paměti nalezeno.");

        let movedItem = window.adminVirtualDb.splice(oldIndex, 1)[0];

        if (!movedItem._isAdded) {
            movedItem._isEdited = true;
            if (!movedItem._moveHistory) movedItem._moveHistory = [];
            movedItem._moveHistory.push({ from: oldId, to: newId });
        }

        // Výpočet nového indexu s přeskočením smazaných položek
        let visibleCount = 0;
        let insertIndex = window.adminVirtualDb.length;
        for (let i = 0; i < window.adminVirtualDb.length; i++) {
            if (!window.adminVirtualDb[i]._isDeleted) {
                visibleCount++;
                if (visibleCount === newId) {
                    insertIndex = i;
                    break;
                }
            }
        }

        window.adminVirtualDb.splice(insertIndex, 0, movedItem);

        // Přepočet vizuálních ID
        let currentVisualId = 1;
        window.adminVirtualDb.forEach(book => {
            if (!book._isDeleted) {
                book.id = currentVisualId++;
            }
        });

        window.closeTeleportModal();
        window.renderAdminTable(); 
        if (typeof window.renderAdminSummary === 'function') window.renderAdminSummary();
    };

    // Záchyt Enter klávesy v modálu
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('teleport-new-id-input')?.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') window.confirmTeleport();
        });
    });

    window.Omega.teleport = {
        open: window.openTeleportModal,
        close: window.closeTeleportModal,
        confirm: window.confirmTeleport
    };
})();
