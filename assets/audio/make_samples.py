#!/usr/bin/env python3
"""Build the embedded instrument and foley samples (assets/audio/*.js).

Usage:
    python3 assets/audio/make_samples.py --fetch SRC_DIR    # download the source recordings
    python3 assets/audio/make_samples.py SRC_DIR            # cut, level, encode, embed

Needs numpy, scipy, soundfile and ffmpeg (with libmp3lame). Every source is CC0 or
CC BY 3.0; see CREDITS.md. Each recording is mixed to mono, trimmed to its onset,
shortened with a gentle fade, levelled, resampled to 32 kHz and stored as MP3
(the one compressed format every browser can decode), base64 inside a .js file
so the page still runs from file:// and as a single bundled HTML file.
"""
import base64
import pathlib
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
from fractions import Fraction

ROOT = pathlib.Path(__file__).resolve().parent
RATE = 32000

VCSL = ('https://raw.githubusercontent.com/sgossner/VCSL/c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e', 'vcsl')
VSCO = ('https://raw.githubusercontent.com/sgossner/VSCO-2-CE/440300901dfe9275fd84e0b7763af1f8443ae62e', 'vsco')
MTG = ('https://raw.githubusercontent.com/luanti-org/minetest_game/9e895af6e9feb98332fa1a778001442f5669bc20', 'minetest')

PIANO = 'Chordophones/Zithers/Upright Piano, Knight/Sustains/Player_vl1_rr1_'
GLOCK = 'Idiophones/Struck Idiophones/Glockenspiel/glock_soft_'
VIBES = 'Idiophones/Struck Idiophones/Vibraphone/Soft Mallets/Vibes_soft_'
PERC = 'Idiophones/Struck Idiophones/'

