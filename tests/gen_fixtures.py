"""Genera audios de prueba para el motor de análisis de Ágora.
Usa espeak-ng (voz sintética en español) y señales sintéticas con valores conocidos.
"""
import json
import subprocess
import wave
from pathlib import Path

import numpy as np
from scipy.signal import lfilter, resample_poly

OUT = Path(__file__).parent / "fixtures"
OUT.mkdir(exist_ok=True)
SR = 22050
rng = np.random.default_rng(7)

TEXTS = {
    "marta": (
        "Cada mañana, antes de abrir la oficina, Marta repasa en voz alta lo que quiere decir "
        "en la primera reunión. No lo hace por nervios, sino por respeto: sabe que su equipo "
        "merece ideas claras. Primero respira hondo y ordena tres puntos. Después busca un ejemplo "
        "concreto para cada uno."
    ),
    "proyecto": (
        "La mitad de los retrasos empieza por un documento que nadie encuentra. Creamos un portal "
        "que reúne todos los protocolos en un solo lugar, y cualquiera encuentra lo que necesita en "
        "segundos. Le pido quince minutos para mostrárselo el jueves."
    ),
}

PHRASES = [
    "Buenos días a todos",
    "hoy vamos a revisar el plan del trimestre",
    "primero les comparto los resultados",
    "después hablaremos de los próximos pasos",
    "y al final abrimos el espacio para preguntas",
]


def espeak(text, speed=150, pitch=50, voice="es-419"):
    tmp = OUT / "_tmp.wav"
    subprocess.run(["espeak-ng", "-v", voice, "-s", str(speed), "-p", str(pitch), "-w", str(tmp), text], check=True)
    with wave.open(str(tmp)) as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    tmp.unlink()
    assert sr == SR
    return trim(x)


def trim(x, thr=0.01):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x
    return x[max(0, idx[0] - 200): idx[-1] + 200]


def silence(sec):
    return np.zeros(int(sec * SR), dtype=np.float32)


def noise(x, level_db=-50):
    amp = 10 ** (level_db / 20)
    return (x + rng.normal(0, amp, len(x))).astype(np.float32)


def save(name, x, meta):
    x = np.clip(x, -1, 1)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
    meta_all[name] = meta


def vowel(sec, f0=190.0, formants=((550, 80), (1750, 110), (2600, 150)), sr=SR, level=0.25):
    n = int(sec * sr)
    period = sr / f0
    src = np.zeros(n, dtype=np.float64)
    t = 0.0
    while t < n:
        src[int(t)] = 1.0
        t += period
    y = src
    for f, bw in formants:
        r = np.exp(-np.pi * bw / sr)
        theta = 2 * np.pi * f / sr
        y = lfilter([1 - r], [1, -2 * r * np.cos(theta), r * r], y)
    y = y / (np.max(np.abs(y)) + 1e-9) * level
    fade = int(0.03 * sr)
    env = np.ones(n)
    env[:fade] = np.linspace(0, 1, fade)
    env[-fade:] = np.linspace(1, 0, fade)
    return (y * env).astype(np.float32)


def syllables_es(text):
    """Cuenta sílabas ortográficas y con sinalefa (unión de vocales entre palabras)."""
    import re, unicodedata

    words = re.findall(r"[a-záéíóúüñ]+", text.lower())
    strong = set("aeoáéó")
    accented_weak = set("íú")
    vowels = set("aeiouáéíóúü")

    def count(w):
        c = 0
        prev = None
        for i, ch in enumerate(w):
            isv = ch in vowels or (ch == "y" and len(w) == 1)
            if isv:
                if prev is None:
                    c += 1
                else:
                    sp = prev in strong or prev in accented_weak
                    sc = ch in strong or ch in accented_weak
                    if sp and sc:
                        c += 1
                prev = ch
            else:
                prev = None
        return max(1, c)

    ortho = sum(count(w) for w in words)
    merges = 0
    for a, b in zip(words, words[1:]):
        bb = b[1:] if b.startswith("h") else b
        if a[-1] in vowels and bb and bb[0] in vowels:
            merges += 1
    return {"words": len(words), "ortho": ortho, "synalepha": ortho - merges}


meta_all = {}

# 1) Velocidad: mismo texto a varias velocidades
for key, text in TEXTS.items():
    info = syllables_es(text)
    for speed in (120, 150, 180, 210):
        x = noise(espeak(text, speed=speed))
        save(f"rate_{key}_{speed}", x, {"kind": "rate", "speed": speed, **info})

# 2) Pausas conocidas: 0,3 s (micro), 0,8 y 1,5 s (efectivas), 2,6 s (larga)
gaps = [0.3, 0.8, 1.5, 2.6]
parts = [silence(0.5)]
for i, ph in enumerate(PHRASES):
    parts.append(espeak(ph, speed=150))
    if i < len(gaps):
        parts.append(silence(gaps[i]))
parts.append(silence(0.6))
save("pauses", noise(np.concatenate(parts)), {"kind": "pauses", "micro": 1, "effective": 2, "long": 1})

# 3) Vacilaciones: vocal sostenida «eeeh» entre frases
parts = [silence(0.4)]
for i, ph in enumerate(PHRASES[:4]):
    parts.append(espeak(ph, speed=160))
    if i in (0, 2):
        parts += [silence(0.25), vowel(0.65), silence(0.25)]
    else:
        parts.append(silence(0.5))
save("hesitations", noise(np.concatenate(parts)), {"kind": "hesitations", "expected": 2})

# 4) Volumen que cae al final de cada frase (−16 dB en el último 35 %)
parts = [silence(0.4)]
for ph in PHRASES:
    y = espeak(ph, speed=150)
    n = len(y)
    g = np.ones(n)
    k = int(n * 0.65)
    g[k:] = 10 ** (np.linspace(0, -16, n - k) / 20)
    parts += [y * g, silence(0.7)]
save("enddrop", noise(np.concatenate(parts)), {"kind": "enddrop", "expected_ratio_min": 0.6})

parts = [silence(0.4)]
for ph in PHRASES:
    parts += [espeak(ph, speed=150), silence(0.7)]
save("flat", noise(np.concatenate(parts)), {"kind": "enddrop", "expected_ratio_max": 0.3})

# 5) Tono: vocal sintética con tono conocido (200 Hz) y con saltos de ±4 semitonos
save("tone200", noise(np.concatenate([silence(0.3), vowel(2.0, f0=200), silence(0.3)])), {"kind": "tone", "f0": 200})
seq = []
for st in [0, 4, -4, 2, -2, 5, -5, 0]:
    seq += [vowel(0.35, f0=200 * 2 ** (st / 12)), silence(0.12)]
save("tonevar", noise(np.concatenate([silence(0.3)] + seq)), {"kind": "tonevar"})

# 6) Silencio con ruido: no debe detectar voz
save("noise_only", noise(silence(3.0), level_db=-40), {"kind": "silence"})

(OUT / "meta.json").write_text(json.dumps(meta_all, indent=1, ensure_ascii=False))
print("ok", len(meta_all))
