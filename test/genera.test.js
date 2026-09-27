const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const GENERA = path.join(__dirname, "..", "genera.rb");
const FIXTURE = fs.readFileSync(path.join(__dirname, "fixtures", "registry-minimo.yaml"), "utf8");

const dirsCreati = [];

test.after(() => {
  for (const dir of dirsCreati) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function esegui(yaml, extra = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "genera-"));
  dirsCreati.push(dir);
  const reg = path.join(dir, "registry.yaml");
  fs.writeFileSync(reg, yaml);
  const r = spawnSync("ruby", [GENERA, "--registry", reg, "--out", dir, ...extra], { encoding: "utf8" });
  return { dir, status: r.status, stderr: r.stderr, stdout: r.stdout };
}

function conModifica(da, a) {
  assert.ok(FIXTURE.includes(da), "fixture: testo da sostituire non trovato: " + da);
  return FIXTURE.replace(da, a);
}

test("registry valido: scrive BIGINO e registry.js", () => {
  const r = esegui(FIXTURE);
  assert.equal(r.status, 0, r.stderr);
  const bigino = fs.readFileSync(path.join(r.dir, "BIGINO-routing-portatile.md"), "utf8");
  assert.match(bigino, /FILE GENERATO/);
  assert.match(bigino, /alfa e beta → top-2/);
  assert.match(bigino, /- DDx: "Sulla base delle fonti, distingui \{X\} da \{Y\}\."/);
  assert.match(bigino, /- Tumore → \+ FLE \(tumori in sedi senza topico: Vuota\)\./);
  assert.match(
    bigino,
    /- Quesito non neoplastico senza topico → \+ HAR \(anche queste sedi, se il quesito non è neoplastico: Beta medica\); testo clinico: la morfologia resta ai generalisti SEMPRE\./
  );
  assert.match(bigino, /- Vuota senza fle → solo generalisti\./);
  const REG = require(path.join(r.dir, "registry.js"));
  assert.equal(REG.sedi_menu.length, 7);
});

test("--check: allineato → 0, file modificato → 1", () => {
  const r = esegui(FIXTURE);
  const reg = path.join(r.dir, "registry.yaml");
  const ok = spawnSync("ruby", [GENERA, "--check", "--registry", reg, "--out", r.dir], { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stderr);
  fs.appendFileSync(path.join(r.dir, "registry.js"), "// modifica a mano\n");
  const ko = spawnSync("ruby", [GENERA, "--check", "--registry", reg, "--out", r.dir], { encoding: "utf8" });
  assert.equal(ko.status, 1);
  assert.match(ko.stderr, /registry\.js/);
});

test("--check: registry.js mancante → errore 1", () => {
  const r = esegui(FIXTURE);
  fs.unlinkSync(path.join(r.dir, "registry.js"));
  const ko = spawnSync("ruby", [GENERA, "--check", "--registry", path.join(r.dir, "registry.yaml"), "--out", r.dir], {
    encoding: "utf8",
  });
  assert.equal(ko.status, 1);
});

test("flag sconosciuto --chek → errore 2", () => {
  const r = esegui(FIXTURE, ["--chek"]);
  assert.equal(r.status, 2);
});

test("YAML non valido → errore 2 (mai crash con 1)", () => {
  const r = esegui('topici: [{name: "A", condiviso: true\n');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /registry:/);
});

test("voce con più di 2 topici → errore 2", () => {
  const r = esegui(conModifica("topici: [ALFA, BETA], precedenza", "topici: [ALFA, BETA, ALFA], precedenza"));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /più di 2 topici/);
});

