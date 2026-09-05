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
const DOCUMENT_SEARCH_API = "/api/search-document";
const userData = {
    message: null,
    file: {
        data: null,
        mime_type: null
    }
}

const chatHistory = [];
const initialInputHeight = messageInput.scrollHeight;

/* =========================================================
   SARAH DOCUMENT SEARCH
   Carian dokumen sebenar daripada i4uManage / Google Drive.
   Carian ini TIDAK menggunakan Gemini.
   ========================================================= */

// Detect sama ada pengguna memang nak cari dokumen i4uManage
function isDocumentSearchIntent(message) {

    const text = (message || "")
        .toLowerCase()
        .trim();

    const searchWords = [
        "cari",
        "carikan",
        "find",
        "search"
    ];

    const documentWords = [
        "dokumen",
        "kertas kerja",
        "slide",
        "slaid",
        "kursus",
        "fail",
        "file",
        "ppt",
        "pptx",
        "pdf",
        "docx"
    ];

    const hasSearchIntent =
        searchWords.some(word =>
            text.includes(word)
        );

    const hasDocumentContext =
        documentWords.some(word =>
            text.includes(word)
        );

    return hasSearchIntent && hasDocumentContext;
}


// Bersihkan ayat user menjadi keyword search
function parseDocumentSearchRequest(message) {

    let text =
        (message || "")
            .toLowerCase()
            .trim();


    let type = null;
    let category = null;
    let year = null;


    // =====================================
    // TYPE
    // =====================================

    if (
        /\bkertas\s*kerja\b/i.test(text)
    ) {

        type =
            "kertas-kerja";

    } else if (
        /\b(slide|slaid)\b/i.test(text)
    ) {

        type =
            "slide-kursus";
    }


    // =====================================
    // YEAR
    // =====================================

    const yearMatch =
        text.match(
            /\b(20\d{2})\b/
        );


    if (yearMatch) {

        year =
            Number(
                yearMatch[1]
            );
    }


    // =====================================
    // CATEGORY
    // =====================================

    const categoryPatterns = [

        {
            slug:
                "teknologi-maklumat",

            patterns: [
                "teknologi maklumat",
                "ict"
            ]
        },

        {
            slug:
                "psikologi-kaunseling",

            patterns: [
                "psikologi dan kaunseling",
                "psikologi & kaunseling",
                "psikologi",
                "kaunseling"
            ]
        },

        {
            slug:
                "sumber-manusia",

            patterns: [
                "sumber manusia",
                "human resource"
            ]
        },

        {
            slug:
                "perolehan-aset",

            patterns: [
                "perolehan dan aset",
                "perolehan & aset",
                "perolehan",
                "aset"
            ]
        },

        {
            slug:
                "pembangunan",

            patterns: [
                "pembangunan"
            ]
        },

        {
            slug:
                "latihan",

            patterns: [
                "latihan"
            ]
        },

        {
            slug:
                "pentadbiran",

            patterns: [
                "pentadbiran"
            ]
        },

        {
            slug:
                "kewangan",

            patterns: [
                "kewangan"
            ]
        }

    ];


    for (
        const item
        of categoryPatterns
    ) {

        const found =
            item.patterns.find(
                pattern =>
                    text.includes(pattern)
            );


        if (found) {

            category =
                item.slug;

            break;
        }
    }


    // =====================================
    // CLEAN SEARCH QUERY
    // =====================================

    let query =
        text;


    const phrasesToRemove = [

        "tolong carikan saya",
        "tolong carikan",
        "tolong cari",

        "boleh carikan saya",
        "boleh carikan",
        "boleh cari",

        "saya nak cari",
        "saya mahu cari",
        "aku nak cari",

        "carikan saya",

        "cari dokumen",
        "cari fail",
        "cari file",

        "carikan",
        "cari",

        "find",
        "search",

        "kertas kerja",

        "slide kursus",
        "slaid kursus",

        "slide",
        "slaid",

        "dokumen"
    ];


    phrasesToRemove.forEach(
        phrase => {

            query =
                query.replace(
                    phrase,
                    " "
                );

        }
    );


    // Buang category daripada keyword
    categoryPatterns.forEach(
        item => {

            item.patterns.forEach(
                pattern => {

                    query =
                        query.replace(
                            pattern,
                            " "
                        );

                }
            );

        }
    );


    // Buang tahun
    query =
        query.replace(
            /\b20\d{2}\b/g,
            " "
        );


    query =
        query
            .replace(/\s+/g, " ")
            .trim();


    return {

        query:
            query,

        type:
            type,

        category:
            category,

        year:
            year

    };
}


// Label jenis dokumen
function getDocumentTypeLabel(type) {

    if (type === "kertas-kerja") {
        return "Kertas Kerja";
    }

    if (type === "slide-kursus") {
        return "Slide Kursus";
    }

    return "Dokumen";
}


