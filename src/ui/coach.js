// 안내: 규칙이 처음 쓰이는 순간에 한 번씩, 그 자리를 밝혀 짧게 알려 준다 (한 번 본 안내는 다시 뜨지 않는다)
// 안내가 떠 있는 동안 싸움은 멈춘다. 아무 데나 누르면 넘어가고, '안내 끄기' 를 누르면 더는 뜨지 않는다
import { W, H } from '../config.js';
import { INK, PAPER, FONT_B, SUB, text, textBlock, rr, rrPath, clamp, line, poly } from '../render/draw.js';
import { ui, tapped, C } from './ui.js';
import { meta, save } from '../state.js';
import { CARDS, isUnit } from '../data/cards.js';
import { RewardOverlay } from './overlays.js';
import { MarketOverlay, TavernOverlay } from './places.js';
import { PromoOverlay } from './promote.js';

const slot = k => ({ x: 248 + k * 136, y: 574, w: 128, h: 138 });
const handIdx = (s, f) => s.b.hand.findIndex(c => c && f(c));
const fight = s => s.phase === 'fight' && !s.over && !s.sub;
const ov = (s, K) => s.over instanceof K && s.over.t > 0.7 && !s.over.sub;
const mySquad = s => s.b.squads.find(q => q.team === 0 && q.alive > 0 && !q.def.banner && !q.hero && !q.temp);
const squadBox = q => { let x = 0, y = 0, n = 0; for (const u of q.units) if (!u.dead) { x += u.x; y += u.y; n++; } x /= n; y /= n; return { x: x - 60, y: y - 92, w: 120, h: 110 }; };

// 차례대로: 앞의 안내를 봐야 다음 안내가 뜬다 (after)
export const TIPS = [
  { id: 'army', when: s => s.phase === 'prep', at: () => ({ x: 6, y: 4, w: 236, h: 58 }), s: '남은 병력입니다.\n전장의 아군과 대기 패가 모두 바닥나면 원정이 끝납니다.' },
  { id: 'deploy', after: 'army', when: s => (s.phase === 'prep' || fight(s)) && handIdx(s, c => isUnit(c)) >= 0, at: s => slot(handIdx(s, c => isUnit(c))), s: '병력 패를 전장으로 끌어다 놓으면\n그 자리에 부대가 섭니다.' },
  { id: 'morale', after: 'deploy', when: s => s.phase === 'prep' || fight(s), at: () => ({ x: 6, y: 574, w: 232, h: 104 }), s: '패마다 사기가 듭니다.\n요괴 무리를 물리치면 사기가 차오릅니다.' },
  { id: 'tactic', after: 'morale', when: s => fight(s) && s.b.waveT > 3 && handIdx(s, c => !isUnit(c) && CARDS[c.id].kind !== 'curse') >= 0, at: s => slot(handIdx(s, c => !isUnit(c) && CARDS[c.id].kind !== 'curse')), s: '전술 패는 한 번 쓰면 이번 원정에서 사라집니다.\n아래의 ×숫자가 남은 장수입니다.' },
  { id: 'order', after: 'tactic', when: s => fight(s) && s.b.waveT > 8 && !!mySquad(s), at: s => squadBox(mySquad(s)), s: '부대를 끌어 옮길 수 있습니다.\n요괴 위에 놓으면 그 요괴를 집중 공격합니다.' },
  { id: 'brush', after: 'order', when: s => fight(s) && s.b.waveT > 10 && s.b.formSquads().length >= 3, at: () => ({ x: 300, y: 150, w: 560, h: 360 }), s: '빈 땅을 끌어 붓으로 그어 보세요.\n부대들이 그 획을 따라 진을 칩니다. 세로로 그으면 일자진,\n양 끝을 앞으로 휘면 학익진, 둥글게 감싸면 방원진.' },
  { id: 'hero', after: 'order', when: s => fight(s) && s.b.waveT > 13 && s.b.units.some(u => !u.dead && u.team === 0 && u.def.hero), at: s => { const u = s.b.units.find(q => !q.dead && q.team === 0 && q.def.hero); return { x: u.x - 56, y: u.y - 152, w: 112, h: 156 }; }, s: '머리 위 금빛 띠가 영웅의 기력입니다.\n가득 차면 고유기를 스스로 씁니다.' },
  { id: 'all', after: 'hero', when: s => fight(s) && s.b.waveT > 18, at: () => ({ x: 934, y: 574, w: 336, h: 66 }), s: '모든 부대를 한꺼번에\n물리거나 돌격시킵니다.' },
  { id: 'reward', when: s => ov(s, RewardOverlay), at: () => ({ x: 254, y: 92, w: 772, h: 370 }), s: '셋 중 하나를 고르세요.\n이렇게 군대가 조금씩 커집니다.' },
  { id: 'fork', when: s => s.phase === 'fork' && s.view && s.view.fork && !s.view.fork.pick, at: null, s: '갈림길입니다.\n험한 길일수록 얻는 것도 큽니다.' },
  { id: 'shop', when: s => ov(s, MarketOverlay), at: null, s: '장터입니다.\n엽전으로 패·보물·무기를 삽니다.' },
  { id: 'rest', when: s => ov(s, TavernOverlay), at: null, s: '주막입니다. 하나를 골라 정비하세요.\n주모의 옛이야기에 두목을 이길 귀띔이 있습니다.' },
  { id: 'promo', when: s => ov(s, PromoOverlay), at: null, s: '4단에 오른 병력은 승급합니다.\n두 갈래 중 하나를 고르면 싸우는 방식이 바뀝니다.' },
  { id: 'boss', when: s => s.phase === 'prep' && s.enc && s.enc.boss, at: null, s: '두목은 저마다 수가 있습니다.\n위에 뜨는 쪽지를 읽고 맞서세요.' },
];

