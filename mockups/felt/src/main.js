import { mk } from './felt.js';
import { titleBoard, battleBoard, puppetBoard, setBgOnly } from './boards.js';

// 기본은 배경만. 주소 끝에 ?full 을 붙이면 인형·화면 요소까지 함께 그린다
const FULL = location.search.includes('full');
setBgOnly(!FULL);
const BOARDS = FULL ? [
  ['title', titleBoard, '<b>타이틀</b> — 금테 두른 청록 종이산, 붉은 해, 한지 위 수채 하늘, 부조 구름, 이끼 낀 물가 디오라마.'],
  ['battle', battleBoard, '<b>전투</b> — 같은 무대 위에 펠트 인형들이 선다. 먼 산과 앞 풀숲은 흐리게(얕은 초점), 인형이 선 땅만 또렷하게.'],
  ['puppets', puppetBoard, '<b>인형 시트</b> — 양모 펠트 결과 보풀, 유리구슬 눈, 바느질 땀. 무기·활은 나무와 쇠 소품.'],
] : [
  ['battle', battleBoard, '<b>전장 배경</b> — 금테 청록 종이산, 붉은 해, 부조 구름, 냇물과 폭포, 흙길이 지나는 이끼 들판.'],
  ['title', titleBoard, '<b>물가 배경</b> — 폭포 흐르는 냇가, 모난 큰 바위와 소나무, 진달래와 붉은 고사리.'],
  ['puppets', puppetBoard, '<b>무대 배경</b> — 먼 산을 크게 흐린 얕은 초점의 이끼 무대.'],
];
const DPR = 2;
async function run() {
  await document.fonts.ready;
  const only = location.hash.slice(1), box = document.getElementById('boards'); box.innerHTML = '';
  for (const [id, fn, cap] of BOARDS) {
    if (only && only !== id) continue;
    const fig = document.createElement('figure'), c = mk(1280 * DPR, 720 * DPR); c.id = id;
    fig.appendChild(c); const fc = document.createElement('figcaption'); fc.innerHTML = cap; fig.appendChild(fc); box.appendChild(fig);
    await new Promise(r => setTimeout(r, 0));
    const g = c.getContext('2d'); g.scale(DPR, DPR); fn(g);
  }
  document.body.dataset.done = '1';
}
run().catch(e => { document.body.dataset.err = String(e && e.stack || e); console.error(e); });
