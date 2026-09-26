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
