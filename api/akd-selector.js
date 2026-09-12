// =========================================================
// i4uManage
// AKD AI DOCUMENT SELECTOR
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


// =========================================================
// GET AKD INDEX
// =========================================================

async function getAkdIndex() {

    if (
        !GAS_URL ||
        !DOC_SECRET
    ) {

        throw new Error(
            "AKD service configuration incomplete."
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

                        source:
                            "akd-index"

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
            "Invalid AKD index response."
        );

    }


    if (
        !response.ok ||
        !data.success
    ) {

        throw new Error(
            data.error ||
            "Unable to retrieve AKD index."
        );

    }


    return Array.isArray(
        data.documents
    )
        ? data.documents
        : [];
}


// =========================================================
// EXTRACT JSON FROM GEMINI
// =========================================================

function extractJson(
    text = ""
) {

    let clean =
        String(text || "")
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


    const start =
        clean.indexOf("{");

    const end =
        clean.lastIndexOf("}");


    if (
        start === -1 ||
        end === -1
    ) {

        throw new Error(
            "Selector returned invalid JSON."
        );

    }


    return JSON.parse(
        clean.slice(
            start,
            end + 1
        )
    );
}


// =========================================================
// BUILD COMPACT CATALOG
// =========================================================

function buildCatalog(
    documents
) {

    return documents
        .filter(
            document =>
                document.indexStatus ===
                    "ready"
        )
        .map(
            document => ({

                id:
                    document.id,

                name:
                    document.name,

                title:
                    document.title,

                year:
                    document.year,

                summary:
                    document.summary,

                topics:
                    Array.isArray(
                        document.topics
                    )
                        ? document.topics
                        : [],

                keywords:
                    Array.isArray(
                        document.keywords
                    )
                        ? document.keywords
                        : []

            })
        );
}


// =========================================================
// AI SELECT DOCUMENTS
// =========================================================

async function selectDocumentsWithAi(
    query,
    documents
) {

    if (!GEMINI_API_KEY) {

        throw new Error(
            "GEMINI_API_KEY missing."
        );
    }


    const catalog =
        buildCatalog(
            documents
        );


    if (
        catalog.length === 0
    ) {

        return {
            selectedIds: [],
            reason:
                "Tiada dokumen AKD yang telah diindeks."
        };
    }


    const prompt = `
Anda ialah enjin pemilihan dokumen
Arahan Kawalan Dalaman bagi i4uManage.

TUGAS:

Berdasarkan soalan pengguna, pilih maksimum
3 dokumen PALING RELEVAN daripada katalog AKD.

SOALAN PENGGUNA:

${query}


KATALOG DOKUMEN:

${JSON.stringify(
    catalog,
    null,
    2
)}


PERATURAN:

1. Gunakan title, summary, topics dan keywords.

2. Jangan pilih dokumen hanya kerana satu perkataan
   umum sepadan.

3. Fahami maksud soalan secara semantik.

4. Utamakan dokumen yang kandungannya paling mungkin
   mempunyai jawapan.

5. Pilih maksimum 3 dokumen.

6. Jika satu dokumen jelas paling relevan,
   pilih satu sahaja.

7. Jangan cipta ID.

8. Semua selectedIds WAJIB datang daripada
   katalog yang diberikan.

9. Jika tiada dokumen relevan, pulangkan
   selectedIds sebagai array kosong.

OUTPUT JSON SAHAJA:

{
  "selectedIds": [
    "file-id"
  ],
  "reason": "sebab ringkas pemilihan"
}
`;


    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;


    const response =
        await fetch(
            url,
            {
                method:
                    "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({

                        contents: [
                            {
                                role:
                                    "user",

                                parts: [
                                    {
                                        text:
                                            prompt
                                    }
                                ]
                            }
                        ],

                        generationConfig: {

                            temperature:
                                0,

                            responseMimeType:
                                "application/json"

                        }

                    })
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        console.error(
            "AKD Selector Gemini error:",
            data
        );


        throw new Error(
            data?.error?.message ||
            "AI document selection failed."
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


    return extractJson(
        text
    );
}


// =========================================================
// VALIDATE AI SELECTION
// =========================================================

function resolveSelectedDocuments(
    documents,
    selection
) {

    const allowedMap =
        new Map(
            documents.map(
                document => [
                    String(
                        document.id
                    ),
                    document
                ]
            )
        );


    const ids =
        Array.isArray(
            selection?.selectedIds
        )
            ? selection.selectedIds
            : [];


    const selected =
        [];


    for (
        const id
        of ids
    ) {

        const document =
            allowedMap.get(
                String(id)
            );


        if (!document) {
            continue;
        }


        if (
            selected.some(
                item =>
                    item.id ===
                    document.id
            )
        ) {

            continue;
        }


        selected.push(
            document
        );


        if (
            selected.length === 3
        ) {

            break;
        }

    }


    return selected;
}


// =========================================================
// HANDLER
// =========================================================

export default async function handler(
    req,
    res
) {

    if (
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

        const query =
            String(
                req.body?.query ||
                ""
            )
                .trim();


        if (!query) {

            return res
                .status(400)
                .json({

                    success:
                        false,

                    error:
                        "Query is required."

                });

        }


        // ========================================
        // READ AUTO INDEX
        // ========================================

        const documents =
            await getAkdIndex();


        const readyDocuments =
            documents.filter(
                document =>
                    document.indexStatus ===
                        "ready"
            );


        if (
            readyDocuments.length === 0
        ) {

            return res
                .status(200)
                .json({

                    success:
                        true,

                    query:
                        query,

                    totalIndexed:
                        0,

                    totalSelected:
                        0,

                    reason:
                        "Tiada dokumen AKD yang telah diindeks.",

                    documents:
                        []

                });

        }


        // ========================================
        // AI SELECTOR
        // ========================================

        const selection =
            await selectDocumentsWithAi(
                query,
                readyDocuments
            );


        const selectedDocuments =
            resolveSelectedDocuments(
                readyDocuments,
                selection
            );


        // ========================================
        // RESPONSE
        // ========================================

        res.setHeader(
            "Cache-Control",
            "no-store"
        );


        return res
            .status(200)
            .json({

                success:
                    true,

                query:
                    query,

                totalIndexed:
                    readyDocuments.length,

                totalSelected:
                    selectedDocuments.length,

                reason:
                    String(
                        selection.reason ||
                        ""
                    ),

                documents:
                    selectedDocuments.map(
                        document => ({

                            id:
                                document.id,

                            name:
                                document.name,

                            title:
                                document.title,

                            year:
                                document.year,

                            summary:
                                document.summary,

                            topics:
                                document.topics,

                            keywords:
                                document.keywords,

                            url:
                                document.url

                        })
                    )

            });


    } catch (error) {

        console.error(
            "AKD Selector error:",
            error
        );


        return res
            .status(500)
            .json({

                success:
                    false,

                error:
                    error?.message ||
                    "AKD document selector failed."

            });

    }

}