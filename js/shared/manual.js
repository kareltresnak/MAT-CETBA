/**
 * OMEGA SHARED: Interactive Manual & Guide Engine
 * Instruktážní modály pro studenty i administrátory s perzistencí "Příště již nezobrazovat".
 */

window.Omega = window.Omega || {};

(function() {
    'use strict';

    /**
     * Otevře modál nápovědy pro studenty
     * @param {boolean} isAuto - Zda bylo voláno automaticky při otevření stránky
     */
    window.openStudentManual = function(isAuto = false) {
        if (isAuto && localStorage.getItem('omega_student_manual_dismissed') === 'true') {
            return;
        }

        const modal = document.getElementById('omega-student-manual-modal');
        if (!modal) return;

        const chk = document.getElementById('student-manual-dont-show');
        if (chk) {
            chk.checked = localStorage.getItem('omega_student_manual_dismissed') === 'true';
        }

        modal.style.display = 'flex';
    };

    /**
     * Zavře modál studentské nápovědy a uloží preferenci "již nezobrazovat"
     */
    window.closeStudentManual = function() {
        const modal = document.getElementById('omega-student-manual-modal');
        const chk = document.getElementById('student-manual-dont-show');

        if (chk && chk.checked) {
            localStorage.setItem('omega_student_manual_dismissed', 'true');
        } else {
            localStorage.removeItem('omega_student_manual_dismissed');
        }

        if (modal) modal.style.display = 'none';
    };

    /**
     * Otevře modál nápovědy pro administrátory (správa seznamu pro vedoucí / katedru)
     * @param {boolean} isAuto - Zda bylo voláno automaticky po vstupu do administrace
     */
    window.openAdminManual = function(isAuto = false) {
        if (isAuto && localStorage.getItem('omega_admin_manual_dismissed') === 'true') {
            return;
        }

        const modal = document.getElementById('omega-manual-modal');
        if (!modal) return;

        const chk = document.getElementById('admin-manual-dont-show');
        if (chk) {
            chk.checked = localStorage.getItem('omega_admin_manual_dismissed') === 'true';
        }

        modal.style.display = 'flex';
    };

    /**
     * Zavře modál administrátorské nápovědy a uloží preferenci "již nezobrazovat"
     */
    window.closeAdminManual = function() {
        const modal = document.getElementById('omega-manual-modal');
        const chk = document.getElementById('admin-manual-dont-show');

        if (chk && chk.checked) {
            localStorage.setItem('omega_admin_manual_dismissed', 'true');
        } else {
            localStorage.removeItem('omega_admin_manual_dismissed');
        }

        if (modal) modal.style.display = 'none';
    };

    // Zpětná kompatibilita pro původní volání z administrace
    window.openOmegaManual = function(isAuto = false) {
        window.openAdminManual(isAuto);
    };

    /**
     * Kontrola a případné automatické otevření studentského manuálu při načtení webu
     */
    window.checkStudentManualAutoOpen = function() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('admin') === 'true') return;

        const adminPortal = document.getElementById('omega-admin-portal');
        if (adminPortal && adminPortal.style.display === 'block') return;

        setTimeout(() => {
            window.openStudentManual(true);
        }, 400);
    };

    /**
     * Kontrola a případné automatické otevření administrátorského manuálu po přihlášení
     */
    window.checkAdminManualAutoOpen = function() {
        setTimeout(() => {
            window.openAdminManual(true);
        }, 250);
    };

    window.Omega.manual = {
        openStudent: window.openStudentManual,
        closeStudent: window.closeStudentManual,
        openAdmin: window.openAdminManual,
        closeAdmin: window.closeAdminManual,
        checkStudentAuto: window.checkStudentManualAutoOpen,
        checkAdminAuto: window.checkAdminManualAutoOpen
    };
})();
