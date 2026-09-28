import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/store.js';
import { READINGS, readingById, readingMinutes } from '../content/readings.js';
import { setRecConfig } from '../app/session.js';
import { go } from '../app/router.js';
import { env } from '../app/env.js';
import { speak, stopSpeaking, loadVoices } from '../speech/tts.js';
import { Icon } from '../ui/icons.jsx';
import { TopBar, TabBar } from '../ui/kit.jsx';
import { readingConfig, improvConfig } from './configs.js';

const readCount = (s, id) => s.history.filter((e) => e.refId === `lec-${id}`).length;

export function Topics() {
  const s = useApp();
  const cats = ['Todos', ...new Set(READINGS.map((r) => r.cat))];
  const [cat, setCat] = useState('Todos');
  const list = READINGS.filter((r) => cat === 'Todos' || r.cat === cat);
  return (
    <>
      <main class="screen">
        <TopBar title="Lecturas y conversaciones" backTo="/entrenar" />
        <p class="muted" style={{ lineHeight: 1.5 }}>Lee en voz alta, aprende palabras nuevas y ten siempre un tema del que conversar. Cada lectura trae preguntas para opinar y un libro para seguir leyendo.</p>
        <div class="chips" role="group" aria-label="Filtrar por tema">
          {cats.map((c) => (
            <button key={c} type="button" class={`chip ${cat === c ? 'on' : ''}`} aria-pressed={String(cat === c)} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
        <div class="stack-sm">
          {list.map((r) => {
            const n = readCount(s, r.id);
            return (
              <a key={r.id} class="item" href={`#/temas/${r.id}`}>
                <span class="icon-circle tone-violet"><Icon name="book" size={20} /></span>
                <div class="stack-sm grow" style={{ gap: 2 }}>
                  <span class="tiny strong violet-t">{r.cat}</span>
                  <span class="t">{r.title}</span>
                  <span class="d">{`${readingMinutes(r)} min de lectura · ${r.talk.length} temas para conversar`}</span>
                </div>
                {n > 0 ? <span class="pill pill-sm tone-teal"><Icon name="check" size={12} stroke={2.6} />{n}</span> : <Icon name="right" size={18} stroke={2} />}
              </a>
            );
          })}
        </div>
      </main>
      <TabBar active="entrenar" />
    </>
  );
}

export function TopicDetail({ id }) {
  const s = useApp();
  const r = readingById(id);
  const [playing, setPlaying] = useState(false);
  useEffect(() => { loadVoices(); return () => stopSpeaking(); }, []);
  if (!r) return null;

  const listen = () => {
    if (playing) { stopSpeaking(); setPlaying(false); return; }
    setPlaying(true);
    speak(r.text, { rate: 0.95, voiceURI: s.settings.voiceURI, onEnd: () => setPlaying(false) });
  };
  const read = () => { stopSpeaking(); setRecConfig(readingConfig(r)); go('/grabar'); };
  const answer = (q) => {
    stopSpeaking();
    setRecConfig(improvConfig({ q, cat: r.cat, hint: 'Da tu opinión, un ejemplo y cierra con una frase clara.', framework: 'prep', mode: 'tema', backTo: `/temas/${r.id}` }));
    go('/grabar');
  };

  return (
    <main class="screen no-tab">
      <TopBar title="Lectura" backTo="/temas" />
      <div class="stack-sm">
        <span class="eyebrow violet-t">{`${r.cat} · ${readingMinutes(r)} min`}</span>
        <h1 class="display h2">{r.title}</h1>
      </div>

      <section class="card stack pad-lg" aria-label="Texto para leer en voz alta">
        <p class="display" style={{ fontSize: 19, lineHeight: 1.6, fontWeight: 500 }}>{r.text}</p>
        {env.hasTTS && (
          <button class="btn btn-ghost" type="button" onClick={listen} style={{ alignSelf: 'flex-start' }}>
            <Icon name={playing ? 'pause' : 'volume'} size={18} />{playing ? 'Detener' : 'Escuchar un modelo'}
          </button>
        )}
      </section>

      <section class="card stack pad-lg" aria-label="Palabras para usar">
        <h2 class="title">Palabras para usar</h2>
        {r.words.map((w) => (
          <div key={w.w} class="stack-sm" style={{ gap: 2 }}>
            <span class="strong">{w.w}</span>
            <span class="small muted" style={{ lineHeight: 1.45 }}>{w.def}</span>
          </div>
        ))}
        <span class="tiny muted">Reto: usa al menos una de estas palabras al responder las preguntas de abajo.</span>
      </section>

      <section class="card stack pad-lg" aria-label="Para conversar">
        <h2 class="title">Para conversar</h2>
        <span class="small muted" style={{ lineHeight: 1.45 }}>Responde en voz alta con 15 segundos para pensar, o úsalas para sacar tema con tu familia o tu equipo.</span>
        {r.talk.map((q, i) => (
          <div key={i} class="row-top" style={{ gap: 12, borderTop: i ? '1px solid var(--line)' : 'none', paddingTop: i ? 12 : 0 }}>
            <span class="grow" style={{ fontSize: 15, lineHeight: 1.45 }}>{q}</span>
            <button class="btn btn-violet-outline" type="button" style={{ flexShrink: 0, minHeight: 40, padding: '8px 12px' }} onClick={() => answer(q)} aria-label={`Responder: ${q}`}><Icon name="mic" size={16} />Responder</button>
          </div>
        ))}
      </section>

      <section class="card-soft row-top" style={{ gap: 12 }} aria-label="Para leer más">
        <Icon name="book" size={22} style={{ flexShrink: 0 }} />
        <div class="stack-sm" style={{ gap: 2 }}>
          <span class="tiny strong">Para leer más</span>
          <span class="strong">{r.book.title}</span>
          <span class="small">{r.book.author}</span>
          <span class="small" style={{ lineHeight: 1.45, opacity: 0.9 }}>{r.book.why}</span>
        </div>
      </section>

      <div class="footer">
        <button class="btn btn-lg" type="button" onClick={read}><Icon name="mic" size={18} />Leer en voz alta</button>
      </div>
    </main>
  );
}
