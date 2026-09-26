# App web del notebook-router — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** pagina statica su GitHub Pages che, da menu (sede, natura, tipo di quesito), propone i notebook NotebookLM da attaccare e la domanda da incollare, con le stesse regole del BIGINO.

**Architecture:** `registry.yaml` resta l'unica fonte di verità. `genera.rb` lo valida e produce `BIGINO-routing-portatile.md` e `registry.js`. `router.js` contiene il motore (funzione pura `route`), usato sia da `index.html` sia dai test Node. Un hook di pre-commit rigenera/controlla e lancia i test sulla versione in staging.

**Tech Stack:** Ruby 2.6 (libreria standard: yaml, json) — NIENTE sintassi Ruby ≥ 2.7 (no `tally`, no `def x = …`); JavaScript senza dipendenze; Node 24 `node:test`; GitHub Pages; `gh` CLI.

Spec: `docs/superpowers/specs/2026-09-26-app-router-design.md`.

---

## Mappa dei file

| File | Stato | Responsabilità |
|---|---|---|
| `genera.rb` | nuovo (sostituisce `genera_bigino.rb`) | valida il registry; scrive/controlla BIGINO e `registry.js` |
| `registry.yaml` | riscritto | dati: topici, generalisti, `sedi_menu`, `tipi_quesito`, `campioni`, testi |
| `registry.js` | generato | `const REGISTRY = {...}` per browser e Node |
| `BIGINO-routing-portatile.md` | generato | prompt portatile |
| `router.js` | nuovo | motore `route(input, registry)` |
| `index.html` | nuovo | interfaccia |
| `test/fixtures/registry-minimo.yaml` | nuovo | registry minimo per i test del generatore |
| `test/genera.test.js` | nuovo | test del generatore (validazione, `--check`) |
| `test/router.test.js` | nuovo | casi limite e proprietà del motore |
| `test/validazione.test.js` | nuovo | casi di `validazione.md` come test |
| `.githooks/pre-commit` | riscritto | `genera.rb --check` + `node --test` sulla versione in staging |
| `README.md`, `.nojekyll` | nuovi | pubblicazione |
| `router.md`, `validazione.md` | ritoccati | rimandi a `genera.rb` e ai test |

Convenzioni: codice di uscita di `genera.rb` = 0 ok, 1 file generati non allineati (`--check`), 2 registry non valido.

---

### Task 1: Generatore `genera.rb` con validazione (TDD su registry minimo)

**Files:**
- Create: `test/fixtures/registry-minimo.yaml`
- Create: `test/genera.test.js`
- Create: `genera.rb`

- [ ] **Step 1: Scrivi il registry minimo di test**

`test/fixtures/registry-minimo.yaml`:

```yaml
topici:
  - {name: "ALFA", condiviso: true, bigino: "copre alfa.", sede: [alfa]}
  - {name: "BETA", condiviso: false, bigino: "copre beta.", sede: [beta]}
generalisti_always:
  - {name: "GEN", condiviso: false}
generalisti_conditional:
  - {name: "FLE", condiviso: false, trigger: neoplastico_senza_topico, bigino: "tumori senza topico."}
  - {name: "HAR", condiviso: true, trigger: medico_senza_topico, tipi: [clinico], bigino: "clinico."}
  - {name: "STA", condiviso: true, tipi: [stadiazione, "refertazione:pezzo"], bigino: "stadiazione."}
sedi_menu:
  - {gruppo: "G1", voce: "Alfa", topici: [ALFA]}
  - {gruppo: "G1", voce: "Alfa e beta", topici: [ALFA, BETA], precedenza: "alfa e beta → top-2"}
  - {gruppo: "G2", voce: "Vuota", topici: []}
  - {gruppo: "G2", voce: "Sentinella", speciale: sentinella}
  - {gruppo: "G2", voce: "Altro", speciale: altro}
tipi_quesito:
  - {id: ddx, label: "DDx", modello: "distingui {X} da {Y}."}
  - {id: clinico, label: "Clinico", modello: "significato di {X}."}
  - {id: stadiazione, label: "Stadiazione", campione: true, modello: "stadia {X} su {campione}."}
  - {id: refertazione, label: "Refertazione", campione: true, modello: "referta {X} su {campione}."}
campioni:
  - {id: biopsia, label: "biopsia"}
  - {id: pezzo, label: "pezzo operatorio"}
prefisso_domanda: "Sulla base delle fonti, "
suffisso_domanda: "Cita le fonti."
testi_app: {sede_mancante: "Scegli una sede.", sede_non_mappata: "Non mappata.", sentinella_senza_primitivo: "Indica il primitivo."}
bigino_testi:
  titolo: "T"
  intro: "I"
  sede: "S"
  copertura: "C"
  nessun_topico: "N"
  avviso_pre_who5: "W"
  conflitti: "K"
  output: "O"
  fraseggio_intro: "F"
  note_operative: ["n1"]
```

- [ ] **Step 2: Scrivi i test del generatore**

`test/genera.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const GENERA = path.join(__dirname, "..", "genera.rb");
const FIXTURE = fs.readFileSync(path.join(__dirname, "fixtures", "registry-minimo.yaml"), "utf8");

function esegui(yaml, extra = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "genera-"));
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
  const REG = require(path.join(r.dir, "registry.js"));
  assert.equal(REG.sedi_menu.length, 5);
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
  const r = esegui(conModifica('tipi: [stadiazione, "refertazione:pezzo"]', 'tipi: [stadiazione, "refertazione:vetrino"]'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /campione inesistente 'vetrino'/);
});
```

- [ ] **Step 3: Esegui i test e verifica che falliscano**

Run: `node --test test/genera.test.js`
Expected: FAIL (ruby: `genera.rb` non esiste).

- [ ] **Step 4: Scrivi `genera.rb`**

