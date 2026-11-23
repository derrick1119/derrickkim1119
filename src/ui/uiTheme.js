// UI 시안 고르기(임시): 기본 UI 와 시안 A~D 를 화면에서 바로 바꿔 볼 수 있게 한다.
// 시안 스타일은 styles/themes/<id>.css 에 :root[data-ui="<id>"] 아래로만 적혀 있다.
// 고른 시안은 저장본이 아니라 기기에 따로 기억한다. 주소에 ?ui=a 를 붙여 열 수도 있다.
export const UI_THEMES = ['base', 'a', 'b', 'c', 'd'];
const KEY = 'shh-ufo:ui';

export function initialUiTheme() {
  try {
    const q = new URLSearchParams(location.search).get('ui');
    if (q && UI_THEMES.includes(q)) return q;
    const saved = localStorage.getItem(KEY);
    if (saved && UI_THEMES.includes(saved)) return saved;
  } catch {
    /* 저장소를 못 쓰는 환경 */
  }
  return 'base';
}

export function currentUiTheme() {
  return document.documentElement.dataset.ui || 'base';
}

export function applyUiTheme(id, { remember = true } = {}) {
  const theme = UI_THEMES.includes(id) ? id : 'base';
  if (theme === 'base') delete document.documentElement.dataset.ui;
  else document.documentElement.dataset.ui = theme;
  if (remember) {
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* 무시 */
    }
  }
  return theme;
}
