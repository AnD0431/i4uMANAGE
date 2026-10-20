// Shared deterministic search rules. No model-generated URLs or document claims.
(function (root) {
    'use strict';
    const types = Object.freeze({'akd': 'AKD', 'punca-kuasa': 'Punca kuasa', 'slide-kursus': 'Slaid kursus', 'kertas-kerja': 'Kertas kerja', 'portal': 'Portal rasmi'});
    const categories = Object.freeze({'pembangunan': 'Pembangunan', 'teknologi-maklumat': 'Teknologi maklumat', 'latihan': 'Latihan', 'psikologi-kaunseling': 'Psikologi & kaunseling', 'sumber-manusia': 'Sumber manusia', 'pentadbiran': 'Pentadbiran', 'perolehan-aset': 'Perolehan & aset', 'kewangan': 'Kewangan'});
    const stop = new Set('saya aku nak mahu tolong boleh untuk tentang mengenai yang dan atau di ke daripada dengan please find search show me the a an for of about tahun year years senarai list berkaitan berkenaan related dapatkan tunjuk cari carikan semua dokumen document documents file fail sarah universal smart'.split(' '));
    const synonyms = new Map();
    for (const group of ['latihan training course courses kursus', 'cuti leave', 'perolehan procurement purchasing', 'kewangan finance financial', 'aset asset assets', 'pekeliling circular circulars', 'keselamatan safety security', 'maklumat information', 'pentadbiran administration', 'bengkel workshop', 'sumber resources', 'manusia human', 'teknologi technology']) {
        const words = group.split(' ');for (const word of words) synonyms.set(word, words[0]);
    }
    function normalize(value) {
        return String(value || '').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
    }
    const words = value => normalize(value).split(' ').filter(Boolean).map(w => synonyms.get(w) || w);
    function parse(input = {}) {
        if (typeof input.q !== 'string' || input.q.trim().length > 300) throw new Error('Gunakan carian maksimum 300 aksara.');
        const q = input.q.trim();let text = normalize(root.SarahGovernmentSources?.normalizeForRouting(q) || q), inferred = '';
        const aliases = [ ['akd', /\b(akd|arahan kawalan dalaman|internal control directives?)\b/g], ['punca-kuasa', /\b(punca kuasa|authority documents?)\b/g], ['kertas-kerja', /\b(kertas kerja|working papers?)\b/g], ['slide-kursus', /\b(slaid(?: kursus)?|slides?(?: kursus)?)\b/g], ['portal', /\b(portal|website|websites|laman web|pautan rasmi)\b/g] ];
        const found = [];
        for (const [type, re] of aliases) if (re.test(text)) {found.push(type);text = text.replace(re, ' ');}
        if (found.length === 1) inferred = found[0];
        const type = input.type && input.type !== 'all' ? input.type : inferred || 'all';
        if (typeof type !== 'string' || (type !== 'all' && !Object.hasOwn(types, type))) throw new Error('Jenis sumber tidak sah.');
        const category = input.category || '';
        if (typeof category !== 'string' || (category && !Object.hasOwn(categories, category))) throw new Error('Kategori tidak sah.');
        const inferredYear = text.match(/\b(20\d{2}|2100)\b/)?.[0] || '';
        const year = String(input.year || inferredYear);
        if (year && !/^(20\d{2}|2100)$/.test(year)) throw new Error('Tahun mestilah antara 2000 dan 2100.');
        text = text.replace(/\b(20\d{2}|2100)\b/g, ' ');
        const terms = [...new Set(words(text).filter(w => !stop.has(w) && w.length > 1))].slice(0, 12);
        if (!terms.length && type === 'all' && !category && !year) throw new Error('Masukkan kata kunci atau pilih jenis sumber.');
        const page = input.page === undefined ? 0 : Number(input.page);
        if (!Number.isInteger(page) || page < 0 || page > 500) throw new Error('Halaman tidak sah.');
        return {q, type, category, year, terms, page};
    }
    function safeUrl(value) {
        try {const u = new URL(value);return u.protocol === 'https:' && !u.username && !u.password ? u.href : null;} catch {return null;}
    }
    function identity(value) {
        const safe = safeUrl(value);if (!safe) return '';
        const u = new URL(safe);u.hash = '';
        if (u.hostname === 'drive.google.com') {
            const id = u.pathname.match(/\/d\/([\w-]+)/)?.[1] || u.searchParams.get('id');
            if (id) return `drive:${id}`;
        }
        return u.href;
    }
    // One insertion, deletion, substitution or adjacent transposition; never fuzz numbers/acronyms.
    function near(a, b) {
        if (a === b) return true;
        if (a.length < 4 || b.length < 4 || /\d/.test(a + b) || Math.abs(a.length - b.length) > 1) return false;
        if (a.length === b.length) {
            const diff = [];for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff.push(i);
            return diff.length === 1 || (diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]]);
        }
        const [short, long] = a.length < b.length ? [a, b] : [b, a];let i = 0;
        while (i < short.length && short[i] === long[i]) i++;
        return short.slice(i) === long.slice(i + 1);
    }
    function prepared(doc) {
        return {...doc, titleWords: new Set(words(doc.title)), metaWords: new Set(words([doc.description, doc.keywords?.join(' '), categories[doc.category], types[doc.type]].filter(Boolean).join(' '))), bodyWords: new Set(words(doc.text || ''))};
    }
    function score(doc, query) {
        if (!query.terms.length) return {score: 1, approximate: false};
        let value = 0, matched = 0, approximate = false;
        for (const word of query.terms) {
            if (doc.titleWords.has(word)) {value += 12;matched++;}
            else if (doc.bodyWords.has(word)) {value += 7;matched++;}
            else if (doc.metaWords.has(word)) {value += 4;matched++;}
            else if ([...doc.titleWords, ...doc.metaWords].some(w => near(word, w))) {value += 2;matched++;approximate = true;}
        }
        if (matched < Math.ceil(query.terms.length * 0.75)) return null;
        return {score: value * matched / query.terms.length, approximate};
    }
    function rank(documents, query) {
        const unique = new Map();
        for (const doc of documents) {
            if (!safeUrl(doc.url) || ['archived', 'replaced'].includes(doc.status)) continue;
            if (query.type !== 'all' && doc.type !== query.type) continue;
            if (query.category && doc.category !== query.category) continue;
            if (query.year && String(doc.year || '') !== query.year) continue;
            const match = score(doc.titleWords ? doc : prepared(doc), query);if (!match) continue;
            const item = {...doc, ...match}, key = identity(doc.url);
            const previous = unique.get(key);
            if (!previous || item.score > previous.score || (item.score === previous.score && item.text && !previous.text)) unique.set(key, item);
        }
        const all = [...unique.values()].sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
        const facets = Object.fromEntries(Object.keys(types).map(t => [t, all.filter(d => d.type === t).length]));
        return {results: all.filter(d => query.type === 'all' || d.type === query.type), facets};
    }
    function isIntent(value) {return /\b(cari|carikan|find|search|carian)\b/.test(normalize(root.SarahGovernmentSources?.normalizeForRouting(value) || value));}
    root.SarahUniversalCore = Object.freeze({types, categories, normalize, words, parse, safeUrl, identity, near, prepared, score, rank, isIntent});
})(globalThis);
