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
// CHECK GOV.MY HOSTNAME
// =========================================================

function isGovernmentHostname(hostname = "") {

    const host =
        String(hostname)
            .toLowerCase()
            .trim();

    return (
        host === "gov.my" ||
        host.endsWith(".gov.my")
    );
}


// =========================================================
// RESOLVE & VERIFY OFFICIAL GOVERNMENT SOURCE
// =========================================================

async function resolveOfficialGovernmentSource(web = {}) {

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
            isGovernmentHostname(
                directUrl.hostname
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
    // FOLLOW REDIRECT
    // ========================================

    try {

        const response =
            await fetch(
                originalUri,
                {
                    method:
                        "GET",

                    redirect:
                        "follow",

                    headers: {
                        "User-Agent":
                            "Mozilla/5.0 i4uManage-Sarah"
                    }
                }
            );


        const finalUri =
            response.url;


        // Tak perlu download seluruh page
        if (response.body) {

            try {
                await response.body.cancel();
            } catch (error) {
                // ignore
            }
        }


        const finalUrl =
            new URL(finalUri);


        // ========================================
        // FINAL DOMAIN MUST BE GOV.MY
        // ========================================

        if (
            !isGovernmentHostname(
                finalUrl.hostname
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

        console.warn(
            "Unable to resolve grounding source:",
            originalUri
        );


        return null;
    }
}

// =========================================================
// ANALYSE GROUNDING
// =========================================================

async function analyseGrounding(data) {

    const metadata =
        data?.candidates?.[0]
            ?.groundingMetadata;


    const queries =
        Array.isArray(
            metadata?.webSearchQueries
        )
            ? metadata.webSearchQueries
            : [];


    const chunks =
        Array.isArray(
            metadata?.groundingChunks
        )
            ? metadata.groundingChunks
            : [];


    const supports =
        Array.isArray(
            metadata?.groundingSupports
        )
            ? metadata.groundingSupports
            : [];


    // ===============================
    // OFFICIAL CHUNKS
    // ===============================

    const officialChunkIndices =
        new Set();


    const officialSources = [];


// ========================================
// VERIFY EACH GROUNDING SOURCE
// ========================================

for (
    let index = 0;
    index < chunks.length;
    index++
) {

    const web =
        chunks[index]?.web;


    if (!web) {
        continue;
    }


    const officialSource =
        await resolveOfficialGovernmentSource(
            web
        );


    if (!officialSource) {
        continue;
    }


    officialChunkIndices.add(
        index
    );


    officialSources.push(
        officialSource
    );
}


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

        verified:
            queries.length > 0 &&
            officialSources.length > 0 &&
            hasOfficialSupport
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
// STRONG RETRY INSTRUCTION
// =========================================================

function getRetryInstruction() {

    return `
PENGESAHAN PERTAMA TIDAK MENEMUI BUKTI RASMI YANG MENCUKUPI.

Jalankan Google Search SEKALI LAGI.

Gunakan carian khusus sumber kerajaan Malaysia, termasuk pendekatan seperti:

site:gov.my
site:jpa.gov.my
site:docs.jpa.gov.my
site:mof.gov.my
site:moh.gov.my
site:anm.gov.my

Cari dokumen rasmi yang paling relevan dan terkini.

JANGAN memberikan fakta spesifik sehingga sumber rasmi ditemui.
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
// FALLBACK - VERIFIED MODE FAILED
// =========================================================

function createVerificationFailureResponse(
    checkedAt
) {

    return {

        candidates: [
            {
                content: {
                    role:
                        "model",

                    parts: [
                        {
                            text:
                                "Maklumat spesifik ini tidak dapat disahkan daripada sumber rasmi kerajaan yang mencukupi buat masa ini. Saya tidak akan memberikan kadar, nombor pekeliling, kelayakan atau fakta khusus yang tidak dapat disahkan. Sila rujuk badan induk rasmi yang berkaitan untuk pengesahan."
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

            officialSourceCount:
                0,

            officialSources:
                []

        }

    };
}


// =========================================================
// MAIN HANDLER
// =========================================================

export default async function handler(
    req,
    res
) {

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


        // ===============================
        // GOVERNMENT MODE
        // ===============================

        // Server detect sendiri.
        // Jangan bergantung sepenuhnya pada frontend.
        const governmentMode =
            government_mode === true ||
            isGovernmentQuery(
                latestUserMessage
            );


        // Malaysia timestamp
        const checkedAt =
            new Date()
                .toISOString();


        // ===============================
        // BUILD PAYLOAD
        // ===============================

        let payload =
            addGoogleSearchTool(
                clientPayload
            );


        if (governmentMode) {

            payload =
                appendSystemInstruction(
                    payload,
                    getGovernmentInstruction(
                        checkedAt
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
                data
            );


        // ===============================
        // RETRY IF NOT VERIFIED
        // ===============================

        if (!verification.verified) {

            console.warn(
                "Government response not sufficiently verified. Retrying with official-source instruction."
            );


            let retryPayload =
                appendSystemInstruction(
                    payload,
                    getRetryInstruction()
                );


            const retryResult =
                await callGemini(
                    GOOGLE_URL,
                    retryPayload
                );


            if (
                retryResult
                    .response
                    .ok
            ) {

                const retryVerification =
                    await analyseGrounding(
                        retryResult.data
                    );


                // Gunakan retry jika lebih baik
                if (
                    retryVerification
                        .verified
                ) {

                    data =
                        retryResult.data;


                    verification =
                        retryVerification;
                }
            }
        }


        // ===============================
        // FAIL CLOSED
        // ===============================

        if (!verification.verified) {

            console.warn(
                "Verified Government Mode failed.",
                {
                    query:
                        latestUserMessage,

                    searched:
                        verification.searched,

                    officialSources:
                        verification
                            .officialSourceCount
                }
            );


            return res
                .status(200)
                .json(
                    createVerificationFailureResponse(
                        checkedAt
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

            searched:
                verification
                    .searched,

            checkedAt:
                checkedAt,

            officialSourceCount:
                verification
                    .officialSourceCount,

            officialSources:
                verification
                    .officialSources,

            searchQueries:
                verification
                    .searchQueries

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