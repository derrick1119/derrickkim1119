# Credits

## Typefaces

- Gowun Batang, Nanum Pen Script — SIL Open Font License 1.1 (`assets/fonts/OFL-*.txt`).

## Sound

The music and most sounds are played from short recordings embedded in `assets/audio/*.js`
(base64 MP3, mono, 32 kHz; about 2.5 MB in all). Every recording was mixed to mono, trimmed,
shortened with a fade, filtered and levelled, and re-encoded; `assets/audio/make_samples.py` does
all of it and lists each source file. Wind, rain, the cloud sea, page turns, paper, chalk, crayon,
bubbles, the creak of a swing, Bean's bark and the thunder are synthesised in `src/audio.js`.

### CC0 1.0 (public domain dedication) — no attribution required, credited with thanks

**Versilian Community Sample Library (VCSL)** — Versilian Studios LLC (Sam Gossner and contributors).
<https://github.com/sgossner/VCSL> (commit `c1ea7bc`), licence: CC0 1.0.

| Used as | Source |
| --- | --- |
| piano (`felt`) | Upright Piano, Knight — sustains, soft layer (sampled by Simon Dalzell of Ivy Audio) |
| music box (`box`), star shimmer (`glass`) | Glockenspiel — soft |
| celesta (`celesta`) | Vibraphone — soft mallets |
| harbour bell (`bell`, `A.toll`) | Tubular Bells 2 — C4 |
| knock body, plank under a step | Cajon — pp / p hits |
| knitting needles | Claves 2 |
| sparkle (`sparkle`) | Bell Tree — stroke |
| shooting star (`shoot`) | Mark Trees — descending |
| bicycle bell (`bike`) | Finger Cymbals |

**VS Chamber Orchestra 2: Community Edition (VSCO-2-CE)** — Versilian Studios LLC; recorded by Sam
Gossner and Simon Dalzell, sample cutting by Elan Hickler / Soundemote.
<https://github.com/sgossner/VSCO-2-CE> (commit `4403009`), licence: CC0 1.0.

| Used as | Source |
| --- | --- |
| strings (`strings`, pads, the bed's held tones) | Cello Section, Viola Section, Violin Section — sustain with vibrato, soft |
| harp (`pluck`) | Harp (KSHarp) — mf |
| boiling pot, pouring, splash | Miscellania Raw — bubbles |

**Freesound recordings, as packaged in Minetest Game** (<https://github.com/luanti-org/minetest_game>,
commit `9e895af`; attributions from its `mods/default/README.md`):

| Used as | File | Author, licence |
| --- | --- | --- |
| footstep on grass (`step-grass`) | `default_sand_footstep.1–3.ogg` | worthahep88, CC0 1.0 — <https://freesound.org/people/worthahep88/sounds/319224/> |
| hammer on wood (`knock`) | `default_dig_choppy.1–3.ogg` | Sheyvan, CC0 1.0 — <https://freesound.org/people/Sheyvan/sounds/476113/> |

### CC BY 3.0 — attribution required

These two are used under the Creative Commons Attribution 3.0 Unported licence
(<https://creativecommons.org/licenses/by/3.0/>). Changes: mixed to mono, trimmed, filtered,
levelled, resampled and re-encoded as MP3, and layered with other sounds at playback.

| Used as | File | Author |
| --- | --- | --- |
| footstep on the pier (`step-wood`) | `default_hard_footstep.1–3.ogg` (Minetest Game, `mods/default`) | **Erdie** — <https://freesound.org/people/Erdie/sounds/41579/> |
| door (`door`) | `doors_door_close.ogg` (Minetest Game, `mods/doors`) | **bennstir** (Freesound) |

No other sound material is used; nothing is fetched at run time.