# instrument: (output file, [(repo, path, root midi as measured, seconds kept, fade seconds)], loop)
INSTRUMENTS = {
    'piano': ('piano', [
        (VCSL, PIANO + 'F1.wav', 40.97, 6.0, 2.2), (VCSL, PIANO + 'A1.wav', 44.97, 6.0, 2.2),
        (VCSL, PIANO + 'C#2.wav', 49.0, 5.5, 2.0), (VCSL, PIANO + 'F2.wav', 53.0, 5.0, 1.8),
        (VCSL, PIANO + 'A2.wav', 57.0, 4.6, 1.6), (VCSL, PIANO + 'C#3.wav', 61.0, 4.6, 1.6),
        (VCSL, PIANO + 'F3.wav', 65.03, 4.2, 1.5), (VCSL, PIANO + 'A3.wav', 69.03, 4.0, 1.4),
        (VCSL, PIANO + 'C#4.wav', 73.05, 3.4, 1.2), (VCSL, PIANO + 'F4.wav', 77.03, 3.0, 1.1),
        (VCSL, PIANO + 'A4.wav', 81.06, 2.8, 1.0), (VCSL, PIANO + 'C#5.wav', 85.1, 2.4, 0.9),
    ], False),
    'glock': ('mallets', [
        (VCSL, GLOCK + 'G4_01.wav', 79.1, 2.2, 1.0), (VCSL, GLOCK + 'C5_02.wav', 84.12, 2.2, 1.0),
        (VCSL, GLOCK + 'G5_01.wav', 91.12, 2.0, 0.9), (VCSL, GLOCK + 'C6_01.wav', 96.16, 1.8, 0.8),
        (VCSL, GLOCK + 'G6_01.wav', 103.16, 1.6, 0.7), (VCSL, GLOCK + 'C7_03.wav', 108.24, 1.4, 0.6),
    ], False),
    'vibes': ('mallets', [
        (VCSL, VIBES + 'E3_v1_rr2_Main.wav', 64.0, 3.0, 1.2), (VCSL, VIBES + 'G3_v1_rr1_Main.wav', 67.0, 3.0, 1.2),
        (VCSL, VIBES + 'B3_v1_rr1_Main.wav', 71.0, 2.8, 1.1), (VCSL, VIBES + 'D4_v1_rr1_Main.wav', 74.0, 2.8, 1.1),
        (VCSL, VIBES + 'F4_v1_rr1_Main.wav', 77.0, 2.6, 1.0), (VCSL, VIBES + 'A4_v1_rr1_Main.wav', 81.0, 2.6, 1.0),
        (VCSL, VIBES + 'C5_v1_rr1_Main.wav', 84.0, 2.4, 1.0), (VCSL, VIBES + 'E5_v1_rr1_Main.wav', 88.0, 2.4, 1.0),
    ], False),
    'harp': ('mallets', [
        (VSCO, 'Strings/Harp/KSHarp_C3_mf.wav', 47.96, 2.6, 1.2), (VSCO, 'Strings/Harp/KSHarp_E3_mf.wav', 51.93, 2.6, 1.2),
        (VSCO, 'Strings/Harp/KSHarp_G3_mf.wav', 54.92, 2.4, 1.1), (VSCO, 'Strings/Harp/KSHarp_B3_mf.wav', 58.91, 2.4, 1.1),
        (VSCO, 'Strings/Harp/KSHarp_D4_mf.wav', 61.86, 2.2, 1.0), (VSCO, 'Strings/Harp/KSHarp_F4_mf.wav', 64.98, 2.2, 1.0),
        (VSCO, 'Strings/Harp/KSHarp_A4_mf.wav', 68.91, 2.0, 0.9), (VSCO, 'Strings/Harp/KSHarp_C5_mf.wav', 71.91, 2.0, 0.9),
        (VSCO, 'Strings/Harp/KSHarp_E5_mf.wav', 75.88, 1.8, 0.8),
    ], False),
    'bell': ('mallets', [
        (VCSL, PERC + 'Tubular Bells 2/TB_hit_C4_v2_1.wav', 60.0, 8.0, 3.0),
    ], False),
    'cello': ('strings', [
        (VSCO, 'Strings/Cello Section/susvib/susvib_B1_v1_1.wav', 47.0, 5.0, 0.35),
        (VSCO, 'Strings/Cello Section/susvib/susvib_D2_v1_1.wav', 50.06, 5.0, 0.35),
        (VSCO, 'Strings/Cello Section/susvib/susvib_F2_v1_1.wav', 53.03, 5.0, 0.35),
        (VSCO, 'Strings/Cello Section/susvib/susvib_A2_v1_1.wav', 57.03, 5.0, 0.35),
        (VSCO, 'Strings/Cello Section/susvib/susvib_C3_v1_1.wav', 60.03, 5.0, 0.35),
    ], True),
    'viola': ('strings', [
        (VSCO, 'Strings/Viola Section/susvib/ViolaEns_susvib_D3_v1_1.wav', 61.98, 5.0, 0.35),
        (VSCO, 'Strings/Viola Section/susvib/ViolaEns_susvib_F3_v1_1.wav', 65.05, 5.0, 0.35),
        (VSCO, 'Strings/Viola Section/susvib/ViolaEns_susvib_A3_v1_1.wav', 69.0, 5.0, 0.35),
        (VSCO, 'Strings/Viola Section/susvib/ViolaEns_susvib_C4_v1_1.wav', 72.02, 5.0, 0.35),
    ], True),
    'violin': ('strings', [
        (VSCO, 'Strings/Violin Section/susVib/VlnEns_susVib_C4_v1.wav', 72.04, 5.0, 0.35),
        (VSCO, 'Strings/Violin Section/susVib/VlnEns_susVib_E4_v1.wav', 76.01, 5.0, 0.35),
        (VSCO, 'Strings/Violin Section/susVib/VlnEns_susVib_G4_v1.wav', 79.04, 5.0, 0.35),
        (VSCO, 'Strings/Violin Section/susVib/VlnEns_susVib_B4_v1.wav', 83.06, 5.0, 0.35),
    ], True),
}

