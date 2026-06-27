import { useState, useRef, useEffect, useCallback } from "react";

// ─── Music data ───────────────────────────────────────────────────────────────
const CHROMATIC_EN = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const EN_TO_ES = { C:"Do","C#":"Do#",D:"Re","D#":"Re#",E:"Mi",F:"Fa","F#":"Fa#",G:"Sol","G#":"Sol#",A:"La","A#":"La#",B:"Si" };
const ES_TO_EN = Object.fromEntries(Object.entries(EN_TO_ES).map(([k,v])=>[v,k]));
const CHROMATIC_ES = Object.values(EN_TO_ES);

function normalizeToEN(chord) {
  // Búsqueda directa en orden de longitud (más eficiente)
  const ordered = [
    "Do#", "Re#", "Fa#", "Sol#", "La#",
    "Do", "Re", "Mi", "Fa", "Sol", "La", "Si"
  ];
  for (const es of ordered) {
    if (chord.startsWith(es)) return (ES_TO_EN[es]||es) + chord.slice(es.length);
  }
  return chord;
}

function transposeChord(chord, semitones) {
  if (!chord||chord==="/"||semitones===0) return chord;
  const n = normalizeToEN(chord);
  const root = (n[1]==='#'||n[1]==='b') ? n.slice(0,2) : n[0];
  const rest = n.slice(root.length);
  const idx = CHROMATIC_EN.indexOf(root);
  if (idx===-1) return chord;
  return CHROMATIC_EN[(idx+semitones+12)%12]+rest;
}

function toDisplay(enChord, useSpanish) {
  if (!enChord) return enChord;
  if (!useSpanish) return enChord;
  const root = (enChord[1]==='#'||enChord[1]==='b') ? enChord.slice(0,2) : enChord[0];
  const rest = enChord.slice(root.length);
  return (EN_TO_ES[root]||root)+rest;
}

function getSemitones(from, to) {
  const a=CHROMATIC_EN.indexOf(from), b=CHROMATIC_EN.indexOf(to);
  if(a===-1||b===-1) return 0;
  return (b-a+12)%12;
}

const SECTION_COLORS = ["#5BB8F5","#E8497A","#A78BFA","#1A6DB5","#34D399","#F59E0B","#FB923C","#F472B6"];
const SECTION_TYPES = ["INTRO","ESTROFA","PRE-CORO","CORO","PUENTE","PUNTEO","OUTRO","FINAL","VERSO","CODA"];
const ALL_KEYS = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

// ─── Default song ─────────────────────────────────────────────────────────────
const DEFAULT_SONG = {
  id: 1,
  title: "Roca Firme",
  originalKey: "G",
  bpm: 72,
  sections: [
    { id:"s1", label:"INTRO", color:"#5BB8F5",
      lines:[
        { chords:[{chord:"G",pos:0},{chord:"D",pos:5},{chord:"Em",pos:10},{chord:"C",pos:16}], lyric:"" },
        { chords:[{chord:"G",pos:0},{chord:"D",pos:5},{chord:"C",pos:10}], lyric:"" },
      ]},
    { id:"s2", label:"ESTROFA", color:"#E8497A",
      lines:[
        { chords:[{chord:"G",pos:0},{chord:"D",pos:18}], lyric:"En medio de la tormenta" },
        { chords:[{chord:"Em",pos:0},{chord:"C",pos:20}], lyric:"Tu voz calma mi temor" },
        { chords:[{chord:"G",pos:0},{chord:"D",pos:18}], lyric:"Cuando todo se sacude" },
        { chords:[{chord:"Em",pos:0},{chord:"C",pos:10},{chord:"D",pos:17}], lyric:"Tú eres mi ancla, mi Señor" },
      ]},
    { id:"s3", label:"PRE-CORO", color:"#A78BFA",
      lines:[
        { chords:[{chord:"Am",pos:0},{chord:"D",pos:15}], lyric:"No hay nada que me mueva" },
        { chords:[{chord:"Em",pos:0},{chord:"C",pos:15}], lyric:"Si en Ti pongo mi fe" },
        { chords:[{chord:"Am",pos:0},{chord:"Bm",pos:12},{chord:"D",pos:18}], lyric:"Porque Tú eres fiel" },
      ]},
    { id:"s4", label:"CORO", color:"#1A6DB5",
      lines:[
        { chords:[{chord:"G",pos:0},{chord:"D",pos:14}], lyric:"Roca firme, mi fundamento" },
        { chords:[{chord:"Em",pos:0},{chord:"C",pos:12}], lyric:"En Ti solo confiaré" },
        { chords:[{chord:"G",pos:0},{chord:"D",pos:14}], lyric:"Roca firme, sin tormento" },
        { chords:[{chord:"C",pos:0},{chord:"D",pos:8},{chord:"G",pos:16}], lyric:"En Tus brazos descansaré" },
      ]},
    { id:"s5", label:"PUENTE", color:"#34D399",
      lines:[
        { chords:[{chord:"Em",pos:0},{chord:"C",pos:12}], lyric:"Tú eres todo lo que necesito" },
        { chords:[{chord:"G",pos:0},{chord:"D",pos:12}], lyric:"Mi refugio y mi fortaleza" },
        { chords:[{chord:"Em",pos:0},{chord:"C",pos:12}], lyric:"En Ti encuentro lo infinito" },
        { chords:[{chord:"C",pos:0},{chord:"D",pos:10}], lyric:"Tu amor es mi certeza" },
      ]},
    { id:"s6", label:"PUNTEO", color:"#F59E0B",
      lines:[
        { chords:[{chord:"G",pos:0},{chord:"D",pos:5},{chord:"Em",pos:10},{chord:"C",pos:16}], lyric:"× 2" },
        { chords:[{chord:"Am",pos:0},{chord:"Bm",pos:8},{chord:"D",pos:16}], lyric:"" },
      ]},
    { id:"s7", label:"FINAL", color:"#5BB8F5",
      lines:[
        { chords:[{chord:"G",pos:0},{chord:"D",pos:14}], lyric:"Roca firme, mi fundamento" },
        { chords:[{chord:"Em",pos:0},{chord:"C",pos:12}], lyric:"En Ti solo confiaré" },
        { chords:[{chord:"C",pos:0},{chord:"G",pos:14}], lyric:"En Tus brazos descansaré..." },
        { chords:[], lyric:"✦  Fine" },
      ]},
  ]
};

// ─── Supabase ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://xvanqrpgmfxuavljisrr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2YW5xcnBnbWZ4dWF2bGppc3JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MDEyMzAsImV4cCI6MjA5ODA3NzIzMH0._xmAvIsourU0pwXOmWqrXN3Ze_FrS-LIMMygs7fXNEE";
const SONGS_ROW_ID = 1; // single row that holds all songs as JSON array

async function dbLoadSongs() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/songs?id=eq.${SONGS_ROW_ID}&select=data`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const rows = await res.json();
    if (rows && rows[0]?.data) return rows[0].data;
    return null;
  } catch(e) {
    console.error("Supabase load error:", e);
    return null;
  }
}

async function dbSaveSongs(songs) {
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/songs`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates"
        },
        body: JSON.stringify({ id: SONGS_ROW_ID, data: songs, updated_at: new Date().toISOString() })
      }
    );
  } catch(e) {
    console.error("Supabase save error:", e);
  }
}

// Local cache fallback
const STORAGE_KEY = "ontherock_songs";
function localLoad() {
  try {
    const d = localStorage.getItem(STORAGE_KEY);
    return d ? JSON.parse(d) : null;
  } catch(e) { return null; }
}
function localSave(songs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(songs)); } catch(e) {}
}

// ─── Chord Grid Editor ────────────────────────────────────────────────────────
const GRID_COLS = 32;
const CHAR_W = 22;

