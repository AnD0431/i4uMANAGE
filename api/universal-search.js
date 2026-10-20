import {universalSearch} from '../lib/sarah-universal-search.js';
import '../js/universal-search-core.js';
export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') {res.setHeader('Allow', 'POST');return res.status(405).json({success: false, error: 'Method not allowed.'});}
    let input;
    try {
        if (Number(req.headers?.['content-length']) > 8192 || Buffer.byteLength(typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})) > 8192) throw new Error('Carian terlalu panjang.');
        input = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Permintaan tidak sah.');
        globalThis.SarahUniversalCore.parse(input);
    } catch (error) {return res.status(400).json({success: false, error: error instanceof SyntaxError ? 'Permintaan tidak sah.' : error.message});}
    try {return res.status(200).json(await universalSearch(input));}
    catch {return res.status(503).json({success: false, error: 'Carian belum dapat diselesaikan. Sila cuba semula.'});}
}
