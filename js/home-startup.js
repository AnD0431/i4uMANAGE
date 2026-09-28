// Jalankan dalam <head>, sebelum pelayar menemui sasaran pautan #faq.
(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    // Kekalkan tingkah laku Back/Forward; reset hanya pada buka semula/refresh.
    if (navigation?.type === 'back_forward') return;

    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }

    // Buang anchor lama tanpa reload, sambil mengekalkan query dan history state.
    if (window.location.hash) {
        history.replaceState(history.state, '', window.location.pathname + window.location.search);
    }

    const scrollToTop = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    };

    scrollToTop();
    window.addEventListener('pageshow', event => {
        if (!event.persisted) scrollToTop();
    });
    window.addEventListener('pagehide', () => {
        // Benarkan pemulihan skrol apabila kembali melalui Back/Forward.
        if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
    });
})();