MS = 'mods/default/sounds/'
# foley: name -> [(repo, path, start s, seconds kept, fade s, lowpass Hz or 0)]
FOLEY = {
    'door': [(MTG, 'mods/doors/sounds/doors_door_close.ogg', 0, 0.6, 0.15, 0)],
    'stepHard': [(MTG, MS + 'default_hard_footstep.%d.ogg' % i, 0, 0.3, 0.08, 0) for i in (1, 2, 3)],
    'stepGrass': [(MTG, MS + 'default_sand_footstep.%d.ogg' % i, 0, 0.3, 0.08, 6000) for i in (1, 2, 3)],
    'chop': [(MTG, MS + 'default_dig_choppy.%d.ogg' % i, 0, 0.3, 0.08, 0) for i in (1, 2, 3)],
    'cajon': [(VCSL, PERC + 'Cajon/Cajon_hit2_pp_rr1.wav', 0, 0.45, 0.2, 0), (VCSL, PERC + 'Cajon/Cajon_hit3_p_rr1.wav', 0, 0.45, 0.2, 0)],
    'clave': [(VCSL, PERC + 'Claves/Claves2_Hit_v1_rr1_Mid.wav', 0, 0.35, 0.15, 0)],
    'bubbles': [(VSCO, 'Miscellania Raw/Misc 1/bubbles.wav', 0.1, 2.6, 0.3, 0), (VSCO, 'Miscellania Raw/Misc 1/bubbles4.wav', 0.0, 1.6, 0.3, 0)],
    'belltree': [(VCSL, PERC + 'Bell Tree/Stroke/BellTree_Stroke_1_Mid.wav', 0, 2.8, 1.0, 0)],
    'chimes': [(VCSL, PERC + 'Mark Trees/Legacy/windchimes_desc1.wav', 0, 4.6, 1.8, 0)],
    'cymbal': [(VCSL, PERC + 'Finger Cymbals/Fing_Cymb.wav', 0, 2.2, 1.2, 0)],
}

ORDER = ['piano', 'mallets', 'strings', 'foley']


def sources():
    seen = []
    for _, zones, _ in INSTRUMENTS.values():
        seen += [(z[0], z[1]) for z in zones]
    for clips in FOLEY.values():
        seen += [(c[0], c[1]) for c in clips]
    return seen


def fetch(dest):
    dest = pathlib.Path(dest)
    for (base, sub), path in sources():
        out = dest / sub / path
        if out.exists():
            continue
        out.parent.mkdir(parents=True, exist_ok=True)
        url = base + '/' + urllib.parse.quote(path)
        print('fetch', url)
        with urllib.request.urlopen(url) as r:
            out.write_bytes(r.read())


