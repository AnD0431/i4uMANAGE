# Sarah AI Document Generator 2.0 — Kertas kerja

Versi ini menambah aliran borang untuk kertas kerja latihan/program. Struktur mengikut templat JKNT yang sudah digunakan dalam projek: seksyen 1–7 dan subseksyen 4.1–4.7.

## Cara guna

1. Buka Sarah dan tekan **Kertas Kerja 2.0**.
2. **Program:** isi nama, penganjur, tujuan, kaedah, tarikh, masa dan tempat. Objektif boleh diisi sendiri atau dicadangkan Sarah.
3. **Pelaksanaan:** isi sasaran dan bilangan peserta, penceramah serta urus setia. Jika ada penganjur bersama, isi justifikasi dan status persetujuan.
4. **Bajet:** pilih sama ada program melibatkan perbelanjaan. Jika ya, masukkan sumber peruntukan, status POL dan setiap perkara bajet. Jumlah = kuantiti × kekerapan/hari × kadar seunit. Maksimum 20 perkara.
5. Tekan **Jana draf dengan Sarah**. Fakta program dan jadual bajet dibina oleh kod; AI menyediakan huraian dalam Bahasa Melayu.
6. **Semak draf:** sunting latar belakang, objektif, kaedah, impak dan rumusan. Pratonton dikemas kini apabila huraian disunting.
7. Tekan **Muat turun Word** untuk fail `.docx`. Untuk PDF, tekan **Cetak / PDF**, kemudian **Cetak / Simpan sebagai PDF** dalam tetingkap baharu, dan pilih **Save as PDF** pada dialog cetakan pelayar.

**Simpan draf** menyimpan borang dan huraian pada pelayar/peranti ini sahaja. Ia bukan simpanan akaun atau Google Drive. Tekan Simpan selepas perubahan yang hendak dikekalkan. **Padam simpanan peranti** memadam salinan tersimpan; draf yang sedang terbuka masih ada.

Selepas mengubah fakta program atau bajet, jana semula sebelum eksport. Butang **Pulihkan versi sebelum jana semula** mengembalikan satu versi sebelumnya, termasuk suntingan huraian dan fakta asal. Sejarah satu versi ini hanya kekal semasa halaman masih terbuka.

Jika server gagal, tamat masa atau penjanaan dihentikan, borang dan draf sebelumnya kekal dalam halaman. Simpan draf sebelum refresh jika mahu mengekalkannya.

## Coding yang berubah

| Fail | Tanggungjawab |
| --- | --- |
| `js/paper-generator-core.js` | Peraturan medan, semakan tarikh/peserta, pengiraan wang dalam sen dan struktur dokumen JKNT. Digunakan oleh pelayar dan server. |
| `api/generate-paper.js` | Mengesahkan borang dan meminta lima medan huraian JSON daripada Gemini. Respons tidak lengkap ditolak. |
| `js/paper-generator.js` | Dialog empat langkah, simpan/pulih draf, suntingan, jana semula, batal dan kawalan eksport. |
| `js/paper-generator-export.js` | Pratonton HTML selamat, jadual Word sebenar, format A4, nombor halaman Word dan cetakan PDF. |
| `css/paper-generator.css` | Reka bentuk borang dan susun atur telefon. |
| `js/scripts.js` | Butang pantas Sarah membuka generator baharu. |
| Enam halaman HTML | Memuatkan CSS dan tiga skrip generator sebelum skrip Sarah. |
| `vercel.json` | Menetapkan `maxDuration: 60` bagi endpoint baharu. |

Contoh prinsip pengiraan:

```js
// RM12.50 disimpan sebagai 1250 sen, supaya jumlah tidak bergantung pada AI.
totalCents = quantity * multiplier * cents;
```

Contoh pemisahan tanggungjawab:

```js
const { value: form, issues } = SarahPaperCore.validate(input);
// Server hanya meneruskan permintaan AI apabila issues kosong.
const blocks = SarahPaperCore.blocks(form, narrative);
// blocks mengandungi tajuk, huraian, fakta, jadual bajet dan tandatangan.
```

AI tidak menentukan jumlah bajet. Huraian AI masih perlu disemak pengguna sebelum digunakan. Label “Belum ditentukan” dan ruang tandatangan kosong dikekalkan apabila maklumat tersebut belum tersedia.

## Mengaktifkan pada Vercel

1. Sertakan semua fail baharu dan perubahan HTML/JS/config dalam deployment projek.
2. Endpoint menggunakan `GEMINI_API_KEY` server yang sama dengan Sarah. Jangan masukkan kunci dalam HTML, JavaScript pelayar atau Git.
3. Jika mahu model khusus untuk generator, tetapkan `GEMINI_DOCUMENT_MODEL` kepada model Gemini yang tersedia pada akaun dan menyokong structured output. Jika tiada, kod menggunakan `GEMINI_MODEL`, kemudian nilai lalai sedia ada projek.
4. Redeploy, buka Sarah → **Kertas Kerja 2.0**, dan uji satu program contoh hingga eksport Word/PDF.
5. Jika penjanaan gagal, semak log endpoint `/api/generate-paper` pada Vercel serta konfigurasi model/kuota akaun Gemini.

Tiada perubahan diperlukan pada `Code.gs`, token RAG atau `index.json` untuk generator ini. Huraian versi ini berdasarkan maklumat borang; ia tidak mengambil atau mengesahkan pekeliling daripada RAG. Permintaan dokumen melalui teks chat masih menggunakan aliran sedia ada; borang 2.0 dibuka melalui butang pantas.

## Pengesahan pembangunan

- `node --test tests/*.test.mjs`: 72 ujian lulus, termasuk 9 ujian baharu generator dan ujian Sarah sedia ada.
- `python3 -m unittest discover -s tests -p 'test_*.py'`: 7 ujian RAG lulus.
- Pelayar: semakan medan wajib, jumlah RM381.00, suntingan, simpan/refresh, eksport Word, sekatan eksport selepas fakta berubah dan pemulihan versi diuji.
- Paparan 390 × 844: tiada limpahan melintang pada dialog, borang disusun satu lajur.
- Fail DOCX sebenar dijana menggunakan docx 8.5.0; jadual, nombor halaman dan susun atur dua halaman disemak selepas rendering.
- Ujian penjanaan menggunakan respons AI simulasi. Sambungan Gemini produksi dan penyimpanan PDF melalui dialog cetakan pengguna belum diuji secara langsung. Website belum dideploy oleh perubahan ini.

Had infrastruktur sedia ada masih terpakai: kawalan serentak dan cache pada serverless adalah per instance; ia bukan jaminan kapasiti merentas semua instance atau jaminan tiada kegagalan penyedia AI.