function ChordGridLine({ line, lineIdx, onUpdate, onDelete, onAddLine }) {
  const [dragging, setDragging] = useState(null);
  const [editingChord, setEditingChord] = useState(null);
  const [chordInput, setChordInput] = useState("");
  const [newChordPos, setNewChordPos] = useState(null);
  const inputRef = useRef(null);
  const gridRef = useRef(null);

  const chords = line.chords || [];

  useEffect(() => {
    if ((editingChord !== null) && inputRef.current) inputRef.current.focus();
  }, [editingChord]);

  function posFromX(clientX) {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(GRID_COLS - 1, Math.round((clientX - rect.left) / CHAR_W)));
  }

  function handleGridClick(e) {
    if (dragging) return;
    const pos = posFromX(e.clientX);
    const hit = chords.findIndex(c => Math.abs(c.pos - pos) <= 1);
    if (hit !== -1) {
      setEditingChord(hit);
      setChordInput(chords[hit].chord);
    } else {
      setNewChordPos(pos);
      setEditingChord("new");
      setChordInput("");
    }
  }

  function commitEdit(e) {
    e && e.preventDefault && e.preventDefault();
    const val = chordInput.trim().toUpperCase();
    if (editingChord === "new") {
      if (val) {
        const updated = [...chords, { chord: val, pos: newChordPos }].sort((a,b)=>a.pos-b.pos);
        onUpdate({ chords: updated });
      }
    } else if (editingChord !== null) {
      if (!val) {
        onUpdate({ chords: chords.filter((_,i)=>i!==editingChord) });
      } else {
        onUpdate({ chords: chords.map((c,i)=>i===editingChord?{...c,chord:val}:c) });
      }
    }
    setEditingChord(null);
    setChordInput("");
    setNewChordPos(null);
  }

  function handleDragStart(chordIdx, e) {
    e.preventDefault();
    setDragging({ chordIdx });
  }
  function handleMouseMove(e) {
    if (dragging === null) return;
    const pos = posFromX(e.clientX);
    onUpdate({ chords: chords.map((c,i)=>i===dragging.chordIdx?{...c,pos}:c) });
  }
  function handleMouseUp() { setDragging(null); }

  return (
    <div
      className="grid-line"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        ref={gridRef}
        className="grid-chord-row"
        style={{ width: GRID_COLS * CHAR_W }}
        onClick={handleGridClick}
        title="Click → agregar · Arrastra → mover · Click en acorde → editar/borrar"
      >
        {Array.from({length: GRID_COLS}).map((_,i)=>(
          <div key={i} className="grid-cell" style={{ left: i*CHAR_W }} />
        ))}
        {chords.map((c, ci) => (
          <div
            key={ci}
            className={`grid-chord-pill ${editingChord===ci?"editing":""}`}
            style={{ left: c.pos * CHAR_W }}
            onMouseDown={(e)=>{ e.stopPropagation(); handleDragStart(ci, e); }}
            onClick={(e)=>{ e.stopPropagation(); setEditingChord(ci); setChordInput(c.chord); }}
          >
            {editingChord===ci
              ? <input
                  ref={inputRef}
                  className="chord-inline-input"
                  value={chordInput}
                  onChange={e=>setChordInput(e.target.value.toUpperCase())}
                  onBlur={commitEdit}
                  onKeyDown={e=>{ if(e.key==="Enter"||e.key==="Tab") commitEdit(e); if(e.key==="Escape") setEditingChord(null); }}
                  style={{width:Math.max(32, chordInput.length*10+12)}}
                  onClick={e=>e.stopPropagation()}
                />
              : c.chord
            }
          </div>
        ))}
        {editingChord==="new" && newChordPos!==null && (
          <div className="grid-chord-pill new-chord" style={{ left: newChordPos*CHAR_W }}>
            <input
              ref={inputRef}
              className="chord-inline-input"
              value={chordInput}
              onChange={e=>setChordInput(e.target.value.toUpperCase())}
              onBlur={commitEdit}
              onKeyDown={e=>{ if(e.key==="Enter"||e.key==="Tab") commitEdit(e); if(e.key==="Escape"){setEditingChord(null);setNewChordPos(null);} }}
              style={{width:44}}
              onClick={e=>e.stopPropagation()}
              placeholder="Dm"
            />
          </div>
        )}
      </div>

      <div className="line-actions">
        <button className="line-btn add" onClick={onAddLine}>＋</button>
        <button className="line-btn del" onClick={onDelete}>✕</button>
      </div>
    </div>
  );
}

