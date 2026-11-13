/**
 * 양치기 멍멍 — HUD(DOM, C009 M1-5b, 🎨 ART §12-3·4·5·10). 캔버스에 그리던 위 줄·새것 알림·아래 HUD를 옮겼다.
 * 이모지 없이 인라인 SVG(24 격자). 값은 game.ts hudState()에서 — 결과 카드와 같은 소스.
 */
import { hudState, type DogState, type HudState } from './game.ts';

const svg = (body: string, vb = '0 0 24 24') => `<svg viewBox="${vb}" aria-hidden="true">${body}</svg>`;
export const ICON = {
  star: (on: boolean) => svg(`<path d="M12 2.6l2.9 6 6.5.9-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.1 1.1-6.5L2.6 9.5l6.5-.9z" fill="${on ? '#ffc857' : 'none'}" stroke="${on ? '#7a3e1d' : '#9c8566'}" stroke-width="2" stroke-linejoin="round"/>`),
  bone: (on: boolean, gold = false) => svg(`<path d="M5 5.5a2.4 2.4 0 0 1 4.2 1.6L9.6 7h4.8l.4.1A2.4 2.4 0 1 1 19 9a2.4 2.4 0 1 1-4.2 2.1l-.4-.1H9.6l-.4.1A2.4 2.4 0 1 1 5 9a2.4 2.4 0 0 1 0-3.5z" fill="${on ? (gold ? '#ffc857' : '#fff6e4') : 'none'}" stroke="${on ? '#7a3e1d' : '#9c8566'}" stroke-width="1.6" stroke-linejoin="round"/>`, '0 0 24 16'),
  sheep: svg('<g stroke="#7a3e1d" stroke-width="1.6"><circle cx="9" cy="12" r="5" fill="#fff6e4"/><circle cx="14" cy="10" r="5" fill="#fff6e4"/><circle cx="12" cy="15" r="5" fill="#fff6e4"/><ellipse cx="18.5" cy="13" rx="3" ry="3.6" fill="#3a3234"/></g><circle cx="19.3" cy="12.3" r=".9" fill="#fff"/>'),
  retry: svg('<path d="M5.5 12a6.5 6.5 0 1 0 2-4.7" fill="none" stroke="#3b2a1e" stroke-width="2.6" stroke-linecap="round"/><path d="M4.2 3.8v5.3h5.3" fill="none" stroke="#3b2a1e" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  // 소리 켬/끔 (🎨 C010): 스피커 + 물결 2줄 / 스피커 + X
  soundOn: svg('<path d="M4 9h4l5-4v14l-5-4H4z" fill="#3b2a1e" stroke="#3b2a1e" stroke-width="1.5" stroke-linejoin="round"/><path d="M16 9.5a3.5 3.5 0 0 1 0 5M18.6 7a7 7 0 0 1 0 10" fill="none" stroke="#3b2a1e" stroke-width="2.4" stroke-linecap="round"/>'),
  soundOff: svg('<path d="M4 9h4l5-4v14l-5-4H4z" fill="#3b2a1e" stroke="#3b2a1e" stroke-width="1.5" stroke-linejoin="round"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="#3b2a1e" stroke-width="2.4" stroke-linecap="round"/>'),
  next: svg('<path d="M8 4.5 17 12l-9 7.5z" fill="#3b2a1e" stroke="#3b2a1e" stroke-width="2" stroke-linejoin="round"/>'),
  // 말풍선 요소 아이콘 (🎨 C009 ②) — 알림 글 맨 앞 그림 글자로 고른다
  blackSheep: svg('<g stroke="#17131a" stroke-width="1.6"><circle cx="9" cy="12" r="5" fill="#3a3234"/><circle cx="14" cy="10" r="5" fill="#3a3234"/><circle cx="12" cy="15" r="5" fill="#3a3234"/><ellipse cx="18.5" cy="13" rx="3" ry="3.6" fill="#17131a"/></g><circle cx="19.3" cy="12.3" r=".9" fill="#fff"/>'),
  bridge: svg('<path d="M2 19h20" stroke="#5aa9d6" stroke-width="2.4" stroke-linecap="round"/><path d="M3 15q9-8 18 0" fill="none" stroke="#7a3e1d" stroke-width="2.4" stroke-linecap="round"/><path d="M7 11.2v4m5-5.6v5.6m5-4v4" stroke="#a0662f" stroke-width="2" stroke-linecap="round"/>'),
  flower: svg('<g fill="#f7a8c6" stroke="#7a3e1d" stroke-width="1.2"><circle cx="12" cy="6.5" r="3.4"/><circle cx="17.2" cy="10.3" r="3.4"/><circle cx="15.2" cy="16.4" r="3.4"/><circle cx="8.8" cy="16.4" r="3.4"/><circle cx="6.8" cy="10.3" r="3.4"/></g><circle cx="12" cy="11.8" r="2.6" fill="#ffc857" stroke="#7a3e1d" stroke-width="1.2"/>'),
  clover: svg('<path d="M12 13l1.5 8" stroke="#3d7a2a" stroke-width="2" stroke-linecap="round"/><g fill="#5fa83a" stroke="#2f5e20" stroke-width="1.2"><circle cx="12" cy="7.2" r="3.8"/><circle cx="7.6" cy="12.6" r="3.8"/><circle cx="16.4" cy="12.6" r="3.8"/></g>'),
  hand: svg('<path d="M9 13V5.5a1.6 1.6 0 0 1 3.2 0V11l.1-1.2a1.5 1.5 0 0 1 3 .2v1.5a1.5 1.5 0 0 1 3 .1V15c0 3.6-2.4 6-5.6 6h-1.2c-2 0-3.4-.9-4.6-2.6L4.6 15a1.6 1.6 0 0 1 2.6-1.9z" fill="#fff6e4" stroke="#7a3e1d" stroke-width="1.6" stroke-linejoin="round"/>'),
  flag: svg('<path d="M6 21V4" stroke="#7a3e1d" stroke-width="2" stroke-linecap="round"/><path d="M6 4h11l-3 4 3 4H6z" fill="#e8414f" stroke="#7a3e1d" stroke-width="1.6" stroke-linejoin="round"/>'),
};
/** 알림 글 맨 앞 그림 글자 → 요소 SVG (없으면 빈칸) */
const LEAD: Record<string, () => string> = { '🐑': () => ICON.sheep, '🖤': () => ICON.blackSheep, '🌉': () => ICON.bridge, '🌼': () => ICON.flower, '🍀': () => ICON.clover, '👆': () => ICON.hand, '🎉': () => ICON.star(true) };
export const leadIcon = (text: string) => LEAD[[...text][0]]?.() ?? '';
/** 그림 글자(이모지)를 지운다 — 알림·안내 문구에서 (완료 기준: HUD·카드·타이틀 이모지 0) */
export const noEmoji = (s: string) => s.replace(/[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}️‍]/gu, '').replace(/\s{2,}/g, ' ').trim();

