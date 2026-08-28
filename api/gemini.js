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
// SENSITIVE GOVERNMENT CLAIM COVERAGE
// =========================================================

function hasSensitiveGovernmentFact(
    text = ""
) {

    const value =
        String(text || "");

        // ========================================
// REFERENCE-ONLY SENTENCES
// Jangan jadikan arahan rujukan sebagai
// sensitive factual claim
// ========================================

const normalizedValue =
    value
        .toLowerCase()
        .trim();


if (
    normalizedValue.startsWith("sila rujuk") ||
    normalizedValue.startsWith("rujuk portal") ||
    normalizedValue.startsWith("rujuk laman") ||
    normalizedValue.startsWith("untuk maklumat lanjut") ||
    normalizedValue.startsWith("untuk pengesahan")
) {
    return false;
}


    const patterns = [

        /\bRM\s?\d[\d,.]*/i,

        /\b\d+(?:\.\d+)?\s?%/,

        /\b\d{1,2}\s+(?:januari|februari|mac|april|mei|jun|julai|ogos|september|oktober|november|disember)\s+(?:19|20)\d{2}\b/i,

        /\b\d{1,2}[/-]\d{1,2}[/-](?:19|20)\d{2}\b/,

        /\bgred\s+[A-Z]?\d+[A-Z]?\b/i,

        /\b\d+(?:\.\d+)?\s*(?:hari|jam|bulan|malam|kilometer|km)\b/i,

        /\bceraian\s+[A-Z]{1,6}\.\d+(?:\.\d+)+\b/i,

        /\bpekeliling\b.{0,80}\b(?:bilangan|bil\.?)\s*\d+/i,

        /\bsurat\s+edaran\b.{0,80}\b(?:bilangan|bil\.?)\s*\d+/i,

        /\barahan\s+perbendaharaan\s+\d+/i,

        /\bakta\s+\d+/i
    ];


    return patterns.some(
        pattern =>
            pattern.test(value)
    );
}


// =========================================================
// GET FULL MODEL RESPONSE TEXT
// =========================================================

function getGovernmentResponseText(
    data
) {

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
                typeof part?.text ===
                    "string"
                    ? part.text
                    : ""
        )
        .join("\n");
}

// =========================================================
// EXTRACT SENSITIVE TOKENS FROM GOVERNMENT CLAIM
// =========================================================

function extractSensitiveGovernmentTokens(
    text = ""
) {

    const value =
        String(text || "");

    const tokens =
        new Set();


    const patterns = [

        // 180 hari / 15 tahun / 45 tahun
        /\b\d+(?:\.\d+)?\s*(?:hari|tahun|bulan|jam|malam)\b/gi,

        // 1/2
        /\b\d+\s*\/\s*\d+\b/g,

        // RM100 / RM 1,500.00
        /\bRM\s?\d[\d,.]*/gi,

        // 10%
        /\b\d+(?:\.\d+)?\s?%/g,

        // PP.1.3.1 / SR.5.1.5
        /\b[A-Z]{1,6}\.\d+(?:\.\d+)+\b/gi,

        // Akta 227
        /\bAkta\s+\d+\b/gi
    ];


    patterns.forEach(
        pattern => {

            const matches =
                value.match(pattern) || [];


            matches.forEach(
                match => {

                    const normalized =
                        match
                            .toLowerCase()
                            .replace(/\s+/g, " ")
                            .trim();

                    tokens.add(
                        normalized
                    );
                }
            );
        }
    );


    return [
        ...tokens
    ];
}


// =========================================================
// TOKEN COVERAGE AGAINST OFFICIAL GROUNDED SEGMENTS
// =========================================================

