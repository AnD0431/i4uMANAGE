#!/usr/bin/env python3
"""Build a fresh private RAG snapshot. Never run ingestion in the chat request path."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import urllib.request
import urllib.parse
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

TYPES = {'akd', 'punca-kuasa', 'slide-kursus', 'kertas-kerja'}
CATEGORIES = ['pembangunan', 'teknologi-maklumat', 'latihan', 'psikologi-kaunseling',
              'sumber-manusia', 'pentadbiran', 'perolehan-aset', 'kewangan']
MAX_FILE = 20 * 1024 * 1024
MAX_INDEX = 8 * 1024 * 1024
ROOT = Path(__file__).resolve().parent.parent

def trusted_url(value):
    url = urllib.parse.urlparse(value)
    host = url.hostname or ''
    trusted = host.endswith('.gov.my') or host in {'drive.google.com', 'docs.google.com',
        'script.google.com', 'script.googleusercontent.com', 'drive.usercontent.google.com'} or host.endswith('.googleusercontent.com')
    if url.scheme != 'https' or url.username or url.password or url.port not in (None, 443) or not trusted:
        raise ValueError('Sumber muat turun mesti HTTPS rasmi .gov.my atau Google Drive/Apps Script')
    return value

class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        trusted_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def download(url, payload=None):
    body = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(trusted_url(url), data=body, headers={
        'User-Agent': 'i4uManage-RAG-Indexer/1.0', 'Content-Type': 'application/json'})
    with urllib.request.build_opener(SafeRedirect()).open(req, timeout=25) as response:
        data = response.read(MAX_FILE + 1)
    if len(data) > MAX_FILE:
        raise ValueError('Fail melebihi 20 MB')
    return data

def clean(text):
    return re.sub(r'\s+', ' ', text.replace('\x00', '')).strip()

def extract_units(data, suffix):
    """Locations are physical PDF pages, slide order, or text sections, never invented pages."""
    if suffix == '.pdf':
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise ValueError('PDF dilindungi; sediakan salinan yang dibenarkan untuk diindeks')
        if len(reader.pages) > 2000:
            raise ValueError('Terlalu banyak halaman')
        units = [('page', n + 1, clean(page.extract_text() or '')) for n, page in enumerate(reader.pages)]
        # Refuse a silently partial index when some pages are image-only.
        if any(not text for _, _, text in units):
            raise ValueError('PDF mempunyai halaman tanpa teks; semak halaman kosong atau jalankan OCR dahulu')
        return units
    if suffix in {'.pptx', '.docx'}:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            if sum(i.file_size for i in archive.infolist()) > 100 * 1024 * 1024:
                raise ValueError('Arkib terlalu besar selepas diekstrak')
            if suffix == '.pptx':
                # Presentation relationship order can differ from slide1.xml, slide2.xml, ...
                rels = ET.fromstring(archive.read('ppt/_rels/presentation.xml.rels'))
                targets = {r.attrib['Id']: r.attrib['Target'] for r in rels if r.attrib.get('TargetMode') != 'External'}
                presentation = ET.fromstring(archive.read('ppt/presentation.xml'))
                rid = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
                units = []
                for node in presentation.iter():
                    if node.tag.endswith('}sldId'):
                        target = targets[node.attrib[rid]]
                        name = target.lstrip('/') if target.startswith('/') else 'ppt/' + target
                        root = ET.fromstring(archive.read(name))
                        text = clean(' '.join(el.text or '' for el in root.iter() if el.tag.endswith('}t')))
                        if not text:
                            raise ValueError('Slaid tanpa teks; semak slaid atau OCR dahulu')
                        units.append(('slide', len(units) + 1, text))
                return units
            root = ET.fromstring(archive.read('word/document.xml'))
            paragraphs = [clean(' '.join(el.text or '' for el in p.iter() if el.tag.endswith('}t')))
                          for p in root.iter() if p.tag.endswith('}p')]
            return [('section', n + 1, text) for n, text in enumerate(paragraphs) if text]
    if suffix in {'.txt', '.md'}:
        return [('section', n + 1, clean(text)) for n, text in enumerate(re.split(r'\n\s*\n', data.decode('utf-8')))
                if clean(text)]
    raise ValueError('Format tidak disokong; guna PDF, PPTX, DOCX, TXT atau MD (eksport format Google/Office lama dahulu)')

def chunks_for(units):
    chunks = []
    for unit, location, text in units:
        start = 0
        while start < len(text):
            end = min(start + 1800, len(text))
            if end < len(text):
                space = text.rfind(' ', start + 1200, end)
                if space > start:
                    end = space
            piece = text[start:end].strip()
            if piece:
                chunks.append({'id': f'{unit}-{location}-{start}', 'unit': unit,
                               'start': location, 'end': location, 'text': piece})
            if end == len(text):
                break
            start = max(start + 1, end - 180)
    return chunks

def catalog_documents():
    url, token = os.environ.get('I4UMANAGE_GAS_URL'), os.environ.get('I4UMANAGE_DOC_SECRET')
    if not url or not token:
        raise ValueError('Tetapkan I4UMANAGE_GAS_URL dan I4UMANAGE_DOC_SECRET dalam persekitaran terminal')
    batches = [('akd', {'source': 'akd'})]
    batches += [(kind, {'type': kind, 'category': cat}) for kind in ['slide-kursus', 'kertas-kerja'] for cat in CATEGORIES]
    documents = {}
    # Sequential, bounded calls avoid a burst against the existing Apps Script quota.
    for kind, request in batches:
        data = json.loads(download(url, {'token': token, **request}))
        if data.get('success') is not True or not isinstance(data.get('documents'), list):
            raise ValueError('Katalog gagal dibaca; indeks lama tidak diganti')
        for doc in data['documents']:
            source_id = str(doc.get('id', ''))
            if not re.fullmatch(r'[\w-]+', source_id):
                raise ValueError('ID Drive tidak sah')
            key = f'{kind}:{source_id}'
            documents[key] = {'id': key, 'type': kind, 'title': doc.get('name', ''), 'audience': 'public',
                'url': doc.get('url') or f'https://drive.google.com/file/d/{source_id}/view',
                'downloadUrl': f'https://drive.google.com/uc?export=download&id={source_id}',
                'updatedAt': doc.get('updatedAt', ''), 'status': 'reference'}
    return list(documents.values())

def make_document(doc, base, allow_network=False):
    if doc.get('type') not in TYPES or doc.get('audience') != 'public':
        raise ValueError('Kategori/audience tidak sah; chatbot awam hanya mengindeks audience=public')
    if not isinstance(doc.get('id'), str) or not 1 <= len(doc['id']) <= 200 or not isinstance(doc.get('title'), str) or not 1 <= len(doc['title']) <= 400:
        raise ValueError('ID atau tajuk dokumen tidak sah')
    if doc.get('status', 'reference') not in {'reference', 'active', 'archived', 'replaced'}:
        raise ValueError('Status dokumen tidak sah')
    url = urllib.parse.urlparse(doc.get('url', ''))
    if url.scheme != 'https' or not url.hostname or url.username or url.password:
        raise ValueError('Pautan sumber HTTPS diperlukan')
    if doc['type'] == 'punca-kuasa' and not url.hostname.endswith('.gov.my'):
        raise ValueError('Punca Kuasa mesti merujuk dokumen di portal rasmi .gov.my')
    if doc.get('path'):
        path = (base / doc['path']).resolve()
        if path.stat().st_size > MAX_FILE:
            raise ValueError('Fail melebihi 20 MB')
        data = path.read_bytes()
        suffix = path.suffix.lower()
    else:
        if not allow_network:
            raise ValueError('Gunakan --fetch untuk memuat turun sumber dalam manifest')
        data = download(doc['downloadUrl'])
        suffix = Path(doc.get('filename') or doc['title']).suffix.lower()
        if not suffix:
            suffix = '.pdf' if data.startswith(b'%PDF') else ''
    chunks = chunks_for(extract_units(data, suffix))
    if not chunks or len(chunks) > 2000:
        raise ValueError('Tiada teks yang boleh diindeks atau terlalu banyak petikan; semak OCR')
    return {key: doc.get(key, '') for key in ['id', 'type', 'title', 'url', 'updatedAt']} | {
        'audience': 'public', 'status': doc.get('status', 'reference'),
        'revision': hashlib.sha256(data).hexdigest(), 'chunks': chunks}

def atomic_json(path, data):
    path = path.resolve()
    if path == ROOT or ROOT in path.parents:
        raise ValueError('Simpan indeks/manifest di luar folder website supaya tidak diterbitkan sebagai fail statik')
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode()
    if len(raw) > MAX_INDEX:
        raise ValueError('Indeks melebihi had 8 MB; pecahkan koleksi atau guna stor carian yang lebih besar')
    descriptor, temporary = tempfile.mkstemp(dir=path.parent, prefix='.rag-')
    try:
        with os.fdopen(descriptor, 'wb') as stream:
            stream.write(raw)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary): os.unlink(temporary)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--fetch', action='store_true', help='Allow HTTPS downloads from manifest')
    parser.add_argument('--sync-catalog', action='store_true', help='Add ALL current AKD/slide/kertas-kerja catalog entries')
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text(encoding='utf-8'))
    documents = manifest['documents']
    if args.sync_catalog:
        remote = catalog_documents()
        # Local records override a remote record only by its exact category:Drive-ID.
        documents = list({doc['id']: doc for doc in remote + documents}.values())
    results, issues, ids = [], [], set()
    for doc in documents:
        try:
            if not doc.get('id') or doc['id'] in ids:
                raise ValueError('ID dokumen kosong atau berulang')
            ids.add(doc['id'])
            results.append(make_document(doc, args.manifest.resolve().parent, args.fetch or args.sync_catalog))
        except Exception as error:
            # Do not print raw network errors: upstream URLs can contain credentials.
            reason = str(error) if isinstance(error, (ValueError, ImportError)) else type(error).__name__
            issues.append({'id': doc.get('id', ''), 'issue': reason})
    report = {'documents': len(results), 'chunks': sum(len(d['chunks']) for d in results), 'issues': issues,
              'categories': {kind: sum(d['type'] == kind for d in results) for kind in sorted(TYPES)}}
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if issues:
        print('Binaan dihentikan; snapshot lama tidak disentuh. Baiki isu dan jalankan semula.', file=sys.stderr)
        return 1
    if not results:
        raise ValueError('Manifest kosong; indeks tidak ditulis')
    if len(results) > 5000 or sum(len(doc['chunks']) for doc in results) > 15000:
        raise ValueError('Had indeks dicapai: maksimum 5000 dokumen / 15000 petikan')
    snapshot = {'version': 1, 'generatedAt': datetime.now(timezone.utc).isoformat(), 'documents': results}
    atomic_json(args.output, snapshot)
    return 0

if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as error:
        print(str(error) if isinstance(error, (ValueError, ImportError)) else type(error).__name__, file=sys.stderr)
        sys.exit(1)
