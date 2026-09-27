const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const REG = require("../registry.js");
const { interroga, controllaArgomenti, domandaPerNotebook } = require("../interroga.js");
const { route } = require("../router.js");

const FIX = (f) => fs.readFileSync(path.join(__dirname, "fixtures", "notebooklm", f), "utf8");
const TIROIDE = { sede: "Tiroide", natura: "neoplastica", tipo: "entita", x: "NIFTP" };
const TIROIDE_DDX = { sede: "Tiroide", natura: "neoplastica", tipo: "ddx", x: "NIFTP", y: "IEFVPTC" };

// Esecutore finto: registra le chiamate e risponde per comando.
function finto(opz = {}) {
  const chiamate = [], avviate = [], arrivi = [];
  const esegui = (args) => {
    controllaArgomenti(args);
    chiamate.push(args);
    const [cmd] = args;
    if (cmd === "auth") return { status: opz.authFallisce ? 1 : 0, stdout: "{}", stderr: "" };
    if (cmd === "list") {
      if (opz.listAuth) return { status: 1, stdout: '{"error": true, "code": "AUTH_ERROR", "message": "x"}', stderr: "" };
      return { status: 0, stdout: opz.list || FIX("list.json"), stderr: "" };
    }
    if (cmd === "source") {
      if (opz.sourceFallisce) return { status: 1, stdout: "", stderr: "errore" };
      return { status: 0, stdout: FIX("source-list.json"), stderr: "" };
    }
    if (cmd === "ask") {
      const id = args[args.indexOf("-n") + 1];
      if (opz.ritardi) {
        avviate.push(id);
        const pronta = { status: 0, stdout: FIX("ask.json"), stderr: "" };
        return new Promise((ok) => setTimeout(() => { arrivi.push({ id, avviateFinora: avviate.length }); ok(pronta); }, opz.ritardi[id] || 0));
      }
      if (opz.askErrore === id) return { status: 1, stdout: "", stderr: "timeout" };
      if (opz.askNonJson === id) return { status: 0, stdout: "non json", stderr: "" };
      return { status: 0, stdout: opz.senzaRiferimenti ? FIX("ask-senza-riferimenti.json") : FIX("ask.json"), stderr: "" };
    }
    throw new Error("comando inatteso nel finto: " + cmd);
  };
  return { esegui, chiamate, arrivi };
}

test("interroga i notebook del set, in ordine, con domanda per singolo notebook", async () => {
  const f = finto();
  const out = await interroga(TIROIDE, REG, f.esegui);
  assert.equal(out.stato, "ok");
  const asks = f.chiamate.filter((a) => a[0] === "ask");
  assert.deepEqual(asks.map((a) => a[a.indexOf("-n") + 1]), ["nb-orl", "nb-rosai"]); // entità: senza IIC
  assert.ok(asks[0][1].startsWith("Domanda indipendente dalle precedenti: usando SOLO questo notebook (\"ORL\")"), asks[0][1]);
  assert.ok(asks[0][1].includes("relativi a: NIFTP."));
  assert.ok(asks[0].includes("--json"));
});

test("riferimenti convertiti in titoli delle fonti", async () => {
  const out = await interroga(TIROIDE, REG, finto().esegui);
  const r = out.risposte[0];
  assert.equal(r.testo.startsWith("La NIFTP"), true);
  assert.deepEqual(r.riferimenti.map((x) => x.fonte), ["Tumori della tiroide low risk", "Capitolo di prova tiroide.pdf"]);
  assert.equal(r.riferimenti[0].numero, 1);
  assert.equal(r.riferimenti[0].estratto, "incapsulata o ben demarcata");
});

test("un notebook in errore non ferma gli altri", async () => {
  const out = await interroga(TIROIDE, REG, finto({ askErrore: "nb-rosai" }).esegui);
  assert.equal(out.stato, "ok");
  assert.match(out.risposte[1].errore, /ask fallito/);
  assert.equal(out.risposte[0].errore, null);
});

test("output non JSON su un notebook → errore solo per quel notebook", async () => {
  const out = await interroga(TIROIDE_DDX, REG, finto({ askNonJson: "nb-iic" }).esegui);
  assert.match(out.risposte[2].errore, /non JSON/);
  assert.equal(out.risposte[0].errore, null);
});

test("login non valido → nessuna domanda", async () => {
  const f = finto({ authFallisce: true });
  const out = await interroga(TIROIDE, REG, f.esegui);
  assert.equal(out.stato, "login");
  assert.ok(out.avvisi.some((a) => /notebooklm login/.test(a)));
  assert.equal(f.chiamate.filter((a) => a[0] === "ask").length, 0);
});

test("notebook non trovato o doppio → fermo, nessuna domanda", async () => {
  const senzaIic = JSON.stringify({ notebooks: [{ id: "nb-orl", title: "ORL" }, { id: "nb-rosai", title: "ROSAI 2018" }] });
  const f1 = finto({ list: senzaIic });
  const o1 = await interroga(TIROIDE_DDX, REG, f1.esegui);
  assert.equal(o1.stato, "fermo");
  assert.ok(o1.avvisi.some((a) => /non trovato: IMMUNOISTOCHIMICA/.test(a)));
  assert.equal(f1.chiamate.filter((a) => a[0] === "ask").length, 0);
  const doppio = JSON.stringify({ notebooks: [{ id: "a", title: "ORL" }, { id: "b", title: "ORL" }, { id: "nb-rosai", title: "ROSAI 2018" }, { id: "nb-iic", title: "IMMUNOISTOCHIMICA" }] });
  const o2 = await interroga(TIROIDE, REG, finto({ list: doppio }).esegui);
  assert.ok(o2.avvisi.some((a) => /ambiguo: ORL/.test(a)));
});

