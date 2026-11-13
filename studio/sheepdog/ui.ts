/**
 * 양치기 멍멍 — 캔버스 밖 DOM UI (C008 M1-5a, 🎨 ART §12): 판 결과 카드.
 * 시뮬은 건드리지 않는다. main.ts가 매 프레임 sync(s)를 부르고, 버튼은 다음 틱의 입력(next·retry)으로 들어간다.
 */
import { STAGES, goalLabels, medalOf, starCount, type DogState } from './game.ts';
import { ICON } from './hud.ts';
import { sfx } from './sfx.ts';

/** 별 반짝이 ✦ 8개(큰 12px·작은 8px 번갈아, 별마다 k×22.5° 돌림) + 후광 (🎨 C011 ③-a) */
const SPARK = '<svg viewBox="0 0 24 24"><path d="M12 1l2.6 8.4L23 12l-8.4 2.6L12 23l-2.6-8.4L1 12l8.4-2.6z" fill="#ffc857" stroke="#7a3e1d" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const sparks = (k: number) => `<i class="halo"></i>${Array.from({ length: 8 }, (_, i) => `<b class="sp${i % 2 ? '' : ' big'}" style="--a:${i * 45 + k * 22.5}deg">${SPARK}</b>`).join('')}`;
const STAR = (on: boolean) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 6 6.5.9-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.1 1.1-6.5L2.6 9.5l6.5-.9z" fill="${on ? '#ffc857' : 'none'}" stroke="${on ? '#7a3e1d' : '#9c8566'}" stroke-width="2" stroke-linejoin="round"/></svg>`;

/** 할아버지 한 줄 (별 수에 따라) */
const GRANDPA = ['', '허허, 들어갔구나!', '좋아, 다음엔 별 하나 더?', '허허, 이 할애비도 못 하겠다!'];

export interface ResultCard {
  /** 지금 상태에 맞춰 카드를 띄우거나 거둔다 */
  sync(s: DogState): void;
  /** 카드가 떠 있나 */
  open(): boolean;
}

export function mountResultCard(root: HTMLElement, onNext: () => void, onRetry: () => void): ResultCard {
  const el = document.createElement('section');
  el.id = 'card';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = `
    <p class="say"></p>
    <h2></h2>
    <div class="stars"></div>
    <div class="medal" aria-hidden="true"><span>한 번에!</span></div>
    <div class="row">
      <button type="button" class="btn ghost" data-act="retry"></button>
      <button type="button" class="btn" data-act="next"></button>
    </div>`;
  root.append(el);
  const h2 = el.querySelector('h2')!, starsEl = el.querySelector('.stars')!, say = el.querySelector('.say')!, medal = el.querySelector<HTMLElement>('.medal')!;
  const retryB = el.querySelector<HTMLButtonElement>('[data-act=retry]')!, nextB = el.querySelector<HTMLButtonElement>('[data-act=next]')!;
  nextB.addEventListener('click', onNext);
  retryB.addEventListener('click', onRetry);
  let shownFor = -1;
  return {
    open: () => !el.hidden,
    sync(s) {
      const want = s.phase === 'result' && s.ok && !s.dead; // 끝나면(마지막 판 '끝 ▶') 카드를 거둔다 — 끝 화면 위에 남던 버그 (FUN QA C008)
      if (!want) {
        if (!el.hidden) (el.hidden = true), (shownFor = -1);
        return;
      }
      if (shownFor === s.clearT) return;
      shownFor = s.clearT;
      const d = STAGES[s.stage], got = s.got, n = starCount(got);
      const goals = goalLabels(d); // HUD 칩과 같은 소스 (C009)
      h2.textContent = s.won ? 'W1 아침 들판 완성!' : `1-${s.stage + 1} 통과!`;
      say.textContent = GRANDPA[n];
      starsEl.innerHTML = goals
        .map((g, k) => {
          const on = ((got >> k) & 1) === 1, had = !on && ((s.best[s.stage] >> k) & 1) === 1;
          return `<figure class="${on ? 'on' : had ? 'had' : 'off'}" style="--k:${k}">${on ? sparks(k) : ''}${STAR(on || had)}<figcaption>${g}</figcaption></figure>`;
        })
        .join('');
      // 🏅 한 번에! — 한 시도에 ★★★(깃발 도움 없이)면 세 번째 별 뒤 쿵, 나눠 모은 ★★★면 회색 점선 (📐 C003·C004)
      medal.className = `medal ${medalOf(s)}`;
      // 별 띵: 별이 켜지는 때(.3s + 칸 × .25s)에 맞춰, 켜진 별마다 2반음씩 올림 C6 → D6 → E6 (🎨 C010: 통과 팡파르 대신)
      let nth = 0;
      for (let k = 0; k < 3; k++) if ((got >> k) & 1) sfx.play('star', nth++, false, 0.3 + k * 0.25);
      if (medalOf(s) === 'gold') sfx.play('stamp', 1, false, 1.56); // 🎨 C011: 도장 착지(1.35s + .3s의 70%). 회색 점선 도장은 소리 없음
      // ★3이면 [다음 ▶] + 작은 '↺ 다시', 아니면 [↺ ☆ 더 따기] + [다음 ▶] (자동으로 넘기지 않는다)
      retryB.innerHTML = `${ICON.retry}${n === 3 ? '다시' : `${ICON.star(false)}더 따기`}`; // ☆ 글자도 SVG로 (🎨 C009)
      retryB.classList.toggle('small', n === 3);
      nextB.innerHTML = `${s.won ? '끝' : '다음'}${ICON.next}`; // ▶는 그림 글자로 보이는 폰이 있어 SVG (C009 이모지 0)
      el.hidden = false;
      el.classList.remove('up');
      void el.offsetWidth; // 애니메이션 다시
      el.classList.add('up');
      nextB.focus({ preventScroll: true });
    },
  };
}
