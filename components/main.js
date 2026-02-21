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

        // Close Menu on Scroll/Resize
        window.addEventListener('scroll', () => {
            const header = document.querySelector('./header.html');
            header.style.background = window.scrollY > 10 ? 'var(--primary-dark)' : 'var(--primary)';
            header.style.boxShadow = window.scrollY > 10 ? '0 4px 12px rgba(0,0,0,0.15)' : 'var(--shadow-md)';
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                nav.classList.remove('active');
                menuToggle.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeMobileMenu);

// Re-initialize after dynamic content load (if needed)
document.addEventListener('contentLoaded', initializeMobileMenu);