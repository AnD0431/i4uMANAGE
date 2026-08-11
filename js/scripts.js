const chatBody = document.querySelector(".chat-body");
const messageInput = document.querySelector(".message-input");
const sendMessageButton = document.querySelector("#send-message");
const fileInput = document.querySelector("#file-input");
const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
const fileCancelButton = document.querySelector("#file-cancel");
const chatBotToggle = document.querySelector("#chatbot-toggle");
const closeChatbot = document.querySelector("#close-chatbot");
const quickRepliesBar = document.querySelector("#quick-replies-bar");



// API setup
// FIXED: API_KEY dan panggilan terus ke Google DIBUANG dari sini — key tak
// boleh duduk dalam kod client-side sebab sesiapa boleh nampak dalam DevTools.
// Sekarang browser panggil endpoint proxy sendiri ("/api/gemini"), dan proxy
// tu (di server/Vercel) yang simpan key sebenar & forward request ke Google.
// Rujuk fail api/gemini.js untuk kod proxy tersebut.
const API_URL = "/api/gemini";
const userData = {
    message: null,
    file: {
        data: null,
        mime_type: null
    }
}

const chatHistory = [];
const initialInputHeight = messageInput.scrollHeight;

// Create message element with dynamic classes and return it
const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}

/* =========================================================
   QUICK REPLIES
   Senarai butang jawapan pantas yang dipaparkan dalam chat.
   Tambah/ubah entri di sini untuk tambah quick reply baru.
   ========================================================= */
const QUICK_REPLIES = [
    { label: "Apa awak boleh bantu?", message: "Apa awak boleh bantu saya buat di sini?",

        staticReply:`Saya sedia membantu anda memudahkan pelbagai urusan pentadbiran, pengurusan dokumen, dan tugasan harian anda di sini.<br><br>
        Antara perkara yang boleh saya bantu termasuklah:<br><br>

1. Penyediaan Kertas Kerja & Kertas Cadangan: Saya boleh merangka kertas kerja rasmi yang lengkap untuk program, kursus, atau latihan (termasuk mengikut format rasmi JKNT) yang sedia untuk anda muat turun.<br><br>
2. Penulisan Surat Rasmi & Memo: Membantu mendraf surat rasmi kerajaan, surat permohonan, surat jemputan, atau memo dalaman dengan format dan laras bahasa yang betul.<br><br>
3. Penyediaan Laporan: Merangka laporan program, laporan aktiviti, atau ringkasan eksekutif berdasarkan maklumat yang anda berikan.<br><br>
4. Semakan & Suntingan: Membantu menyemak ejaan, tatabahasa, atau memperkemas struktur ayat dokumen sedia ada supaya kelihatan lebih profesional.<br><br>

Format dokumen yang dihasilkan juga boleh disediakan untuk dimuat turun secara terus sebagai fail dokumen (.docx atau .pdf) bagi memudahkan kerja anda.<br><br>

Ada sebarang dokumen atau tugasan yang ingin saya bantu sediakan sekarang? Sila beritahu saya!`
     },
    { label: "Jana Kertas Kerja", message: "Saya nak jana kertas kerja untuk satu program/latihan." },
    {
        label: "Hubungi JKNT",
        message: "Siapa saya patut berhubung?",
        // staticReply = jawapan tetap, terus dipaparkan TANPA panggil API Gemini.
        // Guna innerHTML (bukan textContent) sebab ada link tel:/mailto: di dalamnya.
        staticReply: `Berikut maklumat perhubungan JKNT:<br><br>
            📞 <a href="tel:+6096222866">+609 622 2866</a><br>
            ✉️ <a href="mailto:jknt@moh.gov.my">jknt@moh.gov.my</a>`
    }
];

