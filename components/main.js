// components/main.js

// Initialize Mobile Menu
function initializeMobileMenu() {
    const menuToggle = document.getElementById('msr-unique-toggle');
    const nav = document.getElementById('msr-unique-nav');

    if (menuToggle && nav) {
        // Toggle Menu
        menuToggle.addEventListener('click', () => {
            nav.classList.toggle('active');
            menuToggle.classList.toggle('active');
            document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
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

        // Scroll handler removed – no dynamic header style changes (prevents layout thrash)
    }
}

// FAQ Toggle (ensures smooth interaction)
function initializeFAQ() {
    // Prevent double-initialization
    if (document._msr_faq_initialized) return;
    document._msr_faq_initialized = true;

    // Use event delegation to avoid multiple listeners and to support dynamic content
    document.addEventListener('click', (e) => {
        const question = e.target.closest && e.target.closest('.faq-question');
        if (!question) return;
        const faqItem = question.closest('.faq-item');
        if (!faqItem) return;

        faqItem.classList.toggle('active');
        // Close other items (accordion behaviour) — keep interface compact
        document.querySelectorAll('.faq-item').forEach(item => {
            if (item !== faqItem) item.classList.remove('active');
        });
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeMobileMenu();
    initializeFAQ();
});

// Re-initialize after dynamic content load (if needed)
document.addEventListener('contentLoaded', () => {
    initializeMobileMenu();
    initializeFAQ();
});