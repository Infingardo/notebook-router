# Notebook router

App: https://infingardo.github.io/notebook-router/

Dato un quesito di anatomia patologica (sede, natura, tipo di quesito), propone quali notebook
NotebookLM attaccare in Gemini (dal "+" → Altri caricamenti → Notebooks) e la domanda da incollare.
Le regole sono deterministiche, senza AI. Solo materiale anonimo o di studio: mai dati di paziente.

I notebook marcati **privato** sono usabili solo dal proprietario; i colleghi possono attaccare
solo quelli **condivisi** via link.

## Come è fatto

- `registry.yaml` — unica fonte di verità (notebook, coperture, voci del menu, tipi di quesito).
- `genera.rb` — valida il registry e genera `registry.js` (dati dell'app) e
  `BIGINO-routing-portatile.md` (versione da incollare in un LLM). `ruby genera.rb --check`
  verifica che siano allineati.
- `router.js` — motore delle regole; `index.html` — interfaccia.
- `test/` — test con `node --test` (inclusi i casi di `validazione.md`).
- `router.md` — spiegazione della logica; `validazione.md` — casi e test reali in Gemini.

## Modificare le regole

1. Modifica `registry.yaml`.
2. `ruby genera.rb`
3. `node --test`
4. Commit (l'hook in `.githooks/` blocca commit disallineati o con test falliti;
   attivarlo una volta per clone con `git config core.hooksPath .githooks`).
