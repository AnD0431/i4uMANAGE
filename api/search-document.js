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


const ALLOWED_TYPES =
    new Set(
        TYPES.map(item => item.slug)
    );


const ALLOWED_CATEGORIES =
    new Set(
        CATEGORIES.map(item => item.slug)
    );


// ======================================
// NORMALIZE
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


    // Kalau user hanya guna filter,
    // semua dokumen yang lepas filter dianggap match.
    if (!normalizedQuery) {
        return 1;
    }


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


    const allTermsMatch =
        terms.every(term =>
            haystack.includes(term)
        );


    if (!allTermsMatch) {
        return 0;
    }


    let score = 1;


    // Nama fail exact phrase
    if (
        documentName.includes(
            normalizedQuery
        )
    ) {
        score += 100;
    }


    // Nama program exact phrase
    if (
        programName.includes(
            normalizedQuery
        )
    ) {
        score += 70;
    }


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
// APPS SCRIPT REQUEST
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


        const responseText =
            await response.text();


        let data;


        try {

            data =
                JSON.parse(
                    responseText
                );

        } catch {

            console.error(
                "Invalid Apps Script response:",
                responseText
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
// API HANDLER
// ======================================

export default async function handler(
    req,
    res
) {

    if (req.method !== "GET") {

        return res
            .status(405)
            .json({
                success: false,
                error:
                    "Method not allowed."
            });
    }


    try {

        // ==================================
        // PARAMETERS
        // ==================================

        const query =
            String(
                req.query.q || ""
            )
            .trim();


        const type =
            String(
                req.query.type || ""
            )
            .trim();


        const category =
            String(
                req.query.category || ""
            )
            .trim();


        const yearRaw =
            String(
                req.query.year || ""
            )
            .trim();


        const year =
            yearRaw
                ? Number(yearRaw)
                : null;


        // ==================================
        // VALIDATION
        // ==================================

        if (
            type &&
            !ALLOWED_TYPES.has(type)
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    error:
                        "Invalid document type."
                });
        }


        if (
            category &&
            !ALLOWED_CATEGORIES.has(
                category
            )
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    error:
                        "Invalid category."
                });
        }


        if (
            yearRaw &&
            (
                !Number.isInteger(year) ||
                year < 2000 ||
                year > 2100
            )
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    error:
                        "Invalid year."
                });
        }


        // User mesti bagi sekurang-kurangnya
        // keyword ATAU satu filter.
        if (
            query.length < 2 &&
            !type &&
            !category &&
            !year
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    error:
                        "Please provide a search keyword or filter."
                });
        }


        // ==================================
        // ENVIRONMENT
        // ==================================

        const GAS_URL =
            process.env.I4UMANAGE_GAS_URL;


        const API_SECRET =
            process.env.I4UMANAGE_DOC_SECRET;


        if (
            !GAS_URL ||
            !API_SECRET
        ) {

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


        // ==================================
        // FILTER SOURCE
        // ==================================

        const selectedTypes =
            type
                ? TYPES.filter(
                    item =>
                        item.slug === type
                )
                : TYPES;


        const selectedCategories =
            category
                ? CATEGORIES.filter(
                    item =>
                        item.slug === category
                )
                : CATEGORIES;


        const sources = [];


        selectedTypes.forEach(
            typeItem => {

                selectedCategories.forEach(
                    categoryItem => {

                        sources.push({

                            type:
                                typeItem.slug,

                            category:
                                categoryItem.slug

                        });

                    }
                );

            }
        );


        // ==================================
        // FETCH DRIVE DATA
        // ==================================

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


        // ==================================
        // FLATTEN
        // ==================================

        const documents = [];


        responses.forEach(data => {

            if (
                !data ||
                !Array.isArray(
                    data.programs
                )
            ) {
                return;
            }


            data.programs.forEach(
                program => {

                    if (
                        !Array.isArray(
                            program.documents
                        )
                    ) {
                        return;
                    }


                    // YEAR FILTER
                    if (
                        year &&
                        Number(program.year) !== year
                    ) {
                        return;
                    }


                    program.documents.forEach(
                        document => {

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


                                programId:
                                    program.id,

                                programName:
                                    program.name,

                                year:
                                    program.year,


                                category:
                                    data.category,

                                categoryName:
                                    data.categoryName,


                                type:
                                    data.type,

                                typeName:
                                    data.typeName

                            });

                        }
                    );

                }
            );

        });


        // ==================================
        // REMOVE DUPLICATES
        // ==================================

        const uniqueDocuments =
            [
                ...new Map(

                    documents.map(
                        item => [
                            item.id,
                            item
                        ]
                    )

                ).values()
            ];


        // ==================================
        // SEARCH
        // ==================================

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

                .filter(
                    item =>
                        item.score > 0
                )

                .sort(
                    (a, b) =>
                        b.score - a.score
                )

                .slice(0, 20);


        // ==================================
        // RESPONSE
        // ==================================

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

                filters: {

                    type:
                        type || null,

                    category:
                        category || null,

                    year:
                        year || null

                },

                totalDocumentsScanned:
                    uniqueDocuments.length,

                count:
                    results.length,

                results:
                    results.map(
                        ({
                            score,
                            ...item
                        }) => item
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