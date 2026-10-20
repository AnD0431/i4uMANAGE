import '../js/government-sources.js';
import '../js/universal-search-core.js';
import {createRagRetriever} from './sarah-rag.js';
const core = globalThis.SarahUniversalCore;

const authority = [
    ['MyPPSM — Pekeliling Perkhidmatan Sumber Manusia', 'https://myppsm.jpa.gov.my/', 'JPA perkhidmatan awam cuti kenaikan pangkat saraan'],
    ['Pekeliling Perbendaharaan', 'https://ppp.treasury.gov.my/arkib/frontend', 'MOF kewangan perolehan aset perbendaharaan'],
    ['Surat Pekeliling KKM', 'https://www.moh.gov.my/penerbitan-dan-laporan/pekeliling', 'KKM kesihatan pekeliling'],
    ['Akta Kesihatan KKM', 'https://www.moh.gov.my/penerbitan-dan-laporan/dasar-akta-polisi-garis-panduan/akta-kesihatan', 'akta undang undang kesihatan']
].map(([title, url, description], i) => core.prepared({id: `authority-${i}`, type: 'punca-kuasa', title, url, description, kind: 'portal', origin: 'Direktori punca kuasa i4uManage'}));
const portals = globalThis.SarahGovernmentSources.sources.map(d => core.prepared({id: d.id, title: d.name, url: d.url, keywords: d.keywords, type: 'portal', kind: 'portal', origin: 'Direktori portal rasmi Sarah'}));

