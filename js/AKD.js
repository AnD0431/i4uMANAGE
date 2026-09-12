document.addEventListener(
    "DOMContentLoaded",
    () => {

        // ========================================
        // ELEMENTS
        // ========================================

        const documentList =
            document.querySelector(
                "#akd-document-list"
            );

        const totalDocumentsElement =
            document.querySelector(
                "#akd-total-documents"
            );

        const searchInput =
            document.querySelector(
                "#akd-search-input"
            );

        const yearFilter =
            document.querySelector(
                "#akd-year-filter"
            );

        const typeFilter =
            document.querySelector(
                "#akd-type-filter"
            );


        if (!documentList) {
            return;
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


                const response =
                    await fetch(
                        "/api/akd",
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
                        "Dokumen AKD tidak dapat dimuatkan."
                    );
                }


                documents =
                    Array.isArray(
                        data.documents
                    )
                        ? data.documents
                        : [];


                if (totalDocumentsElement) {

                    totalDocumentsElement
                        .textContent =
                        documents.length;
                }


                buildYearFilter();

                renderDocuments(
                    documents
                );


            } catch (error) {

                console.error(
                    "AKD load error:",
                    error
                );


                showError();

            }

        }


        // ========================================
        // YEAR FILTER
        // ========================================

        function buildYearFilter() {

            if (!yearFilter) {
                return;
            }


            const years = [
                ...new Set(
                    documents
                        .map(
                            document =>
                                document.year
                        )
                        .filter(Boolean)
                )
            ]
            .sort(
                (a, b) =>
                    b - a
            );


            yearFilter.innerHTML = "";


            const allOption =
                document.createElement(
                    "option"
                );


            allOption.value = "";

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
        // FILTER DOCUMENTS
        // ========================================

        function filterDocuments() {

            const query =
                (
                    searchInput?.value ||
                    ""
                )
                .toLowerCase()
                .trim();


            const selectedYear =
                yearFilter?.value ||
                "";


            const selectedType =
                typeFilter?.value ||
                "";


            const filtered =
                documents.filter(
                    document => {

                        const name =
                            String(
                                document.name ||
                                ""
                            )
                            .toLowerCase();


                        const year =
                            String(
                                document.year ||
                                ""
                            );


                        const fileType =
                            getFileType(
                                document
                            );


                        const matchesSearch =
                            !query ||
                            name.includes(
                                query
                            );


                        const matchesYear =
                            !selectedYear ||
                            year ===
                            selectedYear;


                        const matchesType =
                            !selectedType ||
                            fileType ===
                            selectedType;


                        return (
                            matchesSearch &&
                            matchesYear &&
                            matchesType
                        );

                    }
                );


            renderDocuments(
                filtered
            );

        }


        // ========================================
        // RENDER DOCUMENTS
        // ========================================

        function renderDocuments(
            items
        ) {

            if (
                !Array.isArray(items) ||
                items.length === 0
            ) {

                documentList.innerHTML = `
                    <div class="akd-loading-state">

                        <span class="material-symbols-rounded">
                            search_off
                        </span>

                        <strong>
                            Tiada dokumen dijumpai
                        </strong>

                        <p>
                            Cuba gunakan kata kunci
                            atau penapis yang lain.
                        </p>

                    </div>
                `;

                return;
            }


            documentList.innerHTML =
                items
                    .map(
                        document =>
                            createDocumentCard(
                                document
                            )
                    )
                    .join("");

        }


        // ========================================
        // DOCUMENT CARD
        // ========================================

        function createDocumentCard(
            document
        ) {

            const name =
                escapeHtml(
                    document.name ||
                    "Dokumen"
                );


            const url =
                escapeAttribute(
                    document.url ||
                    "#"
                );


            const year =
                document.year ||
                "—";


            const typeLabel =
                getFileTypeLabel(
                    document
                );


            const icon =
                getFileIcon(
                    document
                );


            const size =
                formatBytes(
                    Number(
                        document.size ||
                        0
                    )
                );


            const updated =
                formatDate(
                    document.updatedAt
                );


            return `
                <article
                    class="akd-document-card"
                >

                    <div
                        class="akd-file-icon"
                        aria-hidden="true"
                    >
                        <span
                            class="material-symbols-rounded"
                        >
                            ${icon}
                        </span>
                    </div>


                    <div
                        class="akd-file-content"
                    >

                        <h3
                            title="${name}"
                        >
                            ${name}
                        </h3>


                        <div
                            class="akd-file-meta"
                        >

                            <span>
                                ${typeLabel}
                            </span>

                            <span>
                                ${year}
                            </span>

                            <span>
                                ${size}
                            </span>

                            <span>
                                Dikemas kini ${updated}
                            </span>

                        </div>

                    </div>


                    <a
                        href="${url}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="akd-open-document"
                    >

                        <span
                            class="material-symbols-rounded"
                        >
                            open_in_new
                        </span>

                        Buka Dokumen

                    </a>

                </article>
            `;

        }


        // ========================================
        // FILE TYPE
        // ========================================

        function getFileType(
            document
        ) {

            const mimeType =
                String(
                    document.mimeType ||
                    ""
                )
                .toLowerCase();


            const name =
                String(
                    document.name ||
                    ""
                )
                .toLowerCase();


            if (
                mimeType.includes(
                    "pdf"
                ) ||
                name.endsWith(
                    ".pdf"
                )
            ) {

                return "pdf";
            }


            if (
                mimeType.includes(
                    "word"
                ) ||
                mimeType.includes(
                    "document"
                ) ||
                name.endsWith(
                    ".doc"
                ) ||
                name.endsWith(
                    ".docx"
                )
            ) {

                return "word";
            }


            if (
                mimeType.includes(
                    "spreadsheet"
                ) ||
                mimeType.includes(
                    "excel"
                ) ||
                name.endsWith(
                    ".xls"
                ) ||
                name.endsWith(
                    ".xlsx"
                )
            ) {

                return "spreadsheet";
            }


            if (
                mimeType.includes(
                    "presentation"
                ) ||
                mimeType.includes(
                    "powerpoint"
                ) ||
                name.endsWith(
                    ".ppt"
                ) ||
                name.endsWith(
                    ".pptx"
                )
            ) {

                return "presentation";
            }


            return "other";

        }


        function getFileTypeLabel(
            document
        ) {

            const type =
                getFileType(
                    document
                );


            const labels = {

                pdf:
                    "PDF",

                word:
                    "Word",

                spreadsheet:
                    "Spreadsheet",

                presentation:
                    "Presentation",

                other:
                    "Dokumen"

            };


            return (
                labels[type] ||
                "Dokumen"
            );

        }


        function getFileIcon(
            document
        ) {

            const type =
                getFileType(
                    document
                );


            const icons = {

                pdf:
                    "picture_as_pdf",

                word:
                    "description",

                spreadsheet:
                    "table_view",

                presentation:
                    "slideshow",

                other:
                    "draft"

            };


            return (
                icons[type] ||
                "description"
            );

        }


        // ========================================
        // FORMAT DATE
        // ========================================

        function formatDate(
            value
        ) {

            if (!value) {
                return "—";
            }


            const date =
                new Date(
                    value
                );


            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {

                return "—";
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
        // FORMAT SIZE
        // ========================================

        function formatBytes(
            bytes
        ) {

            if (
                !bytes ||
                bytes <= 0
            ) {

                return "—";
            }


            const units = [
                "B",
                "KB",
                "MB",
                "GB"
            ];


            const index =
                Math.min(
                    Math.floor(
                        Math.log(bytes) /
                        Math.log(1024)
                    ),
                    units.length - 1
                );


            const value =
                bytes /
                Math.pow(
                    1024,
                    index
                );


            return (
                `${value.toFixed(
                    index === 0
                        ? 0
                        : 1
                )} ${units[index]}`
            );

        }


        // ========================================
        // STATES
        // ========================================

        function showLoading() {

            documentList.innerHTML = `
                <div class="akd-loading-state">

                    <span
                        class="material-symbols-rounded"
                    >
                        progress_activity
                    </span>

                    <strong>
                        Memuatkan dokumen
                    </strong>

                    <p>
                        Sila tunggu sebentar...
                    </p>

                </div>
            `;

        }


        function showError() {

            documentList.innerHTML = `
                <div class="akd-loading-state">

                    <span
                        class="material-symbols-rounded"
                    >
                        error
                    </span>

                    <strong>
                        Dokumen tidak dapat dimuatkan
                    </strong>

                    <p>
                        Sila cuba semula sebentar lagi.
                    </p>

                </div>
            `;

        }


        // ========================================
        // SECURITY HELPERS
        // ========================================

        function escapeHtml(
            value
        ) {

            return String(
                value
            )
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );

        }


        function escapeAttribute(
            value
        ) {

            return escapeHtml(
                value
            );

        }


        // ========================================
        // EVENTS
        // ========================================

        searchInput
            ?.addEventListener(
                "input",
                filterDocuments
            );


        yearFilter
            ?.addEventListener(
                "change",
                filterDocuments
            );


        typeFilter
            ?.addEventListener(
                "change",
                filterDocuments
            );


        // ========================================
        // START
        // ========================================

        loadDocuments();

    }
);