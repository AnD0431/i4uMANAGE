import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

const requests = new AsyncLocalStorage();
// These are per warm instance, NOT a distributed project-wide rate limiter.
let active = 0;
const MAX_ACTIVE = 8;
const REQUEST_MS = 55000; // Leave five seconds before Vercel's 60s deadline.
let providerCooldownUntil = 0;

export class SarahError extends Error {
    constructor(code, status, message, retryAfter = 0) {
        super(message);
        Object.assign(this, { code, status, retryAfter });
    }
}
const busy = seconds => new SarahError('BUSY', 503,
    'Sarah sedang menerima banyak permintaan. Mesej anda masih disimpan; cuba semula sebentar lagi.', seconds);
export function remainingMs() {
    const state = requests.getStore();
    return state ? Math.max(0, state.deadline - Date.now()) : REQUEST_MS;
}
function timeoutError() {
    return new SarahError('TIMEOUT', 504,
        'Semakan mengambil masa lebih lama daripada biasa. Mesej anda masih disimpan untuk dicuba semula.');
}

export function sendSarahError(res, error) {
    const known = error instanceof SarahError;
    const status = known ? error.status : 503;
    const retryAfter = known ? error.retryAfter : 3;
    const state = requests.getStore();
    if (state && !state.done) console.error('SARAH_REQUEST_ERROR', {
        requestId: state.id, code: known ? error.code : 'UNAVAILABLE', status
    });
    if (retryAfter) res.setHeader?.('Retry-After', String(retryAfter));
    return res.status(status).json({ error: {
        code: known ? error.code : 'UNAVAILABLE',
        message: known ? error.message : 'Sarah belum dapat dihubungi. Mesej anda masih disimpan; sila cuba semula.',
        retryAfter,
        requestId: requests.getStore()?.id
    }});
}

export async function requestFetch(url, options = {}) {
    const state = requests.getStore();
    if (state && (remainingMs() < 1 || state.controller.signal.aborted)) throw timeoutError();
    const signal = state ? (options.signal
        ? AbortSignal.any([state.controller.signal, options.signal])
        : state.controller.signal) : options.signal;
    return fetch(url, { ...options, signal });
}

function retryDelay(response, data) {
    const header = response?.headers?.get?.('retry-after');
    let delay = 0;
    if (header) delay = /^\d+(\.\d+)?$/.test(header)
        ? Number(header) * 1000 : Math.max(0, Date.parse(header) - Date.now());
    for (const detail of data?.error?.details || []) {
        const match = String(detail.retryDelay || '').match(/^(\d+(?:\.\d+)?)s$/);
        if (match) delay = Math.max(delay || 0, Number(match[1]) * 1000);
    }
    return Number.isFinite(delay) ? delay : 0;
}
function permanentQuota(data) {
    return /per.?day|daily|billing|credit|spend.?cap/i.test(JSON.stringify(data?.error || {}));
}
function providerError(status, data, retryMs) {
    if ([400,401,403,404].includes(status)) return new SarahError('CONFIGURATION', 503,
        'Perkhidmatan AI belum dapat memproses permintaan ini. Sila maklumkan kepada pentadbir.');
    if (status === 429 && permanentQuota(data)) return new SarahError('QUOTA', 429,
        'Kuota perkhidmatan AI telah mencapai had. Pentadbir perlu menyemak kuota sebelum permintaan diteruskan.');
    return busy(Math.max(1, Math.ceil(retryMs / 1000) || 3));
}
function pause(ms) {
    const signal = requests.getStore()?.controller.signal;
    return new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(timeoutError());
        const abort = () => { clearTimeout(timer); reject(timeoutError()); };
        const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
        signal?.addEventListener('abort', abort, { once: true });
    });
}

