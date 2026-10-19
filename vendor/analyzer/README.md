# Browser document readers

Vendored from npm via jsDelivr; loaded on demand, so normal chat does not download these readers.

- `pdfjs-dist@5.4.624/build/pdf.min.mjs`
- `pdfjs-dist@5.4.624/build/pdf.worker.min.mjs`
- `mammoth@1.11.0/mammoth.browser.js`

License copies: `PDFJS-LICENSE` (Apache-2.0), `MAMMOTH-LICENSE` (BSD-2-Clause).

Upstream: https://github.com/mozilla/pdf.js and https://github.com/mwilliamson/mammoth.js.
When upgrading PDF.js, upgrade its main module and worker together; then retest PDF extraction. Retest DOCX raw-text extraction when upgrading Mammoth.
