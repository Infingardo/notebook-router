# Prototipo "interroga" (Stadio 3) — design

Data: 26 set 2026. Stato: approvato in sessione, da rileggere prima del piano.

## Scopo

Da Claude Code, sul Mac personale dell'utente, porre un quesito di anatomia patologica in testo
libero e ottenere una risposta fondata sulle fonti dei notebook NotebookLM, senza il giro manuale
in Gemini. Il set di notebook è scelto con le stesse regole dell'app web (`router.js` +
`registry.js`); i notebook sono interrogati con lo strumento non ufficiale `notebooklm-py`
(`notebooklm ask --json`). L'app web resta invariata.

Solo materiale anonimo o di studio: mai dati di paziente.

Criterio di successo: sui quesiti di prova (NIFTP → ORL; gastrite linfocitica →
GASTROINTESTINALE; endometrio → Fletcher) il prototipo propone lo stesso set dell'app, interroga
solo quei notebook, e ogni affermazione della sintesi è ricondotta a una fonte reale (verifica a
campione aprendo il notebook).

## Decisioni prese

- Input in testo libero; Claude lo traduce in sede/natura/tipo/X/Y e chiede conferma del set
  prima di interrogare.
- Output: sintesi unica con citazioni [notebook: fonte] + risposte grezze di ciascun notebook.
- Salvataggio di ogni quesito come Markdown in una cartella privata fuori dal repo.
- Approccio A: parte deterministica in uno script Node testato, parte di giudizio in una skill.
- Solo Mac personale. Uso in mobilità tramite Remote Control di Claude Code (credenziali e script
  restano sul Mac). Niente installazione su PC aziendali.

## 1. Componenti e flusso

Nel repo (pubblico — solo codice e istruzioni):
- **`interroga.js`** (Node, nessuna dipendenza). Input: JSON `{sede, primitivo, natura, tipo,
  campione, x, y}` (da file o stdin). Passi:
  1. `route()` come l'app; se ci sono avvisi bloccanti (nessun notebook o domanda vuota) si
     ferma e li restituisce.
  2. Risolve i nomi in ID con `notebooklm list --json`, per nome esatto; nome assente o doppio →
     errore, nessuna ipotesi.
  3. Interroga i notebook **in sequenza**, uno per volta, con la domanda dell'app adattata:
     "Usando SOLO questo notebook …" al posto dell'elenco dei notebook.
  4. Output JSON: set, motivi, avvisi, e per ogni notebook `{name, id, risposta, riferimenti,
     errore}`.
- **`.claude/skills/chiedi/SKILL.md`** — istruzioni per `/chiedi <quesito>`: traduzione del testo
  nelle voci reali del registry; presentazione del set + motivo e attesa dell'ok; esecuzione di
  `interroga.js`; sintesi (morfologia → IIC → molecolare) con [notebook: fonte] e discordanze
  esplicite; salvataggio del file.

  Nota: oggi `.claude/` è escluso dal repo (`.gitignore`). La skill va quindi tenuta in un
  percorso versionato (es. `skills/chiedi/SKILL.md`) e collegata a `.claude/skills/` in locale;
  la scelta esatta è rimandata al piano.

Fuori dal repo:
- `~/Documents/Progetti/notebook-router-risposte/AAAA-MM-GG-<argomento>.md`: quesito, set,
  sintesi, risposte grezze, data.
- `notebooklm-py` in un ambiente Python isolato e il login Google, fatto dall'utente
  (`notebooklm login`).
- Nessun file di stato: le domande vanno in coda alla chat di ciascun notebook (vedi sezione 2).

Flusso:
```
/chiedi "criteri NIFTP"
 → Claude: sede=Tiroide, natura=neoplastica, tipo=entita, X=NIFTP → set ORL+ROSAI+IIC → ok utente
 → interroga.js → notebooklm ask ×3 (in sequenza)
 → Claude: sintesi con citazioni + risposte grezze → file salvato
```

