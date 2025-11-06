document.querySelectorAll('.accommodation-card').forEach(card => {
    const slider = card.querySelector('.accommodation-slider');
    const images = slider.querySelectorAll('img');
    const prevBtn = card.querySelector('.prev');
    const nextBtn = card.querySelector('.next');
    const dotsContainer = card.querySelector('.slider-dots');
    let currentIndex = 0;
    let startX = 0;
    let isSwiping = false;

    // Create indicator dots
    images.forEach((_, i) => {
        const dot = document.createElement('span');
        if (i === 0) dot.classList.add('active');
        dotsContainer.appendChild(dot);
    });
    const dots = dotsContainer.querySelectorAll('span');

    function updateSlider() {
        slider.style.transform = `translateX(-${currentIndex * 100}%)`;
        dots.forEach(dot => dot.classList.remove('active'));
        dots[currentIndex].classList.add('active');
    }

    // Arrow buttons (desktop)
    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + images.length) % images.length;
            updateSlider();
        });

        nextBtn.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % images.length;
            updateSlider();
        });
    }

    // Swipe gestures
    slider.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        isSwiping = true;
    });

    slider.addEventListener('touchmove', e => {
        if (!isSwiping) return;
        e.preventDefault();
    }, { passive: false });

    slider.addEventListener('touchend', e => {
        if (!isSwiping) return;
        const endX = e.changedTouches[0].clientX;
        const diff = startX - endX;

        if (diff > 50) {
            currentIndex = (currentIndex + 1) % images.length;
        } else if (diff < -50) {
            currentIndex = (currentIndex - 1 + images.length) % images.length;
        }
        updateSlider();
        isSwiping = false;
    });
});