```ruby
# Genera BIGINO-routing-portatile.md e registry.js da registry.yaml (unica fonte di verità).
# Uso: ruby genera.rb [--check] [--registry PATH] [--out DIR]
#   senza --check: valida il registry e scrive i due file
#   --check:       valida e esce con 1 se i file in --out non sono allineati
# Uscita: 0 ok, 1 file non allineati, 2 registry non valido.
require "yaml"
require "json"

def arg(nome, default)
  i = ARGV.index(nome)
  i ? ARGV[i + 1] : default
end

REGISTRY = arg("--registry", File.join(__dir__, "registry.yaml"))
OUT = arg("--out", __dir__)
BIGINO = File.join(OUT, "BIGINO-routing-portatile.md")
JS = File.join(OUT, "registry.js")
CHIAVI = %w[topici generalisti_always generalisti_conditional sedi_menu tipi_quesito campioni
            prefisso_domanda suffisso_domanda testi_app bigino_testi].freeze

def valida(r)
  mancanti = CHIAVI.reject { |k| r.key?(k) }
  return mancanti.map { |k| "manca la sezione '#{k}'" } unless mancanti.empty?

  e = []
  topici = r["topici"].map { |t| t["name"] }
  notebook = r["topici"] + r["generalisti_always"] + r["generalisti_conditional"]
  notebook.each do |n|
    e << "#{n['name']}: manca 'condiviso' (true/false)" unless [true, false].include?(n["condiviso"])
  end
  (r["topici"] + r["generalisti_conditional"]).each do |n|
    e << "#{n['name']}: manca 'bigino'" unless n["bigino"].is_a?(String)
  end
  r["sedi_menu"].map { |v| v["voce"] }.group_by { |v| v }.each do |voce, gruppo|
    e << "voce duplicata: #{voce}" if gruppo.size > 1
  end
  r["sedi_menu"].each do |v|
    if v["speciale"]
      e << "#{v['voce']}: speciale sconosciuto '#{v['speciale']}'" unless %w[sentinella altro].include?(v["speciale"])
      next
    end
    e << "#{v['voce']}: manca 'topici'" unless v.key?("topici")
    %w[topici topici_non_neoplastico].each do |k|
      next unless v.key?(k)
      lista = Array(v[k])
      e << "#{v['voce']}: #{k} ha più di 2 topici" if lista.size > 2
      lista.each { |t| e << "#{v['voce']}: topico inesistente '#{t}'" unless topici.include?(t) }
    end
  end
  ids = r["tipi_quesito"].map { |t| t["id"] }
  r["tipi_quesito"].each { |t| e << "tipo #{t['id']}: manca 'modello'" unless t["modello"].is_a?(String) }
  campioni = r["campioni"].map { |c| c["id"] }
  r["generalisti_conditional"].each do |g|
    tipi = Array(g["tipi"])
    e << "#{g['name']}: nessun 'tipi' né 'trigger'" if tipi.empty? && !g["trigger"]
    tipi.each do |t|
      tipo, campione = t.split(":", 2)
      e << "#{g['name']}: tipo inesistente '#{tipo}'" unless ids.include?(tipo)
      e << "#{g['name']}: campione inesistente '#{campione}'" if campione && !campioni.include?(campione)
    end
  end
  %w[neoplastico_senza_topico medico_senza_topico].each do |tr|
    n = r["generalisti_conditional"].count { |g| Array(g["trigger"]).include?(tr) }
    e << "serve esattamente un generalista con trigger #{tr} (trovati #{n})" unless n == 1
  end
  e
end

def per_trigger(r, tr)
  r["generalisti_conditional"].find { |g| Array(g["trigger"]).include?(tr) }["name"]
end

def render_bigino(r)
  t = r["bigino_testi"]
  fletcher = per_trigger(r, "neoplastico_senza_topico")
  harrison = per_trigger(r, "medico_senza_topico")
  voci = r["sedi_menu"].reject { |v| v["speciale"] }
  senza_topico = voci.select { |v| Array(v["topici"]).empty? && !v["senza_fletcher"] }.map { |v| v["voce"] }
  medici = voci.select { |v| v.key?("topici_non_neoplastico") && Array(v["topici_non_neoplastico"]).empty? }
               .map { |v| v["voce"] }
  out = []
  out << "<!-- FILE GENERATO da registry.yaml con `ruby genera.rb` — NON modificare a mano -->"
  out << "# #{t['titolo']}" << ""
  out << t["intro"].rstrip << ""
  out << "## Logica a due assi"
  out << "1. #{t['sede']}"
  out << "2. TIPO QUESITO → generalisti:"
  out << "   - SEMPRE: #{r['generalisti_always'].map { |g| g['name'] }.join(' + ')}."
  out << "   - CONDIZIONALI (solo se scatta il trigger):"
  r["generalisti_conditional"].each { |g| out << "     - #{g['name']} → #{g['bigino']}" }
  out << ""
  out << "## Notebook TOPICI (nomi esatti come in NotebookLM)"
  out << t["copertura"]
  r["topici"].each { |g| out << "- #{g['name']}: #{g['bigino']}" }
  out << ""
  out << "## Precedenze"
  r["sedi_menu"].each { |v| out << "- #{v['precedenza']}" if v["precedenza"] }
  out << "- #{t['conflitti']}"
  out << ""
  out << "## Nessun topico"
  out << t["nessun_topico"]
  out << "- Tumore → + #{fletcher}" + (senza_topico.empty? ? "." : " (sedi senza topico: #{senza_topico.join(', ')}).")
  out << "- Quesito non neoplastico senza topico → + #{harrison}" +
         (medici.empty? ? "" : " (anche, se non neoplastici: #{medici.join(', ')})") +
         "; testo clinico: la morfologia resta ai generalisti SEMPRE."
  voci.select { |v| v["senza_fletcher"] }.each { |v| out << "- #{v['voce']}: #{v['nota']}" }
  out << "- #{t['avviso_pre_who5']}"
  out << ""
  out << "## Output che voglio da te"
  out << t["output"].rstrip << ""
  out << "## REGOLA DI FRASEGGIO (critica — Gemini rifiuta i quesiti \"diagnostici\")"
  out << t["fraseggio_intro"].rstrip
  r["tipi_quesito"].each { |q| out << "- #{q['label']}: \"#{r['prefisso_domanda']}#{q['modello']}\"" }
  out << "Aggiungi sempre: \"#{r['suffisso_domanda']}\"" << ""
  out << "## Note operative"
  t["note_operative"].each { |n| out << "- #{n}" }
  out.join("\n") + "\n"
end

def render_js(r)
  "// FILE GENERATO da registry.yaml con `ruby genera.rb` — NON modificare a mano\n" \
    "const REGISTRY = #{JSON.pretty_generate(r)};\n" \
    "if (typeof module !== \"undefined\") module.exports = REGISTRY;\n"
end

r = YAML.load(File.read(REGISTRY, encoding: "UTF-8"))
errori = valida(r)
unless errori.empty?
  errori.each { |e| warn "registry: #{e}" }
  exit 2
end

file = { BIGINO => render_bigino(r), JS => render_js(r) }
if ARGV.include?("--check")
  diversi = file.reject { |p, testo| File.exist?(p) && File.read(p, encoding: "UTF-8") == testo }.keys
  if diversi.empty?
    puts "File generati allineati al registry."
  else
    warn "NON allineati: #{diversi.map { |p| File.basename(p) }.join(', ')} — esegui `ruby genera.rb`."
    exit 1
  end
else
  file.each { |p, testo| File.write(p, testo) }
  puts "Scritti #{file.keys.map { |p| File.basename(p) }.join(' e ')}."
end
```

- [ ] **Step 5: Esegui i test e verifica che passino**

Run: `node --test test/genera.test.js`
Expected: 7 test, tutti PASS.

- [ ] **Step 6: Commit** (il vecchio hook controlla ancora `genera_bigino.rb` sul registry non modificato: passa)

```bash
git add genera.rb test/genera.test.js test/fixtures/registry-minimo.yaml
git commit -m "genera.rb: validazione del registry e generazione di BIGINO e registry.js (con test)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Nuova struttura di `registry.yaml`, file generati, hook

**Files:**
- Modify (riscrittura completa): `registry.yaml`
- Delete: `genera_bigino.rb`
- Modify: `.githooks/pre-commit`
- Modify: `router.md` (intestazione)
- Generate: `BIGINO-routing-portatile.md`, `registry.js`

Nota dati: `condiviso` riflette l'audit NotebookLM del 26 set 2026 (condivisi via link: ORL, EMATOLOGIA, IMMUNOISTOCHIMICA, NGS al FBF, TNM - IX Edizione, Marker e Radiomica nelle neoplasie, Harrison 22 ed.; PDL-1 e Fletcher 2021 resi privati dall'utente). La riscrittura rimuove anche i commenti con i nomi dei notebook amministrativi/personali (pulizia pre-pubblicazione della spec).

- [ ] **Step 1: Riscrivi `registry.yaml` con questo contenuto completo**

```yaml
# FONTE DI VERITÀ. BIGINO-routing-portatile.md e registry.js si rigenerano con `ruby genera.rb`
# (non modificarli a mano). Nomi ESATTI dei notebook come in NotebookLM (audit 26 set 2026).
# Le coperture ("sede") sono ricavate dall'elenco FONTI di ogni notebook, non dal nome.
# condiviso: true = condiviso via link (usabile anche da colleghi); false = privato.
# Esclusi dal routing: i notebook non diagnostici (amministrativi, personali, strumenti).

