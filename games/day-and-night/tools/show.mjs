// 스테이지를 눈금자와 함께 출력한다:  node tools/show.mjs 1-2
import { LEVELS } from '../js/levels.js';
const id = process.argv[2];
for (const lv of LEVELS) {
  if (id && lv.id !== id) continue;
  const w = lv.rows[0].length;
  const count = (c) => lv.rows.join('').split(c).length - 1;
  console.log(`\n== ${lv.id}  ${w}×${lv.rows.length}  S:${count('S')} E:${count('E')} 빛꽃:${count('*')} 등불:${count('L')}`);
  let tens = '    ', ones = '    ';
  for (let x = 0; x < w; x++) { tens += x % 10 === 0 ? String(Math.floor(x / 10) % 10) : ' '; ones += x % 10; }
  console.log(tens); console.log(ones);
  lv.rows.forEach((r, y) => console.log(String(y).padStart(3) + ' ' + r));
}
