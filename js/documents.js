(() => {

    // ========================================
    // CONFIG
    // ========================================

    const CATEGORY_NAMES = {
        "pembangunan": "PEMBANGUNAN",
        "teknologi-maklumat": "TEKNOLOGI MAKLUMAT",
        "latihan": "LATIHAN",
        "psikologi-kaunseling": "PSIKOLOGI & KAUNSELING",
        "sumber-manusia": "SUMBER MANUSIA",
        "pentadbiran": "PENTADBIRAN",
        "perolehan-aset": "PEROLEHAN & ASET",
        "kewangan": "KEWANGAN"
    };


    const TYPE_NAMES = {
        "kertas-kerja": "KERTAS KERJA",
        "slide-kursus": "SLAID KURSUS"
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

    if (
        backLink &&
        backText
    ) {

        if (
            type ===
            "slide-kursus"
        ) {

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

    }


    // ========================================
    // VALIDATE
    // ========================================

    if (
        !TYPE_NAMES[type] ||
        !CATEGORY_NAMES[category]
    ) {

        if (statusElement) {

            statusElement.innerHTML = `
                <i class="fa-solid fa-triangle-exclamation"></i>
                Bahagian tidak sah.
            `;

        }


        return;

    }


    if (pageTitle) {

        pageTitle.textContent =
            TYPE_NAMES[type];

    }


    if (categoryTitle) {

        categoryTitle.textContent =
            CATEGORY_NAMES[category];

    }


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


            // ========================================
            // FLAT DOCUMENT ARRAY
            // ========================================

            documents =
                Array.isArray(
                    data.documents
                )
                    ? data.documents
                    : [];


            buildYearFilter();


            renderDocuments(
                documents
            );


        } catch (error) {

            console.error(
                "Document load error:",
                error
            );


            showError(
                "Dokumen tidak dapat dimuatkan. Sila cuba lagi."
            );

        }

    }


    // ========================================
    // YEAR FILTER
    // ========================================

    function buildYearFilter() {

        if (!yearFilter) {
            return;
        }


        const years =
            [
                ...new Set(

                    documents
                        .map(
                            file =>
                                Number(
                                    file.year
                                )
                        )
                        .filter(
                            year =>
                                Number.isInteger(
                                    year
                                )
                        )

                )
            ]
            .sort(
                (a, b) =>
                    b - a
            );


        yearFilter.innerHTML =
            "";


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


        years.forEach(
            year => {

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

            }
        );

    }


    // ========================================
    // SEARCH + FILTER
    // ========================================

    function applyFilters() {

        const keyword =
            String(
                searchInput?.value || ""
            )
            .toLowerCase()
            .trim();


        const selectedYear =
            yearFilter?.value ||
            "all";


        const filtered =
            documents.filter(
                file => {

                    const matchesYear =
                        selectedYear ===
                            "all" ||
                        String(
                            file.year
                        ) ===
                            selectedYear;


                    const documentName =
                        String(
                            file.name || ""
                        )
                        .toLowerCase();


                    const fileType =
                        getFileTypeLabel(
                            file.mimeType,
                            file.name
                        )
                        .toLowerCase();


                    const matchesKeyword =
                        !keyword ||
                        documentName.includes(
                            keyword
                        ) ||
                        fileType.includes(
                            keyword
                        );


                    return (
                        matchesYear &&
                        matchesKeyword
                    );

                }
            );


        renderDocuments(
            filtered
        );

    }


    // ========================================
    // RENDER
    // ========================================

    function renderDocuments(items) {

        documentList.innerHTML =
            "";


        if (
            !Array.isArray(items) ||
            items.length === 0
        ) {

            if (statusElement) {

                statusElement.style.display =
                    "block";


                statusElement.innerHTML = `
                    <i class="fa-regular fa-folder-open"></i>
                    Tiada dokumen dijumpai.
                `;

            }


            return;

        }


        if (statusElement) {

            statusElement.style.display =
                "none";

        }


        items.forEach(
            file => {

                documentList.appendChild(
                    createDocumentCard(
                        file
                    )
                );

            }
        );

    }


    // ========================================
    // DOCUMENT CARD
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


        const iconElement =
            document.createElement(
                "i"
            );


        iconElement.className =
            getFileIcon(
                file.mimeType,
                file.name
            );


        icon.appendChild(
            iconElement
        );


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


        // ========================================
        // FILE TYPE
        // ========================================

        const fileType =
            document.createElement(
                "p"
            );


        fileType.className =
            "flat-document-program";


        fileType.textContent =
            getFileTypeLabel(
                file.mimeType,
                file.name
            );


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
                String(
                    file.year
                )
            );

        }


        if (file.size) {

            values.push(
                formatBytes(
                    file.size
                )
            );

        }


        if (file.updatedAt) {

            const formattedDate =
                formatDate(
                    file.updatedAt
                );


            if (formattedDate) {

                values.push(
                    `Kemaskini ${formattedDate}`
                );

            }

        }


        meta.textContent =
            values.join(
                " • "
            );


        content.appendChild(
            title
        );


        content.appendChild(
            fileType
        );


        if (
            values.length > 0
        ) {

            content.appendChild(
                meta
            );

        }


        // ========================================
        // OPEN BUTTON
        // ========================================

        const openLink =
            document.createElement(
                "a"
            );


        openLink.className =
            "flat-document-open";


        openLink.href =
            file.url ||
            "#";


        openLink.target =
            "_blank";


        openLink.rel =
            "noopener noreferrer";


        openLink.setAttribute(
            "aria-label",
            `Buka ${file.name || "dokumen"}`
        );


        openLink.innerHTML = `
            <span>Buka</span>
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
        `;


        if (!file.url) {

            openLink.removeAttribute(
                "target"
            );


            openLink.setAttribute(
                "aria-disabled",
                "true"
            );


            openLink.addEventListener(
                "click",
                event =>
                    event.preventDefault()
            );

        }


        // ========================================
        // APPEND
        // ========================================

        card.appendChild(
            icon
        );


        card.appendChild(
            content
        );


        card.appendChild(
            openLink
        );


        return card;

    }


    // ========================================
    // FILE TYPE LABEL
    // ========================================

    function getFileTypeLabel(
        mimeType = "",
        fileName = ""
    ) {

        const mime =
            String(
                mimeType
            )
            .toLowerCase();


        const name =
            String(
                fileName
            )
            .toLowerCase();


        if (
            mime.includes("pdf") ||
            name.endsWith(".pdf")
        ) {

            return "PDF";

        }


        if (
            mime.includes("presentation") ||
            mime.includes("powerpoint") ||
            name.endsWith(".ppt") ||
            name.endsWith(".pptx")
        ) {

            return "PowerPoint";

        }


        if (
            mime.includes("spreadsheet") ||
            mime.includes("excel") ||
            name.endsWith(".xls") ||
            name.endsWith(".xlsx")
        ) {

            return "Excel";

        }


        if (
            mime.includes("document") ||
            mime.includes("word") ||
            name.endsWith(".doc") ||
            name.endsWith(".docx")
        ) {

            return "Word";

        }


        if (
            mime.includes(
                "application/vnd.google-apps.presentation"
            )
        ) {

            return "Google Slides";

        }


        if (
            mime.includes(
                "application/vnd.google-apps.spreadsheet"
            )
        ) {

            return "Google Sheets";

        }


        if (
            mime.includes(
                "application/vnd.google-apps.document"
            )
        ) {

            return "Google Docs";

        }


        if (
            mime.includes("image")
        ) {

            return "Imej";

        }


        return "Dokumen";

    }


    // ========================================
    // FILE ICON
    // ========================================

    function getFileIcon(
        mimeType = "",
        fileName = ""
    ) {

        const mime =
            String(
                mimeType
            )
            .toLowerCase();


        const name =
            String(
                fileName
            )
            .toLowerCase();


        if (
            mime.includes("pdf") ||
            name.endsWith(".pdf")
        ) {

            return "fa-solid fa-file-pdf";

        }


        if (
            mime.includes("presentation") ||
            mime.includes("powerpoint") ||
            name.endsWith(".ppt") ||
            name.endsWith(".pptx")
        ) {

            return "fa-solid fa-file-powerpoint";

        }


        if (
            mime.includes("spreadsheet") ||
            mime.includes("excel") ||
            name.endsWith(".xls") ||
            name.endsWith(".xlsx")
        ) {

            return "fa-solid fa-file-excel";

        }


        if (
            mime.includes("document") ||
            mime.includes("word") ||
            name.endsWith(".doc") ||
            name.endsWith(".docx")
        ) {

            return "fa-solid fa-file-word";

        }


        if (
            mime.includes("image")
        ) {

            return "fa-solid fa-file-image";

        }


        return "fa-solid fa-file-lines";

    }


    // ========================================
    // DATE
    // ========================================

    function formatDate(value) {

        const date =
            new Date(
                value
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "";

        }


        return new Intl
            .DateTimeFormat(
                "ms-MY",
                {
                    day:
                        "2-digit",

                    month:
                        "short",

                    year:
                        "numeric"
                }
            )
            .format(
                date
            );

    }


    // ========================================
    // FILE SIZE
    // ========================================

    function formatBytes(bytes) {

        const size =
            Number(
                bytes || 0
            );


        if (
            !Number.isFinite(size) ||
            size <= 0
        ) {

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

            value /=
                1024;


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

        if (!statusElement) {
            return;
        }


        statusElement.style.display =
            "block";


        statusElement.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Memuatkan dokumen...
        `;

    }


    function showError(message) {

        if (!statusElement) {
            return;
        }


        statusElement.style.display =
            "block";


        statusElement.innerHTML =
            "";


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

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            applyFilters
        );

    }


    if (yearFilter) {

        yearFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    // ========================================
    // START
    // ========================================

    loadDocuments();

})();