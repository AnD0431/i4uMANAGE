(function (root) {
    'use strict';
    function escape(text) { return String(text).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c])); }
    function html(blocks) {
        return blocks.map(block => {
            if (block.type === 'table') return `<table><thead><tr>${block.headers.map(t => `<th>${escape(t)}</th>`).join('')}</tr></thead><tbody>${block.rows.map(row => `<tr>${row.map(t => `<td>${escape(t)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
            const tag = block.type === 'title' ? 'h1' : block.type === 'heading' ? (block.level === 2 ? 'h3' : 'h2') : 'p';
            return `<${tag} class="paper-${block.type}">${escape(block.text).replace(/\n/g, '<br>')}</${tag}>`;
        }).join('');
    }
    const printCss = `@page{size:A4;margin:22mm}body{font:12pt/1.45 "Times New Roman",serif;color:#111;background:#fff;margin:0}h1{font-size:16pt;text-align:center}h2,h3{font-size:12pt;break-after:avoid;margin:20pt 0 8pt}p{white-space:normal;orphans:3;widows:3}.paper-subtitle{text-align:center;font-weight:bold}.paper-signature{break-inside:avoid;margin-top:25pt}table{width:100%;border-collapse:collapse;font-size:10pt;table-layout:fixed}th,td{border:1px solid #555;padding:7pt;overflow-wrap:anywhere;vertical-align:top}th{background:#eee}th:first-child{width:6%}th:nth-child(2){width:38%}th:nth-child(3){width:29%}td:last-child{text-align:right}thead{display:table-header-group}tr{break-inside:avoid}.print-toolbar{font:14px Arial;padding:16px;background:#eef3fa;margin-bottom:20px}.print-toolbar button{padding:10px 20px;cursor:pointer}@media print{.print-toolbar{display:none}}`;
    function printDocument(blocks, title) {
        const win = window.open('', '_blank');
        if (!win) throw new Error('Pelayar menyekat tetingkap cetakan. Benarkan pop-up untuk website ini dan cuba semula.');
        win.opener = null;
        win.document.open();
        win.document.write(`<!doctype html><html lang="ms"><head><meta charset="utf-8"><title>${escape(title)}</title><style>${printCss}</style></head><body><div class="print-toolbar"><button type="button" id="print-paper">Cetak / Simpan sebagai PDF</button> Pilih “Save as PDF” dalam dialog cetakan. Matikan header/footer pelayar jika tidak diperlukan.</div>${html(blocks)}</body></html>`);
        win.document.close();
        win.document.getElementById('print-paper').addEventListener('click', () => win.print());
        // Keep this preview open if the user cancels printing; no data is lost.
        win.focus();
    }
    async function docxBlob(blocks, library = root.docx) {
        if (!library?.Document || !library?.Packer) throw new Error('Pustaka Word belum dimuatkan. Semak sambungan dan cuba lagi, atau guna Cetak / PDF.');
        const {Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, Footer, PageNumber} = library;
        const paragraph = (text, properties = {}) => new Paragraph({...properties,
            children: text.split('\n').map((line, i) => new TextRun({text: line, break: i ? 1 : undefined,
                bold: properties.bold || false, font: 'Times New Roman', size: properties.size || 24}))});
        const children = [];
        for (const block of blocks) {
            if (block.type === 'table') {
                children.push(new Table({width: {size: 100, type: WidthType.PERCENTAGE},
                    columnWidths: [600, 3500, 3000, 1900],
                    rows: [block.headers, ...block.rows].map((row, rowIndex) => new TableRow({tableHeader: rowIndex === 0, cantSplit: true,
                        children: row.map((text, column) => new TableCell({
                            margins: {top: 100, bottom: 100, left: 100, right: 100},
                            children: [paragraph(text, {bold: rowIndex === 0, size: 21,
                                alignment: column === 3 ? AlignmentType.RIGHT : AlignmentType.LEFT})]
                        }))}))}));
            } else {
                children.push(paragraph(block.text, {
                    bold: ['heading', 'title', 'subtitle'].includes(block.type),
                    size: block.type === 'title' ? 30 : 24,
                    alignment: ['title', 'subtitle'].includes(block.type) ? AlignmentType.CENTER : AlignmentType.LEFT,
                    keepNext: block.type === 'heading', keepLines: block.type === 'signature',
                    spacing: {before: block.type === 'heading' || block.type === 'signature' ? 260 : 80, after: 120, line: 276}
                }));
            }
        }
        const doc = new Document({creator: 'Sarah · i4uManage', title: blocks.find(b => b.type === 'title')?.text || 'Kertas Kerja',
            styles: {default: {document: {run: {font: 'Times New Roman', size: 24}}}},
            sections: [{properties: {page: {size: {width: 11906, height: 16838}, margin: {top: 1247, bottom: 1247, left: 1247, right: 1247}}},
                footers: {default: new Footer({children: [new Paragraph({alignment: AlignmentType.CENTER, children: [
                    new TextRun({children: ['Halaman ', PageNumber.CURRENT], font: 'Times New Roman', size: 20})
                ]})]})}, children}]});
        return Packer.toBlob(doc);
    }
    function download(blob, filename) {
        const url = URL.createObjectURL(blob), link = document.createElement('a');
        link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    root.SarahPaperExport = Object.freeze({html, printCss, printDocument, docxBlob, download});
})(globalThis);
