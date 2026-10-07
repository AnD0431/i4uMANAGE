// Katalog sumber Sarah: dikongsi oleh script browser dan import server (ESM).
// Pautan ialah panduan carian; bukan bukti bahawa sesuatu dasar masih berkuat kuasa.
// Semakan direktori rasmi: 2026-10-07. Rujukan asal disimpan pada setiap entri.
(function (root) {
    "use strict";
    const reviewedAt = "2026-10-07";
    const sources = [
    {
        "id": "mof",
        "category": "ministry",
        "name": "Kementerian Kewangan",
        "url": "https://www.mof.gov.my/",
        "keywords": [
            "mof",
            "ministry of finance",
            "perbendaharaan",
            "belanjawan",
            "arahan perbendaharaan"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "moe",
        "category": "ministry",
        "name": "Kementerian Pendidikan Malaysia",
        "url": "https://www.moe.gov.my/",
        "keywords": [
            "kpm",
            "moe",
            "kementerian pendidikan",
            "ministry of education",
            "guru",
            "sekolah",
            "eGTukar",
            "e-GTukar",
            "SPLKPM",
            "eOperasi",
            "DELIMa"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "mohe",
        "category": "ministry",
        "name": "Kementerian Pendidikan Tinggi",
        "url": "https://www.mohe.gov.my/",
        "keywords": [
            "kpt",
            "mohe",
            "ministry of higher education",
            "universiti awam",
            "politeknik",
            "kolej komuniti"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "moh",
        "category": "ministry",
        "name": "Kementerian Kesihatan Malaysia",
        "url": "https://www.moh.gov.my/",
        "keywords": [
            "kkm",
            "moh",
            "kementerian kesihatan",
            "ministry of health",
            "hospital",
            "klinik"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "moha",
        "category": "ministry",
        "name": "Kementerian Dalam Negeri",
        "url": "https://www.moha.gov.my/",
        "keywords": [
            "kdn",
            "moha",
            "ministry of home affairs",
            "keselamatan dalam negeri",
            "imigresen"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "mod",
        "category": "ministry",
        "name": "Kementerian Pertahanan",
        "url": "https://www.mod.gov.my/",
        "keywords": [
            "minDef",
            "ministry of defence",
            "angkatan tentera",
            "pertahanan negara"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "kln",
        "category": "ministry",
        "name": "Kementerian Luar Negeri",
        "url": "https://www.kln.gov.my/",
        "keywords": [
            "kln",
            "wisma putra",
            "ministry of foreign affairs",
            "hubungan diplomatik"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "kkr",
        "category": "ministry",
        "name": "Kementerian Kerja Raya",
        "url": "https://www.kkr.gov.my/",
        "keywords": [
            "kkr",
            "ministry of works",
            "projek jalan raya"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "mot",
        "category": "ministry",
        "name": "Kementerian Pengangkutan",
        "url": "https://www.mot.gov.my/",
        "keywords": [
            "mot",
            "ministry of transport",
            "pengangkutan awam"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "kpkt",
        "category": "ministry",
        "name": "Kementerian Perumahan dan Kerajaan Tempatan",
        "url": "https://www.kpkt.gov.my/",
        "keywords": [
            "kpkt",
            "ministry of housing and local government",
            "pihak berkuasa tempatan",
            "kerajaan tempatan",
            "pbt"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "kpdn",
        "category": "ministry",
        "name": "Kementerian Perdagangan Dalam Negeri dan Kos Sara Hidup",
        "url": "https://www.kpdn.gov.my/",
        "keywords": [
            "kpdn",
            "kpdnhep",
            "ministry of domestic trade and cost of living",
            "kos sara hidup",
            "hak pengguna"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "kpkm",
        "category": "ministry",
        "name": "Kementerian Pertanian dan Keterjaminan Makanan",
        "url": "https://www.kpkm.gov.my/",
        "keywords": [
            "kpkm",
            "ministry of agriculture and food security",
            "keterjaminan makanan"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "kkdw",
        "category": "ministry",
        "name": "Kementerian Kemajuan Desa dan Wilayah",
        "url": "https://www.rurallink.gov.my/",
        "keywords": [
            "kkdw",
            "kplb",
            "ministry of rural and regional development",
            "pembangunan luar bandar"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "kuskop",
        "category": "ministry",
        "name": "Kementerian Pembangunan Usahawan dan Koperasi",
        "url": "https://www.kuskop.gov.my/",
        "keywords": [
            "kuskop",
            "medac",
            "ministry of entrepreneur and cooperatives development",
            "pembangunan usahawan",
            "koperasi"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "kpwkm",
        "category": "ministry",
        "name": "Kementerian Pembangunan Wanita, Keluarga dan Masyarakat",
        "url": "https://www.kpwkm.gov.my/",
        "keywords": [
            "kpwkm",
            "ministry of women family and community development",
            "kebajikan masyarakat"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "kbs",
        "category": "ministry",
        "name": "Kementerian Belia dan Sukan",
        "url": "https://www.kbs.gov.my/",
        "keywords": [
            "kbs",
            "ministry of youth and sports",
            "dasar belia",
            "dasar sukan"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "motac",
        "category": "ministry",
        "name": "Kementerian Pelancongan, Seni dan Budaya",
        "url": "https://www.motac.gov.my/",
        "keywords": [
            "motac",
            "ministry of tourism arts and culture",
            "dasar pelancongan",
            "kebudayaan"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "mosti",
        "category": "ministry",
        "name": "Kementerian Sains, Teknologi dan Inovasi",
        "url": "https://www.mosti.gov.my/",
        "keywords": [
            "mosti",
            "ministry of science technology and innovation",
            "penyelidikan kerajaan",
            "geran inovasi"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "kesuma",
        "category": "ministry",
        "name": "Kementerian Sumber Manusia",
        "url": "https://www.mohr.gov.my/",
        "keywords": [
            "ksm",
            "kesuma",
            "mohr",
            "ministry of human resources",
            "dasar tenaga kerja",
            "keselamatan pekerjaan"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "kpk",
        "category": "ministry",
        "name": "Kementerian Perladangan dan Komoditi",
        "url": "https://www.kpk.gov.my/",
        "keywords": [
            "kpk",
            "ministry of plantation and commodities",
            "dasar komoditi",
            "perladangan"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "nres",
        "category": "ministry",
        "name": "Kementerian Sumber Asli dan Kelestarian Alam",
        "url": "https://www.nres.gov.my/",
        "keywords": [
            "nres",
            "ministry of natural resources and environmental sustainability",
            "kelestarian alam",
            "dasar alam sekitar"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "petra",
        "category": "ministry",
        "name": "Kementerian Peralihan Tenaga dan Transformasi Air",
        "url": "https://www.petra.gov.my/",
        "keywords": [
            "petra",
            "ministry of energy transition and water transformation",
            "peralihan tenaga",
            "transformasi air"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "miti",
        "category": "ministry",
        "name": "Kementerian Pelaburan, Perdagangan dan Industri",
        "url": "https://www.miti.gov.my/",
        "keywords": [
            "miti",
            "ministry of investment trade and industry",
            "dasar pelaburan",
            "dasar perindustrian"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "ekonomi",
        "category": "ministry",
        "name": "Kementerian Ekonomi",
        "url": "https://ekonomi.gov.my/",
        "keywords": [
            "ministry of economy",
            "epu",
            "unit perancang ekonomi",
            "rancangan malaysia",
            "rmk13",
            "rmk-13"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "komunikasi",
        "category": "ministry",
        "name": "Kementerian Komunikasi",
        "url": "https://www.komunikasi.gov.my/",
        "keywords": [
            "kementerian komunikasi malaysia",
            "ministry of communications",
            "dasar komunikasi"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "digital",
        "category": "ministry",
        "name": "Kementerian Digital",
        "url": "https://www.digital.gov.my/",
        "keywords": [
            "ministry of digital",
            "digital malaysia",
            "mydigital",
            "dasar pendigitalan"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "perpaduan",
        "category": "ministry",
        "name": "Kementerian Perpaduan Negara",
        "url": "https://www.perpaduan.gov.my/",
        "keywords": [
            "kementerian perpaduan",
            "ministry of national unity",
            "dasar perpaduan",
            "rukun tetangga"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "jpm",
        "category": "agency",
        "name": "Jabatan Perdana Menteri",
        "url": "https://www.jpm.gov.my/",
        "keywords": [
            "jpm",
            "prime minister department",
            "jabatan perdana menteri"
        ],
        "reference": "https://www.kabinet.gov.my/livewebcms/paparan/5"
    },
    {
        "id": "jdn",
        "category": "agency",
        "name": "Jabatan Digital Negara",
        "url": "https://www.jdn.gov.my/",
        "keywords": [
            "jdn",
            "mampu",
            "jtisa",
            "projek ict",
            "kelulusan teknikal ict",
            "technical and costing",
            "technical costing",
            "perolehan ict",
            "mygovuc",
            "mygovnet",
            "mygovcloud",
            "mygdx",
            "mygpki",
            "mygovea",
            "ddms",
            "splask",
            "pusat data sektor awam",
            "pendigitalan sektor awam",
            "garis panduan ai sektor awam",
            "spesifikasi standard perolehan hardware",
            "spesifikasi standard perolehan software"
        ],
        "reference": "https://www.jdn.gov.my/"
    },
    {
        "id": "jdn-policy",
        "category": "agency",
        "name": "Dasar dan Garis Panduan Pendigitalan JDN",
        "url": "https://www.jdn.gov.my/dasar-pendigitalan-negara/",
        "keywords": [
            "jtisa",
            "projek ict",
            "dasar pendigitalan",
            "garis panduan ai sektor awam",
            "perolehan ict"
        ],
        "reference": "https://www.jdn.gov.my/dasar-pendigitalan-negara/"
    },
    {
        "id": "jpa",
        "category": "agency",
        "name": "Jabatan Perkhidmatan Awam",
        "url": "https://www.jpa.gov.my/",
        "keywords": [
            "jpa",
            "hrmis",
            "sspa",
            "saraan",
            "cuti",
            "bercuti",
            "tatatertib",
            "kenaikan pangkat",
            "pemangkuan",
            "skim perkhidmatan",
            "persaraan",
            "pencen"
        ],
        "reference": "https://www.moe.gov.my/korporat/jabatan?layout=*"
    },
    {
        "id": "jpa-docs",
        "category": "agency",
        "name": "Dokumen JPA / MyPPSM",
        "url": "https://docs.jpa.gov.my/",
        "keywords": [
            "myppsm",
            "ceraian",
            "pekeliling perkhidmatan",
            "perintah am",
            "sspa",
            "cuti",
            "tatatertib",
            "elaun penjawat awam"
        ],
        "reference": "https://docs.jpa.gov.my/"
    },
    {
        "id": "treasury",
        "category": "agency",
        "name": "Portal Pekeliling Perbendaharaan",
        "url": "https://ppp.treasury.gov.my/",
        "keywords": [
            "pekeliling perbendaharaan",
            "perolehan",
            "lojing",
            "hotel",
            "tuntutan",
            "elaun makan",
            "elaun harian",
            "arahan perbendaharaan",
            "waran"
        ],
        "reference": "https://ppp.treasury.gov.my/"
    },
    {
        "id": "janm",
        "category": "agency",
        "name": "Jabatan Akauntan Negara Malaysia",
        "url": "https://www.anm.gov.my/",
        "keywords": [
            "janm",
            "jabatan akauntan negara",
            "perakaunan kerajaan",
            "penyata gaji",
            "slip gaji",
            "epenyata gaji",
            "emolumen",
            "igfmas"
        ],
        "reference": "https://www.anm.gov.my/"
    },
    {
        "id": "spa",
        "category": "agency",
        "name": "Suruhanjaya Perkhidmatan Awam",
        "url": "https://www.spa.gov.my/",
        "keywords": [
            "spa",
            "spa9",
            "pengambilan penjawat awam",
            "jawatan kosong kerajaan"
        ],
        "reference": "https://www.spa.gov.my/"
    },
    {
        "id": "spp",
        "category": "agency",
        "name": "Suruhanjaya Perkhidmatan Pendidikan",
        "url": "https://www.spp.gov.my/",
        "keywords": [
            "spp",
            "myspp",
            "pengambilan guru",
            "pelantikan guru"
        ],
        "reference": "https://www.moe.gov.my/korporat/jabatan?layout=*"
    },
    {
        "id": "agc",
        "category": "agency",
        "name": "Jabatan Peguam Negara",
        "url": "https://www.agc.gov.my/",
        "keywords": [
            "agc",
            "peguam negara",
            "undang undang",
            "akta",
            "warta",
            "perundangan"
        ],
        "reference": "https://www.agc.gov.my/"
    },
    {
        "id": "parlimen",
        "category": "agency",
        "name": "Parlimen Malaysia",
        "url": "https://www.parlimen.gov.my/",
        "keywords": [
            "parlimen",
            "hansard",
            "dewan rakyat",
            "dewan negara",
            "rang undang undang"
        ],
        "reference": "https://www.parlimen.gov.my/"
    },
    {
        "id": "kehakiman",
        "category": "agency",
        "name": "Badan Kehakiman Malaysia",
        "url": "https://www.kehakiman.gov.my/",
        "keywords": [
            "kehakiman",
            "mahkamah",
            "prosedur mahkamah"
        ],
        "reference": "https://www.kehakiman.gov.my/"
    },
    {
        "id": "mygov",
        "category": "agency",
        "name": "Portal MyGovernment",
        "url": "https://www.malaysia.gov.my/",
        "keywords": [
            "mygovernment",
            "mygov",
            "direktori agensi",
            "portal kerajaan",
            "semua kementerian",
            "senarai kementerian"
        ],
        "reference": "https://www.malaysia.gov.my/"
    },
    {
        "id": "jpn-registration",
        "category": "agency",
        "name": "Jabatan Pendaftaran Negara",
        "url": "https://www.jpn.gov.my/",
        "keywords": [
            "jabatan pendaftaran negara",
            "mykad",
            "kad pengenalan",
            "sijil kelahiran",
            "pendaftaran kelahiran",
            "kewarganegaraan"
        ],
        "reference": "https://www.jpn.gov.my/"
    },
    {
        "id": "education-directory",
        "category": "agency",
        "name": "Direktori Jabatan Pendidikan Negeri dan Wilayah",
        "url": "https://www.moe.gov.my/korporat/jabatan?layout=*",
        "keywords": [
            "jabatan pendidikan negeri",
            "jabatan pendidikan wilayah",
            "jpn pendidikan"
        ],
        "reference": "https://www.moe.gov.my/korporat/jabatan?layout=*"
    },
    {
        "id": "education-jpnjohor",
        "category": "state-education",
        "name": "Jabatan Pendidikan Negeri Johor",
        "url": "https://jpnjohor.moe.gov.my/",
        "keywords": [
            "jpnjohor",
            "jpn Johor",
            "jabatan pendidikan Johor"
        ],
        "reference": "https://www.moe.gov.my/jabatan-pendidikan-negeri-johor",
        "states": [
            "johor"
        ]
    },
    {
        "id": "education-jpnkedah",
        "category": "state-education",
        "name": "Jabatan Pendidikan Negeri Kedah",
        "url": "https://jpnkedah.moe.gov.my/",
        "keywords": [
            "jpnkedah",
            "jpn Kedah",
            "jabatan pendidikan Kedah"
        ],
        "reference": "https://www.moe.gov.my/jabatan-pendidikan-negeri-kedah",
        "states": [
            "kedah"
        ]
    },
    {
        "id": "education-jpnkelantan",
        "category": "state-education",
        "name": "Jabatan Pendidikan Negeri Kelantan",
        "url": "https://jpnkelantan.moe.gov.my/",
        "keywords": [
            "jpnkelantan",
            "jpn Kelantan",
            "jabatan pendidikan Kelantan"
        ],
        "reference": "https://www.moe.gov.my/jabatan-pendidikan-negeri-kelantan",
        "states": [
            "kelantan"
        ]
    },
    {
        "id": "education-jpnmelaka",
        "category": "state-education",
        "name": "Jabatan Pendidikan Negeri Melaka",
        "url": "http://jpnmelaka.moe.gov.my/",
        "keywords": [
            "jpnmelaka",
            "jpn Melaka",
            "jabatan pendidikan Melaka"
        ],
        "reference": "https://www.moe.gov.my/jabatan-pendidikan-melaka",
        "states": [
            "melaka"
        ]
    },
    {
        "id": "education-jpnns",
        "category": "state-education",
        "name": "Jabatan Pendidikan Negeri Sembilan",
        "url": "https://jpnns.moe.gov.my/",
        "keywords": [
            "jpnns",
            "jpn Negeri Sembilan",
            "jabatan pendidikan Negeri Sembilan"
        ],
        "reference": "https://www.moe.gov.my/jabatan-pendidikan-negeri-sembilan",
        "states": [
            "negeri sembilan",
            "n sembilan",
            "n9"
        ]
    },
    {
        "id": "education-jpnpahang",
        "category": "state-education",
        "name": "Jabatan Pendidikan Negeri Pahang",
        "url": "https://jpnpahang.moe.gov.my/",
        "keywords": [
            "jpnpahang",
            "jpn Pahang",
            "jabatan pendidikan Pahang"
        ],
        "reference": "https://www.moe.gov.my/jabatan-pendidikan-negeri-pahang",
        "states": [
            "pahang"
        ]
    },
    {
        "id": "education-jpnpp",
        "category": "state-education",
        "name": "Jabatan Pendidikan Negeri Pulau Pinang",
        "url": "https://jpnpp.moe.gov.my/",
        "keywords": [
            "jpnpp",
            "jpn Pulau Pinang",
            "jabatan pendidikan Pulau Pinang"
        ],
        "reference": "https://www.moe.gov.my/jabatan-pendidikan-pulau-pinang",
        "states": [
            "pulau pinang",
            "penang"
        ]
    },
    {
        "id": "education-jpnperak",
        "category": "state-education",
        "name": "Jabatan Pendidikan Negeri Perak",
        "url": "https://jpnperak.moe.gov.my/",
        "keywords": [
            "jpnperak",
            "jpn Perak",
            "jabatan pendidikan Perak"
        ],
        "reference": "https://www.moe.gov.my/jabatan-pendidikan-negeri-perak",
        "states": [
            "perak"
        ]
    },
    {
        "id": "education-jpnperlis",
        "category": "state-education",
        "name": "Jabatan Pendidikan Negeri Perlis",
        "url": "https://jpnperlis.moe.gov.my/",
        "keywords": [
            "jpnperlis",
            "jpn Perlis",
            "jabatan pendidikan Perlis"
        ],
        "reference": "https://www.moe.gov.my/jabatan-pendidikan-negeri-perlis",
        "states": [
            "perlis"
        ]
    },
    {
        "id": "education-jpnselangor",
        "category": "state-education",
        "name": "Jabatan Pendidikan Negeri Selangor",
        "url": "https://jpnselangor.moe.gov.my/",
        "keywords": [
            "jpnselangor",
            "jpn Selangor",
            "jabatan pendidikan Selangor"
        ],
        "reference": "https://www.moe.gov.my/jabatan-pendidikan-negeri-selangor",
        "states": [
            "selangor"
        ]
    },
    {
        "id": "education-jpnterengganu",
        "category": "state-education",
        "name": "Jabatan Pendidikan Negeri Terengganu",
        "url": "https://jpnterengganu.moe.gov.my/",
        "keywords": [
            "jpnterengganu",
            "jpn Terengganu",
            "jabatan pendidikan Terengganu"
        ],
        "reference": "https://www.moe.gov.my/jabatan-pendidikan-negeri-terengganu",
        "states": [
            "terengganu"
        ]
    },
    {
        "id": "education-jpnsabah",
        "category": "state-education",
        "name": "Jabatan Pendidikan Negeri Sabah",
        "url": "https://jpnsabah.moe.gov.my/",
        "keywords": [
            "jpnsabah",
            "jpn Sabah",
            "jabatan pendidikan Sabah"
        ],
        "reference": "https://www.moe.gov.my/jabatan-pendidikan-negeri-sabah",
        "states": [
            "sabah"
        ]
    },
    {
        "id": "education-jpnsarawak",
        "category": "state-education",
        "name": "Jabatan Pendidikan Negeri Sarawak",
        "url": "http://jpnsarawak.moe.gov.my/",
        "keywords": [
            "jpnsarawak",
            "jpn Sarawak",
            "jabatan pendidikan Sarawak"
        ],
        "reference": "https://www.moe.gov.my/jabatan-pendidikan-negeri-sarawak",
        "states": [
            "sarawak"
        ]
    },
    {
        "id": "education-jpwpkl",
        "category": "state-education",
        "name": "Jabatan Pendidikan Wilayah Persekutuan Kuala Lumpur",
        "url": "https://jpwpkl.moe.gov.my/",
        "keywords": [
            "jpwpkl",
            "jpn Kuala Lumpur",
            "jabatan pendidikan Kuala Lumpur"
        ],
        "reference": "https://www.moe.gov.my/jabatan-pendidikan-wp-kuala-lumpur",
        "states": [
            "kuala lumpur",
            "kl",
            "wpkl",
            "w p kuala lumpur"
        ]
    },
    {
        "id": "education-jpwpp",
        "category": "state-education",
        "name": "Jabatan Pendidikan Wilayah Persekutuan Putrajaya",
        "url": "https://jpwpp.moe.gov.my/",
        "keywords": [
            "jpwpp",
            "jpn Putrajaya",
            "jabatan pendidikan Putrajaya"
        ],
        "reference": "https://www.moe.gov.my/jabatan-pendidikan-wp-putrajaya",
        "states": [
            "putrajaya"
        ]
    },
    {
        "id": "education-jpwpl",
        "category": "state-education",
        "name": "Jabatan Pendidikan Wilayah Persekutuan Labuan",
        "url": "http://jpwpl.moe.gov.my/",
        "keywords": [
            "jpwpl",
            "jpn Labuan",
            "jabatan pendidikan Labuan"
        ],
        "reference": "https://www.moe.gov.my/jabatan-pendidikan-wilayah-persekutuan-labuan",
        "states": [
            "labuan"
        ]
    }
];
    const generalKeywords = [
    "penjawat awam",
    "perkhidmatan awam",
    "pegawai awam",
    "kakitangan kerajaan",
    "pegawai kerajaan",
    "pekeliling",
    "ceraian",
    "surat edaran",
    "perintah am",
    "cuti",
    "bercuti",
    "tatatertib",
    "kenaikan pangkat",
    "pemangkuan",
    "gred",
    "skim perkhidmatan",
    "waktu bekerja",
    "kerja lebih masa",
    "lebih masa",
    "elaun",
    "tuntutan",
    "lojing",
    "hotel",
    "perolehan",
    "perbendaharaan",
    "peruntukan",
    "pegawai pengawal",
    "waran",
    "jknt",
    "ketua jabatan",
    "dasar kerajaan",
    "prosedur kerajaan",
    "arahan perbendaharaan",
    "ldp",
    "latihan dalam perkhidmatan",
    "kursus",
    "jam kursus",
    "jam latihan",
    "jam berkursus",
    "lapor diri",
    "keperluan latihan",
    "kementerian",
    "ministry",
    "ministries",
    "jabatan pendidikan",
    "jpn",
    "civil servant",
    "public service",
    "government malaysia"
];

    function normalize(value) {
        return String(value || "").normalize("NFKC").toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
    }

    // Sempadan perkataan mengelakkan MOH padan dengan "mohon", SPA dengan "siapa".
    function hasKeyword(text, keyword) {
        const term = normalize(keyword);
        return term !== "" && (` ${normalize(text)} `).includes(` ${term} `);
    }

    const educationKeywords = ["pendidikan", "guru", "sekolah", "kpm", "moe", "jpn", "jpwp", "education", "egtukar", "splkpm"];
    const registrationKeywords = ["jabatan pendaftaran negara", "mykad", "kad pengenalan", "sijil kelahiran", "pendaftaran kelahiran", "kewarganegaraan"];
    function isRegistrationQuery(message) {
        return registrationKeywords.some(term => hasKeyword(message, term));
    }

    function findSources(message) {
        const text = normalize(message);
        const registration = isRegistrationQuery(text);
        const education = educationKeywords.some(term => hasKeyword(text, term));
        const listRequest = ["semua", "senarai", "all", "list"].some(term => hasKeyword(text, term));
        const ministryList = listRequest && ["kementerian", "ministries"].some(term => hasKeyword(text, term));
        const educationList = listRequest && (hasKeyword(text, "jabatan pendidikan") || hasKeyword(text, "jpn")) && !registration;
        let matched = sources.filter(source => {
            if (ministryList && (source.category === "ministry" || source.id === "jpm")) return true;
            if (source.category === "state-education") {
                if (registration && !hasKeyword(text, "jabatan pendidikan")) return false;
                if (educationList) return true;
                if (education && source.states.some(state => hasKeyword(text, state))) return true;
            }
            return [source.name, ...source.keywords].some(term => hasKeyword(text, term));
        });
        // Nama KPT mengandungi frasa "Kementerian Pendidikan", tetapi agensinya berbeza.
        if (!ministryList && matched.some(source => source.id === "mohe") &&
            !["kpm", "moe", "sekolah", "guru", "kementerian pendidikan malaysia"].some(term => hasKeyword(text, term))) {
            matched = matched.filter(source => source.id !== "moe");
        }
        return matched;
    }

    function isGovernmentQuery(message) {
        return generalKeywords.some(term => hasKeyword(message, term)) || findSources(message).length > 0;
    }

    function getSearchInstruction(message) {
        const matched = findSources(message);
        const links = matched.map(source => `- ${source.name}: ${source.url}${source.category === "state-education" ? ` (rujukan KPM: ${source.reference})` : ""}`).join("\n");
        const ambiguousJpn = hasKeyword(message, "jpn") && !isRegistrationQuery(message) &&
            !matched.some(source => source.category === "state-education") &&
            !["pendidikan", "guru", "sekolah", "kpm"].some(term => hasKeyword(message, term));
        return `
SUMBER AGENSI MENGIKUT SOALAN (direktori disemak ${reviewedAt}):
${links || "- Direktori agensi kerajaan: https://www.malaysia.gov.my/my/agency-directory"}

Skop Sarah meliputi urusan rasmi semua kementerian, Jabatan Digital Negara dan Jabatan Pendidikan Negeri/Wilayah; bukan terhad kepada KKM/JKNT.
Gunakan pautan ini sebagai titik mula carian Google Search. Cari halaman atau dokumen khusus agensi yang berkaitan, bukannya menganggap halaman utama membuktikan sesuatu peraturan.
Untuk JDN, semak dasar pendigitalan, kelulusan teknikal/Projek ICT dan JTISA serta perkhidmatan digital yang diminta. MAMPU ialah nama terdahulu; semak sumber semasa JDN.
Untuk pendidikan, bezakan KPM/JPN (sekolah), KPT (pendidikan tinggi), dan SPP (pelantikan pendidikan). Jika negeri diperlukan tetapi tidak dinyatakan, minta nama negeri; jangan anggap semua pengguna dari Terengganu.
${ambiguousJpn ? "Singkatan JPN tidak jelas: tanya sama ada Jabatan Pendidikan Negeri (dan negeri mana) atau Jabatan Pendaftaran Negara sebelum memilih agensi." : "Jangan kelirukan Jabatan Pendidikan Negeri dengan Jabatan Pendaftaran Negara (jpn.gov.my)."}
Untuk cuti, saraan dan tatatertib penjawat awam, semak juga JPA/MyPPSM. Untuk tuntutan dan perolehan, semak juga MOF/Perbendaharaan. Pekeliling agensi tidak semestinya terpakai kepada semua penjawat awam; semak bidang kuasa.
Nama/singkatan lama hanyalah kata kunci carian, bukan pengesahan nama atau struktur semasa kementerian.
Senarai direktori bukan bukti grounding. Kekalkan carian, semakan sumber rasmi, tarikh dan status kuat kuasa. Jangan cipta tajuk, URL dokumen atau nombor pekeliling. Jika pautan gagal, guna halaman agensi induk/rujukan direktori untuk mencari pautan semasa dan nyatakan had pengesahan.
`;
    }

    sources.forEach(source => {
        Object.freeze(source.keywords);
        if (source.states) Object.freeze(source.states);
        Object.freeze(source);
    });
    root.SarahGovernmentSources = Object.freeze({
        reviewedAt, sources: Object.freeze(sources), hasKeyword,
        findSources, isGovernmentQuery, getSearchInstruction
    });
})(globalThis);
