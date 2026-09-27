# Genera BIGINO-routing-portatile.md e registry.js da registry.yaml (unica fonte di verità).
# Uso: ruby genera.rb [--check] [--registry PATH] [--out DIR]
#   senza --check: valida il registry e scrive i due file
#   --check:       valida e esce con 1 se i file in --out non sono allineati
# Uscita: 0 ok, 1 file non allineati, 2 registry non valido (o argomenti non validi).
require "yaml"
require "json"

USO = "Uso: ruby genera.rb [--check] [--registry PATH] [--out DIR]".freeze
FLAG_CONOSCIUTI = %w[--check --registry --out].freeze

ARGV.each do |a|
  if a.start_with?("--") && !FLAG_CONOSCIUTI.include?(a)
    warn USO
    exit 2
  end
end

def arg(nome, default)
  i = ARGV.index(nome)
  return default unless i
  v = ARGV[i + 1]
  if v.nil? || v.start_with?("--")
    warn USO
    exit 2
  end
  v
end

REGISTRY = arg("--registry", File.join(__dir__, "registry.yaml"))
OUT = arg("--out", __dir__)
BIGINO = File.join(OUT, "BIGINO-routing-portatile.md")
JS = File.join(OUT, "registry.js")
CHIAVI = %w[topici generalisti_always generalisti_conditional sedi_menu tipi_quesito campioni
            prefisso_domanda suffisso_domanda testi_app bigino_testi].freeze