export async function callGeminiReliably(url, payload, timeOutMs = 25000) {
    const state = requests.getStore();
    let lastError;
    // At most two extra transport attempts across ALL model calls in one request.
    for (let attempt = 0; attempt < 3; attempt++) {
        const cooling = providerCooldownUntil - Date.now();
        if (cooling > 0) {
            if (cooling + 2000 >= remainingMs()) throw busy(Math.ceil(cooling / 1000));
            await pause(cooling + Math.floor(Math.random() * 250));
        }
        if (remainingMs() < 1000) throw timeoutError();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), Math.min(timeOutMs, remainingMs()));
        let waitMs = 0;
        try {
            const response = await requestFetch(url, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload), signal: controller.signal
            });
            let data;
            try { data = await response.json(); }
            catch (error) {
                if (controller.signal.aborted || state?.controller.signal.aborted) throw timeoutError();
                if (response.ok) throw new SarahError('INVALID_RESPONSE', 502, 'Sarah menerima respons tidak lengkap. Sila cuba semula.');
                data = { error: { message: 'Non-JSON upstream response' } };
            }
            if (response.ok) return { response, data };
            waitMs = retryDelay(response, data);
            lastError = providerError(response.status, data, waitMs);
            const transient = [408,429,500,502,503,504].includes(response.status) && !permanentQuota(data);
            if (!transient) throw lastError;
            if ([429,503].includes(response.status)) {
                providerCooldownUntil = Math.max(providerCooldownUntil, Date.now() + Math.max(waitMs, 1000));
            }
        } catch (error) {
            if (state?.controller.signal.aborted || remainingMs() < 1000) throw timeoutError();
            if (error instanceof SarahError && !['TIMEOUT','INVALID_RESPONSE'].includes(error.code)) throw error;
            if (!(error instanceof SarahError) && error?.name !== 'AbortError' && !(error instanceof TypeError)) throw error;
            lastError = error instanceof SarahError ? error : (error?.name === 'AbortError' ? timeoutError() : busy(3));
        } finally { clearTimeout(timer); }
        if (attempt === 2 || (state && state.retries >= 2)) throw lastError;
        waitMs = Math.max(waitMs, 750 * 2 ** attempt + Math.floor(Math.random() * 400));
        if (waitMs + 2000 >= remainingMs()) throw lastError;
        if (state) state.retries++;
        await pause(waitMs);
    }
    throw lastError;
}

export async function withSarahRequest(req, res, handler, { deadlineMs = REQUEST_MS } = {}) {
    res.setHeader?.('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.status(405).json({ error: { code: 'METHOD', message: 'Method not allowed' } });
    if (!req.body || !Array.isArray(req.body.contents) || !req.body.contents.length ||
        !req.body.contents.every(turn => ['user','model'].includes(turn?.role) && Array.isArray(turn.parts))) {
        return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Mesej tidak lengkap. Sila hantar semula.' } });
    }
    if (Buffer.byteLength(JSON.stringify(req.body)) > 4300000) {
        return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Perbualan atau lampiran terlalu besar. Kurangkan saiz lampiran atau mulakan perbualan baharu.' } });
    }
    if (active >= MAX_ACTIVE) return sendSarahError(res, busy(3));
    const state = { id: randomUUID(), deadline: Date.now() + deadlineMs, controller: new AbortController(), retries: 0, done: false };
    res.setHeader?.('X-Request-ID', state.id);
    let timer;
    let proxy;
    proxy = new Proxy(res, { get(target, key) {
        if (['status','setHeader','json','send','end'].includes(key) && typeof target[key] === 'function') return (...args) => {
            if (state.done) return proxy;
            if (['json','send','end'].includes(key)) state.done = true;
            const result = target[key](...args);
            return result === target ? proxy : result;
        };
        const value = target[key];
        return typeof value === 'function' ? value.bind(target) : value;
    }});
    const disconnect = () => { if (!state.done) { state.done = true; state.controller.abort(); } };
    res.once?.('close', disconnect);
    active++;
    try {
        return await requests.run(state, async () => {
            const timeout = new Promise(resolve => {
                timer = setTimeout(() => {
                    state.controller.abort();
                    resolve(sendSarahError(proxy, timeoutError()));
                }, deadlineMs);
            });
            const work = Promise.resolve().then(() => handler(req, proxy)).catch(error => {
                // Never log full upstream URLs (they contain the API key) or user messages.
                return sendSarahError(proxy, error);
            });
            return Promise.race([work, timeout]);
        });
    } finally {
        clearTimeout(timer);
        state.controller.abort();
        res.removeListener?.('close', disconnect);
        active--;
    }
}