// ─── Admin Editor ─────────────────────────────────────────────────────────────
function AdminEditor({ song, onSave, onCancel, onImport, onDelete, syncStatus, appName }) {
  const [draft, setDraft] = useState(JSON.parse(JSON.stringify(song)));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function updateMeta(field, val) {
    setDraft(d=>({...d,[field]:val}));
  }

  function updateSection(sIdx, updated) {
    setDraft(d=>{
      const sections=[...d.sections];
      sections[sIdx]=updated;
      return {...d,sections};
    });
  }

  function addSection() {
    const newS = {
      id:"s"+Date.now(),
      label:"NUEVA",
      color: SECTION_COLORS[draft.sections.length % SECTION_COLORS.length],
      lines:[{ chords:[], lyric:"" }]
    };
    setDraft(d=>({...d,sections:[...d.sections,newS]}));
  }

  function deleteSection(sIdx) {
    setDraft(d=>({...d,sections:d.sections.filter((_,i)=>i!==sIdx)}));
  }

  function updateLine(sIdx, lIdx, updated) {
    setDraft(d=>{
      const sections=[...d.sections];
      const lines=[...sections[sIdx].lines];
      lines[lIdx]=updated;
      sections[sIdx]={...sections[sIdx],lines};
      return {...d,sections};
    });
  }

  function addLine(sIdx, afterIdx) {
    setDraft(d=>{
      const sections=[...d.sections];
      const lines=[...sections[sIdx].lines];
      lines.splice(afterIdx+1,0,{chords:[],lyric:""});
      sections[sIdx]={...sections[sIdx],lines};
      return {...d,sections};
    });
  }

  function deleteLine(sIdx, lIdx) {
    setDraft(d=>{
      const sections=[...d.sections];
      const lines=sections[sIdx].lines.filter((_,i)=>i!==lIdx);
      sections[sIdx]={...sections[sIdx],lines: lines.length?lines:[{chords:[],lyric:""}]};
      return {...d,sections};
    });
  }

  function moveSectionUp(sIdx) {
    if(sIdx===0) return;
    setDraft(d=>{
      const s=[...d.sections];
      [s[sIdx-1],s[sIdx]]=[s[sIdx],s[sIdx-1]];
      return {...d,sections:s};
    });
  }

  function moveSectionDown(sIdx) {
    setDraft(d=>{
      if(sIdx===d.sections.length-1) return d;
      const s=[...d.sections];
      [s[sIdx],s[sIdx+1]]=[s[sIdx+1],s[sIdx]];
      return {...d,sections:s};
    });
  }

  return (
    <div className="admin-root">
      <style>{CSS_ADMIN}</style>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="delete-overlay">
          <div className="delete-modal">
            <div className="delete-modal-title">¿Eliminar canción?</div>
            <div className="delete-modal-sub">"{draft.title}" se borrará permanentemente.</div>
            <div className="delete-modal-actions">
              <button className="abtn abtn-cancel" onClick={()=>setShowDeleteConfirm(false)}>Cancelar</button>
              <button className="abtn abtn-confirm-delete" onClick={()=>{ setShowDeleteConfirm(false); onDelete(song.id); }}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-topbar">
        <div className="admin-topbar-left">
          <span className="admin-tag">✎ EDITOR</span>
          <span className="admin-song-name">{draft.title||"Sin título"}</span>
          {syncStatus==="saving" && <span className="sync-badge saving">↑ Guardando...</span>}
          {syncStatus==="saved"  && <span className="sync-badge saved">✓ Guardado</span>}
          {syncStatus==="error"  && <span className="sync-badge error">✕ Error</span>}
        </div>
        <div className="admin-topbar-right">
          {onImport && <button className="abtn abtn-import" onClick={onImport}>⬇ Importar</button>}
          <button className="abtn abtn-delete" onClick={()=>setShowDeleteConfirm(true)} title="Eliminar canción">🗑 Borrar</button>
          <button className="abtn abtn-cancel" onClick={onCancel}>Cancelar</button>
          <button className="abtn abtn-save" onClick={()=>onSave(draft)}>Guardar</button>
        </div>
      </div>

      <div className="admin-body">
        <div className="admin-meta-card">
          <div className="admin-meta-row">
            <div className="admin-field">
              <label>Título</label>
              <input className="admin-input" value={draft.title} onChange={e=>updateMeta("title",e.target.value)} />
            </div>
            <div className="admin-field" style={{maxWidth:120}}>
              <label>Tono original</label>
              <select className="admin-input" value={draft.originalKey} onChange={e=>updateMeta("originalKey",e.target.value)}>
                {ALL_KEYS.map(k=><option key={k} value={k}>{k} / {EN_TO_ES[k]}</option>)}
              </select>
            </div>
            <div className="admin-field" style={{maxWidth:100}}>
              <label>BPM</label>
              <input className="admin-input" type="number" min={40} max={240} value={draft.bpm} onChange={e=>updateMeta("bpm",+e.target.value)} />
            </div>
          </div>
        </div>

        <div className="admin-hint">
          <span className="hint-icon">💡</span>
          <span><b>Click</b> → acorde · <b>Arrastra</b> → mover · <b>Click acorde</b> → editar/borrar · <b>Enter</b> confirma</span>
        </div>

        {draft.sections.map((section, sIdx)=>(
          <div key={section.id} className="admin-section">
            <div className="admin-section-header">
              <div className="section-color-dot" style={{background:section.color}}/>
              <select
                className="section-label-select"
                value={section.label}
                onChange={e=>updateSection(sIdx,{...section,label:e.target.value})}
              >
                {SECTION_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
              <input
                className="admin-input section-label-custom"
                value={section.label}
                onChange={e=>updateSection(sIdx,{...section,label:e.target.value.toUpperCase()})}
                style={{width:110}}
                placeholder="Nombre"
              />
              <div className="section-color-row">
                {SECTION_COLORS.map(c=>(
                  <button
                    key={c}
                    className={`color-swatch ${section.color===c?"selected":""}`}
                    style={{background:c}}
                    onClick={()=>updateSection(sIdx,{...section,color:c})}
                  />
                ))}
              </div>
              <div className="section-move-btns">
                <button className="abtn-icon" onClick={()=>moveSectionUp(sIdx)} disabled={sIdx===0}>↑</button>
                <button className="abtn-icon" onClick={()=>moveSectionDown(sIdx)} disabled={sIdx===draft.sections.length-1}>↓</button>
                <button className="abtn-icon del" onClick={()=>deleteSection(sIdx)}>✕</button>
              </div>
            </div>

            <div className="admin-section-body">
              {section.lines.map((line,lIdx)=>(
                <ChordGridLine
                  key={lIdx}
                  line={line}
                  lineIdx={lIdx}
                  onUpdate={updated=>updateLine(sIdx,lIdx,updated)}
                  onDelete={()=>deleteLine(sIdx,lIdx)}
                  onAddLine={()=>addLine(sIdx,lIdx)}
                />
              ))}
              <button className="add-line-btn" onClick={()=>addLine(sIdx,section.lines.length-1)}>
                + Añadir línea
              </button>
            </div>
          </div>
        ))}

        <button className="add-section-btn" onClick={addSection}>+ Añadir sección</button>
      </div>
    </div>
  );
}

// ─── Musician View ────────────────────────────────────────────────────────────
function MusicianView({ song, onEdit, onSetlist, onPreview, onRevokeAdmin }) {
  const [selectedKey, setSelectedKey] = useState(song.originalKey);
  const [useSpanish, setUseSpanish] = useState(true);

  const semitones = getSemitones(song.originalKey, selectedKey);
  const displayKey = toDisplay(selectedKey, useSpanish);
  const originalDisplay = toDisplay(song.originalKey, useSpanish);

  function renderLine(line) {
    const chords = [...(line.chords||[])].sort((a,b)=>a.pos-b.pos);
    if (!chords.length) return null;

    const spans = [];
    let cursor = 0;
    for (const c of chords) {
      if (c.pos > cursor) spans.push({ type:"gap", n: c.pos - cursor });
      const displayed = toDisplay(transposeChord(c.chord, semitones), useSpanish);
      spans.push({ type:"chord", text: displayed });
      cursor = c.pos + displayed.length;
    }

    return (
      <div className="mv-chord-row">
        {spans.map((s,i) =>
          s.type==="chord"
            ? <span key={i} className="mv-chord">{s.text}</span>
            : <span key={i} className="mv-gap">{"\u00A0".repeat(s.n)}</span>
        )}
      </div>
    );
  }

  return (
    <div className="mv-root">
      <style>{CSS_MV}</style>

      <header className="mv-header">
        <div className="mv-header-inner">
          <div className="mv-brand">
            <span className="mv-cross">✝</span>
            <span className="mv-brand-name">On The Rock</span>
          </div>
          <div className="mv-header-actions">
            <button className={`mv-toggle ${useSpanish?"active":""}`} onClick={()=>setUseSpanish(v=>!v)}>
              {useSpanish?"ES":"EN"}
            </button>
            <button className="mv-toggle list-btn" onClick={onSetlist}>☰</button>
            <button className="mv-toggle preview-btn" onClick={onPreview} title="Vista móvil">📱</button>
            {onEdit && (
              <button className="mv-toggle edit-btn" onClick={onEdit} title="Editor">✎</button>
            )}
            {onRevokeAdmin && (
              <button className="mv-toggle revoke-btn" onClick={onRevokeAdmin} title="Salir de admin">🔓</button>
            )}
          </div>
        </div>
      </header>

      <div className="mv-song-hero">
        <div className="mv-song-hero-bg" />
        <div className="mv-song-hero-inner">
          <div className="mv-song-title">{song.title}</div>
          <div className="mv-song-meta">
            <span className="mv-meta-chip">{song.bpm} BPM</span>
            <span className="mv-original-chip">Tono original: {originalDisplay}</span>
          </div>
        </div>
      </div>

      <div className="mv-key-wrap">
        <div className="mv-key-label">Tu tonalidad</div>
        <div className="mv-key-grid">
          {ALL_KEYS.map(k=>(
            <button
              key={k}
              className={`mv-key-btn ${selectedKey===k?"selected":""}`}
              onClick={()=>setSelectedKey(k)}
            >
              {toDisplay(k,useSpanish)}
            </button>
          ))}
        </div>
        <div className="mv-active-key">
          <span className="mv-active-label">Tu clave</span>
          <span className="mv-active-val">{displayKey}</span>
          <span className="mv-semitone-badge">
            {semitones===0?"Tono original":semitones>0?`+${semitones} st`:`${semitones} st`}
          </span>
        </div>
      </div>

      <div className="mv-sections">
        {song.sections.map(section=>(
          <div key={section.id} className="mv-section-card">
            <div className="mv-section-hdr">
              <div className="mv-section-dot" style={{background:section.color}}/>
              <span className="mv-section-label">{section.label}</span>
            </div>
            <div className="mv-section-body">
              {section.lines.map((line,i)=>(
                <div key={i}>{renderLine(line)}</div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mv-footer"><span>✝</span> On The Rock · Worship Band</div>
    </div>
  );
}

// ─── ChordPro parser ──────────────────────────────────────────────────────────
const SECTION_KEYWORDS = [
  "INTRO","INTROD","ESTROFA","VERSO","CORO","PRE-CORO","PRECORO","PRE CORO",
  "PUENTE","BRIDGE","PUNTEO","SOLO","OUTRO","FINAL","CODA","REFRAN","REFRÁN",
  "INTERLUDIO","INSTRUMENTAL","CHORUS","VERSE","INTERLUDE"
];

function detectSectionLabel(line) {
  const trimmed = line.trim();
  // Si tiene corchetes con contenido musical, no es un encabezado de sección
  if (/\[[A-Gb#m7sus4add9\/]+\]/.test(trimmed)) return null;
  const cleaned = trimmed
    .replace(/^[\[=\-#*]+/,"").replace(/[\]=\-#*]+$/,"")
    .replace(/:/,"").trim().toUpperCase();
  // Debe ser solo texto (sin acordes ni letra larga)
  if (cleaned.length > 30) return null;
  if (SECTION_KEYWORDS.some(k => cleaned.startsWith(k))) {
    return cleaned;
  }
  return null;
}

function parsePastedSong(raw) {
  const lines = raw.split(/\r?\n/);
  const meta = { title:"", originalKey:"G", bpm:72 };
  const sections = [];
  let currentSection = null;
  let sectionCounter = 0;

  for (let i = 0; i < Math.min(6, lines.length); i++) {
    const l = lines[i].trim();
    const titleMatch = l.match(/^[Tt]ít?ulo[:\s]+(.+)/i) || l.match(/^[Tt]itle[:\s]+(.+)/i);
    const keyMatch   = l.match(/[Tt]ono[:\s]+([A-Gb#]+)/i) || l.match(/[Kk]ey[:\s]+([A-Gb#]+)/i);
    const bpmMatch   = l.match(/BPM[:\s]+(\d+)/i) || l.match(/[Tt]empo[:\s]+(\d+)/i);
    if (titleMatch) meta.title = titleMatch[1].trim();
    if (keyMatch) {
      const raw = keyMatch[1].trim();
      const normalized = normalizeToEN(raw);
      if (CHROMATIC_EN.includes(normalized)) meta.originalKey = normalized;
    }
    if (bpmMatch) meta.bpm = parseInt(bpmMatch[1]);
  }

  function flushSection() {
    if (currentSection && currentSection.lines.length > 0) {
      sections.push(currentSection);
    }
  }

  function newSection(label) {
    flushSection();
    sectionCounter++;
    currentSection = {
      id: "s" + Date.now() + sectionCounter,
      label: label,
      color: SECTION_COLORS[(sections.length) % SECTION_COLORS.length],
      lines: []
    };
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    if (/^[Tt]ít?ulo[:\s]/i.test(line)||/^[Tt]itle[:\s]/i.test(line)) continue;
    if (/^(BPM|[Tt]empo|[Tt]ono|[Kk]ey)[:\s]/i.test(line)) continue;

    const sLabel = detectSectionLabel(line);
    if (sLabel) {
      newSection(sLabel);
      continue;
    }

    if (!currentSection) newSection("ESTROFA");

    const hasChords = /\[[^\]]+\]/.test(line);

    if (hasChords) {
      const chords = [];
      let lyric = "";
      let charPos = 0;
      let scanIdx = 0;

      while (scanIdx < line.length) {
        const bracketOpen = line.indexOf("[", scanIdx);
        if (bracketOpen === -1) {
          const rest = line.slice(scanIdx);
          lyric += rest;
          charPos += rest.length;
          break;
        }
        const before = line.slice(scanIdx, bracketOpen);
        lyric += before;
        charPos += before.length;

        const bracketClose = line.indexOf("]", bracketOpen);
        if (bracketClose === -1) break;
        const chordRaw = line.slice(bracketOpen+1, bracketClose).trim();
        
        // Validar acorde no vacío
        if (chordRaw) {
          const chordEN = normalizeToEN(chordRaw);
          chords.push({ chord: chordEN, pos: charPos });
        }
        scanIdx = bracketClose + 1;
      }

      currentSection.lines.push({ chords, lyric: lyric.trim() });
    } else {
      currentSection.lines.push({ chords: [], lyric: line.trim() });
    }
  }

  flushSection();

  if (!meta.title && lines.length > 0) {
    meta.title = lines.find(l=>l.trim()&&!detectSectionLabel(l)&&!/\[/.test(l))?.trim() || "Sin título";
  }

  return { ...meta, id: Date.now(), sections };
}

// ─── Import Screen ────────────────────────────────────────────────────────────
const EXAMPLE_PASTE = `Título: Mi Canción
Tono: D  BPM: 80

Estrofa
[D]Texto de la primera [A]línea
[Bm]Segunda línea de la [G]estrofa

Coro
[G]Línea del coro [D]aquí
[A]Otra línea del [Bm]coro

Puente
[Em]Línea del [G]puente`;

function ImportScreen({ onImport, onSkip }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  function handleParse() {
    if (!text.trim()) { setError("Pegá el texto primero."); return; }
    try {
      const result = parsePastedSong(text);
      if (!result.sections.length) {
        setError("No se detectaron secciones. Revisá el formato.");
        return;
      }
      setPreview(result);
      setError("");
    } catch(e) {
      setError("Error al procesar. Revisá el formato.");
    }
  }

  function handleConfirm() {
    if (preview) onImport(preview);
  }

  return (
    <div style={{
      minHeight:"100vh", background:"#0A0A0A", color:"#DDD",
      fontFamily:"'Barlow',sans-serif", paddingBottom:60
    }}>
      <style>{CSS_IMPORT}</style>

      <div className="imp-topbar">
        <div className="imp-topbar-left">
          <span className="imp-cross">✝</span>
          <span className="imp-brand">On The Rock</span>
          <span className="imp-tag">IMPORTAR</span>
        </div>
        <button className="imp-skip" onClick={onSkip}>Editar manualmente →</button>
      </div>

      <div className="imp-body">
        <div className="imp-intro">
          <div className="imp-intro-title">Pegá el cifrado de tu canción</div>
          <div className="imp-intro-sub">
            Pedile a la IA el formato con secciones y acordes entre corchetes.<br/>
            La app detecta automáticamente el título, tono, BPM y toda la estructura.
          </div>
        </div>

        <div className="imp-format-card">
          <div className="imp-format-label">Formato esperado (ejemplo)</div>
          <pre className="imp-format-pre">{EXAMPLE_PASTE}</pre>
        </div>

        <div className="imp-prompt-card">
          <div className="imp-format-label">📋 Prompt sugerido para la IA</div>
          <div className="imp-prompt-text">
            Dame el cifrado de "<em>nombre de la canción</em>" en formato ChordPro con secciones etiquetadas (Intro, Estrofa, Coro, Puente, etc.), acordes entre corchetes dentro de la letra, tono original y BPM. Ejemplo: <code>[G]En medio de la [D]tormenta</code>
          </div>
        </div>

        <div className="imp-textarea-wrap">
          <label className="imp-label">Pegá aquí el resultado de la IA</label>
          <textarea
            className="imp-textarea"
            value={text}
            onChange={e=>{ setText(e.target.value); setPreview(null); setError(""); }}
            placeholder={"Título: Amazing Grace\nTono: G  BPM: 76\n\nEstrofa\n[G]Amazing grace how [C]sweet the sound\n[G]That saved a [D]wretch like me\n\nCoro\n[G]Aleluya [D]aleluya\n[C]Aleluya [G]amén"}
            rows={14}
            spellCheck={false}
          />
          {error && <div className="imp-error">{error}</div>}
        </div>

        <div className="imp-actions">
          <button className="imp-btn-parse" onClick={handleParse}>
            Analizar texto →
          </button>
        </div>

        {preview && (
          <div className="imp-preview">
            <div className="imp-preview-header">
              <div className="imp-preview-title-row">
                <span className="imp-preview-ok">✓ Canción detectada</span>
                <span className="imp-preview-song-name">{preview.title}</span>
              </div>
              <div className="imp-preview-chips">
                <span className="imp-chip">Tono: {preview.originalKey} / {EN_TO_ES[preview.originalKey]}</span>
                <span className="imp-chip">{preview.bpm} BPM</span>
                <span className="imp-chip">{preview.sections.length} secciones</span>
                <span className="imp-chip">
                  {preview.sections.reduce((a,s)=>a+s.lines.length,0)} líneas
                </span>
              </div>
              <div className="imp-preview-sections">
                {preview.sections.map((s,i)=>(
                  <div key={i} className="imp-section-pill" style={{borderColor:s.color,color:s.color}}>
                    {s.label} <span className="imp-section-count">{s.lines.length}L</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="imp-preview-lines">
              {preview.sections.map((s,si)=>(
                <div key={si} className="imp-prev-section">
                  <div className="imp-prev-section-label" style={{color:s.color}}>{s.label}</div>
                  {s.lines.map((line,li)=>(
                    <div key={li} className="imp-prev-line">
                      <div className="imp-prev-chords">
                        {line.chords.map((c,ci)=>(
                          <span key={ci} className="imp-prev-chord">{c.chord}</span>
                        ))}
                        {line.chords.length===0 && <span className="imp-prev-nochord">—</span>}
                      </div>
                      <div className="imp-prev-lyric">{line.lyric||<em style={{color:"#444"}}>sin letra</em>}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="imp-confirm-row">
              <button className="imp-btn-confirm" onClick={handleConfirm}>
                Usar esta canción → Abrir en editor
              </button>
              <button className="imp-btn-reparse" onClick={()=>setPreview(null)}>
                ← Volver a editar texto
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Setlist Screen ───────────────────────────────────────────────────────────
function SetlistScreen({ songs, currentSongId, onSelect, onNewSong, onBack }) {
  return (
    <div style={{
      minHeight:"100vh", background:"#0A0A0A", color:"#DDD",
      fontFamily:"'Barlow',sans-serif"
    }}>
      <style>{CSS_SETLIST}</style>

      <div className="setlist-topbar">
        <div>
          <span className="sl-cross">✝</span>
          <span className="sl-brand">SETLIST</span>
        </div>
        <button className="sl-back" onClick={onBack}>← Volver</button>
      </div>

      <div className="setlist-body">
        <button className="sl-new-song" onClick={onNewSong}>+ Nueva canción</button>

        <div className="setlist-list">
          {songs.map(song => (
            <button
              key={song.id}
              className={`sl-song-card ${currentSongId===song.id?"active":""}`}
              onClick={()=>onSelect(song.id)}
            >
              <div className="sl-song-title">{song.title}</div>
              <div className="sl-song-meta">
                {song.originalKey} / {EN_TO_ES[song.originalKey]} · {song.bpm} BPM · {song.sections.length} secciones
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Mobile Preview ───────────────────────────────────────────────────────────
function MobilePreview({ song, onClose }) {
  const [selectedKey, setSelectedKey] = useState(song.originalKey);
  const [useSpanish, setUseSpanish] = useState(true);
  const semitones = getSemitones(song.originalKey, selectedKey);

  function renderChords(line) {
    const chords = [...(line.chords||[])].sort((a,b)=>a.pos-b.pos);
    if (!chords.length) return null;
    return chords.map((c,i) => {
      const displayed = toDisplay(transposeChord(c.chord, semitones), useSpanish);
      return <span key={i} className="phone-chord">{displayed}</span>;
    });
  }

  return (
    <div className="phone-overlay">
      <style>{CSS_PHONE}</style>

      {/* Desktop backdrop controls */}
      <div className="phone-backdrop" onClick={onClose} />
      <div className="phone-controls">
        <button className="phone-close-btn" onClick={onClose}>✕ Cerrar preview</button>
        <div className="phone-controls-right">
          <button
            className={`phone-ctrl-btn ${useSpanish?"on":""}`}
            onClick={()=>setUseSpanish(v=>!v)}
          >{useSpanish?"ES":"EN"}</button>
          <span className="phone-ctrl-label">Tonalidad:</span>
          <select
            className="phone-key-select"
            value={selectedKey}
            onChange={e=>setSelectedKey(e.target.value)}
          >
            {ALL_KEYS.map(k=>(
              <option key={k} value={k}>{toDisplay(k,useSpanish)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Phone frame */}
      <div className="phone-frame">
        <div className="phone-notch" />
        <div className="phone-screen">

          {/* Status bar */}
          <div className="phone-statusbar">
            <span>9:41</span>
            <span className="phone-statusbar-right">●●●</span>
          </div>

          {/* Mini header */}
          <div className="phone-header">
            <span className="phone-cross">✝</span>
            <span className="phone-brand">On The Rock</span>
          </div>

          {/* Scrollable content */}
          <div className="phone-content">

            {/* Hero */}
            <div className="phone-hero">
              <div className="phone-song-title">{song.title}</div>
              <div className="phone-song-meta">
                <span className="phone-chip">{song.bpm} BPM</span>
                <span className="phone-chip blue">
                  {toDisplay(song.originalKey, useSpanish)} orig · {toDisplay(selectedKey, useSpanish)} tuyo
                  {semitones !== 0 && ` (${semitones > 0 ? "+" : ""}${semitones})`}
                </span>
              </div>
            </div>

            {/* Key selector — compact 2 rows */}
            <div className="phone-keys">
              {ALL_KEYS.map(k=>(
                <button
                  key={k}
                  className={`phone-key-btn ${selectedKey===k?"sel":""}`}
                  onClick={()=>setSelectedKey(k)}
                >{toDisplay(k,useSpanish)}</button>
              ))}
            </div>

            {/* Sections */}
            <div className="phone-sections">
              {song.sections.map(section=>(
                <div key={section.id} className="phone-section">
                  <div className="phone-section-label" style={{color:section.color}}>
                    <span className="phone-dot" style={{background:section.color}}/>
                    {section.label}
                  </div>
                  <div className="phone-section-chords">
                    {section.lines.map((line,i)=>{
                      const rendered = renderChords(line);
                      if (!rendered) return null;
                      return (
                        <div key={i} className="phone-chord-line">{rendered}</div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="phone-footer">✝ On The Rock</div>
          </div>

          {/* Home indicator */}
          <div className="phone-home-bar" />
        </div>
      </div>
    </div>
  );
}

const CSS_PHONE = `
.phone-overlay{
  position:fixed;inset:0;z-index:500;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:rgba(0,0,0,0.88);
  padding:20px;
  font-family:'Barlow',sans-serif;
}
.phone-backdrop{position:absolute;inset:0;}

.phone-controls{
  position:relative;z-index:10;
  display:flex;align-items:center;justify-content:space-between;
  width:100%;max-width:440px;
  margin-bottom:16px;
  flex-wrap:wrap;gap:8px;
}
.phone-close-btn{
  font-family:'Barlow',sans-serif;font-size:12px;font-weight:700;
  letter-spacing:0.06em;text-transform:uppercase;
  background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
  color:#888;padding:7px 14px;border-radius:8px;cursor:pointer;transition:all 0.15s;
}
.phone-close-btn:hover{color:#FFF;border-color:rgba(255,255,255,0.25);}
.phone-controls-right{display:flex;align-items:center;gap:8px;}
.phone-ctrl-label{font-size:11px;color:#555;text-transform:uppercase;letter-spacing:0.08em;}
.phone-ctrl-btn{
  font-size:11px;font-weight:700;font-family:'Barlow',sans-serif;
  background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
  color:#666;padding:5px 10px;border-radius:6px;cursor:pointer;transition:all 0.15s;
}
.phone-ctrl-btn.on{background:rgba(26,109,181,0.3);border-color:rgba(91,184,245,0.4);color:#5BB8F5;}
.phone-key-select{
  background:#111;border:1px solid rgba(255,255,255,0.1);color:#CCC;
  padding:5px 10px;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:12px;
  cursor:pointer;outline:none;
}

/* Phone frame */
.phone-frame{
  position:relative;z-index:10;
  width:340px;
  background:#0A0A0A;
  border-radius:44px;
  border:10px solid #1A1A1A;
  box-shadow:
    0 0 0 1px #2A2A2A,
    0 40px 80px rgba(0,0,0,0.8),
    inset 0 0 0 1px rgba(255,255,255,0.04);
  overflow:hidden;
  height:680px;
  display:flex;flex-direction:column;
}
.phone-notch{
  width:100px;height:28px;
  background:#0A0A0A;
  border-radius:0 0 20px 20px;
  margin:0 auto;
  border:2px solid #1A1A1A;
  border-top:none;
  flex-shrink:0;
  z-index:10;
  position:relative;
}
.phone-screen{
  flex:1;
  overflow:hidden;
  display:flex;flex-direction:column;
  background:#080808;
  margin-top:-2px;
}

.phone-statusbar{
  display:flex;justify-content:space-between;
  padding:4px 20px;
  font-size:10px;color:#444;font-family:'JetBrains Mono',monospace;
  flex-shrink:0;
}
.phone-statusbar-right{letter-spacing:2px;}

.phone-header{
  display:flex;align-items:center;gap:7px;
  padding:6px 16px 8px;
  border-bottom:1px solid rgba(255,255,255,0.04);
  flex-shrink:0;
}
.phone-cross{color:#5BB8F5;font-size:13px;filter:drop-shadow(0 0 4px rgba(91,184,245,0.5));}
.phone-brand{
  font-family:'Barlow Condensed',sans-serif;
  font-size:12px;font-weight:800;letter-spacing:0.14em;
  text-transform:uppercase;color:#FFF;
}

.phone-content{
  flex:1;overflow-y:auto;
  scrollbar-width:none;
}
.phone-content::-webkit-scrollbar{display:none;}

/* Hero */
.phone-hero{
  padding:20px 16px 14px;
  text-align:center;
  background:
    radial-gradient(ellipse 100% 80% at 50% 0%, rgba(26,109,181,0.25) 0%, transparent 70%);
  position:relative;
}
.phone-hero::after{
  content:'';position:absolute;inset:0;
  background:repeating-linear-gradient(0deg,transparent,transparent 20px,rgba(255,255,255,0.01) 20px,rgba(255,255,255,0.01) 21px);
  pointer-events:none;
}
.phone-song-title{
  font-family:'Barlow Condensed',sans-serif;
  font-size:22px;font-weight:800;color:#FFF;
  text-shadow:0 0 20px rgba(91,184,245,0.2);
  margin-bottom:8px;position:relative;z-index:1;
}
.phone-song-meta{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;position:relative;z-index:1;}
.phone-chip{
  font-family:'JetBrains Mono',monospace;font-size:9px;
  background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.08);
  padding:3px 7px;border-radius:20px;color:#666;
}
.phone-chip.blue{
  background:rgba(26,109,181,0.15);border-color:rgba(91,184,245,0.25);color:#5BB8F5;
}

/* Key grid */
.phone-keys{
  display:grid;grid-template-columns:repeat(6,1fr);gap:4px;
  padding:10px 12px;
  border-bottom:1px solid rgba(255,255,255,0.04);
}
.phone-key-btn{
  font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;
  background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);
  color:#555;padding:6px 2px;border-radius:6px;cursor:pointer;transition:all 0.12s;
  -webkit-tap-highlight-color:transparent;
}
.phone-key-btn.sel{
  background:rgba(26,109,181,0.3);border-color:rgba(91,184,245,0.4);
  color:#FFF;box-shadow:0 0 8px rgba(91,184,245,0.15);
}

/* Sections */
.phone-sections{padding:10px 12px;display:flex;flex-direction:column;gap:8px;}
.phone-section{
  background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);
  border-radius:8px;overflow:hidden;
}
.phone-section-label{
  display:flex;align-items:center;gap:6px;
  padding:6px 10px;
  border-bottom:1px solid rgba(255,255,255,0.04);
  font-family:'Barlow Condensed',sans-serif;
  font-size:9px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;
}
.phone-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
.phone-section-chords{padding:8px 10px;display:flex;flex-direction:column;gap:6px;}
.phone-chord-line{display:flex;flex-wrap:wrap;gap:5px;}
.phone-chord{
  font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;
  color:#5BB8F5;
  background:rgba(91,184,245,0.08);
  border:1px solid rgba(91,184,245,0.15);
  padding:3px 8px;border-radius:5px;
  text-shadow:0 0 8px rgba(91,184,245,0.25);
}

.phone-footer{
  padding:16px;text-align:center;
  font-size:9px;color:#2A2A2A;
  letter-spacing:0.1em;text-transform:uppercase;font-weight:700;
}
.phone-home-bar{
  height:4px;width:100px;
  background:rgba(255,255,255,0.1);
  border-radius:2px;
  margin:8px auto;
  flex-shrink:0;
}
`;

// ─── Root App ─────────────────────────────────────────────────────────────────
const ADMIN_TOKEN = "otr2024admin";
const APP_NAME = "On The Rock";

export default function App() {
  const [songs, setSongs] = useState(() => localLoad() || [DEFAULT_SONG]);
  const [currentSongId, setCurrentSongId] = useState(null);
  const [mode, setMode] = useState("view");
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("idle"); // "idle"|"saving"|"saved"|"error"

  const [isAdmin, setIsAdmin] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("admin");
    if (token === ADMIN_TOKEN) {
      localStorage.setItem("otr_admin", "true");
      window.history.replaceState({}, "", window.location.pathname);
      return true;
    }
    return localStorage.getItem("otr_admin") === "true";
  });

  // Load from Supabase on mount
  useEffect(() => {
    dbLoadSongs().then(data => {
      if (data && data.length > 0) {
        setSongs(data);
        localSave(data);
        setCurrentSongId(data[0].id);
      } else {
        const cached = localLoad();
        if (cached && cached.length > 0) {
          setSongs(cached);
          setCurrentSongId(cached[0].id);
        } else {
          setSongs([DEFAULT_SONG]);
          setCurrentSongId(DEFAULT_SONG.id);
        }
      }
      setLoading(false);
    });
  }, []);

  const currentSong = songs.find(s => s.id === currentSongId) || songs[0] || DEFAULT_SONG;

  async function updateAllSongs(updated) {
    setSongs(updated);
    localSave(updated);
    setSyncStatus("saving");
    await dbSaveSongs(updated);
    setSyncStatus("saved");
    setTimeout(() => setSyncStatus("idle"), 2000);
  }

  function handleSave(updated) {
    updateAllSongs(songs.map(s => s.id === currentSongId ? updated : s));
    setMode("view");
  }

  function handleImport(parsed) {
    const updated = [...songs, parsed];
    updateAllSongs(updated);
    setCurrentSongId(parsed.id);
    setMode("edit");
  }

  function handleDelete(songId) {
    const remaining = songs.filter(s => s.id !== songId);
    if (remaining.length === 0) remaining.push(DEFAULT_SONG);
    updateAllSongs(remaining);
    setCurrentSongId(remaining[0].id);
    setMode("view");
  }

  function handleSelectSong(songId) {
    setCurrentSongId(songId);
    setMode("view");
  }

  function handleRevokeAdmin() {
    localStorage.removeItem("otr_admin");
    setIsAdmin(false);
    setMode("view");
  }

  // Loading screen
  if (loading) {
    return (
      <div style={{
        minHeight:"100vh", background:"#080808",
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", gap:16
      }}>
        <div style={{fontSize:28, color:"#5BB8F5", filter:"drop-shadow(0 0 10px rgba(91,184,245,0.5))"}}>✝</div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:800,
          letterSpacing:"0.14em", textTransform:"uppercase", color:"#FFF"}}>{APP_NAME}</div>
        <div style={{width:40, height:2, background:"rgba(91,184,245,0.3)", borderRadius:2,
          animation:"pulse 1s infinite alternate"}} />
        <style>{`@keyframes pulse{from{opacity:0.3}to{opacity:1}}`}</style>
      </div>
    );
  }

  if (mode === "import" && isAdmin) {
    return <ImportScreen onImport={handleImport} onSkip={() => setMode("edit")} appName={APP_NAME} />;
  }
  if (mode === "preview") {
    return <MobilePreview song={currentSong} onClose={() => setMode("view")} appName={APP_NAME} />;
  }
  if (mode === "edit" && isAdmin) {
    return (
      <AdminEditor
        song={currentSong}
        onSave={handleSave}
        onCancel={() => setMode("view")}
        onImport={() => setMode("import")}
        onDelete={handleDelete}
        syncStatus={syncStatus}
        appName={APP_NAME}
      />
    );
  }
  if (mode === "setlist") {
    return (
      <SetlistScreen
        songs={songs}
        currentSongId={currentSongId}
        onSelect={handleSelectSong}
        onNewSong={() => {
          if (!isAdmin) { setMode("view"); return; }
          const newSong = {
            id: Date.now(),
            title: "Nueva canción",
            originalKey: "G",
            bpm: 72,
            sections: [
              { id:"s"+Date.now(), label:"ESTROFA", color:"#E8497A", lines:[{chords:[],lyric:""}] }
            ]
          };
          updateAllSongs([...songs, newSong]);
          setCurrentSongId(newSong.id);
          setMode("edit");
        }}
        onBack={() => setMode("view")}
        isAdmin={isAdmin}
        appName={APP_NAME}
      />
    );
  }

  return (
    <MusicianView
      song={currentSong}
      onEdit={isAdmin ? () => setMode("edit") : null}
      onSetlist={() => setMode("setlist")}
      onPreview={() => setMode("preview")}
      onRevokeAdmin={isAdmin ? handleRevokeAdmin : null}
      syncStatus={syncStatus}
      appName={APP_NAME}
    />
  );
}

// ─── CSS: Musician View ───────────────────────────────────────────────────────
const CSS_MV = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

body{background:#0D0D0D;color:#DDD;}

.mv-root{
  background:#080808;
  min-height:100vh;
  font-family:'Barlow',sans-serif;
}

/* ── Header ── */
.mv-header{
  background:rgba(8,8,8,0.85);
  backdrop-filter:blur(16px);
  -webkit-backdrop-filter:blur(16px);
  border-bottom:1px solid rgba(255,255,255,0.05);
  position:sticky;top:0;z-index:100;
}
.mv-header-inner{
  max-width:760px;margin:0 auto;padding:0 20px;
  height:54px;display:flex;align-items:center;justify-content:space-between;
}
.mv-brand{display:flex;align-items:center;gap:10px;}
.mv-cross{
  font-size:20px;color:#5BB8F5;
  filter:drop-shadow(0 0 6px rgba(91,184,245,0.6));
}
.mv-brand-name{
  font-family:'Barlow Condensed',sans-serif;
  font-size:15px;font-weight:800;letter-spacing:0.15em;
  text-transform:uppercase;color:#FFF;
}
.mv-header-actions{display:flex;gap:6px;}
.mv-toggle{
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
  color:#666;padding:6px 12px;border-radius:8px;
  font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;
  cursor:pointer;transition:all 0.2s;font-family:'Barlow',sans-serif;
}
.mv-toggle:hover{border-color:rgba(255,255,255,0.15);color:#AAA;}
.mv-toggle.active{
  background:rgba(26,109,181,0.3);
  border-color:rgba(91,184,245,0.4);
  color:#5BB8F5;
}
.mv-toggle.edit-btn,.mv-toggle.list-btn{padding:6px 10px;font-size:15px;color:#444;}
.mv-toggle.edit-btn:hover,.mv-toggle.list-btn:hover{color:#888;}

/* ── Song Hero ── */
.mv-song-hero{
  position:relative;overflow:hidden;
  padding:48px 20px 40px;
  text-align:center;
}
.mv-song-hero::before{
  content:'';
  position:absolute;inset:0;
  background:
    radial-gradient(ellipse 80% 60% at 50% 0%, rgba(26,109,181,0.35) 0%, transparent 70%),
    radial-gradient(ellipse 40% 80% at 20% 100%, rgba(232,73,122,0.12) 0%, transparent 60%),
    radial-gradient(ellipse 50% 50% at 80% 80%, rgba(91,184,245,0.08) 0%, transparent 50%);
}
.mv-song-hero::after{
  content:'';
  position:absolute;inset:0;
  background:repeating-linear-gradient(
    0deg,
    transparent,
    transparent 40px,
    rgba(255,255,255,0.012) 40px,
    rgba(255,255,255,0.012) 41px
  );
  pointer-events:none;
}
.mv-song-hero-inner{
  position:relative;z-index:2;
  max-width:760px;margin:0 auto;
}
.mv-song-title{
  font-family:'Barlow Condensed',sans-serif;
  font-size:46px;font-weight:800;letter-spacing:0.01em;
  color:#FFF;line-height:1;margin-bottom:16px;
  text-shadow:0 0 40px rgba(91,184,245,0.25), 0 2px 4px rgba(0,0,0,0.5);
}
.mv-song-meta{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;}
.mv-meta-chip{
  font-family:'JetBrains Mono',monospace;font-size:11px;
  background:rgba(0,0,0,0.4);
  border:1px solid rgba(255,255,255,0.1);
  padding:4px 10px;border-radius:20px;color:#888;
  backdrop-filter:blur(4px);
}
.mv-original-chip{
  font-family:'JetBrains Mono',monospace;font-size:11px;
  background:rgba(26,109,181,0.2);
  border:1px solid rgba(91,184,245,0.3);
  padding:4px 10px;border-radius:20px;color:#5BB8F5;
  backdrop-filter:blur(4px);
}

/* ── Key Selector ── */
.mv-key-wrap{
  max-width:760px;margin:0 auto;
  padding:24px 20px 20px;
  border-bottom:1px solid rgba(255,255,255,0.04);
}
.mv-key-label{
  font-size:9px;font-weight:700;letter-spacing:0.14em;
  text-transform:uppercase;color:#444;margin-bottom:10px;
}
.mv-key-grid{
  display:grid;grid-template-columns:repeat(6,1fr);gap:6px;
  margin-bottom:14px;
}
.mv-key-btn{
  background:rgba(255,255,255,0.03);
  border:1px solid rgba(255,255,255,0.06);
  color:#555;padding:10px 4px;border-radius:10px;
  font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;
  cursor:pointer;transition:all 0.15s;
  -webkit-tap-highlight-color:transparent;
}
.mv-key-btn:hover{border-color:rgba(255,255,255,0.15);color:#AAA;}
.mv-key-btn.selected{
  background:linear-gradient(135deg,rgba(26,109,181,0.5),rgba(91,184,245,0.2));
  border-color:rgba(91,184,245,0.5);
  color:#FFF;
  box-shadow:0 0 16px rgba(91,184,245,0.2), inset 0 1px 0 rgba(255,255,255,0.1);
}
.mv-active-key{
  display:flex;align-items:center;gap:10px;
  padding:12px 16px;
  background:rgba(255,255,255,0.02);
  border:1px solid rgba(255,255,255,0.06);
  border-radius:10px;
}
.mv-active-label{font-size:10px;color:#444;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;}
.mv-active-val{
  font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;
  color:#5BB8F5;
  text-shadow:0 0 20px rgba(91,184,245,0.4);
}
.mv-semitone-badge{
  margin-left:auto;
  font-family:'JetBrains Mono',monospace;font-size:11px;color:#555;
  background:rgba(255,255,255,0.03);
  border:1px solid rgba(255,255,255,0.06);
  padding:4px 10px;border-radius:20px;
}

/* ── Sections ── */
.mv-sections{
  max-width:760px;margin:0 auto;
  padding:20px 20px 40px;
  display:flex;flex-direction:column;gap:8px;
}
.mv-section-card{
  background:rgba(255,255,255,0.02);
  border:1px solid rgba(255,255,255,0.05);
  border-radius:12px;overflow:hidden;
  transition:border-color 0.2s;
}
.mv-section-card:hover{border-color:rgba(255,255,255,0.09);}
.mv-section-hdr{
  display:flex;align-items:center;gap:10px;
  padding:8px 14px;
  border-bottom:1px solid rgba(255,255,255,0.04);
}
.mv-section-dot{
  width:6px;height:6px;border-radius:50%;flex-shrink:0;
  box-shadow:0 0 6px currentColor;
}
.mv-section-label{
  font-family:'Barlow Condensed',sans-serif;
  font-size:11px;font-weight:800;letter-spacing:0.14em;
  text-transform:uppercase;color:#555;
}
.mv-section-body{
  padding:14px 16px;
  display:flex;flex-direction:column;gap:10px;
}

/* ── Chords ── */
.mv-chord-row{
  font-family:'JetBrains Mono',monospace;
  font-size:16px;font-weight:700;
  line-height:1.5;white-space:pre;
  display:flex;flex-wrap:wrap;align-items:baseline;
}
.mv-chord{
  color:#5BB8F5;
  background:rgba(91,184,245,0.08);
  border:1px solid rgba(91,184,245,0.15);
  padding:2px 7px;border-radius:5px;display:inline;
  transition:all 0.15s;
  text-shadow:0 0 12px rgba(91,184,245,0.3);
}
.mv-gap{color:transparent;display:inline;pointer-events:none;user-select:none;}

/* ── Footer ── */
.mv-footer{
  max-width:760px;margin:0 auto;padding:20px;
  text-align:center;font-size:10px;color:#2A2A2A;
  letter-spacing:0.1em;text-transform:uppercase;font-weight:700;
}
.mv-footer span{color:rgba(91,184,245,0.3);}

/* ── Responsive ── */
@media(max-width:480px){
  .mv-song-title{font-size:34px;}
  .mv-key-btn{padding:8px 2px;font-size:12px;}
  .mv-chord-row{font-size:14px;}
  .mv-section-body{padding:12px;}
}

`;

// ─── CSS: Admin ───────────────────────────────────────────────────────────────
const CSS_ADMIN = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

.admin-root{background:#0A0A0A;color:#DDD;min-height:100vh;font-family:'Barlow',sans-serif;}
.admin-topbar{position:sticky;top:0;z-index:200;background:#0A0A0A;border-bottom:1px solid #222;padding:0 20px;height:52px;display:flex;align-items:center;justify-content:space-between;}
.admin-topbar-left{display:flex;align-items:center;gap:12px;}
.admin-tag{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#34D399;background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.25);padding:3px 8px;border-radius:4px;}
.admin-song-name{font-size:16px;font-weight:600;}
.sync-badge{font-size:10px;font-weight:700;letter-spacing:0.06em;padding:3px 8px;border-radius:4px;}
.sync-badge.saving{color:#F59E0B;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);}
.sync-badge.saved{color:#34D399;background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.3);}
.sync-badge.error{color:#E8497A;background:rgba(232,73,122,0.1);border:1px solid rgba(232,73,122,0.3);}
.admin-topbar-right{display:flex;gap:8px;align-items:center;}
.abtn{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;background:transparent;border:1px solid #2A2A2A;color:#666;padding:6px 12px;border-radius:6px;cursor:pointer;transition:all 0.15s;}
.abtn:hover{border-color:#444;color:#BBB;}
.abtn-save{background:#34D399;border-color:#34D399;color:#000;}
.abtn-save:hover{background:#3EF0A8;}
.abtn-import{background:#1A6DB5;border-color:#1A6DB5;color:#FFF;}
.abtn-delete{color:#E8497A;border-color:#E8497A;}
.abtn-delete:hover{background:rgba(232,73,122,0.1);}
.abtn-confirm-delete{background:#E8497A;border-color:#E8497A;color:#FFF;}
.abtn-confirm-delete:hover{background:#F05585;border-color:#F05585;}

.delete-overlay{
  position:fixed;inset:0;z-index:1000;
  background:rgba(0,0,0,0.8);
  display:flex;align-items:center;justify-content:center;
  padding:20px;
}
.delete-modal{
  background:#1C1C1C;border:1px solid #333;border-radius:12px;
  padding:28px 24px;max-width:360px;width:100%;
}
.delete-modal-title{
  font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:800;
  color:#FFF;margin-bottom:8px;
}
.delete-modal-sub{font-size:13px;color:#888;margin-bottom:24px;line-height:1.5;}
.delete-modal-actions{display:flex;gap:10px;justify-content:flex-end;}

.admin-body{max-width:900px;margin:0 auto;padding:28px 20px 60px;}
.admin-meta-card{background:#161616;border:1px solid #1E1E1E;border-radius:10px;padding:16px;margin-bottom:24px;}
.admin-meta-row{display:flex;gap:16px;flex-wrap:wrap;}
.admin-field{flex:1;min-width:120px;}
.admin-field label{display:block;font-size:11px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;}
.admin-input{width:100%;background:#0F0F0F;border:1px solid #2A2A2A;color:#DDD;padding:8px 10px;border-radius:6px;font-family:'Barlow',sans-serif;font-size:13px;transition:border 0.15s;}
.admin-input:focus{outline:none;border-color:#1A6DB5;}

.admin-hint{background:rgba(26,109,181,0.1);border:1px solid rgba(26,109,181,0.2);border-radius:8px;padding:10px 14px;margin-bottom:24px;font-size:12px;color:#7AA0C4;line-height:1.5;}
.hint-icon{margin-right:6px;}

.admin-section{background:#161616;border:1px solid #1E1E1E;border-radius:10px;margin-bottom:20px;overflow:hidden;}
.admin-section-header{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #1E1E1E;flex-wrap:wrap;}
.section-color-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0;}
.section-label-select{background:#0F0F0F;border:1px solid #2A2A2A;color:#DDD;padding:6px 8px;border-radius:4px;font-size:12px;cursor:pointer;}
.section-label-custom{width:110px !important;}
.section-color-row{display:flex;gap:6px;}
.color-swatch{width:20px;height:20px;border-radius:4px;border:2px solid transparent;cursor:pointer;transition:all 0.15s;}
.color-swatch.selected{border-color:#FFF;}
.section-move-btns{display:flex;gap:4px;margin-left:auto;}
.abtn-icon{background:transparent;border:1px solid #2A2A2A;color:#666;padding:4px 6px;border-radius:4px;cursor:pointer;font-size:12px;transition:all 0.15s;}
.abtn-icon:hover:not(:disabled){border-color:#444;color:#BBB;}
.abtn-icon:disabled{opacity:0.3;cursor:not-allowed;}
.abtn-icon.del{color:#E8497A;}

.admin-section-body{padding:16px;}

.grid-line{margin-bottom:8px;padding:10px 12px;background:#0F0F0F;border:1px solid #1A1A1A;border-radius:6px;display:flex;align-items:center;gap:8px;}
.grid-chord-row{position:relative;flex:1;height:28px;background:transparent;}
.grid-cell{position:absolute;width:1px;height:20px;top:4px;background:#1A1A1A;opacity:0.5;}
.grid-chord-pill{position:absolute;top:2px;background:#34D399;color:#000;padding:2px 6px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;cursor:grab;user-select:none;white-space:nowrap;}
.grid-chord-pill:active{cursor:grabbing;}
.grid-chord-pill.editing{background:#E8497A;color:#FFF;}
.grid-chord-pill.new-chord{background:#5BB8F5;color:#000;}
.chord-inline-input{background:transparent;border:none;color:inherit;font-family:inherit;font-size:inherit;font-weight:inherit;padding:0;width:44px;outline:none;}

.line-actions{display:flex;gap:4px;flex-shrink:0;}
.line-btn{background:transparent;border:1px solid #2A2A2A;color:#666;padding:3px 7px;border-radius:4px;cursor:pointer;font-size:12px;transition:all 0.15s;}
.line-btn:hover{border-color:#444;color:#BBB;}
.line-btn.add{color:#34D399;border-color:rgba(52,211,153,0.4);}
.line-btn.del{color:#E8497A;border-color:rgba(232,73,122,0.4);}

.add-line-btn{width:100%;background:transparent;border:1px dashed #2A2A2A;color:#666;padding:8px;border-radius:6px;cursor:pointer;font-size:12px;transition:all 0.15s;margin-top:4px;}
.add-line-btn:hover{border-color:#444;color:#BBB;}

.add-section-btn{width:100%;background:#1A6DB5;border:none;color:#FFF;padding:12px;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.15s;letter-spacing:0.08em;text-transform:uppercase;}
.add-section-btn:hover{background:#1E7FD4;}
`;

// ─── CSS: Import Screen ───────────────────────────────────────────────────────
const CSS_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@300;400;500&display=swap');

.imp-topbar{position:sticky;top:0;z-index:200;background:#111;border-bottom:1px solid #222;padding:0 20px;height:52px;display:flex;align-items:center;justify-content:space-between;}
.imp-topbar-left{display:flex;align-items:center;gap:10px;}
.imp-cross{font-size:16px;color:#5BB8F5;font-weight:700;}
.imp-brand{font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#FFF;}
.imp-tag{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#34D399;background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.25);padding:3px 8px;border-radius:4px;}
.imp-skip{font-family:'Barlow',sans-serif;font-size:12px;font-weight:600;background:transparent;border:1px solid #2A2A2A;color:#666;padding:6px 12px;border-radius:6px;cursor:pointer;transition:all 0.15s;}
.imp-skip:hover{color:#CCC;border-color:#444;}
.imp-body{max-width:760px;margin:0 auto;padding:28px 20px;}
.imp-intro{margin-bottom:24px;}
.imp-intro-title{font-family:'Barlow Condensed',sans-serif;font-size:26px;font-weight:800;color:#FFF;margin-bottom:6px;}
.imp-intro-sub{font-size:14px;color:#777;line-height:1.6;}
.imp-format-card{background:#0F1A0F;border:1px solid rgba(52,211,153,0.2);border-radius:10px;padding:14px 16px;margin-bottom:14px;}
.imp-format-label{font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#34D399;margin-bottom:8px;}
.imp-format-pre{font-family:'JetBrains Mono',monospace;font-size:12px;color:#8BC4A0;line-height:1.7;white-space:pre-wrap;}
.imp-prompt-card{background:#0F0F1A;border:1px solid rgba(91,184,245,0.2);border-radius:10px;padding:14px 16px;margin-bottom:20px;}
.imp-prompt-text{font-size:13px;color:#7AA0C4;line-height:1.6;}
.imp-prompt-text em{color:#5BB8F5;font-style:normal;}
.imp-prompt-text code{font-family:'JetBrains Mono',monospace;font-size:11px;background:rgba(91,184,245,0.1);padding:2px 5px;border-radius:3px;color:#5BB8F5;}
.imp-textarea-wrap{margin-bottom:16px;}
.imp-label{display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#555;margin-bottom:8px;}
.imp-textarea{width:100%;background:#111;border:1px solid #2A2A2A;border-radius:8px;color:#DDD;font-family:'JetBrains Mono',monospace;font-size:13px;padding:14px;outline:none;resize:vertical;line-height:1.7;transition:border-color 0.15s;}
.imp-textarea:focus{border-color:#1A6DB5;}
.imp-textarea::placeholder{color:#333;}
.imp-error{margin-top:6px;font-size:12px;color:#E8497A;background:rgba(232,73,122,0.08);border:1px solid rgba(232,73,122,0.2);padding:6px 10px;border-radius:6px;}
.imp-actions{display:flex;gap:10px;margin-bottom:24px;}
.imp-btn-parse{font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;background:#1A6DB5;color:#FFF;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;transition:all 0.15s;}
.imp-btn-parse:hover{background:#1E7FD4;}
.imp-preview{background:#141414;border:1px solid #222;border-radius:12px;overflow:hidden;}
.imp-preview-header{padding:16px 20px;border-bottom:1px solid #1E1E1E;}
.imp-preview-title-row{display:flex;align-items:center;gap:12px;margin-bottom:10px;}
.imp-preview-ok{font-size:11px;font-weight:700;color:#34D399;background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.25);padding:3px 8px;border-radius:4px;letter-spacing:0.06em;}
.imp-preview-song-name{font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:800;color:#FFF;}
.imp-preview-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;}
.imp-chip{font-family:'JetBrains Mono',monospace;font-size:11px;color:#888;background:#1A1A1A;border:1px solid #2A2A2A;padding:3px 8px;border-radius:4px;}
.imp-preview-sections{display:flex;gap:6px;flex-wrap:wrap;}
.imp-section-pill{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;border:1px solid;padding:3px 8px;border-radius:4px;display:flex;align-items:center;gap:4px;}
.imp-section-count{opacity:0.6;font-size:10px;}
.imp-preview-lines{padding:16px 20px;max-height:320px;overflow-y:auto;display:flex;flex-direction:column;gap:16px;}
.imp-prev-section-label{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;}
.imp-prev-line{display:flex;flex-direction:column;gap:1px;margin-bottom:4px;}
.imp-prev-chords{display:flex;gap:6px;flex-wrap:wrap;min-height:18px;}
.imp-prev-chord{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:#5BB8F5;background:rgba(91,184,245,0.1);padding:1px 5px;border-radius:3px;}
.imp-prev-nochord{font-size:11px;color:#333;}
.imp-prev-lyric{font-size:13px;color:#B0B0B0;}
.imp-confirm-row{padding:14px 20px;border-top:1px solid #1E1E1E;display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.imp-btn-confirm{font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;background:#34D399;color:#000;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;transition:all 0.15s;}
.imp-btn-confirm:hover{background:#3EF0A8;}
.imp-btn-reparse{font-family:'Barlow',sans-serif;font-size:12px;font-weight:600;background:transparent;border:1px solid #2A2A2A;color:#666;padding:8px 14px;border-radius:6px;cursor:pointer;transition:all 0.15s;}
.imp-btn-reparse:hover{color:#CCC;border-color:#444;}
`;

// ─── CSS: Setlist Screen ──────────────────────────────────────────────────────
const CSS_SETLIST = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@300;400;500&display=swap');

.setlist-topbar{position:sticky;top:0;z-index:200;background:#0A0A0A;border-bottom:1px solid #222;padding:0 20px;height:56px;display:flex;align-items:center;justify-content:space-between;}
.sl-cross{color:#5BB8F5;font-size:18px;margin-right:8px;}
.sl-brand{font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#FFF;}
.sl-back{background:transparent;border:1px solid #2A2A2A;color:#666;padding:6px 14px;border-radius:6px;font-family:'Barlow',sans-serif;font-size:12px;cursor:pointer;transition:all 0.15s;}
.sl-back:hover{border-color:#444;color:#BBB;}

.setlist-body{max-width:760px;margin:0 auto;padding:28px 20px;}
.sl-new-song{width:100%;background:#1A6DB5;color:#FFF;border:none;padding:14px;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;transition:all 0.15s;margin-bottom:24px;}
.sl-new-song:hover{background:#1E7FD4;}

.setlist-list{display:flex;flex-direction:column;gap:10px;}
.sl-song-card{background:#161616;border:2px solid #1E1E1E;border-radius:10px;padding:16px;text-align:left;cursor:pointer;transition:all 0.15s;font-family:'Barlow',sans-serif;}
.sl-song-card:hover{border-color:#2A2A2A;}
.sl-song-card.active{border-color:#1A6DB5;background:#0F1F2F;}
.sl-song-title{font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:800;color:#FFF;margin-bottom:6px;}
.sl-song-meta{font-size:12px;color:#888;font-family:'JetBrains Mono',monospace;}
`;
