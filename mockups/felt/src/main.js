import { mk } from './felt.js';
import { titleBoard, battleBoard, puppetBoard } from './boards.js';

const BOARDS = [
  ['title', titleBoard, '<b>타이틀</b> — 금테 두른 청록 종이산, 붉은 해, 한지 위 수채 하늘, 부조 구름, 이끼 낀 물가 디오라마.'],
  ['battle', battleBoard, '<b>전투</b> — 같은 무대 위에 펠트 인형들이 선다. 먼 산과 앞 풀숲은 흐리게(얕은 초점), 인형이 선 땅만 또렷하게.'],
  ['puppets', puppetBoard, '<b>인형 시트</b> — 양모 펠트 결과 보풀, 유리구슬 눈, 바느질 땀. 무기·활은 나무와 쇠 소품.'],
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
