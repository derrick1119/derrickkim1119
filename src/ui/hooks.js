// UI 확장 지점.
//
// 부가 기능(성격·교훈·목표·추모관·반짝이·관측실·앨범·미니게임 등)의 화면은 각자 파일에 두고
// 여기에 등록한다. ui.js 는 이 목록을 돌며 부를 뿐 기능 하나하나를 모른다.
// 등록은 src/ui/ext/index.js 가 모든 확장 파일을 불러오면서 일어난다.

const reg = {
  panels: [],
  hud: [],
  reportBefore: [],
  reportAfter: [],
  reportExtras: [],
  binds: [],
  recordsExtras: [],
};

const sortByOrder = (list) => list.sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
function put(list, item) {
  const i = list.findIndex((x) => x.id === item.id);
  if (i >= 0) list.splice(i, 1, item);
  else list.push(item);
  sortByOrder(list);
  return item;
}

/**
 * 아래 탭에 패널을 하나 더한다(기본 다섯 탭 뒤에 order 순).
 * @param {{id: string, icon: string, order?: number,
 *   title: (ui) => string, label: (ui) => string,
 *   render: (ui) => Node[], signature: (ui) => string, dot?: (ui) => boolean}} panel
 *   icon = src/ui/icons.js 의 아이콘 이름(없는 이름이면 기본 아이콘)
 */
export const registerPanel = (panel) => put(reg.panels, panel);

/**
 * 계기판(HUD) 아래 띠에 작은 위젯을 붙인다.
 * @param {{id: string, order?: number, mount: (ui, host: HTMLElement) => void, update?: (ui, dt: number) => void}} w
 */
export const registerHud = (w) => put(reg.hud, w);

/**
 * 들킨 뒤 보고서 앞뒤에 끼우는 단계(차례대로 await).
 *  phase 'before': 들킨 연출이 끝나고 보고서를 띄우기 전. { excused: true } 를 돌려주면 보고서를 건너뛰고 관측을 이어 간다(변명 성공).
 *  phase 'after' : 보고서의 '다음 대원' 을 누른 뒤, 다음 대원이 내려오기 전(교훈 카드·추모 등).
 * @param {{id: string, phase: 'before'|'after', order?: number, run: (ui, report) => Promise<void|{excused?: boolean}>}} step
 */
export function registerReportStep(step) {
  return put(step.phase === 'before' ? reg.reportBefore : reg.reportAfter, step);
}

/**
 * 사건 보고서 본문에 덧붙일 내용(대원 성격, 이번 목표 결과 등).
 * @param {{id: string, order?: number, render: (ui, report) => Node|null}} extra
 */
export const registerReportExtra = (extra) => put(reg.reportExtras, extra);

/** 기록 패널 끝에 덧붙일 내용. @param {{id: string, order?: number, render: (ui) => Node|null}} extra */
export const registerRecordsExtra = (extra) => put(reg.recordsExtras, extra);

/**
 * UI 가 만들어질 때 한 번 불린다. game/world/scene 이벤트를 구독할 때 쓴다.
 * @param {{id: string, order?: number, bind: (ui) => void}} b
 */
export const registerBind = (b) => put(reg.binds, b);

export const hooks = reg;
