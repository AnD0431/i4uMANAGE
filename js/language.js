// ===============================
// i4uManage - Language Switcher (BM / EN)
// Shared across all pages: index.html, kerja.html, puncakuasa.html, slaid.html
// ===============================

const translations = {
    ms: {
        // Homepage footer
        home_footer_description: "Gerbang digital maklumat Jabatan Kesihatan Negeri Terengganu untuk dokumen rasmi, bahan latihan dan bantuan digital.",
        home_footer_services: "Perkhidmatan",
        home_footer_authority: "Punca Kuasa",
        home_footer_slides: "Slaid Kursus",
        home_footer_papers: "Kertas Kerja",
        home_footer_akd: "Arahan Kawalan Dalaman",
        home_footer_help: "Panduan & Bantuan",
        home_footer_general: "Maklumat Umum",
        home_footer_documents: "Carian Dokumen",
        home_footer_sarah: "Pembantu Digital Sarah",
        home_footer_technical: "Bantuan Teknikal",
        home_footer_contact: "Hubungi Kami",
        home_footer_copyright: "© 2026 i4uManage 3.0 Hak cipta terpelihara.",
        home_footer_faq: "Soalan Lazim",
        home_footer_top: "Kembali ke atas",
        akd_loading_title: "Memuatkan dokumen",
        akd_loading_hint: "Sila tunggu sebentar...",
        // FAQ sections A–D
        faq_group_a: "A. Maklumat Umum",
        faq_count_a: "4 soalan",
        faq_a_q1: "Apakah i4uManage?",
        faq_a_a1: "i4uManage ialah gerbang digital maklumat Jabatan Kesihatan Negeri Terengganu. Portal ini menghimpunkan akses kepada dokumen punca kuasa, slaid kursus, kertas kerja dan pembantu digital Sarah.",
        faq_a_q2: "Apakah tujuan utama portal ini?",
        faq_a_a2: "Portal ini memudahkan pengguna mencari bahan rujukan dan latihan melalui kategori yang tersusun, serta mendapatkan bantuan Sarah untuk urusan dokumen dan tugas pentadbiran.",
        faq_a_q3: "Siapakah pengguna sasaran i4uManage?",
        faq_a_a3: "Portal ini menyokong keperluan rujukan dan latihan warga Jabatan Kesihatan Negeri Terengganu, khususnya bagi urusan pentadbiran, dokumen rasmi dan pembangunan kompetensi.",
        faq_a_q4: "Bolehkah saya menukar bahasa portal?",
        faq_a_a4: "Ya. Gunakan suis BM atau EN pada navbar untuk menukar bahasa paparan portal, termasuk FAQ ini. Dokumen asal kekal dalam bahasa dokumen tersebut.",
        faq_group_b: "B. Pengurusan dan Carian Dokumen",
        faq_count_b: "7 soalan",
        faq_b_q1: "Di mana saya boleh mencari pekeliling dan dokumen punca kuasa?",
        faq_b_a1: "Buka <a href=\"puncakuasa.html\">Punca Kuasa</a> dan pilih kategori rujukan yang berkaitan untuk mengakses dokumen yang tersedia.",
        faq_b_q2: "Bagaimana saya mendapatkan slaid kursus?",
        faq_b_a2: "Pilih <a href=\"slaid.html\">Slaid Kursus</a>, kemudian pilih bahagian yang berkaitan untuk melihat bahan latihan yang tersedia.",
        faq_b_q3: "Di mana saya boleh mendapatkan rujukan kertas kerja?",
        faq_b_a3: "Buka <a href=\"kerja.html\">Kertas Kerja</a> dan pilih bahagian yang berkaitan. Gunakan bahan yang tersedia sebagai rujukan untuk penyediaan kertas kerja program atau latihan.",
        faq_b_q4: "Bagaimana saya mencari dokumen tertentu?",
        faq_b_a4: "Pilih kategori yang berkaitan dan gunakan ruangan carian pada senarai dokumen. Cuba kata kunci daripada tajuk, topik atau nombor rujukan. Anda juga boleh meminta Sarah membantu mencari dokumen dengan memberikan butiran tersebut.",
        faq_b_q5: "Bagaimana saya menyimpan atau memuat turun dokumen?",
        faq_b_a5: "Buka dokumen yang dikehendaki dan gunakan pilihan muat turun yang disediakan oleh paparan dokumen atau pelayar. Ketersediaan muat turun bergantung pada pautan dan tetapan akses dokumen tersebut.",
        faq_b_q6: "Apakah yang perlu saya lakukan jika carian tidak menemui dokumen?",
        faq_b_a6: "Cuba kata kunci yang lebih ringkas, semak ejaan dan pastikan kategori yang dipilih sesuai. Jika masih tiada hasil, catat tajuk atau nombor rujukan yang dicari untuk dirujuk kepada pentadbir portal.",
        faq_b_q7: "Bagaimana saya memastikan dokumen yang dirujuk masih terpakai?",
        faq_b_a7: "Semak tarikh, nombor rujukan dan sebarang catatan pindaan atau pembatalan pada dokumen asal. Jika statusnya tidak jelas, semak dengan sumber rasmi penerbit dokumen sebelum menggunakannya untuk urusan rasmi.",
        faq_group_c: "C. Pembantu Digital Sarah",
        faq_count_c: "7 soalan",
        faq_c_q1: "Siapakah Sarah dan apakah yang boleh dibantunya?",
        faq_c_a1: "Sarah ialah pembantu digital berasaskan AI dalam i4uManage. Sarah boleh membantu dengan carian dokumen, pertanyaan berkaitan portal dan penyediaan draf dokumen pentadbiran seperti kertas kerja, surat atau memo.",
        faq_c_q2: "Bagaimana saya memulakan perbualan dengan Sarah?",
        faq_c_a2: "Tekan ikon Sarah di penjuru kanan bawah halaman. Taip soalan dalam ruang mesej dan tekan butang hantar, atau pilih salah satu cadangan soalan yang dipaparkan.",
        faq_c_q3: "Bagaimana saya mendapatkan jawapan yang lebih tepat?",
        faq_c_a3: "Nyatakan tujuan, topik dan maklumat yang berkaitan dengan jelas. Untuk carian dokumen, sertakan tajuk atau nombor rujukan jika diketahui. Untuk draf, jelaskan jenis dokumen, penerima dan butiran program atau urusan.",
        faq_c_q4: "Bolehkah Sarah membantu menyediakan kertas kerja?",
        faq_c_a4: "Ya. Minta Sarah menyediakan draf kertas kerja dan berikan maklumat seperti nama program, objektif, tarikh, tempat, peserta dan anggaran perbelanjaan. Semak serta sesuaikan draf sebelum digunakan untuk urusan rasmi.",
        faq_c_q5: "Bolehkah saya melampirkan fail kepada Sarah?",
        faq_c_a5: "Ya. Gunakan butang lampiran untuk memilih PDF atau imej. Had saiz PDF ialah 3 MB dan imej asal ialah 15 MB. Sertakan arahan tentang perkara yang perlu disemak dalam lampiran tersebut.",
        faq_c_q6: "Bolehkah hasil dokumen Sarah dimuat turun?",
        faq_c_a6: "Apabila butang DOCX atau PDF tersedia pada hasil dokumen yang dijana, pilih format yang dikehendaki untuk memuat turun. Semak kandungan dan susun atur fail sebelum menggunakannya.",
        faq_c_q7: "Adakah jawapan Sarah boleh dianggap sebagai pengesahan rasmi?",
        faq_c_a7: "Tidak. Sarah ialah pembantu AI dan jawapannya boleh mengandungi kesilapan. Semak fakta, nombor rujukan, tarikh dan cadangan dengan dokumen asal atau sumber rasmi sebelum membuat keputusan atau tindakan rasmi.",
        faq_group_d: "D. Bantuan Teknikal",
        faq_count_d: "3 soalan",
        faq_d_q1: "Apakah yang boleh saya lakukan jika dokumen tidak dapat dibuka?",
        faq_d_a1: "Semak sambungan internet, muat semula halaman dan cuba buka dokumen sekali lagi. Semak tab baharu jika dokumen dibuka di situ. Jika masalah berterusan, catat tajuk dokumen dan mesej ralat untuk dirujuk kepada pentadbir portal.",
        faq_d_q2: "Apakah yang perlu saya lakukan jika Sarah tidak memberikan respons?",
        faq_d_a2: "Pastikan sambungan internet aktif dan tunggu sehingga pemprosesan selesai. Jika mesej ralat dipaparkan, baca arahan tersebut dan cuba hantar semula soalan. Jika masih gagal, salin maklumat penting sebelum memuat semula halaman dan catat mesej ralat untuk rujukan pentadbir.",
        faq_d_q3: "Bolehkah i4uManage digunakan pada telefon atau tablet?",
        faq_d_a3: "Ya. Susun atur portal menyesuaikan diri dengan saiz skrin, dan Sarah dibuka dalam paparan penuh pada telefon. Jika paparan tidak kemas, cuba orientasi skrin yang berbeza, gunakan zum biasa dan kemas kini pelayar.",

        // Homepage FAQ
        faq_jump: "Ada soalan? Lihat FAQs",
        faq_label: "PANDUAN PENGGUNA",
        faq_title: "i4uManage FAQs",
        faq_intro: "Kenali i4uManage dan cari panduan ringkas untuk menggunakan perkhidmatan yang tersedia.",
        faq_hint: "Pilih bahagian dan soalan. Skrol dalam panel untuk melihat soalan seterusnya.",
        faq_services: "Lihat perkhidmatan",

        // Shared / common
        main_title_sub: "GERBANG DIGITAL MAKLUMAT",
        bahagian_pengurusan: "Bahagian Pengurusan",
        footer_tagline: "Bersama Membangun Kesihatan Yang Lebih Baik",
        chatbot_greeting: "Hi, Saya Sarah <br /> Apa saya boleh bantu anda?",
        chat_placeholder: "Mesej...",

        val1_title: "SELAMAT",
        val1_desc: "Utamakan Keselamatan",
        val2_title: "EFISIEN",
        val2_desc: "Laksanakan Tugas Secara Efisien",
        val3_title: "INTEGRITI",
        val3_desc: "Bertindak Dengan Jujur",
        val4_title: "KUALITI",
        val4_desc: "Komited Kepada Kecemerlangan",

        metric_bahagian: "BAHAGIAN",
        metric_pengguna: "PENGGUNA",

        // Shared category names (used in kerja.html AND slaid.html)
        doc1_title: "PEMBANGUNAN",
        doc2_title: "TEKNOLOGI MAKLUMAT",
        doc3_title: "LATIHAN",
        doc4_title: "PSIKOLOGI & KAUNSELING",
        doc5_title: "SUMBER MANUSIA",
        doc6_title: "PENTADBIRAN",
        doc7_title: "PEROLEHAN & ASET",
        doc8_title: "KEWANGAN",

        // index.html
        hero_title_1: "Selamat Datang ke",
        hero_desc: "Sistem berpusat yang memberikan capaian maklumat organisasi secara selamat, pantas, dan berstruktur Mengintegrasikan pekeliling rasmi, bahan rujukan, serta Pembantu Maya AI (Sarah).",
        building_tag: "JABATAN KESIHATAN NEGERI TERENGGANU",
        building_status: "Portal Rasmi",
        card1_title: "PUNCA KUASA",
        card1_desc: "Dokumen berkaitan punca kuasa, pekeliling, arahan dan peraturan yang berkaitan.",
        card1_btn: "Lihat Dokumen",
        card2_title: "SLIDE KURSUS",
        card2_desc: "Slide pembentangan dan bahan kursus yang digunakan dalam latihan.",
        card2_btn: "Lihat Slide",
        card3_title: "KERTAS KERJA",
        card3_desc: "Kertas kerja program, latihan dan dokumen sokongan yang berkaitan.",
        card3_btn: "Lihat Kertas Kerja",
        feature1: "Maklumat Rasmi",
        feature2: "Akses Selamat",
        feature3: "Cepat & Efisien",
        hero_eyebrow: "Portal Digital Unit Latihan",
        text1: "KEMENTERIAN KESIHATAN MALAYSIA",
        text2: "JABATAN KESIHATAN NEGERI TERENGGANU",
        text3: "UNIT LATIHAN",
        services_intro_label: "AKSES UTAMA",
        services_intro_title: "Perkhidmatan i4uManage",
        services_intro_desc: "Akses dokumen rasmi, bahan kursus dan kertas kerja melalui kategori yang disediakan.",
        services_count: "3 Kategori",

        // kerja.html
        kerja_page_title: "KERTAS KERJA",
        kerja_page_desc: "Platform sehenti untuk mengakses semua kertas kerja program, latihan, bengkel dan dokumen rasmi mengikut bahagian dengan cepat, tersusun dan selamat.",
        view_document_btn: "Lihat Dokumen",
        kerja1_desc: "Kertas kerja berkaitan pembangunan organisasi, projek dan perancangan strategik.",
        kerja2_desc: "Dokumen pembangunan ICT, sistem maklumat, digitalisasi dan inovasi.",
        kerja3_desc: "Kertas kerja kursus, bengkel, seminar dan latihan kakitangan.",
        kerja4_desc: "Dokumen berkaitan kesejahteraan, motivasi dan pembangunan modal insan.",
        kerja5_desc: "Dokumen pengurusan kakitangan, penjawatan dan pembangunan kompetensi.",
        kerja6_desc: "Pengurusan pejabat, mesyuarat dan urusan pentadbiran jabatan.",
        kerja7_desc: "Dokumen berkaitan perolehan kerajaan serta pengurusan aset.",
        kerja8_desc: "Dokumen pengurusan kewangan, bajet dan perbelanjaan jabatan.",
        metric_total_kerja: "JUMLAH KERTAS KERJA",
        metric_muat_turun: "MUAT TURUN",

        // slaid.html
        slaid_page_title: "Slaid Kursus",
        slaid_page_desc: "Platform sehenti untuk mengakses slaid kursus mengikut bahagian. Semua bahan kursus dikemaskini, tersusun dan mudah dicapai.",
        slaid_card1_header: "PEMBANGUNAN",
        slaid_card2_header: "TEKNOLOGI MAKLUMAT",
        slaid_card3_header: "LATIHAN",
        slaid_card4_header: "PSIKOLOGI & KAUNSELING",
        slaid_card5_header: "SUMBER MANUSIA",
        slaid_card6_header: "PENTADBIRAN",
        slaid_card7_header: "PEROLEHAN & ASET",
        slaid_card8_header: "KEWANGAN",
        view_slide_btn: "Lihat Slaid",
        slaid1_desc: "Slaid kursus berkaitan pembangunan organisasi, projek dan perancangan.",
        slaid2_desc: "Slaid kursus berkaitan ICT, sistem maklumat, digitalisasi dan inovasi teknologi.",
        slaid3_desc: "Slaid kursus bagi program latihan, bengkel, seminar dan peningkatan kemahiran.",
        slaid4_desc: "Slaid kursus berkaitan kesejahteraan, motivasi dan kaunseling kakitangan.",
        slaid5_desc: "Slaid kursus pengurusan sumber manusia, kompetensi dan pembangunan kerjaya.",
        slaid6_desc: "Slaid kursus pengurusan pejabat, mesyuarat dan urusan pentadbiran.",
        slaid7_desc: "Slaid kursus perolehan kerajaan serta pengurusan aset alih dan tidak alih.",
        slaid8_desc: "Slaid kursus pengurusan kewangan, bajet dan perbelanjaan jabatan.",
        metric_total_slaid: "JUMLAH SLAID KURSUS",
        metric_total_muat_turun: "JUMLAH MUAT TURUN",

        // puncakuasa.html
        breadcrumb_home: "Utama",
        punca_title: "Punca Kuasa",
        punca_heading: "PUNCA KUASA",
        punca_desc: "Pautan ke sumber punca kuasa rasmi bagi rujukan dan pelaksanaan.",
        visit_site_btn: "Layari Laman",
        punca1_desc: "Sistem Pekeliling Perkhidmatan Sumber Manusia (MyPPSM) Jabatan Perkhidmatan Awam.",
        punca2_desc: "Portal Pekeliling Perbendaharaan Kementerian Kewangan Malaysia untuk rujukan perbendaharaan.",
        punca3_title: "Surat Pekeliling KKM",
        punca3_desc: "Senarai dan carian surat pekeliling Kementerian Kesihatan Malaysia mengikut tajuk dan tarikh.",
        punca4_title: "Akta KKM",
        punca4_desc: "Akta, dasar, polisi & garis panduan Kementerian Kesihatan Malaysia untuk rujukan perundangan.",
        brand_title: "KEMENTERIAN KESIHATAN MALAYSIA",
        brand_subtitle: "JABATAN KESIHATAN NEGERI TERENGGANU",
        unit_latihan: "UNIT LATIHAN",
        back_btn_text: "Halaman Utama",
        source_text: "RUJUKAN RASMI",
        gov_source_text: "Sumber Rasmi Kerajaan",
        akd_card: "ARAHAN KAWALAN DALAMAN (AKD)",
        akd_desc: "Himpunan Arahan Kawalan Dalaman rasmi untuk rujukan dan pelaksanaan Jabatan Kesihatan Negeri Terengganu.",
        visit_site_btn: "Layari Laman"
    },
    en: {
        // Homepage footer
        home_footer_description: "The digital information gateway of the Terengganu State Health Department for official documents, training materials and digital assistance.",
        home_footer_services: "Services",
        home_footer_authority: "Authority Documents",
        home_footer_slides: "Course Slides",
        home_footer_papers: "Working Papers",
        home_footer_akd: "Internal Control Directives",
        home_footer_help: "Guidance & Support",
        home_footer_general: "General Information",
        home_footer_documents: "Document Search",
        home_footer_sarah: "Sarah Digital Assistant",
        home_footer_technical: "Technical Support",
        home_footer_contact: "Contact Us",
        home_footer_copyright: "© 2026 i4uManage 3.0 All rights reserved.",
        home_footer_faq: "FAQs",
        home_footer_top: "Back to top",
        akd_loading_title: "Loading documents",
        akd_loading_hint: "Please wait a moment...",
        // FAQ sections A–D
        faq_group_a: "A. General Information",
        faq_count_a: "4 questions",
        faq_a_q1: "What is i4uManage?",
        faq_a_a1: "i4uManage is the digital information gateway for the Terengganu State Health Department. It brings together authority documents, course slides, working papers and the Sarah digital assistant.",
        faq_a_q2: "What is the main purpose of this portal?",
        faq_a_a2: "The portal helps users find reference and training materials through organised categories and access Sarah for help with documents and administrative tasks.",
        faq_a_q3: "Who is i4uManage intended for?",
        faq_a_a3: "The portal supports the reference and training needs of Terengganu State Health Department staff, particularly for administration, official documents and competency development.",
        faq_a_q4: "Can I change the portal language?",
        faq_a_a4: "Yes. Use the BM or EN switch in the navbar to change the portal display language, including these FAQs. Original documents remain in their existing language.",
        faq_group_b: "B. Document Management and Search",
        faq_count_b: "7 questions",
        faq_b_q1: "Where can I find circulars and authority documents?",
        faq_b_a1: "Open <a href=\"puncakuasa.html\">Authority Documents</a> and choose the relevant reference category to access available documents.",
        faq_b_q2: "How do I access course slides?",
        faq_b_a2: "Select <a href=\"slaid.html\">Course Slides</a>, then choose the relevant division to view available training materials.",
        faq_b_q3: "Where can I find working paper references?",
        faq_b_a3: "Open <a href=\"kerja.html\">Working Papers</a> and select the relevant division. Use available materials as references when preparing programme or training working papers.",
        faq_b_q4: "How do I search for a specific document?",
        faq_b_a4: "Choose the relevant category and use the search field in the document list. Try keywords from the title, topic or reference number. You can also ask Sarah to help find a document using those details.",
        faq_b_q5: "How do I save or download a document?",
        faq_b_a5: "Open the document and use the download option provided by its viewer or your browser. Download availability depends on the document link and access settings.",
        faq_b_q6: "What should I do if a search finds no documents?",
        faq_b_a6: "Try shorter keywords, check the spelling and confirm that you selected the relevant category. If there are still no results, note the title or reference number to share with the portal administrator.",
        faq_b_q7: "How do I check whether a document is still applicable?",
        faq_b_a7: "Check the date, reference number and any amendment or cancellation notes in the original document. If its status is unclear, verify it with the issuing organisation’s official source before using it for official work.",
        faq_group_c: "C. Sarah Digital Assistant",
        faq_count_c: "7 questions",
        faq_c_q1: "Who is Sarah and how can she help?",
        faq_c_a1: "Sarah is the AI digital assistant in i4uManage. She can help with document searches, questions about the portal and drafts of administrative documents such as working papers, letters or memos.",
        faq_c_q2: "How do I start a conversation with Sarah?",
        faq_c_a2: "Select the Sarah icon at the bottom right of the page. Type a question in the message field and press send, or choose one of the suggested prompts.",
        faq_c_q3: "How can I get more relevant answers?",
        faq_c_a3: "Clearly state your purpose, topic and relevant details. For document searches, include the title or reference number if known. For drafts, describe the document type, recipient and programme or task details.",
        faq_c_q4: "Can Sarah help prepare a working paper?",
        faq_c_a4: "Yes. Ask Sarah to prepare a draft and provide details such as the programme name, objectives, date, venue, participants and estimated expenditure. Review and adapt the draft before using it for official work.",
        faq_c_q5: "Can I attach files for Sarah?",
        faq_c_a5: "Yes. Use the attachment button to select a PDF or image. The PDF size limit is 3 MB and the original image size limit is 15 MB. Include instructions explaining what you want Sarah to review.",
        faq_c_q6: "Can I download documents generated by Sarah?",
        faq_c_a6: "When DOCX or PDF buttons are available on a generated document, select the required format to download it. Review the content and layout of the file before using it.",
        faq_c_q7: "Do Sarah’s answers count as official confirmation?",
        faq_c_a7: "No. Sarah is an AI assistant and her answers may contain errors. Check facts, reference numbers, dates and suggestions against original documents or official sources before making official decisions or taking action.",
        faq_group_d: "D. Technical Support",
        faq_count_d: "3 questions",
        faq_d_q1: "What can I do if a document will not open?",
        faq_d_a1: "Check your internet connection, refresh the page and try opening the document again. Check any new tab where it may have opened. If the problem continues, note the document title and error message to share with the portal administrator.",
        faq_d_q2: "What should I do if Sarah does not respond?",
        faq_d_a2: "Check your internet connection and allow processing to finish. If an error appears, follow its instructions and try sending your question again. If it still fails, copy any important information before refreshing the page and note the error for the administrator.",
        faq_d_q3: "Can I use i4uManage on a phone or tablet?",
        faq_d_a3: "Yes. The portal layout adapts to the screen size, and Sarah opens in a full-screen view on phones. If the layout appears incorrect, try a different screen orientation, use normal browser zoom and update your browser.",

        // Homepage FAQ
        faq_jump: "Have a question? View FAQs",
        faq_label: "USER GUIDE",
        faq_title: "i4uManage FAQs",
        faq_intro: "Get to know i4uManage and find quick guidance on using its available services.",
        faq_hint: "Choose a section and question. Scroll within the panel to see more questions.",
        faq_services: "Explore services",

        // Shared / common
        main_title_sub: "DIGITAL INFORMATION GATEWAY",
        bahagian_pengurusan: "Management Division",
        footer_tagline: "Together Building Better Health",
        chatbot_greeting: "Hi, I'm Sarah <br /> How can I help you?",
        chat_placeholder: "Message...",

        val1_title: "SAFE",
        val1_desc: "Prioritise Safety",
        val2_title: "EFFICIENT",
        val2_desc: "Carry Out Tasks Efficiently",
        val3_title: "INTEGRITY",
        val3_desc: "Act With Honesty",
        val4_title: "QUALITY",
        val4_desc: "Committed To Excellence",

        metric_bahagian: "DIVISIONS",
        metric_pengguna: "USERS",

        // Shared category names
        doc1_title: "DEVELOPMENT",
        doc2_title: "INFORMATION TECHNOLOGY",
        doc3_title: "TRAINING",
        doc4_title: "PSYCHOLOGY & COUNSELLING",
        doc5_title: "HUMAN RESOURCES",
        doc6_title: "ADMINISTRATION",
        doc7_title: "PROCUREMENT & ASSETS",
        doc8_title: "FINANCE",

        // index.html
        hero_title_1: "Welcome to",
        hero_desc: "A centralised system providing secure, fast, and structured access to organisational information. Integrating official circulars, reference materials, and an AI Virtual Assistant (Sarah).",
        building_tag: "TERENGGANU STATE HEALTH DEPARTMENT",
        building_status: "Official Portal",
        card1_title: "SOURCE OF AUTHORITY",
        card1_desc: "Documents related to sources of authority, circulars, directives and related regulations.",
        card1_btn: "View Documents",
        card2_title: "COURSE SLIDES",
        card2_desc: "Presentation slides and course materials used in training.",
        card2_btn: "View Slides",
        card3_title: "WORKING PAPERS",
        card3_desc: "Program working papers, training and related supporting documents.",
        card3_btn: "View Working Papers",
        feature1: "Official Information",
        feature2: "Secure Access",
        feature3: "Fast & Efficient",
        hero_eyebrow: "Training Unit Digital Portal",
        text1: "MINISTRY OF HEALTH MALAYSIA",
        text2: "TERENGGANU STATE HEALTH DEPARTMENT",
        text3: "TRAINING UNIT",
        services_intro_label: "MAIN ACCESS",
        services_intro_title: "i4uManage Services",
        services_intro_desc: "Access official documents, course materials and working papers through the provided categories.",
        services_count: "3 categories",

        // kerja.html
        kerja_page_title: "WORKING PAPERS",
        kerja_page_desc: "A one-stop platform to access all program working papers, training, workshop and official documents by division quickly, systematically and securely.",
        view_document_btn: "View Document",
        kerja1_desc: "Working papers related to organisational development, projects and strategic planning.",
        kerja2_desc: "ICT development documents, information systems, digitalisation and innovation.",
        kerja3_desc: "Course, workshop, seminar and staff training working papers.",
        kerja4_desc: "Documents related to wellbeing, motivation and human capital development.",
        kerja5_desc: "Staff management, appointment and competency development documents.",
        kerja6_desc: "Office management, meetings and departmental administrative matters.",
        kerja7_desc: "Documents related to government procurement and asset management.",
        kerja8_desc: "Financial management, budget and departmental expenditure documents.",
        metric_total_kerja: "TOTAL WORKING PAPERS",
        metric_muat_turun: "DOWNLOADS",

        // slaid.html
        slaid_page_title: "Course Slides",
        slaid_page_desc: "A one-stop platform to access course slides by division. All course materials are updated, organised and easily accessible.",
        slaid_card1_header: "DEVELOPMENT",
        slaid_card2_header: "INFORMATION TECHNOLOGY",
        slaid_card3_header: "TRAINING",
        slaid_card4_header: "PSYCHOLOGY & COUNSELING",
        slaid_card5_header: "HUMAN RESOURCES",
        slaid_card6_header: "ADMINISTRATION",
        slaid_card7_header: "ACQUISITIONS & ASSETS",
        slaid_card8_header: "FINANCE",
        view_slide_btn: "View Slides",
        slaid1_desc: "Course slides related to organisational development, projects and planning.",
        slaid2_desc: "Course slides related to ICT, information systems, digitalisation and technology innovation.",
        slaid3_desc: "Course slides for training programs, workshops, seminars and skills enhancement.",
        slaid4_desc: "Course slides related to wellbeing, motivation and staff counselling.",
        slaid5_desc: "Course slides on human resource management, competency and career development.",
        slaid6_desc: "Course slides on office management, meetings and administrative matters.",
        slaid7_desc: "Course slides on government procurement and management of movable and immovable assets.",
        slaid8_desc: "Course slides on financial management, budget and departmental expenditure.",
        metric_total_slaid: "TOTAL COURSE SLIDES",
        metric_total_muat_turun: "TOTAL DOWNLOADS",

        // puncakuasa.html
        breadcrumb_home: "Home",
        punca_title: "Source of Authority",
        punca_heading: "SOURCE OF AUTHORITY",
        punca_desc: "Links to official sources of authority for reference and implementation.",
        visit_site_btn: "Visit Site",
        punca1_desc: "Human Resource Service Circular System (MyPPSM) of the Public Service Department.",
        punca2_desc: "Treasury Circular Portal of the Ministry of Finance Malaysia for treasury reference.",
        punca3_title: "MOH Circular Letters",
        punca3_desc: "List and search of Ministry of Health Malaysia circular letters by title and date.",
        punca4_title: "MOH Act",
        punca4_desc: "Acts, policies and guidelines of the Ministry of Health Malaysia for legal reference.",
        brand_title: "MINISTRY OF HEALTH MALAYSIA",
        brand_subtitle: "TERENGGANU STATE HEALTH DEPARTMENT",
        unit_latihan: "TRAINING UNIT",
        back_btn_text: "Home Page",
        source_text: "OFFICIAL REFERENCE",
        gov_source_text: "Official Government Source",
        akd_card: "INTERNAL CONTROL DIRECTIVES (ICD)",
        akd_desc: "A collection of official Internal Control Directives for reference and implementation by the Terengganu State Health Department.",
        visit_site_btn: "Visit Site"
    }
};

function applyLanguage(lang) {
    // Text content (supports the <br/> in chatbot greeting via innerHTML)
    document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (translations[lang] && translations[lang][key] !== undefined) {
            el.innerHTML = translations[lang][key];
        }
    });

    // Placeholder text
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        const key = el.getAttribute("data-i18n-placeholder");
        if (translations[lang] && translations[lang][key] !== undefined) {
            el.setAttribute("placeholder", translations[lang][key]);
        }
    });

    // Update <html lang="">
    document.documentElement.setAttribute("lang", lang);

    // Update active state on switcher buttons
    document.querySelectorAll(".lang-switcher .lang-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
    });

    // Persist choice
    localStorage.setItem("i4u_lang", lang);
}

document.addEventListener("DOMContentLoaded", () => {
    const savedLang = localStorage.getItem("i4u_lang") || "ms";
    applyLanguage(savedLang);

    document.querySelectorAll(".lang-switcher .lang-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const lang = btn.getAttribute("data-lang");
            applyLanguage(lang);
        });
    });
});