topici:
  - name: "Cervello"
    condiviso: false
    bigino: "tumori SNC, sellari e ipofisari (NON neuropatologia non neoplastica)."
    sede: [tumori SNC, neuro-oncologia, tumori encefalici e del midollo spinale, glioma, meningioma,
           regione sellare, ipofisi (PitNET/adenoma ipofisario), metastasi SNC]
    nota: "solo neoplastico; neuropatologia non neoplastica NON coperta → nessun topico + Harrison"
  - name: "ORL"
    condiviso: true
    bigino: "testa-collo, naso-seni, salivari (+ citologia Milano), TIROIDE."
    sede: [testa-collo, laringe, faringe, cavo orale, rinofaringe, orecchio, tonsilla,
           naso e seni paranasali, ghiandole salivari, parotide, sottomandibolare, palato,
           citologia salivare, tiroide, NIFTP, carcinoma papillare della tiroide, tumori follicolari]
    nota: "unico notebook ORL (salivari + generale uniti); include la patologia tiroidea"
  - name: "MAMMELLA"
    condiviso: false
    bigino: "incluso linfonodo sentinella mammario."
    sede: [mammella, seno, mammella maschile, linfonodo sentinella mammario]
  - name: "TESSUTI MOLLI"
    condiviso: false
    bigino: "sarcomi, GIST, tumori vascolari dei tessuti molli."
    sede: [tessuti molli, sarcomi, GIST, tumori lipomatosi, tumori fibroblastici,
           tumori dei nervi periferici, tumori vascolari dei tessuti molli]
  - name: "GASTROINTESTINALE"
    condiviso: false
    bigino: "tubo digerente (anche IBD, gastriti, celiachia, danno iatrogeno, linfomi GI), fegato (anche neoplastico e trapianto), vie biliari, pancreas (anche NET)."
    sede: [gastrointestinale, stomaco, colon, esofago, intestino, duodeno,
           fegato, epatite, epatite autoimmune, fegato neoplastico, HCC, trapianto epatico,
           vie biliari, colangite, pancreas, tumori neuroendocrini del pancreas,
           citologia pancreatobiliare, linfomi gastrointestinali, Barrett, gastrite, IBD,
           colite, celiachia, atrofia dei villi, enterocolite iatrogena, colite da farmaci]
    nota: "include 'Fegato non neoplastico' (confluito qui)"
  - name: "DERMATOPATOLOGIA"
    condiviso: false
    bigino: "cute infiammatoria e tumorale, melanoma, sentinella del melanoma."
    sede: [cute, pelle, melanoma, nevo, dermatosi infiammatorie, annessi cutanei,
           linfonodo sentinella del melanoma]
  - name: "UROPATOLOGIA"
    condiviso: false
    bigino: "rene (tumori), vescica, uraco, prostata, testicolo, pene, citologia urinaria (NON biopsia renale medica)."
    sede: [rene (tumori), vescica, urotelio, testicolo, pene, uraco, prostata, citologia urinaria]
  - name: "PDTA prostata"
    condiviso: false
    bigino: "percorso locale, sempre in coppia con UROPATOLOGIA."
    sede: [prostata]
  - name: "POLMONE"
    condiviso: false
    bigino: "tumori polmonari, pleura e mesotelioma (NON polmone non neoplastico, NON mediastino)."
    sede: [polmone (tumori), pleura, mesotelioma]
  - name: "OFTALMOLOGIA"
    condiviso: false
    bigino: "occhio, congiuntiva, palpebra, ghiandola lacrimale, orbita."
    sede: [occhio, retina, uvea, melanoma uveale, congiuntiva, palpebra, ghiandola lacrimale, orbita]
  - name: "VASCOLARE"
    condiviso: false
    bigino: "arteriti/arterite a cellule giganti + anomalie vascolari ISSVA."
    sede: [vasculite, arterite, arterite a cellule giganti, arterite temporale,
           anomalie vascolari, malformazioni vascolari, ISSVA, tumori vascolari]
  - name: "EMATOLOGIA"
    condiviso: true
    bigino: "linfonodo, midollo (anche non neoplastico: aplasia, HLH), milza, sangue, istiocitosi, mastocitosi."
    sede: [linfonodo, midollo osseo, milza, sangue, linfoadenite, mastocitosi, istiocitosi,
           aplasia midollare, HLH]
    nota: "ematopatologia — asse topografico (STEP 0) prima dei marcatori"

generalisti_always:
  - name: "ROSAI 2018"
    condiviso: false
    nota: "capitoli Rosai 1-45 (mancano 9 e 20) + protocolli di refertazione interni. Pre-WHO 5ª ed."
  - name: "IMMUNOISTOCHIMICA"
    condiviso: true

generalisti_conditional:
  - name: "Fletcher 2021"
    condiviso: false
    trigger: neoplastico_senza_topico
    bigino: "quesito su un TUMORE la cui sede non ha topico (trattato generale dei tumori per organo)."
  - name: "NGS al FBF"
    condiviso: true
    tipi: [test_sede]
    bigino: "solo test eseguibili in sede: \"quale test molecolare posso fare/richiedere\" (anche terapia target, o grading SNC quando serve sapere quali test si fanno in sede). NON per la biologia molecolare dell'entità."
    pannello: "Diatech v1.5: SNV 48 geni (es. BRAF, NRAS, HRAS, KIT, PDGFRA, EGFR, IDH1/2, TERT, GNAQ/GNA11); fusioni 12 (ALK, ROS1, RET, NTRK1-3, MET, FGFR1-3, NRG1, PPARG); CNV 3 (EGFR, ERBB2, MET); MSI. NON: 1p/19q, +7/-10, delezione CDKN2A/B, KIAA1549-BRAF, MDM2 (dedotto), metilazione MLH1, TMB, DPYD."
  - name: "TNM - IX Edizione"
    condiviso: true
    tipi: [stadiazione, "refertazione:pezzo_operatorio"]
    bigino: "stadiazione/pTNM/margini, o tumore su pezzo operatorio refertato; NON su biopsia."
  - name: "PDL-1"
    condiviso: false
    tipi: [pdl1]
    bigino: "predittivo/immunoterapia (CPS/TPS)."
  - name: "Marker e Radiomica nelle neoplasie"
    condiviso: true
    tipi: [radiomica]
    bigino: "SOLO radiomica/imaging (non biomarcatori istologici)."
  - name: "Histological Atlas of Human Tissues"
    condiviso: false
    tipi: [istologia]
    bigino: "solo se citato esplicitamente (istologia normale)."
  - name: "AI e Anatomia Patologica"
    condiviso: false
    tipi: [ai]
    bigino: "solo se citato esplicitamente."
  - name: "Harrison 22 ed. Principi di Medicina Interna"
    condiviso: true
    tipi: [clinico]
    trigger: medico_senza_topico
    bigino: "correlazione clinica esplicita (anche \"significato nel quadro sistemico\"), OPPURE quesito medico (non neoplastico) la cui sede non ha topico."

