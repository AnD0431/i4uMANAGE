// =========================================================
// i4uManage
// AKD AUTO INDEXER
// =========================================================

const GAS_URL =
    process.env.I4UMANAGE_GAS_URL;

const DOC_SECRET =
    process.env.I4UMANAGE_DOC_SECRET;

const GEMINI_API_KEY =
    process.env.GEMINI_API_KEY;

const MODEL =
    process.env.GEMINI_MODEL ||
    "gemini-3.7-flash";


const MAX_PDF_BYTES =
    8 * 1024 * 1024;


// =========================================================
// CALL GOOGLE APPS SCRIPT
// =========================================================

async function callGas(
    payload
) {

    if (
        !GAS_URL ||
        !DOC_SECRET
    ) {

        throw new Error(
            "Document service configuration incomplete."
        );
    }


    const response =
        await fetch(
            GAS_URL,
            {
                method:
                    "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({

                        token:
                            DOC_SECRET,

                        ...payload

                    })
            }
        );


    const text =
        await response.text();


    let data;


    try {

        data =
            JSON.parse(
                text
            );

    } catch {

        throw new Error(
            "Invalid Apps Script response."
        );

    }


    if (
        !response.ok ||
        !data.success
    ) {

        throw new Error(
            data.error ||
            "Apps Script request failed."
        );

    }


    return data;
}


// =========================================================
// GET AKD DOCUMENTS
// =========================================================

async function getAkdDocuments() {

    const data =
        await callGas({
            source:
                "akd"
        });


    return Array.isArray(
        data.documents
    )
        ? data.documents
        : [];
}


// =========================================================
// GET EXISTING INDEX
// =========================================================

async function getAkdIndex() {

    const data =
        await callGas({
            source:
                "akd-index"
        });


    return {

        version:
            Number(
                data.version || 1
            ),

        documents:
            Array.isArray(
                data.documents
            )
                ? data.documents
                : [],

        updatedAt:
            data.updatedAt ||
            null

    };
}


// =========================================================
// SAVE INDEX
// =========================================================

async function saveAkdIndex(
    documents
) {

    return callGas({

        source:
            "akd-index-save",

        documents:
            documents

    });
}


// =========================================================
// CHECK WHETHER DOCUMENT NEEDS REINDEX
// =========================================================

function needsReindex(
    document,
    existing
) {

    if (!existing) {
        return true;
    }


    if (
        String(
            existing.updatedAt || ""
        ) !==
        String(
            document.updatedAt || ""
        )
    ) {

        return true;
    }


    if (
        !existing.summary ||
        !Array.isArray(
            existing.topics
        ) ||
        !Array.isArray(
            existing.keywords
        )
    ) {

        return true;
    }


    return false;
}


// =========================================================
// DOWNLOAD PDF
// =========================================================