## 2. Errori e sicurezza

Conversazioni NotebookLM (rischio principale): dal codice di `notebooklm-py`, `ask` senza
`-c` prosegue la conversazione più recente del notebook (la chat visibile in NotebookLM);
`ask --new` la **cancella** definitivamente; non risulta un modo per aprire una conversazione
separata senza cancellare la precedente (da confermare nella prova preliminare).
Decisione dell'utente (26 set 2026): le domande del router vengono **aggiunte in coda** alla
chat esistente di ciascun notebook; nulla viene cancellato.
- Lo script usa solo i comandi `auth check`, `list`, `source list`, `ask` (senza `--new`,
  `-c`, `--save-as-note`) e rifiuta qualunque altro comando o opzione (in particolare `--new`,
  `configure`, `delete`, `history`).
- Ogni domanda inizia con "Domanda indipendente dalle precedenti:" per ridurre l'effetto delle
  domande già presenti nella chat.
- La prova preliminare si fa su un notebook di test ("router-test"), non sui notebook di
  patologia.

| Situazione | Comportamento |
|---|---|
| Login scaduto | Stop iniziale (`notebooklm auth check`), messaggio: rifare `notebooklm login` |
| Nome notebook assente o doppio | Stop, mostra il nome, nessuna ipotesi |
| Timeout/errore di un notebook | Gli altri proseguono; nella sintesi "non interrogato", senza sostituirlo con conoscenza di Claude |
| Risposta senza citazioni | Tenuta, marcata "non verificabile sulle fonti" |
| Avvisi del motore (sede/natura mancante, sentinella senza primitivo…) | Nessuna interrogazione; Claude chiede il dato mancante |
| Limiti di frequenza | Una domanda per notebook per quesito, in sequenza, nessun retry aggressivo |

Regole fisse della sintesi (nella skill): nessuna affermazione senza [notebook: fonte]; ciò che
manca è "non presente nelle fonti"; discordanze tra notebook riportate con entrambe le versioni.

Privacy: risposte e ID di conversazione fuori dal repo; lo script non registra credenziali; la
skill ricorda il divieto di dati di paziente.

## 3. Test e ordine di lavoro

1. **Prova preliminare** (con l'utente presente): installazione di `notebooklm-py` in ambiente
   isolato; login dell'utente; su "router-test" verifica di formato di `list --json`, `source list --json` e `ask --json`,
   comportamento delle conversazioni (ask in coda, nessuna cancellazione), tempi di risposta. Se lo strumento non
   funziona o è instabile, ci si ferma qui.
2. **`interroga.js` in TDD**: i test non chiamano Google — `notebooklm` è sostituito da un finto
   eseguibile con output registrati nella prova. Casi: set corretto, conversione nomi→ID, notebook
   in errore, login scaduto, avvisi del motore, rifiuto di `--new`. Test nella suite `node --test`
   (e quindi nell'hook di pre-commit).
3. **Skill `/chiedi`**: verifica manuale su NIFTP, gastrite linfocitica, endometrio (set,
   corrispondenza delle citazioni alle fonti reali, file salvato completo).
4. Revisione del codice e commit. L'app web non cambia.

Tempi: misurati nella prova; oltre qualche minuto a quesito si rivaluta.

## Fuori da questa versione

Interrogazione parallela dei notebook; ripresa o prosecuzione di conversazioni; uso da PC
aziendali; generazione di podcast/slide; modifiche all'app web.

## Limiti noti

- `notebooklm-py` usa interfacce Google non documentate: può smettere di funzionare senza
  preavviso; uso probabilmente fuori dai termini di servizio (inferenza, non verificata).
- Il login salva sul Mac le credenziali di sessione dell'account Google.
- La traduzione del testo libero in sede/tipo è fatta da Claude: la conferma del set da parte
  dell'utente è il controllo che intercetta l'errore di sede.
