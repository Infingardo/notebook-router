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
  Quesito su un marcatore, un pannello o un punteggio IHC (es. HER2, p53, Ki67) → "marcatore", non
  "entita" (che esclude IMMUNOISTOCHIMICA).
- `x`, `y`: le entità, testo breve.

## 2. Mostra il set e aspetta l'ok
Scrivi il JSON in un file temporaneo fuori dal repo (mai tra apostrofi nella shell: i nomi
italiani contengono apostrofi) ed esegui dalla cartella del repo, senza interrogare nulla:
```bash
f=$(mktemp) && cat > "$f" <<'EOF'
{"sede": "...", "natura": "...", "tipo": "...", "campione": "...", "x": "...", "y": "..."}
EOF
cd ~/Documents/Progetti/notebook-router && node -e 'const R=require("./registry.js");const {route}=require("./router.js");console.log(JSON.stringify(route(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")),R),null,2))' "$f"
```
Mostra all'utente: traduzione (sede, natura, tipo, X/Y), notebook con condiviso/privato, motivi,
avvisi **e la domanda (`domanda`) che verrà inviata**. Se ci sono avvisi bloccanti, nessun
notebook o segnaposti `{X}`/`{Y}` rimasti nella domanda, chiedi il dato mancante. **Aspetta un ok
esplicito** prima del passo 3: le domande inviate restano nella chat dei notebook e non si
possono togliere.

## 3. Interroga
`cd ~/Documents/Progetti/notebook-router && node interroga.js "$f"` — con lo strumento Bash usa
`timeout: 600000` (la corsa dura 4–5 minuti). Se si interrompe, **non rilanciare alla cieca**: le
domande già inviate sono nella chat; chiedi all'utente se ripetere. Uscita:
- `stato: "login"` → di' all'utente di eseguire `~/.venvs/notebooklm/bin/notebooklm login` e fermati.
- `stato: "fermo"` → mostra gli avvisi e fermati.
- `stato: "ok"` → passo 4. Le domande sono state aggiunte in coda alla chat di ciascun notebook.

## 4. Sintesi (regole fisse)
Ordine: morfologia → immunoistochimica → molecolare (solo le parti pertinenti al quesito).
- Ogni affermazione porta `[NOTEBOOK: fonte]`. Collegamento: nel `testo` di un notebook il
  marcatore `[N]` (anche `[1, 2]` o `[3-5]`, da espandere) corrisponde all'elemento di
  `riferimenti` con `numero === N`; la fonte è il suo `fonte` (se null: `[NOTEBOOK: fonte n. N]`).
  Un'affermazione senza marcatore nel testo di origine non ha citazione. Se `errore_fonti` è
  valorizzato, i titoli non sono stati risolti: usa `[NOTEBOOK: fonte n. N]`.
- Nessuna affermazione senza fonte; nessuna aggiunta dalla tua conoscenza. Ciò che nessun notebook
  riporta: "non presente nelle fonti".
- Notebook con `errore`: "NOTEBOOK: non interrogato (motivo)".
- Risposte senza riferimenti strutturati ma con citazioni nel testo del tipo "[Fonte: …]" (alcuni
  notebook, es. ORL, impongono questo formato): riportale come `[NOTEBOOK: titolo — citazione
  testuale, non verificata]`; il titolo può non coincidere con quello reale della fonte.
  Risposte senza nessuna citazione: "NOTEBOOK: risposta non verificabile sulle fonti".
- Tempi: circa 1–1,5 minuti per notebook (4–5 minuti per un set di 3); avvisa l'utente all'inizio.
- Discordanze tra notebook: riporta entrambe le versioni con le rispettive fonti.
- Se il set include ROSAI 2018 o Fletcher 2021 senza topico aggiornato, ricorda che precedono la
  WHO 5ª ed.

## 5. Salva
Crea `~/Documents/Progetti/notebook-router-risposte/AAAA-MM-GG-<argomento-breve>.md` con:
quesito originale, traduzione, notebook e motivi, sintesi, poi per ogni notebook la risposta
grezza (`testo`) e l'elenco dei riferimenti (numero, fonte, estratto). Mai nel repo.
Mostra all'utente la sintesi e il percorso del file.