// Icon berdasarkan MIME type
function getDocumentResultIcon(mimeType = "") {

    const mime = mimeType.toLowerCase();

    if (mime.includes("pdf")) {
        return "fa-solid fa-file-pdf";
    }

    if (
        mime.includes("presentation") ||
        mime.includes("powerpoint")
    ) {
        return "fa-solid fa-file-powerpoint";
    }

    if (
        mime.includes("spreadsheet") ||
        mime.includes("excel")
    ) {
        return "fa-solid fa-file-excel";
    }

    if (
        mime.includes("document") ||
        mime.includes("word")
    ) {
        return "fa-solid fa-file-word";
    }

    if (mime.includes("image")) {
        return "fa-solid fa-file-image";
    }

    return "fa-solid fa-file-lines";
}


// Papar result carian di dalam bubble Sarah
function renderDocumentSearchResults(messageElement, data) {

    messageElement.innerHTML = "";

    const results =
        Array.isArray(data.results)
            ? data.results
            : [];


    // =====================================
    // TAK JUMPA
    // =====================================

    if (results.length === 0) {

        const noResult =
            document.createElement("p");

        noResult.textContent =
            `Saya tidak menemui dokumen yang sepadan dengan "${data.query}".`;

        messageElement.appendChild(noResult);

        return;
    }


    // =====================================
    // INTRO
    // =====================================

    const intro =
        document.createElement("p");

    const filterLabels = [];


if (
    data.filters?.type ===
    "kertas-kerja"
) {

    filterLabels.push(
        "Kertas Kerja"
    );

}


if (
    data.filters?.type ===
    "slide-kursus"
) {

    filterLabels.push(
        "Slide Kursus"
    );

}


if (
    data.filters?.category
) {

    const categoryLabelMap = {

        "pembangunan":
            "Pembangunan",

        "teknologi-maklumat":
            "Teknologi Maklumat",

        "latihan":
            "Latihan",

        "psikologi-kaunseling":
            "Psikologi & Kaunseling",

        "sumber-manusia":
            "Sumber Manusia",

        "pentadbiran":
            "Pentadbiran",

        "perolehan-aset":
            "Perolehan & Aset",

        "kewangan":
            "Kewangan"
    };


    filterLabels.push(
        categoryLabelMap[
            data.filters.category
        ]
    );

}


if (data.filters?.year) {

    filterLabels.push(
        String(
            data.filters.year
        )
    );

}


const filterText =
    filterLabels.length
        ? ` (${filterLabels.join(" • ")})`
        : "";


const keywordText =
    data.query
        ? ` berkaitan "${data.query}"`
        : "";


intro.textContent =
    `Saya menemui ${results.length} dokumen${keywordText}${filterText}.`;

    messageElement.appendChild(intro);


    // =====================================
    // CONTAINER
    // =====================================

    const resultsContainer =
        document.createElement("div");

    resultsContainer.className =
        "sarah-document-results";


    // =====================================
    // RESULT CARD
    // =====================================

    results.forEach(item => {

        const card =
            document.createElement("div");

        card.className =
            "sarah-document-card";


        // ICON
        const icon =
            document.createElement("div");

        icon.className =
            "sarah-document-icon";

        const iconElement =
            document.createElement("i");

        iconElement.className =
            getDocumentResultIcon(
                item.mimeType
            );

        icon.appendChild(iconElement);


        // CONTENT
        const content =
            document.createElement("div");

        content.className =
            "sarah-document-content";


        const name =
            document.createElement("strong");

        name.textContent =
            item.name || "Dokumen";


        const program =
            document.createElement("span");

        program.textContent =
            item.programName || "";


        const meta =
            document.createElement("small");

        const metaParts = [
            getDocumentTypeLabel(item.type),
            item.categoryName,
            item.year
        ].filter(Boolean);

        meta.textContent =
            metaParts.join(" • ");


        content.appendChild(name);

        if (item.programName) {
            content.appendChild(program);
        }

        content.appendChild(meta);


        // BUTTON BUKA
        const openButton =
            document.createElement("a");

        openButton.className =
            "sarah-document-open";

        openButton.href =
            item.url || "#";

        openButton.target =
            "_blank";

        openButton.rel =
            "noopener noreferrer";

        openButton.innerHTML = `
            <span>Buka</span>
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
        `;


        card.appendChild(icon);
        card.appendChild(content);
        card.appendChild(openButton);

        resultsContainer.appendChild(card);
    });


    messageElement.appendChild(
        resultsContainer
    );
}


