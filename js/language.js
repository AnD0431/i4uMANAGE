// ===============================
// i4uManage - Language Switcher (BM / EN)
// ===============================

const translations = {
    ms: {
        main_title_sub: "SISTEM PENGURUSAN DOKUMEN & LATIHAN",
        hero_title_1: "Selamat Datang ke",
        hero_desc: "Platform sehenti untuk mengakses dokumen, bahan kursus dan kertas kerja dengan mudah, teratur dan selamat.",
        building_tag: "JABATAN KESIHATAN NEGERI TERENGGANU",

        card1_title: "PUNCA KUASA",
        card1_desc: "Dokumen berkaitan punca kuasa, pekeliling, arahan dan peraturan yang berkaitan.",
        card1_btn: "Lihat Dokumen",

        text1:"KEMENTERIAN KESIHATAN MALAYSIA",
        text2:"JABATAN KESIHATAN NEGERI TERENGGANU",
        text3:"UNIT LATIHAN",

        card2_title: "SLIDE KURSUS",
        card2_desc: "Slide pembentangan dan bahan kursus yang digunakan dalam latihan.",
        card2_btn: "Lihat Slide",

        card3_title: "KERTAS KERJA",
        card3_desc: "Kertas kerja program, latihan dan dokumen sokongan yang berkaitan.",
        card3_btn: "Lihat Kertas Kerja",

        val1_title: "SELAMAT",
        val1_desc: "Utamakan Keselamatan",
        val2_title: "EFISIEN",
        val2_desc: "Laksanakan Tugas Secara Efisien",
        val3_title: "INTEGRITI",
        val3_desc: "Bertindak Dengan Jujur",
        val4_title: "KUALITI",
        val4_desc: "Komited Kepada Kecemerlangan",

        footer_tagline: "Bersama Membangun Kesihatan Yang Lebih Baik",

        chatbot_greeting: "Hi, Saya Sarah <br /> Apa saya boleh bantu anda?",
        chat_placeholder: "Mesej..."
    },
    en: {
        main_title_sub: "DOCUMENT & TRAINING MANAGEMENT SYSTEM",
        hero_title_1: "Welcome to",
        hero_desc: "A one-stop platform to access documents, course materials and working papers easily, systematically and securely.",
        building_tag: "TERENGGANU STATE HEALTH DEPARTMENT",

        card1_title: "SOURCE OF AUTHORITY",
        card1_desc: "Documents related to sources of authority, circulars, directives and related regulations.",
        card1_btn: "View Documents",

        card2_title: "COURSE SLIDES",
        card2_desc: "Presentation slides and course materials used in training.",
        card2_btn: "View Slides",

        card3_title: "WORKING PAPERS",
        card3_desc: "Program working papers, training and related supporting documents.",
        card3_btn: "View Working Papers",

        val1_title: "SAFE",
        val1_desc: "Prioritise Safety",
        val2_title: "EFFICIENT",
        val2_desc: "Carry Out Tasks Efficiently",
        val3_title: "INTEGRITY",
        val3_desc: "Act With Honesty",
        val4_title: "QUALITY",
        val4_desc: "Committed To Excellence",

        footer_tagline: "Together Building Better Health",

        chatbot_greeting: "Hi, I'm Sarah <br /> How can I help you?",
        chat_placeholder: "Message..."
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