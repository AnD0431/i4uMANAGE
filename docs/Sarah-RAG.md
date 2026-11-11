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

## Pembaikan AKD langsung — 3 November 2026

Indeks automatik `/api/akd-index` dan snapshot `index.json` RAG ialah **dua stor berasingan**. Status RAG `ready` tidak membuktikan fail AKD yang baru dimuat naik sudah ada di snapshot itu. Sebelum pembaikan, selector terus melangkau indeks AKD apabila RAG dikonfigurasi; permintaan `senaraikan semua AKD` pula dihantar ke model.

Laluan AKD kini menggunakan `lib/sarah-akd-live.js`:

- Senarai AKD diambil daripada katalog Apps Script `source: akd`, tanpa model, PDF atau snapshot RAG. Arahan senarai dalam chat menggunakan Universal Smart Search dengan pagination; API Gemini turut menyokong klien lama tanpa memerlukan kunci model untuk menyenaraikan fail.
- Untuk soalan kandungan AKD, katalog semasa menentukan fail yang masih wujud. Tajuk serta metadata daripada `source: akd-index` memilih maksimum tiga fail relevan. Ringkasan indeks hanya digunakan untuk pemilihan jika `updatedAt` sama; ia bukan bukti untuk jawapan.
- PDF semasa dimuat turun dan dibekalkan kepada model. Petikan AKD daripada snapshot lama tidak dicampurkan dengan PDF semasa. Fail yang tidak dapat dibaca menghasilkan mesej khusus, bukan dakwaan kandungan sudah disemak.
- Katalog dan metadata indeks dicache 30 saat setiap instance; permintaan serentak berkongsi satu bacaan. Apabila cache luput, permintaan berikutnya membaca semula Apps Script. Ini bukan tugas latar berjadual dan bukan jaminan siap indeks dalam 30 saat. Proses indeks automatik sedia ada masih menentukan bila ringkasan metadata tersedia.
- Tidak perlu membina semula Python RAG untuk menyenaraikan atau membaca PDF AKD melalui laluan ini. Snapshot RAG bagi carian kandungan umum/koleksi lain masih perlu dikemas kini seperti di atas. Fail bukan PDF masih boleh disenaraikan, tetapi laluan bacaan langsung ini hanya menyokong PDF boleh dicapai oleh server, maksimum 8 MB setiap fail.
- Jika tajuk/topik terlalu umum atau tidak sepadan, Sarah meminta tajuk/nombor AKD; ia tidak mendakwa membaca semua fail. Dokumen terpilih sahaja dibaca.

### Selepas deploy

Deploy semua fail yang berubah bersama-sama; tiada perubahan `Code.gs`, folder Drive, token atau pemboleh ubah tambahan diperlukan bagi konfigurasi sedia ada. Halaman HTML menggunakan versi aset `akd-live2` untuk memuat kod frontend baharu.

1. Refresh laman dan tanya `senaraikan semua AKD` — senarai perlu memaparkan enam fail semasa, termasuk AKD Bil. 5 Tahun 2026 (bilangan berubah jika folder dikemas kini).
2. Tanya `Terangkan AKD Bil 5 2026 kawalan perbelanjaan` — jawapan perlu menyertakan rujukan fail baharu yang betul.
3. Selepas muat naik seterusnya, tunggu cache katalog luput dan semak semula. Jika fail tersenarai tetapi tidak boleh dibaca, semak format/saiz dan akses muat turun yang diluluskan; jangan melonggarkan akses dokumen terhad semata-mata untuk chatbot awam.

Semakan baca sahaja pada 3 November 2026: API produksi menyenaraikan enam AKD, fail baharu berstatus indeks `ready`, dan permintaan byte awal fail baharu mengesahkan tandatangan PDF. Ini tidak menguji jawapan Gemini produksi. Ujian automatik menggunakan model palsu; ujian antaramuka tempatan menggunakan salinan metadata katalog sebenar.

## Pemilihan sumber soalan — 11 November 2026

Mod AKD kini ditentukan oleh **soalan pengguna terkini yang menyebut AKD secara jelas**, bukan padanan kata kunci indeks, `akd_mode` daripada klien lama, atau ID dokumen terpilih. Soalan umum seperti `berapa hari cuti rehat tahunan yang layak untuk jawatan gred 41` menggunakan laluan semakan sumber kerajaan yang berkaitan (JPA/MyPPSM). Soalan yang meminta rujukan AKD secara jelas masih menggunakan katalog dan PDF semasa.

Browser tidak lagi memanggil selector AKD untuk setiap mesej. Endpoint selector turut mengembalikan `retrieval: not-requested` tanpa akses rangkaian bagi soalan umum, supaya klien lama tidak memaksa mod AKD. Dalam mod kerajaan umum, petikan AKD yang kebetulan sepadan dikecualikan daripada konteks jawapan. Sejarah jawapan AKD tidak menentukan skop topik baharu. Penafian biasa seperti `jangan guna AKD` juga dihormati.

Ujian regresi menggunakan ayat sebenar daripada laporan pengguna, termasuk keadaan klien menghantar flag AKD lama, ID terpilih, sejarah AKD, dan petikan RAG AKD yang sepadan. Model dan hasil carian rasmi dimock untuk menguji laluan kod; ujian ini tidak mengesahkan kadar cuti sebenar atau jawapan model produksi. Deploy backend dan keenam-enam halaman bersama aset `source-routing1`, kemudian refresh browser.