// Main function carian dokumen Sarah
async function searchDocumentsForSarah(
    userMessage,
    incomingMessageDiv
) {

    const messageElement =
        incomingMessageDiv.querySelector(
            ".message-text"
        );

    try {

       const searchRequest =
    parseDocumentSearchRequest(
        userMessage
    );


const params =
    new URLSearchParams();


if (searchRequest.query) {

    params.set(
        "q",
        searchRequest.query
    );
}


if (searchRequest.type) {

    params.set(
        "type",
        searchRequest.type
    );
}


if (searchRequest.category) {

    params.set(
        "category",
        searchRequest.category
    );
}


if (searchRequest.year) {

    params.set(
        "year",
        String(
            searchRequest.year
        )
    );
}


const response =
    await fetch(
        `${DOCUMENT_SEARCH_API}?${params.toString()}`,
        {
            method:
                "GET",

            cache:
                "no-store"
        }
    );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.error ||
                "Document search failed."
            );
        }


        // Paparkan result
        renderDocumentSearchResults(
            messageElement,
            data
        );


        // =====================================
        // CHAT HISTORY
        // =====================================

        const results =
            Array.isArray(data.results)
                ? data.results
                : [];


        chatHistory.push({
            role: "user",
            parts: [{
                text: userMessage
            }]
        });


        const historySummary =
            results.length > 0
                ?
                `Carian dokumen "${data.query}" menemui ${results.length} dokumen: ${results
                    .map(item => item.name)
                    .join(", ")}.`
                :
                `Carian dokumen "${data.query}" tidak menemui hasil.`;


        chatHistory.push({
            role: "model",
            parts: [{
                text: historySummary
            }]
        });


    } catch (error) {

        console.error(
            "Sarah document search error:",
            error
        );

        messageElement.textContent =
            "Maaf, carian dokumen tidak dapat dilakukan sekarang. Sila cuba lagi.";

        messageElement.style.color =
            "#ff0000";


    } finally {

        // reset attachment supaya tak terbawa
        // ke mesej seterusnya
        userData.file = {
            data: null,
            mime_type: null
        };

        fileUploadWrapper.classList.remove(
            "file-uploaded"
        );


        incomingMessageDiv.classList.remove(
            "thinking"
        );


        chatBody.scrollTo({
            top: chatBody.scrollHeight,
            behavior: "smooth"
        });


        messageInput.disabled = false;
        sendMessageButton.disabled = false;

        messageInput.focus();
    }
}

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
    { label: "Cari Dokumen", message: "Cari dokumen Design Thinking" },
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

    // ========================================
    // ESCAPE HTML
    // ========================================

    const escapeHtml = (value) =>
        String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");


    // ========================================
    // INLINE MARKDOWN
    // **bold**
    // *italic*
    // `code`
    // ========================================

    const formatInline = (value) => {

        let result = value;


        // Inline code
        result = result.replace(
            /`([^`]+)`/g,
            "<code>$1</code>"
        );


        // Bold
        result = result.replace(
            /\*\*([^*]+)\*\*/g,
            "<strong>$1</strong>"
        );


        result = result.replace(
            /__([^_]+)__/g,
            "<strong>$1</strong>"
        );


        // Italic
        result = result.replace(
            /(^|[^*])\*([^*\n]+)\*(?!\*)/g,
            "$1<em>$2</em>"
        );


        return result;
    };


    const lines =
        escapeHtml(text)
            .split("\n");


    let html = "";

    let tableRows = [];

    let inTable = false;

    let inList = false;

    let listType = null;


    // ========================================
    // TABLE HELPERS
    // ========================================

    const getTableCells = (row) => {

        return row
            .split("|")
            .map(cell => cell.trim())
            .filter(
                (cell, index, array) =>
                    !(
                        index === 0 &&
                        cell === ""
                    ) &&
                    !(
                        index ===
                            array.length - 1 &&
                        cell === ""
                    )
            );
    };


    const isSeparatorRow = (cells) => {

        return (
            cells.length > 0 &&
            cells.every(
                cell =>
                    /^:?-{2,}:?$/.test(
                        cell.trim()
                    )
            )
        );
    };


    const flushTable = () => {

        if (
            tableRows.length === 0
        ) {
            return;
        }


        html +=
            '<div class="md-table-wrap">';

        html +=
            '<table class="md-table">';


        let rowIndex = 0;


        tableRows.forEach(row => {

            const cells =
                getTableCells(row);


            // Skip Markdown table separator:
            // | --- | --- |
            if (
                isSeparatorRow(cells)
            ) {
                return;
            }


            const tag =
                rowIndex === 0
                    ? "th"
                    : "td";


            html +=
                "<tr>" +
                cells
                    .map(
                        cell =>
                            `<${tag}>${formatInline(cell)}</${tag}>`
                    )
                    .join("") +
                "</tr>";


            rowIndex++;
        });


        html +=
            "</table>";

        html +=
            "</div>";


        tableRows = [];

        inTable = false;
    };


    // ========================================
    // LIST HELPERS
    // ========================================

    const closeList = () => {

        if (!inList) {
            return;
        }


        html +=
            listType === "ol"
                ? "</ol>"
                : "</ul>";


        inList = false;

        listType = null;
    };


    const openList = (type) => {

        if (
            inList &&
            listType === type
        ) {
            return;
        }


        if (inList) {
            closeList();
        }


        listType = type;

        inList = true;


        html +=
            type === "ol"
                ? "<ol>"
                : "<ul>";
    };


    // ========================================
    // PROCESS EACH LINE
    // ========================================

    lines.forEach(rawLine => {

        const line =
            rawLine.trim();


        // ====================================
        // TABLE
        // ====================================

        if (
            line.startsWith("|")
        ) {

            if (inList) {
                closeList();
            }


            inTable = true;

            tableRows.push(line);

            return;
        }


        if (inTable) {
            flushTable();
        }


        // ====================================
        // EMPTY LINE
        // ====================================

        if (line === "") {

            if (inList) {
                closeList();
            }

            return;
        }


        // ====================================
        // HORIZONTAL RULE
        // --- / *** / ___
        // ====================================

        if (
            /^(-{3,}|\*{3,}|_{3,})$/.test(
                line
            )
        ) {

            if (inList) {
                closeList();
            }


            html +=
                '<hr class="md-divider">';

            return;
        }


        // ====================================
        // HEADINGS
        // ====================================

        if (
            /^###\s+/.test(line)
        ) {

            if (inList) {
                closeList();
            }


            html +=
                `<h4 class="md-heading md-heading-3">${formatInline(
                    line.replace(
                        /^###\s+/,
                        ""
                    )
                )}</h4>`;

            return;
        }


        if (
            /^##\s+/.test(line)
        ) {

            if (inList) {
                closeList();
            }


            html +=
                `<h3 class="md-heading md-heading-2">${formatInline(
                    line.replace(
                        /^##\s+/,
                        ""
                    )
                )}</h3>`;

            return;
        }


        if (
            /^#\s+/.test(line)
        ) {

            if (inList) {
                closeList();
            }


            html +=
                `<h2 class="md-heading md-heading-1">${formatInline(
                    line.replace(
                        /^#\s+/,
                        ""
                    )
                )}</h2>`;

            return;
        }


        // ====================================
        // BULLET LIST
        // - item
        // * item
        // ====================================

        if (
            /^[-*]\s+/.test(line)
        ) {

            openList("ul");


            const content =
                line.replace(
                    /^[-*]\s+/,
                    ""
                );


            html +=
                `<li>${formatInline(content)}</li>`;

            return;
        }


        // ====================================
        // NUMBERED LIST
        // 1. item
        // 2. item
        // ====================================

        if (
            /^\d+\.\s+/.test(line)
        ) {

            openList("ol");


            const content =
                line.replace(
                    /^\d+\.\s+/,
                    ""
                );


            html +=
                `<li>${formatInline(content)}</li>`;

            return;
        }


        // ====================================
        // NORMAL PARAGRAPH
        // ====================================

        if (inList) {
            closeList();
        }


        html +=
            `<p>${formatInline(line)}</p>`;
    });


    // ========================================
    // CLOSE REMAINING ELEMENTS
    // ========================================

    if (inTable) {
        flushTable();
    }


    if (inList) {
        closeList();
    }


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

// ========================================
// DETECT GOVERNMENT / PUBLIC SERVICE QUERY
// ========================================

function isGovernmentQuery(message) {

    const text =
        (message || "")
            .toLowerCase()
            .trim();

    const keywords = [
        "penjawat awam",
        "perkhidmatan awam",
        "pegawai awam",
        "kakitangan kerajaan",
        "pegawai kerajaan",

        "jpa",
        "myppsm",
        "pekeliling",
        "ceraian",
        "surat edaran",
        "perintah am",

        "cuti",
        "tatatertib",
        "kenaikan pangkat",
        "pemangkuan",
        "gred",
        "skim perkhidmatan",
        "waktu bekerja",
        "kerja lebih masa",
        "lebih masa",

        "elaun",
        "tuntutan",
        "tuntutan perjalanan",
        "lojing",
        "hotel",

        "perolehan",
        "perbendaharaan",
        "kementerian kewangan",
        "mof",

        "peruntukan",
        "pegawai pengawal",

        "kkm",
        "kementerian kesihatan",
        "moh",
        "jknt",

        "ketua jabatan",
        "dasar kerajaan",
        "prosedur kerajaan",
        "arahan perbendaharaan",

        "ldp",
        "latihan dalam perkhidmatan"
    ];

    return keywords.some(
        keyword =>
            text.includes(keyword)
    );
}

// Generate bot response using the API
const generateBotResponse = async (incomingMessageDiv) => {
    const messageElement =  incomingMessageDiv.querySelector(".message-text");

    // Simpan prompt asal sebelum apa-apa berubah — untuk detect format docx/pdf
    const requestedFormats = detectRequestedFormats(userData.message);
    government_mode: false,

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
        government_mode: governmentMode,        
        system_instruction: {
            parts: [{
                text: "Anda adalah Sarah, pembantu peribadi i4uManage anda. HANYA perkenalkan diri anda sebagai Sarah apabila pengguna secara jelas bertanya siapa anda (contohnya 'awak siapa', 'siapa awak', 'apa nama awak', 'who are you'). Untuk semua soalan lain, jawab terus soalan tersebut TANPA memperkenalkan diri anda semula. Jangan sekali-kali menyebut anda dibangunkan oleh Google, dipanggil Gemini, atau merupakan model AI generik. Jawab dengan mesra, profesional dan membantu. PENTING: Apabila pengguna meminta anda menyediakan dokumen rasmi seperti kertas kerja, kertas cadangan, surat rasmi, laporan, atau dokumen sebegini yang akan dimuat turun sebagai fail .docx atau .pdf, WAJIB bungkus kandungan dokumen tersebut sahaja (tanpa ayat pembuka/penutup/penerangan/tips anda) di antara penanda ===MULA_DOKUMEN=== dan ===TAMAT_DOKUMEN=== secara tepat. Ayat pembuka anda MESTI ringkas sahaja (contoh: 'Baik, kertas kerja anda sudah sedia. Sila muat turun di bawah.') sebab sistem akan sediakan butang muat turun secara automatik — JANGAN suruh pengguna salin-tampal ke Microsoft Word secara manual. Jangan tambah ayat penutup atau tips selepas penanda ===TAMAT_DOKUMEN=== melainkan benar-benar perlu. APABILA PENGGUNA MEMINTA KERTAS KERJA UNTUK PROGRAM/LATIHAN/KURSUS, WAJIB IKUT FORMAT RASMI JKNT BERIKUT DENGAN TEPAT (isi setiap bahagian dengan maklumat relevan dari perbualan, jangan gunakan [placeholder] dalam dokumen akhir; jika maklumat penting belum ada, tanya pengguna terlebih dahulu; semua heading 1 hingga 7 serta 4.1 hingga 4.7 wajib dikekalkan dan tidak boleh dibuang, digabungkan atau dinomborkan semula: [TAJUK PROGRAM/KURSUS]\\nKEMENTERIAN KESIHATAN MALAYSIA / JABATAN KESIHATAN NEGERI TERENGGANU\\n\\n1. PENDAHULUAN/LATAR BELAKANG\\n[latar belakang dan justifikasi program]\\n\\n2. OBJEKTIF LATIHAN\\n2.1 [objektif 1]\\n2.2 [objektif 2]\\n\\n3. KAEDAH PELAKSANAAN LATIHAN\\n[kaedah — ceramah/bengkel/dll]\\n\\n4. MAKLUMAT LATIHAN\\n4.1 Nama Penganjur & Penganjur Bersama (jika berkenaan)\\n4.2 Justifikasi Pemilihan Penganjur Bersama (jika berkenaan)\\n4.3 Persetujuan Kerjasama oleh Penganjur & Penganjur Bersama (jika berkenaan)\\n4.4 Jawatankuasa Pelaksanaan Latihan (jika berkenaan)\\n4.5 Cadangan Tarikh & Tempat berserta Justifikasi Pemilihan Tempat\\n4.6 Sasaran dan Bilangan Peserta\\n4.7 Penceramah, Fasilitator & Urus Setia\\n\\n5. IMPAK PELAKSANAAN LATIHAN\\n[impak/output/outcome program]\\n\\n6. SUMBER PERUNTUKAN DAN IMPLIKASI KEWANGAN\\n[jadual anggaran perbelanjaan berformat: Bil | Perkara | Pengiraan | Jumlah (RM)]\\n[nyatakan sumber peruntukan LDP/selain LDP, dan sama ada dirancang melalui POL]\\n\\n7. KESIMPULAN/RUMUSAN\\n[rumusan dan permohonan kelulusan]\\n\\nDisediakan oleh:\\n......................................\\n(Nama, Gred, Jawatan Penyedia Kertas Kerja)\\n\\nDisemak oleh:\\n......................................\\n(Nama, Gred, Jawatan Penyemak — Ketua Unit/Penyelia, jika berkenaan)\\n\\nSokongan Ketua Jabatan/Program:\\n......................................\\n(Nama, Jawatan)\\n\\n*semua heading 1 hingga 7 dan 4.1 hingga 4.7 WAJIB dikekalkan. Jika sesuatu item benar-benar tidak berkenaan, kekalkan nombor dan heading tersebut serta tulis Tidak Berkenaan.\n\nPENTING — SKOP KERAJAAN: Pengguna sistem ini SEMUANYA penjawat awam JKNT/KKM (bukan orang awam). Apabila soalan melibatkan hal ehwal kerajaan (contoh: pekeliling perkhidmatan, elaun, cuti, tatatertib, perolehan, dasar KKM/JPA/Perbendaharaan, prosedur pentadbiran awam), anda WAJIB: (1) jawab berdasarkan sumber rujukan rasmi kerajaan Malaysia sahaja (Pekeliling Perkhidmatan, Pekeliling Perbendaharaan, Akta, Dasar KKM, MyPPSM JPA) — JANGAN jawab berdasarkan andaian, sumber sektor swasta, atau amalan negara lain; (2) gunakan nada dan konteks KHUSUS untuk penjawat awam — anggap pengguna sudah faham struktur perkhidmatan awam, guna istilah rasmi (contoh 'Ketua Jabatan', 'Pegawai Pengawal', 'skim perkhidmatan') tanpa perlu terangkan asas; (3) jika soalan tersebut memerlukan rujukan spesifik (nombor pekeliling, seksyen akta, tarikh kuat kuasa) yang anda TIDAK PASTI, WAJIB nyatakan dengan jelas 'Sila rujuk pekeliling/portal rasmi berkaitan untuk pengesahan' dan arahkan ke portal rasmi yang berkaitan (contoh Portal Pekeliling Perbendaharaan, MyPPSM, portal MOH) — JANGAN sekali-kali reka nombor pekeliling, tarikh, atau petikan perundangan yang anda tidak pasti; (4) jika soalan langsung tiada kaitan dengan hal ehwal kerajaan (contoh sembang santai, soalan am), jawab macam biasa tanpa perlu ikat dengan konteks kerajaan.\n\nPENTING — KETEPATAN & KESPESIFIKAN: Untuk SETIAP soalan berkaitan kerajaan/pekeliling, anda WAJIB guna keupayaan carian web (Google Search) yang disediakan untuk SAHKAN maklumat sebelum menjawab — JANGAN jawab semata-mata dari ingatan tanpa mengesahkan. Jawapan MESTI spesifik (nombor pekeliling tepat, ceraian/seksyen tepat, angka/kadar tepat mengikut kategori/gred yang betul) — elak jawapan umum/kabur jika maklumat spesifik wujud. WALAU BAGAIMANAPUN, JANGAN taip URL/link secara manual dalam jawapan anda — sistem akan papar link sumber sebenar secara automatik berasingan daripada carian yang dibuat. Fokus jawapan anda pada teks sahaja; jangan sertakan sebarang alamat laman web dalam ayat anda. Jika carian tidak menemui maklumat yang cukup spesifik/sah, WAJIB nyatakan dengan jujur 'Maklumat spesifik ini tidak dapat disahkan buat masa ini — sila rujuk portal/badan rasmi berkaitan' dan arahkan ke BADAN INDUK yang sebenarnya memiliki dasar tersebut mengikut topik (BUKAN JKNT, sebab JKNT hanya pelaksana di peringkat negeri, bukan pemilik dasar) — contoh: hal ehwal perkhidmatan/cuti/tatatertib/elaun → Jabatan Perkhidmatan Awam (JPA)/MyPPSM; hal ehwal kewangan/perolehan/perbelanjaan → Kementerian Kewangan/Perbendaharaan; dasar/polisi kesihatan → Kementerian Kesihatan Malaysia (KKM). JANGAN sekali-kali arahkan pengguna rujuk 'Unit HR/Pentadbiran JKNT' atau mana-mana unit dalaman JKNT sebagai sumber rujukan dasar — JKNT bukan pemilik/pengeluar dasar tersebut.\n\nPENTING — CARIAN SPESIFIK UNTUK LINK TEPAT: Apabila membuat carian web untuk menyahkan maklumat, GUNA istilah carian yang SESPESIFIK mungkin (contoh: 'Pekeliling Perkhidmatan Bilangan 11 Tahun 2015 PDF JPA' atau 'MyPPSM Ceraian SR.5.1.1 cuti rehat', BUKAN sekadar 'cuti rehat penjawat awam') supaya hasil carian membawa terus ke dokumen/muka surat rasmi yang spesifik, bukan ke laman portal umum yang memerlukan carian tambahan. Jika ada beberapa hasil carian, PILIH sumber yang paling spesifik dan rasmi (dokumen PDF rasmi atau muka surat khusus pekeliling tersebut) berbanding laman indeks/carian umum.\n\nPENTING — HAD SKOP PERBUALAN: Anda HANYA boleh menjawab soalan yang berkaitan dengan: (1) tugas pentadbiran JKNT/KKM (penyediaan kertas kerja, surat rasmi, memo, laporan); (2) hal ehwal kerajaan/perkhidmatan awam (pekeliling, dasar, elaun, cuti, tatatertib, perolehan, prosedur pentadbiran); (3) maklumat berkaitan JKNT/i4uManage itu sendiri (contoh cara guna sistem ini, maklumat hubungi JKNT). UNTUK SEBARANG soalan LUAR skop ini (contoh: soalan am/trivia, hiburan, sukan, resipi, tugasan sekolah/akademik tidak berkaitan kerja, nasihat peribadi, coding/teknologi am, atau apa-apa topik tiada kaitan langsung dengan tugas pentadbiran/kerajaan), anda WAJIB menolak dengan sopan — jangan cuba menjawab soalan tersebut walaupun anda tahu jawapannya. Balas dengan AYAT TEPAT ini SAHAJA, TANPA sebarang perubahan, tambahan, atau parafrasa: 'Maaf, Soalan ini di luar skop saya — sila gunakan sumber lain untuk maklumat ini.' Jangan tambah ayat lain sebelum atau selepasnya, jangan ubah walau satu perkataan pun, dan jangan cuba jawab sebahagian atau berikan maklumat berkaitan topik luar skop tersebut walaupun ringkas."
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

// ========================================
// EXTRACT GEMINI RESPONSE TEXT
// Baca SEMUA text parts, bukan parts[0] sahaja
// ========================================

const responseParts =
    data?.candidates?.[0]
        ?.content
        ?.parts || [];


const apiResponseText =
    responseParts
        .filter(part =>
            typeof part?.text === "string" &&
            part.text.trim() !== "" &&
            part.thought !== true
        )
        .map(part =>
            part.text
        )
        .join("\n")

        // remove internal government status marker
        .replace(
            /\s*\[\[I4U_STATUS:(ACTIVE|AMENDED|REPLACED|CANCELLED|UNKNOWN)\]\]\s*/gi,
            "\n"
        )

        // remove bold markdown
        .replace(
            /\*\*(.*?)\*\*/g,
            "$1"
        )

        // remove markdown headers
        .replace(
            /^#{1,6}\s*/gm,
            ""
        )

        .trim();


// ========================================
// JANGAN BIARKAN BUBBLE KOSONG
// ========================================

if (!apiResponseText) {

    console.error(
        "SARAH_EMPTY_RESPONSE",
        {
            candidate:
                data?.candidates?.[0],

            finishReason:
                data?.candidates?.[0]
                    ?.finishReason,

            promptFeedback:
                data?.promptFeedback,

            responseParts:
                responseParts
        }
    );

    throw new Error(
        "Sarah tidak menerima teks jawapan daripada AI."
    );
}

        // Asingkan kandungan dokumen (dalam marker) dari penerangan bot.
        // Chat hanya papar ayat bot di LUAR marker — kandungan sebenar disimpan untuk fail download sahaja.
        const documentBody = extractDocumentBody(apiResponseText);
        const displayText = documentBody !== null
            ? getTextOutsideMarkers(apiResponseText)
            : apiResponseText;

        messageElement.innerHTML = markdownToChatHtml(displayText);

// ========================================
// VERIFIED GOVERNMENT STATUS
// ========================================

const verification =
    data.i4uVerification;


if (
    verification?.mode === "government"
) {

    const verificationDiv =
        document.createElement("div");


    verificationDiv.classList.add(
        "government-verification"
    );


    const documentStatus =
        verification.documentStatus ||
        "UNKNOWN";


    // =====================================
    // CANCELLED
    // =====================================

    if (
        documentStatus === "CANCELLED"
    ) {

        verificationDiv.classList.add(
            "cancelled"
        );


        verificationDiv.innerHTML = `
            <i class="fa-solid fa-ban"></i>

            <div class="verification-text">

                <strong>
                    Dokumen Telah Dibatalkan
                </strong>

                <span>
                    Dokumen atau peraturan ini tidak lagi digunakan sebagai dasar semasa
                </span>

            </div>
        `;
    }


    // =====================================
    // UNKNOWN
    // =====================================

    else if (
        documentStatus === "UNKNOWN"
    ) {

        verificationDiv.classList.add(
            "unverified"
        );


        verificationDiv.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation"></i>

            <div class="verification-text">

                <strong>
                    Status Tidak Dapat Disahkan
                </strong>

                <span>
                    Status kuat kuasa tidak dapat dipastikan daripada sumber rasmi semasa
                </span>

            </div>
        `;
    }


    // =====================================
    // VERIFIED
    // ACTIVE / AMENDED / REPLACED
    // =====================================

    else if (
        verification.verified
    ) {

        verificationDiv.classList.add(
            "verified"
        );


        let title =
            "Maklumat Disahkan";


        let subtitle =
            "Disemak menggunakan sumber rasmi semasa";


        if (
            documentStatus === "AMENDED"
        ) {

            title =
                "Maklumat Disahkan";

            subtitle =
                "Versi semasa mengandungi pindaan yang telah disemak";
        }


        else if (
            documentStatus === "REPLACED"
        ) {

            title =
                "Maklumat Disahkan";

            subtitle =
                "Dokumen lama telah diganti dan versi semasa telah digunakan";
        }


        verificationDiv.innerHTML = `
            <i class="fa-solid fa-circle-check"></i>

            <div class="verification-text">

                <strong>
                    ${title}
                </strong>

                <span>
                    ${subtitle}
                </span>

            </div>
        `;
    }


    // =====================================
    // FALLBACK
    // =====================================

    else if (
    verification.verificationLevel === "limited"
) {

    verificationDiv.classList.add(
        "unverified"
    );

    verificationDiv.innerHTML = `
        <i class="fa-solid fa-triangle-exclamation"></i>

        <div class="verification-text">

            <strong>
                Semakan Terhad
            </strong>

            <span>
                Maklumat tersedia tetapi pengesahan sumber rasmi semasa belum lengkap
            </span>

        </div>
    `;
}


