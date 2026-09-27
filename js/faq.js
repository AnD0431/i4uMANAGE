// Tab FAQ: satu bahagian dipaparkan pada satu masa.
(() => {
    const faq = document.querySelector('#faq');
    if (!faq) return;

    const navigation = faq.querySelector('.faq-navigation');
    const tabs = [...navigation.querySelectorAll('a')];
    const panels = [...faq.querySelectorAll('.faq-group')];

    function activateTab(index, moveFocus = false) {
        tabs.forEach((tab, i) => {
            const active = i === index;
            tab.setAttribute('aria-selected', String(active));
            tab.tabIndex = active ? 0 : -1;
            panels[i].hidden = !active;
        });
        panels[index].scrollTop = 0;
        if (moveFocus) tabs[index].focus();
    }

    // Pautan biasa menjadi tab selepas JavaScript berjaya dimuatkan.
    navigation.setAttribute('role', 'tablist');
    navigation.setAttribute('aria-orientation', 'horizontal');
    tabs.forEach((tab, index) => {
        const panel = panels[index];
        tab.id = `faq-tab-${index}`;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', panel.id);
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tab.id);
        panel.tabIndex = 0;

        tab.addEventListener('click', event => {
            event.preventDefault();
            activateTab(index);
        });

        // Papan kekunci: anak panah kiri/kanan, Home dan End.
        tab.addEventListener('keydown', event => {
            let next;
            if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
            else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = tabs.length - 1;
            else if (event.key === ' ') next = index;
            else return;
            event.preventDefault();
            activateTab(next, true);
        });

        // Sokongan pelayar lama: tutup jawapan lain dalam bahagian ini.
        const questions = [...panel.querySelectorAll('details')];
        questions.forEach(question => {
            question.addEventListener('toggle', () => {
                if (!question.open) return;
                questions.forEach(other => {
                    if (other !== question) other.open = false;
                });
            });
        });
    });

    faq.classList.add('is-tabbed');
    const hashIndex = () => panels.findIndex(panel => `#${panel.id}` === window.location.hash);
    activateTab(Math.max(0, hashIndex()));
    window.addEventListener('hashchange', () => {
        const index = hashIndex();
        if (index >= 0) activateTab(index);
    });
})();
