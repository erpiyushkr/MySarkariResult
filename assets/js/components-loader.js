/* components-loader.js
   Robust, idempotent loader for header/footer components.
   - Finds legacy containers (#header-container / #footer-container) or placeholders
     (#header-placeholder / #footer-placeholder).
   - Fetches component HTML and inserts it.
   - Ensures any <script> tags inside fetched HTML are executed.
   - Dispatches a 'headerLoaded' CustomEvent after header insertion.
*/
(function () {
    'use strict';

    if (window._msr_components_loader_installed) return;
    window._msr_components_loader_installed = true;

    function execInlineScripts(container) {
        // Find script tags inside container, clone them to the document so they execute
        const scripts = Array.from(container.querySelectorAll('script'));
        scripts.forEach(old => {
            const src = old.getAttribute('src');
            const type = old.getAttribute('type');
            if (src) {
                // External script: create a new script element
                const s = document.createElement('script');
                if (type) s.type = type;
                s.src = src;
                s.async = false; // preserve execution order
                document.head.appendChild(s);
            } else {
                // Inline script: evaluate in global scope
                try {
                    const code = old.textContent || old.innerText || '';
                    if (code.trim()) {
                        const s = document.createElement('script');
                        if (type) s.type = type;
                        s.text = code;
                        document.head.appendChild(s);
                    }
                } catch (err) {
                    console.error('components-loader inline script error', err);
                }
            }
        });
    }

    function insertHTML(targetEl, html) {
        // Use a temporary container to avoid losing scripts
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        // Move children into target
        while (tmp.firstElementChild) {
            targetEl.appendChild(tmp.firstElementChild);
        }
        // Execute any scripts found in the added node subtree
        execInlineScripts(targetEl);
    }

    function loadComponent(url, targetIds) {
        return fetch(url, { cache: 'no-cache' }).then(resp => {
            if (!resp.ok) throw new Error('Failed to fetch ' + url + ' - ' + resp.status);
            return resp.text();
        }).then(html => {
            for (const tid of targetIds) {
                const el = document.getElementById(tid);
                if (el) {
                    // Avoid double-inserting
                    if (el.getAttribute('data-msr-loaded') === url) return Promise.resolve(el);
                    insertHTML(el, html);
                    el.setAttribute('data-msr-loaded', url);
                    return Promise.resolve(el);
                }
            }
            return Promise.resolve(null);
        }).catch(err => {
            console.error('components-loader loadComponent error', err);
            return null;
        });
    }

    function run() {
        if (window._msr_components_loaded) return;
        window._msr_components_loaded = true;

        // Try header with legacy and placeholder IDs
        const headerTargets = ['header-placeholder', 'header-container'];
        const footerTargets = ['footer-placeholder', 'footer-container'];

        // Load header first, then footer
        loadComponent('/components/header.html', headerTargets).then(headerEl => {
            // Dispatch headerLoaded for initializers
            try {
                const ev = new CustomEvent('headerLoaded', { detail: { element: headerEl } });
                document.dispatchEvent(ev);
            } catch (err) {
                // fallback for older browsers
                const ev2 = document.createEvent('Event');
                ev2.initEvent('headerLoaded', true, true);
                document.dispatchEvent(ev2);
            }

            // Load footer after header
            loadComponent('/components/footer.html', footerTargets).then(() => {
                // no-op
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        setTimeout(run, 0);
    }

    // Expose run for manual invocation
    window.msrComponentsLoader = { run };

})();
