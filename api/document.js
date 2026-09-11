// =========================================================
// i4uManage - DOCUMENT API
// Vercel Serverless Function
// =========================================================

const ALLOWED_TYPES = new Set([
    "kertas-kerja",
    "slide-kursus"
]);


const ALLOWED_CATEGORIES = new Set([
    "pembangunan",
    "teknologi-maklumat",
    "latihan",
    "psikologi-kaunseling",
    "sumber-manusia",
    "pentadbiran",
    "perolehan-aset",
    "kewangan"
]);


// =========================================================
// MAIN HANDLER
// =========================================================

export default async function handler(
    req,
    res
) {

    // =====================================================
    // METHOD
    // =====================================================

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

        // =================================================
        // PARAMETERS
        // =================================================

        const type =
            String(
                req.query.type || ""
            )
            .toLowerCase()
            .trim();


        const category =
            String(
                req.query.category || ""
            )
            .toLowerCase()
            .trim();


        // =================================================
        // VALIDATION
        // =================================================

        if (
            !type ||
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
            !category ||
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


        // =================================================
        // ENVIRONMENT VARIABLES
        // =================================================

        const GAS_URL =
            process.env
                .I4UMANAGE_GAS_URL;


        const API_SECRET =
            process.env
                .I4UMANAGE_DOC_SECRET;


        if (
            !GAS_URL ||
            !API_SECRET
        ) {

            console.error(
                "Document API environment variables missing."
            );


            return res
                .status(500)
                .json({
                    success: false,
                    error:
                        "Server configuration incomplete."
                });

        }


        // =================================================
        // CALL GOOGLE APPS SCRIPT
        // =================================================

        const gasResponse =
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
                                API_SECRET,

                            type:
                                type,

                            category:
                                category
                        }),

                    redirect:
                        "follow"
                }
            );


        const responseText =
            await gasResponse.text();


        // =================================================
        // PARSE RESPONSE
        // =================================================

        let data;


        try {

            data =
                JSON.parse(
                    responseText
                );

        } catch (error) {

            console.error(
                "Invalid Apps Script response:",
                responseText
            );


            return res
                .status(502)
                .json({
                    success: false,
                    error:
                        "Invalid response from document service."
                });

        }


        // =================================================
        // APPS SCRIPT ERROR
        // =================================================

        if (
            !gasResponse.ok ||
            !data.success
        ) {

            console.error(
                "Apps Script document error:",
                data
            );


            return res
                .status(502)
                .json({
                    success: false,
                    error:
                        data.error ||
                        "Unable to load documents."
                });

        }


        // =================================================
        // FLAT DOCUMENTS
        // =================================================

        const documents =
            Array.isArray(
                data.documents
            )
                ? data.documents.map(
                    document => ({

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

                        createdAt:
                            document.createdAt ||
                            null,

                        updatedAt:
                            document.updatedAt ||
                            null,

                        year:
                            document.year ||
                            null

                    })
                )
                : [];


        // =================================================
        // CACHE
        // =================================================

        res.setHeader(
            "Cache-Control",
            "no-store"
        );


        // =================================================
        // RESPONSE
        // =================================================

        return res
            .status(200)
            .json({

                success:
                    true,

                type:
                    data.type ||
                    type,

                typeName:
                    data.typeName ||
                    null,

                category:
                    data.category ||
                    category,

                categoryName:
                    data.categoryName ||
                    null,

                totalDocuments:
                    documents.length,

                documents:
                    documents,

                generatedAt:
                    data.generatedAt ||
                    null

            });


    } catch (error) {

        console.error(
            "Document API error:",
            error
        );


        return res
            .status(500)
            .json({
                success: false,
                error:
                    "Unable to load documents."
            });

    }

}