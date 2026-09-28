// Reserve the actual fixed navbar height after resizing or changing language.
(() => {
    const navbar = document.querySelector('.site-navbar');
    if (!navbar) return;

    const syncHeight = () => {
        document.body.style.setProperty('--site-navbar-height', `${Math.ceil(navbar.getBoundingClientRect().height)}px`);
    };

    syncHeight();
    if ('ResizeObserver' in window) {
        new ResizeObserver(syncHeight).observe(navbar);
    } else {
        window.addEventListener('resize', syncHeight);
        new MutationObserver(syncHeight).observe(navbar, { childList: true, subtree: true });
    }
    if (document.fonts) document.fonts.ready.then(syncHeight);
})();