function hasOfficialSensitiveTokenCoverage(
    claimText,
    groundingSupports,
    officialSet
) {

    const requiredTokens =
        extractSensitiveGovernmentTokens(
            claimText
        );


    if (
        requiredTokens.length === 0
    ) {
        return false;
    }


    const officialSegmentTexts = [];


    groundingSupports.forEach(
        support => {

            const chunkIndices =
                Array.isArray(
                    support
                        ?.groundingChunkIndices
                )
                    ? support
                        .groundingChunkIndices
                    : [];


            const hasOfficialChunk =
                chunkIndices.some(
                    index =>
                        officialSet.has(
                            index
                        )
                );


            if (!hasOfficialChunk) {
                return;
            }


            const segmentText =
                support
                    ?.segment
                    ?.text;


            if (
                typeof segmentText ===
                    "string"
            ) {

                officialSegmentTexts.push(
                    segmentText
                        .toLowerCase()
                        .replace(/\s+/g, " ")
                        .trim()
                );
            }
        }
    );


    if (
        officialSegmentTexts.length === 0
    ) {
        return false;
    }


    // Gabungkan HANYA output segments yang
    // memang dipautkan kepada official chunks
    const officialGroundedText =
        officialSegmentTexts
            .join(" ");


    // Semua fakta sensitif dalam claim
    // mesti wujud dalam grounded segments.
    return requiredTokens.every(
        token =>
            officialGroundedText.includes(
                token
            )
    );
}


// =========================================================
// ANALYSE SENSITIVE CLAIM COVERAGE
// =========================================================

