import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EventEmitter} from 'node:events';
import '../js/paper-generator-core.js';
import '../js/paper-generator-export.js';
import handler from '../api/generate-paper.js';
const core = globalThis.SarahPaperCore, exporter = globalThis.SarahPaperExport;
export function fixture() {
    return {title: 'Bengkel Pengurusan Dokumen — UJIAN', organizer: 'Unit Latihan', purpose: 'Meningkatkan kemahiran pengurusan dokumen peserta.',
        objectives: 'Memahami tatacara penyimpanan\nMengaplikasikan pengurusan rekod', method: 'Bengkel dan latihan amali', date: '2026-11-18', endDate: '2026-11-19', time: '09:00',
        venue: 'Bilik Latihan', venueReason: 'Ruang latihan tersedia bagi peserta.', audience: 'Pembantu tadbir', participants: '30', speaker: 'Belum ditentukan',
        facilitator: '', secretariat: 'Unit Latihan', coOrganizer: '', coReason: '', coStatus: '', committee: '', funding: 'Cadangan peruntukan LDP', pol: 'Belum ditentukan',
        preparedBy: '', checkedBy: '', supportedBy: '', hasBudget: true,
        costs: [{item: 'Bahan latihan', quantity: '30', multiplier: '1', rate: '12.50'}, {item: 'Cetakan', quantity: '30', multiplier: '2', rate: '0.10'}]};
}
export const narrative = {background: 'Program ini dicadangkan bagi meningkatkan kemahiran pengurusan dokumen.', objectives: 'Memahami tatacara penyimpanan\nMengaplikasikan pengurusan rekod', method: 'Peserta mengikuti perbincangan dan latihan amali.', impact: 'Peserta disasarkan dapat mengurus dokumen dengan lebih tersusun.', conclusion: 'Kertas kerja ini dikemukakan untuk pertimbangan pihak berkenaan.'};
function response() {const res = new EventEmitter();res.headers = {};res.setHeader = (k,v) => {res.headers[k] = v;return res};res.status = code => {res.code = code;return res};res.json = data => {res.data = data;return res};return res;}