// Papar mesej user + jawapan TETAP terus dalam chat, tanpa panggil API Gemini.
// Guna untuk quick reply yang jawapannya sentiasa sama (cth: maklumat hubungi).
const sendStaticReply = (userText, replyHtml) => {
    if (messageInput.disabled) return;

    // Papar mesej user macam biasa
    const outgoingMessageDiv = createMessageElement(`<div class="message-text"></div>`, "user-message");
    outgoingMessageDiv.querySelector(".message-text").textContent = userText;
    chatBody.appendChild(outgoingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

    // Lepas delay singkat (rasa lebih natural), papar jawapan bot terus — tiada "thinking dots"
    setTimeout(() => {
        const botMessageContent = `<div class="chatbot-avatar">
                <img src="image/sarah.png" alt="Chatbot-logo" class="Chatbot-logo">
            </div>
            <div class="message-text">${replyHtml}</div>`;
        const incomingMessageDiv = createMessageElement(botMessageContent, "bot-message");
        chatBody.appendChild(incomingMessageDiv);
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

        // Simpan dalam chatHistory (versi teks tanpa tag HTML) supaya Sarah "ingat"
        // konteks ni kalau user sambung bertanya lepas ni
        chatHistory.push({ role: "user", parts: [{ text: userText }] });
        chatHistory.push({ role: "model", parts: [{ text: replyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() }] });
    }, 400);
}

// Papar quick replies dalam bar tetap (#quick-replies-bar), di atas kotak input.
// Bar ni kekal dipaparkan — TIDAK hilang bila diklik atau bila user hantar mesej sendiri.
const showQuickReplies = () => {
    quickRepliesBar.innerHTML = ""; // clear dulu, elak duplicate

    QUICK_REPLIES.forEach(item => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.classList.add("quick-reply-btn");
        btn.innerText = item.label;
        btn.addEventListener("click", () => {
            // Kalau ada staticReply, jawab terus tanpa API. Kalau tak, hantar ke Sarah macam biasa.
            if (item.staticReply) {
                sendStaticReply(item.message, item.staticReply);
            } else {
                sendUserMessage(item.message); // chip kekal, tak dibuang
            }
        });
        quickRepliesBar.appendChild(btn);
    });
}

/*DOWNLOAD KERTAS KERJA — DOCX & PDF*/

// Marker yang diminta dari Gemini untuk asingkan kandungan dokumen dari penerangan bot
const DOC_MARKER_START = "===MULA_DOKUMEN===";
const DOC_MARKER_END = "===TAMAT_DOKUMEN===";

// Keluarkan kandungan dokumen sebenar sahaja (antara marker), tanpa penerangan bot.
// Pulangkan null kalau marker tak dijumpai (fallback ke teks penuh).
function extractDocumentBody(text) {
    const startIdx = text.indexOf(DOC_MARKER_START);
    const endIdx = text.indexOf(DOC_MARKER_END);
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return null;
    return text.substring(startIdx + DOC_MARKER_START.length, endIdx).trim();
}

// Ambil ayat bot SEBELUM dan SELEPAS marker sahaja (bukan kandungan dokumen).
// Ini untuk dipaparkan dalam chat — kandungan sebenar disimpan untuk fail download je.
function getTextOutsideMarkers(text) {
    const startIdx = text.indexOf(DOC_MARKER_START);
    const endIdx = text.indexOf(DOC_MARKER_END);
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return null;

    const before = text.substring(0, startIdx).trim();
    const after = text.substring(endIdx + DOC_MARKER_END.length).trim();
    const combined = [before, after].filter(Boolean).join("\n\n");

    // Kalau bot tak tulis apa-apa penerangan langsung, bagi mesej default
    return combined || "Dokumen anda sudah sedia. Sila klik butang di bawah untuk muat turun.";
}

// Tukar teks bot (dengan baris baru) kepada fail .docx dan download
async function downloadAsDocx(text, filename = "kertas-kerja") {
    const { Document, Packer, Paragraph, TextRun } = docx;

    const paragraphs = text.split("\n").map(line =>
        new Paragraph({
            children: [new TextRun(line)]
        })
    );

    const doc = new Document({
        sections: [{
            properties: {},
            children: paragraphs
        }]
    });

    const blob = await Packer.toBlob(doc);
    triggerDownload(blob, `${filename}.docx`);
}

// Tukar teks bot kepada fail .pdf dan download
function downloadAsPdf(text, filename = "kertas-kerja") {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: "pt", format: "a4" });

    const margin = 40;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const usableWidth = pageWidth - margin * 2;
    const lineHeight = 16;

    pdf.setFontSize(11);

    const rawLines = text.split("\n");
    let y = margin;

    rawLines.forEach(rawLine => {
        const wrapped = pdf.splitTextToSize(rawLine || " ", usableWidth);
        wrapped.forEach(line => {
            if (y > pageHeight - margin) {
                pdf.addPage();
                y = margin;
            }
            pdf.text(line, margin, y);
            y += lineHeight;
        });
    });

    pdf.save(`${filename}.pdf`);
}