sedi_menu:
  - {gruppo: "Testa-collo e tiroide", voce: "Ghiandole salivari", topici: [ORL]}
  - {gruppo: "Testa-collo e tiroide", voce: "Cavo orale, orofaringe, tonsilla", topici: [ORL]}
  - {gruppo: "Testa-collo e tiroide", voce: "Laringe e faringe", topici: [ORL]}
  - {gruppo: "Testa-collo e tiroide", voce: "Naso e seni paranasali", topici: [ORL]}
  - {gruppo: "Testa-collo e tiroide", voce: "Orecchio", topici: [ORL]}
  - {gruppo: "Testa-collo e tiroide", voce: "Tiroide", topici: [ORL]}
  - {gruppo: "Testa-collo e tiroide", voce: "Paratiroidi", topici: []}
  - {gruppo: "Occhio", voce: "Occhio e annessi oculari", topici: [OFTALMOLOGIA]}
  - {gruppo: "Occhio", voce: "Melanoma oculare (uveale, congiuntivale)", topici: [OFTALMOLOGIA], precedenza: "melanoma uveale/congiuntivale → OFTALMOLOGIA, non DERMATOPATOLOGIA"}
  - {gruppo: "Sistema nervoso", voce: "Encefalo e midollo spinale", topici: [Cervello], topici_non_neoplastico: []}
  - {gruppo: "Sistema nervoso", voce: "Regione sellare e ipofisi", topici: [Cervello], topici_non_neoplastico: []}
  - {gruppo: "Torace", voce: "Polmone", topici: [POLMONE], topici_non_neoplastico: []}
  - {gruppo: "Torace", voce: "Pleura e mesotelioma", topici: [POLMONE]}
  - {gruppo: "Torace", voce: "Mediastino e timo", topici: [], senza_fletcher: true, nota: "nessun topico: solo i generalisti SEMPRE (unica fonte di sede: ROSAI cap. 12), anche se tumore; Fletcher 2021 non ha il capitolo."}
  - {gruppo: "Mammella", voce: "Mammella", topici: [MAMMELLA]}
  - {gruppo: "Apparato digerente", voce: "Tubo digerente (esofago, stomaco, intestino, colon)", topici: [GASTROINTESTINALE]}
  - {gruppo: "Apparato digerente", voce: "Fegato", topici: [GASTROINTESTINALE]}
  - {gruppo: "Apparato digerente", voce: "Vie biliari", topici: [GASTROINTESTINALE]}
  - {gruppo: "Apparato digerente", voce: "Pancreas (anche NET)", topici: [GASTROINTESTINALE], precedenza: "pancreas, incluso tumore neuroendocrino → GASTROINTESTINALE"}
  - {gruppo: "Urogenitale", voce: "Rene: tumore", topici: [UROPATOLOGIA]}
  - {gruppo: "Urogenitale", voce: "Rene: patologia medica", topici: [], senza_fletcher: true, nota: "biopsia renale medica: nessun topico; se non neoplastica → Harrison (UROPATOLOGIA è solo oncologica)."}
  - {gruppo: "Urogenitale", voce: "Vescica, vie urinarie, uraco", topici: [UROPATOLOGIA]}
  - {gruppo: "Urogenitale", voce: "Prostata", topici: [UROPATOLOGIA, PDTA prostata], precedenza: "prostata → UROPATOLOGIA + PDTA prostata (sempre in coppia; conta come un solo topico)"}
  - {gruppo: "Urogenitale", voce: "Testicolo e pene", topici: [UROPATOLOGIA]}
  - {gruppo: "Urogenitale", voce: "Citologia urinaria", topici: [UROPATOLOGIA]}
  - {gruppo: "Ginecologia", voce: "Utero, ovaio, vulva", topici: []}
  - {gruppo: "Cute", voce: "Cute", topici: [DERMATOPATOLOGIA]}
  - {gruppo: "Tessuti molli e vasi", voce: "Tessuti molli", topici: [TESSUTI MOLLI]}
  - {gruppo: "Tessuti molli e vasi", voce: "GIST", topici: [TESSUTI MOLLI, GASTROINTESTINALE], precedenza: "GIST → top-2: TESSUTI MOLLI (cap. 17) + GASTROINTESTINALE"}
  - {gruppo: "Tessuti molli e vasi", voce: "Tumore vascolare", topici: [TESSUTI MOLLI, VASCOLARE], precedenza: "tumore vascolare → top-2: TESSUTI MOLLI + VASCOLARE"}
  - {gruppo: "Tessuti molli e vasi", voce: "Anomalia o malformazione vascolare", topici: [VASCOLARE]}
  - {gruppo: "Tessuti molli e vasi", voce: "Vasculite o arterite (qualsiasi sede)", topici: [VASCOLARE], precedenza: "vasculite/arterite → VASCOLARE (anche in organo, es. biopsia renale, arteria temporale)"}
  - {gruppo: "Osso", voce: "Osso e articolazioni", topici: []}
  - {gruppo: "Sistema emolinfopoietico", voce: "Linfonodo", topici: [EMATOLOGIA]}
  - {gruppo: "Sistema emolinfopoietico", voce: "Midollo osseo", topici: [EMATOLOGIA]}
  - {gruppo: "Sistema emolinfopoietico", voce: "Milza", topici: [EMATOLOGIA]}
  - {gruppo: "Sistema emolinfopoietico", voce: "Sangue periferico", topici: [EMATOLOGIA]}
  - {gruppo: "Altre sedi senza topico", voce: "Surrene", topici: []}
  - {gruppo: "Altre sedi senza topico", voce: "Peritoneo", topici: []}
  - {gruppo: "Altre sedi senza topico", voce: "Cuore", topici: []}
  - {gruppo: "Casi speciali", voce: "Linfonodo sentinella", speciale: sentinella, precedenza: "linfonodo sentinella → topico della sede del primitivo (es. MAMMELLA, DERMATOPATOLOGIA, ORL), non EMATOLOGIA; primitivo non indicato → chiedere"}
  - {gruppo: "Casi speciali", voce: "Altro / non in elenco", speciale: altro}

tipi_quesito:
  - {id: ddx, label: "Diagnosi differenziale", modello: "descrivi le caratteristiche morfologiche, immunoistochimiche e molecolari che distinguono {X} da {Y}. Parti dalla morfologia."}
  - {id: entita, label: "Singola entità", modello: "descrivi i criteri morfologici, immunoistochimici e molecolari di {X}. Parti dalla morfologia."}
  - {id: test_sede, label: "Test molecolare in sede", modello: "quali alterazioni molecolari rilevanti per {X} sono coperte dal pannello in uso in sede e quali richiedono un test a parte?"}
  - {id: stadiazione, label: "Stadiazione pTNM / margini", campione: true, modello: "elenca le regole pTNM e i parametri di stadiazione e dei margini per {X} su {campione}."}
  - {id: refertazione, label: "Refertazione", campione: true, modello: "elenca i parametri da riportare nel referto di {X} su {campione}."}
  - {id: pdl1, label: "Predittivo PD-L1", modello: "descrivi score, cut-off e anticorpi/cloni per PD-L1 in {X}."}
  - {id: radiomica, label: "Radiomica / imaging", modello: "descrivi il ruolo della radiomica in {X}."}
  - {id: clinico, label: "Significato clinico-sistemico", modello: "descrivi il significato clinico-sistemico del reperto {X}."}
  - {id: istologia, label: "Istologia normale", modello: "descrivi l'istologia normale di {X}."}
  - {id: ai, label: "AI in anatomia patologica", modello: "descrivi le applicazioni di intelligenza artificiale in anatomia patologica per {X}."}

campioni:
  - {id: biopsia, label: "biopsia"}
  - {id: pezzo_operatorio, label: "pezzo operatorio"}

prefisso_domanda: "Sulla base delle fonti dei notebook allegati, "
suffisso_domanda: "Per ogni affermazione indica la fonte; se un punto non è nelle fonti, dillo."

testi_app:
  sede_mancante: "Scegli una sede."
  sede_non_mappata: "Sede non mappata: chiedi, non inferire. Nessun set proposto."
  sentinella_senza_primitivo: "Linfonodo sentinella: indica la sede del tumore primitivo."

