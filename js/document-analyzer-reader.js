(function (root) {
    'use strict';
    const core = root.SarahAnalyzerCore;
    function docx(buffer, signal) {
        return new Promise((resolve, reject) => {
            const worker = new Worker('js/document-analyzer-docx-worker.js');
            const finish = (error, result) => {worker.terminate();signal.removeEventListener('abort', abort);error ? reject(error) : resolve(result);};
            const abort = () => finish(new Error('Pembacaan dihentikan.'));
            if (signal.aborted) return abort();
            signal.addEventListener('abort', abort, {once: true});
            worker.onmessage = e => finish(e.data.error ? new Error(e.data.error) : null, e.data);
            worker.onerror = () => finish(new Error('Pembaca Word tidak dapat dimuatkan atau fail rosak.'));
            worker.postMessage(buffer, [buffer]);
        });
    }
    async function read(file, signal, progress) {
        if (!file || !file.size || file.size > core.limits.bytes) throw new Error('Pilih fail bukan kosong berukuran maksimum 10 MB.');
        const type = file.name.split('.').pop().toLowerCase();
        if (!['pdf', 'docx', 'txt'].includes(type)) throw new Error('Gunakan PDF berteks, Word .docx atau teks .txt.');
        const buffer = await file.arrayBuffer();signal.throwIfAborted();
        const warnings = [];
        if (type === 'txt') {
            let value;try {value = new TextDecoder('utf-8', {fatal: true}).decode(buffer);} catch {throw new Error('Simpan fail teks menggunakan pengekodan UTF-8.');}
            if (value.includes('\0')) throw new Error('Fail ini bukan teks UTF-8 yang sah.');
            return {document: core.fromText(value, type, file.name), warnings};
        }
        if (type === 'docx') {
            const result = await docx(buffer, signal);
            warnings.push('Rujukan Word menggunakan perenggan teks yang diekstrak, bukan nombor halaman. Imej dan susun atur jadual tidak dianalisis.');
            if (result.warnings) warnings.push('Sebahagian elemen Word tidak dapat diproses. Semak teks sumber yang dipaparkan.');
            return {document: core.fromText(result.text, type, file.name), warnings};
        }
        const pdfjs = await import('../vendor/analyzer/pdf.min.mjs');signal.throwIfAborted();
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('../vendor/analyzer/pdf.worker.min.mjs', document.currentScript?.src || new URL('js/document-analyzer-reader.js', location.href)).href;
        const task = pdfjs.getDocument({data: buffer, isEvalSupported: false, stopAtErrors: true, useSystemFonts: true});
        const abort = () => { void task.destroy().catch(() => {}); };
        signal.addEventListener('abort', abort, {once: true});
        try {
            const pdf = await task.promise;
            if (pdf.numPages > core.limits.pages) throw new Error('PDF melebihi 60 halaman. Pecahkan kepada fail lebih kecil.');
            const units = [], empty = [];let count = 0;
            for (let page = 1; page <= pdf.numPages; page++) {
                signal.throwIfAborted();progress(`Membaca halaman ${page} daripada ${pdf.numPages}…`);
                const current = await pdf.getPage(page), content = await current.getTextContent();
                const value = content.items.map(i => i.str === undefined ? '' : i.str + (i.hasEOL ? '\n' : ' ')).join('').trim();
                current.cleanup();count += value.length;
                if (count > core.limits.chars) throw new Error('Teks melebihi 60,000 aksara. Pecahkan dokumen kepada fail lebih kecil.');
                if (!value) empty.push(page);else core.splitUnit(units, value, `Halaman ${page}`);
            }
            if (!units.length) throw new Error('PDF tiada teks yang boleh dibaca. Jalankan OCR atau muat naik versi PDF berteks.');
            if (empty.length) warnings.push(`Halaman ${empty.join(', ')} tiada teks yang dapat dibaca; kandungannya tidak termasuk dalam analisis.`);
            warnings.push('Analisis meliputi teks yang diekstrak sahaja; imej, carta dan susun atur visual tidak disemak.');
            return {document: core.documentData({name: file.name, type, units}), warnings};
        } catch (error) {
            if (error.name === 'PasswordException') throw new Error('PDF dilindungi kata laluan. Muat naik salinan yang boleh dibuka tanpa kata laluan.');
            throw error;
        } finally {signal.removeEventListener('abort', abort);await task.destroy();}
    }
    root.SarahAnalyzerReader = Object.freeze({read});
})(globalThis);
