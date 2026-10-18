/* Shared browser/server rules: financial arithmetic and the JKNT structure never come from AI. */
(function (root) {
    'use strict';
    const fields = [
        ['title', 'Nama program / kursus', 0, true, 200],
        ['organizer', 'Penganjur utama', 0, true, 200],
        ['purpose', 'Latar belakang / tujuan program', 0, true, 2000],
        ['objectives', 'Objektif (satu setiap baris; kosongkan untuk cadangan Sarah)', 0, false, 1600],
        ['method', 'Kaedah pelaksanaan', 0, true, 600],
        ['date', 'Tarikh mula', 0, true, 10],
        ['endDate', 'Tarikh tamat (jika lebih sehari)', 0, false, 10],
        ['time', 'Masa mula', 0, true, 5],
        ['venue', 'Tempat', 0, true, 300],
        ['venueReason', 'Justifikasi pemilihan tempat', 0, true, 1000],
        ['audience', 'Sasaran peserta', 1, true, 400],
        ['participants', 'Bilangan peserta', 1, true, 6],
        ['speaker', 'Penceramah (nyatakan jika belum ditentukan)', 1, true, 600],
        ['facilitator', 'Fasilitator (jika berkenaan)', 1, false, 600],
        ['secretariat', 'Urus setia', 1, true, 600],
        ['coOrganizer', 'Penganjur bersama (jika berkenaan)', 1, false, 300],
        ['coReason', 'Justifikasi penganjur bersama', 1, false, 700],
        ['coStatus', 'Status persetujuan kerjasama', 1, false, 400],
        ['committee', 'Jawatankuasa pelaksanaan (jika berkenaan)', 1, false, 1200],
        ['funding', 'Sumber peruntukan (LDP / selain LDP; nyatakan sumber)', 2, false, 400],
        ['pol', 'Perancangan melalui POL', 2, false, 40],
        ['preparedBy', 'Nama, gred dan jawatan penyedia (pilihan)', 2, false, 300],
        ['checkedBy', 'Nama dan jawatan penyemak (pilihan)', 2, false, 300],
        ['supportedBy', 'Nama dan jawatan Ketua Jabatan / Program (pilihan)', 2, false, 300]
    ].map(([key, label, step, required, max]) => ({key, label, step, required, max}));
    const narrativeFields = [
        ['background', 'Pendahuluan / latar belakang'], ['objectives', 'Objektif (satu setiap baris)'],
        ['method', 'Kaedah pelaksanaan'], ['impact', 'Impak pelaksanaan'], ['conclusion', 'Kesimpulan / rumusan']
    ];
    function validDate(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        const date = new Date(value + 'T00:00:00Z');
        return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }
    function money(cents) { return (cents / 100).toLocaleString('en-MY', {minimumFractionDigits: 2, maximumFractionDigits: 2}); }
    function rateCents(value) {
        const text = String(value ?? '').trim();
        if (!/^\d{1,6}(?:\.\d{1,2})?$/.test(text)) return null;
        const [whole, decimal = ''] = text.split('.');
        const cents = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
        return cents <= 10000000 ? cents : null; // maximum RM100,000 per unit
    }
    function budget(rows) {
        if (!Array.isArray(rows) || rows.length > 20) throw new Error('Bajet menerima maksimum 20 perkara.');
        return rows.map((row, index) => {
            const item = typeof row?.item === 'string' ? row.item.trim() : '';
            const quantity = String(row?.quantity ?? ''), multiplier = String(row?.multiplier ?? '');
            const cents = rateCents(row?.rate);
            if (!item || item.length > 200 || !/^\d+$/.test(quantity) || Number(quantity) < 1 || Number(quantity) > 10000 ||
                !/^\d+$/.test(multiplier) || Number(multiplier) < 1 || Number(multiplier) > 365 || cents === null) {
                throw new Error(`Semak perkara bajet ${index + 1}: isi nama, kuantiti 1–10,000, kekerapan 1–365 dan kadar sehingga RM100,000 (maksimum 2 perpuluhan).`);
            }
            return {item, quantity: Number(quantity), multiplier: Number(multiplier), rate: (cents / 100).toFixed(2),
                cents, totalCents: Number(quantity) * Number(multiplier) * cents};
        });
    }
    function validate(input) {
        const value = {}, issues = [];
        for (const field of fields) {
            const raw = input?.[field.key];
            value[field.key] = typeof raw === 'string' ? raw.replace(/\r\n/g, '\n').trim() : '';
            if ((field.required && !value[field.key]) || value[field.key].length > field.max)
                issues.push({key: field.key, step: field.step, message: `${field.label}: ${!value[field.key] ? 'maklumat diperlukan.' : `maksimum ${field.max} aksara.`}`});
        }
        for (const key of ['date', 'endDate']) if (value[key] && !validDate(value[key])) issues.push({key, step: 0, message: 'Sila pilih tarikh yang sah.'});
        if (value.endDate && value.endDate < value.date) issues.push({key: 'endDate', step: 0, message: 'Tarikh tamat tidak boleh sebelum tarikh mula.'});
        if (value.time && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.time)) issues.push({key: 'time', step: 0, message: 'Masa mesti dalam format HH:MM.'});
        if (value.participants && (!/^\d+$/.test(value.participants) || Number(value.participants) < 1 || Number(value.participants) > 100000))
            issues.push({key: 'participants', step: 1, message: 'Bilangan peserta mestilah 1–100,000 orang.'});
        if (value.coOrganizer) for (const key of ['coReason', 'coStatus']) if (!value[key]) issues.push({key, step: 1, message: 'Isi justifikasi dan status kerjasama apabila ada penganjur bersama.'});
        value.hasBudget = input?.hasBudget === true;
        if (typeof input?.hasBudget !== 'boolean') issues.push({key: 'hasBudget', step: 2, message: 'Pilih sama ada program melibatkan perbelanjaan.'});
        value.costs = [];
        if (value.hasBudget) {
            if (!value.funding) issues.push({key: 'funding', step: 2, message: 'Nyatakan sumber peruntukan.'});
            if (!['Ya', 'Tidak', 'Belum ditentukan'].includes(value.pol)) issues.push({key: 'pol', step: 2, message: 'Pilih status perancangan melalui POL.'});
            try {
                value.costs = budget(input.costs);
                if (!value.costs.length) throw new Error('Tambah sekurang-kurangnya satu perkara perbelanjaan.');
            } catch (error) { issues.push({key: 'costs', step: 2, message: error.message}); }
        } else { value.funding = ''; value.pol = ''; }
        return {value, issues};
    }
    function validateNarrative(input) {
        const value = {};
        for (const [key] of narrativeFields) {
            if (typeof input?.[key] !== 'string' || !input[key].trim() || input[key].length > 6000) throw new Error('Draf AI tidak lengkap. Cuba jana semula.');
            value[key] = input[key].trim();
        }
        return value;
    }
    function dateLabel(value) { return new Date(value + 'T00:00:00Z').toLocaleDateString('ms-MY', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'}); }
    function blocks(form, narrative) {
        const checked = validate(form);
        if (checked.issues.length) throw new Error(checked.issues[0].message);
        const f = checked.value, n = validateNarrative(narrative), output = [];
        const paragraph = text => output.push({type: 'paragraph', text});
        const section = (text, body, level = 1) => { output.push({type: 'heading', text, level}); if (body) paragraph(body); };
        output.push({type: 'title', text: f.title.toUpperCase()});
        output.push({type: 'subtitle', text: 'KEMENTERIAN KESIHATAN MALAYSIA\nJABATAN KESIHATAN NEGERI TERENGGANU'});
        section('1. PENDAHULUAN/LATAR BELAKANG', n.background);
        section('2. OBJEKTIF LATIHAN');
        n.objectives.split('\n').map(s => s.replace(/^\s*(?:[-•*]|\d+[.)]|\d+(?:\.\d+)+\.?)\s+/, '').trim()).filter(Boolean)
            .forEach((text, i) => paragraph(`2.${i + 1} ${text}`));
        section('3. KAEDAH PELAKSANAAN LATIHAN', `${f.method}\n\n${n.method}`);
        section('4. MAKLUMAT LATIHAN');
        section('4.1 Nama Penganjur & Penganjur Bersama (jika berkenaan)', `${f.organizer}\nPenganjur bersama: ${f.coOrganizer || 'Tidak berkenaan'}`, 2);
        section('4.2 Justifikasi Pemilihan Penganjur Bersama (jika berkenaan)', f.coOrganizer ? f.coReason : 'Tidak berkenaan', 2);
        section('4.3 Persetujuan Kerjasama oleh Penganjur & Penganjur Bersama (jika berkenaan)', f.coOrganizer ? f.coStatus : 'Tidak berkenaan', 2);
        section('4.4 Jawatankuasa Pelaksanaan Latihan (jika berkenaan)', f.committee || 'Tidak berkenaan', 2);
        section('4.5 Cadangan Tarikh & Tempat berserta Justifikasi Pemilihan Tempat',
            `Tarikh: ${dateLabel(f.date)}${f.endDate ? ' hingga ' + dateLabel(f.endDate) : ''}\nMasa mula: ${f.time}\nTempat: ${f.venue}\nJustifikasi: ${f.venueReason}`, 2);
        section('4.6 Sasaran dan Bilangan Peserta', `${f.audience}\nBilangan peserta: ${f.participants} orang`, 2);
        section('4.7 Penceramah, Fasilitator & Urus Setia', `Penceramah: ${f.speaker}\nFasilitator: ${f.facilitator || 'Tidak berkenaan'}\nUrus setia: ${f.secretariat}`, 2);
        section('5. IMPAK PELAKSANAAN LATIHAN', n.impact);
        section('6. SUMBER PERUNTUKAN DAN IMPLIKASI KEWANGAN');
        if (f.hasBudget) {
            paragraph(`Sumber peruntukan: ${f.funding}\nDirancang melalui POL: ${f.pol}`);
            output.push({type: 'table', headers: ['Bil', 'Perkara', 'Pengiraan', 'Jumlah (RM)'], rows: f.costs.map((row, i) =>
                [String(i + 1), row.item, `${row.quantity} × ${row.multiplier} × RM${money(row.cents)}`, money(row.totalCents)])});
            paragraph(`JUMLAH KESELURUHAN: RM${money(f.costs.reduce((sum, row) => sum + row.totalCents, 0))}`);
        } else paragraph('Program ini tidak melibatkan implikasi kewangan.');
        section('7. KESIMPULAN/RUMUSAN', n.conclusion);
        for (const [label, name] of [['Disediakan oleh:', f.preparedBy], ['Disemak oleh:', f.checkedBy], ['Sokongan Ketua Jabatan/Program:', f.supportedBy]])
            output.push({type: 'signature', text: `${label}\n\n......................................\n${name || '(Nama, gred dan jawatan)'}`});
        return output;
    }
    function filename(title) { return 'kertas-kerja-' + (String(title).normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 75) || 'program'); }
    root.SarahPaperCore = Object.freeze({fields, narrativeFields, validate, validateNarrative, budget, money, blocks, filename});
})(globalThis);