def valida(r)
  mancanti = CHIAVI.reject { |k| r.key?(k) }
  return mancanti.map { |k| "manca la sezione '#{k}'" } unless mancanti.empty?

  e = []
  topici = r["topici"].map { |t| t["name"] }
  topici.group_by { |n| n }.each { |n, g| e << "topico duplicato: #{n}" if g.size > 1 }
  notebook = r["topici"] + r["generalisti_always"] + r["generalisti_conditional"]
  notebook.each do |n|
    e << "#{n['name']}: manca 'condiviso' (true/false)" unless [true, false].include?(n["condiviso"])
  end
  (r["topici"] + r["generalisti_conditional"]).each do |n|
    e << "#{n['name']}: manca 'bigino'" unless n["bigino"].is_a?(String)
  end
  r["sedi_menu"].map { |v| v["voce"] }.group_by { |v| v }.each do |voce, gruppo|
    e << "voce duplicata: #{voce}" if gruppo.size > 1
  end
  notebook.map { |n| n["name"] }.group_by { |n| n }.each do |nome, g|
    e << "nome notebook duplicato: #{nome}" if g.size > 1
  end
  r["sedi_menu"].each do |v|
    e << "#{v['voce']}: manca 'gruppo'" unless v["gruppo"].is_a?(String)
    if v.key?("non_primitivo") && ![true, false].include?(v["non_primitivo"])
      e << "#{v['voce']}: non_primitivo deve essere true/false"
    end
    if v["speciale"]
      e << "#{v['voce']}: speciale sconosciuto '#{v['speciale']}'" unless %w[sentinella altro].include?(v["speciale"])
      next
    end
    e << "#{v['voce']}: manca 'topici'" unless v.key?("topici")
    %w[topici topici_non_neoplastico].each do |k|
      next unless v.key?(k)
      val = v[k]
      unless val.is_a?(Array) && val.all? { |x| x.is_a?(String) }
        e << "#{v['voce']}: #{k} deve essere una lista di stringhe"
        next
      end
      e << "#{v['voce']}: #{k} ha più di 2 topici" if val.size > 2
      val.group_by { |x| x }.each { |t, g| e << "#{v['voce']}: topico ripetuto '#{t}'" if g.size > 1 }
      val.each { |t| e << "#{v['voce']}: topico inesistente '#{t}'" unless topici.include?(t) }
    end
    if v["senza_fletcher"]
      e << "#{v['voce']}: senza_fletcher richiede 'nota'" unless v["nota"].is_a?(String)
      e << "#{v['voce']}: senza_fletcher richiede 'topici' vuoto" unless Array(v["topici"]).empty?
    end
  end
  ids = r["tipi_quesito"].map { |t| t["id"] }
  ids.group_by { |i| i }.each { |i, g| e << "tipo duplicato: #{i}" if g.size > 1 }
  r["tipi_quesito"].each { |t| e << "tipo #{t['id']}: manca 'modello'" unless t["modello"].is_a?(String) }
  r["tipi_quesito"].each { |t| e << "tipo #{t['id']}: manca 'label'" unless t["label"].is_a?(String) }
  r["tipi_quesito"].each do |t|
    next unless t["modello"].is_a?(String)
    ha_campione = t["modello"].include?("{campione}")
    if t["campione"] && !ha_campione
      e << "tipo #{t['id']}: 'modello' con campione: true deve contenere '{campione}'"
    elsif !t["campione"] && ha_campione
      e << "tipo #{t['id']}: 'modello' contiene '{campione}' senza campione: true"
    end
  end
  r["campioni"].each { |c| e << "campione #{c['id']}: manca 'label'" unless c["label"].is_a?(String) }
  campioni = r["campioni"].map { |c| c["id"] }
  campioni.group_by { |i| i }.each { |i, g| e << "campione duplicato: #{i}" if g.size > 1 }
  r["generalisti_always"].each do |g|
    next unless g.key?("tranne_tipi")
    val = g["tranne_tipi"]
    unless val.is_a?(Array) && val.all? { |x| x.is_a?(String) }
      e << "#{g['name']}: tranne_tipi deve essere una lista di stringhe"
      next
    end
    val.each { |t| e << "#{g['name']}: tranne_tipi: tipo inesistente '#{t}'" unless ids.include?(t) }
  end
  tipi_con_campione = r["tipi_quesito"].select { |t| t["campione"] }.map { |t| t["id"] }
  r["generalisti_conditional"].each do |g|
    if g.key?("tipi")
      val = g["tipi"]
      unless val.is_a?(Array) && val.all? { |x| x.is_a?(String) }
        e << "#{g['name']}: tipi deve essere una lista di stringhe"
        next
      end
    end
    if g.key?("solo_neoplastico") && ![true, false].include?(g["solo_neoplastico"])
      e << "#{g['name']}: solo_neoplastico deve essere true/false"
    end
    tipi = Array(g["tipi"])
    e << "#{g['name']}: nessun 'tipi' né 'trigger'" if tipi.empty? && !g["trigger"]
    tipi.each do |t|
      tipo, campione = t.split(":", 2)
      if !ids.include?(tipo)
        e << "#{g['name']}: tipo inesistente '#{tipo}'"
      elsif campione
        if !campioni.include?(campione)
          e << "#{g['name']}: campione inesistente '#{campione}'"
        elsif !tipi_con_campione.include?(tipo)
          e << "#{g['name']}: il tipo '#{tipo}' non prevede un campione"
        end
      end
    end
  end
  %w[neoplastico_senza_topico medico_senza_topico].each do |tr|
    n = r["generalisti_conditional"].count { |g| Array(g["trigger"]).include?(tr) }
    e << "serve esattamente un generalista con trigger #{tr} (trovati #{n})" unless n == 1
  end
  %w[sede_mancante sede_non_mappata sentinella_senza_primitivo natura_mancante tipo_mancante campione_mancante].each do |k|
    e << "testi_app: manca '#{k}'" unless r["testi_app"].is_a?(Hash) && r["testi_app"][k].is_a?(String)
  end
  if r["bigino_testi"].is_a?(Hash) && r["bigino_testi"].key?("note_solo_bigino")
    val = r["bigino_testi"]["note_solo_bigino"]
    unless val.is_a?(Array) && val.all? { |x| x.is_a?(String) }
      e << "bigino_testi: note_solo_bigino deve essere una lista di stringhe"
    end
  end
  e
end

def per_trigger(r, tr)
  r["generalisti_conditional"].find { |g| Array(g["trigger"]).include?(tr) }["name"]
end

