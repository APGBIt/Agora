// Esquema de la boca de perfil para mostrar dónde se forma cada sonido.
const TONGUE = {
  alveolar: 'M34 84 Q30 60 26 42 Q46 50 68 54 Q92 58 104 76',
  bilabial: 'M34 86 Q40 70 44 64 Q66 60 84 62 Q98 66 104 78',
  velar: 'M34 86 Q40 72 46 66 Q66 52 84 38 Q98 44 104 70',
  palatal: 'M34 86 Q38 68 44 58 Q62 32 80 40 Q96 50 104 72',
  vocal: 'M34 88 Q46 78 60 76 Q84 74 104 82',
};
const POINT = {
  alveolar: [26, 40, 'punta aquí'],
  bilabial: [12, 58, 'labios juntos'],
  velar: [86, 36, 'fondo aquí'],
  palatal: [64, 34, 'centro aquí'],
  vocal: [60, 70, 'lengua baja'],
};

export function Mouth({ kind = 'alveolar', label }) {
  const [px, py, txt] = POINT[kind] || POINT.alveolar;
  const lips = kind === 'bilabial';
  return (
    <svg width="124" height="104" viewBox="0 0 124 104" role="img" aria-label={label} style={{ flexShrink: 0, background: 'var(--bg)', borderRadius: 12 }}>
      <path d="M14 38 Q24 16 58 14 Q92 13 108 34" fill="none" stroke="var(--muted-2)" stroke-width="2" stroke-linecap="round" />
      <path d="M12 38 L14 50 L20 50 L20 38" fill="var(--surface)" stroke="var(--muted-2)" stroke-width="1.5" stroke-linejoin="round" />
      <path d="M14 86 Q58 98 108 80" fill="none" stroke="var(--muted-2)" stroke-width="2" stroke-linecap="round" />
      {lips ? (
        <path d="M6 50 Q2 58 6 66 M6 56 L14 58 L6 60" fill="none" stroke="var(--coral)" stroke-width="2.4" stroke-linecap="round" />
      ) : (
        <path d="M8 44 Q2 50 8 56 M8 66 Q2 72 8 78" fill="none" stroke="var(--muted-2)" stroke-width="1.6" stroke-linecap="round" />
      )}
      <path d={TONGUE[kind] || TONGUE.alveolar} fill="var(--coral-soft)" stroke="var(--coral)" stroke-width="2" stroke-linejoin="round" />
      <circle cx={px} cy={py} r="4" fill="var(--teal)" />
      <text x={Math.min(px + 14, 70)} y={Math.max(12, py - 12)} font-size="10" font-weight="700" fill="var(--teal)" font-family="Instrument Sans, sans-serif">{txt}</text>
    </svg>
  );
}