bigino_testi:
  titolo: "BIGINO ROUTING — da incollare in qualsiasi Claude (uso ospedale, modalità recommender)"
  intro: |
    Sei il mio "router" per NotebookLM/Gemini. Ti do un quesito di patologia; tu NON esegui nulla:
    mi restituisci (a) quali notebook attaccare in Gemini e (b) come formulare la domanda.
    Poi attacco e invio io a mano. Solo materiale ANONIMO/di studio — mai dati di paziente.
  sede: "SEDE/organo → 1 notebook TOPICO (2 se ambiguo, segnalando \"ambiguo\"); mai più di 2."
  copertura: "Copertura letta dalle FONTI dei notebook, non dal nome. Se la copertura è dubbia, chiedi, non inferire."
  nessun_topico: "Nessun topico per la sede → dillo, non forzare il topico più vicino."
  avviso_pre_who5: "Fletcher 2021 e ROSAI 2018 precedono la WHO 5ª ed. → verificare nosologia e classificazioni molecolari."
  conflitti: "Se più precedenze insieme portano a più di 2 topici → mostra i candidati e chiedi."
  output: |
    > Notebook da attaccare: {TOPICO} + ROSAI 2018 + IMMUNOISTOCHIMICA [+ condizionali]
    > Motivo: <sede → topico; trigger → condizionali>
    > Domanda da incollare: "<vedi regola sotto>"
  fraseggio_intro: |
    NON usare "Diagnosi differenziale tra… / dammi la diagnosi" → Gemini rifiuta
    ("Sono solo un modello linguistico…"). Formula SEMPRE in chiave descrittiva, adattando al tipo di quesito:
  note_operative:
    - "In Gemini: + → Altri caricamenti → Notebooks → seleziona → Aggiungi → digita → invia."
    - "NON basta nominarli nel prompt: in una chat nuova Gemini risponde dalla propria memoria (testato 26 set 2026). Controlla sempre che la risposta citi le fonti dei notebook."
    - "La pagina Notebook di Gemini (gemini.google.com/notebooks/view) NON mostra i notebook condivisi; il selettore \"+\" sì. Non è un problema di accesso."
    - "Il grounding è lento (~30-90s, \"Analisi in corso…\"): attendi."
    - "Se dopo 2–4 minuti la chat torna vuota senza risposta, reinvia: è un errore intermittente di Gemini, non un problema del set."
    - "Mostra sempre il set proposto prima, così controllo la sede (unico errore che conta)."
    - "I notebook \"privati\" sono usabili solo dal proprietario; i colleghi possono attaccare solo quelli condivisi via link."
```

- [ ] **Step 2: Genera e controlla**

Run: `ruby genera.rb && ruby genera.rb --check`
Expected: `Scritti BIGINO-routing-portatile.md e registry.js.` poi `File generati allineati al registry.`

- [ ] **Step 3: Rivedi il BIGINO generato contro la versione precedente**

Run: `git diff --stat BIGINO-routing-portatile.md && git diff BIGINO-routing-portatile.md | head -120`
Expected, differenze attese e solo queste: intestazione con `genera.rb`; sezione Precedenze ora generata dalle voci (stesso contenuto, più "conflitti"); sezione "Nessun topico" con elenchi derivati dalle voci; sezione fraseggio generata dai modelli (stessi contenuti, più "Refertazione", "Radiomica", "Istologia normale", "AI"); una nota operativa in più sui notebook privati. Se manca una regola presente prima → correggi `registry.yaml`, non il BIGINO.

- [ ] **Step 4: Riscrivi l'hook `.githooks/pre-commit`**

```sh
#!/bin/sh
# Blocca il commit se i file generati non sono allineati a registry.yaml o se i test falliscono.
# Lavora su una copia della versione in staging (quella che verrebbe committata).
set -e
radice=$(git rev-parse --show-toplevel)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
cd "$radice"
git checkout-index -a --prefix="$tmp/"
cd "$tmp"
if ! ruby genera.rb --check; then
  echo "pre-commit: esegui 'ruby genera.rb' e aggiungi i file generati al commit."
  exit 1
fi
if ! uscita=$(node --test 2>&1); then
  echo "$uscita" | tail -40
  echo "pre-commit: test falliti."
  exit 1
