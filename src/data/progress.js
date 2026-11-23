// 오래 할 이유: 영웅 숙련, 두 번째 병법, 새 것이 조금씩 열리는 순서, 오늘의 원정 규칙
// (규칙을 실제로 거는 곳은 state.js 의 mods()·newRun()·waveSetup())

// ── 영웅 숙련: 그 영웅으로 원정을 다녀올 때마다 숙련이 쌓인다 (넘은 고개 수 + 평정하면 6) ──
export const MASTERY_XP = [0, 4, 10, 18, 30];
export const masteryLv = xp => MASTERY_XP.filter(t => (xp || 0) >= t).length;   // 1 ~ 5
export const MASTERY_GIFT = ['', '처음', '두 번째 병법', '시작 엽전 +40', '영웅 패 2단으로 시작', '명장 (영웅 체력·공격 +10%)'];
// 두 번째 병법: 숙련 2에 열린다. 영웅 고르기에서 바꿔 고른다
export const HERO_TRAIT2 = {
  commander: { name: '진법가', desc: '학익진을 알고 시작하고, 진형의 힘이 50% 세진다.', play: '부대를 진형으로 세워 싸운다' },
  blade: { name: '검무', desc: '부대 한도가 줄지 않고, 검객의 공격 속도 +30%, 영웅기 패의 사기 -1.', play: '영웅기를 쉬지 않고 쓴다' },
  hunter: { name: '덫 사냥', desc: '마름쇠+ 두 장으로 시작하고, 전술 패 위력 +15%.', play: '덫으로 묶어 놓고 쏜다' },
  bishop: { name: '탁발', desc: '엽전 수입 +40%, 요괴 무리를 물리칠 때마다 사기 +0.5.', play: '엽전과 사기를 모은다' },
  archmage: { name: '둔갑술', desc: '부대 한도가 줄지 않고, 전술 패 위력 +15%.', play: '병력과 도술을 함께 쓴다' },
  sangsoe: { name: '사물놀이', desc: '사기 회복 +30%, 싸움이 시작될 때마다 사기 +2, 무리를 물리칠 때마다 사기 +0.5.', play: '사기를 넉넉히 쓴다' },
  chief: { name: '의적', desc: '의병 봉기 세 장으로 시작하고, 불려 온 아군이 8초 더 싸운다.', play: '의병을 불러 물량으로 민다' },
};
// ── 새 것이 열리는 순서: 끝낸 원정 수(meta.ended)가 at 에 닿으면 전리품·장터·갈림길에 나온다 ──
// 처음 열두 판 남짓은 판마다 무언가 열린다 (전설 보물은 맨 끝에, 그 축을 키울 때만 나온다)
export const UNLOCK_PACE = [
  { at: 1, cards: ['salvo', 'counter', 'pyeonjeon', 'deungpae'], relics: ['gwanhyeok', 'cheolgap', 'gakgung', 'seongdol'] },
  { at: 2, cards: ['masangjae', 'uibyeong', 'nabal', 'jukchang'], relics: ['madeung', 'f_jangsa', 'chungjang', 'daesup'], stops: ['forge'] },
  { at: 3, cards: ['jincheon', 'reload', 'hwajeon', 'eoreum'], relics: ['hwayakgo', 'f_eorin', 'yeomcho', 'meokbyeoru'] },
  { at: 4, cards: ['bujeok', 'daedong', 'ssitgim', 'jangdan'], relics: ['bujeokjip', 'gutbang', 'janggu', 'obanggi'] },
  { at: 5, cards: ['gyeokmun', 'hwasal', 'malbal'], relics: ['uibyeongjang', 'f_bangwon', 'pyeonjeontong', 'malgap'] },
  { at: 6, cards: ['nokgak', 'yeonmak'], relics: ['f_hakik', 'sanseong', 'posu'] },
  { at: 7, cards: ['byeorak', 'gyeorui', 'dokkaebibul'], relics: ['obangbuchae', 'hyangyak', 'beopgo', 'norigae'] },
  { at: 8, cards: ['sadae', 'gimamb', 'aekmagi'], relics: ['hangari', 'heuksal', 'bokjori', 'jeoul'] },
  { at: 9, cards: ['sasu', 'chongtong', 'holim'], relics: ['yakjo', 'sansin', 'pungdeung'] },
  { at: 10, cards: ['hamjeong', 'dungap', 'ogu', 'bangmang'], relics: ['daejanggi'] },
  { at: 11, cards: ['cheonbo', 'seonbong', 'ttukttak', 'gwolgi'], relics: ['singung', 'cheollima', 'cheorong'] },
  { at: 12, cards: ['bujeokbi', 'jakdu'], relics: ['singijeon', 'horibyeong', 'singal', 'hongui', 'dokkaebiwang'] },
];
export const paceAt = (kind, id) => { for (const p of UNLOCK_PACE) if ((p[kind] || []).includes(id)) return p.at; return 0; };
// ── 서약(변칙 원정): 떠나기 전에 스스로 짐을 지면 공적을 더 받는다 (평정을 한 번 하면 열린다) ──
export const VOWS = {
  bare: { name: '빈손 출정', desc: '전술 패 없이 떠난다', bonus: 15 },
  pouch: { name: '좁은 주머니', desc: '전술 패 주머니 -3', bonus: 10 },
  norest: { name: '쉬지 않는 길', desc: '주막 대신 싸움이 기다린다', bonus: 20 },
  noshop: { name: '장 없는 길', desc: '장터 대신 사건이 기다린다', bonus: 10 },
  elite: { name: '강적의 길', desc: '모든 요괴 무리에 강적의 특성이 붙는다', bonus: 25 },
  norelic: { name: '맨손', desc: '보물을 얻지 못한다 (엽전으로 받는다)', bonus: 30 },
  onearm: { name: '한 병종', desc: '새 병력 패를 얻지 못한다', bonus: 20 },
  chase: { name: '짧은 밤', desc: '본대가 20초 일찍 따라붙는다', bonus: 15 },
};
export const vowBonus = vs => (vs || []).reduce((a, k) => a + (VOWS[k] ? VOWS[k].bonus : 0), 0);
// ── 오늘의 원정: 날짜로 정해지는 영웅 하나와 규칙 둘 ──
export const DAILY_RULES = {
  market: { name: '큰 장날', desc: '장터 값 -30%' },
  mist: { name: '안개 낀 고개', desc: '원거리 사거리 -15%, 보병 체력 +15%' },
  bloodmoon: { name: '붉은 달', desc: '요괴 공격력 +15%, 엽전 수입 +50%' },
  militia: { name: '의병의 날', desc: '의병 봉기 세 장으로 시작' },
  tactics: { name: '진법의 날', desc: '모든 진형을 알고 시작' },
  lean: { name: '보릿고개', desc: '엽전 수입 -30%, 시작 엽전 +80' },
  powder: { name: '화약 냄새', desc: '비격진천뢰 두 장으로 시작, 화차 공격 속도 +20%' },
};
// 날짜 문자열 → 0~1 난수열 (모두에게 같은 날 같은 영웅·규칙)
export function dayRng(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return () => { h = (Math.imul(h ^ (h >>> 15), 2246822507) + 0x6D2B79F5) >>> 0; h ^= h >>> 13; return (h >>> 0) / 4294967296; }; }
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