async function downloadPdf(
    document
) {

    if (!document?.id) {

        throw new Error(
            "Missing document ID."
        );

    }


    if (
        Number(document.size) >
        MAX_PDF_BYTES
    ) {

        throw new Error(
            "PDF exceeds indexing size limit."
        );

    }


    const url =
        `https://drive.google.com/uc?export=download&id=${encodeURIComponent(
            document.id
        )}`;


    const controller =
        new AbortController();


    const timeout =
        setTimeout(
            () =>
                controller.abort(),
            20000
        );


    try {

        const response =
            await fetch(
                url,
                {
                    redirect:
                        "follow",

                    signal:
                        controller.signal,

                    headers: {
                        "User-Agent":
                            "i4uManage-AKD-Indexer"
                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                `PDF download failed: ${response.status}`
            );

        }


        const arrayBuffer =
            await response
                .arrayBuffer();


        if (
            arrayBuffer.byteLength === 0
        ) {

            throw new Error(
                "Empty PDF."
            );

        }


        if (
            arrayBuffer.byteLength >
            MAX_PDF_BYTES
        ) {

            throw new Error(
                "PDF exceeds indexing size limit."
            );

        }


        const buffer =
            Buffer.from(
                arrayBuffer
            );


        const signature =
            buffer
                .subarray(
                    0,
                    4
                )
                .toString(
                    "utf8"
                );


        if (
            signature !== "%PDF"
        ) {

            throw new Error(
                "Downloaded file is not a valid PDF."
            );

        }


        return buffer;


    } finally {

        clearTimeout(
            timeout
        );

    }

}


// =========================================================
// SAFE JSON EXTRACTION
// =========================================================

function extractJson(
    text
) {

    let clean =
        String(
            text || ""
        )
            .trim();


    clean =
        clean
            .replace(
                /^```json\s*/i,
                ""
            )
            .replace(
                /^```\s*/i,
                ""
            )
            .replace(
                /\s*```$/i,
                ""
            )
            .trim();


    const firstBrace =
        clean.indexOf(
            "{"
        );


    const lastBrace =
        clean.lastIndexOf(
            "}"
        );


    if (
        firstBrace === -1 ||
        lastBrace === -1
    ) {

        throw new Error(
            "AI did not return valid JSON."
        );

    }


    return JSON.parse(
        clean.slice(
            firstBrace,
            lastBrace + 1
        )
    );
}


// =========================================================
// AI ANALYSE ONE PDF
// =========================================================

async function analyseAkdDocument(
    document,
    pdfBuffer
) {

    if (!GEMINI_API_KEY) {

        throw new Error(
            "GEMINI_API_KEY missing."
        );

    }


    const googleUrl =
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;


    const prompt = `
Anda sedang membina indeks dalaman untuk sistem
i4uManage, Jabatan Kesihatan Negeri Terengganu.

BACA PDF yang dilampirkan.

Hasilkan metadata carian untuk membantu sistem memilih
dokumen paling relevan apabila pengguna bertanya soalan.

Nama fail:
${document.name}

Tahun metadata:
${document.year || ""}

Keluarkan JSON SAHAJA dengan struktur tepat:

{
  "title": "tajuk sebenar atau tajuk paling sesuai",
  "summary": "ringkasan padat 2 hingga 4 ayat tentang tujuan dan kandungan utama dokumen",
  "topics": [
    "topik utama"
  ],
  "keywords": [
    "kata kunci carian"
  ]
}

PERATURAN:

- Gunakan Bahasa Melayu.
- Topics mestilah 3 hingga 10 item.
- Keywords mestilah 5 hingga 20 item.
- Masukkan istilah penting, singkatan, jenis perbelanjaan,
  urusan, prosedur atau subjek yang benar-benar terdapat
  dalam dokumen.
- Jangan cipta fakta yang tidak terdapat dalam PDF.
- Jangan masukkan markdown.
- Jangan masukkan penerangan selain JSON.
`;


    const payload = {

        contents: [
            {
                role:
                    "user",

                parts: [

                    {
                        text:
                            prompt
                    },

                    {
                        inline_data: {

                            mime_type:
                                "application/pdf",

                            data:
                                pdfBuffer
                                    .toString(
                                        "base64"
                                    )

                        }
                    }

                ]
            }
        ],

        generationConfig: {

            temperature:
                0.1,

            responseMimeType:
                "application/json"

        }

    };


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


    if (!response.ok) {

        console.error(
            "Gemini AKD indexing error:",
            data
        );


        throw new Error(
            data?.error?.message ||
            "AI indexing failed."
        );

    }


    const text =
        (
            data
                ?.candidates?.[0]
                ?.content
                ?.parts ||
            []
        )
            .filter(
                part =>
                    typeof part?.text ===
                    "string"
            )
            .map(
                part =>
                    part.text
            )
            .join("\n");


    const result =
        extractJson(
            text
        );


    return {

        title:
            String(
                result.title ||
                document.name
            )
                .trim(),

        summary:
            String(
                result.summary ||
                ""
            )
                .trim(),

        topics:
            Array.isArray(
                result.topics
            )
                ?
                result.topics
                    .map(
                        item =>
                            String(item)
                                .trim()
                    )
                    .filter(Boolean)
                    .slice(
                        0,
                        10
                    )
                :
                [],

        keywords:
            Array.isArray(
                result.keywords
            )
                ?
                result.keywords
                    .map(
                        item =>
                            String(item)
                                .trim()
                    )
                    .filter(Boolean)
                    .slice(
                        0,
                        20
                    )
                :
                []

    };
}


// =========================================================
// INDEX ONE DOCUMENT
// =========================================================

async function indexDocument(
    document
) {

    const mimeType =
        String(
            document.mimeType ||
            ""
        )
            .toLowerCase();


    if (
        !mimeType.includes(
            "pdf"
        )
    ) {

        return {

            id:
                document.id,

            name:
                document.name,

            url:
                document.url,

            mimeType:
                document.mimeType,

            size:
                document.size,

            year:
                document.year,

            updatedAt:
                document.updatedAt,

            indexedAt:
                new Date()
                    .toISOString(),

            indexStatus:
                "unsupported",

            title:
                document.name,

            summary:
                "",

            topics:
                [],

            keywords:
                []

        };

    }


    try {

        const pdf =
            await downloadPdf(
                document
            );


        const ai =
            await analyseAkdDocument(
                document,
                pdf
            );


        return {

            id:
                document.id,

            name:
                document.name,

            url:
                document.url,

            mimeType:
                document.mimeType,

            size:
                document.size,

            year:
                document.year,

            updatedAt:
                document.updatedAt,

            indexedAt:
                new Date()
                    .toISOString(),

            indexStatus:
                "ready",

            title:
                ai.title,

            summary:
                ai.summary,

            topics:
                ai.topics,

            keywords:
                ai.keywords

        };


    } catch (error) {

        console.error(
            "AKD index failed:",
            document.name,
            error?.message ||
            error
        );


        return {

            id:
                document.id,

            name:
                document.name,

            url:
                document.url,

            mimeType:
                document.mimeType,

            size:
                document.size,

            year:
                document.year,

            updatedAt:
                document.updatedAt,

            indexedAt:
                new Date()
                    .toISOString(),

            indexStatus:
                "failed",

            indexError:
                error?.message ||
                "Indexing failed.",

            title:
                document.name,

            summary:
                "",

            topics:
                [],

            keywords:
                []

        };

    }

}


// =========================================================
// SYNC INDEX
// =========================================================

async function syncAkdIndex() {

    const [
        documents,
        currentIndex
    ] =
        await Promise.all([

            getAkdDocuments(),

            getAkdIndex()

        ]);


    const existingMap =
        new Map(
            currentIndex
                .documents
                .map(
                    item => [
                        String(
                            item.id
                        ),
                        item
                    ]
                )
        );


    const finalDocuments =
        [];


    const indexedNow =
        [];


    for (
        const document
        of documents
    ) {

        const existing =
            existingMap.get(
                String(
                    document.id
                )
            );


        if (
            needsReindex(
                document,
                existing
            )
        ) {

            console.log(
                "AKD_INDEXING:",
                document.name
            );


            const indexed =
                await indexDocument(
                    document
                );


            finalDocuments.push(
                indexed
            );


            indexedNow.push(
                document.name
            );


        } else {

            finalDocuments.push(
                existing
            );

        }

    }


    // Fail yang telah dipadam dari Drive
    // tidak dimasukkan semula ke index.

    await saveAkdIndex(
        finalDocuments
    );


    return {

        success:
            true,

        totalDocuments:
            documents.length,

        indexedNow:
            indexedNow.length,

        indexedDocuments:
            indexedNow,

        documents:
            finalDocuments

    };

}


// =========================================================
// HANDLER
// =========================================================

export default async function handler(
    req,
    res
) {

    if (
        req.method !== "GET" &&
        req.method !== "POST"
    ) {

        return res
            .status(405)
            .json({

                success:
                    false,

                error:
                    "Method not allowed."

            });

    }


    try {

        // ========================================
        // GET = BACA INDEX SAHAJA
        // ========================================

        if (
            req.method === "GET"
        ) {

            const index =
                await getAkdIndex();


            res.setHeader(
                "Cache-Control",
                "no-store"
            );


            return res
                .status(200)
                .json({

                    success:
                        true,

                    source:
                        "akd-index",

                    ...index

                });

        }


        // ========================================
        // POST = SYNC / AUTO INDEX
        // ========================================

        const result =
            await syncAkdIndex();


        return res
            .status(200)
            .json(
                result
            );


    } catch (error) {

        console.error(
            "AKD Auto Index error:",
            error
        );


        return res
            .status(500)
            .json({

                success:
                    false,

                error:
                    error?.message ||
                    "AKD index service failed."

            });

    }

}