fi
echo "pre-commit: test ok."
```

- [ ] **Step 5: Elimina il vecchio generatore e aggiorna l'intestazione di `router.md`**

Run: `git rm genera_bigino.rb`

In `router.md` sostituisci il blocco citato in testa (le righe che iniziano con `>`) con:

```markdown
> Fonte di verità: `registry.yaml`. In caso di conflitto vale il registry.
> `BIGINO-routing-portatile.md` e `registry.js` sono GENERATI: modificare il registry e poi
> eseguire `ruby genera.rb` (`--check` verifica l'allineamento). L'app web è `index.html`.
> Un hook di pre-commit blocca i commit disallineati o con test falliti (attivarlo una volta per
> clone: `git config core.hooksPath .githooks`).
```

- [ ] **Step 6: Verifica che nel repo non restino i nomi da non pubblicare**

Il vecchio registry elencava i notebook esclusi sotto le intestazioni "Amministrativi/carriera" e
"Non-medici". Cerca quelle tracce (i documenti in
`docs/superpowers/` citano la pulizia e sono esclusi dalla ricerca):

Run: `grep -rnE "Amministrativi/carriera|Non-medici" --include="*.md" --include="*.yaml" --include="*.js" --include="*.rb" . | grep -v "^./docs/superpowers/"`
Expected: nessun output.

- [ ] **Step 7: Esegui tutti i test**

Run: `node --test`
Expected: i 7 test di `test/genera.test.js` PASS.

- [ ] **Step 8: Commit**

```bash
git add registry.yaml registry.js BIGINO-routing-portatile.md .githooks/pre-commit router.md
git commit -m "Registry strutturato per l'app: sedi_menu, tipi_quesito, condiviso; genera.rb al posto di genera_bigino.rb

- precedenze e lacune ricavate dalle voci di sedi_menu (una sola fonte)
- modelli di domanda per tipo di quesito (anche nel BIGINO)
- hook: genera.rb --check + node --test sulla versione in staging
- rimossi dai commenti i nomi dei notebook non diagnostici

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Motore `router.js` (casi limite e proprietà)

**Files:**
- Create: `test/router.test.js`
- Create: `router.js`

- [ ] **Step 1: Scrivi i test del motore**

`test/router.test.js`:

```js
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

test("domanda: modello compilato con prefisso e suffisso", () => {
  const r = route({ ...base, sede: "Tiroide", tipo: "ddx", x: "NIFTP", y: "IEFVPTC" }, REG);
  assert.equal(
    r.domanda,
    REG.prefisso_domanda +
      "descrivi le caratteristiche morfologiche, immunoistochimiche e molecolari che distinguono NIFTP da IEFVPTC. Parti dalla morfologia. " +
      REG.suffisso_domanda
  );
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
          }
        }
      }
    }
  }
});
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `node --test test/router.test.js`
Expected: FAIL con "Cannot find module '../router.js'".

- [ ] **Step 3: Scrivi `router.js`**

```js
// Motore del router: funzione pura route(input, registry) → { notebook, motivi, avvisi, domanda }.
// input: { sede, primitivo, natura: "neoplastica"|"non_neoplastica", tipo, campione, x, y }
// Dati: registry.js (generato da registry.yaml). Nessuna dipendenza; browser e Node.
(function () {
  "use strict";

  function perTrigger(reg, trigger) {
    const g = reg.generalisti_conditional.find((x) => [].concat(x.trigger || []).includes(trigger));
    if (!g) throw new Error("registry: nessun generalista con trigger " + trigger);
    return g.name;
  }

  function compila(modello, valori) {
    return modello.replace(/\{(\w+)\}/g, (segnaposto, chiave) => (valori[chiave] ? valori[chiave] : segnaposto));
  }

  function route(input, reg) {
    const out = { notebook: [], motivi: [], avvisi: [], domanda: "" };
    const tutti = reg.topici.concat(reg.generalisti_always, reg.generalisti_conditional);
    const aggiungi = (name) => {
      if (out.notebook.some((n) => n.name === name)) return;
      const n = tutti.find((x) => x.name === name);
      out.notebook.push({ name: name, condiviso: Boolean(n && n.condiviso === true) });
    };

    // 1. Sede
    const voce = reg.sedi_menu.find((v) => v.voce === input.sede);
    if (!voce) { out.avvisi.push(reg.testi_app.sede_mancante); return out; }
    if (voce.speciale === "altro") { out.avvisi.push(reg.testi_app.sede_non_mappata); return out; }
    let sede = voce;
    if (voce.speciale === "sentinella") {
      const prim = reg.sedi_menu.find((v) => v.voce === input.primitivo && !v.speciale);
      if (!prim) { out.avvisi.push(reg.testi_app.sentinella_senza_primitivo); return out; }
      out.motivi.push("linfonodo sentinella → sede del primitivo: " + prim.voce);
      sede = prim;
    }

    // 2. Topici o "nessun topico"
    const nonNeo = input.natura === "non_neoplastica";
    const topici = nonNeo && Array.isArray(sede.topici_non_neoplastico) ? sede.topici_non_neoplastico : sede.topici;
    if (topici.length) {
      topici.forEach(aggiungi);
      out.motivi.push("sede " + sede.voce + " → " + topici.join(" + ") +
        (sede.precedenza ? " (precedenza: " + sede.precedenza + ")" : ""));
    } else {
      out.motivi.push("sede " + sede.voce + (nonNeo ? " (non neoplastica)" : "") + " → nessun topico");
      if (nonNeo) {
        const h = perTrigger(reg, "medico_senza_topico");
        aggiungi(h);
        out.motivi.push("quesito non neoplastico senza topico → " + h);
      } else if (!sede.senza_fletcher) {
        const f = perTrigger(reg, "neoplastico_senza_topico");
        aggiungi(f);
        out.motivi.push("tumore senza topico → " + f);
      } else {
        out.motivi.push(sede.nota || "nessun generalista aggiuntivo");
      }
      out.avvisi.push(reg.bigino_testi.avviso_pre_who5);
    }

    // 3. Generalisti sempre inclusi
    reg.generalisti_always.forEach((g) => aggiungi(g.name));
    out.motivi.push("sempre: " + reg.generalisti_always.map((g) => g.name).join(" + "));

    // 4. Generalisti condizionali per tipo di quesito
    const tipo = reg.tipi_quesito.find((t) => t.id === input.tipo);
    if (!tipo) return out;
    const campione = tipo.campione ? reg.campioni.find((c) => c.id === input.campione) : null;
    const chiavi = [tipo.id].concat(campione ? [tipo.id + ":" + campione.id] : []);
    reg.generalisti_conditional.forEach((g) => {
      if ((g.tipi || []).some((t) => chiavi.includes(t))) {
        aggiungi(g.name);
        out.motivi.push("tipo \"" + tipo.label + "\"" + (campione ? " su " + campione.label : "") + " → " + g.name);
      }
    });

    // 5. Domanda
    out.domanda = reg.prefisso_domanda +
      compila(tipo.modello, { X: input.x, Y: input.y, campione: campione ? campione.label : "" }) +
      " " + reg.suffisso_domanda;
    return out;
  }

  if (typeof module !== "undefined") module.exports = { route: route };
  else window.route = route;
})();
```

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `node --test test/router.test.js`
Expected: 13 test, tutti PASS.

- [ ] **Step 5: Commit**

```bash
git add router.js test/router.test.js
git commit -m "router.js: motore del router come funzione pura (con test su casi limite e proprietà)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Casi di `validazione.md` come test

**Files:**
- Create: `test/validazione.test.js`
- Modify: `validazione.md` (una riga in testa)

Traduzione dei casi (scelta esplicita, dalla spec): ogni riga di `validazione.md` diventa sede + natura + tipo (+ campione). Dove il testo libero è ambiguo, vale la decisione confermata dall'utente (es. #3 laringe = stadiazione; #4/#5/#11/#16 = test in sede).

- [ ] **Step 1: Scrivi i test**

`test/validazione.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const REG = require("../registry.js");
const { route } = require("../router.js");

const R = "ROSAI 2018", I = "IMMUNOISTOCHIMICA", TNM = "TNM - IX Edizione", NGS = "NGS al FBF";
const HAR = "Harrison 22 ed. Principi di Medicina Interna", FLE = "Fletcher 2021";

// [id, descrizione, input, set atteso]
const CASI = [
  ["#1", "sialoadenite necrotizzante", { sede: "Ghiandole salivari", natura: "non_neoplastica", tipo: "entita" }, ["ORL", R, I]],
  ["#2", "adenoma pleomorfo vs ca ex AP", { sede: "Ghiandole salivari", tipo: "ddx" }, ["ORL", R, I]],
  ["#3", "laringe: grading e fronte (eccezione confermata: stadiazione)", { sede: "Laringe e faringe", tipo: "stadiazione", campione: "pezzo_operatorio" }, ["ORL", R, I, TNM]],
  ["#4", "GBM: alterazioni da cercare", { sede: "Encefalo e midollo spinale", tipo: "test_sede" }, ["Cervello", R, I, NGS]],
  ["#5", "meningioma: grading (test in sede)", { sede: "Encefalo e midollo spinale", tipo: "test_sede" }, ["Cervello", R, I, NGS]],
  ["#6", "HER2 e recettori", { sede: "Mammella", tipo: "entita" }, ["MAMMELLA", R, I]],
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
  ["#17", "melanoma uveale prognosi", { sede: "Melanoma oculare (uveale, congiuntivale)", tipo: "entita" }, ["OFTALMOLOGIA", R, I]],
  ["#18", "angiosarcoma vs emangioma", { sede: "Tumore vascolare", tipo: "ddx" }, ["TESSUTI MOLLI", "VASCOLARE", R, I]],
  ["#19", "epatite autoimmune", { sede: "Fegato", natura: "non_neoplastica", tipo: "entita" }, ["GASTROINTESTINALE", R, I]],
  ["#20", "linfoma di Hodgkin", { sede: "Linfonodo", tipo: "entita" }, ["EMATOLOGIA", R, I]],
  ["#21", "fascite nodulare vs sarcoma", { sede: "Tessuti molli", tipo: "ddx" }, ["TESSUTI MOLLI", R, I]],
  ["#22", "vasculite renale nel quadro sistemico", { sede: "Vasculite o arterite (qualsiasi sede)", natura: "non_neoplastica", tipo: "clinico" }, ["VASCOLARE", R, I, HAR]],
  ["reale-tiroide", "NIFTP vs IEFVPTC", { sede: "Tiroide", tipo: "ddx" }, ["ORL", R, I]],
  ["reale-endometrio", "endometrioide G3 vs sieroso", { sede: "Utero, ovaio, vulva", tipo: "ddx" }, [FLE, R, I]],
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
  const r = route({ sede: "Utero, ovaio, vulva", natura: "neoplastica", tipo: "ddx", x: "a", y: "b" }, REG);
  assert.ok(r.avvisi.includes(REG.bigino_testi.avviso_pre_who5));
});
```

- [ ] **Step 2: Esegui i test**

Run: `node --test test/validazione.test.js`
Expected: 27 test PASS. Se un caso fallisce: confronta con la riga di `validazione.md` e con le decisioni della spec; correggi il **registry** (non il test) solo se il registry contraddice una decisione confermata; se il test è una traduzione sbagliata del caso, correggi il test e annotalo nel messaggio di commit.

- [ ] **Step 3: Aggiungi il rimando in `validazione.md`**

Subito dopo la riga `# Validazione router — Stadio 1` inserisci:

```markdown

> I casi di questa pagina sono eseguiti come test automatici in `test/validazione.test.js`
> (traduzione esplicita in sede + natura + tipo di quesito). Aggiungere lì ogni nuovo caso reale.
```

- [ ] **Step 4: Rigenera, esegui tutti i test, commit**

Run: `ruby genera.rb --check && node --test`
Expected: allineati; tutti i test PASS.

```bash
git add test/validazione.test.js validazione.md
git commit -m "Casi di validazione eseguibili come test

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Interfaccia `index.html`

**Files:**
- Create: `index.html`

- [ ] **Step 1: Scrivi `index.html`**

```html
<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Notebook router</title>
<style>
  :root { --bg:#fafafa; --fg:#1d1d1f; --muted:#666; --card:#fff; --bordo:#ddd; --accento:#1a5fb4;
          --avviso:#8a5200; --avviso-bg:#fff4e0; --ok:#1e7a3c; --priv:#a02020; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#161618; --fg:#eee; --muted:#aaa; --card:#222226; --bordo:#3a3a40; --accento:#78aeed;
            --avviso:#f0b35a; --avviso-bg:#3a2c12; --ok:#6fd08c; --priv:#f08a8a; }
  }
  body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.45 system-ui, sans-serif; }
  main { max-width:760px; margin:0 auto; padding:16px; }
  h1 { font-size:1.4rem; margin:.2rem 0 1rem; }
  h2 { font-size:1.05rem; margin:1rem 0 .4rem; }
  fieldset { border:1px solid var(--bordo); border-radius:8px; background:var(--card); margin:0 0 12px; padding:10px 12px; }
  legend { font-weight:600; padding:0 4px; }
  label { display:block; margin:6px 0 2px; }
  .riga { display:flex; gap:16px; flex-wrap:wrap; }
  .riga label { display:inline-flex; gap:6px; align-items:center; }
  select, input[type=text], input[type=search], textarea { width:100%; box-sizing:border-box; font:inherit;
          padding:6px 8px; border:1px solid var(--bordo); border-radius:6px; background:var(--card); color:var(--fg); }
  .nascosto { display:none; }
  #risultato { background:var(--card); border:1px solid var(--bordo); border-radius:8px; padding:4px 12px 12px; }
  .nb { display:flex; justify-content:space-between; gap:8px; padding:5px 0; border-bottom:1px dashed var(--bordo); }
  .etichetta { font-size:.8rem; white-space:nowrap; }
  .condiviso { color:var(--ok); } .privato { color:var(--priv); }
  .avviso { background:var(--avviso-bg); color:var(--avviso); border-radius:6px; padding:6px 8px; margin:8px 0; }
  #domanda { min-height:8em; background:var(--bg); }
  button { font:inherit; padding:6px 14px; border-radius:6px; border:1px solid var(--accento); background:var(--accento); color:#fff; cursor:pointer; }
  ul.motivi { color:var(--muted); font-size:.9rem; padding-left:1.2em; }
  footer { color:var(--muted); font-size:.9rem; margin-top:24px; }
</style>
</head>
<body>
<main>
  <h1>Notebook router</h1>
  <p id="errore" class="avviso nascosto"></p>
  <form id="form" autocomplete="off">
    <fieldset>
      <legend>Sede</legend>
      <input type="search" id="filtro" placeholder="Cerca sede…" aria-label="Cerca sede">
      <label for="sede">Sede</label>
      <select id="sede"></select>
      <div id="blocco-primitivo" class="nascosto">
        <label for="primitivo">Sede del tumore primitivo</label>
        <select id="primitivo"><option value="">— scegli —</option></select>
      </div>
    </fieldset>
    <fieldset>
      <legend>Natura</legend>
      <div class="riga">
        <label><input type="radio" name="natura" value="neoplastica" checked> neoplastica</label>
        <label><input type="radio" name="natura" value="non_neoplastica"> non neoplastica</label>
      </div>
    </fieldset>
    <fieldset>
      <legend>Quesito</legend>
      <label for="tipo">Tipo di quesito</label>
      <select id="tipo"></select>
      <div id="blocco-campione" class="nascosto">
        <label for="campione">Campione</label>
        <select id="campione"></select>
      </div>
      <label for="x">Entità X</label>
      <input type="text" id="x" placeholder="es. carcinoma a cellule aciniche">
      <div id="blocco-y" class="nascosto">
        <label for="y">Entità Y</label>
        <input type="text" id="y" placeholder="es. carcinoma secretorio">
      </div>
    </fieldset>
  </form>
  <section id="risultato" aria-live="polite"></section>
  <footer>
    <h2>Come si usa in Gemini</h2>
    <ul id="note"></ul>
    <p>Regole e dati generati da registry.yaml. Solo materiale anonimo/di studio: mai dati di paziente.</p>
  </footer>
</main>
<script src="registry.js"></script>
<script src="router.js"></script>
<script>
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  if (typeof REGISTRY === "undefined" || typeof route !== "function") {
    $("errore").textContent = "Dati non caricati: registry.js o router.js mancanti.";
    $("errore").classList.remove("nascosto");
    return;
  }
  const R = REGISTRY;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));

  function riempiSedi(select, voci, filtro) {
    const prima = select.value;
    select.textContent = "";
    const gruppi = new Map();
    voci.forEach((v) => {
      if (filtro && !v.voce.toLowerCase().includes(filtro)) return;
      if (!gruppi.has(v.gruppo)) gruppi.set(v.gruppo, []);
      gruppi.get(v.gruppo).push(v);
    });
    gruppi.forEach((lista, gruppo) => {
      const og = document.createElement("optgroup");
      og.label = gruppo;
      lista.forEach((v) => og.appendChild(new Option(v.voce, v.voce)));
      select.appendChild(og);
    });
    if ([...select.options].some((o) => o.value === prima)) select.value = prima;
  }

  function leggi() {
    return {
      sede: $("sede").value,
      primitivo: $("primitivo").value,
      natura: document.querySelector("input[name=natura]:checked").value,
      tipo: $("tipo").value,
      campione: $("campione").value,
      x: $("x").value.trim(),
      y: $("y").value.trim(),
    };
  }

  function copia() {
    const t = $("domanda");
    const fatto = () => { $("copiato").textContent = "copiata"; };
    const vecchio = () => { t.select(); document.execCommand("copy"); fatto(); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t.value).then(fatto, vecchio);
    else vecchio();
  }

  function aggiorna() {
    const input = leggi();
    const voce = R.sedi_menu.find((v) => v.voce === input.sede);
    const tipo = R.tipi_quesito.find((t) => t.id === input.tipo);
    $("blocco-primitivo").classList.toggle("nascosto", !(voce && voce.speciale === "sentinella"));
    $("blocco-campione").classList.toggle("nascosto", !(tipo && tipo.campione));
    $("blocco-y").classList.toggle("nascosto", !(tipo && tipo.modello.includes("{Y}")));

    const r = route(input, R);
    let h = "";
    r.avvisi.forEach((a) => { h += '<p class="avviso">' + esc(a) + "</p>"; });
    if (r.notebook.length) {
      h += "<h2>Notebook da attaccare</h2>";
      r.notebook.forEach((n) => {
        const cls = n.condiviso ? "condiviso" : "privato";
        h += '<div class="nb"><span>' + esc(n.name) + '</span><span class="etichetta ' + cls + '">' + cls + "</span></div>";
      });
      h += '<h2>Motivo</h2><ul class="motivi">' + r.motivi.map((m) => "<li>" + esc(m) + "</li>").join("") + "</ul>";
    }
    if (r.domanda) {
      const mancanti = r.domanda.match(/\{\w+\}/g);
      if (mancanti) h += '<p class="avviso">Completa: ' + esc([...new Set(mancanti)].join(", ")) + "</p>";
      h += '<h2>Domanda da incollare</h2><textarea id="domanda" readonly>' + esc(r.domanda) +
           '</textarea><p><button type="button" id="copia">Copia</button> <span id="copiato"></span></p>';
    }
    $("risultato").innerHTML = h;
    const b = $("copia");
    if (b) b.addEventListener("click", copia);
  }

  riempiSedi($("sede"), R.sedi_menu, "");
  R.sedi_menu.filter((v) => !v.speciale).forEach((v) => $("primitivo").appendChild(new Option(v.voce, v.voce)));
  R.tipi_quesito.forEach((t) => $("tipo").appendChild(new Option(t.label, t.id)));
  R.campioni.forEach((c) => $("campione").appendChild(new Option(c.label, c.id)));
  R.bigino_testi.note_operative.forEach((n) => {
    const li = document.createElement("li");
    li.textContent = n;
    $("note").appendChild(li);
  });

  $("form").addEventListener("input", (e) => {
    if (e.target.id === "filtro") riempiSedi($("sede"), R.sedi_menu, e.target.value.trim().toLowerCase());
    aggiorna();
  });
  $("form").addEventListener("change", aggiorna);
  $("form").addEventListener("submit", (e) => e.preventDefault());
  aggiorna();
})();
</script>
</body>
</html>
```

- [ ] **Step 2: Verifica manuale nel browser** (aprire `index.html` da file locale nel pannello Browser)

Controlli, uno per uno, con l'esito atteso:
1. Sede "Tiroide", natura neoplastica, tipo "Diagnosi differenziale", X "NIFTP", Y "IEFVPTC" → notebook ORL (condiviso), ROSAI 2018 (privato), IMMUNOISTOCHIMICA (condiviso); domanda completa senza "Completa:".
2. Svuota Y → compare l'avviso "Completa: {Y}".
3. Sede "Linfonodo sentinella" → compare il menu del primitivo e l'avviso "indica la sede del tumore primitivo"; scegli "Mammella" → MAMMELLA + generalisti.
4. Sede "Altro / non in elenco" → solo avviso, nessuna domanda.
5. Tipo "Refertazione", sede "Prostata": campione biopsia → niente TNM; pezzo operatorio → TNM presente.
6. Filtro "ren" → il menu mostra solo le voci "Rene: …".
7. Pulsante Copia → testo "copiata"; incollando altrove arriva la domanda.
8. Tema scuro del sistema → testi leggibili; finestra stretta (mobile) → nessuno scorrimento orizzontale.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "index.html: interfaccia dell'app (menu, set con condiviso/privato, motivo, domanda da copiare)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: File di pubblicazione

**Files:**
- Create: `README.md`
- Create: `.nojekyll` (vuoto: evita che GitHub Pages elabori i file Markdown)

- [ ] **Step 1: Scrivi `README.md`**

```markdown
# Notebook router

