// FAQ Toggle
document.querySelectorAll('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
        const faq = button.parentElement;
        const isOpen = faq.classList.contains('active');

        // Close all FAQs
        document.querySelectorAll('.faq-item').forEach(item => item.classList.remove('active'));

        // Open current if it was closed
        if (!isOpen) {
            faq.classList.add('active');
        }
    });
});
