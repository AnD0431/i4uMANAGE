# Knowledge Base Sarah: carian isi dokumen

Kod menyokong empat kategori: **AKD, Punca Kuasa, slaid kursus dan kertas kerja**. Ia mencari petikan teks, memberikan petikan itu kepada Gemini, kemudian memaparkan rujukan `[R1]` berserta halaman/slaid dalam jawapan. Paparan perkataan demi perkataan dan kedudukan bacaan dikekalkan.

**Status pemasangan:** integrasi kod dan pengindeks tersedia. RAG produksi hanya aktif selepas stor indeks dan pemboleh ubah Vercel disediakan. Jika belum dikonfigurasi, Sarah menggunakan laluan sedia ada. Dua fail tempatan sudah diuji; ini tidak bermaksud seluruh Google Drive atau semua portal Punca Kuasa sudah diindeks.

## Cara kod berfungsi

```text
PDF / PPTX / DOCX / TXT / MD
    → build-sarah-rag.py (ekstrak mengikut halaman/slaid/bahagian)
    → petikan maksimum 1,800 aksara + pertindihan 180 aksara
    → index.json persendirian di Google Drive
    → Apps Script dengan token rahsia
    → /api/gemini → cari petikan → Gemini → jawapan + rujukan
```

`lib/sarah-rag.js` menggunakan carian **BM25**, padanan tajuk dan normalisasi typo/bahasa sedia ada. Ini RAG berasaskan teks; belum menggunakan embedding/vector database. Parafrasa yang langsung tidak berkongsi istilah dengan dokumen mungkin tidak ditemui. Jangan mendakwa Sarah memahami semua loghat atau semua maksud secara sempurna.

Contoh integrasi di `api/gemini.js`:

```js
const ragResult = await retrieveSarahKnowledge(
    ragQuery(clientPayload.contents, latestUserMessage),
    { types: ragTypes(latestUserMessage) }
);
let payload = appendRagContext(
    appendSystemInstruction({ ...clientPayload }, governmentSources.getLanguageInstruction()),
    ragResult
);
// Selepas Gemini menjawab:
attachRagSources(data, ragResult);
```

`retrieveSarahKnowledge()` mencari maksimum lapan petikan daripada empat dokumen, dengan jumlah teks maksimum 12,000 aksara. `appendRagContext()` memasukkan petikan sebagai data rujukan, berasingan daripada arahan sistem. `attachRagSources()` hanya menghantar metadata bagi ID yang benar-benar diambil dan dipetik dalam jawapan; ia tidak mengesahkan secara automatik setiap dakwaan AI.

`js/scripts.js → appendSarahRagSources()` memaparkan tajuk dan lokasi rujukan yang boleh dibuka. Nombor halaman ialah halaman fizikal PDF; DOCX menggunakan nombor bahagian kerana kedudukan halaman berubah mengikut aplikasi. Kad rujukan tidak memberi lencana “dasar semasa disahkan”.

## 1. Bina indeks

Gunakan Python 3.9+ dan pasang kebergantungan di luar folder website:

```sh
python3 -m venv "$HOME/Documents/i4umanage-rag-tools"
"$HOME/Documents/i4umanage-rag-tools/bin/pip" install -r scripts/requirements-rag.txt
mkdir -p "$HOME/Documents/i4umanage-rag-private"
```

Buat `manifest.json` dalam folder persendirian itu. Contoh berikut ialah **templat**: ganti laluan dan URL dengan dokumen sebenar. Jangan gunakan pautan halaman utama portal sebagai kandungan pekeliling.

```json
{
  "documents": [
    {
      "id": "punca-kuasa:rujukan-sebenar",
      "type": "punca-kuasa",
      "title": "Tajuk dokumen rasmi sebenar",
      "path": "/laluan/ke/dokumen-sebenar.pdf",
      "url": "https://www.moh.gov.my/laluan-dokumen-sebenar.pdf",
      "audience": "public",
      "status": "reference",
      "updatedAt": "2026-10-17"
    }
  ]
}
```

Jenis yang diterima: `akd`, `punca-kuasa`, `slide-kursus`, `kertas-kerja`. `path` boleh relatif kepada manifest. Untuk muat turun, ganti `path` dengan `downloadUrl` dan tambah `filename` jika URL tidak menyatakan format; jalankan dengan `--fetch`. Muat turun hanya menerima domain rasmi `.gov.my` dan Google Drive. Fail memerlukan akses sah; halaman log masuk bukan dokumen.

Jalankan dari folder website:

```sh
"$HOME/Documents/i4umanage-rag-tools/bin/python" scripts/build-sarah-rag.py \
  --manifest "$HOME/Documents/i4umanage-rag-private/manifest.json" \
  --output "$HOME/Documents/i4umanage-rag-private/index.json"
```

Untuk mengambil **semua AKD, slaid dan kertas kerja** dalam katalog Apps Script sedia ada, tetapkan `I4UMANAGE_GAS_URL` dan `I4UMANAGE_DOC_SECRET` dalam persekitaran terminal, kemudian tambah `--sync-catalog`. Jangan letak rahsia dalam kod, Git atau mesej chat. Manifest boleh mempunyai `"documents": []` jika tiada sumber tambahan. Pengindeks membaca AKD dan semua lapan kategori bagi slaid/kertas kerja; rekod manifest dengan ID `jenis:Drive-ID` yang sama boleh menyediakan salinan tempatan bagi fail Drive yang memerlukan log masuk.

