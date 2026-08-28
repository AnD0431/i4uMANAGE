// api/gemini.js
// Sarah AI backend - Vercel Serverless Function
//
// Fungsi utama:
// 1. API key kekal di server.
// 2. Google Search grounding.
// 3. Detect soalan kerajaan / penjawat awam.
// 4. Verified Government Mode.
// 5. Semak grounding + sumber rasmi.
// 6. Fail closed jika maklumat tidak dapat disahkan.

const MODEL = "gemini-3.6-flash";


// =========================================================
// GOVERNMENT QUERY KEYWORDS
// =========================================================

const GOVERNMENT_KEYWORDS = [

    // Perkhidmatan awam
    "penjawat awam",
    "perkhidmatan awam",
    "pegawai awam",
    "kakitangan kerajaan",
    "pegawai kerajaan",

    // Agensi / sumber
    "jpa",
    "myppsm",
    "pekeliling",
    "ceraian",
    "surat edaran",
    "perintah am",

    // Sumber manusia
    "cuti",
    "tatatertib",
    "kenaikan pangkat",
    "pemangkuan",
    "gred",
    "skim perkhidmatan",
    "waktu bekerja",
    "kerja lebih masa",
    "lebih masa",

    // Kewangan
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
    "waran",

    // KKM
    "kkm",
    "kementerian kesihatan",
    "moh",
    "jknt",

    // Pentadbiran
    "ketua jabatan",
    "dasar kerajaan",
    "prosedur kerajaan",
    "arahan perbendaharaan",

    // Latihan
    "ldp",
    "latihan dalam perkhidmatan"
];


// =========================================================
// OFFICIAL GOVERNMENT SOURCE HINTS
// =========================================================

const OFFICIAL_SOURCE_HINTS = [

    ".gov.my",

    "jpa.gov.my",
    "docs.jpa.gov.my",
    "myppsm",

    "mof.gov.my",
    "treasury.gov.my",
    "perbendaharaan",

    "moh.gov.my",
    "kkm",

    "anm.gov.my",
    "jabatan akauntan negara",

    "spa.gov.my",
    "suruhanjaya perkhidmatan awam",

    "agc.gov.my",
    "jabatan peguam negara",

    "parlimen.gov.my",

    "kehakiman.gov.my"
];


// =========================================================
// GET LATEST USER MESSAGE
// =========================================================

function getLatestUserMessage(contents = []) {

    if (!Array.isArray(contents)) {
        return "";
    }


    for (
        let i = contents.length - 1;
        i >= 0;
        i--
    ) {

        const item =
            contents[i];


        if (
            item?.role !== "user" ||
            !Array.isArray(item.parts)
        ) {
            continue;
        }


        const text =
            item.parts
                .map(part =>
                    part?.text || ""
                )
                .join(" ")
                .trim();


        if (text) {
            return text;
        }
    }


    return "";
}


// =========================================================
// DETECT GOVERNMENT QUERY
// =========================================================

function isGovernmentQuery(message = "") {

    const text =
        String(message)
            .toLowerCase()
            .trim();


    return GOVERNMENT_KEYWORDS.some(
        keyword =>
            text.includes(keyword)
    );
}


// =========================================================
// RESOLVE & VERIFY OFFICIAL GOVERNMENT SOURCE
// =========================================================

async function resolveOfficialGovernmentSource(
  web = {},
  topic = "general-government"
) {

    const originalUri =
        String(web?.uri || "")
            .trim();


    if (!originalUri) {
        return null;
    }


    // ========================================
    // CHECK DIRECT URL FIRST
    // ========================================

    try {

        const directUrl =
            new URL(originalUri);


        if (
            isAuthoritativeGovernmentHostname(
                directUrl.hostname,
                topic
            )
        ) {

            return {
                title:
                    web.title ||
                    directUrl.hostname,

                uri:
                    originalUri
            };
        }

    } catch (error) {

        return null;
    }


// ========================================
// FOLLOW REDIRECT WITH TIMEOUT
// ========================================

const controller =
    new AbortController();


const timeout =
    setTimeout(
        () => {
            controller.abort();
        },
        5000
    );


try {

    const response =
        await fetch(
            originalUri,
            {
                method: "GET",

                redirect: "follow",

                signal:
                    controller.signal,

                headers: {
                    "User-Agent":
                        "Mozilla/5.0 i4uManage-Sarah"
                }
            }
        );


    const finalUri =
        response.url;


    // ========================================
    // TAK PERLU DOWNLOAD SELURUH PAGE
    // ========================================

    if (response.body) {

        try {

            await response.body.cancel();

        } catch (error) {

            // Ignore body cancel error
        }
    }


    const finalUrl =
        new URL(
            finalUri
        );


    // ========================================
    // FINAL DOMAIN MESTI AUTORITATIF
    // ========================================

    if (
        !isAuthoritativeGovernmentHostname(
            finalUrl.hostname,
            topic
        )
    ) {

        return null;
    }


    return {

        title:
            web.title ||
            finalUrl.hostname,

        uri:
            finalUri
    };


} catch (error) {

    // ========================================
    // TIMEOUT
    // ========================================

    if (
        error?.name ===
        "AbortError"
    ) {

        console.warn(
            "Government source verification timeout:",
            originalUri
        );

    } else {

        console.warn(
            "Unable to resolve grounding source:",
            originalUri,
            error?.message || error
        );
    }


    return null;


} finally {

    // Sangat penting:
    // hentikan timer selepas request selesai
    clearTimeout(
        timeout
    );
}

}

// =========================================================
// GOVERNMENT TOPIC ROUTER
// Tentukan badan induk rasmi berdasarkan soalan
// =========================================================

