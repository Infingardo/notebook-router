const test = require("node:test");
const assert = require("node:assert/strict");
const REG = require("../registry.js");
const { route } = require("../router.js");

const nomi = (r) => r.notebook.map((n) => n.name).sort();
const base = { natura: "neoplastica", tipo: "entita", x: "X1", y: "" };

test("sede mancante → avviso, nessun set", () => {
  const r = route({ ...base, sede: "" }, REG);
  assert.deepEqual(r.notebook, []);
  assert.deepEqual(r.avvisi, [REG.testi_app.sede_mancante]);
});

test("Altro / non in elenco → avviso, nessun set", () => {
  const r = route({ ...base, sede: "Altro / non in elenco" }, REG);
  assert.deepEqual(r.notebook, []);
  assert.deepEqual(r.avvisi, [REG.testi_app.sede_non_mappata]);
});

test("sentinella senza primitivo → avviso, nessun set", () => {
  const r = route({ ...base, sede: "Linfonodo sentinella", primitivo: "" }, REG);
  assert.deepEqual(r.notebook, []);
  assert.deepEqual(r.avvisi, [REG.testi_app.sentinella_senza_primitivo]);
});

test("sentinella con primitivo mammella → MAMMELLA, non EMATOLOGIA", () => {
  const r = route({ ...base, sede: "Linfonodo sentinella", primitivo: "Mammella" }, REG);
  assert.deepEqual(nomi(r), ["IMMUNOISTOCHIMICA", "MAMMELLA", "ROSAI 2018"]);
  assert.ok(r.motivi[0].includes("primitivo: Mammella"));
});

test("mediastino tumorale → solo generalisti, niente Fletcher, avviso pre-WHO 5", () => {
  const r = route({ ...base, sede: "Mediastino e timo" }, REG);
  assert.deepEqual(nomi(r), ["IMMUNOISTOCHIMICA", "ROSAI 2018"]);
  assert.ok(r.avvisi.includes(REG.bigino_testi.avviso_pre_who5));
});

test("encefalo non neoplastico → Harrison, non Cervello", () => {
  const r = route({ ...base, sede: "Encefalo e midollo spinale", natura: "non_neoplastica" }, REG);
  assert.deepEqual(nomi(r), ["Harrison 22 ed. Principi di Medicina Interna", "IMMUNOISTOCHIMICA", "ROSAI 2018"]);
});

test("rene patologia medica non neoplastica → Harrison", () => {
  const r = route({ ...base, sede: "Rene: patologia medica", natura: "non_neoplastica", tipo: "clinico" }, REG);
  assert.deepEqual(nomi(r), ["Harrison 22 ed. Principi di Medicina Interna", "IMMUNOISTOCHIMICA", "ROSAI 2018"]);
});

test("TNM: refertazione su biopsia no, su pezzo operatorio sì", () => {
  const bio = route({ ...base, sede: "Prostata", tipo: "refertazione", campione: "biopsia" }, REG);
  assert.ok(!nomi(bio).includes("TNM - IX Edizione"));
  const pezzo = route({ ...base, sede: "Prostata", tipo: "refertazione", campione: "pezzo_operatorio" }, REG);
  assert.ok(nomi(pezzo).includes("TNM - IX Edizione"));
});

test("domanda: nomina i notebook proposti, poi modello compilato e suffisso", () => {
  const r = route({ ...base, sede: "Tiroide", tipo: "ddx", x: "NIFTP", y: "IEFVPTC" }, REG);
  assert.equal(
    r.domanda,
    'Usando SOLO i notebook "ORL", "ROSAI 2018" e "IMMUNOISTOCHIMICA" e sulla base delle loro fonti, ' +
      "descrivi le caratteristiche morfologiche, immunoistochimiche e molecolari che distinguono NIFTP da IEFVPTC. Parti dalla morfologia. " +
      REG.suffisso_domanda
  );
});

test("domanda: l'elenco dei notebook segue il set, compresi i condizionali", () => {
  const r = route({ ...base, sede: "Prostata", tipo: "refertazione", campione: "pezzo_operatorio", x: "adenocarcinoma" }, REG);
  assert.ok(
    r.domanda.startsWith(
      'Usando SOLO i notebook "UROPATOLOGIA", "PDTA prostata", "ROSAI 2018", "IMMUNOISTOCHIMICA" e "TNM - IX Edizione" e sulla base'
    ),
    r.domanda
  );
});

test("domanda: {NOTEBOOK} nel testo inserito dall'utente non viene sostituito", () => {
  const r = route({ ...base, sede: "Tiroide", tipo: "entita", x: "{NOTEBOOK}" }, REG);
  assert.ok(r.domanda.includes("relativi a: {NOTEBOOK}."), r.domanda);
});

test("domanda: segnaposti non compilati restano visibili", () => {
  const r = route({ ...base, sede: "Tiroide", tipo: "ddx", x: "", y: "" }, REG);
  assert.ok(r.domanda.includes("{X}") && r.domanda.includes("{Y}"));
});

