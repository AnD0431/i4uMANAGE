import {akdLibrary} from '../lib/sarah-akd-live.js';
export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') return res.status(405).json({success: false, error: 'Method not allowed.'});
    const result = await akdLibrary.catalog();
    if (result.status !== 'ready') return res.status(503).json({success: false,
        error: 'Katalog Drive AKD belum dapat dicapai. Sila cuba semula.'});
    return res.status(200).json({success: true, source: 'akd', sourceName: 'ARAHAN KAWALAN DALAMAN',
        totalDocuments: result.documents.length, generatedAt: result.checkedAt,
        documents: result.documents.map(({id, name, url, mimeType, size, year, updatedAt}) => ({id, name, url, mimeType, size, year, updatedAt}))});
}
