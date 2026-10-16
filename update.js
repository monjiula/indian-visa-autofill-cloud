// Guaranteed fast and smooth version increment animation (1.6 to 10.0)
(function () {
    const counter = document.getElementById('versionCounter');
    if (!counter) return;

    let current = 1.6;
    const target = 10.0;
    const duration = 1200; // 1.2s total animation
    const startTime = performance.now();

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-out cubic formula
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentVal = (1.6 + (target - 1.6) * easeProgress);

        if (progress < 1) {
            counter.textContent = currentVal.toFixed(1);
            requestAnimationFrame(animate);
        } else {
            counter.textContent = '10.0';
            counter.style.transform = 'scale(1.15)';
            counter.style.color = '#4f46e5';
            setTimeout(() => {
                counter.style.transform = 'scale(1)';
            }, 250);
        }
    }

    // Start immediately without delay
    requestAnimationFrame(animate);
})();
