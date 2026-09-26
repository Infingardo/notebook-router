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
    return modello.replace(/\{(\w+)\}/g, (segnaposto, chiave) => {
      if (!Object.prototype.hasOwnProperty.call(valori, chiave)) return segnaposto;
      if (valori[chiave] == null) return segnaposto;
      const v = String(valori[chiave]).trim();
      return v !== "" ? v : segnaposto;
    });
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
    let natura;
    if (voce.speciale === "sentinella") {
      const prim = reg.sedi_menu.find((v) => v.voce === input.primitivo && !v.speciale && !v.non_primitivo);
      if (!prim) { out.avvisi.push(reg.testi_app.sentinella_senza_primitivo); return out; }
      out.motivi.push("linfonodo sentinella → sede del primitivo: " + prim.voce);
      sede = prim;
      natura = "neoplastica"; // il linfonodo sentinella è per definizione oncologico
    } else {
      if (input.natura !== "neoplastica" && input.natura !== "non_neoplastica") {
        out.avvisi.push(reg.testi_app.natura_mancante);
        return out;
      }
      natura = input.natura;
    }

    // 2. Topici o "nessun topico"
    const nonNeo = natura === "non_neoplastica";
    const topici = nonNeo && Array.isArray(sede.topici_non_neoplastico) ? sede.topici_non_neoplastico : sede.topici;
    if (topici.length) {
      topici.forEach(aggiungi);
      out.motivi.push(
        sede.precedenza
          ? "sede: " + sede.precedenza
          : "sede " + sede.voce + " → " + topici.join(" + ")
      );
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
    if (!tipo) { out.avvisi.push(reg.testi_app.tipo_mancante); return out; }

    const campione = tipo.campione ? reg.campioni.find((c) => c.id === input.campione) : null;
    if (tipo.campione && !campione) out.avvisi.push(reg.testi_app.campione_mancante);
    const chiavi = [tipo.id].concat(campione ? [tipo.id + ":" + campione.id] : []);
    reg.generalisti_conditional.forEach((g) => {
      if ((g.tipi || []).some((t) => chiavi.includes(t))) {
        if (g.solo_neoplastico && natura === "non_neoplastica") {
          out.motivi.push(g.name + " escluso: quesito non neoplastico");
          return;
        }
        aggiungi(g.name);
        out.motivi.push("tipo \"" + tipo.label + "\"" + (campione ? " su " + campione.label : "") + " → " + g.name);
      }
    });

    // 5. Domanda: il prefisso nomina i notebook del set ({NOTEBOOK}), compilato a parte dal testo dell'utente
    const elenco = out.notebook.map((n) => '"' + n.name + '"');
    const notebook = elenco.length > 1 ? elenco.slice(0, -1).join(", ") + " e " + elenco[elenco.length - 1] : elenco.join("");
    out.domanda = compila(reg.prefisso_domanda, { NOTEBOOK: notebook }) +
      compila(tipo.modello, { X: input.x, Y: input.y, campione: campione ? campione.label : "" }) +
      " " + reg.suffisso_domanda;
    return out;
  }

  if (typeof module === "object" && module && module.exports) module.exports = { route: route };
  else globalThis.route = route;
})();