// RAG snapshots are already bounded and validated as public by sarah-rag.js.
const preparedIndexes = new WeakMap();
function searchSnapshot(index, text, options) {
    let rows = preparedIndexes.get(index);
    if (!rows) {
        rows = index.documents.flatMap(d => d.chunks.map(c => core.prepared({id: d.id, type: d.type, title: d.title, url: d.url, status: d.status,
            year: d.title.match(/\b20\d{2}\b/)?.[0] || '', text: c.text, unit: c.unit, start: c.start, end: c.end,
            kind: 'document', origin: 'Indeks kandungan RAG', updatedAt: d.updatedAt})));
        preparedIndexes.set(index, rows);
    }
    return core.rank(rows, {...options.query, type: 'all'}).results;
}
async function readJson(response, limit = 2 * 1024 * 1024) {
    if (!response.ok || Number(response.headers.get('content-length')) > limit) throw new Error('Source unavailable');
    const reader = response.body.getReader();let bytes = 0;const parts = [];
    try {while (true) {const {done, value} = await reader.read();if (done) break;bytes += value.byteLength;if (bytes > limit) throw new Error('Source too large');parts.push(Buffer.from(value));}}
    finally {await reader.cancel().catch(() => {});}
    return JSON.parse(Buffer.concat(parts).toString('utf8'));
}
export function createCatalogLoader({env = process.env, fetcher = (...args) => fetch(...args), clock = Date.now, timeoutMs = 3500, deadlineMs = 12000} = {}) {
    let cached, expires = 0, pending, config = '';
    return async () => {
        if (!env.I4UMANAGE_GAS_URL || !env.I4UMANAGE_DOC_SECRET) return {documents: [], status: 'disabled', failed: 17};
        const key = env.I4UMANAGE_GAS_URL + '\n' + env.I4UMANAGE_DOC_SECRET;
        if (key !== config) {cached = null;pending = null;expires = 0;config = key;}
        if (cached && clock() < expires) return cached;
        if (pending) return pending;
        const task = (async () => {
            const url = new URL(env.I4UMANAGE_GAS_URL);
            if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || !/^\/macros\/s\/[\w-]+\/exec$/.test(url.pathname) || url.search || url.username || url.password) throw new Error('Invalid endpoint');
            const jobs = [{source: 'akd'}, ...['slide-kursus', 'kertas-kerja'].flatMap(type => Object.keys(core.categories).map(category => ({type, category})))];
            let cursor = 0, failed = 0;const documents = [];const deadline = clock() + deadlineMs;
            await Promise.all(Array.from({length: 4}, async () => {
                while (cursor < jobs.length) {
                    const job = jobs[cursor++];if (clock() >= deadline) {failed++;continue;}
                    const controller = new AbortController();const timer = setTimeout(() => controller.abort(), Math.max(1, Math.min(timeoutMs, deadline - clock())));
                    try {
                        const response = await fetcher(url.href, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({token: env.I4UMANAGE_DOC_SECRET, ...job}), signal: controller.signal, redirect: 'follow'});
                        const data = await readJson(response);
                        if (!data.success || !Array.isArray(data.documents)) throw new Error('Invalid catalogue');
                        if (data.documents.length > 5000) failed++;
                        for (const d of data.documents.slice(0, 5000)) {
                            if (documents.length >= 5000) {failed++;break;}
                            const title = typeof d.name === 'string' ? d.name.slice(0, 400) : '';
                            const url = core.safeUrl(d.url);if (!title || !url) continue;
                            documents.push(core.prepared({id: String(d.id || url).slice(0, 200), title, url, type: job.source === 'akd' ? 'akd' : job.type, category: job.category || '',
                                year: String(d.year || title.match(/\b20\d{2}\b/)?.[0] || ''), updatedAt: String(d.updatedAt || '').slice(0, 80), kind: 'document', origin: 'Katalog dokumen i4uManage'}));
                        }
                    } catch {failed++;} finally {clearTimeout(timer);}
                }
            }));
            return {documents, status: !documents.length && failed >= jobs.length ? 'unavailable' : failed ? 'partial' : 'ready', failed};
        })().catch(() => ({documents: [], status: 'unavailable', failed: 17}));
        pending = task;
        try {const result = await task;if (key === config) {cached = result;expires = clock() + (result.failed ? 15000 : 300000);}return result;}
        finally {if (pending === task) pending = null;}
    };
}
function snippet(item, query) {
    const text = item.text || item.description || '';
    if (!text) return '';
    // Actual text only, with no generated summary or claim of complete document reading.
    const terms = query.terms;let start = 0;
    const tokens = [...text.matchAll(/[\p{L}\p{N}]+/gu)];
    const first = tokens.find(t => core.words(t[0]).some(w => terms.includes(w)));
    if (first) start = Math.max(0, first.index - 70);
    return (start ? '…' : '') + text.slice(start, start + 300) + (start + 300 < text.length ? '…' : '');
}
export function createUniversalSearch({catalog = createCatalogLoader(), retrieve = createRagRetriever({searcher: searchSnapshot})} = {}) {
    return async input => {
        const query = core.parse(input);
        const [catalogResult, ragResult] = await Promise.allSettled([catalog(), retrieve(query.q, {query})]);
        const cat = catalogResult.status === 'fulfilled' ? catalogResult.value : {documents: [], status: 'unavailable', failed: 17};
        const rag = ragResult.status === 'fulfilled' ? ragResult.value : {passages: [], status: 'unavailable'};
        const merged = core.rank([...cat.documents, ...authority, ...portals, ...(rag.passages || [])], query);
        const size = 12, start = query.page * size;
        return {success: true, query: query.q, filters: {type: query.type, category: query.category, year: query.year}, page: query.page,
            total: merged.results.length, facets: merged.facets, hasMore: start + size < merged.results.length,
            sources: {catalog: cat.status, failedCatalogSources: cat.failed, rag: rag.status, ragGeneratedAt: rag.generatedAt || null, portals: 'ready'},
            results: merged.results.slice(start, start + size).map(d => ({id: d.id, title: d.title, url: d.url, type: d.type, kind: d.kind,
                category: d.category || '', year: d.year || '', origin: d.origin, approximate: d.approximate, snippet: snippet(d, query),
                location: d.text ? `${d.unit === 'page' ? 'Halaman' : d.unit === 'slide' ? 'Slaid' : 'Bahagian'} ${d.start}${d.end > d.start ? '–' + d.end : ''}` : '',
                match: d.text ? 'Petikan kandungan' : d.kind === 'portal' ? 'Pautan rujukan' : 'Tajuk / metadata'}))};
    };
}
export const universalSearch = createUniversalSearch();