export class Coach {
  constructor() { this.tip = null; this.t = 0; this.cool = 1; }
  get on() { return !meta.coachOff; }
  seen(id) { return !!(meta.seen.tip && meta.seen.tip[id]); }
  // 띄울 안내를 고른다 (떠 있는 동안에는 싸움이 멈춘다)
  update(s, dt) {
    if (this.tip || !this.on) return; if (this.cool > 0) { this.cool -= dt; return; }
    if (s.menu || s.phase === 'over' || s.curtain && s.curtain.t < 3) return;
    for (const tp of TIPS) { if (this.seen(tp.id) || (tp.after && !this.seen(tp.after))) continue; let ok = false; try { ok = tp.when(s); } catch (e) { ok = false; } if (ok) { this.tip = tp; this.box = tp.at ? tp.at(s) : null; this.t = 0; return; } }
  }
  done(off) { if (!meta.seen.tip) meta.seen.tip = {}; meta.seen.tip[this.tip.id] = 1; if (off) meta.coachOff = true; save(); this.tip = null; this.cool = 0.7; }
  // 그리기와 누르기 (가장 위층)
  frame(g, dt) {
    if (!this.tip) return; this.t += dt;
    const L = ui.layer; ui.layer = 9; ui.top = 9;
    const k = clamp(this.t / 0.25, 0, 1), b = this.box, p = 8;
    // 어둡게 덮고 안내할 자리만 밝게 뚫는다
    g.save(); g.globalAlpha = k; g.beginPath(); g.rect(0, 0, W, H); if (b) rrPath(g, b.x - p, b.y - p, b.w + p * 2, b.h + p * 2, 12); g.fillStyle = 'rgba(14,16,30,0.62)'; g.fill('evenodd');
    if (b) { const pul = 0.6 + 0.4 * Math.sin(this.t * 5); g.globalAlpha = k * pul; rr(g, b.x - p, b.y - p, b.w + p * 2, b.h + p * 2, 12, null, C.gilt, 3.2); }
    g.restore();
    // 쪽지: 밝힌 자리의 위나 아래 (없으면 가운데)
    const w = 470, h = 132, cx = b ? clamp(b.x + b.w / 2, w / 2 + 16, W - w / 2 - 16) : W / 2, below = b && b.y + b.h + p + h + 40 < H, y = b ? (below ? b.y + b.h + p + 26 : b.y - p - 26 - h) : H / 2 - h / 2 - 20, x = cx - w / 2;
    g.save(); g.globalAlpha = k; g.translate(0, (1 - k) * 12);
    if (b) { const ax = clamp(b.x + b.w / 2, x + 30, x + w - 30), ay = below ? y : y + h, ty = below ? b.y + b.h + p + 4 : b.y - p - 4; poly(g, [ax - 13, ay, ax + 13, ay, ax, ty], PAPER, INK, 2); }
    rr(g, x + 3, y + 5, w, h, 12, 'rgba(20,14,8,0.35)'); rr(g, x, y, w, h, 12, PAPER, INK, 2.4); rr(g, x + 6, y + 6, w - 12, h - 12, 9, null, 'rgba(226,184,90,0.75)', 1.2);
    textBlock(g, this.tip.s, x + w / 2, y + 40, w - 44, 30, { size: 21, font: FONT_B });
    text(g, '눌러서 계속 ▶', x + w - 22, y + h - 20, { size: 14, fill: SUB, align: 'right' });
    const off = tapped('coachOff', x + 14, y + h - 36, 104, 28); text(g, '안내 끄기', x + 24, y + h - 20, { size: 14, fill: '#8a7f6a', align: 'left' }); line(g, [x + 24, y + h - 11, x + 86, y + h - 11], '#b9ad92', 1);
    g.restore();
    const go = this.t > 0.45 && (off || tapped('coachNext', 0, 0, W, H)); ui.layer = L;
    if (go) this.done(off);
  }
}
