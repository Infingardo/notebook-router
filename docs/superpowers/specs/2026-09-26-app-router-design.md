# App web del notebook-router — design

Data: 26 set 2026. Stato: approvato e implementato (ramo app-web).

## Scopo

Pagina web statica (GitHub Pages) che, dato un quesito di anatomia patologica descritto
tramite menu, propone quali notebook NotebookLM attaccare in Gemini e la domanda da
incollare. Utenti: l'autore e colleghi. Nessuna AI nell'app: le regole sono applicate in
modo deterministico a partire da `registry.yaml`, che resta l'unica fonte di verità
(anche per il BIGINO).

Criterio di successo: sui casi di `validazione.md` l'app produce lo stesso set approvato
dall'utente; nessuna voce di menu produce più di 2 topici o nomi di notebook inesistenti.

## Decisioni prese

- Motore: scelte guidate da menu (non testo libero, non API LLM).
- Utenti: io + colleghi → pubblicazione su GitHub Pages, repo pubblico.
- Architettura A: repo `notebook-router` pubblico, app in un solo `index.html`, dati
  generati da `registry.yaml`, nessuna dipendenza esterna, funziona anche da file locale.

## 1. Interfaccia

Input:
1. **Sede** — menu con ricerca, raggruppato per apparato, voci da `sedi_menu`.
   - Voce "Linfonodo sentinella" → secondo menu obbligatorio: sede del primitivo.
   - Voce "Altro / non in elenco" → nessun set; avviso "sede non mappata: chiedi, non inferire".
