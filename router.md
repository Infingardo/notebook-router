# Router — logica di selezione notebook (Stadio 1, zero automazione)

> Fonte di verità: `registry.yaml`. In caso di conflitto vale il registry.
> `BIGINO-routing-portatile.md` e `registry.js` sono GENERATI: modificare il registry e poi
> eseguire `ruby genera.rb` (`--check` verifica l'allineamento). L'app web è `index.html`.
> Un hook di pre-commit blocca i commit disallineati o con test falliti (attivarlo una volta per
> clone: `git config core.hooksPath .githooks`).

Data una domanda, restituisce **l'insieme di notebook** da attaccare, con motivazione e confidenza.
Qui si valida solo la *qualità della scelta*, niente esecuzione.

## Algoritmo (due assi + generalisti a due livelli)

**Asse 1 — SEDE (organo).** Individua il distretto → seleziona il topico corrispondente (di norma 1).
- Disambiguazione: se più topici coprono la stessa area, preferisci il più **specifico**.
- Sede ambigua/multi-distretto → **top-2**, segnala "ambiguo".
- Precedenze (vedi `registry.yaml` → `precedenze`):
  - linfonodo sentinella → topico della sede del primitivo (es. MAMMELLA, DERMATOPATOLOGIA, ORL), non EMATOLOGIA;
    se il primitivo non è indicato → chiedi, non indovinare;
  - vasculite/arterite → VASCOLARE, anche in biopsia d'organo;
  - tumore vascolare → top-2 TESSUTI MOLLI + VASCOLARE;
  - melanoma oculare → OFTALMOLOGIA;
  - GIST → top-2 TESSUTI MOLLI + GASTROINTESTINALE;
  - prostata → UROPATOLOGIA + PDTA prostata (sempre in coppia: conta come un solo topico);
  - pancreas, incluso tumore neuroendocrino → GASTROINTESTINALE.
  - Se due precedenze si applicano insieme e portano a più di 2 topici → mostra i candidati e chiedi.
- Nessun topico copre la sede → **dichiaralo** ("nessun topico"), NON forzare il topico più vicino:
  - quesito su un TUMORE (es. ginecologia, osso, surrene, peritoneo) → aggiungi `Fletcher 2021`,
    con avviso: Fletcher (2021) e ROSAI (2018) precedono la WHO 5ª ed. → verificare nosologia e
    classificazioni molecolari (es. endometrio: POLEmut/MMRd/NSMP/p53abn e classificatori multipli);
  - quesito NON neoplastico (rene medico, polmone non neoplastico, neuropatologia non neoplastica)
    → aggiungi `Harrison 22 ed. Principi di Medicina Interna` (clinico: la morfologia resta a ROSAI);
  - mediastino/timo → nessun topico: solo i generalisti always (fonte di sede: ROSAI cap. 12), anche se tumore: Fletcher 2021 non ha un
    capitolo sul mediastino. Avviso: la risposta poggia su ROSAI 2018 (pre-WHO 5ª ed.).
  - Nessuna sede resta senza fonti: ROSAI copre i capitoli 1-45 (mancano 9 e 20).
- La copertura di un topico si legge dalle sue FONTI, non dal nome
  (es. `ORL` contiene la tiroide; `VASCOLARE` è per metà arteriti; `Fletcher 2021` è un trattato
  generale dei tumori, non di tessuti molli).

**Asse 2 — GENERALISTI.**
- **Always**: `ROSAI 2018` + `IMMUNOISTOCHIMICA` → sempre (default-include).
- **Conditional** (solo se scatta il trigger):
  - `Fletcher 2021` → quesito su un tumore la cui sede non ha topico.
  - `NGS al FBF` → solo test molecolari eseguibili in sede ("quale test posso fare/richiedere");
    NON per la biologia molecolare dell'entità (sta nel topico e in ROSAI).
    Regola di formulazione: "quali mutazioni **testare / richiedere**" → NGS sì;
    "quali mutazioni **caratterizzano** X" → NGS no (es. riga #6 qui sotto vs #12 in validazione.md).
  - `TNM - IX Edizione` → stadiazione/pTNM/margini, o refertazione di un pezzo operatorio
    (es. prostatectomia); NON su biopsia (es. Gleason/ISUP su agobiopsia).
  - `PDL-1` → quesito predittivo/immunoterapia (CPS/TPS).
  - `Marker e Radiomica nelle neoplasie` → solo radiomica/imaging (le fonti non trattano biomarcatori istologici).
  - nicchia (`Histological Atlas of Human Tissues`, `AI e Anatomia Patologica`) → solo se citati esplicitamente.
  - `Harrison 22 ed. Principi di Medicina Interna` → correlazione clinica esplicita (anche "significato
    nel quadro sistemico"), oppure quesito
    non neoplastico la cui sede non ha topico.

## Output atteso (per la conferma-a-un-click)
```
Notebook proposti: {ORL, ROSAI 2018, IMMUNOISTOCHIMICA}
Motivo: sede salivare → ORL;
        quesito morfologico → Rosai + IIC; nessun trigger molecolare/stadiazione/predittivo.
Confidenza sede: alta
```
Confidenza sede bassa → propone 2 topici e chiede di scegliere.

## Regola di sicurezza
Il set è SEMPRE mostrato con la motivazione prima dell'esecuzione; l'utente conferma o corregge (un click).
Intercetta l'unico errore che conta: topico sbagliato → risposta ancorata alle fonti sbagliate.

---

## Validazione — dimostrazione (da estendere con le tue 15–20 domande reali)

Legenda tabella: ROSAI = `ROSAI 2018`, IIC = `IMMUNOISTOCHIMICA`, TNM = `TNM - IX Edizione`.
Nell'output reale usare sempre i nomi ESATTI del registry.

| # | Domanda | Set proposto | Trigger cond. | Note |
|---|---------|--------------|---------------|------|
| 1 | Diagnosi di sialoadenite necrotizzante | ORL + ROSAI + IIC | — | ORL unico (salivari confluite) |
| 2 | Glioma IDH-wildtype: alterazioni molecolari da cercare | Cervello + ROSAI + IIC + **NGS al FBF** | test in sede | "da cercare" = quali test fare |
| 3 | Adenocarcinoma polmonare: PD-L1 per immunoterapia | POLMONE + ROSAI + IIC + **PDL-1** | predittivo | |
| 4 | Sarcoma pleomorfo dei tessuti molli: DDx | TESSUTI MOLLI + ROSAI + IIC | — | Fletcher non serve: la sede ha topico |
| 5 | Carcinoma del colon: refertazione pTNM e margini | GASTROINTESTINALE + ROSAI + IIC + **TNM** | stadiazione | |
| 6 | Melanoma vs nevo di Spitz: quali mutazioni testare in sede | DERMATOPATOLOGIA + ROSAI + IIC + **NGS al FBF** | test in sede | contrasto con validazione #12 ("quali caratterizzano" → no NGS) |
| 7 | Linfonodo: sospetto linfoma a grandi cellule B | EMATOLOGIA + ROSAI + IIC | — | STEP 0 topografico (linfonodo) |
| 8 | Lesione fusata dei tessuti molli del volto | **top-2**: TESSUTI MOLLI + DERMATOPATOLOGIA + ROSAI + IIC | — | sede ambigua → conferma (massimo 2 topici) |
| 9 | Carcinoma endometrioide dell'endometrio: DDx con sieroso | **nessun topico** → ROSAI + IIC + **Fletcher 2021** | neoplastico senza topico | ginecologia |

Criterio di successo stadio 1: sul tuo set reale l'asse SEDE è corretto (o correttamente
segnalato ambiguo) nella grande maggioranza dei casi, e i trigger condizionali scattano
quando servono. Se regge → stadio 3 (automazione).
