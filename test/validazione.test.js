const test = require("node:test");
const assert = require("node:assert/strict");
const REG = require("../registry.js");
const { route } = require("../router.js");

const R = "ROSAI 2018", I = "IMMUNOISTOCHIMICA", TNM = "TNM - IX Edizione", NGS = "NGS al FBF";
const HAR = "Harrison 22 ed. Principi di Medicina Interna", FLE = "Fletcher 2021";

// [id, descrizione, input, set atteso]
const CASI = [
  ["#1", "sialoadenite necrotizzante", { sede: "Ghiandole salivari", natura: "non_neoplastica", tipo: "entita" }, ["ORL", R]],
  ["#2", "adenoma pleomorfo vs ca ex AP", { sede: "Ghiandole salivari", tipo: "ddx" }, ["ORL", R, I]],
  ["#3", "laringe: grading e fronte (eccezione confermata: stadiazione)", { sede: "Laringe e faringe", tipo: "stadiazione", campione: "pezzo_operatorio" }, ["ORL", R, I, TNM]],
  ["#4", "GBM: alterazioni da cercare", { sede: "Encefalo e midollo spinale", tipo: "test_sede" }, ["Cervello", R, I, NGS]],
  ["#5", "meningioma: grading (test in sede)", { sede: "Encefalo e midollo spinale", tipo: "test_sede" }, ["Cervello", R, I, NGS]],
  ["#6", "HER2 e recettori", { sede: "Mammella", tipo: "entita" }, ["MAMMELLA", R]],
  ["#7", "mammella pTNM e margini", { sede: "Mammella", tipo: "stadiazione", campione: "pezzo_operatorio" }, ["MAMMELLA", R, I, TNM]],
  ["#8", "sarcoma pleomorfo DDx", { sede: "Tessuti molli", tipo: "ddx" }, ["TESSUTI MOLLI", R, I]],
  ["#9", "lipoma vs LPS ben differenziato", { sede: "Tessuti molli", tipo: "ddx" }, ["TESSUTI MOLLI", R, I]],
  ["#10", "colon pTNM", { sede: "Tubo digerente (esofago, stomaco, intestino, colon)", tipo: "stadiazione", campione: "pezzo_operatorio" }, ["GASTROINTESTINALE", R, I, TNM]],
  ["#11", "GIST: KIT/PDGFRA", { sede: "GIST", tipo: "test_sede" }, ["TESSUTI MOLLI", "GASTROINTESTINALE", R, I, NGS]],
  ["#12", "melanoma vs Spitz (biologia)", { sede: "Cute", tipo: "ddx" }, ["DERMATOPATOLOGIA", R, I]],
  ["#13a", "prostata: Gleason su biopsia", { sede: "Prostata", tipo: "refertazione", campione: "biopsia" }, ["UROPATOLOGIA", "PDTA prostata", R, I]],
  ["#13b", "prostata: prostatectomia", { sede: "Prostata", tipo: "refertazione", campione: "pezzo_operatorio" }, ["UROPATOLOGIA", "PDTA prostata", R, I, TNM]],
  ["#14", "urotelio pT", { sede: "Vescica, vie urinarie, uraco", tipo: "stadiazione", campione: "pezzo_operatorio" }, ["UROPATOLOGIA", R, I, TNM]],
  ["#15", "polmone PD-L1", { sede: "Polmone", tipo: "pdl1" }, ["POLMONE", R, I, "PDL-1"]],
  ["#16", "polmone EGFR/ALK", { sede: "Polmone", tipo: "test_sede" }, ["POLMONE", R, I, NGS]],
  ["#17", "melanoma uveale prognosi", { sede: "Melanoma oculare (uveale, congiuntivale)", tipo: "entita" }, ["OFTALMOLOGIA", R]],
  ["#18", "angiosarcoma vs emangioma", { sede: "Tumore vascolare", tipo: "ddx" }, ["TESSUTI MOLLI", "VASCOLARE", R, I]],
  ["#19", "epatite autoimmune", { sede: "Fegato", natura: "non_neoplastica", tipo: "entita" }, ["GASTROINTESTINALE", R]],
  ["#20", "linfoma di Hodgkin", { sede: "Linfonodo", tipo: "entita" }, ["EMATOLOGIA", R]],
  ["#21", "fascite nodulare vs sarcoma", { sede: "Tessuti molli", tipo: "ddx" }, ["TESSUTI MOLLI", R, I]],
  ["#22", "vasculite renale nel quadro sistemico", { sede: "Vasculite o arterite (qualsiasi sede)", natura: "non_neoplastica", tipo: "clinico" }, ["VASCOLARE", R, I, HAR]],
  ["reale-tiroide", "NIFTP vs IEFVPTC", { sede: "Tiroide", tipo: "ddx" }, ["ORL", R, I]],
  ["reale-endometrio", "endometrioide G3 vs sieroso", { sede: "Ginecologia (utero, cervice, ovaio, tube, vulva, vagina, placenta)", tipo: "ddx" }, [FLE, R, I]],
  ["reale-parotide", "AciCC vs secretorio (oggi senza NGS)", { sede: "Ghiandole salivari", tipo: "ddx" }, ["ORL", R, I]],
];

for (const [id, descr, parziale, atteso] of CASI) {
  test(id + " " + descr, () => {
    const input = { natura: "neoplastica", x: "X", y: "Y", ...parziale };
    const r = route(input, REG);
    assert.deepEqual(r.notebook.map((n) => n.name).sort(), [...atteso].sort(), r.motivi.join(" | "));
  });
}

test("endometrio: avviso pre-WHO 5", () => {
  const r = route({ sede: "Ginecologia (utero, cervice, ovaio, tube, vulva, vagina, placenta)", natura: "neoplastica", tipo: "ddx", x: "a", y: "b" }, REG);
  assert.ok(r.avvisi.includes(REG.bigino_testi.avviso_pre_who5));
});