2. **Natura** — neoplastica / non neoplastica. Chiesta sempre e senza preselezione
   (nessun radio è marcato di default nell'interfaccia): finché l'utente non sceglie,
   il router mostra l'avviso `natura_mancante` e non propone un set. Eccezione: per il
   linfonodo sentinella i radio sono disabilitati e la natura è forzata a neoplastica
   dal motore. Alcune voci hanno topici solo per il neoplastico e possono avere
   `topici_non_neoplastico` (es. `[]` → nessun topico, + Harrison) che sovrascrive i
   `topici` di default quando il quesito non è neoplastico.
3. **Tipo di quesito** (uno): diagnosi differenziale; singola entità; test molecolare in
   sede; stadiazione pTNM/margini; refertazione (campione: biopsia | pezzo operatorio);
   predittivo PD-L1; radiomica; significato clinico-sistemico; istologia normale;
   AI in anatomia patologica.
4. **Entità X** (e **Y** per la diagnosi differenziale) — testo libero.

Output:
- Notebook da attaccare, nomi esatti, ciascuno con etichetta "condiviso"/"privato".
- Motivo: una riga per ogni passo del motore (sede → topico, trigger → condizionali).
- Avvisi quando pertinenti: fonte pre-WHO 5ª ed.; sentinella senza primitivo; sede non mappata.
- Domanda da incollare (modello per tipo di quesito) con pulsante Copia.
- Guida breve in fondo: note operative (attaccare dal "+" di Gemini, ecc.).

Esclusi (YAGNI): più tipi di quesito insieme, cronologia/salvataggi, account, statistiche,
traduzione, app mobile dedicata (la pagina resta leggibile su telefono).

## 2. Dati e motore

### Modifiche a `registry.yaml`
- **`sedi_menu`**: lista strutturata. Campi: `voce`, `gruppo`, `topici` (0–2 nomi di
  topico), opzionali `precedenza` (testo mostrato nel BIGINO), `senza_fletcher: true`
  (es. mediastino/timo), `speciale: sentinella | altro`, `topici_non_neoplastico`
  (sovrascrive `topici` quando la natura è non neoplastica; es. `[]` → nessun topico,
  + Harrison), `non_primitivo: true` (la voce non è selezionabile come primitivo nel
  menu del linfonodo sentinella: es. linfonodo, midollo, milza, sangue, citologie),
  `nota` (testo libero mostrato nel BIGINO accanto alla voce, es. la spiegazione del
  caso mediastino/timo).
  Sostituisce la lista in prosa `precedenze`: la sezione "Precedenze" del BIGINO è
  generata dalle voci con `precedenza`. La regola "più di 2 topici → chiedi" diventa un
  testo fisso del BIGINO e un vincolo di validazione.
- **`condiviso: true|false`** su ogni notebook (topici e generalisti), dall'audit NotebookLM.
- **`nota`** anche sui `topici`: testo libero mostrato nel BIGINO per chiarire i limiti di
  copertura del topico (es. Cervello: "solo neoplastico; neuropatologia non neoplastica
  NON coperta").
- **`tipi`** sui generalisti condizionali: tipi di quesito che li attivano.
  (NGS al FBF → test in sede; TNM → stadiazione, refertazione su pezzo operatorio;
  PDL-1 → predittivo; Marker e Radiomica → radiomica; Harrison → clinico-sistemico;
  Histological Atlas → istologia normale; AI e AP → AI.) Fletcher e Harrison hanno anche
  i trigger "nessun topico" già esistenti.
- **`solo_neoplastico: true`** sui generalisti condizionali oncologici (NGS al FBF, TNM,
  PDL-1, Marker e Radiomica): il generalista non viene incluso, anche se il tipo di
  quesito lo attiverebbe, quando la natura effettiva del quesito è non neoplastica
  (natura dell'input, o "neoplastica" forzata per il linfonodo sentinella). Il router
  aggiunge un motivo esplicito "<nome> escluso: quesito non neoplastico".
- I modelli di domanda non sono in una sezione a parte: ogni voce di `tipi_quesito` ha
  il proprio campo `modello` (testo con segnaposti `{X}`, `{Y}`, `{campione}`), e la
  domanda finale è `prefisso_domanda + modello compilato + suffisso_domanda` (il prefisso contiene `{NOTEBOOK}`, sostituito con l'elenco dei notebook del set)
  (`prefisso_domanda`/`suffisso_domanda` sono due chiavi top-level del registry). La
  sezione fraseggio del BIGINO è generata da questi tre campi.
- Restano le liste `sede` (parole chiave) dei topici: usate dall'app come alias di
  ricerca per il menu (non dal BIGINO).

### Generatore `genera.rb` (sostituisce `genera_bigino.rb`)
- Scrive `BIGINO-routing-portatile.md` e `registry.js` (`const REGISTRY = {...}`; JS e
  non JSON perché `fetch` di un file locale è bloccato aprendo `index.html` da disco).
- Valida e si ferma con errore se: una voce ha > 2 topici; un nome di notebook non esiste;
  un tipo di quesito non ha modello; un generalista condizionale non ha `tipi` né trigger.
- `--check`: esce con 1 se uno dei due file generati non è allineato.

### Motore (`router.js`, funzione pura `route(input, registry)`)
1. Sede: voce → topici; `sentinella` → usa la voce del primitivo (assente → avviso, stop);
   `altro` → avviso, stop.
2. Nessun topico: neoplastica → + Fletcher 2021 (salvo `senza_fletcher`); non neoplastica
   → + Harrison 22 ed. Principi di Medicina Interna; in entrambi i casi avviso pre-WHO 5ª ed.
3. Sempre: ROSAI 2018 + IMMUNOISTOCHIMICA.
4. Tipo di quesito → generalisti condizionali con quel tipo in `tipi`
   (refertazione su biopsia: niente TNM).
5. Domanda: modello del tipo con X/Y/campione; segnaposti mancanti restano evidenziati.
Output: `{notebook: [{name, condiviso}], motivi: [], avvisi: [], domanda}`; senza duplicati.

## 3. Test, pubblicazione, errori

### Test (`test/`, `node --test`, nessuna dipendenza)
- Casi da `validazione.md` in forma strutturata (voce + tipo + natura → set atteso),
  incluse le eccezioni confermate (#3 TNM; NGS su #4/#5/#11/#16) e i test reali
  (tiroide → ORL; endometrio → Fletcher).
- Casi limite: sentinella senza primitivo; "altro"; mediastino tumorale senza Fletcher;
  TNM su biopsia vs pezzo operatorio; voci top-2.
- Proprietà: ogni voce di menu, con ogni tipo e natura, dà ≤ 2 topici e solo nomi esistenti.
- Hook pre-commit: `genera.rb --check` + `node --test`.

Nota: alcuni casi di validazione sono formulati come testo libero; la traduzione in
voce + tipo è una scelta del test e va resa esplicita nel file dei casi.

### Pubblicazione
1. Pulizia prima del push: via i commenti con nomi di notebook amministrativi/personali
   (resta "esclusi i notebook non diagnostici") e la nota sul formato del notebook di Harrison.
2. La cronologia git attuale contiene quei commenti. Scelta da fare al momento del push:
   (a) repo GitHub nuovo con un solo commit iniziale, cronologia completa solo in locale;
   (b) pubblicare la cronologia com'è.
3. Repo pubblico `Infingardo/notebook-router`, GitHub Pages su `main`, radice →
   `infingardo.github.io/notebook-router`. Push solo dopo ok esplicito dell'utente.

### Errori in pagina
- `registry.js` assente → messaggio "dati non caricati".
- X/Y mancanti → segnaposti evidenziati nella domanda.
- Sentinella senza primitivo / "altro" → nessun set, solo avviso.

## Limiti noti
- Le coperture dei topici derivano dai titoli delle fonti, non dal loro testo.
- `condiviso` va aggiornato a mano quando cambia la condivisione in NotebookLM.
- I colleghi possono usare solo i notebook condivisi via link.
- `router.md` ripete ancora le regole in prosa (subordinato al registry).