def render_bigino(r)
  t = r["bigino_testi"]
  fletcher = per_trigger(r, "neoplastico_senza_topico")
  harrison = per_trigger(r, "medico_senza_topico")
  voci = r["sedi_menu"].reject { |v| v["speciale"] }
  senza_topico = voci.select { |v| Array(v["topici"]).empty? && !v["senza_fletcher"] }.map { |v| v["voce"] }
  medici = voci.select { |v| v.key?("topici_non_neoplastico") && Array(v["topici_non_neoplastico"]).empty? }
               .map { |v| v["voce"] }
  out = []
  out << "<!-- FILE GENERATO da registry.yaml con `ruby genera.rb` — NON modificare a mano -->"
  out << "# #{t['titolo']}" << ""
  out << t["intro"].rstrip << ""
  out << "## Logica a due assi"
  out << "1. #{t['sede']}"
  out << "2. TIPO QUESITO → generalisti:"
  sempre = r["generalisti_always"].map do |g|
    tranne = Array(g["tranne_tipi"]).map { |id| r["tipi_quesito"].find { |t| t["id"] == id }["label"] }
    tranne.empty? ? g["name"] : "#{g['name']} (tranne tipo: #{tranne.join(', ')})"
  end
  out << "   - SEMPRE: #{sempre.join(' + ')}."
  out << "   - CONDIZIONALI (solo se scatta il trigger):"
  r["generalisti_conditional"].each { |g| out << "     - #{g['name']} → #{g['bigino']}" }
  out << ""
  out << "## Notebook TOPICI (nomi esatti come in NotebookLM)"
  out << t["copertura"]
  r["topici"].each { |g| out << "- #{g['name']}: #{g['bigino']}" }
  out << ""
  out << "## Precedenze"
  r["sedi_menu"].each { |v| out << "- #{v['precedenza']}" if v["precedenza"] }
  out << "- #{t['conflitti']}"
  out << ""
  out << "## Nessun topico"
  out << t["nessun_topico"]
  out << "- Tumore → + #{fletcher}" + (senza_topico.empty? ? "." : " (tumori in sedi senza topico: #{senza_topico.join('; ')}).")
  out << "- Quesito non neoplastico senza topico → + #{harrison}" +
         (medici.empty? ? "" : " (anche queste sedi, se il quesito non è neoplastico: #{medici.join('; ')})") +
         "; testo clinico: la morfologia resta ai generalisti SEMPRE."
  voci.select { |v| v["senza_fletcher"] }.each { |v| out << "- #{v['voce']} → #{v['nota']}" }
  out << "- #{t['avviso_pre_who5']}"
  out << ""
  out << "## Output che voglio da te"
  out << t["output"].rstrip << ""
  out << "## REGOLA DI FRASEGGIO (critica — Gemini rifiuta i quesiti \"diagnostici\")"
  out << t["fraseggio_intro"].rstrip
  r["tipi_quesito"].each { |q| out << "- #{q['label']}: \"#{r['prefisso_domanda']}#{q['modello']}\"" }
  out << "Aggiungi sempre: \"#{r['suffisso_domanda']}\"" << ""
  out << "## Note operative"
  t["note_operative"].each { |n| out << "- #{n}" }
  Array(t["note_solo_bigino"]).each { |n| out << "- #{n}" }
  out.join("\n") + "\n"
end

def render_js(r)
  "// FILE GENERATO da registry.yaml con `ruby genera.rb` — NON modificare a mano\n" \
    "const REGISTRY = #{JSON.pretty_generate(r)};\n" \
    "if (typeof module !== \"undefined\") module.exports = REGISTRY;\n"
end

begin
  r = YAML.safe_load(File.read(REGISTRY, encoding: "UTF-8"), permitted_classes: [], aliases: false)
  raise "il registry deve essere una mappa" unless r.is_a?(Hash)

  errori = valida(r)
  unless errori.empty?
    errori.each { |e| warn "registry: #{e}" }
    exit 2
  end

  file = { BIGINO => render_bigino(r), JS => render_js(r) }
rescue Psych::SyntaxError, SystemCallError, StandardError => ex
  warn "registry: #{ex.message}"
  exit 2
end

if ARGV.include?("--check")
  diversi = file.reject { |p, testo| File.exist?(p) && File.read(p, encoding: "UTF-8") == testo }.keys
  if diversi.empty?
    puts "File generati allineati al registry."
  else
    warn "NON allineati: #{diversi.map { |p| File.basename(p) }.join(', ')} — esegui `ruby genera.rb`."
    exit 1
  end
else
  file.each { |p, testo| File.write(p, testo) }
  puts "Scritti #{file.keys.map { |p| File.basename(p) }.join(' e ')}."
end
