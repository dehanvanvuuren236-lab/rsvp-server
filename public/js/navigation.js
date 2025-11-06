// =========================
// Navigation JS
// =========================

// Get references to nav elements
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const mainNav = document.querySelector('.main-nav');

// Toggle mobile nav open/close
navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navLinks.classList.toggle('show');
});

// Close menu when a nav link is clicked
navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navLinks.classList.remove('show');
    });
});

// Fade-in nav on scroll
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) mainNav.classList.add('visible');
    else mainNav.classList.remove('visible');
});

// Smooth scrolling for internal links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            window.scrollTo({
                top: target.offsetTop - 60,
                behavior: 'smooth'
            });
        }
        // Close mobile menu after navigation
        navToggle.classList.remove('active');
        navLinks.classList.remove('show');
    });
});
