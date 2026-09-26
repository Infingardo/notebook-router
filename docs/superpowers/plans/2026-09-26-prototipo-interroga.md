# Prototipo "interroga" (Stadio 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** da Claude Code, un quesito in testo libero → set di notebook scelto da `router.js` → domande ai notebook NotebookLM con `notebooklm-py` → sintesi con citazioni per notebook, salvata in una cartella privata.

**Architecture:** `interroga.js` (Node, nessuna dipendenza) fa la parte deterministica: usa `route()`, risolve i nomi dei notebook in ID, interroga in sequenza tramite un esecutore iniettabile (reale = `notebooklm` via `spawnSync`, nei test = finto) e restituisce JSON. La skill `/chiedi` (Markdown per Claude) fa la parte di giudizio: traduzione del testo libero, conferma del set, sintesi, salvataggio.

**Tech Stack:** Node 24 (`node:test`), `notebooklm-py` in un venv Python 3.12 (`~/.venvs/notebooklm`), Ruby 2.6 solo per `genera.rb` esistente.

**Spec:** `docs/superpowers/specs/2026-09-26-prototipo-interroga-design.md`

## Global Constraints

- Solo Mac personale; mai installazioni su PC aziendali. Solo materiale anonimo/di studio.
- `notebooklm-py` e login **fuori dal repo**: venv `~/.venvs/notebooklm`, login fatto dall'utente (`notebooklm login`).
- Comandi `notebooklm` ammessi: `auth check`, `list`, `source list`, `ask`. Vietati: `--new`, `-c/--conversation-id`, `--save-as-note`, `--yes/-y`, e qualunque altro comando (`configure`, `delete`, `history`, `create`… — `create`/`source add` solo nella prova del Task 1, a mano, sul notebook "router-test").
- Le domande vanno **in coda** alla chat di ciascun notebook (decisione utente); ogni domanda inizia con `Domanda indipendente dalle precedenti: `.
- Risposte salvate in `~/Documents/Progetti/notebook-router-risposte/`, **mai** nel repo (il repo è pubblico). Nessun dato personale nei file di test: le fixture contengono solo nomi di notebook di patologia e ID finti.
- Il repo è pubblico: niente credenziali, nessun output reale di `list` (contiene notebook personali) nei commit.
- L'app web (`index.html`) non cambia. `router.js` cambia solo per esportare `elencoNotebook`.
- Commit in italiano con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; mai `--no-verify`; niente push senza ok dell'utente.

## Review Focus

- Testo dell'entità con virgolette, apostrofi, a capo o `-` iniziale: deve arrivare a `notebooklm ask` come **un solo argomento intatto** (nessuna shell) → test in Task 2.
- Login scaduto a metà giornata: nessuna domanda deve partire, messaggio chiaro → test in Task 2.
- Un notebook che non risponde (timeout, errore, output non JSON): gli altri proseguono, quello resta "non interrogato" → test in Task 2.
- Nome del registry che non corrisponde esattamente (o è doppio) nell'elenco di NotebookLM: nessuna domanda, nessuna ipotesi → test in Task 2.
- Risposta senza riferimenti: tenuta ma marcata non verificabile, niente chiamata `source list` → test in Task 2; marcatura nella sintesi → skill (Task 3).

## Mappa dei file

