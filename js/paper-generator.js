(function () {
    'use strict';
    const core = globalThis.SarahPaperCore, exporter = globalThis.SarahPaperExport;
    if (!core || !exporter) return;
    const STORAGE = 'i4u-sarah-paper-v2';
    let dialog, form, step = 0, narrative = null, generatedForm = '', previous = null, controller = null, returnFocus;
    let status, preview, editor, progress, total, panels, next, back, word, pdf, undo, regenerate;
    const $ = selector => dialog.querySelector(selector);
    function node(tag, text, className) { const el = document.createElement(tag); if (text) el.textContent = text; if (className) el.className = className; return el; }
    function button(text, action, className = '') { const el = node('button', text, className); el.type = 'button'; el.addEventListener('click', action); return el; }
    function notice(text, error = false) { status.textContent = text; status.classList.toggle('is-error', error); }
    function read() {
        const data = Object.fromEntries(core.fields.map(f => [f.key, form.elements[f.key].value]));
        data.hasBudget = form.elements.hasBudget.value === 'yes';
        data.costs = [...$('.paper-cost-rows').children].map(row => Object.fromEntries([...row.querySelectorAll('input')].map(input => [input.dataset.key, input.value])));
        return data;
    }
    function fingerprint(data) { return JSON.stringify(core.validate(data).value); }
    function currentBlocks() { return core.blocks(read(), narrative); }
    function refresh() {
        const raw = read(), checked = core.validate(raw);
        let cents = 0, validCosts = true;
        try {
            const rows = raw.hasBudget ? core.budget(raw.costs) : [];
            rows.forEach((row, i) => { $('.paper-cost-rows').children[i].querySelector('output').textContent = 'RM' + core.money(row.totalCents); });
            cents = rows.reduce((sum, r) => sum + r.totalCents, 0);
        } catch { validCosts = false; for (const row of $('.paper-cost-rows').children) row.querySelector('output').textContent = 'Semak nilai'; }
        total.textContent = validCosts ? `Jumlah anggaran: RM${core.money(cents)}` : 'Jumlah anggaran: semak nilai bajet';
        $('.paper-budget-fields').hidden = !raw.hasBudget;
        form.elements.funding.closest('label').hidden = !raw.hasBudget;
        form.elements.pol.closest('label').hidden = !raw.hasBudget;
        const stale = narrative && generatedForm !== fingerprint(raw);
        let ready = !checked.issues.length && !!narrative && !stale;
        if (ready) { try { core.validateNarrative(narrative); } catch { ready = false; } }
        word.disabled = pdf.disabled = !ready || !!controller;
        undo.disabled = !previous || !!controller;
        regenerate.disabled = !!controller;
        if (step === 3) {
            if (ready) preview.innerHTML = exporter.html(currentBlocks());
            else preview.textContent = stale ? 'Maklumat program telah berubah. Jana semula draf supaya huraian sepadan sebelum eksport.' : 'Lengkapkan maklumat dan huraian draf untuk melihat pratonton.';
        }
        progress.textContent = `${core.fields.filter(f => f.required && raw[f.key].trim()).length} / ${core.fields.filter(f => f.required).length} maklumat wajib diisi`;
    }
    function setStep(index) {
        step = index;
        panels.forEach((panel, i) => panel.hidden = i !== index);
        dialog.querySelectorAll('.paper-step').forEach((tab, i) => {tab.setAttribute('aria-current', i === index ? 'step' : 'false'); tab.disabled = !!controller || (i === 3 && !narrative);});
        back.hidden = index === 0; back.disabled = !!controller;
        next.hidden = index === 3; next.textContent = index === 2 ? 'Jana draf dengan Sarah' : 'Seterusnya';
        $('.paper-export-actions').hidden = index !== 3;
        $('.paper-dialog-body').scrollTop = 0;
        refresh();
        panels[index].querySelector('h3')?.focus();
    }
    function showIssues(issues) {
        for (const el of form.querySelectorAll('[aria-invalid]')) el.removeAttribute('aria-invalid');
        for (const issue of issues) form.elements[issue.key]?.setAttribute('aria-invalid', 'true');
        setStep(issues[0].step);
        notice(issues.map(i => i.message).join(' '), true);
        (form.elements[issues[0].key] || $('.paper-cost-rows input'))?.focus();
    }
    function costRow(data = {item: '', quantity: '1', multiplier: '1', rate: ''}) {
        const row = node('div', '', 'paper-cost-row');
        for (const [key, label] of [['item', 'Perkara'], ['quantity', 'Kuantiti'], ['multiplier', 'Kekerapan / hari'], ['rate', 'Kadar seunit (RM)']]) {
            const wrapper = node('label', label), input = node('input'); input.dataset.key = key; input.value = String(data[key] ?? '');
            input.type = key === 'item' ? 'text' : 'number';input.maxLength = key === 'item' ? 200 : 10;
            if (key !== 'item') {input.min = key === 'rate' ? '0' : '1';input.step = key === 'rate' ? '0.01' : '1';input.max = key === 'rate' ? '100000' : key === 'quantity' ? '10000' : '365';}
            wrapper.appendChild(input);row.appendChild(wrapper);
        }
        const value = node('output', 'RM0.00'); row.appendChild(value);
        row.appendChild(button('Buang', () => {row.remove();refresh();}, 'paper-remove'));
        $('.paper-cost-rows').appendChild(row);
    }
    function renderEditor() {
        editor.replaceChildren();
        for (const [key, label] of core.narrativeFields) {
            const wrapper = node('label', label), input = node('textarea');input.value = narrative[key];input.maxLength = 6000;input.rows = key === 'background' ? 6 : 4;
            input.addEventListener('input', () => {narrative[key] = input.value;refresh();});wrapper.appendChild(input);editor.appendChild(wrapper);
        }
    }
    function busy(active) {
        dialog.setAttribute('aria-busy', String(active));
        for (const control of dialog.querySelectorAll('input, textarea, select, button')) control.disabled = active;
        $('#paper-close').disabled = false;
        $('#paper-cancel-generation').hidden = !active; $('#paper-cancel-generation').disabled = false;
        if (!active) setStep(step);
    }
    async function generate() {
        if (controller) return;
        const checked = core.validate(read());
        if (checked.issues.length) return showIssues(checked.issues);
        const requestForm = checked.value;
        controller = new AbortController(); const active = controller;
        const timeout = setTimeout(() => active.abort('timeout'), 58000);
        busy(true);notice('Sarah sedang menyediakan huraian kertas kerja. Maklumat dan bajet anda dikekalkan.');
        try {
            const response = await fetch('/api/generate-paper', {method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({form: requestForm}), signal: active.signal, cache: 'no-store'});
            let data;try {data = await response.json();} catch {throw new Error('Respons server tidak lengkap. Borang anda masih ada; cuba semula.');}
            if (!response.ok) throw new Error(data.error?.message || 'Draf belum dapat dijana. Cuba semula sebentar.');
            const fresh = core.validateNarrative(data.narrative);
            previous = null;
            if (narrative && generatedForm) {
                try {
                    const oldForm = JSON.parse(generatedForm);
                    if (!core.validate(oldForm).issues.length) previous = {form: oldForm, narrative: {...narrative}, generatedForm};
                } catch { /* A damaged saved fingerprint must not prevent a fresh generation. */ }
            }
            narrative = fresh;generatedForm = fingerprint(requestForm);renderEditor();
            notice('Draf siap. Semak fakta dan sunting huraian sebelum muat turun.');
            step = 3;
        } catch (error) {
            notice(active.signal.aborted ? 'Penjanaan dihentikan atau tamat masa. Borang dan draf terdahulu masih ada.' : error.message, true);
        } finally {clearTimeout(timeout);controller = null;busy(false);}
    }
    function fill(data) {
        for (const field of core.fields) form.elements[field.key].value = typeof data?.[field.key] === 'string' ? data[field.key].slice(0, field.max) : '';
        form.elements.hasBudget.value = data?.hasBudget === false ? 'no' : 'yes';
        $('.paper-cost-rows').replaceChildren();
        for (const cost of (Array.isArray(data?.costs) ? data.costs.slice(0, 20) : [{}])) costRow(cost);
    }
    function save() {
        try {
            localStorage.setItem(STORAGE, JSON.stringify({version: 2, form: read(), narrative, generatedForm, savedAt: new Date().toISOString()}));
            notice('Draf disimpan pada pelayar peranti ini. Tekan Simpan lagi selepas membuat perubahan.');
        } catch {notice('Pelayar tidak membenarkan simpanan draf atau ruang penuh. Maklumat masih ada dalam tetingkap ini.', true);}
    }
    function restore() {
        try {
            const raw = localStorage.getItem(STORAGE);if (!raw) return;
            if (raw.length > 100000) throw new Error();
            const data = JSON.parse(raw);if (data.version !== 2 || !data.form || typeof data.form !== 'object') throw new Error();
            fill(data.form);
            if (data.narrative) {
                narrative = core.validateNarrative(data.narrative);generatedForm = '';
                try {
                    const savedForm = JSON.parse(data.generatedForm);
                    if (!core.validate(savedForm).issues.length) generatedForm = fingerprint(savedForm);
                } catch { /* Require regeneration when the saved form fingerprint is damaged. */ }
                renderEditor();
            }
            notice('Draf tersimpan dimuatkan. Semak maklumat sebelum meneruskan.');
        } catch {notice('Draf tersimpan tidak dapat dibaca. Anda boleh mengisi borang baharu.', true);}
    }
    function build() {
        dialog = node('dialog', '', 'paper-generator');dialog.setAttribute('aria-labelledby', 'paper-generator-title');
        const header = node('header', '', 'paper-dialog-header');
        const brand = node('div');brand.appendChild(node('p', 'SARAH · i4uManage', 'paper-eyebrow'));
        const title = node('h2', 'AI Document Generator 2.0');title.id = 'paper-generator-title';brand.appendChild(title);
        brand.appendChild(node('p', 'Kertas kerja JKNT · Isi maklumat, semak draf, kemudian eksport.'));
        const close = button('Tutup', () => dialog.close());close.id = 'paper-close';header.append(brand, close);dialog.appendChild(header);
        const nav = node('nav', '', 'paper-steps');nav.setAttribute('aria-label', 'Langkah penjanaan');
        ['Program', 'Pelaksanaan', 'Bajet', 'Semak draf'].forEach((label, index) => {
            const tab = button(`${index + 1}. ${label}`, () => {
                const issues = core.validate(read()).issues.filter(i => i.step < index);
                if (index > step && issues.length) return showIssues(issues);
                setStep(index);
            }, 'paper-step');nav.appendChild(tab);
        });dialog.appendChild(nav);
        const body = node('div', '', 'paper-dialog-body');form = node('form');form.noValidate = true;
        form.addEventListener('submit', e => {e.preventDefault();if (step < 2) next.click();else if (step === 2) generate();});
        panels = ['Maklumat program', 'Pasukan dan peserta', 'Peruntukan dan bajet', 'Sunting dan semak draf'].map(title => {
            const section = node('section', '', 'paper-panel');const h3 = node('h3', title);h3.tabIndex = -1;section.appendChild(h3);form.appendChild(section);return section;
        });
        for (let i = 0; i < 3; i++) panels[i].appendChild(node('div', '', 'paper-fields'));
        for (const field of core.fields) {
            const wrapper = node('label', field.label + (field.required ? ' *' : ''));
            let input;
            if (field.key === 'pol') {
                input = node('select');for (const text of ['', 'Ya', 'Tidak', 'Belum ditentukan']) {const option = node('option', text || 'Pilih status');option.value = text;input.appendChild(option);}
            } else if (field.max > 400) {input = node('textarea');input.rows = 3;wrapper.className = 'paper-wide';}
            else {input = node('input');input.type = ['date', 'endDate'].includes(field.key) ? 'date' : field.key === 'time' ? 'time' : field.key === 'participants' ? 'number' : 'text';}
            input.name = field.key;input.id = `paper-${field.key}`;input.required = field.required;input.maxLength = field.max;
            if (field.key === 'participants') {input.min = '1';input.max = '100000';input.step = '1';}
            wrapper.appendChild(input);panels[field.step].querySelector('.paper-fields').appendChild(wrapper);
        }
        const financeLabel = node('label', 'Adakah program melibatkan perbelanjaan?');const finance = node('select');finance.name = 'hasBudget';
        for (const [value, label] of [['yes', 'Ya — isi anggaran bajet'], ['no', 'Tidak — tanpa implikasi kewangan']]) {const option = node('option', label);option.value = value;finance.appendChild(option);}
        financeLabel.appendChild(finance);panels[2].insertBefore(financeLabel, panels[2].querySelector('.paper-fields'));
        const budget = node('div', '', 'paper-budget-fields');budget.appendChild(node('p', 'Jumlah = kuantiti × kekerapan/hari × kadar. Anggaran pengguna; bukan pengesahan kadar elaun.'));
        budget.appendChild(node('div', '', 'paper-cost-rows'));
        budget.appendChild(button('+ Tambah perkara', () => {if ($('.paper-cost-rows').children.length >= 20) return notice('Maksimum 20 perkara bajet.', true);costRow();refresh();}));
        panels[2].appendChild(budget);total = node('p', 'Jumlah anggaran: RM0.00', 'paper-total');total.setAttribute('aria-live', 'polite');panels[2].appendChild(total);
        const review = node('div', '', 'paper-review');editor = node('div', '', 'paper-editor');preview = node('article', '', 'paper-preview');preview.setAttribute('aria-label', 'Pratonton kertas kerja');review.append(editor, preview);panels[3].appendChild(review);
        panels[3].insertBefore(node('p', 'DRAF UNTUK SEMAKAN · Huraian boleh disunting. Untuk mengubah fakta atau bajet, kembali ke borang dan jana semula.', 'paper-draft-note'), review);
        body.appendChild(form);dialog.appendChild(body);
        const footer = node('footer', '', 'paper-dialog-footer');progress = node('p', '', 'paper-progress');status = node('p', '', 'paper-status');status.setAttribute('role', 'status');status.setAttribute('aria-live', 'polite');footer.append(progress, status);
        const actions = node('div', '', 'paper-actions');back = button('Kembali', () => setStep(Math.max(0, step - 1)));
        const saveButton = button('Simpan draf', save);saveButton.title = 'Simpan pada pelayar peranti ini sahaja';
        next = button('Seterusnya', () => {const issues = core.validate(read()).issues.filter(i => i.step <= step);if (issues.length) return showIssues(issues);if (step === 2) generate();else setStep(step + 1);}, 'paper-primary');
        const cancel = button('Hentikan penjanaan', () => controller?.abort());cancel.id = 'paper-cancel-generation';cancel.hidden = true;
        const exportActions = node('div', '', 'paper-export-actions');
        word = button('Muat turun Word', async () => {
            word.disabled = true;try {exporter.download(await exporter.docxBlob(currentBlocks()), core.filename(read().title) + '.docx');notice('Fail Word telah disediakan.');} catch (error) {notice(error.message, true);} finally {refresh();}
        }, 'paper-primary');
        pdf = button('Cetak / PDF', () => {try {exporter.printDocument(currentBlocks(), read().title);notice('Dalam tetingkap cetakan, klik Cetak / Simpan sebagai PDF dan pilih Save as PDF.');} catch (error) {notice(error.message, true);}});
        undo = button('Pulihkan versi sebelum jana semula', () => {if (!previous) return;fill(previous.form);narrative = previous.narrative;generatedForm = previous.generatedForm;previous = null;renderEditor();setStep(3);notice('Versi terdahulu dipulihkan.');});
        regenerate = button('Jana semula', generate);
        exportActions.append(regenerate, undo, word, pdf);actions.append(back, saveButton, cancel, next, exportActions);footer.appendChild(actions);
        const storageNote = node('div', '', 'paper-storage-note');storageNote.appendChild(node('span', 'Simpanan draf hanya pada pelayar ini. '));
        storageNote.appendChild(button('Padam simpanan peranti', () => {try {localStorage.removeItem(STORAGE);notice('Simpanan peranti dipadam. Draf yang sedang dibuka masih ada.');} catch {notice('Simpanan tidak dapat dipadam.', true);}}));footer.appendChild(storageNote);dialog.appendChild(footer);
        form.addEventListener('input', () => {notice('');refresh();});form.addEventListener('change', refresh);
        dialog.addEventListener('close', () => {controller?.abort();returnFocus?.focus();});
        document.body.appendChild(dialog);costRow();restore();setStep(0);
    }
    globalThis.SarahPaperGenerator = {open() {
        returnFocus = document.activeElement;
        if (!dialog) build();
        if (!dialog.open) dialog.showModal();
        if (!controller) setStep(step);
    }};
})();
