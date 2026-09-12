export default async function handler(
    req,
    res
) {

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
            "Metrics environment variables missing."
        );


        return res
            .status(500)
            .json({

                success: false,

                error:
                    "Server configuration incomplete."

            });

    }


    try {

        // ========================================
        // GET
        // READ CURRENT METRICS
        // ========================================

        if (
            req.method === "GET"
        ) {

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
                                    "metrics"

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

            } catch (error) {

                console.error(
                    "Invalid metrics response:",
                    text
                );


                return res
                    .status(502)
                    .json({

                        success: false,

                        error:
                            "Invalid metrics service response."

                    });

            }


            if (
                !response.ok ||
                !data.success
            ) {

                return res
                    .status(502)
                    .json({

                        success: false,

                        error:
                            data.error ||
                            "Unable to retrieve metrics."

                    });

            }


            res.setHeader(
                "Cache-Control",
                "no-store"
            );


            return res
                .status(200)
                .json({

                    success: true,

                    totalKertasKerja:
                        Number(
                            data.totalKertasKerja ||
                            0
                        ),

                    totalSlaid:
                        Number(
                            data.totalSlaid ||
                            0
                        ),

                    totalBahagian:
                        Number(
                            data.totalBahagian ||
                            0
                        ),

                    documentOpens:
                        Number(
                            data.documentOpens ||
                            0
                        ),

                    totalUsers:
                        Number(
                            data.totalUsers ||
                            0
                        ),

                    generatedAt:
                        data.generatedAt ||
                        new Date()
                            .toISOString()

                });

        }


        // ========================================
        // POST
        // REGISTER EVENT
        // ========================================

        if (
            req.method === "POST"
        ) {

            const event =
                String(
                    req.body?.event ||
                    ""
                )
                    .toLowerCase()
                    .trim();


            const visitorId =
                String(
                    req.body?.visitorId ||
                    ""
                )
                    .trim();


            const allowedEvents =
                [
                    "visitor",
                    "document-open"
                ];


            if (
                !allowedEvents.includes(
                    event
                )
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        error:
                            "Invalid metric event."

                    });

            }


            if (
                event === "visitor" &&
                visitorId.length < 8
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        error:
                            "Invalid visitor ID."

                    });

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
                                    API_SECRET,

                                source:
                                    "metric-event",

                                event:
                                    event,

                                visitorId:
                                    visitorId

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

            } catch (error) {

                console.error(
                    "Invalid metric event response:",
                    text
                );


                return res
                    .status(502)
                    .json({

                        success: false,

                        error:
                            "Invalid metrics service response."

                    });

            }


            if (
                !response.ok ||
                !data.success
            ) {

                return res
                    .status(502)
                    .json({

                        success: false,

                        error:
                            data.error ||
                            "Unable to register metric event."

                    });

            }


            return res
                .status(200)
                .json(data);

        }


        // ========================================
        // METHOD NOT ALLOWED
        // ========================================

        return res
            .status(405)
            .json({

                success: false,

                error:
                    "Method not allowed."

            });


    } catch (error) {

        console.error(
            "Metrics API error:",
            error
        );


        return res
            .status(500)
            .json({

                success: false,

                error:
                    "Metrics service unavailable."

            });

    }

}