test("topico inesistente → errore 2", () => {
  const r = esegui(conModifica('voce: "Alfa", topici: [ALFA]}', 'voce: "Alfa", topici: [GAMMA]}'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /topico inesistente 'GAMMA'/);
});

test("tipo di quesito senza modello → errore 2", () => {
  const r = esegui(conModifica('{id: ddx, label: "DDx", modello: "distingui {X} da {Y}."}', '{id: ddx, label: "DDx"}'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /tipo ddx: manca 'modello'/);
});

test("notebook senza 'condiviso' → errore 2", () => {
  const r = esegui(conModifica('{name: "GEN", condiviso: false}', '{name: "GEN"}'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /GEN: manca 'condiviso'/);
});

test("generalista con tipo inesistente → errore 2", () => {
  const r = esegui(conModifica("tipi: [clinico]", "tipi: [inesistente]"));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /tipo inesistente 'inesistente'/);
});

test("generalista con campione inesistente → errore 2", () => {
  const r = esegui(conModifica('tipi: [stadiazione, "refertazione:pezzo"]', 'tipi: [stadiazione, "refertazione:vetrino"]'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /campione inesistente 'vetrino'/);
});

test("tipo senza 'campione: true' usato con un campione → errore 2", () => {
  const r = esegui(
    conModifica('tipi: [stadiazione, "refertazione:pezzo"]', 'tipi: [stadiazione, "refertazione:pezzo", "ddx:pezzo"]')
  );
  assert.equal(r.status, 2);
  assert.match(r.stderr, /non prevede un campione/);
});

test("sezione mancante (campioni) → errore 2", () => {
  const r = esegui(
    conModifica(
      'campioni:\n  - {id: biopsia, label: "biopsia"}\n  - {id: pezzo, label: "pezzo operatorio"}\n',
      ""
    )
  );
  assert.equal(r.status, 2);
  assert.match(r.stderr, /manca la sezione 'campioni'/);
});

test("speciale sconosciuto → errore 2", () => {
  const r = esegui(conModifica("speciale: sentinella}", "speciale: sconosciuto}"));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /speciale sconosciuto/);
});

test("voce duplicata → errore 2", () => {
  const r = esegui(conModifica('voce: "Beta medica"', 'voce: "Alfa"'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /voce duplicata/);
});

test("topico duplicato → errore 2", () => {
  const r = esegui(
    conModifica(
      '{name: "BETA", condiviso: false, bigino: "copre beta.", sede: [beta]}',
      '{name: "ALFA", condiviso: false, bigino: "copre beta.", sede: [beta]}'
    )
  );
  assert.equal(r.status, 2);
  assert.match(r.stderr, /topico duplicato: ALFA/);
});

test("senza_fletcher senza nota → errore 2", () => {
  const r = esegui(
    conModifica(
      '{gruppo: "G2", voce: "Vuota senza fle", topici: [], senza_fletcher: true, nota: "solo generalisti."}',
      '{gruppo: "G2", voce: "Vuota senza fle", topici: [], senza_fletcher: true}'
    )
  );
  assert.equal(r.status, 2);
  assert.match(r.stderr, /senza_fletcher richiede 'nota'/);
});

test("topici come scalare invece di lista → errore 2", () => {
  const r = esegui(conModifica('voce: "Alfa", topici: [ALFA]}', 'voce: "Alfa", topici: ALFA}'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /lista di stringhe/);
});

test("voce senza 'gruppo' → errore 2", () => {
  const r = esegui(conModifica('{gruppo: "G1", voce: "Alfa", topici: [ALFA]}', '{voce: "Alfa", topici: [ALFA]}'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Alfa: manca 'gruppo'/);
});

test("tipo di quesito senza 'label' → errore 2", () => {
  const r = esegui(conModifica('{id: ddx, label: "DDx", modello: "distingui {X} da {Y}."}', '{id: ddx, modello: "distingui {X} da {Y}."}'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /tipo ddx: manca 'label'/);
});

test("campione senza 'label' → errore 2", () => {
  const r = esegui(conModifica('{id: biopsia, label: "biopsia"}', "{id: biopsia}"));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /campione biopsia: manca 'label'/);
});

test("tipo con campione: true ma senza '{campione}' nel modello → errore 2", () => {
  const r = esegui(
    conModifica(
      '{id: stadiazione, label: "Stadiazione", campione: true, modello: "stadia {X} su {campione}."}',
      '{id: stadiazione, label: "Stadiazione", campione: true, modello: "stadia {X}."}'
    )
  );
  assert.equal(r.status, 2);
  assert.match(r.stderr, /deve contenere '\{campione\}'/);
});

test("tipo senza campione: true ma con '{campione}' nel modello → errore 2", () => {
  const r = esegui(
    conModifica(
      '{id: ddx, label: "DDx", modello: "distingui {X} da {Y}."}',
      '{id: ddx, label: "DDx", modello: "distingui {X} da {Y} su {campione}."}'
    )
  );
  assert.equal(r.status, 2);
  assert.match(r.stderr, /senza campione: true/);
});

test("nome notebook duplicato tra categorie diverse → errore 2", () => {
  const r = esegui(conModifica('{name: "GEN", condiviso: false}', '{name: "ALFA", condiviso: false}'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /nome notebook duplicato: ALFA/);
});

test("senza_fletcher con 'topici' non vuoto → errore 2", () => {
  const r = esegui(
    conModifica(
      '{gruppo: "G2", voce: "Vuota senza fle", topici: [], senza_fletcher: true, nota: "solo generalisti."}',
      '{gruppo: "G2", voce: "Vuota senza fle", topici: [ALFA], senza_fletcher: true, nota: "solo generalisti."}'
    )
  );
  assert.equal(r.status, 2);
  assert.match(r.stderr, /senza_fletcher richiede 'topici' vuoto/);
});

test("testi_app: manca una chiave richiesta → errore 2 con messaggio dedicato, per ciascuna chiave", () => {
  const richieste = {
    sede_mancante: "Scegli una sede.",
    sede_non_mappata: "Non mappata.",
    sentinella_senza_primitivo: "Indica il primitivo.",
    natura_mancante: "Indica la natura.",
    tipo_mancante: "Scegli il tipo.",
    campione_mancante: "Indica il campione.",
  };
  const originale =
    'testi_app: {sede_mancante: "Scegli una sede.", sede_non_mappata: "Non mappata.", ' +
    'sentinella_senza_primitivo: "Indica il primitivo.", natura_mancante: "Indica la natura.", ' +
    'tipo_mancante: "Scegli il tipo.", campione_mancante: "Indica il campione."}';
  for (const chiave of Object.keys(richieste)) {
    const coppie = Object.entries(richieste)
      .filter(([k]) => k !== chiave)
      .map(([k, v]) => `${k}: "${v}"`)
      .join(", ");
    const yaml = conModifica(originale, `testi_app: {${coppie}}`);
    const r = esegui(yaml);
    assert.equal(r.status, 2, "chiave mancante: " + chiave);
    assert.match(r.stderr, new RegExp("testi_app: manca '" + chiave + "'"), "chiave mancante: " + chiave);
  }
});

test("testi_app: valore non stringa per una chiave richiesta → errore 2", () => {
  const r = esegui(conModifica('sentinella_senza_primitivo: "Indica il primitivo."', "sentinella_senza_primitivo: 42"));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /testi_app: manca 'sentinella_senza_primitivo'/);
});

test("non_primitivo non booleano → errore 2", () => {
  const r = esegui(
    conModifica('{gruppo: "G1", voce: "Alfa", topici: [ALFA]}', '{gruppo: "G1", voce: "Alfa", topici: [ALFA], non_primitivo: "si"}')
  );
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Alfa: non_primitivo deve essere true\/false/);
});

test("solo_neoplastico non booleano → errore 2", () => {
  const r = esegui(
    conModifica(
      '{name: "STA", condiviso: true, tipi: [stadiazione, "refertazione:pezzo"], bigino: "stadiazione."}',
      '{name: "STA", condiviso: true, tipi: [stadiazione, "refertazione:pezzo"], bigino: "stadiazione.", solo_neoplastico: "si"}'
    )
  );
  assert.equal(r.status, 2);
  assert.match(r.stderr, /STA: solo_neoplastico deve essere true\/false/);
});

test("solo_neoplastico booleano (true o false) → registry valido", () => {
  const conTrue = esegui(
    conModifica(
      '{name: "STA", condiviso: true, tipi: [stadiazione, "refertazione:pezzo"], bigino: "stadiazione."}',
      '{name: "STA", condiviso: true, tipi: [stadiazione, "refertazione:pezzo"], bigino: "stadiazione.", solo_neoplastico: true}'
    )
  );
  assert.equal(conTrue.status, 0, conTrue.stderr);
  const conFalse = esegui(
    conModifica(
      '{name: "STA", condiviso: true, tipi: [stadiazione, "refertazione:pezzo"], bigino: "stadiazione."}',
      '{name: "STA", condiviso: true, tipi: [stadiazione, "refertazione:pezzo"], bigino: "stadiazione.", solo_neoplastico: false}'
    )
  );
  assert.equal(conFalse.status, 0, conFalse.stderr);
});

test("note_solo_bigino: opzionale, reso subito dopo note_operative nel BIGINO", () => {
  const r = esegui(conModifica('note_operative: ["n1"]', 'note_operative: ["n1"]\n  note_solo_bigino: ["n2"]'));
  assert.equal(r.status, 0, r.stderr);
  const bigino = fs.readFileSync(path.join(r.dir, "BIGINO-routing-portatile.md"), "utf8");
  assert.match(bigino, /- n1\n- n2/);
});

test("note_solo_bigino non lista di stringhe → errore 2", () => {
  const r = esegui(conModifica('note_operative: ["n1"]', 'note_operative: ["n1"]\n  note_solo_bigino: "x"'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /note_solo_bigino deve essere una lista di stringhe/);
});

test("non_primitivo booleano (true o false) → registry valido", () => {
  const conTrue = esegui(
    conModifica('{gruppo: "G1", voce: "Alfa", topici: [ALFA]}', '{gruppo: "G1", voce: "Alfa", topici: [ALFA], non_primitivo: true}')
  );
  assert.equal(conTrue.status, 0, conTrue.stderr);
  const conFalse = esegui(
    conModifica('{gruppo: "G1", voce: "Alfa", topici: [ALFA]}', '{gruppo: "G1", voce: "Alfa", topici: [ALFA], non_primitivo: false}')
  );
  assert.equal(conFalse.status, 0, conFalse.stderr);
});

test("tranne_tipi con tipo inesistente → errore 2", () => {
  const r = esegui(conModifica('{name: "GEN", condiviso: false}', '{name: "GEN", condiviso: false, tranne_tipi: [inesistente]}'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /GEN: tranne_tipi: tipo inesistente 'inesistente'/);
});

test("tranne_tipi valido → BIGINO riporta l'eccezione", () => {
  const r = esegui(conModifica('{name: "GEN", condiviso: false}', '{name: "GEN", condiviso: false, tranne_tipi: [clinico]}'));
  assert.equal(r.status, 0, r.stderr);
  const bigino = fs.readFileSync(path.join(r.dir, "BIGINO-routing-portatile.md"), "utf8");
  assert.match(bigino, /- SEMPRE: GEN \(tranne tipo: Clinico\)\./);
});
