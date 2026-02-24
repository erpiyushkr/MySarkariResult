// DEPRECATED: assets/js/components.js
// This file was a compatibility copy of components/main.js. The canonical
// initializer is now /assets/js/main.js — keep this shim to avoid breaking
// any external references while the site migrates.

(function () {
    'use strict';
    function warnAndForward() {
        if (window._msr_components_shim_warned) return;
        window._msr_components_shim_warned = true;
        console.warn('Deprecated: assets/js/components.js was replaced by /assets/js/main.js. Forwarding initialization if available.');

        if (typeof window.initializeMobileMenu === 'function') {
            try { window.initializeMobileMenu(); } catch (e) { console.error(e); }
        }
        if (typeof window.initializeFAQ === 'function') {
            try { window.initializeFAQ(); } catch (e) { console.error(e); }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', warnAndForward);
    } else {
        setTimeout(warnAndForward, 0);
    }
})();