test("avvisi del motore → fermo senza chiamare notebooklm", async () => {
  const f = finto();
  const out = await interroga({ sede: "Polmone", tipo: "entita", x: "a" }, REG, f.esegui);
  assert.equal(out.stato, "fermo");
  assert.equal(f.chiamate.length, 0);
});

test("risposta senza riferimenti → nessuna chiamata source list", async () => {
  const f = finto({ senzaRiferimenti: true });
  const out = await interroga(TIROIDE, REG, f.esegui);
  assert.deepEqual(out.risposte[0].riferimenti, []);
  assert.equal(f.chiamate.filter((a) => a[0] === "source").length, 0);
});

test("testo con virgolette, a capo e trattino arriva intatto come un solo argomento", async () => {
  const f = finto();
  const x = '-l\'entità "strana"\nseconda riga';
  await interroga({ ...TIROIDE, x }, REG, f.esegui);
  const ask = f.chiamate.find((a) => a[0] === "ask");
  assert.ok(ask[1].includes('relativi a: -l\'entità "strana"\nseconda riga.'), ask[1]);
  assert.equal(ask.length, 5); // ask, domanda, -n, id, --json
});

test("guardia: comandi e opzioni vietati", async () => {
  for (const a of [["ask", "x", "--new"], ["ask", "x", "-c", "c1"], ["ask", "x", "--save-as-note"], ["configure", "--mode", "x"], ["delete", "-n", "a"], ["history", "--clear"], ["source", "add", "x"], ["auth", "logout"]]) {
    assert.throws(() => controllaArgomenti(a), /non ammess|vietat/, a.join(" "));
  }
  for (const a of [["auth", "check", "--json"], ["list", "--json"], ["source", "list", "-n", "a", "--json"], ["ask", "q", "-n", "a", "--json"]]) {
    assert.doesNotThrow(() => controllaArgomenti(a));
  }
});

test("domandaPerNotebook sostituisce il prefisso dell'app", async () => {
  const r = route(TIROIDE, REG);
  const d = domandaPerNotebook(r, REG, "ORL");
  assert.ok(d.startsWith('Domanda indipendente dalle precedenti: usando SOLO questo notebook ("ORL") e sulla base delle sue fonti, descrivi'));
  assert.ok(!d.includes('"ROSAI 2018"'));
});

test("sessione scaduta (list risponde AUTH_ERROR) → stato login, nessuna domanda", async () => {
  const f = finto({ listAuth: true });
  const out = await interroga(TIROIDE, REG, f.esegui);
  assert.equal(out.stato, "login");
  assert.equal(f.chiamate.filter((a) => a[0] === "ask").length, 0);
});

test("guardia a elenco chiuso: forme non previste rifiutate", async () => {
  for (const a of [["ask", "--new", "-n", "x", "--json"], ["ask", "q", "-n", "x", "--json", "-s", "s1"], ["ask", "q", "--prompt-file", "f", "-n", "x", "--json"], ["list", "--foo"], ["auth", "check", "--test"], ["ask", "q", "-n", "--new", "--json"], ["source", "list", "-n", "x"]]) {
    assert.throws(() => controllaArgomenti(a), /non ammess|vietat/, a.join(" "));
  }
});

test("segnaposti non compilati → fermo, nessuna chiamata", async () => {
  const f = finto();
  const out = await interroga({ sede: "Tiroide", natura: "neoplastica", tipo: "ddx", x: "NIFTP" }, REG, f.esegui);
  assert.equal(out.stato, "fermo");
  assert.ok(out.avvisi.some((a) => /\{Y\}/.test(a)));
  assert.equal(f.chiamate.length, 0);
});

test("source list in errore: la risposta resta, fonti non risolte e segnalate", async () => {
  const out = await interroga(TIROIDE, REG, finto({ sourceFallisce: true }).esegui);
  const r = out.risposte[0];
  assert.equal(r.errore, null);
  assert.ok(r.testo.startsWith("La NIFTP"));
  assert.equal(r.riferimenti[0].fonte, null);
  assert.match(r.errore_fonti, /source list/);
});

test("parallelo: tutte le domande partono prima che arrivi la prima risposta", async () => {
  const f = finto({ ritardi: { "nb-orl": 30, "nb-rosai": 10, "nb-iic": 20 } });
  const out = await interroga(TIROIDE_DDX, REG, f.esegui);
  assert.equal(out.stato, "ok");
  assert.equal(f.arrivi.length, 3);
  assert.equal(f.arrivi[0].avviateFinora, 3);
});

test("parallelo: le risposte restano nell'ordine del set, non di arrivo", async () => {
  const f = finto({ ritardi: { "nb-orl": 30, "nb-rosai": 10, "nb-iic": 20 } });
  const out = await interroga(TIROIDE_DDX, REG, f.esegui);
  assert.deepEqual(f.arrivi.map((a) => a.id), ["nb-rosai", "nb-iic", "nb-orl"]);
  assert.deepEqual(out.risposte.map((r) => r.name), ["ORL", "ROSAI 2018", "IMMUNOISTOCHIMICA"]);
});

test("stesso ID per due notebook del set → fermo, nessuna domanda", async () => {
  const stessoId = JSON.stringify({ notebooks: [{ id: "x", title: "ORL" }, { id: "x", title: "ROSAI 2018" }] });
  const f = finto({ list: stessoId });
  const out = await interroga(TIROIDE, REG, f.esegui);
  assert.equal(out.stato, "fermo");
  assert.ok(out.avvisi.some((a) => /stesso notebook/.test(a)), out.avvisi.join(" | "));
  assert.equal(f.chiamate.filter((a) => a[0] === "ask").length, 0);
});
