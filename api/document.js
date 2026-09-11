(() => {

    // ========================================
    // CATEGORY CONFIG
    // ========================================

    const CATEGORY_NAMES = {

        "pembangunan":
            "PEMBANGUNAN",

        "teknologi-maklumat":
            "TEKNOLOGI MAKLUMAT",

        "latihan":
            "LATIHAN",

        "psikologi-kaunseling":
            "PSIKOLOGI & KAUNSELING",

        "sumber-manusia":
            "SUMBER MANUSIA",

        "pentadbiran":
            "PENTADBIRAN",

        "perolehan-aset":
            "PEROLEHAN & ASET",

        "kewangan":
            "KEWANGAN"

    };


    const TYPE_NAMES = {

        "kertas-kerja":
            "KERTAS KERJA",

        "slide-kursus":
            "SLAID KURSUS"

    };


    // ========================================
    // URL PARAMETERS
    // ========================================

    const params =
        new URLSearchParams(
            window.location.search
        );


    const type =
        params.get("type") ||
        "kertas-kerja";


    const category =
        params.get("category") ||
        "latihan";


    // ========================================
    // ELEMENTS
    // ========================================

    const documentList =
        document.querySelector(
            "#program-list"
        );


    if (!documentList) {
        return;
    }


    const pageTitle =
        document.querySelector(
            "#document-page-title"
        );


    const categoryTitle =
        document.querySelector(
            "#document-category-title"
        );


    const statusElement =
        document.querySelector(
            "#document-status"
        );


    const searchInput =
        document.querySelector(
            "#document-search-input"
        );


    const yearFilter =
        document.querySelector(
            "#year-filter"
        );


    const backLink =
        document.querySelector(
            "#document-back-link"
        );


    const backText =
        document.querySelector(
            "#document-back-text"
        );


    // ========================================
    // BACK BUTTON
    // ========================================

    if (type === "slide-kursus") {

        backLink.href =
            "slaid.html";

        backText.textContent =
            "Kembali ke Slaid Kursus";

    } else {

        backLink.href =
            "kerja.html";

        backText.textContent =
            "Kembali ke Kertas Kerja";

    }


    // ========================================
    // VALIDATE URL
    // ========================================

    if (
        !TYPE_NAMES[type] ||
        !CATEGORY_NAMES[category]
    ) {

        statusElement.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation"></i>
            Bahagian tidak sah.
        `;

        return;

    }


    pageTitle.textContent =
        TYPE_NAMES[type];


    categoryTitle.textContent =
        CATEGORY_NAMES[category];


    // ========================================
    // STATE
    // ========================================

    let documents = [];


    // ========================================
    // LOAD DOCUMENTS
    // ========================================

    async function loadDocuments() {

        try {

            showLoading();


            const url =
                `/api/document?type=${encodeURIComponent(type)}&category=${encodeURIComponent(category)}`;


            const response =
                await fetch(
                    url,
                    {
                        method: "GET",
                        cache: "no-store"
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
                    "Tidak dapat mendapatkan dokumen."
                );

            }


            const programs =
                Array.isArray(data.programs)
                    ? data.programs
                    : [];


            // ========================================
            // FLATTEN PROGRAM → DOCUMENT
            // ========================================

            documents =
                programs.flatMap(program => {

                    const programDocuments =
                        Array.isArray(program.documents)
                            ? program.documents
                            : [];


                    return programDocuments.map(file => ({

                        ...file,

                        programName:
                            program.name ||
                            "Program tidak dinyatakan",

                        year:
                            program.year || null,

                        programUpdated:
                            program.latestUpdated || null

                    }));

                });


            buildYearFilter();

            renderDocuments(documents);


        } catch (error) {

            console.error(error);

            showError(
                "Dokumen tidak dapat dimuatkan. Sila cuba lagi."
            );

        }

    }


    // ========================================
    // YEAR FILTER
    // ========================================

    function buildYearFilter() {

        const years =
            [
                ...new Set(

                    documents
                        .map(file => file.year)
                        .filter(Boolean)

                )
            ]
            .sort(
                (a, b) => b - a
            );


        yearFilter.innerHTML = "";


        const allOption =
            document.createElement(
                "option"
            );


        allOption.value =
            "all";


        allOption.textContent =
            "Semua Tahun";


        yearFilter.appendChild(
            allOption
        );


        years.forEach(year => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                String(year);


            option.textContent =
                String(year);


            yearFilter.appendChild(
                option
            );

        });

    }


    // ========================================
    // SEARCH + FILTER
    // ========================================

    function applyFilters() {

        const keyword =
            searchInput
                .value
                .toLowerCase()
                .trim();


        const selectedYear =
            yearFilter.value;


        const filtered =
            documents.filter(file => {


                const matchesYear =
                    selectedYear === "all" ||
                    String(file.year) ===
                        selectedYear;


                const documentName =
                    String(
                        file.name || ""
                    )
                    .toLowerCase();


                const programName =
                    String(
                        file.programName || ""
                    )
                    .toLowerCase();


                const matchesKeyword =
                    !keyword ||
                    documentName.includes(keyword) ||
                    programName.includes(keyword);


                return (
                    matchesYear &&
                    matchesKeyword
                );

            });


        renderDocuments(filtered);

    }


    // ========================================
    // RENDER DOCUMENTS
    // ========================================

    function renderDocuments(items) {

        documentList.innerHTML = "";


        if (items.length === 0) {

            statusElement.style.display =
                "block";


            statusElement.innerHTML = `
                <i class="fa-regular fa-folder-open"></i>
                Tiada dokumen dijumpai.
            `;


            return;

        }


        statusElement.style.display =
            "none";


        items.forEach(file => {

            const card =
                createDocumentCard(file);


            documentList.appendChild(
                card
            );

        });

    }


    // ========================================
    // CREATE DOCUMENT CARD
    // ========================================

    function createDocumentCard(file) {

        const card =
            document.createElement(
                "article"
            );


        card.className =
            "flat-document-card";


        // ========================================
        // ICON
        // ========================================

        const icon =
            document.createElement(
                "div"
            );


        icon.className =
            "flat-document-icon";


        icon.innerHTML =
            `<i class="${getFileIcon(file.mimeType)}"></i>`;


        // ========================================
        // CONTENT
        // ========================================

        const content =
            document.createElement(
                "div"
            );


        content.className =
            "flat-document-content";


        const title =
            document.createElement(
                "h3"
            );


        title.textContent =
            file.name ||
            "Dokumen Tanpa Nama";


        const program =
            document.createElement(
                "p"
            );


        program.className =
            "flat-document-program";


        program.textContent =
            file.programName ||
            "Program tidak dinyatakan";


        // ========================================
        // META
        // ========================================

        const meta =
            document.createElement(
                "div"
            );


        meta.className =
            "flat-document-meta";


        const values = [];


        if (file.year) {

            values.push(
                String(file.year)
            );

        }


        if (file.size) {

            values.push(
                formatBytes(file.size)
            );

        }


        if (file.updatedAt) {

            values.push(
                `Kemaskini ${formatDate(file.updatedAt)}`
            );

        }


        meta.textContent =
            values.join(" • ");


        // ========================================
        // OPEN
        // ========================================

        const openLink =
            document.createElement(
                "a"
            );


        openLink.className =
            "flat-document-open";


        openLink.href =
            file.url;


        openLink.target =
            "_blank";


        openLink.rel =
            "noopener noreferrer";


        openLink.innerHTML = `
            <span>Buka</span>

            <i class="fa-solid fa-arrow-up-right-from-square"></i>
        `;


        // ========================================
        // APPEND
        // ========================================

        content.appendChild(title);

        content.appendChild(program);

        content.appendChild(meta);


        card.appendChild(icon);

        card.appendChild(content);

        card.appendChild(openLink);


        return card;

    }


    // ========================================
    // FILE ICON
    // ========================================

    function getFileIcon(
        mimeType = ""
    ) {

        const mime =
            mimeType.toLowerCase();


        if (
            mime.includes("pdf")
        ) {

            return "fa-solid fa-file-pdf";

        }


        if (
            mime.includes("presentation") ||
            mime.includes("powerpoint")
        ) {

            return "fa-solid fa-file-powerpoint";

        }


        if (
            mime.includes("spreadsheet") ||
            mime.includes("excel")
        ) {

            return "fa-solid fa-file-excel";

        }


        if (
            mime.includes("document") ||
            mime.includes("word")
        ) {

            return "fa-solid fa-file-word";

        }


        if (
            mime.includes("image")
        ) {

            return "fa-solid fa-file-image";

        }


        return "fa-solid fa-file";

    }


    // ========================================
    // DATE
    // ========================================

    function formatDate(value) {

        try {

            return new Intl.DateTimeFormat(
                "ms-MY",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                }
            )
            .format(
                new Date(value)
            );

        } catch {

            return "";

        }

    }


    // ========================================
    // FILE SIZE
    // ========================================

    function formatBytes(bytes) {

        const size =
            Number(bytes || 0);


        if (!size) {
            return "";
        }


        const units =
            [
                "B",
                "KB",
                "MB",
                "GB"
            ];


        let value =
            size;


        let unitIndex =
            0;


        while (
            value >= 1024 &&
            unitIndex <
                units.length - 1
        ) {

            value /= 1024;

            unitIndex++;

        }


        return (
            value.toFixed(
                unitIndex === 0
                    ? 0
                    : 1
            )
            +
            " "
            +
            units[unitIndex]
        );

    }


    // ========================================
    // STATUS
    // ========================================

    function showLoading() {

        statusElement.style.display =
            "block";


        statusElement.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Memuatkan dokumen...
        `;

    }


    function showError(message) {

        statusElement.style.display =
            "block";


        statusElement.innerHTML = "";


        const icon =
            document.createElement(
                "i"
            );


        icon.className =
            "fa-solid fa-triangle-exclamation";


        const text =
            document.createElement(
                "span"
            );


        text.textContent =
            message;


        statusElement.appendChild(
            icon
        );


        statusElement.appendChild(
            text
        );

    }


    // ========================================
    // EVENTS
    // ========================================

    searchInput.addEventListener(
        "input",
        applyFilters
    );


    yearFilter.addEventListener(
        "change",
        applyFilters
    );


    // ========================================
    // START
    // ========================================

    loadDocuments();

})();