**Punca Kuasa:** halaman sekarang menyenaraikan portal MyPPSM, Perbendaharaan dan KKM. Portal itu bukan satu fail dokumen. Masukkan pekeliling/dokumen rasmi yang diperlukan ke manifest, termasuk salinan fail tempatan jika portal menyekat muat turun automatik. Carian Google rasmi sedia ada masih digunakan untuk soalan dasar semasa. Pengindeks tidak merayap seluruh portal secara automatik.

Jika PDF/slaid tiada teks, binaan berhenti dan meminta semakan/OCR. Gambar, rajah dan nota pembentang tidak dibaca oleh pengekstrak PPTX ini. Jadual kompleks memerlukan semakan hasil ekstrak. Format `.ppt`, `.doc` atau fail Google asli perlu dieksport ke format yang disokong. Satu kegagalan menghentikan penerbitan snapshot baharu supaya koleksi tidak menjadi separa secara senyap.

## 2. Sambungkan stor persendirian

1. Muat naik `index.json` ke Google Drive pentadbir. Kekalkan fail itu **Restricted**. Catat ID fail.
2. Buat projek Apps Script berasingan dan salin `scripts/sarah-rag-store.gs`. Jangan gantikan `doPost` pada API dokumen lama.
3. Dalam **Project Settings → Script Properties**, tambah `SARAH_RAG_FILE_ID` dan `SARAH_RAG_TOKEN`. Jana token rawak sekurang-kurangnya 32 aksara, contohnya `python3 -c 'import secrets; print(secrets.token_urlsafe(32))'`.
4. Deploy sebagai **Web app**, execute as pemilik fail. Endpoint perlu boleh dicapai server Vercel tanpa log masuk interaktif; `doPost` tetap memerlukan token yang betul sebelum membaca Drive. Jika dasar organisasi tidak membenarkan web app ini, jangan ubah dasar organisasi; gunakan stor dalaman yang diluluskan dan sesuaikan adapter server.
5. Tetapkan pemboleh ubah **server** dalam Vercel: `SARAH_RAG_INDEX_URL` = URL deployment `/exec`, `SARAH_RAG_TOKEN` = token yang sama. Kekalkan `GEMINI_API_KEY` dan konfigurasi dokumen sedia ada.
6. Redeploy website. Jangan masukkan token atau JSON indeks ke HTML/JavaScript browser.

Adapter ini hanya membaca indeks; tiada endpoint awam untuk menulis atau mencetuskan pengindeksan. Hanya dokumen yang dibenarkan untuk pengguna chatbot awam boleh mempunyai `audience: "public"`. Token melindungi stor indeks; ia **bukan** kawalan akses pengguna untuk dokumen dalaman.

## Kemas kini dan had

- Bina semula snapshot selepas tambah, ubah atau padam dokumen; muat naik versi baharu dan tukar `SARAH_RAG_FILE_ID` jika ID berubah. Padam rekod manifest yang tidak lagi digunakan. ID, hash kandungan dan lokasi petikan disimpan untuk menjejak versi.
- Status `archived` atau `replaced` dikecualikan daripada jawapan semasa. `reference` ialah lalai; `active` ialah metadata pentadbir, bukan semakan undang-undang automatik.
- Cache lima minit bagi setiap instance Vercel; permintaan serentak berkongsi satu muat turun pada instance itu. Selepas TTL, dokumen yang dibuang akan hilang daripada carian. Ini bukan cache/limiter global merentas semua instance.
- Stor indeks diberi empat saat, maksimum 8 MB / 5,000 dokumen / 15,000 petikan. Snapshot lebih 30 hari tidak digunakan. Jika melebihi had, pindahkan carian ke stor khusus; jangan menaikkan had tanpa mengukur memori dan masa proses.
- Jika stor gagal, tidak guna snapshot tamat tempoh secara senyap. Sarah diberitahu bahawa koleksi tidak tersedia, dan UI memaparkan status tersebut. Laluan rujukan lain masih tersedia. Kegagalan/kuota Gemini atau Google Apps Script masih boleh berlaku.
- Tiada jadual sync automatik dipasang. Jalankan semula pengindeks apabila kandungan berubah dan sekurang-kurangnya sebelum snapshot berumur 30 hari.

## Ujian

```sh
node --test tests/*.test.mjs
"$HOME/Documents/i4umanage-rag-tools/bin/python" -m unittest discover -s tests -p 'test_sarah_rag_ingest.py'
```

Selepas deploy, cuba soalan berdasarkan tajuk sebenar koleksi:

- “Dalam AKD [tajuk], apa tanggungjawab pegawai? Beri halaman rujukan.”
- “Terangkan keselamatan dokumen rahsia rasmi daripada slaid kursus.”
- “Apakah objektif dalam kertas kerja Kursus Design Thinking?”
- “Apakah punca kuasa [nombor pekeliling]? Adakah masih berkuat kuasa?”
- “Berapakah elaun lawatan ke planet Marikh?” — jangan reka jawapan atau rujukan koleksi.

Dalam respons `/api/gemini`, `i4uRag.status` perlu `ready`; `sources` mengandungi rujukan yang dipetik. `ready` sahaja tidak bermaksud jawapan disokong jika `retrievedCount`/`sources` kosong. Ujian tempatan menggunakan model palsu untuk memeriksa aliran kod; ketepatan jawapan model sebenar perlu diuji selepas konfigurasi produksi.

Dokumentasi: [pypdf: batasan ekstrak teks](https://pypdf.readthedocs.io/en/stable/user/extract-text.html), [Apps Script Web Apps](https://developers.google.com/apps-script/guides/web), [Content Service dan redirect](https://developers.google.com/apps-script/guides/content), [Vercel environment variables](https://vercel.com/docs/environment-variables).