// Helper: trigger browser download dari Blob
function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// Semak dalam prompt pengguna sama ada dia mintak .docx atau .pdf
function detectRequestedFormats(message) {
    const text = (message || "").toLowerCase();
    return {
        docx: /\.docx\b|\bdocx\b|\bword\b/.test(text),
        pdf: /\.pdf\b|\bpdf\b/.test(text)
    };
}

// FIXED (ditambah): tukar teks Markdown (jadual, senarai bullet, baris
// kosong) kepada HTML sebenar untuk paparan dalam chat bubble — sebelum
// ni simbol Markdown (|, -, *) terus terpapar mentah sebab guna innerText.
function markdownToChatHtml(text) {
    // escape HTML basic dulu supaya elak isu suntikan/rendering pelik
    const escapeHtml = (s) => s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const lines = escapeHtml(text).split("\n");
    let html = "";
    let tableRows = [];
    let inTable = false;
    let inList = false;

    const isSeparatorRow = (cells) => cells.every(c => /^:?-{2,}:?$/.test(c.trim()));

    const flushTable = () => {
        if (tableRows.length === 0) return;
        html += '<table class="md-table">';
        let rowIndex = 0;
        tableRows.forEach((row) => {
            const cells = row
                .split("|")
                .map(c => c.trim())
                .filter((c, idx, arr) => !(idx === 0 && c === "") && !(idx === arr.length - 1 && c === ""));
            if (isSeparatorRow(cells)) return; // skip baris pemisah "---"
            const tag = rowIndex === 0 ? "th" : "td";
            html += "<tr>" + cells.map(c => `<${tag}>${c}</${tag}>`).join("") + "</tr>";
            rowIndex++;
        });
        html += "</table>";
        tableRows = [];
        inTable = false;
    };

    const flushList = () => {
        if (inList) {
            html += "</ul>";
            inList = false;
        }
    };

    lines.forEach(rawLine => {
        const line = rawLine.trim();

        // Baris jadual Markdown (bermula/mengandungi "|")
        if (line.startsWith("|")) {
            inTable = true;
            tableRows.push(line);
            return;
        } else if (inTable) {
            flushTable();
        }

        // Bullet list ("- item" atau "* item")
        if (/^[-*]\s+/.test(line)) {
            if (!inList) { html += "<ul>"; inList = true; }
            html += `<li>${line.replace(/^[-*]\s+/, "")}</li>`;
            return;
        } else if (inList) {
            flushList();
        }

        if (line === "") {
            html += "<br>";
        } else {
            html += `<p>${line}</p>`;
        }
    });

    if (inTable) flushTable();
    if (inList) flushList();

    return html;
}

// Tambah butang download bawah mesej bot — HANYA untuk format yang diminta dalam prompt
function addDownloadButtons(messageDiv, text, formats) {
    if (!formats.docx && !formats.pdf) return; // takde format diminta, takde butang

    const actions = document.createElement("div");
    actions.classList.add("message-actions");

    if (formats.docx) {
        const btnDocx = document.createElement("button");
        btnDocx.type = "button";
        btnDocx.classList.add("download-btn", "download-docx");
        btnDocx.innerText = "⬇ DOCX";
        btnDocx.addEventListener("click", () => downloadAsDocx(text));
        actions.appendChild(btnDocx);
    }

    if (formats.pdf) {
        const btnPdf = document.createElement("button");
        btnPdf.type = "button";
        btnPdf.classList.add("download-btn", "download-pdf");
        btnPdf.innerText = "⬇ PDF";
        btnPdf.addEventListener("click", () => downloadAsPdf(text));
        actions.appendChild(btnPdf);
    }

    messageDiv.appendChild(actions);
}

