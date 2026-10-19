(function (root) {
    'use strict';
    const core = root.SarahAnalyzerCore;
    let dialog, status, input, info, body, tabs, panels, sourceSelect, sourceText, question, ask, analyze, download, cancel;
    let doc = null, warnings = [], analysis = null, history = [], active = null, returnFocus;
    const el = (tag, text, cls) => {const n = document.createElement(tag);if (text) n.textContent = text;if (cls) n.className = cls;return n;};
    const button = (text, action, cls) => {const b = el('button', text, cls);b.type = 'button';b.addEventListener('click', action);return b;};
    function notice(message, error = false) {status.textContent = message;status.classList.toggle('is-error', error);}
    function refresh() {
        analyze.disabled = !doc || !!active;ask.disabled = !doc || !!active || !question.value.trim();
        download.disabled = !!active || (!analysis && !history.length);
        input.disabled = question.disabled = !!active;cancel.hidden = !active;
        dialog.querySelector('.analyzer-clear').disabled = !!active || !doc;
        dialog.setAttribute('aria-busy', String(!!active));
    }
    function tab(index) {
        panels.forEach((p, i) => p.hidden = i !== index);tabs.forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));
        body.scrollTop = 0;panels[index].querySelector('h3').focus({preventScroll: true});
    }
    function reset(clearInput = true) {
        doc = analysis = null;history = [];warnings = [];if (clearInput) input.value = '';question.value = '';info.replaceChildren();
        panels[0].querySelector('.analyzer-summary').replaceChildren(el('p', 'Pilih dokumen, semak teks sumber dan tekan Analisis dokumen.'));
        panels[1].querySelector('.analyzer-answers').replaceChildren();sourceSelect.replaceChildren();sourceText.textContent = '';
        notice('');refresh();
    }
    function showUnit(id) {const unit = doc?.units.find(u => u.id === id);sourceText.textContent = unit?.text || '';}
    function source(evidence) {sourceSelect.value = evidence.unitId;showUnit(evidence.unitId);tab(2);}
    function claims(items, target) {
        for (const item of items) {
            const card = el('div', '', 'analyzer-claim');card.appendChild(el('p', item.text));
            for (const evidence of item.evidence) {
                const detail = el('details'), summary = el('summary', evidence.location);
                detail.append(summary, el('blockquote', evidence.quote), button('Lihat teks sumber', () => source(evidence)));
                card.appendChild(detail);
            }
            target.appendChild(card);
        }
    }
    function render() {
        const summary = panels[0].querySelector('.analyzer-summary');summary.replaceChildren();
        if (analysis) {claims(analysis.summary, summary);summary.appendChild(el('h4', 'Isi penting'));claims(analysis.points, summary);}
        else summary.appendChild(el('p', 'Dokumen sedia dibaca. Tekan Analisis dokumen untuk ringkasan dan isi penting.'));
        const answers = panels[1].querySelector('.analyzer-answers');answers.replaceChildren();
        for (const entry of [...history].reverse()) {
            const section = el('section', '', 'analyzer-answer');section.appendChild(el('h4', entry.question));
            if (entry.result.notFound) section.appendChild(el('p', 'Maklumat tidak ditemui dalam teks dokumen. Cuba soalan yang lebih khusus.'));
            else claims(entry.result.answer, section);
            answers.appendChild(section);
        }
    }
    async function load(file) {
        if (active || !file) return;
        reset(false);const controller = new AbortController();active = controller;refresh();
        notice('Membaca fail pada peranti…');
        const timeout = setTimeout(() => controller.abort(), 75000);
        try {
            const result = await root.SarahAnalyzerReader.read(file, controller.signal, notice);
            controller.signal.throwIfAborted();doc = result.document;warnings = result.warnings;
            info.appendChild(el('strong', doc.name));info.appendChild(el('p', `${doc.units.length} bahagian teks · ${doc.units.reduce((s, u) => s + u.text.length, 0).toLocaleString('ms-MY')} aksara`));
            for (const warning of warnings) info.appendChild(el('p', warning, 'analyzer-warning'));
            sourceSelect.replaceChildren();for (const u of doc.units) {const option = el('option', u.location);option.value = u.id;sourceSelect.appendChild(option);}
            showUnit(doc.units[0].id);render();tab(0);notice('Teks sedia. Semak sumber atau mulakan analisis.');
        } catch (error) {input.value = '';notice(controller.signal.aborted ? 'Pembacaan dihentikan atau tamat masa. Pilih fail semula.' : (error.message || 'Fail tidak dapat dibaca.'), true);}
        finally {clearTimeout(timeout);active = null;refresh();}
    }
    async function run(mode) {
        if (!doc || active) return;
        let request;try {request = core.request({document: doc, mode, question: question.value});} catch (error) {notice(error.message, true);return;}
        if (mode === 'question' && history.length >= 20) {notice('Maksimum 20 soalan dalam sesi ini. Muat turun laporan dan padam soal jawab untuk meneruskan.', true);return;}
        const controller = new AbortController();active = controller;refresh();notice(mode === 'summary' ? 'Sarah sedang meringkaskan dokumen dan memadankan petikan…' : 'Sarah sedang mencari jawapan dalam dokumen…');
        const timeout = setTimeout(() => controller.abort(), 58000);
        try {
            const response = await fetch('/api/analyze-document', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(request), signal: controller.signal, cache: 'no-store'});
            let data;try {data = await response.json();} catch {throw new Error('Respons server tidak lengkap. Cuba semula.');}
            if (!response.ok) throw new Error(data.error?.message || 'Analisis belum tersedia. Cuba semula.');
            const result = core.result(data.result, doc, mode);
            if (mode === 'summary') analysis = result;else {history.push({question: request.question, result});question.value = '';}
            render();tab(mode === 'summary' ? 0 : 1);notice('Selesai. Buka petikan untuk menyemak jawapan dengan teks sumber.');
        } catch (error) {notice(controller.signal.aborted ? 'Permintaan dihentikan atau tamat masa. Dokumen dan hasil terdahulu masih tersedia.' : error.message, true);}
        finally {clearTimeout(timeout);active = null;refresh();}
    }
    function saveReport() {
        if (!doc) return;
        const blob = new Blob([core.report(doc, analysis, history, warnings)], {type: 'text/plain;charset=utf-8'});
        const url = URL.createObjectURL(blob), a = el('a');a.href = url;a.download = 'analisis-' + doc.name.replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}-]/gu, '-').slice(0, 80) + '.txt';
        document.body.appendChild(a);a.click();a.remove();setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    function build() {
        dialog = el('dialog', '', 'document-analyzer');dialog.setAttribute('aria-labelledby', 'analyzer-title');
        const header = el('header'), brand = el('div');brand.appendChild(el('p', 'SARAH · i4uManage', 'analyzer-eyebrow'));
        const title = el('h2', 'AI Document Analyzer');title.id = 'analyzer-title';brand.append(title, el('p', 'Fahami dokumen. Cari isi penting. Semak jawapan dengan sumber.'));
        header.append(brand, button('Tutup', () => dialog.close()));dialog.appendChild(header);
        const upload = el('div', '', 'analyzer-upload'), label = el('label', 'Pilih dokumen');
        input = el('input');input.type = 'file';input.accept = '.pdf,.docx,.txt';input.addEventListener('change', () => {const file = input.files[0];void load(file);});label.appendChild(input);
        upload.append(label, el('p', 'PDF berteks, DOCX atau TXT · maksimum 10 MB, 60 halaman PDF dan 60,000 aksara.'));
        upload.appendChild(el('p', 'Fail dibaca pada peranti. Teks dihantar kepada perkhidmatan AI apabila anda menekan Analisis atau Tanya. Sesi ini tidak disimpan selepas refresh.', 'analyzer-help'));
        info = el('div', '', 'analyzer-info');upload.appendChild(info);dialog.appendChild(upload);
        const nav = el('nav');nav.setAttribute('aria-label', 'Bahagian analisis');
        tabs = ['Ringkasan', 'Soal jawab', 'Teks sumber'].map((name, i) => {const b = button(name, () => tab(i));nav.appendChild(b);return b;});dialog.appendChild(nav);
        body = el('div', '', 'analyzer-body');panels = ['Ringkasan & isi penting', 'Tanya tentang dokumen', 'Teks yang digunakan untuk analisis'].map(name => {
            const p = el('section'), h = el('h3', name);h.tabIndex = -1;p.appendChild(h);body.appendChild(p);return p;
        });
        panels[0].appendChild(el('div', '', 'analyzer-summary'));
        const form = el('form'), qlabel = el('label', 'Soalan anda');question = el('textarea');question.rows = 2;question.maxLength = 1000;
        question.placeholder = 'Contoh: Apakah tindakan yang perlu diambil menurut dokumen ini?';question.addEventListener('input', refresh);qlabel.appendChild(question);
        ask = button('Tanya Sarah', () => run('question'), 'analyzer-primary');form.append(qlabel, ask);form.addEventListener('submit', e => {e.preventDefault();void run('question');});
        panels[1].append(el('p', 'Nyatakan soalan lengkap. Jawapan berdasarkan dokumen ini sahaja; setiap soalan dibaca secara berasingan.'), form,
            button('Padam soal jawab', () => {if (active) return;history = [];render();refresh();notice('Soal jawab sesi dipadam.');}), el('div', '', 'analyzer-answers'));
        const slabel = el('label', 'Lokasi dalam dokumen');sourceSelect = el('select');sourceSelect.addEventListener('change', () => showUnit(sourceSelect.value));slabel.appendChild(sourceSelect);
        sourceText = el('pre');panels[2].append(slabel, sourceText);dialog.appendChild(body);
        const footer = el('footer');status = el('p', '', 'analyzer-status');status.setAttribute('role', 'status');status.setAttribute('aria-live', 'polite');footer.appendChild(status);
        const actions = el('div', '', 'analyzer-actions');analyze = button('Analisis dokumen', () => run('summary'), 'analyzer-primary');download = button('Muat turun laporan', saveReport);
        cancel = button('Hentikan', () => active?.abort());actions.append(analyze, download, button('Kosongkan dokumen', reset, 'analyzer-clear'), cancel);
        footer.append(actions, el('p', 'Analisis kandungan sahaja; bukan pengesahan kesahihan dokumen atau dasar terkini.', 'analyzer-help'));dialog.appendChild(footer);
        dialog.addEventListener('close', () => {active?.abort();returnFocus?.focus();});document.body.appendChild(dialog);reset();tab(0);
    }
    root.SarahDocumentAnalyzer = {open() {returnFocus = document.activeElement;if (!dialog) build();if (!dialog.open) dialog.showModal();}};
})(globalThis);