test("condiviso: ORL condiviso, ROSAI privato", () => {
  const r = route({ ...base, sede: "Tiroide" }, REG);
  const per = Object.fromEntries(r.notebook.map((n) => [n.name, n.condiviso]));
  assert.equal(per["ORL"], true);
  assert.equal(per["ROSAI 2018"], false);
});

test("nessun duplicato: Harrison sia da 'nessun topico' sia da tipo clinico", () => {
  const r = route({ ...base, sede: "Polmone", natura: "non_neoplastica", tipo: "clinico" }, REG);
  const n = r.notebook.map((x) => x.name);
  assert.equal(n.length, new Set(n).size);
});

test("proprietà: ogni combinazione dà ≤ 2 topici e solo nomi esistenti", () => {
  const topici = new Set(REG.topici.map((t) => t.name));
  const esistenti = new Set([...REG.topici, ...REG.generalisti_always, ...REG.generalisti_conditional].map((n) => n.name));
  const primitivi = REG.sedi_menu.filter((v) => !v.speciale).map((v) => v.voce);
  for (const voce of REG.sedi_menu) {
    for (const natura of ["neoplastica", "non_neoplastica"]) {
      for (const tipo of REG.tipi_quesito) {
        for (const campione of [undefined, ...REG.campioni.map((c) => c.id)]) {
          for (const primitivo of voce.speciale === "sentinella" ? primitivi : [undefined]) {
            const r = route({ sede: voce.voce, primitivo, natura, tipo: tipo.id, campione, x: "a", y: "b" }, REG);
            const n = r.notebook.map((x) => x.name);
            assert.ok(n.filter((x) => topici.has(x)).length <= 2, voce.voce + " → " + n.join(", "));
            n.forEach((x) => assert.ok(esistenti.has(x), "nome inesistente: " + x));
            if (n.length > 0) {
              assert.ok(n.includes("ROSAI 2018"), voce.voce + ": manca ROSAI 2018 → " + n.join(", "));
              assert.ok(n.includes("IMMUNOISTOCHIMICA"), voce.voce + ": manca IMMUNOISTOCHIMICA → " + n.join(", "));
              assert.equal(n.length, new Set(n).size, voce.voce + ": duplicati → " + n.join(", "));
              assert.ok(r.domanda.length > 0, voce.voce + ": domanda vuota con notebook non vuoto");
            }
          }
        }
      }
    }
  }
});

test("natura mancante o non valida su Polmone → avviso, nessun set", () => {
  const assente = route({ sede: "Polmone", tipo: "entita", x: "a", y: "" }, REG);
  assert.deepEqual(assente.notebook, []);
  assert.deepEqual(assente.avvisi, [REG.testi_app.natura_mancante]);

  const typo = route({ sede: "Polmone", natura: "non-neoplastica", tipo: "entita", x: "a", y: "" }, REG);
  assert.deepEqual(typo.notebook, []);
  assert.deepEqual(typo.avvisi, [REG.testi_app.natura_mancante]);
});

test("sentinella: primitivo non idoneo → avviso; primitivo mammella con natura non neoplastica forzata a neoplastica", () => {
  const nonIdoneo = route({ ...base, sede: "Linfonodo sentinella", primitivo: "Linfonodo" }, REG);
  assert.deepEqual(nonIdoneo.notebook, []);
  assert.deepEqual(nonIdoneo.avvisi, [REG.testi_app.sentinella_senza_primitivo]);

  const forzata = route(
    { ...base, sede: "Linfonodo sentinella", primitivo: "Mammella", natura: "non_neoplastica" },
    REG
  );
  assert.deepEqual(nomi(forzata), ["IMMUNOISTOCHIMICA", "MAMMELLA", "ROSAI 2018"]);
});

test("tipo sconosciuto → set presente, domanda vuota, avviso tipo_mancante", () => {
  const r = route({ ...base, sede: "Tiroide", tipo: "non_esiste" }, REG);
  assert.ok(r.notebook.length > 0);
  assert.equal(r.domanda, "");
  assert.ok(r.avvisi.includes(REG.testi_app.tipo_mancante));
});

test("refertazione su Prostata senza campione → avviso campione_mancante, niente TNM, {campione} visibile", () => {
  const r = route({ ...base, sede: "Prostata", tipo: "refertazione", campione: "" }, REG);
  assert.ok(r.avvisi.includes(REG.testi_app.campione_mancante));
  assert.ok(!nomi(r).includes("TNM - IX Edizione"));
  assert.ok(r.domanda.includes("{campione}"));
});

test("Fletcher: Paratiroidi neoplastico → Fletcher 2021 + ROSAI + IIC e avviso pre-WHO 5", () => {
  const r = route({ ...base, sede: "Paratiroidi" }, REG);
  assert.deepEqual(nomi(r), ["Fletcher 2021", "IMMUNOISTOCHIMICA", "ROSAI 2018"]);
  assert.ok(r.avvisi.includes(REG.bigino_testi.avviso_pre_who5));
});

