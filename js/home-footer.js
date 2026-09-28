// Open the requested FAQ tab before scrolling to it (hidden panels have no position).
(() => {
    const footer = document.querySelector('.home-site-footer');
    const faq = document.querySelector('#faq');
    if (!footer || !faq) return;

    footer.querySelectorAll('a[href^="#faq-"]').forEach(link => {
        link.addEventListener('click', event => {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            const target = link.getAttribute('href');
            const tab = [...faq.querySelectorAll('.faq-navigation a')]
                .find(item => item.getAttribute('href') === target);
            if (!tab || tab.getAttribute('role') !== 'tab') return;
            event.preventDefault();
            tab.click();
            tab.focus({ preventScroll: true });
            faq.scrollIntoView({ block: 'start' });
        });
    });
})();
