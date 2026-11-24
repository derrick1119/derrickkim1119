// Turns the captured runs into one script in play order: spoken lines with their speaker, on-screen writing as 「화면」.
// node fmt.js <outdir> → <outdir>/script.txt (for reading) and <outdir>/script.json (rows with ids)
const fs = require('fs');
const dir = process.argv[2];
const NAMES = { leo: '레오', ana: '아나', mom: '엄마', bram: '브램 선장', v1: '이웃 할아버지', v2: '빵집 아주머니', v3: '목수 아저씨', rosa: '로사', wife: '마르타', son: '로사의 아들', kid: '피피', pmom: '피피의 엄마', pdad: '피피의 아빠', post: '집배원', lily: '릴리', dil: '로사의 며느리', both: '레오와 아나', cloud: '구름이', all: '레오와 아나와 구름이' };
const nameSet = new Set(Object.values(NAMES));
// screen writing that is interface, not story
const UI = /^(건너뛰기|눌러서|화면을 눌러|소리를 켜면|장 바로 가기|처음부터 시작|이어하기|설정|소리|음악|효과음|글자|언어|닫기|English|한국어)/;
const PARTS = [['pro', 'P', '프롤로그 ~ 1장'], ['ch2', '2', '2장'], ['ch3', '3', '3장'], ['ch4', '4', '4장'], ['ch5', '5', '5장'], ['ch6', '6', '6장'], ['ch7', '7', '마지막 장']];
const rows = [];
let txt = '';
for (const [part, tag, title] of PARTS) {
  const f = dir + '/' + part + '.json';
  if (!fs.existsSync(f)) continue;
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const said = new Set(d.lines.filter((l) => l.t === 'say').map((l) => l.text));
  const talky = new Set(d.lines.filter((l) => l.t === 'say').map((l) => l.sc));   /* speaker names only count as names where someone speaks */
  txt += `\n\n===== ${title} (${part}; through ${d.through.join('>')}; errors ${d.errors.length}) =====\n`;
  let sc = null, lastText = null; const cnt = {};
  const texts = new Set(d.lines.filter((l) => l.t === 'text').map((l) => l.text));
  // fold the year counter ("마중 나루에 온 지", "0년", "아나, 36세", "1년", …) into one card
  const L = [];
  for (let i = 0; i < d.lines.length; i++) {
    const l = d.lines[i];
    if (l.t === 'text' && (/^마중 나루에 온 지/.test(l.text) || /^\d+년$/.test(l.text))) {
      const ys = [], as = [];
      if (/^\d+년$/.test(l.text)) ys.push(l.text);
      let j = i + 1;
      for (; j < d.lines.length; j++) {
        const m = d.lines[j];
        if (m.t !== 'text') break;
        if (/^\d+년$/.test(m.text)) ys.push(m.text); else if (/^[^,]+, \d+세$/.test(m.text)) as.push(m.text); else break;
      }
      L.push(Object.assign({}, l, { text: '마중 나루에 온 지 ' + (ys.length ? ys[0] + (ys.length > 1 ? ' → ' + ys[ys.length - 1] : '') : '') + (as.length ? ' · ' + as[0] + (as.length > 1 ? ' → ' + as[as.length - 1].split(', ')[1] : '') : ''), card: true }));
      i = j - 1; continue;
    }
    L.push(l);
  }
  for (const l of L) {
    if (l.t === 'text' && !l.card) {
      if (said.has(l.text) || (nameSet.has(l.text) && talky.has(l.sc)) || UI.test(l.text)) continue;
      if (l.text === lastText) continue;
      const cut = l.text.indexOf(' · ');   /* "tip · keyboard tip" repeats a tip already listed */
      if (cut > 0 && texts.has(l.text.slice(0, cut))) continue;
    }
    if (part !== 'pro' && l.sc !== part) continue;   /* the next chapter's opening belongs to its own run */
    if (l.sc !== sc) { sc = l.sc; txt += `\n--- [${sc}]\n`; }
    const tg = part === 'pro' ? (['harbor', 'kitchen'].includes(sc) ? '1' : 'P') : tag;
    cnt[tg] = (cnt[tg] || 0) + 1;
    const id = tg + '-' + String(cnt[tg]).padStart(3, '0');
    const who = l.t === 'say' ? NAMES[l.who] || l.who : '화면';
    rows.push({ id, part, sc: l.sc, kind: l.t, whoKey: l.who || null, who, text: l.text, slow: !!l.slow });
    txt += `${id} ${who}${l.slow ? '(천천히)' : ''}: ${l.text.replace(/\n/g, ' / ')}\n`;
    lastText = l.text;
  }
}
fs.writeFileSync(dir + '/script.txt', txt);
fs.writeFileSync(dir + '/script.json', JSON.stringify(rows, null, 1));
console.log('rows', rows.length, 'say', rows.filter((r) => r.kind === 'say').length);
