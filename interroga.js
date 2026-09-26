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