else {

    verificationDiv.classList.add(
        "unverified"
    );

    verificationDiv.innerHTML = `
        <i class="fa-solid fa-triangle-exclamation"></i>

        <div class="verification-text">

            <strong>
                Belum Disahkan
            </strong>

            <span>
                Sumber rasmi semasa tidak dapat dikenal pasti dengan mencukupi
            </span>

        </div>
    `;
}


    messageElement.prepend(
        verificationDiv
    );
}


       let sourceLinks = [];

       if (
        verification?.mode === "government" &&
        verification?.verified
       ) {
        sourceLinks =
            Array.isArray(
                verification.officialSources
            )
                ? verification.officialSources
                : [];
       }

       else if (
        verification?.mode !== "government"
       ) {
        const groundingChunks =
            data.candidates?.[0]
                ?.groundingMetadata
                ?.groundingChunks || [];

        const seenUrls =
            new Set();

        sourceLinks =
            groundingChunks
                .map(chunk =>
                    chunk.web
                )
                .filter(web => {
                    if ( !web?.uri) {
                        return false;
                    }
                    
                    if (
                        seenUrls.has (
                            web.uri
                        )
                    ) {
                        return false;
                    }
                    seenUrls.add(
                        web.uri
                    );
                    return true;
                });
       }

       const uniqueSources = [
        ...new Map(
            sourceLinks.map(source => [
                source.uri,
                source
            ])
        ) .values()
       ];

       if (uniqueSources.length > 0) {
        const sourcesDiv =
            document.createElement("div");

        sourcesDiv.classList.add(
            "message-sources"
        );

        const sourceTitle =
            verification?.mode === "government" 
                ? "Rujukan Rasmi"
                : "Rujukan";

        const title =
            document.createElement("strong");

        title.textContent =
            sourceTitle;

        sourcesDiv.appendChild(
            title
        );

        uniqueSources.forEach(source => {
            const link =
                document.createElement("a");

                link.href = source.uri;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.textContent = source.title ||
                "Sumber";

                sourcesDiv.appendChild(
                    link
                );
        });

        messageElement.appendChild(
            sourcesDiv
        );
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

// Reset textarea selepas mesej dihantar
messageInput.style.height = `${initialInputHeight}px`;
messageInput.style.overflowY = "hidden";

const chatForm = document.querySelector(".chat-form");

if (chatForm) {
    chatForm.style.borderRadius = "32px";
}

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

    const messageContent = `
        <div class="chatbot-avatar">
            <img
                src="image/sarah.png"
                alt="Chatbot-logo"
                class="Chatbot-logo"
            >
        </div>

        <div class="message-text">

            <div class="thinking-indicator">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>

        </div>
    `;


    const incomingMessageDiv =
        createMessageElement(
            messageContent,
            "bot-message",
            "thinking"
        );


    chatBody.appendChild(
        incomingMessageDiv
    );


    chatBody.scrollTo({
        top: chatBody.scrollHeight,
        behavior: "smooth"
    });


    // ========================================
    // SARAH REQUEST ROUTER
    // ========================================

    if (
        isDocumentSearchIntent(
            userData.message
        )
    ) {

        searchDocumentsForSarah(
            userData.message,
            incomingMessageDiv
        );

    } else {

        generateBotResponse(
            incomingMessageDiv
        );
    }


}, 600);
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

    const MAX_INPUT_HEIGHT = 140;

    // Reset dahulu supaya scrollHeight boleh dikira semula
    messageInput.style.height = `${initialInputHeight}px`;

    const newHeight =
        Math.min(
            messageInput.scrollHeight,
            MAX_INPUT_HEIGHT
        );

    messageInput.style.height =
        `${newHeight}px`;

    // Bila teks terlalu panjang,
    // textarea scroll di dalam sahaja
    messageInput.style.overflowY =
        messageInput.scrollHeight > MAX_INPUT_HEIGHT
            ? "auto"
            : "hidden";

    const chatForm =
        document.querySelector(".chat-form");

    if (chatForm) {
        chatForm.style.borderRadius =
            newHeight > initialInputHeight
                ? "15px"
                : "32px";
    }
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