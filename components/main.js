// DEPRECATED: components/main.js
// This file was superseded by /assets/js/main.js. To avoid accidental duplicate
// initialization and to keep backward compatibility for any stray references,
// this shim forwards initialization to the canonical script when available.

(function () {
    'use strict';
    function warnAndForward() {
        if (window._msr_components_shim_warned) return;
        window._msr_components_shim_warned = true;
        console.warn('Deprecated: components/main.js was replaced by /assets/js/main.js. Loading forwarded initialization if available.');

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