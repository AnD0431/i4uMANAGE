// Server-only AKD catalogue. The live Drive list is authoritative for membership/version.
import '../js/government-sources.js';
import '../js/universal-search-core.js';
const core = globalThis.SarahUniversalCore;
const MAX_BYTES = 2 * 1024 * 1024;
export const isAkdLiveConfigured = (env = process.env) => Boolean(env.I4UMANAGE_GAS_URL && env.I4UMANAGE_DOC_SECRET);
export function createAkdLibrary({env = process.env, fetcher = (...args) => fetch(...args), clock = Date.now, ttlMs = 30000, timeoutMs = 6000} = {}) {
    const slots = new Map();let configuration = '';
    async function read(source) {
        if (!isAkdLiveConfigured(env)) return {status: 'disabled', documents: []};
        const key = `${env.I4UMANAGE_GAS_URL}\n${env.I4UMANAGE_DOC_SECRET}`;
        if (configuration !== key) {slots.clear();configuration = key;}
        let slot = slots.get(source);
        if (!slot) {slot = {};slots.set(source, slot);}
        if (slot.value && slot.expires > clock()) return slot.value;
        if (slot.pending) return slot.pending;
        const task = (async () => {
            const url = new URL(env.I4UMANAGE_GAS_URL);
            if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || !/^\/macros\/s\/[\w-]+\/exec$/.test(url.pathname) || url.search || url.username || url.password) throw new Error('Endpoint');
            const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const response = await fetcher(url.href, {method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({token: env.I4UMANAGE_DOC_SECRET, source}), signal: controller.signal, redirect: 'follow'});
                if (!response.ok || Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('Response');
                const reader = response.body.getReader(), parts = [];let bytes = 0;
                try {
                    while (true) {const part = await reader.read();if (part.done) break;bytes += part.value.byteLength;if (bytes > MAX_BYTES) throw new Error('Size');parts.push(Buffer.from(part.value));}
                } finally {await reader.cancel().catch(() => {});}
                const data = JSON.parse(Buffer.concat(parts).toString('utf8'));
                if (!data.success || !Array.isArray(data.documents) || data.documents.length > 5000) throw new Error('Catalogue');
                const seen = new Set(), documents = [];
                for (const d of data.documents) {
                    const id = String(d.id || ''), url = core.safeUrl(d.url);
                    if (!/^[\w-]{5,200}$/.test(id) || !url || typeof d.name !== 'string' || !d.name.trim()) throw new Error('Document');
                    if (seen.has(id)) continue;seen.add(id);
                    documents.push({id, name: d.name.slice(0, 400), url, mimeType: String(d.mimeType || ''), size: Number(d.size) || 0,
                        year: String(d.year || ''), updatedAt: String(d.updatedAt || ''), indexStatus: d.indexStatus,
                        title: String(d.title || '').slice(0, 400), summary: String(d.summary || '').slice(0, 3000),
                        keywords: Array.isArray(d.keywords) ? d.keywords.slice(0, 30).map(x => String(x).slice(0, 100)) : [],
                        topics: Array.isArray(d.topics) ? d.topics.slice(0, 20).map(x => String(x).slice(0, 100)) : []});
                }
                return {status: 'ready', documents, checkedAt: new Date(clock()).toISOString()};
            } finally {clearTimeout(timer);}
        })().catch(() => ({status: 'unavailable', documents: []}));
        slot.pending = task;
        try {const value = await task;slot.value = value;slot.expires = clock() + (value.status === 'ready' ? ttlMs : 5000);return value;}
        finally {if (slot.pending === task) slot.pending = null;}
    }
    return {catalog: () => read('akd'), index: () => read('akd-index')};
}
export const akdLibrary = createAkdLibrary();
const ignore = new Set('akd arahan kawalan dalaman apa apakah bagaimana berapa bila mana siapa saya aku nak mahu tolong boleh untuk tentang mengenai yang dan atau di ke daripada dengan dalam dokumen document documents file fail pdf sarah terangkan jelaskan ringkaskan ringkasan senaraikan senarai semua berikan huraikan kandungan isi penting tanggungjawab explain summarize summarise summary what how the of a an is are in to me please all bil tahun'.split(' '));
export function selectLiveAkd(query, documents, index = [], preferredIds = []) {
    const text = globalThis.SarahGovernmentSources.normalizeForRouting(query);
    // Do not turn writing tasks or questions about other document collections into AKD mode.
    if (!/\b(akd|arahan kawalan dalaman)\b/.test(text) &&
        /\b(jana|sediakan|tulis|draf|generate|write|create|kertas kerja|slaid|slide|slides|portal|website)\b/.test(text)) return [];
    const terms = [...new Set(core.words(text).filter(w => !ignore.has(w) && (w.length > 1 || /^\d$/.test(w))))].slice(0, 40);
    const indexed = new Map(index.map(d => [d.id, d])), preferred = new Set(preferredIds);
    const ranked = documents.map(d => {
        const item = indexed.get(d.id);
        // Never use an old summary to select a changed/deleted file.
        const fresh = item?.indexStatus === 'ready' && d.updatedAt && item.updatedAt === d.updatedAt;
        const title = core.words(d.name), meta = fresh ? core.words([item.title, item.summary, ...(item.topics || []), ...(item.keywords || [])].join(' ')) : [];
        let score = 0, matches = 0;
        for (const word of terms) {
            if (title.includes(word)) {score += 5;matches++;}
            else if (meta.includes(word)) {score += 2;matches++;}
            else if (!/\d/.test(word) && title.some(w => core.near(w, word))) {score++;matches++;}
        }
        // Client-selected IDs must still belong to the current Drive catalogue.
        if (preferred.has(d.id)) score += 20;
        const relevant = preferred.has(d.id) || (matches >= Math.min(2, terms.length) && matches > 0);
        return {document: d, score: relevant ? score : 0};
    }).filter(r => r.score > 0).sort((a, b) => b.score - a.score || a.document.name.localeCompare(b.document.name));
    return ranked.slice(0, 3).map(r => r.document);
}
export function akdTextResponse(text, {documents = [], checkedAt, mode = 'catalog'} = {}) {
    return {candidates: [{content: {role: 'model', parts: [{text}]}, finishReason: 'STOP'}],
        i4uAkd: {mode: true, retrieval: mode, checkedAt, totalDocuments: documents.length}};
}
export function formatAkdCatalog(documents) {
    if (!documents.length) return 'Katalog Drive AKD berjaya diperiksa, tetapi tiada dokumen disenaraikan.';
    const rows = documents.slice(0, 100).map((d, i) => `${i + 1}. ${d.name.replace(/[<>\[\]`*_\\\r\n]/g, ' ')}\n${d.url}`);
    return `Terdapat ${documents.length} dokumen dalam katalog Drive AKD:\n\n${rows.join('\n\n')}` +
        (documents.length > 100 ? '\n\n100 dokumen pertama dipaparkan. Gunakan Universal Smart Search untuk menapis dan melihat halaman seterusnya.' : '') +
        '\n\nIni senarai fail semasa; senarai ini tidak bermaksud kandungan setiap fail telah dibaca.';
}
