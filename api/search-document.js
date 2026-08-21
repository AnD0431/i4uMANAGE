const TYPES = [
    {
        slug: "kertas-kerja",
        name: "KERTAS KERJA"
    },
    {
        slug: "slide-kursus",
        name: "SLIDE KURSUS"
    }
];


const CATEGORIES = [
    {
        slug: "pembangunan",
        name: "PEMBANGUNAN"
    },
    {
        slug: "teknologi-maklumat",
        name: "TEKNOLOGI MAKLUMAT"
    },
    {
        slug: "latihan",
        name: "LATIHAN"
    },
    {
        slug: "psikologi-kaunseling",
        name: "PSIKOLOGI & KAUNSELING"
    },
    {
        slug: "sumber-manusia",
        name: "SUMBER MANUSIA"
    },
    {
        slug: "pentadbiran",
        name: "PENTADBIRAN"
    },
    {
        slug: "perolehan-aset",
        name: "PEROLEHAN & ASET"
    },
    {
        slug: "kewangan",
        name: "KEWANGAN"
    }
];


// ======================================
// NORMALIZE SEARCH TEXT
// ======================================

function normalizeText(text = "") {

    return String(text)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s&-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


// ======================================
// SEARCH SCORE
// ======================================

function calculateScore(item, query) {

    const normalizedQuery =
        normalizeText(query);


    const terms =
        normalizedQuery
            .split(" ")
            .filter(Boolean);


    const documentName =
        normalizeText(item.name);


    const programName =
        normalizeText(item.programName);


    const categoryName =
        normalizeText(item.categoryName);


    const typeName =
        normalizeText(item.typeName);


    const haystack = [
        documentName,
        programName,
        categoryName,
        typeName
    ].join(" ");


    // Semua keyword mesti wujud
    const allTermsMatch =
        terms.every(term =>
            haystack.includes(term)
        );


    if (!allTermsMatch) {
        return 0;
    }


    let score = 1;


    // Exact phrase dalam nama fail
    if (
        documentName.includes(normalizedQuery)
    ) {
        score += 100;
    }


    // Exact phrase dalam nama program
    if (
        programName.includes(normalizedQuery)
    ) {
        score += 70;
    }


    // Individual keyword
    terms.forEach(term => {

        if (documentName.includes(term)) {
            score += 20;
        }

        if (programName.includes(term)) {
            score += 15;
        }

        if (categoryName.includes(term)) {
            score += 5;
        }

        if (typeName.includes(term)) {
            score += 5;
        }

    });


    return score;
}


// ======================================
// FETCH ONE DRIVE CATEGORY
// ======================================

async function fetchDocumentSource(
    gasUrl,
    apiSecret,
    type,
    category
) {

    try {

        const response =
            await fetch(
                gasUrl,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        token:
                            apiSecret,

                        type:
                            type,

                        category:
                            category
                    })
                }
            );


        const text =
            await response.text();


        let data;


        try {

            data =
                JSON.parse(text);

        } catch {

            console.error(
                "Invalid Apps Script response:",
                text
            );

            return null;
        }


        if (!data.success) {

            console.error(
                "Apps Script source error:",
                data
            );

            return null;
        }


        return data;


    } catch (error) {

        console.error(
            "Unable to fetch document source:",
            error
        );

        return null;
    }
}


// ======================================
// MAIN API
// ======================================

export default async function handler(req, res) {

    if (req.method !== "GET") {

        return res
            .status(405)
            .json({
                success: false,
                error: "Method not allowed."
            });
    }


    try {

        const query =
            String(req.query.q || "")
                .trim();


        // ==============================
        // VALIDATE QUERY
        // ==============================

        if (query.length < 2) {

            return res
                .status(400)
                .json({
                    success: false,
                    error:
                        "Search query must contain at least 2 characters."
                });
        }


        // ==============================
        // ENVIRONMENT VARIABLES
        // ==============================

        const GAS_URL =
            process.env.I4UMANAGE_GAS_URL;


        const API_SECRET =
            process.env.I4UMANAGE_DOC_SECRET;


        if (!GAS_URL || !API_SECRET) {

            console.error(
                "Search API environment variables missing."
            );

            return res
                .status(500)
                .json({
                    success: false,
                    error:
                        "Server configuration incomplete."
                });
        }


        // ==============================
        // BUILD ALL SOURCES
        // ==============================

        const sources = [];


        TYPES.forEach(type => {

            CATEGORIES.forEach(category => {

                sources.push({
                    type:
                        type.slug,

                    category:
                        category.slug
                });

            });

        });


        // 2 jenis × 8 kategori = 16 request
        const responses =
            await Promise.all(

                sources.map(source =>

                    fetchDocumentSource(
                        GAS_URL,
                        API_SECRET,
                        source.type,
                        source.category
                    )

                )
            );


        // ==============================
        // FLATTEN DOCUMENT DATA
        // ==============================

        const documents = [];


        responses.forEach(data => {

            if (
                !data ||
                !Array.isArray(data.programs)
            ) {
                return;
            }


            data.programs.forEach(program => {

                if (
                    !Array.isArray(program.documents)
                ) {
                    return;
                }


                program.documents.forEach(document => {

                    documents.push({

                        id:
                            document.id,

                        name:
                            document.name,

                        mimeType:
                            document.mimeType,

                        size:
                            document.size,

                        url:
                            document.url,

                        updatedAt:
                            document.updatedAt,


                        // Program
                        programId:
                            program.id,

                        programName:
                            program.name,

                        year:
                            program.year,


                        // Category
                        category:
                            data.category,

                        categoryName:
                            data.categoryName,


                        // Type
                        type:
                            data.type,

                        typeName:
                            data.typeName

                    });

                });

            });

        });


        // ==============================
        // REMOVE DUPLICATES
        // ==============================

        const uniqueDocuments =
            [
                ...new Map(
                    documents.map(item => [
                        item.id,
                        item
                    ])
                ).values()
            ];


        // ==============================
        // SEARCH
        // ==============================

        const results =
            uniqueDocuments
                .map(item => ({

                    ...item,

                    score:
                        calculateScore(
                            item,
                            query
                        )

                }))
                .filter(item =>
                    item.score > 0
                )
                .sort(
                    (a, b) =>
                        b.score - a.score
                )
                .slice(0, 10);


        // ==============================
        // RESPONSE
        // ==============================

        res.setHeader(
            "Cache-Control",
            "no-store"
        );


        return res
            .status(200)
            .json({

                success: true,

                query:
                    query,

                totalDocumentsScanned:
                    uniqueDocuments.length,

                count:
                    results.length,

                results:
                    results.map(
                        ({ score, ...item }) =>
                            item
                    )

            });


    } catch (error) {

        console.error(
            "Document search error:",
            error
        );


        return res
            .status(500)
            .json({
                success: false,
                error:
                    "Unable to search documents."
            });
    }
}