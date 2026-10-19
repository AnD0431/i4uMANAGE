(function (root) {
    'use strict';
    const limits = Object.freeze({bytes: 10 * 1024 * 1024, chars: 60000, units: 300, pages: 60});
    const normalize = value => String(value).normalize('NFC').replace(/\s+/g, ' ').trim();
    function text(value, max) {
        if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('Maklumat analisis tidak lengkap atau melebihi had.');
        return value.trim();
    }
    function documentData(input) {
        const name = text(input?.name, 250);
        if (!['pdf', 'docx', 'txt'].includes(input?.type) || !Array.isArray(input.units) || !input.units.length || input.units.length > limits.units)
            throw new Error('Dokumen mesti mengandungi teks yang boleh dibaca (maksimum 300 bahagian).');
        let length = 0;
        const units = input.units.map((u, i) => {
            const content = text(u?.text, 8000);length += content.length;
            return {id: `U${i + 1}`, location: text(u?.location, 100), text: content};
        });
        if (length > limits.chars) throw new Error('Teks melebihi 60,000 aksara. Pecahkan dokumen kepada fail lebih kecil.');
        return {name, type: input.type, units};
    }
    function splitUnit(units, content, location) {
        const value = String(content).trim();
        for (let start = 0; start < value.length; start += 6000) {
            units.push({location: location + (value.length > 6000 ? ` · bahagian ${Math.floor(start / 6000) + 1}` : ''), text: value.slice(start, start + 6000)});
        }
    }
    function fromText(value, type, name) {
        if (value.length > limits.chars) throw new Error('Teks melebihi 60,000 aksara. Pecahkan dokumen kepada fail lebih kecil.');
        const units = [], content = value.replace(/\r\n?/g, '\n');
        if (type === 'docx') content.split(/\n\s*\n/).forEach((p, i) => splitUnit(units, p, `Perenggan ${i + 1}`));
        else {
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i += 20) splitUnit(units, lines.slice(i, i + 20).join('\n'), `Baris ${i + 1}–${Math.min(i + 20, lines.length)}`);
        }
        return documentData({name, type, units});
    }
    function request(input) {
        if (!['summary', 'question'].includes(input?.mode)) throw new Error('Pilih ringkasan atau soal jawab.');
        return {document: documentData(input.document), mode: input.mode,
            question: input.mode === 'question' ? text(input.question, 1000) : ''};
    }
    function result(input, doc, mode) {
        const units = new Map(doc.units.map(u => [u.id, u]));
        function claims(items, max, required) {
            if (!Array.isArray(items) || items.length > max || (required && !items.length)) throw new Error('Hasil analisis tidak lengkap.');
            return items.map(item => {
                const value = text(item?.text, 2200);
                if (!Array.isArray(item.evidence) || !item.evidence.length || item.evidence.length > 3) throw new Error('Petikan sumber diperlukan.');
                const evidence = item.evidence.map(e => {
                    const unit = units.get(e?.unitId), quote = text(e?.quote, 1200);
                    if (!unit || normalize(quote).length < 8 || !normalize(unit.text).includes(normalize(quote)))
                        throw new Error('Petikan AI tidak sepadan dengan dokumen.');
                    return {unitId: unit.id, location: unit.location, quote};
                });
                return {text: value, evidence};
            });
        }
        if (typeof input?.notFound !== 'boolean') throw new Error('Status analisis tidak lengkap.');
        if (mode === 'summary' && input.notFound) throw new Error('Dokumen belum dapat diringkaskan.');
        const summary = claims(input.summary, 4, mode === 'summary');
        const points = claims(input.points, 8, mode === 'summary');
        const answer = claims(input.answer, 6, mode === 'question' && !input.notFound);
        if ((mode === 'summary' && answer.length) || (mode === 'question' && (summary.length || points.length)) || (input.notFound && answer.length))
            throw new Error('Hasil analisis tidak konsisten.');
        return {summary, points, answer, notFound: input.notFound};
    }
    function report(doc, analysis, questions = [], warnings = []) {
        const lines = ['SARAH — AI DOCUMENT ANALYZER', doc.name, 'Analisis berdasarkan teks dokumen; bukan pengesahan kesahihan atau dasar terkini.', ...warnings, ''];
        function add(title, items) {
            lines.push(title);
            for (const item of items) {lines.push(item.text);for (const e of item.evidence) lines.push(`  [${e.location}] “${e.quote}”`);lines.push('');}
        }
        if (analysis) {add('RINGKASAN', analysis.summary);add('ISI PENTING', analysis.points);}
        for (const q of questions) {lines.push('SOALAN: ' + q.question);if (q.result.notFound) lines.push('Maklumat tidak ditemui dalam teks dokumen.');else add('JAWAPAN', q.result.answer);}
        return lines.join('\n');
    }
    root.SarahAnalyzerCore = Object.freeze({limits, normalize, documentData, splitUnit, fromText, request, result, report});
})(globalThis);
