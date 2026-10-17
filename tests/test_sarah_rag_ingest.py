import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import zipfile

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'build-sarah-rag.py'
spec = importlib.util.spec_from_file_location('rag_builder', SCRIPT)
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

class IngestionTests(unittest.TestCase):
    def test_chunk_overlap_preserves_page_locations_and_text(self):
        text = 'pengurusan inventori aset ' * 220
        chunks = builder.chunks_for([('page', 12, text)])
        self.assertGreater(len(chunks), 1)
        self.assertTrue(all(c['start'] == 12 and c['end'] == 12 and len(c['text']) <= 1800 for c in chunks))
        self.assertTrue(chunks[1]['text'].startswith(chunks[0]['text'][-180:].strip()))

    def test_pptx_follows_presentation_order_not_xml_filename(self):
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w') as archive:
            archive.writestr('ppt/presentation.xml', '<p:presentation xmlns:p="p" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId r:id="r2"/><p:sldId r:id="r1"/></p:sldIdLst></p:presentation>')
            archive.writestr('ppt/_rels/presentation.xml.rels', '<Relationships><Relationship Id="r1" Target="slides/slide1.xml"/><Relationship Id="r2" Target="slides/slide2.xml"/></Relationships>')
            archive.writestr('ppt/slides/slide1.xml', '<a:sld xmlns:a="a"><a:t>Kedua</a:t></a:sld>')
            archive.writestr('ppt/slides/slide2.xml', '<a:sld xmlns:a="a"><a:t>Pertama</a:t></a:sld>')
        self.assertEqual(builder.extract_units(buffer.getvalue(), '.pptx'), [('slide', 1, 'Pertama'), ('slide', 2, 'Kedua')])

    def test_docx_uses_sections_instead_of_invented_page_numbers(self):
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w') as archive:
            archive.writestr('word/document.xml', '<w:document xmlns:w="w"><w:p><w:r><w:t>Perenggan satu</w:t></w:r></w:p><w:p><w:r><w:t>Perenggan dua</w:t></w:r></w:p></w:document>')
        self.assertEqual(builder.extract_units(buffer.getvalue(), '.docx')[1], ('section', 2, 'Perenggan dua'))

    def test_image_only_pdf_requires_ocr(self):
        from pypdf import PdfWriter
        pdf = PdfWriter();pdf.add_blank_page(width=100, height=100)
        buffer = io.BytesIO();pdf.write(buffer)
        with self.assertRaisesRegex(ValueError, 'OCR'):
            builder.extract_units(buffer.getvalue(), '.pdf')

    def test_output_is_private_atomic_and_failed_build_keeps_previous_snapshot(self):
        with tempfile.TemporaryDirectory() as folder:
            folder = Path(folder);output = folder / 'index.json';manifest = folder / 'manifest.json'
            output.write_text('previous')
            manifest.write_text(json.dumps({'documents': [{'id': 'bad', 'type': 'akd', 'audience': 'internal'}]}))
            run = subprocess.run([sys.executable, str(SCRIPT), '--manifest', str(manifest), '--output', str(output)], capture_output=True)
            self.assertEqual(run.returncode, 1);self.assertEqual(output.read_text(), 'previous')
            builder.atomic_json(output, {'ok': True})
            self.assertEqual(json.loads(output.read_text()), {'ok': True})
            self.assertEqual(output.stat().st_mode & 0o777, 0o600)
        with self.assertRaises(ValueError):
            builder.atomic_json(builder.ROOT / 'public-index.json', {})

    def test_download_host_boundaries(self):
        for url in ['http://moh.gov.my/a.pdf', 'https://gov.my.attacker.test/a', 'https://127.0.0.1/', 'https://moh.gov.my:123/a']:
            with self.assertRaises(ValueError): builder.trusted_url(url)
        self.assertEqual(builder.trusted_url('https://www.moh.gov.my/a.pdf'), 'https://www.moh.gov.my/a.pdf')

    def test_revision_changes_when_contents_change(self):
        with tempfile.TemporaryDirectory() as folder:
            folder = Path(folder);text = folder / 'source.txt';text.write_text('Isi asal')
            record = {'id': 'akd:1', 'type': 'akd', 'title': 'Arahan', 'audience': 'public', 'url': 'https://example.gov.my/a', 'path': 'source.txt'}
            first = builder.make_document(record, folder)
            text.write_text('Isi baharu')
            second = builder.make_document(record, folder)
            self.assertNotEqual(first['revision'], second['revision'])

if __name__ == '__main__': unittest.main()
