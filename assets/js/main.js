// assets/js/main.js
// Canonical initializer for mobile menu and FAQ across the site.
// Provides idempotent initializeMobileMenu() and initializeFAQ() functions
// and automatically initializes on DOMContentLoaded and custom contentLoaded events.

(function () {
    'use strict';

    function initializeMobileMenu() {
        // Idempotency guard: avoid attaching duplicate event listeners
        if (window._msr_mobile_initialized) return;
        window._msr_mobile_initialized = true;

        const menuToggle = document.getElementById('msr-unique-toggle');
        const nav = document.getElementById('msr-unique-nav');

        if (!menuToggle || !nav) return;

        // Toggle Menu
        menuToggle.addEventListener('click', () => {
            const open = nav.classList.toggle('active');
            menuToggle.classList.toggle('active', open);
            // Prevent background scroll when menu is open
            document.body.style.overflow = open ? 'hidden' : '';
        });

        // Close Menu on Link Click (Mobile)
        document.querySelectorAll('#msr-unique-nav a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    nav.classList.remove('active');
                    menuToggle.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });

        // Close Menu on Resize (when switching to desktop)
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                nav.classList.remove('active');
                menuToggle.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    function initializeFAQ() {
        // Prevent double-initialization
        if (document._msr_faq_initialized) return;
        document._msr_faq_initialized = true;

        // Event delegation for FAQ toggling
        document.addEventListener('click', (e) => {
            const question = e.target.closest && e.target.closest('.faq-question');
            if (!question) return;
            const faqItem = question.closest('.faq-item');
            if (!faqItem) return;

            faqItem.classList.toggle('active');
            // Accordion behaviour: close other items
            document.querySelectorAll('.faq-item').forEach(item => {
                if (item !== faqItem) item.classList.remove('active');
            });
        });
    }

    // Expose functions for compatibility (so any remaining inline code won't break)
    window.initializeMobileMenu = initializeMobileMenu;
    window.initializeFAQ = initializeFAQ;

    function initAll() {
        try {
            initializeMobileMenu();
        } catch (err) {
            console.error('initializeMobileMenu error', err);
        }
        try {
            initializeFAQ();
        } catch (err) {
            console.error('initializeFAQ error', err);
        }
    }

    // Standard DOM ready init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        // If DOM already parsed, run immediately
        setTimeout(initAll, 0);
    }

    // Support custom dynamic content load events used in the site
    document.addEventListener('contentLoaded', initAll);

})();