test('budget uses integer cents, quantities and repeated units, not model arithmetic', () => {
    const checked = core.validate(fixture());assert.deepEqual(checked.issues, []);
    assert.deepEqual(checked.value.costs.map(r => r.totalCents), [37500, 600]);
    assert.equal(core.money(38100), '381.00');
    for (const rate of ['0.001', '-1', 'Infinity', '1e4', '100001', '1,000.00']) assert.throws(() => core.budget([{item: 'Item', quantity: '1', multiplier: '1', rate}]));
    assert.throws(() => core.budget([{item: 'Item', quantity: '1.5', multiplier: '1', rate: '1'}]));
});
test('mandatory fields, invalid dates, reversed date range and missing partnership status are rejected', () => {
    for (const change of [f => f.title = '', f => f.date = '2026-02-30', f => f.endDate = '2026-01-01', f => f.time = '25:00',
        f => f.participants = '-1', f => f.coOrganizer = 'Rakan', f => f.costs = [], f => f.costs = Array(21).fill(f.costs[0]), f => f.hasBudget = 'false']) {
        const data = fixture();change(data);assert.ok(core.validate(data).issues.length);
    }
});
test('no-budget mode omits stale costs and funding and never invents a total', () => {
    const form = {...fixture(), hasBudget: false};const checked = core.validate(form);
    assert.deepEqual(checked.issues, []);assert.deepEqual(checked.value.costs, []);assert.equal(checked.value.funding, '');
    const blocks = core.blocks(form, narrative);assert.ok(!blocks.some(b => b.type === 'table'));
    assert.ok(blocks.some(b => b.text === 'Program ini tidak melibatkan implikasi kewangan.'));
});
test('document preserves all JKNT sections and user facts and computes the budget outside AI text', () => {
    const blocks = core.blocks(fixture(), narrative);
    assert.equal(blocks.filter(b => b.type === 'heading' && b.level === 1).length, 7);
    assert.equal(blocks.filter(b => b.type === 'heading' && b.level === 2).length, 7);
    for (let i = 1; i <= 7; i++) assert.ok(blocks.some(b => b.text?.startsWith(`4.${i} `)));
    assert.equal(blocks.filter(b => b.type === 'signature').length, 3);
    assert.ok(blocks.some(b => b.text?.includes('30 orang')));
    assert.ok(blocks.some(b => b.text === 'JUMLAH KESELURUHAN: RM381.00'));
    assert.ok(!JSON.stringify(blocks).includes('undefined'));
    const numbered = core.blocks(fixture(), {...narrative, objectives: '100% peserta memahami rekod\n1. Memahami tatacara\n2.1 Mengaplikasikan panduan'});
    assert.ok(numbered.some(b => b.text === '2.1 100% peserta memahami rekod'));
    assert.ok(numbered.some(b => b.text === '2.2 Memahami tatacara'));
    assert.ok(numbered.some(b => b.text === '2.3 Mengaplikasikan panduan'));
});
test('export escapes HTML and contains a real table and repeatable print header', () => {
    const blocks = core.blocks({...fixture(), title: '<script>alert(1)</script>'}, narrative);
    const html = exporter.html(blocks);
    assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;SCRIPT&gt;'));assert.ok(html.includes('<thead>'));
    assert.ok(html.includes('381.00'));assert.ok(exporter.printCss.includes('table-header-group'));
    assert.ok(!core.filename('../../bad/name').includes('/'));
});
test('model output requires every narrative field; partial and non-string fields fail', () => {
    for (const data of [{}, {...narrative, impact: ''}, {...narrative, background: {html: 'bad'}}, {...narrative, method: 'x'.repeat(6001)}]) assert.throws(() => core.validateNarrative(data));
});
test('API validates input before contacting model and returns actionable errors', async () => {
    const old = globalThis.fetch;globalThis.fetch = () => {throw new Error('Network should not be called')};
    try {
        for (const [req, code] of [[{method: 'GET'}, 405], [{method: 'POST', body: {form: {}}}, 400], [{method: 'POST', body: {form: {title: 'x'.repeat(41000)}}}, 413]]) {
            const res = response();await handler(req, res);assert.equal(res.code, code);assert.equal(res.headers['Cache-Control'], 'no-store');
        }
    } finally {globalThis.fetch = old;}
});
test('API constructs its own prompt and rejects truncated, invalid or incomplete AI drafts', async () => {
    const oldKey = process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY = 'mock';const old = globalThis.fetch;
    try {
        for (const [modelText, finishReason, expected] of [[JSON.stringify(narrative), 'STOP', 200], ['{}', 'STOP', 502], ['not-json', 'STOP', 502], [JSON.stringify(narrative), 'MAX_TOKENS', 502]]) {
            let calls = 0;
            globalThis.fetch = async (_url, options) => {
                calls++;const payload = JSON.parse(options.body);
                assert.ok(payload.system_instruction.parts[0].text.includes('Jangan mereka'));
                assert.ok(!JSON.stringify(payload).includes('MALICIOUS_CLIENT_SYSTEM'));
                assert.equal(payload.generationConfig.responseMimeType, 'application/json');
                return Response.json({candidates: [{finishReason, content: {parts: [{thought: true, text: 'private'}, {text: modelText}]}}]});
            };
            const res = response();await handler({method: 'POST', body: {form: fixture(), system_instruction: 'MALICIOUS_CLIENT_SYSTEM'}}, res);
            assert.equal(res.code, expected);assert.equal(calls, 1);assert.ok(!JSON.stringify(res.data).includes('private'));
            if (expected === 200) {assert.equal(res.data.version, 2);assert.equal(res.data.form.costs[0].totalCents, 37500);}
        }
    } finally {globalThis.fetch = old;oldKey === undefined ? delete process.env.GEMINI_API_KEY : process.env.GEMINI_API_KEY = oldKey;}
});
test('all six pages load generator dependencies before Sarah, and the Vercel budget is configured', () => {
    for (const name of ['index', 'akd', 'puncakuasa', 'slaid', 'kerja', 'document']) {
        const html = readFileSync(new URL(`../${name}.html`, import.meta.url), 'utf8');
        assert.ok(html.includes('css/paper-generator.css'));
        assert.ok(html.indexOf('js/paper-generator-core.js') < html.indexOf('js/paper-generator.js'));
        assert.ok(html.indexOf('js/paper-generator.js') < html.indexOf('js/scripts.js'));
    }
    const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
    assert.equal(config.functions['api/generate-paper.js'].maxDuration, 60);
});
