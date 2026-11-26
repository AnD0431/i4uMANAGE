import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import '../js/government-sources.js';
import {ragQuery, compileRagIndex, searchRagIndex} from '../lib/sarah-rag.js';
import handler from '../api/gemini.js';

const language = globalThis.SarahGovernmentSources;
const turn = (text, role = 'user') => ({role, parts: [{text}]});
const resolve = (history, text) => language.resolveConversationQuery([...history, turn(text)], text);

for (const [message, expected] of [
    ['sy nk claim minyak, cmne eh?', 'treasury'],
    ['kamek mok claim mileage tok, apa syarat?', 'treasury'],
    ['kawe nok claim duit minyak gi kursus', 'treasury'],
    ['hang buat ot, camner nk claim ot?', 'treasury'],
    ['sia amik mc bah, kena isi apa?', 'jpa'],
    ['mung nok cuti kawin, bape hari?', 'jpa'],
    ['cuti aku burn ke kalau tak habis?', 'jpa'],
    ['sy nk naik pngkt time bes, kena sedia apa?', 'jpa'],
    ['brp elaung makan kalau outstation?', 'treasury'],
    ['cutiiii nak apply camner?', 'jpa'],
]) test(`colloquial question selects relevant authority: ${message}`, () => {
    assert.ok(language.isGovernmentQuery(message));
    assert.ok(language.findSources(message).some(source => source.id === expected));
});

for (const message of ['jgn guna AKD, rjuk JPA', 'x payah pakai AKD', 'taknak guna AKD', 'xnak rjuk AKD', 'tak payah guna AKD', 'tok sah guna AKD', 'x guna AKD', 'tak guna AKD', 'bukan semua berdasarkan AKD']) {
    test(`slang source exclusion remains an exclusion: ${message}`, () => assert.equal(language.isAkdQuery(message), false));
}

test('ambiguous acronyms and negation are not expanded without context', () => {
    assert.equal(language.normalizeForRouting('MC OT PA dok demo hang bah kamek x tak bukan'), 'mc ot pa dok demo hang bah kamek x tak bukan');
    assert.equal(language.normalizeForRouting('N19 N41 RM120.50 12/2026 "Claim minyak" https://example.test/claim'), 'n19 n41 rm120.50 12/2026 "claim minyak" https://example.test/claim');
    assert.equal(language.isGovernmentQuery('MC majlis tu siapa?'), false);
});

test('short follow-ups retain the nearest user topic across multiple turns', () => {
    const history = [turn('cuti rehat berapa hari?'), turn('Apakah status lantikan awak?', 'model')];
    for (const q of ['kalau kontrak pulak?', 'klu kontrk plak?', 'gred N41', 'yang tu camne?', 'mcm mn?', 'bpe hari?', 'tak paham, explain simple skit']) {
        assert.ok(resolve(history, q).includes('cuti rehat'), q);
    }
    history.push(turn('klu kontrak plak?'), turn('Jawapan sebelumnya.', 'model'));
    const query = resolve(history, 'berapa hari pulak?');
    assert.ok(query.includes('cuti rehat'));
    assert.ok(query.includes('kontrak'));
    assert.ok(!query.includes('Jawapan sebelumnya'));
    assert.equal(ragQuery([...history, turn('yang tu camne?')], 'yang tu camne?'), resolve(history, 'yang tu camne?'));
});

test('new subjects, source exclusions and topic boundaries do not inherit old AKD', () => {
    const history = [turn('ringkaskan AKD Bil 5'), turn('AKD ialah satu-satunya sumber.', 'model')];
    for (const q of ['cuti aku burn ke?', 'sy nk claim minyak', 'jgn guna AKD, rjuk JPA', 'pencen', 'tukar topik, cerita pasal pencen', 'apa khabar Sarah?']) {
        assert.equal(resolve(history, q), q);
    }
    assert.equal(resolve([], 'yang tu camne?'), 'yang tu camne?');
    assert.ok(!resolve([...history, turn('apa khabar?')], 'yang tu camne?').includes('AKD'));
    assert.equal(resolve([turn('A'.repeat(15000))], 'yang tu camne?'), 'yang tu camne?');
    const attachment = turn('yang ni camne?');
    attachment.parts.push({inline_data: {mime_type: 'application/pdf', data: 'mock-document'}});
    assert.equal(language.resolveConversationQuery([...history, attachment], 'yang ni camne?'), 'yang ni camne?');
    assert.equal(language.isAkdQuery(resolve([turn('cuti rehat berapa hari?'), turn('Hanya guna AKD Bil 5.', 'model')], 'klu kontrak plak?')), false);
});