function detectGovernmentTopic(message = "") {

    const text =
        String(message)
            .toLowerCase()
            .trim();


    // KEWANGAN / TUNTUTAN / PEROLEHAN
    if (
        text.includes("lojing") ||
        text.includes("hotel") ||
        text.includes("tuntutan") ||
        text.includes("perjalanan") ||
        text.includes("perolehan") ||
        text.includes("perbendaharaan") ||
        text.includes("elaun makan") ||
        text.includes("elaun harian")
    ) {
        return "finance";
    }


    // PERKHIDMATAN AWAM / HR
    if (
        text.includes("cuti") ||
        text.includes("tatatertib") ||
        text.includes("kenaikan pangkat") ||
        text.includes("pemangkuan") ||
        text.includes("skim perkhidmatan") ||
        text.includes("gred")
    ) {
        return "public-service";
    }


    // KESIHATAN
    if (
        text.includes("kkm") ||
        text.includes("kesihatan") ||
        text.includes("klinik") ||
        text.includes("hospital")
    ) {
        return "health";
    }


    return "general-government";
}

// =========================================================
// AUTHORITATIVE DOMAINS BY TOPIC
// =========================================================

const GOVERNMENT_AUTHORITY_DOMAINS = {

    "finance": [
        "mof.gov.my",
        "treasury.gov.my",
        "ppp.treasury.gov.my",
        "anm.gov.my"
    ],

    "public-service": [
        "jpa.gov.my",
        "docs.jpa.gov.my"
    ],

    "health": [
        "moh.gov.my"
    ],

    "general-government": [
        "gov.my"
    ]
};


// =========================================================
// Authoritative Government Hostname Check
// =========================================================
function isAuthoritativeGovernmentHostname(
    hostname,
    topic
) {

    const host =
        String(hostname || "")
            .toLowerCase()
            .trim();


    const allowedDomains =
        GOVERNMENT_AUTHORITY_DOMAINS[
            topic
        ] || [];


    return allowedDomains.some(domain => {

        if (domain === "gov.my") {

            return (
                host === "gov.my" ||
                host.endsWith(".gov.my")
            );
        }


        return (
            host === domain ||
            host.endsWith("." + domain)
        );
    });
}

// =========================================================
// ANALYSE GROUNDING
// =========================================================

async function analyseGrounding(
    data,
    topic
) {

    const metadata =
        data?.candidates?.[0]
            ?.groundingMetadata;

    const queries =
        Array.isArray(metadata?.webSearchQueries)
            ? metadata.webSearchQueries
            : [];

    const chunks =
        Array.isArray(metadata?.groundingChunks)
            ? metadata.groundingChunks
            : [];

    const supports =
        Array.isArray(metadata?.groundingSupports)
            ? metadata.groundingSupports
            : [];


    // ===============================
    // OFFICIAL CHUNKS
    // ===============================

    const officialChunkIndices =
        new Set();

    const officialSources = [];


    // ========================================
    // VERIFY SOURCES SECARA PARALLEL
    // ========================================

    const MAX_SOURCE_CHECKS = 10;

    const sourceChecks =
        chunks
            .slice(
                0,
                MAX_SOURCE_CHECKS
            )
            .map(
                async (
                    chunk,
                    index
                ) => {

                    const web =
                        chunk?.web;

                    if (!web) {
                        return {
                            index,
                            source: null
                        };
                    }

                    const source =
                        await resolveOfficialGovernmentSource(
                            web,
                            topic
                        );

                    return {
                        index,
                        source
                    };
                }
            );


    const resolvedSources =
        await Promise.all(
            sourceChecks
        );


    resolvedSources.forEach(
        result => {

            if (!result.source) {
                return;
            }

            officialChunkIndices.add(
                result.index
            );

            officialSources.push(
                result.source
            );
        }
    );


    // ===============================
    // CHECK SUPPORT
    // ===============================

    const hasOfficialSupport =
        supports.some(
            support => {

                const indices =
                    support
                        ?.groundingChunkIndices;

                if (
                    !Array.isArray(indices)
                ) {
                    return false;
                }

                return indices.some(
                    index =>
                        officialChunkIndices
                            .has(index)
                );
            }
        );


    return {

        searched:
            queries.length > 0,

        searchQueries:
            queries,

        totalSources:
            chunks.length,

        officialSourceCount:
            officialSources.length,

        officialSources:
            officialSources,

        hasOfficialSupport:
            hasOfficialSupport,

        officialChunkIndices:
            [...officialChunkIndices],

        verified:
            queries.length > 0 &&
            officialSources.length > 0 &&
            hasOfficialSupport
    };
}


// =========================================================
// SENSITIVE GOVERNMENT CLAIM COVERAGE V2
// Semak fakta atomik kritikal sahaja.
// =========================================================