function analyseSensitiveClaimCoverage(
    data,
    officialChunkIndices = []
) {

    const parts =
        data?.candidates?.[0]
            ?.content
            ?.parts;

    const groundingSupports =
        data?.candidates?.[0]
            ?.groundingMetadata
            ?.groundingSupports || [];

    const officialSet =
        new Set(
            officialChunkIndices
        );


    // ========================================
    // RESPONSE PARTS
    // Gemini offsets adalah UTF-8 BYTES
    // dan relatif kepada setiap Part.
    // ========================================

    if (!Array.isArray(parts)) {

        return {
            required: false,
            passed: true,
            totalClaims: 0,
            supportedClaims: 0,
            unsupportedClaims: []
        };
    }


    const encoder =
        new TextEncoder();


    const getByteLength =
        value =>
            encoder.encode(
                String(value || "")
            ).length;


    const normalizeText =
        value =>
            String(value || "")
                .toLowerCase()

                // buang markdown formatting
                .replace(/[*_`#>|]/g, " ")

                // normalize punctuation/spacing
                .replace(/\s+/g, " ")
                .trim();


    // ========================================
    // FIND SENSITIVE CLAIMS PER PART
    // ========================================

    const sensitiveClaims = [];


    parts.forEach(
        (part, partIndex) => {

            if (
                typeof part?.text !==
                "string"
            ) {
                return;
            }


            const text =
                part.text;

            const lines =
                text.split("\n");

            let currentByteOffset = 0;


            lines.forEach(
                (line, lineIndex) => {

                    const start =
                        currentByteOffset;

                    const lineByteLength =
                        getByteLength(
                            line
                        );

                    const end =
                        start +
                        lineByteLength;

                    const cleanLine =
                        line.trim();


                    if (
                        cleanLine &&
                        hasSensitiveGovernmentFact(
                            cleanLine
                        )
                    ) {

                        sensitiveClaims.push({

                            text:
                                cleanLine,

                            partIndex:
                                partIndex,

                            start:
                                start,

                            end:
                                end
                        });
                    }


                    currentByteOffset =
                        end;

                    // \n = 1 byte UTF-8
                    if (
                        lineIndex <
                        lines.length - 1
                    ) {
                        currentByteOffset += 1;
                    }
                }
            );
        }
    );


    // ========================================
    // NO SENSITIVE FACT
    // ========================================

    if (
        sensitiveClaims.length === 0
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


    // ========================================
    // CHECK CLAIM AGAINST OFFICIAL SUPPORT
    // ========================================

    const unsupportedClaims = [];

    let supportedClaims = 0;


    sensitiveClaims.forEach(
        claim => {

            const officiallySupported =
                groundingSupports.some(
                    support => {

                        const chunkIndices =
                            Array.isArray(
                                support
                                    ?.groundingChunkIndices
                            )
                                ? support
                                    .groundingChunkIndices
                                : [];


                        // Mesti ada sekurang-kurangnya
                        // satu official grounding chunk
                        const hasOfficialChunk =
                            chunkIndices.some(
                                index =>
                                    officialSet.has(
                                        index
                                    )
                            );


                        if (!hasOfficialChunk) {
                            return false;
                        }


                        const segment =
                            support?.segment;


                        if (!segment) {
                            return false;
                        }


                        // =================================
                        // PART INDEX
                        // =================================

                        const segmentPartIndex =
                            Number.isInteger(
                                segment?.partIndex
                            )
                                ? segment.partIndex
                                : 0;


                        if (
                            segmentPartIndex !==
                            claim.partIndex
                        ) {
                            return false;
                        }


                        // =================================
                        // PRIMARY:
                        // UTF-8 BYTE OFFSET OVERLAP
                        // =================================

                        if (
                            Number.isFinite(
                                segment?.startIndex
                            ) &&
                            Number.isFinite(
                                segment?.endIndex
                            )
                        ) {

                            const overlaps =
                                segment.startIndex <
                                    claim.end &&
                                segment.endIndex >
                                    claim.start;


                            if (overlaps) {
                                return true;
                            }
                        }


                        // =================================
                        // FALLBACK:
                        // NORMALIZED SEGMENT TEXT
                        // =================================

                        if (
                            typeof segment?.text ===
                                "string"
                        ) {

                            const claimText =
                                normalizeText(
                                    claim.text
                                );

                            const segmentText =
                                normalizeText(
                                    segment.text
                                );


                            if (
                                segmentText &&
                                claimText &&
                                (
                                    claimText.includes(
                                        segmentText
                                    ) ||
                                    segmentText.includes(
                                        claimText
                                    )
                                )
                            ) {

                                return true;
                            }
                        }

// =================================
// FINAL FALLBACK:
// SENSITIVE TOKEN COVERAGE
// =================================

if (
    hasOfficialSensitiveTokenCoverage(
        claim.text,
        groundingSupports,
        officialSet
    )
) {
    return true;
}

// =================================
// FALLBACK 2:
// SENSITIVE VALUE + CONTEXT MATCH
// =================================

const claimTextNormalized =
    normalizeText(
        claim.text
    );

const segmentTextNormalized =
    normalizeText(
        segment?.text || ""
    );


// Ambil nilai sensitif seperti:
// 90 hari, 180 hari, RM100, 10%
const sensitiveValues =
    claimTextNormalized.match(
        /\b(?:rm\s*)?\d+(?:[.,]\d+)?\s*(?:hari|jam|bulan|malam|km|kilometer|%)?\b/g
    ) || [];


// Keyword konteks penting
const contextKeywords = [
    "gcr",
    "gantian cuti rehat",
    "pemberian awal",
    "award wang tunai",
    "cuti rehat",
    "kelayakan",
    "permohonan"
];


const matchingValue =
    sensitiveValues.some(
        value =>
            value.trim().length > 0 &&
            segmentTextNormalized.includes(
                value.trim()
            )
    );


const matchingContext =
    contextKeywords.some(
        keyword =>
            claimTextNormalized.includes(
                keyword
            ) &&
            segmentTextNormalized.includes(
                keyword
            )
    );


if (
    matchingValue &&
    matchingContext
) {
    return true;
}

                        return false;
                    }
                );


            if (officiallySupported) {

                supportedClaims++;

            } else {

                unsupportedClaims.push(
                    claim.text
                );
            }
        }
    );


    return {

        required:
            true,

        passed:
            unsupportedClaims.length === 0,

        totalClaims:
            sensitiveClaims.length,

        supportedClaims:
            supportedClaims,

        unsupportedClaims:
            unsupportedClaims
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

        const sensitiveClaimCoverage =
    analyseSensitiveClaimCoverage(
        data,
        verification.officialChunkIndices
    );

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