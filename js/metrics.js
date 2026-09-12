// =========================================================
// i4uManage LIVE METRICS
// =========================================================

const METRICS_API =
    "/api/metrics";


// =========================================================
// VISITOR ID
// Anonymous ID per browser/device
// =========================================================

function getI4uVisitorId() {

    const storageKey =
        "i4umanage_visitor_id";


    let visitorId =
        localStorage.getItem(
            storageKey
        );


    if (visitorId) {

        return visitorId;

    }


    visitorId =
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"

            ? crypto.randomUUID()

            :
            (
                "i4u-" +
                Date.now() +
                "-" +
                Math.random()
                    .toString(36)
                    .slice(2)
            );


    localStorage.setItem(
        storageKey,
        visitorId
    );


    return visitorId;

}


// =========================================================
// UPDATE NUMBER
// =========================================================

function updateMetricValue(
    name,
    value
) {

    const elements =
        document.querySelectorAll(
            `[data-metric="${name}"]`
        );


    elements.forEach(
        element => {

            element.textContent =
                Number(value || 0)
                    .toLocaleString(
                        "ms-MY"
                    );

        }
    );

}


// =========================================================
// LOAD METRICS
// =========================================================

async function loadI4uMetrics() {

    try {

        const response =
            await fetch(
                METRICS_API,
                {
                    method:
                        "GET",

                    cache:
                        "no-store"
                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.error ||
                "Metrics unavailable."
            );

        }


        updateMetricValue(
            "totalKertasKerja",
            data.totalKertasKerja
        );


        updateMetricValue(
            "totalSlaid",
            data.totalSlaid
        );


        updateMetricValue(
            "totalBahagian",
            data.totalBahagian
        );


        updateMetricValue(
            "documentOpens",
            data.documentOpens
        );


        updateMetricValue(
            "totalUsers",
            data.totalUsers
        );


    } catch (error) {

        console.error(
            "i4uManage metrics error:",
            error
        );

    }

}


// =========================================================
// REGISTER UNIQUE VISITOR
// =========================================================

async function registerI4uVisitor() {

    try {

        const visitorId =
            getI4uVisitorId();


        await fetch(
            METRICS_API,
            {
                method:
                    "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({

                        event:
                            "visitor",

                        visitorId:
                            visitorId

                    }),

                keepalive:
                    true
            }
        );


    } catch (error) {

        console.warn(
            "Visitor metric failed:",
            error
        );

    }

}


// =========================================================
// DOCUMENT OPEN
// =========================================================

function trackI4uDocumentOpen() {

    const visitorId =
        getI4uVisitorId();


    fetch(
        METRICS_API,
        {
            method:
                "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body:
                JSON.stringify({

                    event:
                        "document-open",

                    visitorId:
                        visitorId

                }),

            keepalive:
                true
        }
    )
    .catch(
        error => {

            console.warn(
                "Document metric failed:",
                error
            );

        }
    );

}


// =========================================================
// DOCUMENT CLICK TRACKER
// =========================================================

document.addEventListener(
    "click",
    event => {

        const documentLink =
            event.target.closest(
                ".flat-document-open, " +
                ".akd-open-document, " +
                "[data-track-document-open]"
            );


        if (!documentLink) {
            return;
        }


        trackI4uDocumentOpen();

    }
);


// =========================================================
// START
// =========================================================

async function initI4uMetrics() {

    console.log(
        "i4uManage Metrics: starting..."
    );


    // 1. Paparkan data semasa dahulu
    await loadI4uMetrics();


    // 2. Daftar browser sebagai pengguna
    await registerI4uVisitor();


    // 3. Refresh supaya nilai pengguna terus berubah
    await loadI4uMetrics();


    console.log(
        "i4uManage Metrics: ready."
    );

}


if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initI4uMetrics,
        {
            once: true
        }
    );

} else {

    initI4uMetrics();

}


// =========================================================
// GLOBAL ACCESS
// =========================================================

window.i4uMetrics = {

    refresh:
        loadI4uMetrics,

    trackDocumentOpen:
        trackI4uDocumentOpen

};