test('slang retrieval finds document content, without treating a title as evidence', () => {
    const index = compileRagIndex({version: 1, generatedAt: new Date().toISOString(), documents: [{
        id: 'punca-kuasa:fixture', type: 'punca-kuasa', title: 'Panduan perjalanan',
        url: 'https://example.gov.my/panduan.pdf', audience: 'public', status: 'reference', revision: 'a'.repeat(64),
        chunks: [{id: 'p1', text: 'Permohonan tuntutan perjalanan disertakan dengan dokumen sokongan.', unit: 'page', start: 1, end: 1}]
    }]});
    assert.equal(searchRagIndex(index, 'sy nk claim minyak, cmne?')[0]?.documentId, 'punca-kuasa:fixture');
});

function answer(text, official = false) {
    return {candidates: [{finishReason: 'STOP', content: {parts: [{text}]}, ...(official ? {
        groundingMetadata: {webSearchQueries: ['rujukan rasmi'],
            groundingChunks: [{web: {uri: 'https://docs.jpa.gov.my/', title: 'Dokumen rasmi'}}],
            groundingSupports: [{segment: {startIndex: 0, endIndex: 24, text: 'Rujuk sumber rasmi.'}, groundingChunkIndices: [0]}]}
    } : {})}]};
}

test('API routes slang and follow-ups while keeping original messages intact', async () => {
    const keys = ['GEMINI_API_KEY', 'I4UMANAGE_GAS_URL', 'I4UMANAGE_DOC_SECRET', 'SARAH_RAG_INDEX_URL', 'SARAH_RAG_TOKEN'];
    const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
    const oldFetch = globalThis.fetch;
    keys.forEach(k => delete process.env[k]); process.env.GEMINI_API_KEY = 'mock-only';
    try {
        for (const [history, question, official, domain] of [
            [[], 'sy nk claim minyak, cmne?', true, 'ppp.treasury.gov.my'],
            [[turn('cuti rehat berapa hari?'), turn('Status lantikan?', 'model')], 'klu kontrak plak?', true, 'docs.jpa.gov.my'],
            [[turn('ringkaskan AKD Bil 5')], 'cuti aku burn ke?', true, 'docs.jpa.gov.my'],
            [[], 'yang tu camne?', false, ''],
            [[], 'tq sarah, membantu sungguh', false, ''],
        ]) {
            const contents = [...history, turn(question)];
            const before = JSON.stringify(contents);
            let calls = 0;
            globalThis.fetch = async (url, options) => {
                calls++;
                assert.ok(String(url).startsWith('https://generativelanguage.googleapis.com/'));
                const payload = JSON.parse(options.body);
                assert.deepEqual(payload.contents, contents);
                assert.equal(Boolean(payload.tools?.some(t => t.google_search)), official);
                const instructions = JSON.stringify(payload.system_instruction);
                assert.ok(instructions.includes('Ayat santai bukan alasan menolak'));
                assert.ok(instructions.includes('tanya SATU soalan khusus'));
                if (domain) assert.ok(instructions.includes(domain));
                return Response.json(answer(official ? 'Rujuk sumber rasmi. [[I4U_STATUS:ACTIVE]]' : 'Maksud awak bahagian mana?', official));
            };
            const res = {setHeader() {}, status(code) {this.code = code; return this;}, json(data) {this.data = data; return this;}};
            await handler({method: 'POST', body: {contents}}, res);
            assert.equal(res.code, 200, question);
            assert.equal(calls, 1, 'No separate language-model call to translate slang');
            assert.equal(JSON.stringify(contents), before);
        }
    } finally {
        globalThis.fetch = oldFetch;
        keys.forEach(k => saved[k] === undefined ? delete process.env[k] : process.env[k] = saved[k]);
    }
});

test('browser no longer mandates a rigid out-of-scope rejection for unclear language', () => {
    const source = readFileSync(new URL('../js/scripts.js', import.meta.url), 'utf8');
    assert.ok(!source.includes('Balas dengan AYAT TEPAT ini SAHAJA'));
    assert.ok(source.includes('Jika maksud masih kabur, tanya satu soalan khusus'));
});