| File | Stato | Responsabilità |
|---|---|---|
| `router.js` | modifica | esporta anche `elencoNotebook(nomi)` (formattazione dell'elenco già usata dalla domanda) |
| `test/router.test.js` | modifica | test di `elencoNotebook` |
| `interroga.js` | nuovo | orchestrazione, guardia sui comandi, estrattori dell'output, CLI |
| `test/interroga.test.js` | nuovo | test con esecutore finto |
| `test/fixtures/notebooklm/*.json` | nuovi | output finti ricavati dalla forma reale (Task 1) |
| `skills/chiedi/SKILL.md` | nuovo | istruzioni per `/chiedi` |
| `.claude/skills/chiedi` | link locale (non versionato) | collega la skill a Claude Code |

---

### Task 1: Prova preliminare (con l'utente presente)

Scopo: confermare installazione, login, forma dell'output e comportamento delle conversazioni **prima** di scrivere codice. Nessun commit di output reali.

**Files:**
- Create (privato, fuori dal repo): `~/Documents/Progetti/notebook-router-risposte/_prova-preliminare.md`
- Create: `test/fixtures/notebooklm/list.json`, `test/fixtures/notebooklm/source-list.json`, `test/fixtures/notebooklm/ask.json`, `test/fixtures/notebooklm/ask-senza-riferimenti.json`

**Interfaces:**
- Produces: le fixture sopra, con la **stessa struttura** dell'output reale e contenuti finti (vedi Step 7).

- [ ] **Step 1: Crea il venv e installa**

```bash
python3 -m venv ~/.venvs/notebooklm
~/.venvs/notebooklm/bin/pip install --upgrade pip notebooklm-py
~/.venvs/notebooklm/bin/notebooklm --version
```
Expected: stampa una versione. Se l'installazione fallisce: fermarsi e riportare l'errore all'utente.

- [ ] **Step 2: Login (lo fa l'utente)**

Chiedere all'utente di eseguire in un terminale suo: `~/.venvs/notebooklm/bin/notebooklm login` (apre il browser per l'accesso Google). Non eseguirlo al posto suo e non leggere i file di credenziali.

- [ ] **Step 3: Verifica login**

```bash
~/.venvs/notebooklm/bin/notebooklm auth check --json; echo "exit=$?"
```
Annotare nel file privato: codice di uscita e chiavi del JSON. Poi chiedere all'utente di **non** fare nulla e verificare che un login mancante dia uscita ≠ 0: `NOTEBOOKLM_HOME=$(mktemp -d) ~/.venvs/notebooklm/bin/notebooklm auth check --json; echo "exit=$?"` (se la variabile non esiste per questo strumento, annotarlo: il test del Task 2 userà comunque il codice di uscita).

- [ ] **Step 4: Forma di `list --json`**

```bash
~/.venvs/notebooklm/bin/notebooklm list --json > /tmp/nlm-list.json
python3 -c "import json;d=json.load(open('/tmp/nlm-list.json'));print(type(d).__name__, list(d)[:5] if isinstance(d,dict) else '');x=(d if isinstance(d,list) else next(v for v in d.values() if isinstance(v,list)))[0];print(sorted(x))"
rm /tmp/nlm-list.json
```
Annotare: tipo radice, chiave della lista, chiavi di un elemento (attese: `id`, `title`). Il file reale viene cancellato perché contiene notebook personali.

- [ ] **Step 5: Notebook di prova e conversazioni**

Creare "router-test" e aggiungere una fonte di testo breve (sintassi da confermare con `--help`):
```bash
~/.venvs/notebooklm/bin/notebooklm create --help
~/.venvs/notebooklm/bin/notebooklm source add --help
```
Poi, sul solo "router-test":
```bash
NB=<id di router-test>
~/.venvs/notebooklm/bin/notebooklm ask "Domanda indipendente dalle precedenti: di cosa parla questa fonte?" -n $NB --json > /tmp/nlm-ask1.json
~/.venvs/notebooklm/bin/notebooklm ask "Domanda indipendente dalle precedenti: elenca due concetti della fonte." -n $NB --json > /tmp/nlm-ask2.json
~/.venvs/notebooklm/bin/notebooklm source list -n $NB --json > /tmp/nlm-sources.json
python3 -c "import json;[print(f, sorted(json.load(open(f)))) for f in ['/tmp/nlm-ask1.json','/tmp/nlm-ask2.json']];r=json.load(open('/tmp/nlm-ask1.json')).get('references') or [];print('ref keys', sorted(r[0]) if r else 'nessun riferimento')"
```
Verificare e annotare: chiavi del JSON di `ask` (attese: `answer`, `references`, `conversation_id`, `is_follow_up`); chiavi di un riferimento (attese: `source_id`, `citation_number`, `cited_text`); stesso `conversation_id` nelle due domande (= in coda, nessuna cancellazione); tempo di ciascuna risposta. Controllare nella scheda Chat di "router-test" in NotebookLM che compaiano entrambe le domande. **Non** usare `--new`. Non cancellare "router-test" senza chiedere all'utente.

- [ ] **Step 6: Decisione**

Se login, `list`, `ask` funzionano e l'output ha le chiavi attese (o equivalenti chiare): proseguire. Altrimenti fermarsi e riportare all'utente cosa non funziona.

- [ ] **Step 7: Scrivi le fixture (struttura reale, contenuti finti)**

Adattare le chiavi alla forma annotata negli Step 4–5; se coincide con quella attesa, usare esattamente:

`test/fixtures/notebooklm/list.json`:
```json
{"notebooks": [
  {"id": "nb-orl", "title": "ORL"},
  {"id": "nb-rosai", "title": "ROSAI 2018"},
  {"id": "nb-iic", "title": "IMMUNOISTOCHIMICA"},
  {"id": "nb-gi", "title": "GASTROINTESTINALE"}
]}
```
`test/fixtures/notebooklm/source-list.json`:
```json
{"sources": [
  {"id": "src-1", "title": "Tumori della tiroide low risk"},
  {"id": "src-2", "title": "Rosai_Chapter 08 Thyroid gland.pdf"}
]}
```
`test/fixtures/notebooklm/ask.json`:
```json
{"answer": "La NIFTP è incapsulata [1] e ha nuclei di tipo papillare [2].",
 "conversation_id": "conv-1", "is_follow_up": true, "turn_number": 3,
 "references": [
   {"source_id": "src-1", "citation_number": 1, "cited_text": "incapsulata o ben demarcata"},
   {"source_id": "src-2", "citation_number": 2, "cited_text": "nuclear score 2-3"}
 ]}
```
`test/fixtures/notebooklm/ask-senza-riferimenti.json`:
```json
{"answer": "Nessuna informazione specifica nelle fonti.", "conversation_id": "conv-2", "is_follow_up": true, "turn_number": 1, "references": []}
```
Se la forma reale è diversa, riportare nelle fixture la forma reale (chiavi e annidamento) e annotare nel file privato quali estrattori del Task 2 vanno adattati.

- [ ] **Step 8: Commit delle sole fixture**

```bash
git add test/fixtures/notebooklm
git commit -m "Fixture di notebooklm-py (struttura reale, contenuti finti) per il prototipo interroga

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `interroga.js` (TDD con esecutore finto)

**Files:**
- Modify: `router.js` (estrazione di `elencoNotebook`), `test/router.test.js`
- Create: `interroga.js`, `test/interroga.test.js`

**Interfaces:**
- Consumes: `route(input, reg)` e ora `elencoNotebook(nomi: string[]) → string` da `router.js`; `REGISTRY` da `registry.js`; fixture del Task 1.
- Produces:
  - `interroga(input, reg, esegui) → { stato: "ok"|"fermo"|"login", notebook: [{name, condiviso}], motivi: string[], avvisi: string[], risposte: [{name, id, testo, riferimenti: [{numero, fonte_id, fonte, estratto}], errore}] }`
  - `esegui(args: string[]) → { status: number, stdout: string, stderr: string }`
  - `controllaArgomenti(args)` (lancia errore se vietato), `domandaPerNotebook(r, reg, nome) → string`
  - CLI: `node interroga.js <input.json | ->` → JSON su stdout; uscita 0 se `stato === "ok"`, altrimenti 1. Binario: `NOTEBOOKLM_BIN` o `~/.venvs/notebooklm/bin/notebooklm`.

Nota: se il Task 1 ha rilevato una forma diversa da quella attesa, adattare **solo** `estraiNotebook`, `estraiFonti`, `estraiRisposta` alla forma delle fixture, senza toccare il resto.

- [ ] **Step 1: Test di `elencoNotebook` (in `test/router.test.js`, in fondo)**

```js
test("elencoNotebook: uno, due, tre nomi", () => {
  const { elencoNotebook } = require("../router.js");
  assert.equal(elencoNotebook(["ORL"]), '"ORL"');
  assert.equal(elencoNotebook(["ORL", "ROSAI 2018"]), '"ORL" e "ROSAI 2018"');
  assert.equal(elencoNotebook(["A", "B", "C"]), '"A", "B" e "C"');
});
```

- [ ] **Step 2: Esegui e verifica che fallisca**

Run: `node --test test/router.test.js`
Expected: FAIL (`elencoNotebook is not a function`).

- [ ] **Step 3: Estrai la funzione in `router.js`**

Aggiungere, dopo `compila`:
```js
  function elencoNotebook(nomi) {
    const q = nomi.map((n) => '"' + n + '"');
    return q.length > 1 ? q.slice(0, -1).join(", ") + " e " + q[q.length - 1] : q.join("");
  }
```
Sostituire nel passo 5 di `route` le due righe `const elenco = …` / `const notebook = …` con:
```js
    const notebook = elencoNotebook(out.notebook.map((n) => n.name));
```
Sostituire l'export finale con:
```js
  if (typeof module === "object" && module && module.exports) module.exports = { route: route, elencoNotebook: elencoNotebook };
  else globalThis.route = route;
```

- [ ] **Step 4: Verifica**

Run: `node --test`
Expected: tutti PASS (i test esistenti della domanda restano verdi).

- [ ] **Step 5: Scrivi `test/interroga.test.js`**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const REG = require("../registry.js");
const { interroga, controllaArgomenti, domandaPerNotebook } = require("../interroga.js");
const { route } = require("../router.js");

const FIX = (f) => fs.readFileSync(path.join(__dirname, "fixtures", "notebooklm", f), "utf8");
const TIROIDE = { sede: "Tiroide", natura: "neoplastica", tipo: "entita", x: "NIFTP" };

// Esecutore finto: registra le chiamate e risponde per comando.
function finto(opz = {}) {
  const chiamate = [];
  const esegui = (args) => {
    controllaArgomenti(args);
    chiamate.push(args);
    const [cmd] = args;
    if (cmd === "auth") return { status: opz.authFallisce ? 1 : 0, stdout: "{}", stderr: "" };
    if (cmd === "list") return { status: 0, stdout: opz.list || FIX("list.json"), stderr: "" };
    if (cmd === "source") return { status: 0, stdout: FIX("source-list.json"), stderr: "" };
    if (cmd === "ask") {
      const id = args[args.indexOf("-n") + 1];
      if (opz.askErrore === id) return { status: 1, stdout: "", stderr: "timeout" };
      if (opz.askNonJson === id) return { status: 0, stdout: "non json", stderr: "" };
      return { status: 0, stdout: opz.senzaRiferimenti ? FIX("ask-senza-riferimenti.json") : FIX("ask.json"), stderr: "" };
    }
    throw new Error("comando inatteso nel finto: " + cmd);
  };
  return { esegui, chiamate };
}

test("interroga i notebook del set, in ordine, con domanda per singolo notebook", () => {
  const f = finto();
  const out = interroga(TIROIDE, REG, f.esegui);
  assert.equal(out.stato, "ok");
  const asks = f.chiamate.filter((a) => a[0] === "ask");
  assert.deepEqual(asks.map((a) => a[a.indexOf("-n") + 1]), ["nb-orl", "nb-rosai", "nb-iic"]);
  assert.ok(asks[0][1].startsWith("Domanda indipendente dalle precedenti: usando SOLO questo notebook (\"ORL\")"), asks[0][1]);
  assert.ok(asks[0][1].includes("relativi a: NIFTP."));
  assert.ok(asks[0].includes("--json"));
});

test("riferimenti convertiti in titoli delle fonti", () => {
  const out = interroga(TIROIDE, REG, finto().esegui);
  const r = out.risposte[0];
  assert.equal(r.testo.startsWith("La NIFTP"), true);
  assert.deepEqual(r.riferimenti.map((x) => x.fonte), ["Tumori della tiroide low risk", "Rosai_Chapter 08 Thyroid gland.pdf"]);
  assert.equal(r.riferimenti[0].numero, 1);
  assert.equal(r.riferimenti[0].estratto, "incapsulata o ben demarcata");
});

test("un notebook in errore non ferma gli altri", () => {
  const out = interroga(TIROIDE, REG, finto({ askErrore: "nb-rosai" }).esegui);
  assert.equal(out.stato, "ok");
  assert.match(out.risposte[1].errore, /ask fallito/);
  assert.equal(out.risposte[0].errore, null);
  assert.equal(out.risposte[2].errore, null);
});

test("output non JSON su un notebook → errore solo per quel notebook", () => {
  const out = interroga(TIROIDE, REG, finto({ askNonJson: "nb-iic" }).esegui);
  assert.match(out.risposte[2].errore, /non JSON/);
  assert.equal(out.risposte[0].errore, null);
});

test("login non valido → nessuna domanda", () => {
  const f = finto({ authFallisce: true });
  const out = interroga(TIROIDE, REG, f.esegui);
  assert.equal(out.stato, "login");
  assert.ok(out.avvisi.some((a) => /notebooklm login/.test(a)));
  assert.equal(f.chiamate.filter((a) => a[0] === "ask").length, 0);
});

test("notebook non trovato o doppio → fermo, nessuna domanda", () => {
  const senzaIic = JSON.stringify({ notebooks: [{ id: "nb-orl", title: "ORL" }, { id: "nb-rosai", title: "ROSAI 2018" }] });
  const f1 = finto({ list: senzaIic });
  const o1 = interroga(TIROIDE, REG, f1.esegui);
  assert.equal(o1.stato, "fermo");
  assert.ok(o1.avvisi.some((a) => /non trovato: IMMUNOISTOCHIMICA/.test(a)));
  assert.equal(f1.chiamate.filter((a) => a[0] === "ask").length, 0);
  const doppio = JSON.stringify({ notebooks: [{ id: "a", title: "ORL" }, { id: "b", title: "ORL" }, { id: "nb-rosai", title: "ROSAI 2018" }, { id: "nb-iic", title: "IMMUNOISTOCHIMICA" }] });
  const o2 = interroga(TIROIDE, REG, finto({ list: doppio }).esegui);
  assert.ok(o2.avvisi.some((a) => /ambiguo: ORL/.test(a)));
});

test("avvisi del motore → fermo senza chiamare notebooklm", () => {
  const f = finto();
  const out = interroga({ sede: "Polmone", tipo: "entita", x: "a" }, REG, f.esegui);
  assert.equal(out.stato, "fermo");
  assert.equal(f.chiamate.length, 0);
});

test("risposta senza riferimenti → nessuna chiamata source list", () => {
  const f = finto({ senzaRiferimenti: true });
  const out = interroga(TIROIDE, REG, f.esegui);
  assert.deepEqual(out.risposte[0].riferimenti, []);
  assert.equal(f.chiamate.filter((a) => a[0] === "source").length, 0);
});

test("testo con virgolette, a capo e trattino arriva intatto come un solo argomento", () => {
  const f = finto();
  const x = '-l\'entità "strana"\nseconda riga';
  interroga({ ...TIROIDE, x }, REG, f.esegui);
  const ask = f.chiamate.find((a) => a[0] === "ask");
  assert.ok(ask[1].includes('relativi a: -l\'entità "strana"\nseconda riga.'), ask[1]);
  assert.equal(ask.length, 5); // ask, domanda, -n, id, --json
});

test("guardia: comandi e opzioni vietati", () => {
  for (const a of [["ask", "x", "--new"], ["ask", "x", "-c", "c1"], ["ask", "x", "--save-as-note"], ["configure", "--mode", "x"], ["delete", "-n", "a"], ["history", "--clear"], ["source", "add", "x"], ["auth", "logout"]]) {
    assert.throws(() => controllaArgomenti(a), /non ammess|vietat/, a.join(" "));
  }
  for (const a of [["auth", "check", "--json"], ["list", "--json"], ["source", "list", "-n", "a", "--json"], ["ask", "q", "-n", "a", "--json"]]) {
    assert.doesNotThrow(() => controllaArgomenti(a));
  }
});

test("domandaPerNotebook sostituisce il prefisso dell'app", () => {
  const r = route(TIROIDE, REG);
  const d = domandaPerNotebook(r, REG, "ORL");
  assert.ok(d.startsWith('Domanda indipendente dalle precedenti: usando SOLO questo notebook ("ORL") e sulla base delle sue fonti, descrivi'));
  assert.ok(!d.includes('"ROSAI 2018"'));
});
```

- [ ] **Step 6: Esegui e verifica che falliscano**

Run: `node --test test/interroga.test.js`
Expected: FAIL (`Cannot find module '../interroga.js'`).

- [ ] **Step 7: Scrivi `interroga.js`**

```js
// Prototipo Stadio 3: interroga i notebook NotebookLM del set scelto da router.js.
// Uso: node interroga.js <input.json | -> ; stampa un JSON su stdout (uscita 0 se stato "ok").
// Richiede notebooklm-py (venv ~/.venvs/notebooklm) e login fatto dall'utente. Solo materiale anonimo.
"use strict";
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { route, elencoNotebook } = require("./router.js");

const INTRO = "Domanda indipendente dalle precedenti: ";
// Solo lettura + ask in coda: nessun comando che cancelli o modifichi i notebook.
const COMANDI_AMMESSI = { auth: ["check"], list: [], source: ["list"], ask: [] };
const OPZIONI_VIETATE = ["--new", "-c", "--conversation-id", "--save-as-note", "--yes", "-y"];

function controllaArgomenti(args) {
  const cmd = args[0];
  const sub = args[1];
  if (!Object.prototype.hasOwnProperty.call(COMANDI_AMMESSI, cmd)) throw new Error("comando notebooklm non ammesso: " + cmd);
  const subs = COMANDI_AMMESSI[cmd];
  if (subs.length && !subs.includes(sub)) throw new Error("sottocomando non ammesso: " + cmd + " " + sub);
  for (const a of args.slice(cmd === "ask" ? 2 : 1)) {
    if (OPZIONI_VIETATE.includes(a)) throw new Error("opzione vietata: " + a);
  }
}

function eseguiReale(bin) {
  return (args) => {
    controllaArgomenti(args);
    const r = spawnSync(bin, args, { encoding: "utf8", timeout: 240000 });
    if (r.error) return { status: 1, stdout: "", stderr: String(r.error.message) };
    return { status: r.status === null ? 1 : r.status, stdout: r.stdout, stderr: r.stderr };
  };
}

function leggiJson(testo, cosa) {
  try {
    return JSON.parse(testo);
  } catch (e) {
    throw new Error("output non JSON da notebooklm (" + cosa + ")");
  }
}

// Estrattori: accettano un array o un oggetto con la lista in una chiave nota.
function lista(obj, chiavi) {
  if (Array.isArray(obj)) return obj;
  for (const k of chiavi) if (obj && Array.isArray(obj[k])) return obj[k];
  throw new Error("formato inatteso: nessuna lista (" + chiavi.join("/") + ")");
}
function estraiNotebook(obj) {
  return lista(obj, ["notebooks", "items", "data"]).map((n) => ({ id: n.id || n.notebook_id, titolo: n.title }));
}
function estraiFonti(obj) {
  return lista(obj, ["sources", "items", "data"]).map((s) => ({ id: s.id || s.source_id, titolo: s.title }));
}
function estraiRisposta(obj) {
  if (!obj || typeof obj.answer !== "string") throw new Error("risposta senza campo 'answer'");
  const refs = Array.isArray(obj.references) ? obj.references : [];
  return {
    testo: obj.answer,
    riferimenti: refs.map((r) => ({
      numero: r.citation_number == null ? null : r.citation_number,
      fonte_id: r.source_id,
      fonte: null,
      estratto: r.cited_text == null ? null : r.cited_text,
    })),
  };
}

function trovaId(nome, notebooks) {
  const trovati = notebooks.filter((n) => n.titolo === nome);
  if (trovati.length === 0) throw new Error("notebook non trovato: " + nome);
  if (trovati.length > 1) throw new Error("nome notebook ambiguo: " + nome);
  return trovati[0].id;
}

function domandaPerNotebook(r, reg, nome) {
  const prefissoApp = reg.prefisso_domanda.replace("{NOTEBOOK}", elencoNotebook(r.notebook.map((n) => n.name)));
  if (!r.domanda.startsWith(prefissoApp)) throw new Error("domanda inattesa: prefisso non riconosciuto");
  return INTRO + 'usando SOLO questo notebook ("' + nome + '") e sulla base delle sue fonti, ' + r.domanda.slice(prefissoApp.length);
}

function interroga(input, reg, esegui) {
  const r = route(input, reg);
  const out = { stato: "ok", notebook: r.notebook, motivi: r.motivi, avvisi: r.avvisi.slice(), risposte: [] };
  if (!r.notebook.length || !r.domanda) {
    out.stato = "fermo";
    return out;
  }
  if (esegui(["auth", "check", "--json"]).status !== 0) {
    out.stato = "login";
    out.avvisi.push("Login NotebookLM non valido: esegui 'notebooklm login'.");
    return out;
  }
  let elenco;
  try {
    elenco = estraiNotebook(leggiJson(esegui(["list", "--json"]).stdout, "list"));
  } catch (e) {
    out.stato = "fermo";
    out.avvisi.push(e.message);
    return out;
  }
  const ids = {};
  for (const n of r.notebook) {
    try {
      ids[n.name] = trovaId(n.name, elenco);
    } catch (e) {
      out.avvisi.push(e.message);
    }
  }
  if (Object.keys(ids).length !== r.notebook.length) {
    out.stato = "fermo";
    return out;
  }
  for (const n of r.notebook) {
    const risposta = { name: n.name, id: ids[n.name], testo: null, riferimenti: [], errore: null };
    try {
      const a = esegui(["ask", domandaPerNotebook(r, reg, n.name), "-n", ids[n.name], "--json"]);
      if (a.status !== 0) throw new Error("ask fallito (codice " + a.status + ")");
      Object.assign(risposta, estraiRisposta(leggiJson(a.stdout, "ask")));
      if (risposta.riferimenti.length) {
        const fonti = estraiFonti(leggiJson(esegui(["source", "list", "-n", ids[n.name], "--json"]).stdout, "source list"));
        for (const x of risposta.riferimenti) {
          const f = fonti.find((s) => s.id === x.fonte_id);
          x.fonte = f ? f.titolo : null;
        }
      }
    } catch (e) {
      risposta.errore = e.message;
    }
    out.risposte.push(risposta);
  }
  return out;
}

if (require.main === module) {
  const arg = process.argv[2];
  const testo = !arg || arg === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(arg, "utf8");
  const bin = process.env.NOTEBOOKLM_BIN || path.join(os.homedir(), ".venvs", "notebooklm", "bin", "notebooklm");
  const esito = interroga(JSON.parse(testo), require("./registry.js"), eseguiReale(bin));
  process.stdout.write(JSON.stringify(esito, null, 2) + "\n");
  process.exit(esito.stato === "ok" ? 0 : 1);
}

module.exports = { interroga, controllaArgomenti, domandaPerNotebook, estraiNotebook, estraiFonti, estraiRisposta, trovaId };
```

- [ ] **Step 8: Esegui i test**

Run: `node --test`
Expected: tutti PASS (suite esistente + 11 nuovi).

- [ ] **Step 9: Commit**

```bash
git add router.js test/router.test.js interroga.js test/interroga.test.js
git commit -m "interroga.js: interrogazione dei notebook del set con notebooklm-py (con test su esecutore finto)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Skill `/chiedi` e verifica su quesiti reali

**Files:**
- Create: `skills/chiedi/SKILL.md`
- Create (locale, non versionato): link `.claude/skills/chiedi` → `../../skills/chiedi`
- Create (privato): file di risposta in `~/Documents/Progetti/notebook-router-risposte/`

**Interfaces:**
- Consumes: CLI `node interroga.js -` (Task 2) e il suo JSON; `registry.yaml` (voci `sedi_menu`, `tipi_quesito`, `campioni`).

- [ ] **Step 1: Scrivi `skills/chiedi/SKILL.md`**

````markdown
---
name: chiedi
description: Pone un quesito di anatomia patologica ai notebook NotebookLM scelti dal notebook-router e restituisce una sintesi con citazioni per notebook. Usare quando l'utente scrive /chiedi seguito dal quesito. Solo materiale anonimo o di studio.
---

# /chiedi — interroga i notebook del router

Repo: `~/Documents/Progetti/notebook-router`. Mai dati di paziente: se il quesito contiene nomi,
date di nascita, codici o altri identificativi, fermati e chiedi di anonimizzarlo.

## 1. Traduci il quesito
Leggi `registry.yaml` e scegli:
- `sede`: una `voce` esistente di `sedi_menu` (testo esatto). Se nessuna calza: "Altro / non in elenco".
  Linfonodo sentinella → `sede: "Linfonodo sentinella"` + `primitivo` (voce esatta).
- `natura`: "neoplastica" o "non_neoplastica". Se il quesito è "neoplastico o reattivo?", usa
  "neoplastica" con tipo "ddx" (X = lesione reattiva, Y = neoplasia).
- `tipo`: un `id` di `tipi_quesito`; `campione` (id di `campioni`) solo se il tipo lo prevede.
- `x`, `y`: le entità, testo breve.

## 2. Mostra il set e aspetta l'ok
Esegui senza interrogare nulla:
`node -e 'const R=require("./registry.js");const {route}=require("./router.js");console.log(JSON.stringify(route(JSON.parse(process.argv[1]),R),null,2))' '<json>'`
Mostra all'utente: traduzione (sede, natura, tipo, X/Y), notebook con condiviso/privato, motivi,
avvisi. Se ci sono avvisi bloccanti o nessun notebook, chiedi il dato mancante. **Aspetta un ok
esplicito** prima del passo 3.

## 3. Interroga
`printf '%s' '<json>' | node interroga.js -` (dalla cartella del repo). Uscita:
- `stato: "login"` → di' all'utente di eseguire `~/.venvs/notebooklm/bin/notebooklm login` e fermati.
- `stato: "fermo"` → mostra gli avvisi e fermati.
- `stato: "ok"` → passo 4. Le domande sono state aggiunte in coda alla chat di ciascun notebook.

## 4. Sintesi (regole fisse)
Ordine: morfologia → immunoistochimica → molecolare (solo le parti pertinenti al quesito).
- Ogni affermazione porta `[NOTEBOOK: fonte]` presa da `risposte[].riferimenti[].fonte`
  (se `fonte` è null usa `[NOTEBOOK: fonte n. N]`).
- Nessuna affermazione senza fonte; nessuna aggiunta dalla tua conoscenza. Ciò che nessun notebook
  riporta: "non presente nelle fonti".
- Notebook con `errore`: "NOTEBOOK: non interrogato (motivo)". Risposte senza riferimenti:
  "NOTEBOOK: risposta non verificabile sulle fonti".
- Discordanze tra notebook: riporta entrambe le versioni con le rispettive fonti.
- Se il set include ROSAI 2018 o Fletcher 2021 senza topico aggiornato, ricorda che precedono la
  WHO 5ª ed.

## 5. Salva
Crea `~/Documents/Progetti/notebook-router-risposte/AAAA-MM-GG-<argomento-breve>.md` con:
quesito originale, traduzione, notebook e motivi, sintesi, poi per ogni notebook la risposta
grezza (`testo`) e l'elenco dei riferimenti (numero, fonte, estratto). Mai nel repo.
Mostra all'utente la sintesi e il percorso del file.
````

- [ ] **Step 2: Collega la skill a Claude Code (locale)**

```bash
mkdir -p .claude/skills ~/Documents/Progetti/notebook-router-risposte
ln -s ../../skills/chiedi .claude/skills/chiedi
ls -l .claude/skills/chiedi && git status --short
```
Expected: il link esiste; `git status` non mostra `.claude/` (è in `.gitignore`).

- [ ] **Step 3: Verifica su tre quesiti reali** (richiede il login del Task 1)

Eseguire `/chiedi` su:
1. "criteri morfologici della NIFTP" → set atteso ORL + ROSAI 2018 + IMMUNOISTOCHIMICA.
2. "criteri della gastrite linfocitica" (natura non neoplastica) → GASTROINTESTINALE + ROSAI 2018 + IMMUNOISTOCHIMICA.
3. "endometrioide G3 vs sieroso dell'endometrio" → ROSAI 2018 + IMMUNOISTOCHIMICA + Fletcher 2021.

Per ciascuno controllare: set uguale all'app; nella scheda Chat dei notebook interrogati la
domanda compare in coda; almeno due citazioni per quesito corrispondono a fonti reali (aprire il
notebook e verificare il titolo della fonte); file di risposta completo nella cartella privata;
tempo totale annotato.

- [ ] **Step 4: Commit**

```bash
git add skills/chiedi/SKILL.md
git commit -m "Skill /chiedi: quesito in testo libero → set del router → interroga.js → sintesi con citazioni

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Revisione e chiusura

- [ ] **Step 1:** Revisione del codice sull'intero lavoro del prototipo (sicurezza della guardia sui comandi, gestione errori, nessun dato personale nelle fixture o nei commit).
- [ ] **Step 2:** `ruby genera.rb --check && node --test` → tutto verde; `git log -p` degli ultimi commit senza output reali di `list` né credenziali.
- [ ] **Step 3:** Chiedere all'utente se pubblicare (push) i commit su GitHub. L'app web non cambia comportamento.

---

## Copertura della spec (self-review)

| Requisito della spec | Task |
|---|---|
| Traduzione testo libero → voci del registry, conferma del set | 3 (skill) |
| `route()` come l'app, stop su avvisi bloccanti | 2 |
| Nomi → ID per nome esatto, stop se assente/doppio | 2 |
| Interrogazione in sequenza, domanda "Usando SOLO questo notebook" | 2 |
| Domande in coda, mai `--new`, guardia sui comandi | 2 (guardia + test), 1 (verifica reale) |
| Errori: login, notebook in errore, senza citazioni, limiti | 2 (test), 3 (resa nella sintesi) |
| Sintesi con [notebook: fonte], discordanze, "non presente nelle fonti" | 3 |
| Salvataggio fuori dal repo | 3 |
| Prova preliminare su "router-test" | 1 |
| Test senza Google con esecutore finto, dentro `node --test` e hook | 2 |
| Verifica su NIFTP, gastrite, endometrio | 3 |
| Uso in mobilità via Remote Control, niente PC aziendali | Global Constraints (nessun codice) |
