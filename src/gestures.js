/* Take Your Time — gestures and expressions: one shared, well-animated library for every emotional moment.

   Every gesture is a pose function: it takes the options object a figure is about to be drawn with (the `o` that
   F.person takes) and changes it, blended in by k (0..1) and moving with time t. Gestures are layers: they add to
   whatever pose the scene already gave (a lean, a lamp in one hand), and several can run at once (kneel + hug).
   Feet stay planted unless the figure is walking (steps are lifted and set down, never slid); hands are aimed with
   the arm IK at points computed from both figures' joints (F.joints / F.rig), always with the natural elbow.

   GESTURES (two-person ones take a partner: `with`)
     cry          sobbing: shoulders catching and shaking, head bowed. hands: 'face' (one to the eyes, default),
                  'both' (hiding the face), 'wipe' (wiping now and then), 'none'
     sob-hug      a hug, shaking with sobs, face down on the other's shoulder (partner: pat-back)
     hug          arms round the other's back, leaning in, a slow rock together (partner: hug). The taller goes
                  over (arms over the shoulders, head bowed over), the shorter under (arms round the middle, cheek on
                  the other's shoulder); role: 'high' | 'low' to choose
     pat-back     a hug whose near hand pats the other's back (partner: hug)
     laugh        head back, shoulders bouncing. hand: 'mouth' | 'belly' | none
     surprise     a small step back, hands up, eyes wide
     relief       a breath in, then out: the shoulders drop, eyes close
     forehead     two people lean their foreheads together, holding hands between them (partner: forehead)
     hold-hands   both hands meet exactly between the two, at a point both can reach (partner: hold-hands)
     hand-on-head a hand resting on (a child's) head, stroking a little (partner: under-hand, who looks up, pleased)
     cheek        a hand on the other's cheek, or one's own without `with`; arm: 'F' (default) | 'B' (partner:
                  lean-into, who closes their eyes into it; cover: true and their hand comes up to hold your wrist)
     wave         style: 'goodbye' (default, big), 'slow', 'soft' (low, small)
     look-up      gazing up at the sky. shade: true puts a hand over the eyes
     kneel        down on one knee: the back foot steps back, the front foot steps forward, then the hip lowers.
                  anchor: 'hip' (default) | 'front' | 'back' (which part stays where it was)
     sit-ground   a small step, then down onto the ground behind the feet, knees up, a hand behind for support.
                  hug: true holds the knees
     lean-on      head on the other's shoulder (partner: leaned-on)
     bow          a small polite bow. depth: 'nod' | 'small' (default) | 'deep'
     point        at: [x, y] in the world, or an actor / figure (their face). A finger goes out
     shy          a hand to the back of the neck, shoulders up, blushing
     shrug        shoulders up, palms up
   Each also sets a face, unless opts.face is false (keep the scene's) or names another preset.
   Drawing order: in a hug the one drawn first has their near arm round the other's back, so that arm must be drawn
   after the other person. The gesture marks it with o.armOver; the stage draws it last by itself. A scene that draws
   its own figures draws that one with skip: { armF: true }, then the other, then F.person(g, Object.assign({}, o,
   { only: 'armF', skip: null })).

   FACES (T.face): presets built on the face options F.person understands, the same on adults, children and old
   faces (they scale with the head; face.old keeps its lines):
     teary       eyes swimming (face.well), the brow worried, the mouth pressed and trembling
     sob         eyes screwed shut, the mouth open and pulled down, tears rolling (face.roll), trembling
     smileTears  a wobbly smile through tears, a tear rolling
     gentle      a soft closed-eye smile
     surprised   round eyes, raised brows, a round mouth
     softFrown   a gentle downturn, the brow worried
     laugh, relief, shy, wonder
   New face options on F.person (all optional): eye 'teary' | 'squeeze' | 'wide'; mouth 'o' | 'cry' | 'laugh' |
   'wobble' | 'tremble' | 'soft'; brow 'up' | 'worry' | 'knit'; well (0..1, tears standing in the eye);
   roll (a number: how far a tear has rolled; its whole part counts the tears) and rollA (its strength);
   tremble (0..1, any mouth shaking). And on the figure: o.shrug (shoulders up/down, units), o.fingerF (pointing).

   IDLE LIFE (opt-in): breathing, a slow weight shift with the feet staying put, the head drifting, and a little
   movement while the figure is talking. actor.idle = true (or X.idle(actor)) on the stage; T.pose.idle(o, t)
   for figures a scene draws itself.

   API
     T.gesture.play(actor, name, opts) → Promise. opts: { dur (seconds; Infinity or hold: true to stay until
       stopped), in, out (seconds to blend in and out), k (strength, or a function () => 0..1 to drive it from a
       tween the scene already runs), with (the partner: an actor, or figure options), mutual (put the partner's
       side on them too: default for two-person gestures), partner (their gesture, instead of the default),
       partnerOpts, face, ...the gesture's own options }. Resolves when it has finished (a held one: when it is
       fully in).
     T.gesture.stop(actor, name?, alone?) → Promise, resolved when it has blended out (both sides of a mutual one,
       unless alone).
     T.gesture.clear(actor), T.gesture.active(actor, name).
     T.gesture.apply(o, actor, t) — the drawing hook: the stage calls it after an actor's own pose.
     On the stage: X.gesture(actor, name, opts) (play, on the chapter's clock), X.ungesture(actor, name, alone)
       and X.idle(actor, on).
     Pure helpers, for scenes that draw figures themselves: T.pose.<name>(o, k, t, opts) changes o and returns
       it (camelCase names too: T.pose.sobHug); T.pose.pair(name, a, b, k, t, opts) poses both people of a
       two-person gesture against each other (opts.aTop when a is drawn over b); T.pose.idle(o, t, opts);
       T.face.set(o, preset, k, t). Helpers used by the gestures are there too: T.pose.step(o, dx, k) (a step forward
       with the feet lifted and set down), T.pose.headTo, T.pose.reach, T.pose.lookAt, T.pose.sob.

   EXAMPLES
     await X.gesture(ana, 'kneel', { hold: true, with: cloud });          // down on one knee, facing the child
     await X.gesture(ana, 'hug', { with: cloud, dur: 5 });                // both hug (cloud gets her side too)
     X.ungesture(ana, 'kneel');
     X.gesture(leo, 'cry', { hands: 'both', dur: 4 });
     // a scene drawing its own figures:
     const mom = { x, y, s: 132, style: F.styles.mom }, son = { ... };
     T.pose.pair('cheek', mom, son, touchK, T.time, { partnerOpts: { cover: true } });
     F.person(g, mom); F.person(g, son);
*/
(function () {
  'use strict';
  const T = window.TYT, F = T.F;
  const PI = Math.PI, TAU = PI * 2;
  const clamp = T.clamp, lerp = T.lerp;

  /* ---------------- small tools ---------------- */
  const seg = (k, a, b) => T.smooth((k - a) / (b - a));                  /* a stretch of k, eased in and out */
  const bump = (k, a, b) => Math.sin(clamp((k - a) / (b - a)) * PI);      /* up and back down over a stretch of k */
  const U = (o) => (o.s || 240) / 100;
  const SX = (o) => (o.flip ? -1 : 1);
  const toW = (o, p) => [o.x + SX(o) * U(o) * p[0], o.y + U(o) * p[1]];
  const toL = (o, p) => F.local(o, p[0], p[1]);
  const Kd = (o) => F.dims(o.style);
  const add = (o, key, v) => { o[key] = (o[key] || 0) + v; };
  const snap = (o) => Object.assign({}, o, { face: Object.assign({}, o.face) });
  const seedOf = (o) => { const st = o.style || {}; return (((st.top || '#000').charCodeAt(2) * 13 + (st.hair || '#000').charCodeAt(1) * 7 + Math.round(o.s || 0)) % 97) + 1; };
  const isActor = (w) => !!w && (w.lastO !== undefined || (w.id != null && w.ph != null));

  /* where the hand of one arm is now, in the figure's own units */
  function handNow(o, side) { const r = F.rig(o), a = side === 'B' ? r.ab : r.af; return [a[4], a[5]]; }
  /* aim a hand at a world point, blended from where it was by k; the elbow always bends the natural way */
  function reach(o, side, wp, k) {
    const tgt = toL(o, wp);
    const p = k >= 0.999 ? tgt : (() => { const h = handNow(o, side); return [lerp(h[0], tgt[0], k), lerp(h[1], tgt[1], k)]; })();
    o['arm' + side] = { hand: p, bend: 1 };
  }
  /* the same, for a point given in the figure's own units */
  function reachL(o, side, lp, k) { reach(o, side, toW(o, lp), k); }
  /* a point on the torso: t up the spine (0 hip … 32 neck, on a 30-unit scale), w to the front (+) or back (−) */
  function torsoL(o, t, w) {
    const r = F.rig(o), ts = r.K.torso / 30, ws = r.K.torsoW / 17;
    return [r.ax * t * ts - r.ay * w * ws, r.ay * t * ts + r.ax * w * ws];
  }
  const torsoW = (o, t, w) => toW(o, torsoL(o, t, w));
  /* a point on the head (F.HEAD_PTS name, plus an offset in head units), in the world */
  function headW(o, name, dx, dy) {
    const r = F.rig(o), R = r.K.R, c = Math.cos(r.hr), s = Math.sin(r.hr), q = F.HEAD_PTS[name] || [0, 0];
    const x = (q[0] + (dx || 0)) * R, y = (q[1] + (dy || 0)) * R;
    return toW(o, [r.head[0] + x * c - y * s, r.head[1] + x * s + y * c]);
  }
  /* the head point for a given lean and tilt, in local units (for the solver) */
  function headAt(o, lean, tilt, name) {
    const K = Kd(o), ha = lean * 0.55 + tilt, hr = ha + (o.headRot || 0);
    const hx = Math.sin(lean) * K.torso + Math.sin(ha) * K.neck + (o.headDx || 0), hy = -Math.cos(lean) * K.torso - Math.cos(ha) * K.neck + (o.headDy || 0);
    const q = F.HEAD_PTS[name] || [0, 0], x = q[0] * K.R, y = q[1] * K.R, c = Math.cos(hr), s = Math.sin(hr);
    return [hx + x * c - y * s, hy + x * s + y * c];
  }
  /* Lean and tilt so that one point of the head (forehead, cheek, center…) comes to a world point; k blends from
     where it was. o: { name, lean: [lo, hi], tilt: [lo, hi], prefTilt, prefLean, slack (units of headDx/Dy allowed) } */
  function headTo(o, wp, k, q) {
    q = q || {};
    const name = q.name || 'forehead', tgt = toL(o, wp);
    const l0 = o.lean || 0, t0 = o.headTilt || 0;
    const L = q.lean || [l0 - 0.45, l0 + 0.75], Tl = q.tilt || [t0 - 0.6, t0 + 0.8];
    const pl = q.prefLean == null ? l0 : q.prefLean, pt = q.prefTilt == null ? t0 : q.prefTilt;
    const cost = (l, h) => { const p = headAt(o, l, h, name), dx = p[0] - tgt[0], dy = p[1] - tgt[1]; return dx * dx + dy * dy + 8 * (h - pt) * (h - pt) + 4 * (l - pl) * (l - pl); };
    let best = [l0, t0], bc = Infinity;
    for (let l = L[0]; l <= L[1] + 1e-6; l += 0.05) for (let h = Tl[0]; h <= Tl[1] + 1e-6; h += 0.05) { const c = cost(l, h); if (c < bc) { bc = c; best = [l, h]; } }
    for (let n = 0; n < 2; n++) {
      const st = n ? 0.004 : 0.012, b0 = best.slice();
      for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) { const l = clamp(b0[0] + i * st, L[0], L[1]), h = clamp(b0[1] + j * st, Tl[0], Tl[1]), c = cost(l, h); if (c < bc) { bc = c; best = [l, h]; } }
    }
    o.lean = lerp(l0, best[0], k); o.headTilt = lerp(t0, best[1], k);
    const sl = q.slack == null ? 2.5 : q.slack;
    if (sl > 0) {   /* the last bit of the way: the neck gives a little */
      const p = headAt(o, best[0], best[1], name);
      add(o, 'headDx', clamp(tgt[0] - p[0], -sl, sl) * k); add(o, 'headDy', clamp(tgt[1] - p[1], -sl, sl) * k);
    }
    return best;
  }
  /* lean (forward or back) just enough for an arm to reach a world point */
  function leanToReach(o, side, wp, k, max) {
    const K = Kd(o), tgt = toL(o, wp), R = (K.ua + K.fa) * 0.96, sh = o.shrug || 0, l0 = o.lean || 0;
    const root = (l) => [Math.sin(l) * (K.sh + sh) + (side === 'B' ? -1.2 : 1.2), -Math.cos(l) * (K.sh + sh) + 1.5];
    const far = (l) => { const r0 = root(l); return Math.hypot(tgt[0] - r0[0], tgt[1] - r0[1]) - R; };
    if (far(l0) <= 0) return 0;
    /* bending over brings a hand forward and down, not up: for something above the shoulder, only a little */
    const up = clamp((root(l0)[1] - tgt[1]) / (K.ua + K.fa));
    const dir = tgt[0] >= 0 ? 1 : -1, lim = lerp(max == null ? 0.7 : max, 0.12, up);
    let l = l0;
    for (let i = 0; i < 40 && far(l) > 0 && Math.abs(l - l0) < lim; i++) l += dir * 0.025;
    o.lean = lerp(l0, l, k);
    return l - l0;
  }
  /* turn the face toward a world point (as far as a head turns) */
  function lookAt(o, wp, k, gain) {
    const r = F.rig(o), tgt = toL(o, wp), e = r.pt('eye');
    if (tgt[0] < e[0] - 2) return;
    const want = Math.atan2(tgt[1] - e[1], Math.max(2, tgt[0] - e[0]));
    const tilt = clamp(want - (o.lean || 0) * 0.55, -0.65, 0.75);
    o.headTilt = lerp(o.headTilt || 0, tilt, k * (gain == null ? 0.85 : gain));
  }
  /* planted feet: the standing feet, in the figure's own units (y down from the hip; the ground is just below L) */
  function feet0(o) { const K = Kd(o), L = K.thigh + K.shin; return { L, F: [1, L], B: [-1, L] }; }
  const freeLegs = (o) => !o.sit && o.walk == null && !o.legF && !o.legB && !o.noLegs;
  /* move the hip by d (units, from where it stood) and keep the feet at fF, fB (where they are, in the stand frame) */
  function place(o, d, fF, fB) {
    o.x += SX(o) * U(o) * d[0]; o.y += U(o) * d[1];
    o.legF = { foot: [fF[0] - d[0], fF[1] - d[1]] }; o.legB = { foot: [fB[0] - d[0], fB[1] - d[1]] };
  }
  /* a foot lifted from p0 and set down at p1 */
  const step = (p0, p1, k, lift) => [lerp(p0[0], p1[0], k), lerp(p0[1], p1[1], k) - Math.sin(clamp(k) * PI) * lift];
  /* a step (or a shuffle) forward by dx units: the front foot goes, the hip follows, the back foot comes after */
  function stepBy(o, dx, k) {
    if (!(k > 0)) return o;
    if (!freeLegs(o)) { o.x += SX(o) * U(o) * dx * T.smooth(k); return o; }
    const f = feet0(o), kF = seg(k, 0, 0.5), kB = seg(k, 0.42, 1);
    place(o, [dx * seg(k, 0.12, 0.88), 0], step(f.F, [f.F[0] + dx, f.L], kF, 4), step(f.B, [f.B[0] + dx, f.L], kB, 4));
    return o;
  }
  /* sobs: a quick catch of breath, a slower letting go, never quite regular (0..1) */
  function sob(t, seed) {
    const ph = t * 1.45 + 0.7 * T.noise(t * 0.33, (seed || 0) + 1);
    const f = ph - Math.floor(ph);
    const p = f < 0.16 ? T.smooth(f / 0.16) : Math.exp(-(f - 0.16) * 5.4);
    return p * (0.6 + 0.4 * (0.5 + 0.5 * T.noise(t * 0.41, (seed || 0) + 3)));
  }
  const tremor = (t) => Math.sin(t * 31) * 0.5 + Math.sin(t * 47 + 1.3) * 0.32 + Math.sin(t * 19 + 0.4) * 0.18;

  /* ---------------- faces ---------------- */
  const FACES = {
    teary: (k, t, s) => ({ eye: 'teary', well: 0.95 * k, brow: 'worry', mouth: 'tremble', tremble: 0.45 * k, blush: 0.24 + 0.12 * k }),
    sob: (k, t, s) => ({ eye: 'squeeze', mouth: 'cry', tremble: 0.85 * k, well: 0.7 * k, roll: t / 1.35 + s * 0.13, rollA: k, brow: 'worry', blush: 0.3 + 0.12 * k }),
    smileTears: (k, t, s) => ({ eye: 'happy', mouth: 'wobble', tremble: 0.5 * k, well: 0.9 * k, roll: t / 1.8 + s * 0.17, rollA: 0.9 * k, blush: 0.3 + 0.1 * k }),
    gentle: (k) => ({ eye: 'happy', mouth: 'smile', blush: 0.26 + 0.1 * k }),
    surprised: (k) => ({ eye: 'wide', mouth: 'o', brow: 'up' }),
    softFrown: (k) => ({ eye: 'sad', mouth: 'soft', brow: 'worry' }),
    laugh: (k) => ({ eye: 'happy', mouth: 'laugh', blush: 0.3 + 0.14 * k }),
    relief: (k) => ({ eye: 'closed', mouth: 'smile', blush: 0.26 }),
    shy: (k) => ({ eye: 'happy', mouth: 'smile', blush: 0.3 + 0.25 * k }),
    wonder: (k) => ({ eye: 'open', mouth: 'o', brow: 'up', blush: 0.22 }),
  };
  T.face = {
    presets: FACES,
    /* merge a preset into o.face; discrete things (which eye, which mouth) switch over a third of the way in */
    set(o, name, k, t, seed) {
      if (k == null) k = 1;
      const fn = FACES[name]; if (!fn || !(k > 0)) return o;
      k = clamp(k);
      const f = fn(k, t == null ? T.time : t, seed == null ? seedOf(o) : seed), cur = o.face || {}, out = Object.assign({}, cur);
      for (const key in f) {
        const v = f[key];
        if (typeof v === 'number') out[key] = key === 'roll' ? v : cur[key] != null && typeof cur[key] === 'number' && key !== 'blush' ? Math.max(cur[key], v) : v;
        else if (k > 0.34) out[key] = v;
      }
      o.face = out;
      return o;
    },
  };
  const faceOf = (o, c, def, k, t) => { const f = c.opts.face; if (f === false) return; T.face.set(o, typeof f === 'string' ? f : def, k, t, c.seed); };

  /* ---------------- the gestures ---------------- */
  const DEFS = {};
  function def(name, d) { DEFS[name] = Object.assign({ in: 0.8, out: 0.8, dur: 3 }, d); }

  /* crying: sobs catch the shoulders and let them go; the head goes down; a hand to the eyes */
  def('cry', {
    in: 0.9, out: 1.1, dur: 4.5,
    pose(o, k, t, c) {
      const s = sob(t, c.seed) * k, tr = tremor(t) * k;
      add(o, 'shrug', 2.3 * s + 0.22 * tr);
      add(o, 'lean', 0.12 * k + 0.035 * s);
      add(o, 'headTilt', 0.4 * k + 0.07 * s);
      add(o, 'headDy', 0.5 * s);
      const hands = c.opts.hands || 'face';
      if (hands === 'face' || hands === 'both') {
        const w = Math.sin(t * 0.9 + c.seed) * 0.08;
        reach(o, 'F', headW(o, 'eye', 0.55, 0.12 + w), k);
        if (hands === 'both') reach(o, 'B', headW(o, 'brow', 0.42, 0.32), k);
        else reachL(o, 'B', torsoL(o, 9, 10.5), k * 0.85);   /* the other hand held against her middle */
      } else if (hands === 'wipe') {
        const cy = ((t + c.seed) / 3.4) % 1, up = seg(cy, 0, 0.18) * (1 - seg(cy, 0.55, 0.8));
        reach(o, 'F', headW(o, 'eye', 0.5 - 0.12 * Math.sin(cy * TAU * 3), 0.2), k * up);
      }
      faceOf(o, c, 'sob', k, t);
    },
  });

  /* a hug: lean in until the chests meet, the near arm round the other's upper back, the far one round the waist,
     and the two rock together, slowly */
  /* who goes over and who goes under: the taller one's arms over the other's shoulders and head bowed over theirs;
     the shorter one's arms round the middle and cheek against the other's shoulder (the one drawn on top, if equal) */
  function hugRole(o, c) {
    if (c.opts.role) return c.opts.role;
    if (c.opts.mateRole) return c.opts.mateRole === 'low' ? 'high' : 'low';
    const dh = (F.joints(c.wb).shoulder[1] - F.joints(o).shoulder[1]) / U(o);
    if (Math.abs(dh) > 3) return dh > 0 ? 'high' : 'low';
    return c.top ? 'low' : 'high';
  }
  function hugBody(o, k, t, c, role) {
    const w = c.w, d = Math.abs(toL(o, [w.x, w.y])[0]), K = Kd(o), u = U(o);
    const me = F.joints(o), it = F.joints(c.wb);
    const lower = clamp((it.shoulder[1] - me.shoulder[1]) / u / K.torso, 0, 1.4);   /* how far down the other is */
    const lean = Math.min(0.7, clamp(Math.asin(clamp((d * 0.5 - K.torsoW * 0.4) / (K.torso * 0.7), -1, 1)), 0.03, 0.4) + lower * 0.38);
    o.lean = lerp(o.lean || 0, lean, k);
    o.lean += k * 0.024 * Math.sin(t * 1.15 + (c.shared || 0)) * SX(o);   /* rocking: both the same way in the world */
    if (role === 'high') add(o, 'headTilt', (0.22 + lower * 0.2) * k);
    else {   /* the cheek against the front of their shoulder, or against them wherever the head comes to */
      const head = F.joints(o).head, top = torsoW(w, 28.5, 4.5);
      let p = top;
      if (head[1] - top[1] > Kd(o).R * u * 1.6) {
        const r = F.rig(w), tt = clamp((head[1] - w.y) / (U(w) * r.ay * (r.K.torso / 30)), 2, 28);
        p = torsoW(w, tt, 7.5);
      }
      headTo(o, p, k * 0.85, { name: 'cheek', prefTilt: (o.headTilt || 0) + 0.12, slack: 1.5 });
    }
    if (!c.top) o.armOver = true;
  }
  function hugArms(o, k, t, c, role, pat) {
    const w = c.w, hi = role === 'high';
    const back = torsoW(w, hi ? 24 : 15, -9.4 - (pat || 0)), far = torsoW(w, hi ? 13 : 9, c.top ? 6 : -8.6);
    leanToReach(o, 'F', back, k, 0.25);
    reach(o, 'F', back, k);
    reach(o, 'B', far, k);
  }
  def('hug', {
    in: 1.0, out: 0.9, dur: 4, partner: 'hug', needs: true,
    pose(o, k, t, c) { const r = hugRole(o, c); hugBody(o, k, t, c, r); hugArms(o, k, t, c, r); faceOf(o, c, 'gentle', k, t); },
  });
  /* the near hand pats the other's back: down quickly, a moment there, up again */
  def('pat-back', {
    in: 1.0, out: 0.9, dur: 4, partner: 'hug', needs: true,
    pose(o, k, t, c) {
      const r = hugRole(o, c);
      hugBody(o, k, t, c, r);
      const p = ((c.tl + c.seed * 0.1) / 0.66) % 1, lift = p < 0.12 ? 1 - T.smooth(p / 0.12) : p < 0.34 ? 0 : T.smooth((p - 0.34) / 0.66);
      hugArms(o, k, t, c, r, 4.2 * lift * seg(c.tl, 0.6, 1.2));
      faceOf(o, c, 'gentle', k, t);
    },
  });
  def('sob-hug', {
    in: 1.1, out: 1.1, dur: 5, partner: 'pat-back', needs: true, role: 'low',
    pose(o, k, t, c) {
      const r = c.opts.role || 'low';
      hugBody(o, k, t, c, r);   /* face down on the other's shoulder */
      const s = sob(t, c.seed) * k;
      add(o, 'shrug', 2.1 * s + 0.2 * tremor(t) * k); add(o, 'headTilt', 0.06 * s); add(o, 'headDy', 0.5 * s);
      hugArms(o, k, t, c, r);
      faceOf(o, c, 'sob', k, t);
    },
  });

  /* laughing: the head goes back, the shoulders bounce, it comes in bursts */
  def('laugh', {
    in: 0.35, out: 0.8, dur: 2.4,
    pose(o, k, t, c) {
      const burst = 0.55 + 0.45 * Math.max(0, Math.sin(c.tl * 2.1 + 0.6)), b = Math.abs(Math.sin(t * 9.4)) * burst * k;
      add(o, 'shrug', 1.4 * b); add(o, 'headTilt', -0.2 * k - 0.06 * b); add(o, 'lean', -0.04 * k + 0.035 * b); add(o, 'headDy', -0.3 * b);
      const h = c.opts.hand;
      if (h === 'mouth') reach(o, 'F', headW(o, 'mouth', 0.45, 0.05), k);
      else if (h === 'belly') reachL(o, 'F', torsoL(o, 7, 10.6), k);
      faceOf(o, c, 'laugh', k, t);
      if (h === 'mouth' && c.opts.face !== false) o.face.mouth = 'smile';
    },
  });

  /* surprise: a small step back, the hands come up, eyes wide */
  def('surprise', {
    in: 0.32, out: 0.9, dur: 1.8, curve: T.ease.out3,
    pose(o, k, t, c) {
      if (freeLegs(o)) {
        const f = feet0(o), kb = seg(k, 0, 0.6);
        const fb = step(f.B, [-9, f.L], kb, 3), hx = -3.2 * seg(k, 0.15, 0.8);
        place(o, [hx, 0.5 * bump(k, 0, 0.6)], f.F, fb);
      }
      add(o, 'lean', -0.12 * k); add(o, 'headTilt', -0.1 * k); add(o, 'shrug', 1.2 * k);
      reachL(o, 'F', torsoL(o, 26, 13.5), k); reachL(o, 'B', torsoL(o, 23, 11), k);
      faceOf(o, c, 'surprised', k, t);
    },
  });

  /* relief: a breath in, and out: the shoulders let go, the eyes close */
  def('relief', {
    in: 1.9, out: 1.2, dur: 3.6, curve: (x) => x,
    pose(o, k, t, c) {
      const inh = c.out ? 0 : bump(k, 0, 0.42), exh = seg(k, 0.3, 1);
      add(o, 'shrug', 1.4 * inh - 1.6 * exh);
      add(o, 'lean', -0.035 * inh + 0.03 * exh);
      add(o, 'headTilt', -0.1 * inh + 0.13 * exh);
      if (c.opts.face !== false) {
        T.face.set(o, 'relief', exh, t, c.seed);
        if (exh > 0.25 && exh < 0.75 && !c.out) o.face.mouth = 'o';
      }
    },
  });

  /* two foreheads together: each leans and bows until the brows meet in the middle; hands held between them */
  def('forehead', {
    in: 1.5, out: 1.0, dur: 4, partner: 'forehead', needs: true,
    pose(o, k, t, c) {
      const me = F.joints(o), it = F.joints(c.wb);
      const dir = Math.sign(it.head[0] - me.head[0]) || 1;
      /* they meet nearer the lower head: the taller one has further to come down than the shorter can come up */
      const lo = me.head[1] > it.head[1] ? me.head : it.head, hi = lo === me.head ? it.head : me.head;
      const M = [(me.head[0] + it.head[0]) / 2, lerp(lo[1], hi[1], 0.25)];
      const gap = 0.35 * U(o);
      headTo(o, [M[0] - dir * gap, M[1] - Kd(o).R * U(o) * 0.25], k, { name: 'forehead', prefTilt: (o.headTilt || 0) + 0.25, tilt: [(o.headTilt || 0) - 0.5, (o.headTilt || 0) + 0.75] });
      if (c.opts.hands !== 'none') {
        const P = holdPoint(o, c, 'chest');
        if (P) { reach(o, 'F', [P[0] - dir * 1.2 * U(o), P[1]], k); reach(o, 'B', [P[0] - dir * 0.4 * U(o), P[1] + 2.5 * U(o)], k); }
      }
      faceOf(o, c, 'gentle', k, t);
      if (c.opts.face == null) o.face.eye = k > 0.4 ? 'closed' : o.face.eye;
    },
  });

  /* the point where two hands meet: the lowest point both arms can reach (arms hanging easy), the same for both */
  function holdPoint(o, c, height) {
    const link = c.link;
    if (link && link.stamp === c.now && link.P) return link.P;
    const me = F.joints(o), it = F.joints(c.wb);
    const armOf = (a, b) => ((b.hip[0] - a.hip[0]) * a.sx >= 0 ? 'rootF' : 'rootB');
    const A = me[armOf(me, it)], B = it[armOf(it, me)];
    const KA = Kd(o), KB = Kd(c.wb);
    const rA = (KA.ua + KA.fa) * me.u * 0.9, rB = (KB.ua + KB.fa) * it.u * 0.9;
    let P;
    if (height === 'chest') P = [(A[0] + B[0]) / 2, Math.max(A[1], B[1]) + 9 * Math.min(me.u, it.u)];
    else {
      const d = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const lowA = [A[0], A[1] + rA], lowB = [B[0], B[1] + rB];
      const inside = (p, C, r) => Math.hypot(p[0] - C[0], p[1] - C[1]) <= r + 0.01;
      if (d > rA + rB) P = [lerp(A[0], B[0], rA / (rA + rB)), lerp(A[1], B[1], rA / (rA + rB))];
      else if (inside(lowA, B, rB)) P = lowA;
      else if (inside(lowB, A, rA)) P = lowB;
      else {   /* where the two reaches cross, the lower of the two points */
        const a = (rA * rA - rB * rB + d * d) / (2 * d), h = Math.sqrt(Math.max(0, rA * rA - a * a));
        const mx = A[0] + (a * (B[0] - A[0])) / d, my = A[1] + (a * (B[1] - A[1])) / d;
        const p1 = [mx + (h * (B[1] - A[1])) / d, my - (h * (B[0] - A[0])) / d], p2 = [mx - (h * (B[1] - A[1])) / d, my + (h * (B[0] - A[0])) / d];
        P = p1[1] > p2[1] ? p1 : p2;
      }
      P = [P[0], P[1] - 2.2 * Math.min(me.u, it.u)];   /* a little bend at the elbows */
    }
    if (link) { link.stamp = c.now; link.P = P; }
    return P;
  }
  def('hold-hands', {
    in: 0.8, out: 0.6, dur: 4, partner: 'hold-hands', needs: true,
    pose(o, k, t, c) {
      const P = holdPoint(o, c, c.opts.height || 'low');
      if (!P) return;
      const side = (c.wb.x - o.x) * SX(o) >= 0 ? 'F' : 'B';
      reach(o, c.opts.arm || side, P, k);
      if (c.opts.face) T.face.set(o, c.opts.face, k, t, c.seed);
    },
  });

  /* a hand on someone's head (on the hat, if there is one), stroking a little; they look up, pleased */
  def('hand-on-head', {
    in: 0.9, out: 0.8, dur: 3.5, partner: 'under-hand', needs: true,
    pose(o, k, t, c) {
      const w = c.w, top = w.style.knit ? headW(w, 'center', -0.28, -1.36) : headW(w, 'crown', 0.1, -0.08);
      const st = Math.sin(t * 1.7 + c.seed) * 1.3 * U(w), p = [top[0] + st, top[1] - Math.abs(st) * 0.25];
      lookAt(o, headW(w, 'eye'), k, 0.7);
      leanToReach(o, 'F', p, k, 0.55);
      reach(o, 'F', p, k);
      if (!c.top) o.armOver = true;   /* the hand lies on their head: drawn over them */
      faceOf(o, c, 'gentle', k, t);
    },
  });
  def('under-hand', {
    in: 0.9, out: 0.8, dur: 3.5, needs: true,
    pose(o, k, t, c) {
      add(o, 'headTilt', -0.1 * k); add(o, 'shrug', 0.8 * k * (0.8 + 0.2 * Math.sin(t * 2)));
      faceOf(o, c, 'shy', k, t);
    },
  });

  /* a hand on a cheek: the other's (the near hand, on the near cheek), or one's own */
  def('cheek', {
    in: 1.0, out: 0.9, dur: 3.5, partner: 'lean-into',
    pose(o, k, t, c) {
      const w = c.w, side = c.opts.arm || 'F';
      if (w) {
        const p = headW(w, 'cheek', 0.06 + Math.sin(t * 1.1 + c.seed) * 0.05, -0.02);
        lookAt(o, headW(w, 'eye'), k, 0.6);
        leanToReach(o, side, p, k, 0.5);
        reach(o, side, p, k);
        if (!c.top && side === 'F') o.armOver = true;   /* the hand is on their face: drawn over them */
        faceOf(o, c, 'gentle', k, t);
      } else {
        add(o, 'headTilt', 0.1 * k);
        reach(o, 'F', headW(o, 'cheek', 0.12, 0.08), k);
        faceOf(o, c, 'gentle', k, t);
      }
    },
  });
  /* leaning into a hand on the cheek: the eyes close; with cover, a hand comes up over it */
  def('lean-into', {
    in: 1.0, out: 0.9, dur: 3.5, needs: true,
    pose(o, k, t, c) {
      add(o, 'headTilt', 0.12 * k); add(o, 'lean', 0.03 * k);
      if (c.opts.cover) {   /* holding the wrist of the hand on the cheek (whichever of theirs it is) */
        const j = F.joints(c.w), me = F.joints(o), dF = Math.hypot(j.handF[0] - me.cheek[0], j.handF[1] - me.cheek[1]), dB = Math.hypot(j.handB[0] - me.cheek[0], j.handB[1] - me.cheek[1]);
        const h = dF <= dB ? j.handF : j.handB, e = dF <= dB ? j.elbowF : j.elbowB, kk = seg(k, 0.35, 1);
        reach(o, 'F', [lerp(e[0], h[0], 0.6), lerp(e[1], h[1], 0.6) + 1.2 * U(o)], kk);
      }
      faceOf(o, c, 'gentle', k, t);
    },
  });

  /* waving: the forearm swings from the elbow; the whole body goes with it a little */
  const WAVES = { goodbye: { a: 2.45, b0: 0.08, b1: 0.78, f: 6.4 }, slow: { a: 2.25, b0: 0.2, b1: 0.68, f: 3.1 }, soft: { a: 1.5, b0: 0.62, b1: 1.12, f: 4.0 } };
  def('wave', {
    in: 0.5, out: 0.6, dur: 3,
    pose(o, k, t, c) {
      const W = WAVES[c.opts.style] || WAVES.goodbye, side = c.opts.arm || 'F';
      const sw = 0.5 + 0.5 * Math.sin(t * W.f + c.seed);
      const spec = { a: W.a, b: lerp(W.b0, W.b1, sw) };
      const tmp = Object.assign({}, o, side === 'B' ? { armB: spec } : { armF: spec }), r = F.rig(tmp), a = side === 'B' ? r.ab : r.af;
      reachL(o, side, [a[4], a[5]], k);
      add(o, 'lean', 0.012 * Math.sin(t * W.f * 0.5) * k); add(o, 'headTilt', -0.04 * k);
      faceOf(o, c, 'gentle', k, t);
    },
  });

  /* looking up at the sky */
  def('look-up', {
    in: 1.3, out: 1.0, dur: 4,
    pose(o, k, t, c) {
      add(o, 'headTilt', -0.5 * k + Math.sin(t * 0.37 + c.seed) * 0.035 * k);
      add(o, 'lean', -0.05 * k); add(o, 'shrug', -0.3 * k);
      if (c.opts.shade) reach(o, 'F', headW(o, 'brow', 0.62, -0.12), k);
      faceOf(o, c, 'wonder', k, t);
    },
  });

  /* down on one knee: the back foot steps back, the front foot steps forward, then the hip goes down until the
     back knee is on the ground. Played backwards (blending out), it is standing up again. */
  def('kneel', {
    in: 1.6, out: 1.4, dur: Infinity, curve: (x) => x,
    pose(o, k, t, c) {
      if (o.sit || o.walk != null || o.noLegs) return;
      const K = Kd(o), f = feet0(o), L = f.L, T_ = K.thigh;
      const an = c.opts.anchor || 'hip';
      const fF1x = 0.44 * L, fB1x = -0.36 * L;   /* the feet, from the hip, at the end */
      const hx1 = an === 'front' ? f.F[0] - fF1x : an === 'back' ? f.B[0] - fB1x : (c.opts.dx || 0);
      const hy1 = L - 2 - T_ * 0.97;
      const kB = seg(k, 0, 0.3), kF = seg(k, 0.28, 0.54), kD = seg(k, 0.4, 1);
      const fb = an === 'back' ? f.B : step(f.B, [hx1 + fB1x, L - 1], kB, 4);
      const ff = an === 'front' ? f.F : step(f.F, [hx1 + fF1x, L], kF, 5);
      const hx = hx1 * seg(k, 0.1, 0.75), hy = hy1 * kD + 1.2 * bump(k, 0, 0.5);
      place(o, [hx, hy], ff, fb);
      add(o, 'lean', (0.08 + (c.opts.lean || 0)) * kD + 0.06 * bump(k, 0.3, 0.8));
      if (c.w) lookAt(o, headW(c.w, 'eye'), kD, 0.7);
      if (!o.armF && c.opts.rest !== false) { const r = F.rig(o); reachL(o, 'F', [r.lf[2] + 1, r.lf[3] - 3.2], seg(k, 0.55, 1)); }
      if (c.opts.face) T.face.set(o, c.opts.face, k, t, c.seed);
    },
  });

  /* sitting down on the ground: a small step, then a crouch with the feet where they are, the seat going down and
     back behind them; a hand goes back to the ground, the other rests on a knee (or both hold the knees) */
  def('sit-ground', {
    in: 2.0, out: 1.6, dur: Infinity, curve: (x) => x,
    pose(o, k, t, c) {
      if (o.sit || o.walk != null || o.noLegs) return;
      const K = Kd(o), f = feet0(o), L = f.L;
      const hx1 = -(c.opts.hug ? 0.36 : 0.6) * L, hy1 = L + 1.6 - K.torsoW * 0.47;
      const kf = seg(k, 0, 0.22), kc = seg(k, 0.14, 0.74), kx = seg(k, 0.26, 0.82), ks = seg(k, 0.7, 1);
      /* one small step forward with the front foot first; from then on the feet stay where they are */
      const ff = step(f.F, [f.F[0] + 0.14 * L, L], kf, 3), fb = f.B;
      place(o, [hx1 * kx, hy1 * kc], ff, fb);
      add(o, 'lean', 0.34 * bump(k, 0.1, 0.8) - 0.07 * ks);
      add(o, 'headTilt', -0.05 * ks);
      const gy = L + 1.4 - hy1 * kc;   /* the ground, from where the hip is now */
      const knee = (() => { const r = F.rig(o); return [r.lf[2], r.lf[3]]; })();
      if (c.opts.hug) { reachL(o, 'F', [knee[0] + 1, knee[1] + 6], seg(k, 0.5, 1)); reachL(o, 'B', [knee[0] - 1, knee[1] + 8], seg(k, 0.5, 1)); }
      else {
        reachL(o, 'B', [-0.3 * L, gy], seg(k, 0.35, 0.8));
        reachL(o, 'F', [knee[0] - 1.5, knee[1] - 1.8], seg(k, 0.55, 1));
      }
      if (c.opts.face) T.face.set(o, c.opts.face, k, t, c.seed);
    },
  });

  /* a head on someone's shoulder */
  def('lean-on', {
    in: 1.5, out: 1.0, dur: 5, partner: 'leaned-on', needs: true,
    pose(o, k, t, c) {
      const it = F.joints(c.wb), R = Kd(o).R * U(o), me = F.joints(o);
      const dir = Math.sign(it.shoulder[0] - me.shoulder[0]) || 1;
      /* their shoulder, if it is not above where this head is: a small one leans in against the other's side instead */
      const tgt = [it.shoulder[0] - dir * R * 0.55, Math.max(it.shoulder[1] - R * 0.95, me.head[1] - R * 0.2)];
      const fwd = (tgt[0] - o.x) * SX(o) > 0;
      headTo(o, tgt, k, { name: 'center', prefTilt: (o.headTilt || 0) + (fwd ? 0.25 : -0.12), lean: [(o.lean || 0) - 0.28, (o.lean || 0) + 0.5], slack: 2 });
      add(o, 'shrug', -0.4 * k);
      faceOf(o, c, 'gentle', k, t);
      if (c.opts.face == null && k > 0.4) o.face.eye = 'closed';
    },
  });
  def('leaned-on', {
    in: 1.5, out: 1.0, dur: 5, needs: true,
    pose(o, k, t, c) {
      const fwd = (c.wb.x - o.x) * SX(o) > 0;
      add(o, 'headTilt', (fwd ? 0.1 : -0.07) * k);
      faceOf(o, c, 'gentle', k, t);
    },
  });

  /* a small polite bow: from the hip, the hands together in front */
  const BOWS = { nod: [0.04, 0.3, 0], small: [0.3, 0.2, 1], deep: [0.62, 0.18, 1] };
  def('bow', {
    in: 0.5, out: 0.65, dur: 1.5,
    pose(o, k, t, c) {
      const B = BOWS[c.opts.depth] || BOWS.small;
      add(o, 'lean', B[0] * k); add(o, 'headTilt', B[1] * k);
      if (B[2]) { reachL(o, 'F', torsoL(o, 3, 11.5), k); reachL(o, 'B', torsoL(o, 4, 9.5), k); }
      if (c.opts.face) T.face.set(o, c.opts.face, k, t, c.seed);
      else if (o.face) o.face = Object.assign({}, o.face, k > 0.5 ? { eye: 'closed' } : {});
    },
  });

  /* pointing: the arm straight out toward it, a finger out, the face turned to it */
  def('point', {
    in: 0.5, out: 0.6, dur: 2.5,
    pose(o, k, t, c) {
      const at = c.opts.at || (c.w && headW(c.w, 'eye'));
      if (!at) return;
      const wp = Array.isArray(at) ? at : at.style ? headW(at.lastO || at, 'eye') : null;
      if (!wp) return;
      add(o, 'lean', 0.04 * k);
      const r = F.rig(o), tg = toL(o, wp), s0 = r.rootF, dx = tg[0] - s0[0], dy = tg[1] - s0[1], d = Math.hypot(dx, dy) || 1, L = (r.K.ua + r.K.fa) * 0.93;
      reachL(o, 'F', [s0[0] + (dx / d) * L, s0[1] + (dy / d) * L], k);
      o.fingerF = seg(k, 0.4, 1);
      lookAt(o, wp, k, 0.8);
      if (c.opts.face) T.face.set(o, c.opts.face, k, t, c.seed);
    },
  });

  /* shy: a hand goes to the back of the neck, the shoulders come up, the head goes down a little */
  def('shy', {
    in: 0.6, out: 0.7, dur: 3,
    pose(o, k, t, c) {
      add(o, 'shrug', 1.0 * k); add(o, 'headTilt', (0.13 + 0.035 * Math.sin(t * 1.3 + c.seed)) * k); add(o, 'lean', 0.016 * Math.sin(t * 1.1 + c.seed) * k);
      reach(o, c.opts.arm || 'B', headW(o, 'nape', -0.05, 0.05), k);   /* the far hand: it shows behind the head, the elbow up in front */
      faceOf(o, c, 'shy', k, t);
    },
  });
  /* a shrug: shoulders up, palms up and out */
  def('shrug', {
    in: 0.35, out: 0.5, dur: 1.4,
    pose(o, k, t, c) {
      add(o, 'shrug', 2.7 * k); add(o, 'headTilt', 0.07 * k);
      const tmp = Object.assign({}, o, { armF: { a: 0.22, b: 1.5 }, armB: { a: 0.12, b: 1.42 } }), r = F.rig(tmp);
      reachL(o, 'F', [r.af[4], r.af[5]], k); reachL(o, 'B', [r.ab[4], r.ab[5]], k);
      if (c.opts.face !== false && k > 0.3) o.face = Object.assign({}, o.face, { brow: 'up', mouth: 'line' });
    },
  });

  /* ---------------- idle life ---------------- */
  function idle(o, t, q) {
    q = q || {};
    const k = q.k == null ? 1 : q.k; if (k <= 0) return o;
    const sd = q.seed == null ? seedOf(o) : q.seed;
    const br = Math.sin((t * TAU) / (3.7 + (sd % 7) * 0.13) + sd);      /* a breath every four seconds or so */
    add(o, 'shrug', 0.42 * br * k);
    if (o.walk != null) return o;
    add(o, 'lean', 0.008 * br * k);
    add(o, 'headTilt', (0.032 * T.noise(t * 0.23, sd) + 0.028 * T.noise(t * 0.071, sd + 5)) * k);   /* the head drifts; now and then it looks at something */
    if (q.talking) add(o, 'headTilt', 0.035 * T.noise(t * 2.6, sd + 11) * k);   /* talking moves the head a little */
    for (const side of ['armF', 'armB']) {   /* hanging arms move with the breath */
      const a = o[side];
      if (a && a.hand) continue;
      o[side] = { a: (a ? a.a || 0 : 0) + 0.018 * br * k * (side === 'armF' ? 1 : 0.8), b: (a ? a.b || 0 : 0.12) + 0.015 * br * k };
    }
    const ws = T.noise(t * 0.105, sd + 9);   /* the weight goes from one foot to the other, slowly */
    if (freeLegs(o) && !q.noShift) {
      const f = feet0(o), sh = 1.5 * ws * k;
      place(o, [sh, 0.45 * Math.abs(ws) * k], f.F, f.B);
      add(o, 'lean', -0.012 * ws * k);
    } else if (o.sit || o.legF) add(o, 'lean', 0.022 * ws * k);
    return o;
  }

  /* ---------------- playing them on actors ---------------- */
  const clockOf = (g) => g.clock || (T.director.cur && T.director.cur.clock) || null;
  const nowOf = (g) => { const c = clockOf(g); return c ? c.t : T.time; };
  function make(actor, name, opts) {
    const d = DEFS[name];
    if (!d) throw new Error('no such gesture: ' + name);
    const g = { name, d, opts, t0: 0, clock: opts.clock || null, in: opts.in == null ? d.in : opts.in, out: opts.out == null ? d.out : opts.out,
      curve: d.curve || T.ease.io, weight: typeof opts.k === 'number' ? opts.k : 1, drive: typeof opts.k === 'function' ? opts.k : null, stopAt: null, link: null, mate: null, done: false, res: [] };
    g.t0 = nowOf(g);
    const dur = opts.hold ? Infinity : opts.dur == null ? d.dur : opts.dur;
    g.dur = dur;
    if (isFinite(dur) && !g.drive) g.stopAt = g.t0 + Math.max(g.in, dur - g.out);
    actor.gestures = (actor.gestures || []).filter((q) => { if (q.name === name) { q.done = true; finish(q); return false; } return true; });
    actor.gestures.push(g);
    g.actor = actor;
    return g;
  }
  function finish(g) { const r = g.res; g.res = []; r.forEach((f) => f()); }
  async function until(g, when) {
    for (;;) {
      if (g.done) return;
      const at = when(); if (at == null) return;
      const c = clockOf(g), d = at - nowOf(g);
      if (d <= 1e-4) return;
      if (c) await c.wait(d); else await new Promise((r) => setTimeout(r, d * 1000));
    }
  }
  const endOf = (g) => (g.stopAt == null ? null : g.stopAt + g.out);
  function remove(g) { const a = g.actor; if (a && a.gestures) a.gestures = a.gestures.filter((q) => q !== g); g.done = true; finish(g); }

  const GZ = (T.gesture = {
    defs: DEFS,
    names: () => Object.keys(DEFS),
    def,
    play(actor, name, opts) {
      opts = Object.assign({}, opts || {});
      const g = make(actor, name, opts), d = g.d, w = opts.with;
      const pn = opts.partner || d.partner;
      if (w && w.style && pn && opts.mutual !== false && isActor(w)) {
        const po = Object.assign({ clock: opts.clock, hold: opts.hold, k: opts.k, with: actor, mutual: false, face: opts.partnerFace, in: g.in, out: g.out, dur: g.dur, mateRole: opts.role || d.role }, opts.partnerOpts || {});
        const g2 = make(w, pn, po);
        g.link = g2.link = { shared: Math.random() * 6 };
        g.mate = g2; g2.mate = g;
        g2.t0 = g.t0; g2.stopAt = g.stopAt;
        const end2 = until(g2, () => endOf(g2)).then(() => { if (endOf(g2) != null && nowOf(g2) >= endOf(g2) - 1e-3) remove(g2); });
        void end2;
      }
      const p = new Promise((res) => {
        if (g.drive) { res(); return; }
        if (!isFinite(g.dur)) { until(g, () => g.t0 + g.in).then(res); return; }
        until(g, () => endOf(g)).then(() => { if (!g.done && endOf(g) != null && nowOf(g) >= endOf(g) - 1e-3) remove(g); res(); });
      });
      return p;
    },
    stop(actor, name, alone) {
      const list = (actor && actor.gestures || []).filter((g) => !name || g.name === name);
      const all = [];
      for (const g of list) for (const q of alone ? [g] : [g, g.mate]) {
        if (!q || q.done || all.includes(q)) continue;
        const now = nowOf(q);
        if (q.stopAt == null || q.stopAt > now) {
          if (q.drive) { const kk = clamp(+q.drive() || 0); q.drive = () => kk; }
          q.stopAt = now;
        }
        all.push(until(q, () => endOf(q)).then(() => remove(q)));
      }
      return Promise.all(all).then(() => {});
    },
    clear(actor) { (actor.gestures || []).slice().forEach((g) => { remove(g); if (g.mate) remove(g.mate); }); actor.gestures = []; },
    active(actor, name) { return (actor.gestures || []).some((g) => !g.done && (!name || g.name === name)); },
    /* the drawing hook: an actor's options o, after its own pose. info: { talking } */
    apply(o, actor, t, info) {
      const list = actor.gestures;
      if (list && list.length) {
        for (const g of list.slice()) {
          if (g.done) continue;
          const now = nowOf(g);
          let k;
          if (g.drive) k = clamp(+g.drive() || 0) * (g.stopAt == null ? 1 : 1 - T.ease.io(clamp((now - g.stopAt) / Math.max(1e-3, g.out))));
          else {
            const stop = g.stopAt == null ? Infinity : g.stopAt;
            const kin = g.in > 0 ? g.curve(clamp((Math.min(now, stop) - g.t0) / g.in)) : 1;
            k = now > stop ? kin * (1 - T.ease.io(clamp((now - stop) / Math.max(1e-3, g.out)))) : kin;
          }
          k = clamp(k * g.weight);
          if (k <= 1e-4) { if (g.stopAt != null && now > g.stopAt + g.out) remove(g); continue; }
          const c = ctxOf(g, actor, o, now, t);
          if (g.link) { g.link.pre = g.link.pre || new Map(); g.link.pre.set(actor, snap(o)); }
          if (g.d.needs && !c.w) continue;
          g.d.pose(o, k, t, c);
          if (g.link) { g.link.post = g.link.post || new Map(); g.link.post.set(actor, snap(o)); }
        }
      }
      if (actor.idle) idle(o, t, { k: actor.idle === true ? 1 : +actor.idle || 0, talking: info && info.talking, seed: actor.idleSeed });
      return o;
    },
  });
  function ctxOf(g, actor, o, now, t) {
    const w = g.opts.with || null;
    let post = null, pre = null;
    if (w) {
      if (isActor(w)) {
        post = w.lastO || null;
        pre = (g.link && g.link.pre && g.link.pre.get(w)) || post;
        if (post && w.hidden) post = pre = null;
      } else post = pre = w;
    }
    let top = !!g.opts.top;
    if (w && isActor(w) && g.opts.top == null) top = (actor.z || 0) > (w.z || 0) || ((actor.z || 0) === (w.z || 0) && (actor.drawN || 0) > (w.drawN || 0));
    return { w: post, wb: pre, opts: g.opts, tl: now - g.t0, out: g.stopAt != null && now > g.stopAt, link: g.link, top, seed: seedOf(o), now, shared: g.link ? g.link.shared : 0, me: actor };
  }

  /* ---------------- the pure helpers ---------------- */
  const P = (T.pose = {});
  function run(name, o, k, t, opts) {
    const d = DEFS[name]; k = clamp(k || 0);
    if (!d || k <= 0) return o;
    opts = opts || {};
    const w = opts.with || null;
    if (d.needs && !w) return o;
    const c = { w, wb: opts.withBase || w, opts, tl: opts.tl == null ? t : opts.tl, out: !!opts.out, link: opts.link || null, top: !!opts.top,
      seed: opts.seed == null ? seedOf(o) : opts.seed, now: t, shared: opts.shared || 0, me: null };
    d.pose(o, k, t, c);
    return o;
  }
  const camel = (s) => s.replace(/-(\w)/g, (m, ch) => ch.toUpperCase());
  for (const name of Object.keys(DEFS)) P[name] = P[camel(name)] = (o, k, t, opts) => run(name, o, k, t == null ? T.time : t, opts);
  /* both people of a two-person gesture, each against the other as they are posed (two passes) */
  P.pair = function (name, a, b, k, t, opts) {
    opts = opts || {}; t = t == null ? T.time : t;
    const d = DEFS[name]; if (!d) return { a, b };
    const pn = opts.partner || d.partner || name, po = Object.assign({ tl: opts.tl, out: opts.out, face: opts.partnerFace, mateRole: opts.role || d.role }, opts.partnerOpts || {});
    const a0 = snap(a), b0 = snap(b), link = {}, at = !!opts.aTop;   /* aTop: a is drawn over b (by default b is) */
    const a1 = run(name, snap(a), k, t, Object.assign({}, opts, { with: b0, withBase: b0, link, top: at }));
    const b1 = run(pn, snap(b), k, t, Object.assign({}, po, { with: a0, withBase: a0, link, top: !at }));
    run(name, a, k, t, Object.assign({}, opts, { with: b1, withBase: b0, link, top: at }));
    run(pn, b, k, t, Object.assign({}, po, { with: a1, withBase: a0, link, top: !at }));
    return { a, b };
  };
  P.idle = function (o, t, q) { return idle(o, t == null ? T.time : t, q); };
  P.step = stepBy;
  P.headTo = headTo; P.reach = reach; P.lookAt = lookAt; P.sob = sob; P.leanToReach = leanToReach; P.place = place; P.feet = feet0;
  P.torso = torsoW; P.headPoint = headW;
})();
