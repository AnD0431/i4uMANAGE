export default async function handler(
    req,
    res
) {

    // ========================================
    // METHOD
    // ========================================

    if (req.method !== "GET") {

        return res
            .status(405)
            .json({
                success: false,
                error: "Method not allowed."
            });
    }


    try {

        // ========================================
        // ENVIRONMENT
        // ========================================

        const GAS_URL =
            process.env.I4UMANAGE_GAS_URL;


        const API_SECRET =
            process.env.I4UMANAGE_DOC_SECRET;


        if (
            !GAS_URL ||
            !API_SECRET
        ) {

            console.error(
                "AKD API environment variables missing."
            );


            return res
                .status(500)
                .json({
                    success: false,
                    error:
                        "Server configuration incomplete."
                });
        }


        // ========================================
        // GOOGLE APPS SCRIPT
        // ========================================

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
                                API_SECRET,

                            source:
                                "akd"
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

        } catch (error) {

            console.error(
                "Invalid Apps Script AKD response:",
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


        // ========================================
        // VALIDATE RESPONSE
        // ========================================

        if (
            !response.ok ||
            !data.success
        ) {

            console.error(
                "AKD Apps Script error:",
                data
            );


            return res
                .status(502)
                .json({
                    success: false,
                    error:
                        data.error ||
                        "Unable to retrieve AKD documents."
                });
        }


        const documents =
            Array.isArray(
                data.documents
            )
                ? data.documents
                : [];


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

                success: true,

                source:
                    "akd",

                sourceName:
                    data.sourceName ||
                    "ARAHAN KAWALAN DALAMAN",

                totalDocuments:
                    documents.length,

                documents:
                    documents,

                generatedAt:
                    data.generatedAt ||
                    new Date().toISOString()

            });


    } catch (error) {

        console.error(
            "AKD API error:",
            error
        );


        return res
            .status(500)
            .json({

                success: false,

                error:
                    "Unable to retrieve AKD documents."

            });

    }

}