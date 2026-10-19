# Sarah AI Document Analyzer

Analyzer membaca dokumen yang dipilih untuk menghasilkan ringkasan, isi penting dan jawapan kepada soalan pengguna. Ia menyokong kandungan umum, termasuk kertas kerja, panduan, pekeliling dan bahan latihan dalam format PDF berteks, DOCX atau TXT UTF-8.

## Cara menggunakan

1. Buka **Sarah → Analisis Dokumen** pada mana-mana enam halaman portal.
2. Pilih satu fail PDF, Word `.docx` atau `.txt`.
3. Tunggu pembacaan selesai. Buka **Teks sumber** untuk menyemak kandungan yang berjaya diekstrak.
4. Tekan **Analisis dokumen** untuk ringkasan dan isi penting.
5. Buka label lokasi di bawah setiap jawapan untuk melihat petikan. **Lihat teks sumber** membawa ke halaman/perenggan/baris berkaitan.
6. Buka **Soal jawab**, tulis soalan lengkap dan tekan **Tanya Sarah**. Contoh: “Apakah tindakan yang perlu diambil menurut dokumen ini?”
7. Tekan **Muat turun laporan** untuk laporan teks `.txt` yang mengandungi ringkasan, soal jawab dan petikan sumber.

Setiap soalan dibaca secara berasingan. Nyatakan subjek dengan jelas; jangan hanya tulis “yang itu pula?”. Jika dokumen tidak menyediakan maklumat yang mencukupi, jawapan memaklumkan bahawa maklumat tidak ditemui.

## Had dan penyimpanan

- Satu dokumen aktif pada satu masa. Pemilihan fail baharu mengosongkan hasil dan soal jawab fail sebelumnya.
- Had fail 10 MB, PDF 60 halaman, teks 60,000 aksara dan 300 bahagian. Fail yang melebihi had ditolak; kandungan tidak dipotong secara senyap.
- Maksimum 20 soalan dalam sesi. Muat turun laporan dan padam soal jawab untuk meneruskan.
- PDF menggunakan nombor halaman. DOCX menggunakan perenggan teks yang diekstrak, bukan halaman Word. TXT menggunakan julat baris.
- Imej, carta dan susun atur visual tidak dianalisis. Susun atur jadual mungkin hilang semasa pengekstrakan; semak fail asal untuk jadual kompleks. PDF imbasan tanpa lapisan teks memerlukan OCR terlebih dahulu. PDF bercampur teks/imbasan menyenaraikan halaman tanpa teks.
- Dokumen dan hasil disimpan dalam memori halaman sahaja. Menutup dialog mengekalkan sesi selagi halaman tidak direfresh. Refresh atau **Kosongkan dokumen** memadam sesi tempatan.
- Fail asal dibaca dalam pelayar. Apabila Analisis/Tanya ditekan, teks dihantar ke endpoint server dan perkhidmatan Gemini. Kod aplikasi ini tidak menyimpan fail ke Drive atau pangkalan data dan tidak mencatat kandungannya dalam log. Dasar penyimpanan penyedia AI masih bergantung pada akaun/perkhidmatan yang digunakan.
- Analyzer menerangkan kandungan dokumen; ia tidak mengesahkan kesahihan, kelulusan atau sama ada sesuatu pekeliling masih berkuat kuasa. Ia tidak mencari sumber web atau RAG luar dalam aliran ini.

## Penerangan coding

| Fail | Peranan |
| --- | --- |
| `js/document-analyzer-reader.js` | Membaca PDF, DOCX dan TXT pada peranti; semakan had dan makluman halaman tanpa teks. |
| `js/document-analyzer-docx-worker.js` | Mengekstrak teks Word dalam worker supaya boleh dibatalkan tanpa menyekat antaramuka. |
| `js/document-analyzer-core.js` | Membina ID sumber, mengesahkan input, memadankan petikan AI dan menyusun laporan teks. |
| `api/analyze-document.js` | Prompt server, skema respons JSON, semakan hasil dan pengendalian kegagalan Gemini. |
| `js/document-analyzer.js` | Dialog, navigasi ringkasan/soal jawab/sumber, pembatalan dan muat turun laporan. |
| `css/document-analyzer.css` | Dialog berpusat pada desktop dan telefon, dengan sentuhan glassmorphism ringan. |
| `js/scripts.js` dan enam HTML | Butang pantas serta pemuatan fail Analyzer. |
| `vendor/analyzer/` | PDF.js dan Mammoth versi tetap, dihoskan bersama website dan dimuatkan apabila diperlukan. |

Aliran data:

```text
Fail → pembaca tempatan → unit teks ber-ID
     → /api/analyze-document → Gemini JSON
     → semakan petikan dengan teks asal → paparan & laporan
```

Contoh peraturan utama dalam `document-analyzer-core.js`:

```js
if (!unit || !normalize(unit.text).includes(normalize(quote))) {
    throw new Error('Petikan AI tidak sepadan dengan dokumen.');
}
```

Semakan ini mengesahkan bahawa petikan wujud dalam unit yang dirujuk. Ia tidak membuktikan bahawa tafsiran AI semestinya betul; pengguna masih boleh membuka petikan untuk menyemak maksudnya. Hasil dengan ID palsu, petikan rekaan atau format tidak lengkap ditolak, dan pengguna boleh cuba semula.

Kandungan dokumen dianggap data dalam prompt, bukan arahan. Teks dipaparkan menggunakan `textContent`, bukannya HTML dokumen yang boleh melaksanakan skrip. Endpoint membina arahan sendiri dan tidak menggunakan arahan sistem yang dihantar klien.

## Deployment

1. Sertakan semua fail baharu, folder `vendor/analyzer/`, perubahan HTML/JS dan `vercel.json` dalam deployment.
2. Endpoint menggunakan `GEMINI_API_KEY` server sedia ada. Pilihan `GEMINI_ANALYZER_MODEL` boleh menetapkan model khusus yang tersedia pada akaun dan menyokong structured output; jika tiada, ia menggunakan `GEMINI_MODEL` kemudian nilai lalai projek.
3. Endpoint baharu mempunyai `maxDuration: 60`. Pengendalian masa tamat dan percubaan semula menggunakan modul Sarah sedia ada.
4. Tiada perubahan diperlukan pada `Code.gs`, token RAG atau `index.json`.
5. Selepas redeploy, uji dengan dokumen contoh yang tidak mengandungi data sensitif, semak petikan dan muat turun laporan.

## Pengesahan pembangunan

- 82 ujian Node lulus, termasuk 10 ujian Analyzer; 7 ujian Python RAG lulus.
- Ujian baharu meliputi had input, rujukan baris/perenggan, petikan rekaan, rujukan silang dokumen, soalan tiada jawapan, payload server dan respons AI tidak lengkap.
- PDF berteks dan DOCX sebenar serta TXT diuji dalam pelayar; PDF tanpa teks ditolak dengan arahan OCR.
- Aliran ringkasan, buka sumber, soal jawab, maklumat tidak ditemui dan ralat server diuji menggunakan respons AI simulasi.
- Laporan `.txt` dimuat turun dalam pelayar dan kandungannya disemak. Dialog diuji pada saiz telefon 390 × 844 tanpa limpahan melintang.
- Gemini produksi belum dipanggil dalam pengesahan ini. Kualiti rumusan sebenar perlu diperiksa selepas deployment menggunakan model/kuota akaun sebenar.

Rujukan pustaka: [PDF.js](https://mozilla.github.io/pdf.js/examples/), [Mammoth](https://github.com/mwilliamson/mammoth.js).