function normalizeGovernmentFactText(text = "") {

    return String(text || "")
        .toLowerCase()
        .replace(/[*_`#>|]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


// =========================================================
// GET FULL MODEL RESPONSE TEXT
// =========================================================

function getGovernmentResponseText(data) {

    const parts =
        data?.candidates?.[0]
            ?.content
            ?.parts;

    if (!Array.isArray(parts)) {
        return "";
    }

    return parts
        .map(
            part =>
                typeof part?.text === "string"
                    ? part.text
                    : ""
        )
        .join("\n");
}


// =========================================================
// EXTRACT CRITICAL GOVERNMENT FACTS
// =========================================================

function extractCriticalGovernmentFacts(text = "") {

    const value =
        normalizeGovernmentFactText(text);

    const facts =
        new Map();


    const addFact = (
        key,
        display
    ) => {

        if (!key || facts.has(key)) {
            return;
        }

        facts.set(
            key,
            {
                key,
                display:
                    String(display || "").trim()
            }
        );
    };


    const canonicalNumber =
        raw => {

            const number =
                Number(
                    String(raw || "")
                        .replace(/,/g, "")
                );

            return Number.isFinite(number)
                ? String(number)
                : String(raw || "")
                    .replace(/,/g, "")
                    .trim();
        };


    // ===============================
    // RM
    // ===============================

    for (
        const match of value.matchAll(
            /\brm\s*([0-9][0-9,.]*)\b/gi
        )
    ) {

        const amount =
            canonicalNumber(match[1]);

        addFact(
            `amount:${amount}`,
            `RM${amount}`
        );
    }


    // ===============================
    // %
    // ===============================

    for (
        const match of value.matchAll(
            /\b(\d+(?:\.\d+)?)\s*%/g
        )
    ) {

        const percent =
            canonicalNumber(match[1]);

        addFact(
            `percent:${percent}`,
            `${percent}%`
        );
    }


    // ===============================
    // TEMPOH / BILANGAN
    // ===============================

    for (
        const match of value.matchAll(
            /\b(\d+(?:\.\d+)?)\s*(hari|tahun|bulan|jam|minit|malam|kilometer|km|orang|kali)\b/gi
        )
    ) {

        const number =
            canonicalNumber(match[1]);

        let unit =
            match[2].toLowerCase();

        if (unit === "kilometer") {
            unit = "km";
        }

        addFact(
            `unit:${number}:${unit}`,
            `${number} ${unit}`
        );
    }


    // ===============================
    // PECAHAN
    // ===============================

    for (
        const match of value.matchAll(
            /\b(\d+)\s*\/\s*(\d+)\b/g
        )
    ) {

        addFact(
            `fraction:${match[1]}/${match[2]}`,
            `${match[1]}/${match[2]}`
        );
    }


    // ===============================
    // TARIKH - 1 JANUARI 2026
    // ===============================

    const monthMap = {
        januari: 1,
        februari: 2,
        mac: 3,
        april: 4,
        mei: 5,
        jun: 6,
        julai: 7,
        ogos: 8,
        september: 9,
        oktober: 10,
        november: 11,
        disember: 12
    };


    for (
        const match of value.matchAll(
            /\b(\d{1,2})\s+(januari|februari|mac|april|mei|jun|julai|ogos|september|oktober|november|disember)\s+((?:19|20)\d{2})\b/gi
        )
    ) {

        const day =
            Number(match[1]);

        const month =
            monthMap[
                match[2].toLowerCase()
            ];

        const year =
            Number(match[3]);

        addFact(
            `date:${year}-${month}-${day}`,
            `${day} ${match[2]} ${year}`
        );
    }


    // ===============================
    // TARIKH - 01/01/2026
    // ===============================

    for (
        const match of value.matchAll(
            /\b(\d{1,2})[\/-](\d{1,2})[\/-]((?:19|20)\d{2})\b/g
        )
    ) {

        const day =
            Number(match[1]);

        const month =
            Number(match[2]);

        const year =
            Number(match[3]);

        addFact(
            `date:${year}-${month}-${day}`,
            `${day}/${month}/${year}`
        );
    }


    // ===============================
    // GRED
    // ===============================

    for (
        const match of value.matchAll(
            /\bgred\s+([a-z]?\d+[a-z]?)\b/gi
        )
    ) {

        const grade =
            match[1].toUpperCase();

        addFact(
            `grade:${grade}`,
            `Gred ${grade}`
        );
    }


    return [
        ...facts.values()
    ];
}


// =========================================================
// OFFICIAL GROUNDED TEXT
// Hanya segment yang linked kepada sumber rasmi.
// =========================================================

function getOfficialGroundedGovernmentText(
    data,
    officialChunkIndices = []
) {

    const supports =
        data?.candidates?.[0]
            ?.groundingMetadata
            ?.groundingSupports || [];

    const parts =
        data?.candidates?.[0]
            ?.content
            ?.parts || [];

    const officialSet =
        new Set(
            officialChunkIndices
        );

    const officialSegments = [];


    supports.forEach(
        support => {

            const indices =
                Array.isArray(
                    support?.groundingChunkIndices
                )
                    ? support.groundingChunkIndices
                    : [];


            const isOfficial =
                indices.some(
                    index =>
                        officialSet.has(index)
                );


            if (!isOfficial) {
                return;
            }


            const segment =
                support?.segment;


            // Gunakan segment.text jika ada
            if (
                typeof segment?.text === "string" &&
                segment.text.trim()
            ) {

                officialSegments.push(
                    segment.text
                );

                return;
            }


            // ===============================
            // FALLBACK UTF-8 OFFSET
            // ===============================

            const partIndex =
                Number.isInteger(
                    segment?.partIndex
                )
                    ? segment.partIndex
                    : 0;

            const partText =
                parts?.[partIndex]
                    ?.text;


            if (
                typeof partText !== "string" ||
                !Number.isFinite(
                    segment?.startIndex
                ) ||
                !Number.isFinite(
                    segment?.endIndex
                )
            ) {
                return;
            }


            try {

                const bytes =
                    Buffer.from(
                        partText,
                        "utf8"
                    );

                const extracted =
                    bytes
                        .subarray(
                            segment.startIndex,
                            segment.endIndex
                        )
                        .toString("utf8")
                        .trim();


                if (extracted) {

                    officialSegments.push(
                        extracted
                    );
                }

            } catch (error) {

                // Ignore extraction error
            }
        }
    );


    return officialSegments
        .join("\n");
}


// =========================================================
// ANALYSE SENSITIVE CLAIM COVERAGE V2
// =========================================================

function analyseSensitiveClaimCoverage(
    data,
    officialChunkIndices = []
) {

    const responseText =
        getGovernmentResponseText(
            data
        )
            .replace(
                /\[\[I4U_STATUS:(ACTIVE|AMENDED|REPLACED|CANCELLED|UNKNOWN)\]\]/gi,
                ""
            );


    // ===============================
    // FAKTA KRITIKAL DALAM JAWAPAN
    // ===============================

    const responseFacts =
        extractCriticalGovernmentFacts(
            responseText
        );


    if (
        responseFacts.length === 0
    ) {

        return {

            required:
                false,

            passed:
                true,

            totalClaims:
                0,

            supportedClaims:
                0,

            unsupportedClaims:
                []
        };
    }


    // ===============================
    // FAKTA DALAM OFFICIAL GROUNDING
    // ===============================

    const officialGroundedText =
        getOfficialGroundedGovernmentText(
            data,
            officialChunkIndices
        );


    const officialFacts =
        extractCriticalGovernmentFacts(
            officialGroundedText
        );


    const officialFactKeys =
        new Set(
            officialFacts.map(
                fact =>
                    fact.key
            )
        );


    // ===============================
    // SEMAK FAKTA SATU-SATU
    // ===============================

    const unsupportedFacts =
        responseFacts.filter(
            fact =>
                !officialFactKeys.has(
                    fact.key
                )
        );


    return {

        required:
            true,

        passed:
            unsupportedFacts.length === 0,

        totalClaims:
            responseFacts.length,

        supportedClaims:
            responseFacts.length -
            unsupportedFacts.length,

        unsupportedClaims:
            unsupportedFacts.map(
                fact =>
                    fact.display
            )
    };
}

// =========================================================
// GOVERNMENT VERIFICATION INSTRUCTION
// =========================================================

function getGovernmentInstruction(
    checkedAt
) {

    return `
VERIFIED GOVERNMENT MODE — ARAHAN SERVER.

Soalan semasa telah dikesan sebagai berkaitan kerajaan Malaysia, penjawat awam, JKNT atau KKM.

Anda WAJIB menggunakan Google Search sebelum memberikan fakta berkaitan:
- pekeliling;
- ceraian;
- kadar;
- elaun;
- tuntutan;
- kelayakan;
- cuti;
- tatatertib;
- gred;
- perolehan;
- kewangan kerajaan;
- dasar;
- prosedur;
- tarikh kuat kuasa;
- atau peraturan perkhidmatan awam.

UTAMAKAN sumber rasmi kerajaan Malaysia.

Keutamaan sumber mengikut topik:

1. JPA / MyPPSM
   - perkhidmatan awam
   - cuti
   - tatatertib
   - elaun
   - kemudahan
   - skim perkhidmatan

2. Kementerian Kewangan / Perbendaharaan
   - kewangan
   - perolehan
   - tuntutan
   - Arahan Perbendaharaan

3. KKM
   - dasar dan polisi kesihatan

4. Jabatan Akauntan Negara
   - pembayaran dan perakaunan kerajaan

Gunakan sumber .gov.my atau sumber rasmi badan kerajaan yang memiliki dasar.

JANGAN gunakan blog, forum, media sosial atau laman sektor swasta sebagai autoriti utama untuk dasar kerajaan.

PENTING:
- Semak sama ada maklumat masih berkuat kuasa.
- Jika terdapat versi lebih baharu, utamakan versi terkini.
- Semak jika pekeliling lama telah dipinda, diganti atau dibatalkan.
- Jangan reka nombor pekeliling, kadar, tarikh atau seksyen.
- Jangan beri angka spesifik jika tidak disokong sumber rasmi.
- Jangan dakwa sesuatu sebagai "terkini" tanpa carian web.
- Jangan gunakan pengetahuan dalaman model sahaja untuk fakta kerajaan yang boleh berubah.

Masa semakan server:
${checkedAt}

Jika sumber rasmi tidak mencukupi, nyatakan bahawa maklumat tersebut tidak dapat disahkan daripada sumber rasmi semasa.

Jangan taip URL secara manual dalam jawapan kerana aplikasi akan memaparkan sumber grounding secara berasingan.
`;
}

// =========================================================
// TOPIC-SPECIFIC GOVERNMENT SEARCH INSTRUCTION
// =========================================================

function getGovernmentTopicInstruction(topic) {

    switch (topic) {

        case "finance":

            return `
TOPIK DIKESAN: KEWANGAN KERAJAAN.

Untuk carian pertama, utamakan sumber:

- ppp.treasury.gov.my
- treasury.gov.my
- mof.gov.my
- anm.gov.my

Jika soalan berkaitan:
- lojing
- elaun
- tuntutan perjalanan
- hotel
- perolehan
- Pekeliling Perbendaharaan

cari dokumen rasmi atau PDF pekeliling yang
spesifik, terkini dan masih berkuat kuasa.

Utamakan Portal Pekeliling Perbendaharaan
berbanding laman kerajaan umum.
`;


        case "public-service":

            return `
TOPIK DIKESAN: PERKHIDMATAN AWAM.

Untuk carian pertama, utamakan:

- jpa.gov.my
- docs.jpa.gov.my

Cari MyPPSM, ceraian, pekeliling atau dokumen
JPA yang paling terkini dan masih berkuat kuasa.
`;


        case "health":

            return `
TOPIK DIKESAN: KESIHATAN.

Untuk carian pertama, utamakan:

- moh.gov.my

Gunakan dasar, garis panduan atau dokumen rasmi
KKM yang paling relevan dan terkini.
`;


        default:

            return `
TOPIK DIKESAN: KERAJAAN UMUM.

Utamakan laman rasmi kerajaan Malaysia
berdomain .gov.my dan badan induk yang
bertanggungjawab terhadap perkara tersebut.
`;
    }
}

// =========================================================
// CURRENT GOVERNMENT DOCUMENT STATUS INSTRUCTION
// =========================================================

function getCurrentStatusInstruction() {

    return `
SEMAKAN STATUS KUAT KUASA — WAJIB.

Sebelum memberikan jawapan berdasarkan:
- pekeliling;
- ceraian;
- surat edaran;
- arahan;
- garis panduan;
- polisi;
- peraturan;
- undang-undang;
- kadar;
- kelayakan;
- prosedur kerajaan;

anda WAJIB menentukan status dokumen yang dirujuk.

Semak daripada sumber rasmi sama ada dokumen tersebut:

1. MASIH BERKUAT KUASA;
2. TELAH DIPINDA;
3. TELAH DIGANTI oleh dokumen yang lebih baharu;
4. TELAH DIBATALKAN / DIMANSUHKAN;
5. atau STATUS TIDAK DAPAT DIPASTIKAN.

PERATURAN:

- Jangan gunakan dokumen yang telah dibatalkan sebagai dasar semasa.
- Jika dokumen telah diganti, gunakan dokumen pengganti terkini.
- Jika terdapat pindaan, gunakan versi yang mengandungi pindaan terkini.
- Jika terdapat beberapa versi, utamakan versi dengan tarikh kuat kuasa paling baharu.
- Jangan anggap dokumen lama masih aktif hanya kerana ia masih boleh ditemui melalui Google Search.
- Jangan gunakan halaman arkib sebagai bukti bahawa sesuatu peraturan masih berkuat kuasa.
- Semak tarikh kuat kuasa jika dinyatakan.
- Semak kenyataan seperti:
  "dibatalkan",
  "dimansuhkan",
  "digantikan",
  "dipinda",
  "berkuat kuasa",
  "berkuat kuasa mulai",
  "superseded",
  atau kenyataan lain yang membawa maksud sama.

Jika status semasa tidak dapat dipastikan daripada
sumber rasmi kerajaan:

JANGAN berikan kadar, kelayakan, peraturan,
nombor pekeliling atau fakta khusus tersebut.

Sebaliknya nyatakan bahawa status kuat kuasa
tidak dapat disahkan daripada sumber rasmi semasa.

Untuk jawapan akhir, gunakan hanya dasar atau
dokumen yang paling terkini dan masih berkuat kuasa.

ANDA WAJIB letakkan SATU penanda status pada BARIS PALING AKHIR jawapan:

[[I4U_STATUS:ACTIVE]]
jika dasar / dokumen semasa telah disahkan masih berkuat kuasa.

[[I4U_STATUS:AMENDED]]
jika dokumen asal telah dipinda dan jawapan menggunakan pindaan terkini yang masih berkuat kuasa.

[[I4U_STATUS:REPLACED]]
jika dokumen lama telah diganti dan jawapan menggunakan dokumen pengganti terkini.

[[I4U_STATUS:CANCELLED]]
jika dokumen yang ditanya telah dibatalkan atau dimansuhkan dan tiada dasar pengganti yang boleh disahkan.

[[I4U_STATUS:UNKNOWN]]
jika status kuat kuasa tidak dapat dipastikan.

JANGAN gunakan ACTIVE, AMENDED atau REPLACED kecuali status tersebut disokong oleh sumber rasmi semasa.
`;
}


// =========================================================
// STRONG RETRY INSTRUCTION
// =========================================================

function getRetryInstruction() {

    return `
PENGESAHAN PERTAMA TIDAK MENEMUI BUKTI RASMI YANG MENCUKUPI.

Jalankan Google Search SEKALI LAGI.

Gunakan carian khusus sumber kerajaan Malaysia, termasuk:

site:gov.my
site:jpa.gov.my
site:docs.jpa.gov.my
site:mof.gov.my
site:treasury.gov.my
site:ppp.treasury.gov.my
site:moh.gov.my
site:anm.gov.my

Untuk soalan berkaitan:
- elaun
- tuntutan perjalanan
- lojing
- hotel
- perolehan
- Pekeliling Perbendaharaan

utamakan Portal Pekeliling Perbendaharaan
dan Kementerian Kewangan Malaysia.

Cari dokumen rasmi yang paling relevan,
terkini dan masih berkuat kuasa.

JANGAN memberikan fakta spesifik sehingga
sumber rasmi autoritatif ditemui.
`;
}


// =========================================================
// ADD SERVER INSTRUCTION
// =========================================================

function appendSystemInstruction(
    payload,
    instruction
) {

    const existingParts =
        Array.isArray(
            payload
                ?.system_instruction
                ?.parts
        )
            ?
            payload.system_instruction.parts
            :
            [];


    return {

        ...payload,

        system_instruction: {

            ...(payload.system_instruction || {}),

            parts: [

                ...existingParts,

                {
                    text:
                        instruction
                }

            ]
        }
    };
}


// =========================================================
// ENSURE GOOGLE SEARCH TOOL
// =========================================================

function addGoogleSearchTool(payload) {

    const existingTools =
        Array.isArray(payload?.tools)
            ? payload.tools
            : [];


    // Elakkan duplicate google_search
    const otherTools =
        existingTools.filter(
            tool =>
                !tool?.google_search
        );


    return {

        ...payload,

        tools: [

            ...otherTools,

            {
                google_search: {}
            }

        ]
    };
}


// =========================================================
// CALL GEMINI
// =========================================================

async function callGemini(
    googleUrl,
    payload
) {

    const response =
        await fetch(
            googleUrl,
            {
                method:
                    "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );


    const data =
        await response.json();


    return {

        response,
        data

    };
}

// =========================================================
// READ GOVERNMENT CURRENT-STATUS MARKER
// =========================================================

function getGovernmentDocumentStatus(data) {

    const parts =
        data?.candidates?.[0]
            ?.content
            ?.parts;


    if (!Array.isArray(parts)) {
        return "UNKNOWN";
    }


    const fullText =
        parts
            .map(part =>
                typeof part?.text === "string"
                    ? part.text
                    : ""
            )
            .join("\n");


    const match =
        fullText.match(
            /\[\[I4U_STATUS:(ACTIVE|AMENDED|REPLACED|CANCELLED|UNKNOWN)\]\]/i
        );


    if (!match) {
        return "UNKNOWN";
    }


    return match[1]
        .toUpperCase();
}

// =========================================================
// REMOVE INTERNAL STATUS MARKER
// Jangan paparkan marker kepada pengguna
// =========================================================

function removeGovernmentStatusMarker(data) {

    const parts =
        data?.candidates?.[0]
            ?.content
            ?.parts;


    if (!Array.isArray(parts)) {
        return;
    }


    parts.forEach(part => {

        if (
            typeof part?.text !== "string"
        ) {
            return;
        }


        part.text =
            part.text
                .replace(
                    /\s*\[\[I4U_STATUS:(ACTIVE|AMENDED|REPLACED|CANCELLED|UNKNOWN)\]\]\s*/gi,
                    ""
                )
                .trim();
    });
}


// =========================================================
// FALLBACK - VERIFIED MODE FAILED
// =========================================================

function createVerificationFailureResponse(
    checkedAt,
    documentStatus = "UNKNOWN"
) {

    let message =
        "Maklumat spesifik ini tidak dapat disahkan daripada sumber rasmi kerajaan yang mencukupi buat masa ini. Saya tidak akan memberikan kadar, nombor pekeliling, kelayakan atau fakta khusus yang tidak dapat disahkan. Sila rujuk badan induk rasmi yang berkaitan untuk pengesahan.";


    // ========================================
    // DOCUMENT CANCELLED / ABOLISHED
    // ========================================

    if (
        documentStatus === "CANCELLED"
    ) {

        message =
            "Dokumen, pekeliling atau peraturan yang dirujuk dikenal pasti sebagai telah dibatalkan atau dimansuhkan berdasarkan semakan sumber rasmi semasa. Saya tidak akan menggunakan dokumen tersebut sebagai dasar semasa. Sila gunakan dokumen pengganti yang terkini sekiranya ada.";
    }


    // ========================================
    // STATUS UNKNOWN
    // ========================================

    else if (
        documentStatus === "UNKNOWN"
    ) {

        message =
            "Status kuat kuasa dokumen atau peraturan ini tidak dapat disahkan dengan mencukupi daripada sumber rasmi semasa. Saya tidak akan memberikan fakta khusus berdasarkan dokumen tersebut sehingga statusnya dapat dipastikan.";
    }


    return {

        candidates: [
            {
                content: {

                    role:
                        "model",

                    parts: [
                        {
                            text:
                                message
                        }
                    ]
                }
            }
        ],


        i4uVerification: {

            mode:
                "government",

            verified:
                false,

            searched:
                true,

            checkedAt:
                checkedAt,

            documentStatus:
                documentStatus,

            officialSourceCount:
                0,

            officialSources:
                []
        }
    };
}

// =========================================================
// DETECT ACTIVE KERTAS KERJA WORKFLOW
// =========================================================

function isKertasKerjaConversation(
    contents = []
) {

    if (!Array.isArray(contents)) {
        return false;
    }

    const recentText =
        contents
            .slice(-12)
            .flatMap(item =>
                Array.isArray(item?.parts)
                    ? item.parts
                    : []
            )
            .map(part =>
                typeof part?.text === "string"
                    ? part.text
                    : ""
            )
            .join("\n")
            .toLowerCase();


    const triggers = [
        "jana kertas kerja",
        "buat kertas kerja",
        "sediakan kertas kerja",
        "kertas kerja untuk",
        "kertas cadangan"
    ];


    let latestStartIndex = -1;

    triggers.forEach(trigger => {

        latestStartIndex =
            Math.max(
                latestStartIndex,
                recentText.lastIndexOf(
                    trigger
                )
            );
    });


    const latestCompletedIndex =
        recentText.lastIndexOf(
            "===tamat_dokumen==="
        );


    return (
        latestStartIndex !== -1 &&
        latestStartIndex >
            latestCompletedIndex
    );
}


// =========================================================
// STRICT GOVERNMENT FACT REQUEST
// =========================================================

function requiresStrictGovernmentVerification(
    message = ""
) {

    const text =
        String(message || "")
            .toLowerCase()
            .trim();


    const strictKeywords = [

        "berkuat kuasa",
        "terkini",

        "pekeliling",
        "ceraian",
        "surat edaran",
        "akta",
        "arahan perbendaharaan",

        "kadar",
        "kelayakan",

        "elaun",
        "tuntutan",
        "tuntutan perjalanan",

        "perolehan",

        "tatatertib",
        "cuti",

        "peraturan kerajaan",
        "dasar kerajaan",

        "myppsm",
        "jpa",
        "mof",
        "perbendaharaan"
    ];


    return strictKeywords.some(
        keyword =>
            text.includes(keyword)
    );
}

function getMandatoryGovernmentSearchRetryInstruction(
    userMessage,
    topic
) {

    return `
CARIAN RASMI WAJIB — PERCUBAAN PENGESAHAN.

Jawapan sebelumnya tidak menjalankan Google Search.

Untuk permintaan berikut:

"${userMessage}"

ANDA WAJIB menjalankan Google Search sebelum menjawab.

JANGAN:
- jawab menggunakan pengetahuan dalaman model sahaja;
- membuat kesimpulan berdasarkan ingatan;
- menentukan status ACTIVE, AMENDED, REPLACED atau CANCELLED
  tanpa hasil carian rasmi.

Topik kerajaan:
${topic}

Cari sumber rasmi kerajaan Malaysia yang paling autoritatif.

Jika berkaitan perkhidmatan awam seperti:
- Gantian Cuti Rehat (GCR);
- cuti;
- kemudahan;
- kelayakan;
- tatatertib;
- skim perkhidmatan;

utamakan:

- jpa.gov.my
- docs.jpa.gov.my
- MyPPSM JPA

Gunakan Google Search untuk mendapatkan dokumen atau halaman
rasmi semasa.

Selepas carian:
1. jawab berdasarkan sumber rasmi sahaja;
2. semak status kuat kuasa;
3. jangan reka kadar, had, tarikh atau nombor pekeliling;
4. kekalkan penanda [[I4U_STATUS:...]] yang diwajibkan.

Jika carian rasmi masih tidak memberikan bukti mencukupi,
gunakan [[I4U_STATUS:UNKNOWN]].
`;
}

// =========================================================
// TARGETED GOVERNMENT CLAIM RETRY
// =========================================================

function getTargetedClaimVerificationInstruction(
    userMessage,
    unsupportedClaims = [],
    topic = "general-government"
) {

    const claims =
        Array.isArray(unsupportedClaims)
            ? unsupportedClaims
            : [];


    return `
PENGESAHAN FAKTA KERAJAAN — CARIAN SASARAN.

Soalan pengguna:

"${userMessage}"

Jawapan sebelumnya mempunyai fakta kritikal yang belum
mempunyai grounding rasmi yang mencukupi:

${claims.map(
    claim => `- ${claim}`
).join("\n")}

ANDA WAJIB menjalankan Google Search semula dan mencari
sumber rasmi kerajaan Malaysia yang secara khusus menyokong
fakta-fakta tersebut.

Topik:
${topic}

PERATURAN:

1. Gunakan sumber rasmi dan autoritatif sahaja.

2. Jika topik perkhidmatan awam, utamakan:
   - jpa.gov.my
   - docs.jpa.gov.my
   - MyPPSM JPA

3. Jangan gunakan pengetahuan dalaman model sebagai bukti.

4. Jangan reka atau andaikan nilai seperti:
   - RM;
   - peratus;
   - bilangan hari;
   - tahun perkhidmatan;
   - umur;
   - pecahan;
   - kadar;
   - gred;
   - tarikh.

5. Jika sesuatu fakta tidak dapat disahkan daripada sumber
   rasmi, JANGAN masukkan fakta itu dalam jawapan akhir.

6. Jawab semula soalan pengguna secara lengkap menggunakan
   hanya fakta yang berjaya disahkan.

7. Semak status kuat kuasa dokumen semasa.

8. Kekalkan satu penanda:
   [[I4U_STATUS:ACTIVE]]
   [[I4U_STATUS:AMENDED]]
   [[I4U_STATUS:REPLACED]]
   [[I4U_STATUS:CANCELLED]]
   atau
   [[I4U_STATUS:UNKNOWN]]
   pada baris terakhir.
`;
}

// =========================================================
// MAIN HANDLER
// =========================================================

export default async function handler(
    req,
    res
) {

// =========================================================
// KERTAS KERJA SMART COLLECTION
// =========================================================

function getKertasKerjaInstruction() {

    return `
MOD KERTAS KERJA JKNT.

Apabila pengguna meminta untuk:
- jana kertas kerja;
- buat kertas kerja;
- sediakan kertas kerja;
- kertas cadangan program;
- kertas kerja kursus;
- kertas kerja latihan;

JANGAN terus menghasilkan dokumen penuh jika maklumat
asas program masih belum mencukupi.

Semak dahulu maklumat berikut daripada keseluruhan
perbualan:

1. Nama program / kursus / latihan
2. Latar belakang atau tujuan program
3. Objektif
4. Kaedah pelaksanaan
5. Tarikh
6. Masa, jika berkaitan
7. Tempat
8. Penganjur
9. Sasaran peserta
10. Bilangan peserta
11. Penceramah / fasilitator / urus setia
12. Impak atau hasil yang disasarkan
13. Sumber peruntukan
14. Anggaran kewangan, jika melibatkan perbelanjaan

PERATURAN:

- Gunakan maklumat yang pengguna telah berikan dalam
  mesej terdahulu. Jangan tanya semula maklumat yang
  sudah diketahui.

- Jika maklumat penting masih kurang, JANGAN jana
  ===MULA_DOKUMEN=== lagi.

- Sebaliknya, minta hanya maklumat yang masih belum ada.

- Gabungkan soalan supaya pengguna tidak perlu menjawab
  terlalu banyak mesej satu demi satu.

- Maksimum 6 perkara untuk ditanya dalam satu respons.

- Jangan mereka tarikh, tempat, bilangan peserta,
  penceramah, jumlah kewangan atau sumber peruntukan.

- Objektif, latar belakang dan impak BOLEH dicadangkan
  berdasarkan nama serta tujuan program, tetapi bezakan
  dengan maklumat yang benar-benar diberikan pengguna.

- Jika pengguna menyatakan supaya anda cadangkan sesuatu,
  anda boleh mencadangkannya secara munasabah.

- Apabila maklumat mencukupi, barulah hasilkan kertas kerja
  lengkap menggunakan format rasmi JKNT yang telah
  ditetapkan dalam system instruction.

- Jangan gunakan [placeholder] dalam dokumen akhir jika
  maklumat tersebut boleh diperoleh dengan bertanya kepada
  pengguna terlebih dahulu.

- Jika hanya maklumat tandatangan seperti nama penyedia,
  penyemak atau Ketua Jabatan yang belum diberikan,
  dokumen masih boleh dijana dengan ruang tandatangan
  kosong kerana bahagian tersebut boleh dilengkapkan
  kemudian.
`;
}


    // ===============================
    // METHOD
    // ===============================

    if (req.method !== "POST") {

        return res
            .status(405)
            .json({
                error:
                    "Method not allowed"
            });
    }


    // ===============================
    // API KEY
    // ===============================

    const API_KEY =
        process.env.GEMINI_API_KEY;


    if (!API_KEY) {

        console.error(
            "GEMINI_API_KEY missing."
        );


        return res
            .status(500)
            .json({
                error: {
                    message:
                        "AI service configuration incomplete."
                }
            });
    }


    const GOOGLE_URL =
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;


    try {

        // ===============================
        // REMOVE INTERNAL FRONTEND FIELD
        // ===============================

        const {
            government_mode,
            ...clientPayload
        } =
            req.body || {};


        // ===============================
        // LATEST USER MESSAGE
        // ===============================

        const latestUserMessage =
            getLatestUserMessage(
                clientPayload.contents
            );

        const governmentTopic =
            detectGovernmentTopic(
                latestUserMessage
            );


        // ===============================
        // GOVERNMENT MODE
        // ===============================

    const kertasKerjaMode =
    isKertasKerjaConversation(
        clientPayload.contents
    );


const strictGovernmentFactRequest =
    requiresStrictGovernmentVerification(
        latestUserMessage
    );


const governmentMode =
    strictGovernmentFactRequest ||
    (
        !kertasKerjaMode &&
        (
            government_mode === true ||
            isGovernmentQuery(
                latestUserMessage
            )
        )
    );


        // Malaysia timestamp
        const checkedAt =
            new Date()
                .toISOString();


        // ===============================
        // BUILD PAYLOAD
        // ===============================

        let payload = {
    ...clientPayload
};

payload =
    appendSystemInstruction(
        payload,
        getKertasKerjaInstruction()
    );


// ========================================
// GOOGLE SEARCH HANYA UNTUK GOVERNMENT MODE
// ========================================

if (governmentMode) {

    // Google Search
    payload =
        addGoogleSearchTool(
            payload
        );


    // Verified Government Mode
    payload =
        appendSystemInstruction(
            payload,
            getGovernmentInstruction(
                checkedAt
            )
        );


    // Semakan status kuat kuasa
    payload =
        appendSystemInstruction(
            payload,
            getCurrentStatusInstruction()
        );


    // Arahan carian ikut topik
    payload =
        appendSystemInstruction(
            payload,
            getGovernmentTopicInstruction(
                governmentTopic
            )
        );
}


        // ===============================
        // FIRST REQUEST
        // ===============================

        let {
            response:
                googleResponse,

            data

        } =
            await callGemini(
                GOOGLE_URL,
                payload
            );


        // Gemini API error
        if (!googleResponse.ok) {

            return res
                .status(
                    googleResponse.status
                )
                .json(data);
        }


        // ===============================
        // STANDARD MODE
        // ===============================

        if (!governmentMode) {

            data.i4uVerification = {

                mode:
                    "standard",

                checkedAt:
                    checkedAt

            };


            return res
                .status(200)
                .json(data);
        }


        // ===============================
        // VERIFY FIRST RESULT
        // ===============================

        let verification =
            await analyseGrounding(
                data,
                governmentTopic
            );

// =========================================================
// ONE RETRY ONLY IF GOOGLE SEARCH WAS NOT EXECUTED
// =========================================================

if (
    !verification.searched ||
    verification.totalSources === 0
) {

    console.warn(
        "I4U_GOV_SEARCH_NOT_TRIGGERED",
        {
            query:
                latestUserMessage,

            topic:
                governmentTopic
        }
    );


    let retryPayload =
        appendSystemInstruction(
            payload,
            getMandatoryGovernmentSearchRetryInstruction(
                latestUserMessage,
                governmentTopic
            )
        );


    // Pastikan search tool masih ada
    retryPayload =
        addGoogleSearchTool(
            retryPayload
        );


    const retryResult =
        await callGemini(
            GOOGLE_URL,
            retryPayload
        );


    if (
        retryResult.response.ok
    ) {

        const retryVerification =
            await analyseGrounding(
                retryResult.data,
                governmentTopic
            );


        // Hanya ganti result pertama
        // jika retry benar-benar menjalankan Search
        if (
            retryVerification.searched &&
            retryVerification.totalSources > 0
        ) {

            data =
                retryResult.data;

            verification =
                retryVerification;
        }
    }
}

        let sensitiveClaimCoverage =
    analyseSensitiveClaimCoverage(
        data,
        verification.officialChunkIndices
    );

// =========================================================
// TARGETED RETRY FOR UNSUPPORTED GOVERNMENT FACTS
// =========================================================

if (
    sensitiveClaimCoverage.required &&
    !sensitiveClaimCoverage.passed &&
    sensitiveClaimCoverage.unsupportedClaims.length > 0
) {

    console.warn(
        "I4U_GOV_TARGETED_CLAIM_RETRY",
        {
            query: latestUserMessage,
            unsupportedClaims:
                sensitiveClaimCoverage.unsupportedClaims
        }
    );


    let claimRetryPayload =
        appendSystemInstruction(
            payload,
            getTargetedClaimVerificationInstruction(
                latestUserMessage,
                sensitiveClaimCoverage.unsupportedClaims,
                governmentTopic
            )
        );


    claimRetryPayload =
        addGoogleSearchTool(
            claimRetryPayload
        );


    const claimRetryResult =
        await callGemini(
            GOOGLE_URL,
            claimRetryPayload
        );


    if (claimRetryResult.response.ok) {

        const claimRetryVerification =
            await analyseGrounding(
                claimRetryResult.data,
                governmentTopic
            );


        const claimRetryCoverage =
            analyseSensitiveClaimCoverage(
                claimRetryResult.data,
                claimRetryVerification
                    .officialChunkIndices
            );

            console.warn(
    "I4U_GOV_TARGETED_RETRY_RESULT",
    {
        searched:
            claimRetryVerification.searched,

        verified:
            claimRetryVerification.verified,

        officialSources:
            claimRetryVerification
                .officialSourceCount,

        totalSources:
            claimRetryVerification
                .totalSources,

        claimCoverage:
            claimRetryCoverage
    }
);


        // Gunakan jawapan retry HANYA jika
        // semua verification berjaya
        if (
            claimRetryVerification.verified &&
            claimRetryCoverage.passed
        ) {

            data =
                claimRetryResult.data;

            verification =
                claimRetryVerification;

            sensitiveClaimCoverage =
                claimRetryCoverage;
        }
    }
}

// ===============================
// CURRENT STATUS GATE
// ===============================

const governmentDocumentStatus =
    getGovernmentDocumentStatus(
        data
    );


const currentStatusVerified =
    verification.searched &&
    verification.officialSourceCount > 0 &&
    [
        "ACTIVE",
        "AMENDED",
        "REPLACED"
    ].includes(
        governmentDocumentStatus
    );

        // ===============================
        // FAIL CLOSED
        // ===============================

        if (!verification.verified || !currentStatusVerified || !sensitiveClaimCoverage.passed) {

           console.warn(
    "Verified Government Mode failed.",
    {
        query:
            latestUserMessage,

        searched:
            verification.searched,

        officialSources:
            verification
                .officialSourceCount,

        documentStatus:
            governmentDocumentStatus,

        claimCoverage:
            sensitiveClaimCoverage,
    }
);


            return res
                .status(200)
                .json(
                    createVerificationFailureResponse(
                        checkedAt,
                        governmentDocumentStatus
                    )
                );
        }


        // ===============================
        // VERIFIED RESPONSE
        // ===============================

// Buang marker dalaman sebelum dihantar ke frontend
removeGovernmentStatusMarker(data);

        data.i4uVerification = {

    mode:
        "government",

    verified:
        true,

    documentStatus:
        governmentDocumentStatus,

    claimCoverage:
        sensitiveClaimCoverage,

    searched:
        verification.searched,

    checkedAt:
        checkedAt,

    officialSourceCount:
        verification.officialSourceCount,

    officialSources:
        verification.officialSources,

    searchQueries:
        verification.searchQueries
};


        res.setHeader(
            "Cache-Control",
            "no-store"
        );


        return res
            .status(200)
            .json(data);


    } catch (error) {

        console.error(
            "Gemini API error:",
            error
        );


        return res
            .status(500)
            .json({
                error: {
                    message:
                        "Server error: " +
                        error.message
                }
            });
    }
}