App: https://infingardo.github.io/notebook-router/

Dato un quesito di anatomia patologica (sede, natura, tipo di quesito), propone quali notebook
NotebookLM attaccare in Gemini (dal "+" → Altri caricamenti → Notebooks) e la domanda da incollare.
Le regole sono deterministiche, senza AI. Solo materiale anonimo o di studio: mai dati di paziente.

I notebook marcati **privato** sono usabili solo dal proprietario; i colleghi possono attaccare
solo quelli **condivisi** via link.

## Come è fatto

- `registry.yaml` — unica fonte di verità (notebook, coperture, voci del menu, tipi di quesito).
- `genera.rb` — valida il registry e genera `registry.js` (dati dell'app) e
  `BIGINO-routing-portatile.md` (versione da incollare in un LLM). `ruby genera.rb --check`
  verifica che siano allineati.
- `router.js` — motore delle regole; `index.html` — interfaccia.
- `test/` — test con `node --test` (inclusi i casi di `validazione.md`).
- `router.md` — spiegazione della logica; `validazione.md` — casi e test reali in Gemini.

## Modificare le regole

1. Modifica `registry.yaml`.
2. `ruby genera.rb`
3. `node --test`
4. Commit (l'hook in `.githooks/` blocca commit disallineati o con test falliti;
   attivarlo una volta per clone con `git config core.hooksPath .githooks`).
```

- [ ] **Step 2: Crea `.nojekyll` e commit**

```bash
touch .nojekyll
git add README.md .nojekyll
git commit -m "README e .nojekyll per GitHub Pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Pubblicazione su GitHub (richiede decisione e ok esplicito dell'utente)

**Files:** nessuno nuovo.

- [ ] **Step 1: Chiedi all'utente la scelta sulla cronologia, e l'ok al push**

Domanda da porre: (a) repo con un solo commit iniziale (cronologia completa conservata solo in locale nel ramo `storia-completa`), oppure (b) pubblicare la cronologia com'è (i commit vecchi contengono i nomi dei notebook non diagnostici nei commenti del registry). Nessun push senza ok esplicito.

- [ ] **Step 2 (solo se scelta a): comprimi la cronologia di `main` in un commit**

```bash
git branch storia-completa main
git reset --soft "$(git rev-list --max-parents=0 HEAD)"
git commit --amend -m "Notebook router: registry, generatore, motore, app web e test

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git log --oneline | wc -l
```
Expected: `1`. Verifica: `git diff storia-completa main --stat` → nessuna differenza.

- [ ] **Step 3: Crea il repo pubblico e fai il push del solo ramo `main`**

```bash
gh repo create Infingardo/notebook-router --public --source . --remote origin --description "Router dei notebook NotebookLM per quesiti di anatomia patologica"
git push -u origin main
```
Expected: push riuscito; il ramo `storia-completa` (se esiste) NON viene pubblicato: verificare con `git ls-remote origin` → solo `refs/heads/main`.

- [ ] **Step 4: Attiva GitHub Pages**

```bash
gh api -X POST repos/Infingardo/notebook-router/pages -f "source[branch]=main" -f "source[path]=/"
gh api repos/Infingardo/notebook-router/pages --jq .html_url
```
Expected: `https://infingardo.github.io/notebook-router/`.

- [ ] **Step 5: Verifica la pagina pubblicata** (dopo qualche minuto)

Aprire l'URL nel pannello Browser e ripetere i controlli 1, 3, 5 del Task 5.

---

## Copertura della spec (self-review)

| Requisito della spec | Task |
|---|---|
| Menu sede con ricerca e gruppi; sentinella con primitivo; "altro" | 2 (dati), 3 (motore), 5 (UI) |
| Natura usata solo senza topico; Fletcher/Harrison; senza_fletcher | 2, 3 |
| Tipi di quesito, campione biopsia/pezzo operatorio | 2, 3, 5 |
| Output: nomi esatti, condiviso/privato, motivo, avvisi, domanda + Copia, guida | 3, 5 |
| `sedi_menu` al posto di `precedenze`; `condiviso`; `tipi`; `modelli_domanda` | 2 |
| `genera.rb`: BIGINO + `registry.js`, validazione, `--check` | 1, 2 |
| Motore puro con motivi | 3 |
| Test: validazione, casi limite, proprietà; hook | 3, 4, 2 (hook) |
| Pulizia pre-pubblicazione, scelta cronologia, repo pubblico + Pages | 2 (pulizia), 7 |
| Errori in pagina (dati mancanti, segnaposti, sentinella/altro) | 5 |
