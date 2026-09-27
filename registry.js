// FILE GENERATO da registry.yaml con `ruby genera.rb` — NON modificare a mano
const REGISTRY = {
  "topici": [
    {
      "name": "Cervello",
      "condiviso": false,
      "bigino": "tumori SNC, sellari e ipofisari (NON neuropatologia non neoplastica).",
      "sede": [
        "tumori SNC",
        "neuro-oncologia",
        "tumori encefalici e del midollo spinale",
        "glioma",
        "meningioma",
        "regione sellare",
        "ipofisi (PitNET/adenoma ipofisario)",
        "metastasi SNC"
      ],
      "nota": "solo neoplastico; neuropatologia non neoplastica NON coperta → nessun topico + Harrison"
    },
    {
      "name": "ORL",
      "condiviso": true,
      "bigino": "testa-collo, naso-seni, salivari (+ citologia Milano), TIROIDE.",
      "sede": [
        "testa-collo",
        "laringe",
        "faringe",
        "cavo orale",
        "rinofaringe",
        "orecchio",
        "tonsilla",
        "naso e seni paranasali",
        "ghiandole salivari",
        "parotide",
        "sottomandibolare",
        "palato",
        "citologia salivare",
        "tiroide",
        "NIFTP",
        "carcinoma papillare della tiroide",
        "tumori follicolari"
      ],
      "nota": "unico notebook ORL (salivari + generale uniti); include la patologia tiroidea"
    },
    {
      "name": "MAMMELLA",
      "condiviso": false,
      "bigino": "incluso linfonodo sentinella mammario.",
      "sede": [
        "mammella",
        "seno",
        "mammella maschile",
        "linfonodo sentinella mammario"
      ]
    },
    {
      "name": "TESSUTI MOLLI",
      "condiviso": false,
      "bigino": "sarcomi, GIST, tumori vascolari dei tessuti molli.",
      "sede": [
        "tessuti molli",
        "sarcomi",
        "GIST",
        "tumori lipomatosi",
        "tumori fibroblastici",
        "tumori dei nervi periferici",
        "tumori vascolari dei tessuti molli"
      ]
    },
    {
      "name": "GASTROINTESTINALE",
      "condiviso": false,
      "bigino": "tubo digerente (anche IBD, gastriti, celiachia, danno iatrogeno, linfomi GI), fegato (anche neoplastico e trapianto), vie biliari, pancreas (anche NET).",
      "sede": [
        "gastrointestinale",
        "stomaco",
        "colon",
        "esofago",
        "intestino",
        "duodeno",
        "fegato",
        "epatite",
        "epatite autoimmune",
        "fegato neoplastico",
        "HCC",
        "trapianto epatico",
        "vie biliari",
        "colangite",
        "pancreas",
        "tumori neuroendocrini del pancreas",
        "citologia pancreatobiliare",
        "linfomi gastrointestinali",
        "Barrett",
        "gastrite",
        "IBD",
        "colite",
        "celiachia",
        "atrofia dei villi",
        "enterocolite iatrogena",
        "colite da farmaci",
        "CAR-T",
        "checkpoint inhibitors"
      ],
      "nota": "include 'Fegato non neoplastico' (confluito qui)"
    },
    {
      "name": "DERMATOPATOLOGIA",
      "condiviso": false,
      "bigino": "cute infiammatoria e tumorale, melanoma, sentinella del melanoma.",
      "sede": [
        "cute",
        "pelle",
        "melanoma",
        "nevo",
        "dermatosi infiammatorie",
        "annessi cutanei",
        "linfonodo sentinella del melanoma"
      ]
    },
    {
      "name": "UROPATOLOGIA",
      "condiviso": false,
      "bigino": "rene (tumori), vescica, uraco, prostata, testicolo, pene, citologia urinaria (NON biopsia renale medica).",
      "sede": [
        "rene (tumori)",
        "vescica",
        "urotelio",
        "testicolo",
        "pene",
        "uraco",
        "prostata",
        "citologia urinaria"
      ]
    },
    {
      "name": "PDTA prostata",
      "condiviso": false,
      "bigino": "percorso locale, sempre in coppia con UROPATOLOGIA.",
      "sede": [
        "prostata"
      ]
    },
    {
      "name": "POLMONE",
      "condiviso": false,
      "bigino": "tumori polmonari, pleura e mesotelioma (NON polmone non neoplastico, NON mediastino).",
      "sede": [
        "polmone (tumori)",
        "pleura",
        "mesotelioma"
      ]
    },
    {
      "name": "OFTALMOLOGIA",
      "condiviso": false,
      "bigino": "occhio, congiuntiva, palpebra, ghiandola lacrimale, orbita.",
      "sede": [
        "occhio",
        "retina",
        "uvea",
        "melanoma uveale",
        "congiuntiva",
        "palpebra",
        "ghiandola lacrimale",
        "orbita"
      ]
    },
    {
      "name": "VASCOLARE",
      "condiviso": false,
      "bigino": "arteriti/arterite a cellule giganti + anomalie vascolari ISSVA.",
      "sede": [
        "vasculite",
        "arterite",
        "arterite a cellule giganti",
        "arterite temporale",
        "anomalie vascolari",
        "malformazioni vascolari",
        "ISSVA",
        "tumori vascolari"
      ]
    },
    {
      "name": "EMATOLOGIA",
      "condiviso": true,
      "bigino": "linfonodo, midollo (anche non neoplastico: aplasia, HLH), milza, sangue, istiocitosi, mastocitosi.",
      "sede": [
        "linfonodo",
        "midollo osseo",
        "milza",
        "sangue",
        "linfoadenite",
        "mastocitosi",
        "istiocitosi",
        "aplasia midollare",
        "HLH"
      ],
      "nota": "ematopatologia — asse topografico (STEP 0) prima dei marcatori"
    }
  ],
  "generalisti_always": [
    {
      "name": "ROSAI 2018",
      "condiviso": false,
      "nota": "capitoli Rosai 1-45 (mancano 9 e 20) + protocolli di refertazione interni. Pre-WHO 5ª ed."
    },
    {
      "name": "IMMUNOISTOCHIMICA",
      "condiviso": true,
      "tranne_tipi": [
        "entita"
      ],
      "nota": "escluso per la singola entità (27 set 2026): ridondante con topico + ROSAI, sulla NIFTP nessuna fonte pertinente. Resta per DDx e pannelli (unico con la disponibilità degli anticorpi in sede)."
    }
  ],
  "generalisti_conditional": [
    {
      "name": "Fletcher 2021",
      "condiviso": false,
      "trigger": "neoplastico_senza_topico",
      "bigino": "quesito su un TUMORE la cui sede non ha topico (trattato generale dei tumori per organo)."
    },
    {
      "name": "NGS al FBF",
      "condiviso": true,
      "solo_neoplastico": true,
      "tipi": [
        "test_sede"
      ],
      "bigino": "solo test eseguibili in sede: \"quale test molecolare posso fare/richiedere\" (anche terapia target, o grading SNC quando serve sapere quali test si fanno in sede). NON per la biologia molecolare dell'entità. La biologia molecolare dell'entità sta nel topico e in ROSAI.",
      "pannello": "Diatech v1.5: SNV 48 geni (es. BRAF, NRAS, HRAS, KIT, PDGFRA, EGFR, IDH1/2, TERT, GNAQ/GNA11); fusioni 12 (ALK, ROS1, RET, NTRK1-3, MET, FGFR1-3, NRG1, PPARG); CNV 3 (EGFR, ERBB2, MET); MSI. NON: 1p/19q, +7/-10, delezione CDKN2A/B, KIAA1549-BRAF, MDM2 (dedotto), metilazione MLH1, TMB, DPYD."
    },
    {
      "name": "TNM - IX Edizione",
      "condiviso": true,
      "solo_neoplastico": true,
      "tipi": [
        "stadiazione",
        "refertazione:pezzo_operatorio"
      ],
      "bigino": "stadiazione/pTNM/margini (qualsiasi campione), o refertazione di un tumore su pezzo operatorio; NON per la refertazione su biopsia."
    },
    {
      "name": "PDL-1",
      "condiviso": false,
      "solo_neoplastico": true,
      "tipi": [
        "pdl1"
      ],
      "bigino": "predittivo/immunoterapia (CPS/TPS)."
    },
    {
      "name": "Marker e Radiomica nelle neoplasie",
      "condiviso": true,
      "solo_neoplastico": true,
      "tipi": [
        "radiomica"
      ],
      "bigino": "SOLO radiomica/imaging (non biomarcatori istologici)."
    },
    {
      "name": "Histological Atlas of Human Tissues",
      "condiviso": false,
      "tipi": [
        "istologia"
      ],
      "bigino": "solo se citato esplicitamente (istologia normale)."
    },
    {
      "name": "AI e Anatomia Patologica",
      "condiviso": false,
      "tipi": [
        "ai"
      ],
      "bigino": "solo se citato esplicitamente."
    },
    {
      "name": "Harrison 22 ed. Principi di Medicina Interna",
      "condiviso": true,
      "tipi": [
        "clinico"
      ],
      "trigger": "medico_senza_topico",
      "bigino": "correlazione clinica esplicita (anche \"significato nel quadro sistemico\"), OPPURE quesito medico (non neoplastico) la cui sede non ha topico."
    }
  ],
  "sedi_menu": [
    {
      "gruppo": "Testa-collo e tiroide",
      "voce": "Ghiandole salivari",
      "topici": [
        "ORL"
      ]
    },
    {
      "gruppo": "Testa-collo e tiroide",
      "voce": "Cavo orale, orofaringe, tonsilla",
      "topici": [
        "ORL"
      ]
    },
    {
      "gruppo": "Testa-collo e tiroide",
      "voce": "Laringe e faringe",
      "topici": [
        "ORL"
      ]
    },
    {
      "gruppo": "Testa-collo e tiroide",
      "voce": "Naso e seni paranasali",
      "topici": [
        "ORL"
      ]
    },
    {
      "gruppo": "Testa-collo e tiroide",
      "voce": "Orecchio",
      "topici": [
        "ORL"
      ]
    },
    {
      "gruppo": "Testa-collo e tiroide",
      "voce": "Tiroide",
      "topici": [
        "ORL"
      ]
    },
    {
      "gruppo": "Testa-collo e tiroide",
      "voce": "Paratiroidi",
      "topici": [

      ]
    },
    {
      "gruppo": "Occhio",
      "voce": "Occhio e annessi oculari",
      "topici": [
        "OFTALMOLOGIA"
      ]
    },
    {
      "gruppo": "Occhio",
      "voce": "Melanoma oculare (uveale, congiuntivale)",
      "topici": [
        "OFTALMOLOGIA"
      ],
      "precedenza": "melanoma uveale/congiuntivale → OFTALMOLOGIA, non DERMATOPATOLOGIA"
    },
    {
      "gruppo": "Sistema nervoso",
      "voce": "Encefalo e midollo spinale",
      "topici": [
        "Cervello"
      ],
      "topici_non_neoplastico": [

      ]
    },
    {
      "gruppo": "Sistema nervoso",
      "voce": "Regione sellare e ipofisi",
      "topici": [
        "Cervello"
      ],
      "topici_non_neoplastico": [

      ]
    },
    {
      "gruppo": "Torace",
      "voce": "Polmone",
      "topici": [
        "POLMONE"
      ],
      "topici_non_neoplastico": [

      ]
    },
    {
      "gruppo": "Torace",
      "voce": "Pleura e mesotelioma",
      "topici": [
        "POLMONE"
      ],
      "topici_non_neoplastico": [

      ]
    },
    {
      "gruppo": "Torace",
      "voce": "Mediastino e timo",
      "topici": [

      ],
      "senza_fletcher": true,
      "nota": "nessun topico: solo i generalisti SEMPRE (unica fonte di sede: ROSAI cap. 12), anche se tumore (Fletcher 2021 non ha il capitolo); se non neoplastico → Harrison."
    },
    {
      "gruppo": "Mammella",
      "voce": "Mammella",
      "topici": [
        "MAMMELLA"
      ]
    },
    {
      "gruppo": "Apparato digerente",
      "voce": "Tubo digerente (esofago, stomaco, intestino, colon)",
      "topici": [
        "GASTROINTESTINALE"
      ]
    },
    {
      "gruppo": "Apparato digerente",
      "voce": "Fegato",
      "topici": [
        "GASTROINTESTINALE"
      ]
    },
    {
      "gruppo": "Apparato digerente",
      "voce": "Colecisti e vie biliari",
      "topici": [
        "GASTROINTESTINALE"
      ]
    },
    {
      "gruppo": "Apparato digerente",
      "voce": "Pancreas (anche NET)",
      "topici": [
        "GASTROINTESTINALE"
      ],
      "precedenza": "pancreas, incluso tumore neuroendocrino → GASTROINTESTINALE"
    },
    {
      "gruppo": "Urogenitale",
      "voce": "Rene: tumore",
      "topici": [
        "UROPATOLOGIA"
      ]
    },
    {
      "gruppo": "Urogenitale",
      "voce": "Rene: patologia medica",
      "topici": [

      ],
      "senza_fletcher": true,
      "nota": "biopsia renale medica: nessun topico (UROPATOLOGIA è solo oncologica); se non neoplastica → Harrison; per una vasculite usa la voce 'Vasculite o arterite'.",
      "non_primitivo": true
    },
    {
      "gruppo": "Urogenitale",
      "voce": "Vescica, vie urinarie, uraco",
      "topici": [
        "UROPATOLOGIA"
      ],
      "topici_non_neoplastico": [

      ]
    },
    {
      "gruppo": "Urogenitale",
      "voce": "Prostata",
      "topici": [
        "UROPATOLOGIA",
        "PDTA prostata"
      ],
      "topici_non_neoplastico": [

      ],
      "precedenza": "prostata → UROPATOLOGIA + PDTA prostata (sempre in coppia; conta come un solo topico)"
    },
    {
      "gruppo": "Urogenitale",
      "voce": "Testicolo e pene",
      "topici": [
        "UROPATOLOGIA"
      ],
      "topici_non_neoplastico": [

      ]
    },
    {
      "gruppo": "Urogenitale",
      "voce": "Citologia urinaria",
      "topici": [
        "UROPATOLOGIA"
      ],
      "non_primitivo": true
    },
    {
      "gruppo": "Ginecologia",
      "voce": "Ginecologia (utero, cervice, ovaio, tube, vulva, vagina, placenta)",
      "topici": [

      ]
    },
    {
      "gruppo": "Cute",
      "voce": "Cute",
      "topici": [
        "DERMATOPATOLOGIA"
      ]
    },
    {
      "gruppo": "Tessuti molli e vasi",
      "voce": "Tessuti molli",
      "topici": [
        "TESSUTI MOLLI"
      ]
    },
    {
      "gruppo": "Tessuti molli e vasi",
      "voce": "GIST",
      "topici": [
        "TESSUTI MOLLI",
        "GASTROINTESTINALE"
      ],
      "precedenza": "GIST → top-2: TESSUTI MOLLI (cap. 17) + GASTROINTESTINALE"
    },
    {
      "gruppo": "Tessuti molli e vasi",
      "voce": "Tumore vascolare",
      "topici": [
        "TESSUTI MOLLI",
        "VASCOLARE"
      ],
      "precedenza": "tumore vascolare → top-2: TESSUTI MOLLI + VASCOLARE"
    },
    {
      "gruppo": "Tessuti molli e vasi",
      "voce": "Anomalia o malformazione vascolare",
      "topici": [
        "VASCOLARE"
      ]
    },
    {
      "gruppo": "Tessuti molli e vasi",
      "voce": "Vasculite o arterite (qualsiasi sede)",
      "topici": [
        "VASCOLARE"
      ],
      "precedenza": "vasculite/arterite → VASCOLARE (anche in organo, es. biopsia renale, arteria temporale)",
      "non_primitivo": true
    },
    {
      "gruppo": "Tessuti molli e vasi",
      "voce": "Retroperitoneo",
      "topici": [
        "TESSUTI MOLLI"
      ],
      "topici_non_neoplastico": [

      ]
    },
    {
      "gruppo": "Tessuti molli e vasi",
      "voce": "Muscolo e nervo periferico (biopsia)",
      "topici": [
        "TESSUTI MOLLI"
      ],
      "topici_non_neoplastico": [

      ]
    },
    {
      "gruppo": "Osso",
      "voce": "Osso e articolazioni",
      "topici": [

      ]
    },
    {
      "gruppo": "Sistema emolinfopoietico",
      "voce": "Linfonodo",
      "topici": [
        "EMATOLOGIA"
      ],
      "non_primitivo": true
    },
    {
      "gruppo": "Sistema emolinfopoietico",
      "voce": "Midollo osseo",
      "topici": [
        "EMATOLOGIA"
      ],
      "non_primitivo": true
    },
    {
      "gruppo": "Sistema emolinfopoietico",
      "voce": "Milza",
      "topici": [
        "EMATOLOGIA"
      ],
      "non_primitivo": true
    },
    {
      "gruppo": "Sistema emolinfopoietico",
      "voce": "Sangue periferico",
      "topici": [
        "EMATOLOGIA"
      ],
      "non_primitivo": true
    },
    {
      "gruppo": "Sistema emolinfopoietico",
      "voce": "Linfoma extranodale (qualsiasi organo)",
      "topici": [
        "EMATOLOGIA"
      ],
      "precedenza": "linfoma in sede extranodale → EMATOLOGIA (asse topografico prima dei marcatori; indicare l'organo nella domanda)",
      "non_primitivo": true
    },
    {
      "gruppo": "Altre sedi senza topico",
      "voce": "Surrene",
      "topici": [

      ]
    },
    {
      "gruppo": "Altre sedi senza topico",
      "voce": "Peritoneo",
      "topici": [

      ]
    },
    {
      "gruppo": "Altre sedi senza topico",
      "voce": "Cuore e pericardio",
      "topici": [

      ]
    },
    {
      "gruppo": "Altre sedi senza topico",
      "voce": "Citologia dei versamenti",
      "topici": [

      ],
      "non_primitivo": true
    },
    {
      "gruppo": "Casi speciali",
      "voce": "Linfonodo sentinella",
      "speciale": "sentinella",
      "precedenza": "linfonodo sentinella → topico della sede del primitivo (es. MAMMELLA, DERMATOPATOLOGIA, ORL), non EMATOLOGIA; primitivo non indicato → chiedere"
    },
    {
      "gruppo": "Casi speciali",
      "voce": "Altro / non in elenco",
      "speciale": "altro"
    }
  ],
  "tipi_quesito": [
    {
      "id": "ddx",
      "label": "Diagnosi differenziale",
      "modello": "descrivi le caratteristiche morfologiche, immunoistochimiche e molecolari che distinguono {X} da {Y}. Parti dalla morfologia."
    },
    {
      "id": "entita",
      "label": "Singola entità",
      "modello": "descrivi i criteri morfologici, immunoistochimici e molecolari relativi a: {X}. Parti dalla morfologia."
    },
    {
      "id": "test_sede",
      "label": "Test molecolare in sede",
      "modello": "quali alterazioni molecolari rilevanti per: {X} sono coperte dal pannello in uso in sede e quali richiedono un test a parte?"
    },
    {
      "id": "stadiazione",
      "label": "Stadiazione pTNM / margini",
      "campione": true,
      "modello": "elenca le regole pTNM e i parametri di stadiazione e dei margini per: {X} (campione: {campione})."
    },
    {
      "id": "refertazione",
      "label": "Refertazione",
      "campione": true,
      "modello": "elenca i parametri da riportare nel referto per: {X} (campione: {campione})."
    },
    {
      "id": "pdl1",
      "label": "Predittivo PD-L1",
      "modello": "descrivi score, cut-off e anticorpi/cloni per PD-L1 in: {X}."
    },
    {
      "id": "radiomica",
      "label": "Radiomica / imaging",
      "modello": "descrivi il ruolo della radiomica per: {X}."
    },
    {
      "id": "clinico",
      "label": "Significato clinico-sistemico",
      "modello": "descrivi il significato clinico-sistemico del reperto: {X}."
    },
    {
      "id": "istologia",
      "label": "Istologia normale",
      "modello": "descrivi l'istologia normale relativa a: {X}."
    },
    {
      "id": "ai",
      "label": "AI in anatomia patologica",
      "modello": "descrivi le applicazioni di intelligenza artificiale in anatomia patologica relative a: {X}."
    }
  ],
  "campioni": [
    {
      "id": "biopsia",
      "label": "biopsia"
    },
    {
      "id": "pezzo_operatorio",
      "label": "pezzo operatorio"
    }
  ],
  "prefisso_domanda": "Usando SOLO i notebook {NOTEBOOK} e sulla base delle loro fonti, ",
  "suffisso_domanda": "Per ogni affermazione indica la fonte; se un punto non è nelle fonti, dillo.",
  "testi_app": {
    "sede_mancante": "Scegli una sede.",
    "sede_non_mappata": "Sede non mappata: chiedi, non inferire. Nessun set proposto.",
    "sentinella_senza_primitivo": "Linfonodo sentinella: indica la sede del tumore primitivo.",
    "natura_mancante": "Indica la natura del quesito (neoplastica o non neoplastica).",
    "tipo_mancante": "Scegli il tipo di quesito.",
    "campione_mancante": "Indica il campione (biopsia o pezzo operatorio)."
  },
  "bigino_testi": {
    "titolo": "BIGINO ROUTING — da incollare in qualsiasi Claude (uso ospedale, modalità recommender)",
    "intro": "Sei il mio \"router\" per NotebookLM/Gemini. Ti do un quesito di patologia; tu NON esegui nulla:\nmi restituisci (a) quali notebook attaccare in Gemini e (b) come formulare la domanda.\nPoi attacco e invio io a mano. Solo materiale ANONIMO/di studio — mai dati di paziente.\n",
    "sede": "SEDE/organo → 1 notebook TOPICO (2 se ambiguo, segnalando \"ambiguo\"); mai più di 2.",
    "copertura": "Copertura letta dalle FONTI dei notebook, non dal nome. Se la copertura è dubbia, chiedi, non inferire.",
    "nessun_topico": "Nessun topico per la sede → dillo, non forzare il topico più vicino.",
    "avviso_pre_who5": "Fletcher 2021 e ROSAI 2018 precedono la WHO 5ª ed. → verificare nosologia e classificazioni molecolari.",
    "conflitti": "Se più precedenze insieme portano a più di 2 topici → mostra i candidati e chiedi.",
    "output": "> Notebook da attaccare: {TOPICO} + ROSAI 2018 + IMMUNOISTOCHIMICA (non per la singola entità) [+ condizionali]\n> Motivo: <sede → topico; trigger → condizionali>\n> Domanda da incollare: \"<vedi regola sotto>\"\n",
    "fraseggio_intro": "NON usare \"Diagnosi differenziale tra… / dammi la diagnosi\" → Gemini rifiuta\n(\"Sono solo un modello linguistico…\"). Formula SEMPRE in chiave descrittiva, adattando al tipo di quesito\n({NOTEBOOK} = elenco dei notebook proposti, tra virgolette; tienili comunque attaccati dal \"+\"):\n",
    "note_operative": [
      "In Gemini: + → Altri caricamenti → Notebooks → seleziona → Aggiungi → digita → invia.",
      "Gemini può consultare i notebook da solo, ma la scelta è incostante (26 set 2026: gastrite corretta, tiroide senza ORL) e nominarli nel prompt non basta. Attaccali sempre dal \"+\" e controlla quali notebook cita la risposta.",
      "La pagina Notebook di Gemini (gemini.google.com/notebooks/view) NON mostra i notebook condivisi; il selettore \"+\" sì. Non è un problema di accesso.",
      "Il grounding è lento (~30-90s, \"Analisi in corso…\"): attendi.",
      "Se dopo 2–4 minuti la chat torna vuota senza risposta, reinvia: è un errore intermittente di Gemini, non un problema del set.",
      "I notebook \"privati\" sono usabili solo dal proprietario; i colleghi possono attaccare solo quelli condivisi via link."
    ],
    "note_solo_bigino": [
      "Mostra sempre il set proposto prima, così controllo la sede (unico errore che conta)."
    ]
  }
};
if (typeof module !== "undefined") module.exports = REGISTRY;
