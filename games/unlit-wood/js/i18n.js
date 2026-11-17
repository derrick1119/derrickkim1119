// 말은 메뉴에만 있다. 게임 안에는 글이 없다.
const S = {
  ko: {
    title: '불 꺼진 숲', tagline: '불을 켜면 그들이 본다. 끄면 길이 보이지 않는다.',
    start: '시작', cont: '이어하기', fresh: '처음부터', resume: '계속', retry: '등불에서 다시',
    sound: '소리', on: '켬', off: '끔', quality: '그림자', high: '곱게', low: '가볍게', lang: 'English', full: '전체 화면',
    paused: '잠시 멈춤', keys: '이동 ← →　점프 Space　불빛 F　잡기 Shift',
    end1: '숲에 불이 켜졌다', flowers: '피운 빛꽃', deaths: '깨진 횟수', time: '걸린 시간', again: '처음부터 다시', hub: '다른 램프 게임',
    credit: 'THE LAMP 의 세계에서', loading: '점토를 빚는 중…',
  },
  en: {
    title: 'The Unlit Wood', tagline: 'Light, and they see you. Dark, and you cannot see the way.',
    start: 'Begin', cont: 'Continue', fresh: 'New game', resume: 'Resume', retry: 'Back to the lantern',
    sound: 'Sound', on: 'On', off: 'Off', quality: 'Shadows', high: 'Fine', low: 'Light', lang: '한국어', full: 'Fullscreen',
    paused: 'Paused', keys: 'Move ← →　Jump Space　Light F　Grab Shift',
    end1: 'The wood is lit', flowers: 'Lightflowers', deaths: 'Times shattered', time: 'Time', again: 'Start over', hub: 'More Lamp games',
    credit: 'From the world of THE LAMP', loading: 'Shaping the clay…',
  },
};
let lang = 'ko';
export function setLang(l) { lang = S[l] ? l : 'ko'; document.documentElement.lang = lang; apply(); }
export function getLang() { return lang; }
export function t(k) { return S[lang][k] ?? k; }
export function apply() { for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n); }