// Generate bot response using the API
const generateBotResponse = async (incomingMessageDiv) => {
    const messageElement =  incomingMessageDiv.querySelector(".message-text");

    // Simpan prompt asal sebelum apa-apa berubah — untuk detect format docx/pdf
    const requestedFormats = detectRequestedFormats(userData.message);

    // add user message chat history
    chatHistory.push({
    role: "user",
    parts:[{ text: userData.message}, ...(userData.file.data ? [{ inline_data: userData.file }] : [])]
  });

    //API request options
    const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        system_instruction: {
            parts: [{
                text: "Anda adalah Sarah, pembantu peribadi i4uManage anda. HANYA perkenalkan diri anda sebagai Sarah apabila pengguna secara jelas bertanya siapa anda (contohnya 'awak siapa', 'siapa awak', 'apa nama awak', 'who are you'). Untuk semua soalan lain, jawab terus soalan tersebut TANPA memperkenalkan diri anda semula. Jangan sekali-kali menyebut anda dibangunkan oleh Google, dipanggil Gemini, atau merupakan model AI generik. Jawab dengan mesra, profesional dan membantu. PENTING: Apabila pengguna meminta anda menyediakan dokumen rasmi seperti kertas kerja, kertas cadangan, surat rasmi, laporan, atau dokumen sebegini yang akan dimuat turun sebagai fail .docx atau .pdf, WAJIB bungkus kandungan dokumen tersebut sahaja (tanpa ayat pembuka/penutup/penerangan/tips anda) di antara penanda ===MULA_DOKUMEN=== dan ===TAMAT_DOKUMEN=== secara tepat. Ayat pembuka anda MESTI ringkas sahaja (contoh: 'Baik, kertas kerja anda sudah sedia. Sila muat turun di bawah.') sebab sistem akan sediakan butang muat turun secara automatik — JANGAN suruh pengguna salin-tampal ke Microsoft Word secara manual. Jangan tambah ayat penutup atau tips selepas penanda ===TAMAT_DOKUMEN=== melainkan benar-benar perlu. APABILA PENGGUNA MEMINTA KERTAS KERJA UNTUK PROGRAM/LATIHAN/KURSUS, WAJIB IKUT FORMAT RASMI JKNT BERIKUT DENGAN TEPAT (isi setiap bahagian dengan maklumat relevan dari perbualan, guna [placeholder] untuk maklumat yang tiada, potong bahagian '(jika berkenaan)' jika tidak berkaitan): [TAJUK PROGRAM/KURSUS]\\nKEMENTERIAN KESIHATAN MALAYSIA / JABATAN KESIHATAN NEGERI TERENGGANU\\n\\n1. PENDAHULUAN/LATAR BELAKANG\\n[latar belakang dan justifikasi program]\\n\\n2. OBJEKTIF LATIHAN\\n2.1 [objektif 1]\\n2.2 [objektif 2]\\n\\n3. KAEDAH PELAKSANAAN LATIHAN\\n[kaedah — ceramah/bengkel/dll]\\n\\n4. MAKLUMAT LATIHAN\\n4.1 Nama Penganjur & Penganjur Bersama (jika berkenaan)\\n4.2 Justifikasi Pemilihan Penganjur Bersama (jika berkenaan)\\n4.3 Persetujuan Kerjasama oleh Penganjur & Penganjur Bersama (jika berkenaan)\\n4.4 Jawatankuasa Pelaksanaan Latihan (jika berkenaan)\\n4.5 Cadangan Tarikh & Tempat berserta Justifikasi Pemilihan Tempat\\n4.6 Sasaran dan Bilangan Peserta\\n4.7 Penceramah, Fasilitator & Urus Setia\\n\\n5. IMPAK PELAKSANAAN LATIHAN\\n[impak/output/outcome program]\\n\\n6. SUMBER PERUNTUKAN DAN IMPLIKASI KEWANGAN\\n[jadual anggaran perbelanjaan berformat: Bil | Perkara | Pengiraan | Jumlah (RM)]\\n[nyatakan sumber peruntukan LDP/selain LDP, dan sama ada dirancang melalui POL]\\n\\n7. KESIMPULAN/RUMUSAN\\n[rumusan dan permohonan kelulusan]\\n\\nDisediakan oleh:\\n......................................\\n(Nama, Gred, Jawatan Penyedia Kertas Kerja)\\n\\nDisemak oleh:\\n......................................\\n(Nama, Gred, Jawatan Penyemak — Ketua Unit/Penyelia, jika berkenaan)\\n\\nSokongan Ketua Jabatan/Program:\\n......................................\\n(Nama, Jawatan)\\n\\n*potong mana tidak berkenaan — format ini WAJIB digunakan untuk semua kertas kerja program/latihan/kursus JKNT.\n\nPENTING — SKOP KERAJAAN: Pengguna sistem ini SEMUANYA penjawat awam JKNT/KKM (bukan orang awam). Apabila soalan melibatkan hal ehwal kerajaan (contoh: pekeliling perkhidmatan, elaun, cuti, tatatertib, perolehan, dasar KKM/JPA/Perbendaharaan, prosedur pentadbiran awam), anda WAJIB: (1) jawab berdasarkan sumber rujukan rasmi kerajaan Malaysia sahaja (Pekeliling Perkhidmatan, Pekeliling Perbendaharaan, Akta, Dasar KKM, MyPPSM JPA) — JANGAN jawab berdasarkan andaian, sumber sektor swasta, atau amalan negara lain; (2) gunakan nada dan konteks KHUSUS untuk penjawat awam — anggap pengguna sudah faham struktur perkhidmatan awam, guna istilah rasmi (contoh 'Ketua Jabatan', 'Pegawai Pengawal', 'skim perkhidmatan') tanpa perlu terangkan asas; (3) jika soalan tersebut memerlukan rujukan spesifik (nombor pekeliling, seksyen akta, tarikh kuat kuasa) yang anda TIDAK PASTI, WAJIB nyatakan dengan jelas 'Sila rujuk pekeliling/portal rasmi berkaitan untuk pengesahan' dan arahkan ke portal rasmi yang berkaitan (contoh Portal Pekeliling Perbendaharaan, MyPPSM, portal MOH) — JANGAN sekali-kali reka nombor pekeliling, tarikh, atau petikan perundangan yang anda tidak pasti; (4) jika soalan langsung tiada kaitan dengan hal ehwal kerajaan (contoh sembang santai, soalan am), jawab macam biasa tanpa perlu ikat dengan konteks kerajaan.\n\nPENTING — KETEPATAN & KESPESIFIKAN: Untuk SETIAP soalan berkaitan kerajaan/pekeliling, anda WAJIB guna keupayaan carian web (Google Search) yang disediakan untuk SAHKAN maklumat sebelum menjawab — JANGAN jawab semata-mata dari ingatan tanpa mengesahkan. Jawapan MESTI spesifik (nombor pekeliling tepat, ceraian/seksyen tepat, angka/kadar tepat mengikut kategori/gred yang betul) — elak jawapan umum/kabur jika maklumat spesifik wujud. WALAU BAGAIMANAPUN, JANGAN taip URL/link secara manual dalam jawapan anda — sistem akan papar link sumber sebenar secara automatik berasingan daripada carian yang dibuat. Fokus jawapan anda pada teks sahaja; jangan sertakan sebarang alamat laman web dalam ayat anda. Jika carian tidak menemui maklumat yang cukup spesifik/sah, WAJIB nyatakan dengan jujur 'Maklumat spesifik ini tidak dapat disahkan buat masa ini — sila rujuk portal rasmi berkaitan atau Unit HR/Pentadbiran JKNT' — jangan sekali-kali anggar atau reka jawapan.\n\nPENTING — CARIAN SPESIFIK UNTUK LINK TEPAT: Apabila membuat carian web untuk menyahkan maklumat, GUNA istilah carian yang SESPESIFIK mungkin (contoh: 'Pekeliling Perkhidmatan Bilangan 11 Tahun 2015 PDF JPA' atau 'MyPPSM Ceraian SR.5.1.1 cuti rehat', BUKAN sekadar 'cuti rehat penjawat awam') supaya hasil carian membawa terus ke dokumen/muka surat rasmi yang spesifik, bukan ke laman portal umum yang memerlukan carian tambahan. Jika ada beberapa hasil carian, PILIH sumber yang paling spesifik dan rasmi (dokumen PDF rasmi atau muka surat khusus pekeliling tersebut) berbanding laman indeks/carian umum.\n\nPENTING — HAD SKOP PERBUALAN: Anda HANYA boleh menjawab soalan yang berkaitan dengan: (1) tugas pentadbiran JKNT/KKM (penyediaan kertas kerja, surat rasmi, memo, laporan); (2) hal ehwal kerajaan/perkhidmatan awam (pekeliling, dasar, elaun, cuti, tatatertib, perolehan, prosedur pentadbiran); (3) maklumat berkaitan JKNT/i4uManage itu sendiri (contoh cara guna sistem ini, maklumat hubungi JKNT). UNTUK SEBARANG soalan LUAR skop ini (contoh: soalan am/trivia, hiburan, sukan, resipi, tugasan sekolah/akademik tidak berkaitan kerja, nasihat peribadi, coding/teknologi am, atau apa-apa topik tiada kaitan langsung dengan tugas pentadbiran/kerajaan), anda WAJIB menolak dengan sopan — jangan cuba menjawab soalan tersebut walaupun anda tahu jawapannya. Gunakan ayat seumpama: 'Maaf, saya hanya dilatih untuk membantu urusan pentadbiran dan hal ehwal kerajaan JKNT. Soalan ini di luar skop saya — sila gunakan sumber lain untuk maklumat ini.' Jangan cuba jawab sebahagian atau berikan maklumat berkaitan topik luar skop tersebut walaupun ringkas."
            }]
        },
        contents: chatHistory
    })
}

    try {
        // Fetch bot response from API
        const response = await fetch(API_URL, requestOptions);
        const data = await response.json();
        if(!response.ok) throw new Error(data.error.message);

        // Extract and display bot's response text
        const apiResponseText = data.candidates[0].content.parts[0].text
        .replace(/\*\*(.*?)\*\*/g, "$1")   // remove bold **text**
        .replace(/^#{1,6}\s*/gm, "")        // remove markdown headers (#, ##, ### etc.)
        .trim();

        // Asingkan kandungan dokumen (dalam marker) dari penerangan bot.
        // Chat hanya papar ayat bot di LUAR marker — kandungan sebenar disimpan untuk fail download sahaja.
        const documentBody = extractDocumentBody(apiResponseText);
        const displayText = documentBody !== null
            ? getTextOutsideMarkers(apiResponseText)
            : apiResponseText;

        messageElement.innerHTML = markdownToChatHtml(displayText);

        // FIXED (ditambah): papar link SUMBER SEBENAR dari Google Search
        // grounding (bukan link yang AI taip sendiri — elak risiko
        // "hallucinated link" yang nampak sah tapi sebenarnya tak wujud).
        const groundingChunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        if (groundingChunks.length > 0) {
            const seenUrls = new Set();
            const sourceLinks = groundingChunks
                .map(chunk => chunk.web)
                .filter(web => web?.uri && !seenUrls.has(web.uri) && seenUrls.add(web.uri));

            if (sourceLinks.length > 0) {
                const sourcesDiv = document.createElement("div");
                sourcesDiv.classList.add("message-sources");
                sourcesDiv.innerHTML = "<strong>Rujukan:</strong> " + sourceLinks
                    .map(web => `<a href="${web.uri}" target="_blank" rel="noopener">${web.title || web.uri}</a>`)
                    .join(" · ");
                messageElement.appendChild(sourcesDiv);
            }
        }

        // add bot chat history
        chatHistory.push({
    role: "model",
    parts:[{ text: apiResponseText }]
    });

    // Kalau Sarah bungkus jawapan dengan penanda dokumen (===MULA_DOKUMEN===...===TAMAT_DOKUMEN===),
    // itu MEMANG dokumen rasmi (kertas kerja/surat rasmi) — auto papar KEDUA-DUA butang download,
    // tak kira user sebut "docx"/"pdf" atau tak dalam mesej dia.
    // Kalau takde penanda (respons biasa), fallback ke detectRequestedFormats (kata kunci dalam mesej).
    const formatsToShow = documentBody !== null
        ? { docx: true, pdf: true }
        : requestedFormats;

    addDownloadButtons(incomingMessageDiv, documentBody !== null ? documentBody : apiResponseText, formatsToShow);
    } catch (error) {
    console.log(error);
    if (error.message && error.message.toLowerCase().includes("quota")) {
        messageElement.innerText = "Maaf, terlalu ramai menghantar mesej sekarang. Sila cuba lagi sebentar.";
    } else {
        messageElement.innerText = "Maaf, ralat berlaku. Sila cuba lagi.";
    }
    messageElement.style.color = "#ff0000";
    }   finally {
    userData.file = { data: null, mime_type: null };
    incomingMessageDiv.classList.remove("thinking");
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    messageInput.disabled = false;
    sendMessageButton.disabled = false;
    messageInput.focus();
    }
}

