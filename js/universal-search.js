(function (root) {
    'use strict';
    const core = root.SarahUniversalCore;
    const el = (tag, text, cls) => {const node = document.createElement(tag);if (text !== undefined) node.textContent = text;if (cls) node.className = cls;return node;};
    async function search(input, signal) {
        core.parse(input);
        const controller = new AbortController();
        const abort = () => controller.abort();
        if (signal?.aborted) abort();else signal?.addEventListener('abort', abort, {once: true});
        const timer = setTimeout(abort, 18000);
        try {
            const response = await fetch('/api/universal-search', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(input), signal: controller.signal, cache: 'no-store'});
            const data = await response.json();
            if (!response.ok || data.success !== true || !Array.isArray(data.results)) throw new Error(data.error || 'Carian tidak dapat diselesaikan. Cuba semula.');
            return data;
        } catch (error) {if (controller.signal.aborted) throw new Error('Carian dihentikan atau tamat masa. Sila cuba semula.');throw error;}
        finally {clearTimeout(timer);signal?.removeEventListener('abort', abort);}
    }
    function coverage(data) {
        const notes = [];
        if (data.sources.catalog !== 'ready') notes.push(data.sources.catalog === 'disabled' ? 'Katalog dokumen belum dikonfigurasi.' : 'Sebahagian katalog dokumen tidak dapat dicapai.');
        if (data.sources.rag !== 'ready') notes.push(data.sources.rag === 'disabled' ? 'Carian isi dokumen RAG belum dikonfigurasi.' : 'Indeks kandungan RAG tidak dapat dicapai.');
        notes.push('Portal rasmi ialah pautan dalam direktori, bukan carian web langsung.');
        return notes.join(' ');
    }
    function renderInto(target, data) {
        target.replaceChildren();
        target.appendChild(el('p', `${data.total} hasil untuk “${data.query || core.types[data.filters.type] || 'penapis dipilih'}”`, 'universal-count'));
        target.appendChild(el('p', coverage(data), 'universal-coverage'));
        if (!data.results.length) {target.appendChild(el('p', 'Tiada padanan dalam sumber yang berjaya dicari. Cuba kata kunci lebih ringkas, ejaan lain atau buang penapis.', 'universal-empty'));return;}
        const grid = el('div', undefined, 'universal-results-grid');
        for (const item of data.results) {
            const url = core.safeUrl(item.url);if (!url) continue;
            const card = el('article', undefined, 'universal-result');
            card.appendChild(el('p', [core.types[item.type], item.year, item.approximate ? 'Padanan hampir' : ''].filter(Boolean).join(' · '), 'universal-result-meta'));
            const heading = el('h3'), link = el('a', item.title);link.href = url;link.target = '_blank';link.rel = 'noopener noreferrer';heading.appendChild(link);card.appendChild(heading);
            if (item.snippet) card.appendChild(el('p', item.snippet, 'universal-snippet'));
            card.appendChild(el('p', [item.match, item.location, item.origin].filter(Boolean).join(' · '), 'universal-result-source'));
            card.appendChild(el('span', new URL(url).hostname, 'universal-domain'));grid.appendChild(card);
        }
        target.appendChild(grid);
    }
    let dialog, form, queryInput, typeInput, categoryInput, yearInput, results, status, previous, next, submit, active, opener, lastInput, page = 0;
    function select(label, values) {
        const wrapper = el('label', label), input = el('select');input.setAttribute('aria-label', label);
        for (const [value, name] of Object.entries(values)) {const option = el('option', name);option.value = value;input.appendChild(option);}
        wrapper.appendChild(input);return {wrapper, input};
    }
    function close() {if (dialog?.open) dialog.close();}
    function init() {
        if (dialog) return;
        dialog = el('dialog', undefined, 'universal-dialog');dialog.setAttribute('aria-labelledby', 'universal-title');
        const header = el('header', undefined, 'universal-header'), title = el('div');
        title.appendChild(el('p', 'SARAH · i4uManage', 'universal-eyebrow'));const h = el('h2', 'Universal Smart Search');h.id = 'universal-title';
        title.append(h, el('p', 'Cari dokumen, petikan kandungan dan portal rasmi dalam satu tempat.'));
        const dismiss = el('button', 'Tutup');dismiss.type = 'button';dismiss.addEventListener('click', close);header.append(title, dismiss);
        form = el('form', undefined, 'universal-form');
        const queryLabel = el('label', 'Kata kunci atau ayat carian');queryInput = el('input');queryInput.type = 'search';queryInput.maxLength = 300;queryInput.placeholder = 'Contoh: cari slaid latihan 2025';queryLabel.appendChild(queryInput);
        submit = el('button', 'Cari');submit.type = 'submit';submit.className = 'universal-submit';
        const row = el('div', undefined, 'universal-query-row');row.append(queryLabel, submit);form.appendChild(row);
        const filters = el('div', undefined, 'universal-filters');
        const type = select('Sumber', {all: 'Semua sumber', ...core.types});typeInput = type.input;
        const category = select('Kategori dokumen', {'': 'Semua kategori', ...core.categories});categoryInput = category.input;
        const yearLabel = el('label', 'Tahun dokumen');yearInput = el('input');yearInput.type = 'number';yearInput.min = '2000';yearInput.max = '2100';yearInput.placeholder = 'Semua tahun';yearLabel.appendChild(yearInput);
        filters.append(type.wrapper, category.wrapper, yearLabel);form.appendChild(filters);
        const examples = el('div', undefined, 'universal-examples');
        for (const q of ['AKD', 'slaid latihan', 'kertas kerja kursus', 'pekeliling cuti', 'portal JDN']) {
            const b = el('button', q);b.type = 'button';b.addEventListener('click', () => {queryInput.value = q;typeInput.value = 'all';categoryInput.value = yearInput.value = '';run(0);});examples.appendChild(b);
        }
        form.appendChild(examples);
        status = el('p', 'Masukkan carian atau pilih contoh di atas.', 'universal-status');status.setAttribute('role', 'status');status.setAttribute('aria-live', 'polite');
        results = el('div', undefined, 'universal-results');results.tabIndex = -1;
        const footer = el('footer', undefined, 'universal-footer');previous = el('button', 'Sebelum');next = el('button', 'Seterusnya');previous.type = next.type = 'button';previous.disabled = next.disabled = true;
        previous.addEventListener('click', () => run(page - 1, lastInput));next.addEventListener('click', () => run(page + 1, lastInput));footer.append(previous, next);
        dialog.append(header, form, status, results, footer);document.body.appendChild(dialog);
        form.addEventListener('submit', e => {e.preventDefault();run(0);});
        for (const control of [typeInput, categoryInput, yearInput]) control.addEventListener('change', () => {if (lastInput) run(0);});
        dialog.addEventListener('close', () => {active?.abort();active = null;submit.disabled = false;results.removeAttribute('aria-busy');if (opener?.isConnected) opener.focus({preventScroll: true});});
    }
    async function run(targetPage, saved) {
        const input = {...(saved || {q: queryInput.value, type: typeInput.value, category: categoryInput.value, year: yearInput.value}), page: targetPage};
        active?.abort();active = null;submit.disabled = false;results.removeAttribute('aria-busy');
        previous.disabled = next.disabled = true;
        try {core.parse(input);} catch (error) {status.textContent = error.message;results.replaceChildren();lastInput = null;return;}
        const controller = new AbortController();active = controller;
        status.textContent = 'Sarah sedang mencari merentas sumber…';results.setAttribute('aria-busy', 'true');submit.disabled = true;previous.disabled = next.disabled = true;
        results.replaceChildren();
        try {
            const data = await search(input, controller.signal);if (active !== controller || !dialog.open) return;
            page = targetPage;lastInput = input;typeInput.value = data.filters.type;yearInput.value = data.filters.year;
            renderInto(results, data);results.scrollTop = 0;
            status.textContent = `${data.total} hasil · Halaman ${page + 1}${data.results.some(r => r.approximate) ? ' · Termasuk padanan ejaan hampir' : ''}`;
            previous.disabled = page === 0;next.disabled = !data.hasMore;
        } catch (error) {if (active === controller && dialog.open) {status.textContent = error.message || 'Carian gagal. Sila cuba semula.';results.replaceChildren();}}
        finally {if (active === controller) {active = null;submit.disabled = false;results.removeAttribute('aria-busy');}}
    }
    function open(query = '') {
        init();if (!dialog.open) {opener = document.activeElement;dialog.showModal();}
        queryInput.focus();
        if (query) {queryInput.value = query;typeInput.value = 'all';categoryInput.value = yearInput.value = '';run(0);}
    }
    root.SarahUniversalSearch = Object.freeze({open, search, renderInto});
})(globalThis);
