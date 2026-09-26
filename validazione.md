# Validazione router — Stadio 1

> I casi di questa pagina sono eseguiti come test automatici in `test/validazione.test.js`
> (traduzione esplicita in sede + natura + tipo di quesito). Aggiungere lì ogni nuovo caso reale.

Obiettivo: verificare che, sulle domande, il router scelga i notebook come li sceglieresti TU.
Istruzioni: scorri la colonna "Set proposto". Se è sbagliato, scrivi la correzione in "Verdetto".
Legenda always = ROSAI 2018 + IMMUNOISTOCHIMICA (sempre inclusi, non ripetuti sotto).
Abbreviazioni nelle tabelle: IIC = IMMUNOISTOCHIMICA, NGS = NGS al FBF, Harrison 22 ed = Harrison 22 ed.
Principi di Medicina Interna. Nell'output reale usare i nomi ESATTI del registry.

Criterio di successo: asse SEDE corretto (o correttamente segnalato ambiguo) nella grande
maggioranza; trigger condizionali che scattano quando servono. Se regge → stadio 3 (automazione).

| #  | Domanda | Set proposto (oltre always) | Trigger | Verdetto (tuo) |
|----|---------|------------------------------|---------|----------------|
| 1  | Sialoadenite necrotizzante: diagnosi | ORL | — | |
| 2  | Adenoma pleomorfo vs carcinoma ex-adenoma pleomorfo (parotide) | ORL | — | |
| 3  | Carcinoma squamoso laringeo: grading e fronte di invasione | ORL + **TNM - IX Edizione** | stadiazione | ✔ tuo: +TNM (confermato 26 set come eccezione voluta: grading e fronte di invasione del carcinoma squamoso = parametri di refertazione) |
| 4  | Glioblastoma IDH-wildtype: alterazioni molecolari da cercare | Cervello + **NGS al FBF** | test in sede | 26 set: pannello ha TERT, EGFR amp; NON +7/-10 → dice cosa chiedere a parte |
| 5  | Meningioma atipico vs anaplastico: criteri di grading | Cervello + **NGS al FBF** | test in sede | ✔ tuo: +NGS (pannello: TERT sì, delezione CDKN2A/B NO) |
| 6  | Carcinoma duttale infiltrante: stato HER2 e recettori ormonali | MAMMELLA | — (IIC basta) | |
| 7  | Carcinoma mammario: refertazione pTNM e stato dei margini | MAMMELLA + **TNM - IX Edizione** | stadiazione | |
| 8  | Sarcoma pleomorfo indifferenziato dei tessuti molli: DDx | TESSUTI MOLLI | — | ✔ (26 set: Fletcher è un trattato generale dei tumori → solo se la sede non ha topico) |
| 9  | Lipoma vs liposarcoma ben differenziato: ruolo di MDM2 | TESSUTI MOLLI | — | 26 set: tolto NGS (MDM2 non nel pannello → FISH; disponibilità in TESSUTI MOLLI "005") |
| 10 | Adenocarcinoma del colon: pTNM, margini, tumor budding | GASTROINTESTINALE + **TNM - IX Edizione** | stadiazione | |
| 11 | GIST gastrico: mutazioni KIT/PDGFRA | **top-2**: TESSUTI MOLLI + GASTROINTESTINALE + **NGS al FBF** | test in sede | KIT/PDGFRA nel pannello (predittivo); 26 set: GIST → precedenza top-2 |
| 12 | Melanoma vs nevo di Spitz: mutazioni e pannello IIC | DERMATOPATOLOGIA | — | 26 set: tolto NGS (quesito di biologia); se "quali test richiedere" → + NGS |
| 13 | Adenocarcinoma prostatico: Gleason/ISUP e refertazione | UROPATOLOGIA + PDTA prostata | TNM solo su pezzo operatorio | ✔ tuo (26 set): TNM se prostatectomia/pezzo operatorio o se nomini stadiazione/pTNM/margini; su biopsia no |
| 14 | Carcinoma uroteliale: infiltrazione della muscolare propria (pT) | UROPATOLOGIA + **TNM - IX Edizione** | stadiazione | |
| 15 | Adenocarcinoma polmonare: PD-L1 per immunoterapia | POLMONE + **PDL-1** | predittivo | |
| 16 | Adenocarcinoma polmonare: EGFR/ALK per terapia target | POLMONE + **NGS al FBF** | test in sede | caso-tipo "terapia target" |
| 17 | Melanoma uveale: fattori prognostici (BAP1, monosomia 3) | OFTALMOLOGIA | — | 26 set: tolto NGS (BAP1 e monosomia 3 non nel pannello) |
| 18 | Angiosarcoma cutaneo vs emangioma: DDx | **top-2**: TESSUTI MOLLI + VASCOLARE | precedenza (tumore vascolare) | 26 set: tumori vascolari soprattutto in TESSUTI MOLLI (cap. 20-23) |
| 19 | Epatite autoimmune: pattern istologico e DDx | GASTROINTESTINALE | — | fegato confluito in GI |
| 20 | Linfoadenopatia: sospetto linfoma di Hodgkin classico | EMATOLOGIA | — (STEP 0 linfonodo) | |
| 21 | Fascite nodulare vs sarcoma: come non sovradiagnosticare | TESSUTI MOLLI | — | |
| 22 | Vasculite in biopsia renale: significato nel quadro sistemico | VASCOLARE + **Harrison 22 ed** | clinico_esplicito | ✔ tuo (26 set): "quadro sistemico" = richiesta clinica → Harrison. UROPATOLOGIA non copre il rene medico |

Note di validazione (tutte chiuse al 26 set 2026):
- 26 set 2026: righe NGS riviste col trigger "test in sede" e il contenuto del pannello Diatech:
  tengono NGS #4, #5, #11, #16; tolto da #9, #12, #17.
- 26 set 2026, dopo revisione Codex: confermati dall'utente NGS su #4/#5/#11/#16, TNM su #3,
  tumore neuroendocrino del pancreas → GASTROINTESTINALE, PitNET → Cervello.

## Test reali in Gemini (26 set 2026, notebook attaccati dal "+")
| Quesito | Set | Esito |
|---------|-----|-------|
| AciCC vs carcinoma secretorio (parotide) | ORL + ROSAI + IIC + NGS (set scelto prima della restrizione NGS; oggi senza NGS) | ✔ risposta con fonti (1° invio fallito, reinvio ok); fusioni e NR4A3 corretti |
| NIFTP vs PTC variante follicolare invasiva | ROSAI + IIC + NGS ("nessun topico") | ✘ router: tiroide è in ORL → topico mancato; risposta solo da ROSAI 2018, confonde forma incapsulata invasiva (RAS-like) con infiltrativa (BRAF-like) |
| idem (dopo correzione) | ORL + ROSAI + IIC | ✔ fonti MD di ORL; imposta NIFTP vs IEFVPTC (entrambe RAS-like, discrimina solo l'invasione, campionare tutta la capsula); IIC non discriminante dichiarato |
| Endometrioide G3 vs sieroso dell'endometrio (26 set) | ROSAI + IIC + **Fletcher 2021** ("nessun topico", tumore) | ✔ ramo Fletcher: cita Fletcher cap. 13, Rosai cap. 33, Kaspar-Crum 2015 (IIC). ✘ usa la tassonomia genomica TCGA ma non il classificatore surrogato clinico (POLEmut/MMRd/NSMP/p53abn, FIGO 2023) né la regola dei classificatori multipli; grading FIGO impreciso |
