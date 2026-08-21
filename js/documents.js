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
            "SLIDE KURSUS"
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

    const programList =
        document.querySelector(
            "#program-list"
        );


    if (!programList) {
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


    const totalProgramsElement =
        document.querySelector(
            "#total-programs"
        );


    const totalDocumentsElement =
        document.querySelector(
            "#total-documents"
        );



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

    let programs = [];



    // ========================================
    // FETCH DOCUMENTS
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
                    "Tidak dapat mendapatkan dokumen."
                );
            }


            programs =
                Array.isArray(data.programs)
                    ? data.programs
                    : [];


            updateSummary(data);

            buildYearFilter();

            renderPrograms(programs);


        } catch (error) {

            console.error(error);

            showError(
                "Dokumen tidak dapat dimuatkan. Sila cuba lagi."
            );
        }

    }



    // ========================================
    // SUMMARY
    // ========================================

    function updateSummary(data) {

        totalProgramsElement.textContent =
            data.totalPrograms || 0;


        totalDocumentsElement.textContent =
            data.totalDocuments || 0;
    }



    // ========================================
    // YEAR FILTER
    // ========================================

    function buildYearFilter() {

        const years =
            [
                ...new Set(
                    programs
                        .map(program => program.year)
                        .filter(Boolean)
                )
            ]
            .sort(
                (a, b) => b - a
            );


        yearFilter.innerHTML = "";



        const allOption =
            document.createElement("option");

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
    // FILTER
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
            programs.filter(program => {


                const matchesYear =
                    selectedYear === "all" ||
                    String(program.year) === selectedYear;


                const programName =
                    String(
                        program.name || ""
                    )
                    .toLowerCase();


                const documentNames =
                    (program.documents || [])
                        .map(document =>
                            document.name
                        )
                        .join(" ")
                        .toLowerCase();


                const matchesKeyword =
                    !keyword ||
                    programName.includes(keyword) ||
                    documentNames.includes(keyword);


                return (
                    matchesYear &&
                    matchesKeyword
                );

            });


        renderPrograms(filtered);

    }



    // ========================================
    // RENDER PROGRAMS
    // ========================================

    function renderPrograms(items) {

        programList.innerHTML =
            "";


        if (items.length === 0) {

            statusElement.style.display =
                "block";


            statusElement.innerHTML = `
                <i class="fa-regular fa-folder-open"></i>
                Tiada program atau dokumen dijumpai.
            `;

            return;
        }


        statusElement.style.display =
            "none";


        items.forEach(program => {

            const card =
                createProgramCard(
                    program
                );

            programList.appendChild(
                card
            );

        });

    }



    // ========================================
    // CREATE PROGRAM CARD
    // ========================================

    function createProgramCard(program) {

        const card =
            document.createElement(
                "article"
            );


        card.className =
            "program-card";



        // HEADER
        const header =
            document.createElement(
                "div"
            );

        header.className =
            "program-header";



        const icon =
            document.createElement(
                "div"
            );

        icon.className =
            "program-icon";

        icon.innerHTML =
            `<i class="fa-solid fa-folder-open"></i>`;



        const info =
            document.createElement(
                "div"
            );

        info.className =
            "program-info";



        const title =
            document.createElement(
                "h3"
            );

        title.textContent =
            program.name;



        const meta =
            document.createElement(
                "div"
            );

        meta.className =
            "program-meta";


        const countText =
            `${program.documentCount || 0} dokumen`;


        const yearText =
            program.year
                ? String(program.year)
                : "Tahun tidak dinyatakan";


        meta.textContent =
            `${yearText} • ${countText}`;



        info.appendChild(title);
        info.appendChild(meta);


        header.appendChild(icon);
        header.appendChild(info);



        // UPDATED DATE
        if (program.latestUpdated) {

            const updated =
                document.createElement(
                    "div"
                );

            updated.className =
                "program-updated";


            updated.textContent =
                `Kemaskini: ${formatDate(program.latestUpdated)}`;


            info.appendChild(
                updated
            );

        }



        // BUTTON
        const toggleButton =
            document.createElement(
                "button"
            );

        toggleButton.type =
            "button";

        toggleButton.className =
            "program-toggle";


        toggleButton.innerHTML = `
            <span>
                Lihat Dokumen
            </span>

            <i class="fa-solid fa-chevron-down"></i>
        `;



        // DOCUMENT CONTAINER
        const filesContainer =
            document.createElement(
                "div"
            );

        filesContainer.className =
            "program-files";


        filesContainer.hidden =
            true;



        const documents =
            Array.isArray(
                program.documents
            )
                ? program.documents
                : [];



        if (documents.length === 0) {

            const empty =
                document.createElement(
                    "p"
                );

            empty.className =
                "empty-program";

            empty.textContent =
                "Tiada dokumen dalam program ini.";


            filesContainer.appendChild(
                empty
            );

        } else {

            documents.forEach(document => {

                const row =
                    createDocumentRow(
                        document
                    );

                filesContainer.appendChild(
                    row
                );

            });

        }



        toggleButton.addEventListener(
            "click",
            () => {

                const isHidden =
                    filesContainer.hidden;


                filesContainer.hidden =
                    !isHidden;


                toggleButton
                    .classList
                    .toggle(
                        "active",
                        isHidden
                    );


                const text =
                    toggleButton.querySelector(
                        "span"
                    );


                text.textContent =
                    isHidden
                        ? "Tutup Dokumen"
                        : "Lihat Dokumen";

            }
        );



        card.appendChild(header);
        card.appendChild(toggleButton);
        card.appendChild(filesContainer);


        return card;
    }



    // ========================================
    // CREATE DOCUMENT ROW
    // ========================================

    function createDocumentRow(document) {

        const row =
            documentCreateElement(
                "div"
            );


        row.className =
            "document-row";



        const left =
            documentCreateElement(
                "div"
            );

        left.className =
            "document-left";



        const icon =
            documentCreateElement(
                "div"
            );

        icon.className =
            "document-file-icon";


        const iconClass =
            getFileIcon(
                document.mimeType
            );


        icon.innerHTML =
            `<i class="${iconClass}"></i>`;



        const info =
            documentCreateElement(
                "div"
            );

        info.className =
            "document-info";



        const name =
            documentCreateElement(
                "strong"
            );

        name.textContent =
            document.name;



        const meta =
            documentCreateElement(
                "span"
            );


        const sizeText =
            document.size
                ? formatBytes(document.size)
                : "";


        const updatedText =
            document.updatedAt
                ? formatDate(
                    document.updatedAt
                )
                : "";


        meta.textContent =
            [sizeText, updatedText]
                .filter(Boolean)
                .join(" • ");



        info.appendChild(name);
        info.appendChild(meta);


        left.appendChild(icon);
        left.appendChild(info);



        const openLink =
            documentCreateElement(
                "a"
            );


        openLink.className =
            "document-open-btn";

        openLink.href =
            document.url;

        openLink.target =
            "_blank";

        openLink.rel =
            "noopener noreferrer";


        openLink.innerHTML = `
            <span>Buka</span>
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
        `;



        row.appendChild(left);
        row.appendChild(openLink);


        return row;
    }



    // ========================================
    // SAFE DOM HELPER
    // ========================================

    function documentCreateElement(tag) {
        return window.document.createElement(tag);
    }



    // ========================================
    // FILE ICON
    // ========================================

    function getFileIcon(mimeType = "") {

        const mime =
            mimeType.toLowerCase();


        if (mime.includes("pdf")) {
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


        if (mime.includes("image")) {
            return "fa-solid fa-file-image";
        }


        return "fa-solid fa-file";
    }



    // ========================================
    // FORMAT DATE
    // ========================================

    function formatDate(value) {

        try {

            return new Intl.DateTimeFormat(
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
                new Date(value)
            );

        } catch {

            return "";
        }
    }



    // ========================================
    // FORMAT FILE SIZE
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
            unitIndex < units.length - 1
        ) {

            value /= 1024;

            unitIndex++;
        }


        return (
            value.toFixed(
                unitIndex === 0
                    ? 0
                    : 1
            ) +
            " " +
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