def build(src):
    import numpy as np
    import soundfile as sf
    from scipy import signal

    src = pathlib.Path(src)

    def load(repo, path):
        x, sr = sf.read(str(src / repo[1] / path), always_2d=True)
        return x.mean(axis=1), sr

    def resample(y, sr):
        if sr == RATE:
            return y
        f = Fraction(RATE, sr).limit_denominator(2000)
        return signal.resample_poly(y, f.numerator, f.denominator)

    def onset(m, sr):
        pk = np.max(np.abs(m)) + 1e-12
        i = int(np.argmax(np.abs(m) > pk * 0.03))
        return max(0, i - int(0.004 * sr))

    def shape(y, sr, keep, fade):
        y = y[:int(keep * sr)].copy()
        n = min(len(y), int(fade * sr))
        if n > 0:
            y[-n:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, n))
        k = min(len(y), int(0.002 * sr))
        y[:k] *= np.linspace(0, 1, k)
        return y

    def level(y, sr):
        # loudness over the first 0.4 s, with the lows rolled off as the ear does
        b, a = signal.butter(2, 150 / (sr / 2), 'high')
        h = signal.lfilter(b, a, y[:int(0.4 * sr)])
        return np.sqrt(np.mean(h ** 2)) + 1e-12

    def flatten(y, sr, start=0.45):
        # a held string note: even out the slow swells after the attack so it can loop
        w = int(0.25 * sr)
        env = np.sqrt(np.convolve(y ** 2, np.ones(w) / w, 'same')) + 1e-9
        i0 = int(start * sr)
        ref = np.median(env[i0:int(len(y) * 0.85)])
        g = np.ones_like(y)
        g[i0:] = np.clip(ref / env[i0:], 0.6, 1.7)
        ramp = int(0.25 * sr)
        g[i0:i0 + ramp] = 1 + (g[i0:i0 + ramp] - 1) * np.linspace(0, 1, ramp)
        g = np.convolve(g, np.ones(w) / w, 'same')
        return y * g

    def mp3(y, q=2):
        y = np.clip(y, -1, 1)
        with tempfile.TemporaryDirectory() as td:
            wav, out = pathlib.Path(td) / 'a.wav', pathlib.Path(td) / 'a.mp3'
            sf.write(str(wav), y, RATE, subtype='PCM_16')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(wav), '-c:a', 'libmp3lame', '-q:a', str(q), '-ar', str(RATE), '-ac', '1', str(out)], check=True)
            return base64.b64encode(out.read_bytes()).decode('ascii')

    files = {name: {} for name in ORDER}
    for name, (fname, zones, loop) in INSTRUMENTS.items():
        cut = []
        for repo, path, root, keep, fade in zones:
            m, sr = load(repo, path)
            m = resample(m[onset(m, sr):], sr)
            y = shape(m, RATE, keep, fade)
            if loop:
                y = flatten(y, RATE)
                y = shape(y, RATE, keep, fade)
            cut.append((root, y))
        # every zone of an instrument as loud as its neighbours, the loudest peak just under full scale
        ref = np.median([level(y, RATE) for _, y in cut])
        cut = [(root, y * ref / level(y, RATE)) for root, y in cut]
        top = max(np.max(np.abs(y)) for _, y in cut)
        cut = [(root, y * 0.89 / top) for root, y in cut]
        files[fname][name] = {'zones': [[round(root, 2), mp3(y)] for root, y in cut]}
        print(f'{name:7s} {len(cut)} zones, {sum(len(y) for _, y in cut) / RATE:5.1f} s')
    for name, clips in FOLEY.items():
        out = []
        for repo, path, start, keep, fade, lp in clips:
            m, sr = load(repo, path)
            m = m[int(start * sr):]
            m = resample(m[onset(m, sr):], sr)
            if lp:
                b, a = signal.butter(2, lp / (RATE / 2), 'low')
                m = signal.lfilter(b, a, m)
            y = shape(m, RATE, keep, fade)
            out.append(mp3(y * 0.89 / (np.max(np.abs(y)) + 1e-12), 4))
        files['foley'][name] = out
        print(f'foley {name:9s} {len(out)} clip(s)')
    total = 0
    for fname in ORDER:
        lines = ['/* Take Your Time — embedded sound: ' + fname + '. Generated by assets/audio/make_samples.py; do not edit.',
                 '   Sources and licences (CC0 / CC BY 3.0): CREDITS.md. Mono MP3, 32 kHz, base64. */',
                 '(function (S) {']
        if fname == 'foley':
            lines.append('  const F = (S.foley = S.foley || {});')
        for name, data in files[fname].items():
            if fname == 'foley':
                lines.append('  F.' + name + ' = [' + ', '.join("'" + b + "'" for b in data) + '];')
            else:
                z = ',\n    '.join("[%s, '%s']" % (root, b) for root, b in data['zones'])
                lines.append('  S.' + name + ' = { zones: [\n    ' + z + '] };')
        lines.append('})(window.TYT_SOUNDS = window.TYT_SOUNDS || {});')
        p = ROOT / (fname + '.js')
        p.write_text('\n'.join(lines) + '\n', encoding='utf-8')
        total += p.stat().st_size
        print(f'{p.name}: {p.stat().st_size / 1024:.0f} KB')
    print(f'total {total / 1024 / 1024:.2f} MB')


if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[1] == '--fetch':
        fetch(sys.argv[2])
    elif len(sys.argv) == 2:
        build(sys.argv[1])
    else:
        sys.exit(__doc__)
