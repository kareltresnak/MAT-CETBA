/**
 * OMEGA ADMIN: Table Renderer & Drag-and-Drop Engine
 * Vykreslování virtuální tabulky editoru, inline editace a Drag & Drop kinetika.
 */

window.Omega = window.Omega || {};

(function() {
    let draggedUid = null;

    /**
     * Vykreslí kompletní interaktivní tabulku knih v administračním editoru
     */
    window.renderAdminTable = function() {
        const container = document.getElementById('admin-live-table-container');
        if (!container) return;
        
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
        
        window.adminVirtualDb.forEach((book) => {
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
                const contentChanged = book._original && (
                    book.dilo !== book._original.dilo ||
                    book.autor !== book._original.autor ||
                    book.obdobi !== book._original.obdobi ||
                    book.druh !== book._original.druh
                );
                const explicitMove = book._moveHistory && book._moveHistory.length > 0;

                if (contentChanged || explicitMove) {
                    bg = 'rgba(245, 158, 11, 0.08)';
                    leftBorder = '4px solid #f59e0b';
                } else if (book._original && book.id !== book._original.id) {
                    bg = 'rgba(59, 130, 246, 0.05)';
                    leftBorder = '4px solid #3b82f6';
                }
            }

            let idDisplay = isDel 
                ? `<strike>${book.id || '-'}</strike>` 
                : `<span onclick="openTeleportModal(${book.id})" style="cursor: pointer; padding: 2px 8px; border-radius: 4px; background: var(--bg-surface); border: 1px solid var(--border); color: var(--text-main); font-weight: bold; transition: all 0.2s ease; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);" title="Teleport (Přesunout dílo)" onmouseover="this.style.borderColor='var(--accent-primary)'; this.style.color='var(--accent-primary)';" onmouseout="this.style.borderColor='var(--border)'; this.style.color='var(--text-main)';">${visualId++} <span style="font-size:0.7em; opacity:0.5;">⇅</span></span>`;
            
            const inputStyle = `width: 100%; background: transparent; border: 1px solid transparent; color: var(--text-main); padding: 8px 6px; border-radius: 6px; outline: none; transition: all 0.2s; font-family: inherit; font-size: 0.95rem; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;`;
            const focusLogic = `onmouseover="this.style.background='rgba(118, 203, 161, 0.05)'" onmouseout="this.style.background='transparent'" onfocus="this.style.background='var(--bg-base)'; this.style.borderColor='var(--accent-primary-light)'; this.style.boxShadow='0 0 0 3px rgba(118, 203, 161, 0.2)'" onblur="this.style.background='transparent'; this.style.borderColor='transparent'; this.style.boxShadow='none'"`;

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
                
                <td style="padding: 4px 2px;"><input type="text" value="${window.sanitize(book.dilo)}" onchange="adminUpdateBook('${book._uid}', 'dilo', this.value)" style="${inputStyle}" ${isDel ? 'disabled' : focusLogic}></td>
                <td style="padding: 4px 2px;"><input type="text" value="${window.sanitize(book.autor)}" onchange="adminUpdateBook('${book._uid}', 'autor', this.value)" style="${inputStyle}" ${isDel ? 'disabled' : focusLogic}></td>
                
                <td style="padding: 4px 2px;">
                    <div style="${inputStyle} cursor: ${isDel ? 'not-allowed' : 'pointer'}; display: flex; justify-content: space-between; align-items: center;" 
                         ${isDel ? '' : `onclick="adminOpenCustomDropdown('${book._uid}', 'obdobi', event)" ${focusLogic}`}>
                        <span style="overflow: hidden; text-overflow: ellipsis;">${window.MAPA_OBDOBI[book.obdobi] || book.obdobi}</span><span style="font-size:0.6em; opacity:0.5;">▼</span>
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

    // Kinetika Drag & Drop
    window.adminDragStart = function(e, uid) {
        draggedUid = uid;
        e.dataTransfer.effectAllowed = 'move';
        e.target.closest('tr').style.opacity = '0.4';
        setTimeout(() => e.target.closest('tr')?.classList.add('dragging'), 0);
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

        const fromIndex = window.adminVirtualDb.findIndex(k => k._uid === draggedUid);
        const toIndex = window.adminVirtualDb.findIndex(k => k._uid === targetUid);

        if (fromIndex !== -1 && toIndex !== -1) {
            const [movedItem] = window.adminVirtualDb.splice(fromIndex, 1);
            
            if (!movedItem._isAdded) {
                movedItem._isEdited = true;
                if (!movedItem._moveHistory) movedItem._moveHistory = [];
                movedItem._moveHistory.push({ from: fromIndex + 1, to: toIndex + 1 });
            }

            window.adminVirtualDb.splice(toIndex, 0, movedItem);
            
            window.adminVirtualDb.forEach((book, idx) => {
                book.id = idx + 1;
            });
            
            window.isSafeToExit = false;
            window.renderAdminTable();
            if (typeof window.renderAdminSummary === 'function') window.renderAdminSummary();
            window.showToast("↕️ Pořadí upraveno.");
        }
        draggedUid = null;
    };

    window.adminDragEnd = function(e) {
        const tr = e.target.closest('tr');
        if (tr) {
            tr.style.opacity = '1';
            tr.classList.remove('dragging');
        }
        window.renderAdminTable(); 
    };

    window.Omega.adminTable = {
        render: window.renderAdminTable,
        dragStart: window.adminDragStart,
        dragOver: window.adminDragOver,
        dragLeave: window.adminDragLeave,
        drop: window.adminDrop,
        dragEnd: window.adminDragEnd
    };
})();
