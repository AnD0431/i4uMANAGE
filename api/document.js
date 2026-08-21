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


export default async function handler(req, res) {

    // ===============================
    // METHOD
    // ===============================

    if (req.method !== "GET") {

        return res
            .status(405)
            .json({
                success: false,
                error: "Method not allowed."
            });
    }


    try {

        const {
            type = "kertas-kerja",
            category = "latihan"
        } = req.query;


        // ===============================
        // VALIDATION
        // ===============================

        if (!ALLOWED_TYPES.has(type)) {

            return res
                .status(400)
                .json({
                    success: false,
                    error: "Invalid document type."
                });
        }


        if (!ALLOWED_CATEGORIES.has(category)) {

            return res
                .status(400)
                .json({
                    success: false,
                    error: "Invalid category."
                });
        }


        // ===============================
        // ENVIRONMENT VARIABLES
        // ===============================

        const GAS_URL =
            process.env.I4UMANAGE_GAS_URL;

        const API_SECRET =
            process.env.I4UMANAGE_DOC_SECRET;


        if (!GAS_URL || !API_SECRET) {

            console.error(
                "Document API environment variables missing."
            );

            return res
                .status(500)
                .json({
                    success: false,
                    error: "Server configuration incomplete."
                });
        }


        // ===============================
        // REQUEST TO GOOGLE APPS SCRIPT
        // ===============================

        const response =
            await fetch(
                GAS_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        token:
                            API_SECRET,

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
                JSON.parse(responseText);

        } catch (error) {

            console.error(
                "Invalid response from Apps Script:",
                responseText
            );

            return res
                .status(502)
                .json({
                    success: false,
                    error:
                        "Google Apps Script returned an invalid response."
                });
        }


        if (!data.success) {

            console.error(
                "Apps Script error:",
                data
            );

            return res
                .status(502)
                .json({
                    success: false,
                    error:
                        data.error ||
                        "Document service unavailable."
                });
        }


        // jangan cache metadata GOV
        res.setHeader(
            "Cache-Control",
            "no-store"
        );


        return res
            .status(200)
            .json(data);


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