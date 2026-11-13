/**
 * 양치기 멍멍 — HUD(DOM, C009 M1-5b, 🎨 ART §12-3·4·5·10). 캔버스에 그리던 위 줄·새것 알림·아래 HUD를 옮겼다.
 * 이모지 없이 인라인 SVG(24 격자). 값은 game.ts hudState()에서 — 결과 카드와 같은 소스.
 */
import { hudState, type DogState, type HudState } from './game.ts';

const svg = (body: string, vb = '0 0 24 24') => `<svg viewBox="${vb}" aria-hidden="true">${body}</svg>`;
export const ICON = {
  star: (on: boolean) => svg(`<path d="M12 2.6l2.9 6 6.5.9-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.1 1.1-6.5L2.6 9.5l6.5-.9z" fill="${on ? '#ffc857' : 'none'}" stroke="${on ? '#7a3e1d' : '#9c8566'}" stroke-width="2" stroke-linejoin="round"/>`),
  bone: (on: boolean) => svg(`<path d="M5 5.5a2.4 2.4 0 0 1 4.2 1.6L9.6 7h4.8l.4.1A2.4 2.4 0 1 1 19 9a2.4 2.4 0 1 1-4.2 2.1l-.4-.1H9.6l-.4.1A2.4 2.4 0 1 1 5 9a2.4 2.4 0 0 1 0-3.5z" fill="${on ? '#fff6e4' : 'none'}" stroke="${on ? '#7a3e1d' : '#c9b79a'}" stroke-width="1.6" stroke-linejoin="round"/>`, '0 0 24 16'),
  sheep: svg('<g stroke="#7a3e1d" stroke-width="1.6"><circle cx="9" cy="12" r="5" fill="#fff6e4"/><circle cx="14" cy="10" r="5" fill="#fff6e4"/><circle cx="12" cy="15" r="5" fill="#fff6e4"/><ellipse cx="18.5" cy="13" rx="3" ry="3.6" fill="#3a3234"/></g><circle cx="19.3" cy="12.3" r=".9" fill="#fff"/>'),
  retry: svg('<path d="M5.5 12a6.5 6.5 0 1 0 2-4.7" fill="none" stroke="#3b2a1e" stroke-width="2.6" stroke-linecap="round"/><path d="M4.2 3.8v5.3h5.3" fill="none" stroke="#3b2a1e" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  next: svg('<path d="M8 4.5 17 12l-9 7.5z" fill="#3b2a1e" stroke="#3b2a1e" stroke-width="2" stroke-linejoin="round"/>'),
  flag: svg('<path d="M6 21V4" stroke="#7a3e1d" stroke-width="2" stroke-linecap="round"/><path d="M6 4h11l-3 4 3 4H6z" fill="#e8414f" stroke="#7a3e1d" stroke-width="1.6" stroke-linejoin="round"/>'),
};
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
        if (say) (bubble.innerHTML = `${say === h.hint ? ICON.flag : ''}<span>${noEmoji(say)}</span>`), void bubble.offsetWidth, bubble.classList.toggle('pop', say === h.news);
      }
      const key = JSON.stringify(h, (k, v) => (k === 'news' || k === 'hint' ? undefined : v));
      if (key === last) return;
      last = key;
      no.textContent = `1-${h.stage + 1}`;
      nm.textContent = h.name;
      st.textContent = String(h.stars);
      const left = h.max - h.used;
      bones.setAttribute('aria-label', `멍멍 ${left}번 남음 (par ${h.par})`);
      bones.innerHTML =
        h.max >= 10
          ? `${ICON.bone(true)}<b>×${left}</b>`
          : Array.from({ length: h.max }, (_, k) => `<i class="${k === h.par - 1 ? 'par' : ''}">${ICON.bone(k < left)}</i>`).join('');
      sc.textContent = `${h.sheepIn}/${h.sheepN}`;
      chips.innerHTML = h.goals.map((g) => `<span class="chip ${g.st}">${ICON.star(g.st === 'on' || g.st === 'had')}<span>${g.label}</span></span>`).join('');
      bot.classList.toggle('card', h.card);
    },
  };
}