test("Rene: patologia medica neoplastico → solo ROSAI + IIC (senza_fletcher)", () => {
  const r = route({ ...base, sede: "Rene: patologia medica" }, REG);
  assert.deepEqual(nomi(r), ["IMMUNOISTOCHIMICA", "ROSAI 2018"]);
});

test("solo_neoplastico: Colecisti e vie biliari non neoplastico, refertazione su pezzo operatorio → niente TNM", () => {
  const r = route(
    { ...base, sede: "Colecisti e vie biliari", natura: "non_neoplastica", tipo: "refertazione", campione: "pezzo_operatorio" },
    REG
  );
  assert.ok(!nomi(r).includes("TNM - IX Edizione"));
  assert.ok(r.motivi.some((m) => m.includes("TNM - IX Edizione escluso: quesito non neoplastico")));
});

test("solo_neoplastico: Encefalo non neoplastico, stadiazione → niente TNM, Harrison presente", () => {
  const r = route(
    { ...base, sede: "Encefalo e midollo spinale", natura: "non_neoplastica", tipo: "stadiazione", campione: "pezzo_operatorio" },
    REG
  );
  assert.ok(!nomi(r).includes("TNM - IX Edizione"));
  assert.ok(nomi(r).includes("Harrison 22 ed. Principi di Medicina Interna"));
});

test("solo_neoplastico: casi neoplastici invariati (TNM su pezzo operatorio resta)", () => {
  const r = route({ ...base, sede: "Prostata", tipo: "refertazione", campione: "pezzo_operatorio" }, REG);
  assert.ok(nomi(r).includes("TNM - IX Edizione"));
});

test("avviso pre-WHO 5 assente quando esiste un topico (Tiroide)", () => {
  const r = route({ ...base, sede: "Tiroide" }, REG);
  assert.ok(!r.avvisi.includes(REG.bigino_testi.avviso_pre_who5));
});

test("{campione}: stadiazione su Mammella con pezzo_operatorio → domanda con label del campione", () => {
  const r = route({ ...base, sede: "Mammella", tipo: "stadiazione", campione: "pezzo_operatorio" }, REG);
  assert.ok(r.domanda.includes("(campione: pezzo operatorio)"));
});

test("compila: valore con caratteri speciali inserito letteralmente; solo spazi lascia il segnaposto", () => {
  const letterale = route({ ...base, sede: "Tiroide", tipo: "ddx", x: "A $& {Y}", y: "B" }, REG);
  assert.ok(letterale.domanda.includes("A $& {Y}"));

  const soloSpazi = route({ ...base, sede: "Tiroide", tipo: "ddx", x: "   ", y: "B" }, REG);
  assert.ok(soloSpazi.domanda.includes("{X}"));
});

test("purezza: route non modifica il registry", () => {
  const prima = JSON.stringify(REG);
  for (const voce of REG.sedi_menu) {
    for (const tipo of REG.tipi_quesito) {
      route({ sede: voce.voce, primitivo: "Mammella", natura: "neoplastica", tipo: tipo.id, campione: "biopsia", x: "a", y: "b" }, REG);
    }
  }
  assert.equal(JSON.stringify(REG), prima);
});

test("motivo con precedenza su Prostata usa il formato 'sede: <precedenza>', senza ripetere voce/topici", () => {
  const r = route({ ...base, sede: "Prostata" }, REG);
  const prostata = REG.sedi_menu.find((v) => v.voce === "Prostata");
  const occorrenze = r.motivi.filter((m) => m === "sede: " + prostata.precedenza).length;
  assert.equal(occorrenze, 1);
});

test("compila: x/y assenti o null non producono 'undefined'/'null', segnaposto resta visibile", () => {
  const assenti = route({ sede: "Tiroide", natura: "neoplastica", tipo: "ddx" }, REG);
  assert.ok(assenti.domanda.includes("{X}") && assenti.domanda.includes("{Y}"));
  assert.ok(!assenti.domanda.includes("undefined"));
  assert.ok(!assenti.domanda.includes("null"));

  const nullo = route({ sede: "Tiroide", natura: "neoplastica", tipo: "ddx", x: null, y: "B" }, REG);
  assert.ok(nullo.domanda.includes("{X}"));
  assert.ok(!nullo.domanda.includes("undefined"));
  assert.ok(!nullo.domanda.includes("null"));
});

test("elencoNotebook: uno, due, tre nomi", () => {
  const { elencoNotebook } = require("../router.js");
  assert.equal(elencoNotebook(["ORL"]), '"ORL"');
  assert.equal(elencoNotebook(["ORL", "ROSAI 2018"]), '"ORL" e "ROSAI 2018"');
  assert.equal(elencoNotebook(["A", "B", "C"]), '"A", "B" e "C"');
});
