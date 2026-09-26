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
const TIMEOUT_MS = 150000; // per chiamata: 3 notebook restano entro i 10 minuti dello strumento Bash

// Elenco chiuso delle sole forme ammesse (solo lettura + ask in coda). Qualunque altra forma —
// in particolare --new, che cancella la conversazione del notebook — viene rifiutata.
const libero = (v) => typeof v === "string" && v !== "" && !v.startsWith("-");
function controllaArgomenti(a) {
  const ok =
    (a.length === 3 && a[0] === "auth" && a[1] === "check" && a[2] === "--json") ||
    (a.length === 2 && a[0] === "list" && a[1] === "--json") ||
    (a.length === 5 && a[0] === "source" && a[1] === "list" && a[2] === "-n" && libero(a[3]) && a[4] === "--json") ||
    (a.length === 5 && a[0] === "ask" && libero(a[1]) && a[2] === "-n" && libero(a[3]) && a[4] === "--json");
  if (!ok) throw new Error("comando notebooklm non ammesso: " + a.map((x) => (x.length > 40 ? x.slice(0, 40) + "…" : x)).join(" "));
}

function eseguiReale(bin) {
  return (args) => {
    controllaArgomenti(args);
    const r = spawnSync(bin, args, { encoding: "utf8", timeout: TIMEOUT_MS });
    if (r.error) return { status: 1, stdout: "", stderr: r.error.code === "ETIMEDOUT" ? "timeout" : String(r.error.message) };
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
  const prefissoApp = reg.prefisso_domanda.replace("{NOTEBOOK}", () => elencoNotebook(r.notebook.map((n) => n.name)));
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
  const mancanti = r.domanda.match(/\{\w+\}/g);
  if (mancanti) {
    out.stato = "fermo";
    out.avvisi.push("Completa prima di interrogare: " + Array.from(new Set(mancanti)).join(", "));
    return out;
  }
  if (esegui(["auth", "check", "--json"]).status !== 0) {
    out.stato = "login";
    out.avvisi.push("Login NotebookLM non valido: esegui 'notebooklm login'.");
    return out;
  }
  let elenco;
  try {
    const l = esegui(["list", "--json"]);
    if (l.status !== 0 && /AUTH_ERROR/.test(l.stdout)) {
      out.stato = "login";
      out.avvisi.push("Sessione NotebookLM scaduta: esegui 'notebooklm login'.");
      return out;
    }
    if (l.status !== 0) throw new Error("list fallito (codice " + l.status + ")");
    elenco = estraiNotebook(leggiJson(l.stdout, "list"));
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
    const risposta = { name: n.name, id: ids[n.name], testo: null, riferimenti: [], errore: null, errore_fonti: null };
    try {
      const a = esegui(["ask", domandaPerNotebook(r, reg, n.name), "-n", ids[n.name], "--json"]);
      if (a.status !== 0) throw new Error("ask fallito (codice " + a.status + (a.stderr === "timeout" ? ", timeout" : "") + ")");
      Object.assign(risposta, estraiRisposta(leggiJson(a.stdout, "ask")));
    } catch (e) {
      risposta.errore = e.message;
    }
    if (!risposta.errore && risposta.riferimenti.length) {
      // La risposta è già nella chat: un errore sui titoli delle fonti non deve cancellarla.
      try {
        const s = esegui(["source", "list", "-n", ids[n.name], "--json"]);
        if (s.status !== 0) throw new Error("source list fallito (codice " + s.status + ")");
        const fonti = estraiFonti(leggiJson(s.stdout, "source list"));
        for (const x of risposta.riferimenti) {
          const f = fonti.find((z) => z.id === x.fonte_id);
          x.fonte = f ? f.titolo : null;
        }
      } catch (e) {
        risposta.errore_fonti = e.message;
      }
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