// Logik teras hantar mesej — boleh dipanggil dari form submit ATAU dari quick reply button
const sendUserMessage = (rawText) => {
    if (messageInput.disabled) return;   // block double-submit
    userData.message = (rawText || "").trim();
    if (!userData.message) return;
    messageInput.value = "";
    fileUploadWrapper.classList.remove("file-uploaded");
    messageInput.disabled = true;
    sendMessageButton.disabled = true;

    // Create and display user message
    const messageContent = `<div class="message-text"></div>
                        ${userData.file.data ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" />` : ""}`;

    const outgoingMessageDiv =createMessageElement(messageContent, "user-message");
    outgoingMessageDiv.querySelector(".message-text").textContent = userData.message
    chatBody.appendChild(outgoingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

    // Simulate bot response after a delay
    setTimeout(() => {
        const messageContent = `<div class="chatbot-avatar">
                    <img src="image/sarah.png" alt="Chatbot-logo" class="Chatbot-logo">
                </div>
                <div class="message-text">
                    <div class="thinking-indicator">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                </div>
                
                    </div>`;

    const incomingMessageDiv =createMessageElement(messageContent, "bot-message", "thinking");
    chatBody.appendChild(incomingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    generateBotResponse(incomingMessageDiv);
    },  600);
}

// Handle outgoing user meesages (form submit / send button)
const handleOutgoingMessage = (e) => {
    e.preventDefault();
    sendUserMessage(messageInput.value.trim());
}

// Handle enter key press for sending messages
messageInput.addEventListener("keydown", (e) => {
    const userMessage = e.target.value.trim();
    if(e.key === "Enter" && userMessage) {
        handleOutgoingMessage(e);
    }
});

// Adjust input field height dynamically
messageInput.addEventListener("input", () => {
    messageInput.style.height = `${initialInputHeight}px`;
    messageInput.style.height = `${messageInput.scrollHeight}px`;
    document.querySelector(".chat-form").style.borderRadius = messageInput.scrollHeight > initialInputHeight ? "15px" : "32px";
});

// Handle file input change and preview the selected file
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if(!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        fileUploadWrapper.querySelector("img").src = e.target.result;
        fileUploadWrapper.classList.add("file-uploaded");
        const base64String = e.target.result.split(",")[1];

        // Store file data in userData
        userData.file = {
        data: base64String,
        mime_type: file.type
    }

       fileInput.value = "";
    }

    reader.readAsDataURL(file);
});

// Cancel file upload
fileCancelButton.addEventListener("click", () => {
    userData.file = {};
    fileUploadWrapper.classList.remove("file-uploaded");
});

// initialize emoji picker
const picker = new EmojiMart.Picker({
    theme: "light",
    skinTonePosition: "none",
    previewPosition: "none",
    onEmojiSelect: (emoji) => {
        const {selectionStart: start, selectionEnd: end} = messageInput;
        messageInput.setRangeText(emoji.native, start, end, "end");
        messageInput.focus();
    },
    onClickOutside: () => {
        document.body.classList.remove("show-emoji-picker");
    }
});

document.querySelector(".chat-footer").appendChild(picker);

// Explicit open/toggle handler — don't rely on onClickOutside for this
document.querySelector("#emoji-picker").addEventListener("click", (e) => {
    e.stopPropagation();
    document.body.classList.toggle("show-emoji-picker");
});

sendMessageButton.addEventListener("click", (e) => handleOutgoingMessage(e));
document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());
chatBotToggle.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));
closeChatbot.addEventListener("click", () => document.body.classList.remove("show-chatbot"));

// Bar quick reply kekal wujud sepanjang masa, bukan hanya masa chatbot dibuka kali pertama
showQuickReplies();