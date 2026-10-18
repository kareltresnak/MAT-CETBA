/**
 * OMEGA ADMIN: Master Admin Identity Management
 * Kompletní správa uživatelských účtů (učitelů), kinetika síly hesla a asynchronní CRUD v Cloudflare KV.
 */

window.Omega = window.Omega || {};

(function() {
    let isPasswordValid = false;
    let pendingUserToDelete = null;

    /**
     * Otevře modál správy uživatelů a stáhne aktuální seznam
     */
    window.openUserModal = function() {
        const modal = document.getElementById('omega-user-modal');
        if (modal) modal.style.display = 'flex';
        window.fetchAdminUsers();
    };

    /**
     * Zavře modál správy uživatelů
     */
    window.closeUserModal = function() {
        const modal = document.getElementById('omega-user-modal');
        if (modal) modal.style.display = 'none';
    };

    /**
     * Vytvoří nového uživatele a provede optimistickou aktualizaci UI
     */
    window.executeCreateUser = async function() {
        const nameInput = document.getElementById('new-user-name');
        const pwdInput = document.getElementById('new-user-pwd');
        const newUser = nameInput ? nameInput.value.trim() : '';
        const newPwd = pwdInput ? pwdInput.value : '';

        if (!newUser || !isPasswordValid) {
            return window.showToast("❌ Formulář nesplňuje bezpečnostní požadavky.");
        }

        window.showToast("⏳ Zapisuji identitu do Cloudflare...");
        const createBtn = document.getElementById('btn-create-user');
        if (createBtn) createBtn.disabled = true;

        try {
            const response = await fetch(window.OMEGA_ADMIN_CONFIG.WORKER_URL + "/add-user", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json", 
                    "X-Omega-Device-Id": window.getDeviceIdentity() 
                },
                body: JSON.stringify({ 
                    new_username: newUser,
                    new_password: newPwd
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Operace selhala.");
            
            window.showToast("✅ Účet bezpečně uložen.");
            if (nameInput) nameInput.value = '';
            if (pwdInput) {
                pwdInput.value = '';
                pwdInput.dispatchEvent(new Event('input')); 
            }
            
            // Optimistic UI: Okamžité přidání uživatele do DOMu
            const listContainer = document.getElementById('admin-user-list');
            if (listContainer) {
                if (listContainer.innerHTML.includes('Zatím nejsou') || listContainer.innerHTML.includes('Načítám')) {
                    listContainer.innerHTML = '';
                }
                listContainer.innerHTML += `
                    <div id="user-row-${newUser.toLowerCase()}" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-bottom: 1px solid var(--border);">
                        <span style="font-weight: bold; color: var(--text-main);">👤 ${window.sanitize(newUser)}</span>
                        <button onclick="promptDeleteUser('${newUser.toLowerCase()}')" style="background: transparent; border: 1px solid var(--accent-red); color: var(--accent-red); border-radius: 4px; cursor: pointer; padding: 4px 8px; font-size: 0.75rem; transition: 0.2s;" onmouseover="this.style.background='rgba(218,33,40,0.1)'" onmouseout="this.style.background='transparent'">Odstranit</button>
                    </div>
                `;
            }
        } catch (error) { 
            window.showToast("❌ Chyba: " + error.message); 
        } finally {
            if (createBtn) createBtn.disabled = !isPasswordValid;
        }
    };

    /**
     * Stáhne seznam existujících účtů z Edge sítě
     */
    window.fetchAdminUsers = async function() {
        const listContainer = document.getElementById('admin-user-list');
        if (!listContainer) return;
        listContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 10px;">⏳ Načítám uzly z Edge sítě...</div>';

        try {
            const response = await fetch(window.OMEGA_ADMIN_CONFIG.WORKER_URL + "/list-users", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json", 
                    "X-Omega-Device-Id": window.getDeviceIdentity() 
                },
                body: JSON.stringify({})
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            if (!data.users || data.users.length === 0) {
                listContainer.innerHTML = '<div style="padding: 10px;">Zatím nejsou vytvořeni žádní učitelé.</div>';
                return;
            }

            listContainer.innerHTML = data.users.map(u => `
                <div id="user-row-${u}" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-bottom: 1px solid var(--border);">
                    <span style="font-weight: bold; color: var(--text-main);">👤 ${window.sanitize(u)}</span>
                    <button onclick="promptDeleteUser('${u}')" style="background: transparent; border: 1px solid var(--accent-red); color: var(--accent-red); border-radius: 4px; cursor: pointer; padding: 4px 8px; font-size: 0.75rem; transition: 0.2s;" onmouseover="this.style.background='rgba(218,33,40,0.1)'" onmouseout="this.style.background='transparent'">Odstranit</button>
                </div>
            `).join('');

        } catch (error) { 
            listContainer.innerHTML = `<div style="color: var(--accent-red); padding: 10px;">❌ Nelze načíst uživatele.</div>`; 
        }
    };

    /**
     * Otevře modál pro potvrzení smazání uživatelského účtu
     */
    window.promptDeleteUser = function(targetUser) {
        pendingUserToDelete = targetUser;
        const nameEl = document.getElementById('delete-user-name');
        if (nameEl) nameEl.innerText = targetUser;
        const modal = document.getElementById('omega-delete-user-modal');
        if (modal) modal.style.display = 'flex';
    };

    /**
     * Zavře modál pro potvrzení smazání uživatelského účtu
     */
    window.closeDeleteUserModal = function() {
        const modal = document.getElementById('omega-delete-user-modal');
        if (modal) modal.style.display = 'none';
        pendingUserToDelete = null;
    };

    /**
     * Potvrdí a odešle požadavek na trvalé smazání účtu
     */
    window.confirmDeleteUser = async function() {
        if (!pendingUserToDelete) return;
        const targetUser = pendingUserToDelete;
        window.closeDeleteUserModal();
        window.showToast(`⏳ Odstraňuji účet ${targetUser}...`);
        
        try {
            const response = await fetch(window.OMEGA_ADMIN_CONFIG.WORKER_URL + "/delete-user", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json", 
                    "X-Omega-Device-Id": window.getDeviceIdentity() 
                },
                body: JSON.stringify({ target_user: targetUser })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            
            window.showToast("🗑️ Účet trvale odstraněn.");
            const row = document.getElementById(`user-row-${targetUser}`);
            if (row) row.remove();
            
        } catch (error) { 
            window.showToast("❌ Nelze odstranit: " + error.message); 
        }
    };

    // Validace hesla v reálném čase
    document.addEventListener('DOMContentLoaded', () => {
        const masterBtnNode = document.getElementById('btn-master-admin');
        if (masterBtnNode) masterBtnNode.onclick = window.openUserModal;

        const pwdInput = document.getElementById('new-user-pwd');
        if (pwdInput) {
            pwdInput.addEventListener('input', (e) => {
                const val = e.target.value;
                
                const rules = {
                    len: val.length >= 12,
                    upper: (val.match(/[A-Z]/g) || []).length >= 2,
                    num: (val.match(/[0-9]/g) || []).length >= 2,
                    sym: (val.match(/[^a-zA-Z0-9]/g) || []).length >= 2
                };

                const ruleLen = document.getElementById('rule-len');
                const ruleUpper = document.getElementById('rule-upper');
                const ruleNum = document.getElementById('rule-num');
                const ruleSym = document.getElementById('rule-sym');

                if (ruleLen) ruleLen.innerHTML = rules.len ? '✅ Min. 12 znaků' : '❌ Min. 12 znaků';
                if (ruleUpper) ruleUpper.innerHTML = rules.upper ? '✅ 2 velká písmena' : '❌ 2 velká písmena';
                if (ruleNum) ruleNum.innerHTML = rules.num ? '✅ 2 číslice' : '❌ 2 číslice';
                if (ruleSym) ruleSym.innerHTML = rules.sym ? '✅ 2 speciální znaky' : '❌ 2 speciální znaky';

                let score = Object.values(rules).filter(Boolean).length;
                const bar = document.getElementById('pwd-strength-bar');
                const btn = document.getElementById('btn-create-user');

                if (bar) {
                    bar.style.width = (score * 25) + '%';
                    if (score < 2) bar.style.background = 'var(--accent-red)';
                    else if (score < 4) bar.style.background = '#f59e0b';
                    else bar.style.background = 'var(--accent-green)';
                }

                isPasswordValid = (score === 4);
                if (btn) btn.disabled = !isPasswordValid;
            });
        }
    });

    window.Omega.users = {
        openUserModal: window.openUserModal,
        closeUserModal: window.closeUserModal,
        executeCreateUser: window.executeCreateUser,
        fetchAdminUsers: window.fetchAdminUsers,
        promptDeleteUser: window.promptDeleteUser,
        closeDeleteUserModal: window.closeDeleteUserModal,
        confirmDeleteUser: window.confirmDeleteUser
    };
})();