export interface Hud {
  sync(s: DogState): void;
  /** 캔버스 자리(px)에 맞춰 위 줄·아래 HUD를 놓는다 (rowTop = 위 줄 꼭대기, h = 캔버스 꼭대기부터 화면 끝까지) */
  place(left: number, rowTop: number, canvasTop: number, w: number, h: number): void;
  /** 타이틀·끝 화면에서는 숨긴다 (🎨 §12-8) */
  show(on: boolean): void;
}

export function mountHud(root: HTMLElement): Hud {
  const top = document.createElement('div');
  top.id = 'hudTop';
  top.innerHTML = `<span class="pill stage"><b class="no"></b><span class="nm"></span></span><span class="pill total">${ICON.star(true)}<b class="st"></b></span>`;
  const bubble = document.createElement('div');
  bubble.id = 'news';
  bubble.hidden = true;
  bubble.setAttribute('role', 'status');
  const bot = document.createElement('div');
  bot.id = 'hudBot';
  bot.innerHTML = `<div class="row1"><span class="pill bones" aria-label=""></span><span class="pill sheep">${ICON.sheep}<b class="sc"></b></span></div><div class="chips"></div>`;
  root.append(top, bubble, bot);
  const $ = <T extends Element>(q: string) => root.querySelector<T>(q)!;
  const no = $('#hudTop .no'), nm = $('#hudTop .nm'), st = $('#hudTop .st'), bones = $<HTMLElement>('#hudBot .bones'), sc = $('#hudBot .sc'), chips = $('#hudBot .chips');
  let last = '', lastNews: string | null = null;
  return {
    place(left, rowTop, canvasTop, w, h) {
      top.style.left = bubble.style.left = bot.style.left = `${left}px`;
      top.style.width = bot.style.width = `${w}px`;
      top.style.top = `${rowTop + 6}px`;
      bubble.style.top = `${rowTop + 58}px`;
      bubble.style.maxWidth = `${Math.min(w - 24, 340)}px`;
      // 아래 HUD: 캔버스 판 앞면(받침) 아래 띠부터 — game.ts의 by = Y(SY(1) + 0.04) = 1.12w
      bot.style.top = `${canvasTop + w * 1.12}px`;
      bot.style.minHeight = `${Math.max(0, h - w * 1.12)}px`;
    },
    show(on) {
      top.hidden = bot.hidden = !on;
      if (!on) (bubble.hidden = true), (lastNews = null);
    },
    sync(s) {
      const h: HudState = hudState(s);
      // 말풍선: 새것 알림(3.3초 뒤 접힘) > 할아버지 깃발 말(계속). 카드가 뜨면 접는다
      const say = h.card ? null : h.news ?? h.hint;
      if (say !== lastNews) {
        lastNews = say;
        bubble.hidden = !say;
        bubble.classList.remove('pop');
        if (say) (bubble.innerHTML = `${say === h.hint ? ICON.flag : leadIcon(say)}<span>${noEmoji(say)}</span>`), void bubble.offsetWidth, bubble.classList.toggle('pop', say === h.news);
      }
      const key = JSON.stringify(h, (k, v) => (k === 'news' || k === 'hint' ? undefined : v));
      if (key === last) return;
      last = key;
      no.textContent = `1-${h.stage + 1}`;
      nm.textContent = h.name;
      st.textContent = String(h.stars);
      const left = h.max - h.used;
      bones.setAttribute('aria-label', `멍멍 ${left}번 남음, 금뼈 ${Math.max(0, h.par - h.used)}개 안에 깨면 별`);
      bones.innerHTML =
        h.max >= 10
          ? `${ICON.bone(true, h.used < h.par)}<b>×${left}</b>`
          : // 뼈는 오른쪽부터 사라진다 → 먼저 사라질 오른쪽 par개가 금뼈, 금뼈를 다 쓰면 '멍멍 par번' 별 끝 (🧪 C009 ①: 눈금이 왼쪽 par번째라 거꾸로 읽힘)
            Array.from({ length: h.max }, (_, k) => `<i class="${k === h.max - h.par ? 'par' : ''}">${ICON.bone(k < left, k >= h.max - h.par)}</i>`).join('');
      sc.textContent = `${h.sheepIn}/${h.sheepN}`;
      chips.innerHTML = h.goals.map((g) => `<span class="chip ${g.st}">${ICON.star(g.st === 'on' || g.st === 'had')}<span>${g.label}</span></span>`).join('');
      bot.classList.toggle('card', h.card);
    },
  };
}
