// 고개(장) 정의: 고개마다 옛이야기 하나. 열두 고개를 차례로 넘는다
// pool = 그 고개에 나오는 요괴와 무게 · chase = 싸움을 오래 끌면 따라붙는 본대 · terr = 싸움터 지형 · sky = [낮, 밤] 확률(나머지는 비)
export const ORD = ['첫째', '둘째', '셋째', '넷째', '다섯째', '여섯째', '일곱째', '여덟째', '아홉째', '열째', '열한째', '열두째'];
const C = (id, tale, place, theme, boss, sub, pool, chase, terr, sky, bossSky = 'day') => ({ id, tale, place, theme, boss, sub, pool, chase, terr, sky, bossSky });
export const CHAPTERS = [
  C('fox', '여우 누이', '여우 고개', 'pass', 'gumiho', '아홉 꼬리 여우가 사람 흉내를 내는 고개',
    { goblin: 5, orc: 3, garcher: 4, rassassin: 3, yagwang: 2, gamtu: 1.2, foxhag: 1.2 }, ['goblin', 'rassassin'], ['open', 'open', 'rocks', 'gate', 'palisade'], [0.75, 0.15]),
  C('dueok', '두억시니', '바위 고개', 'autumn', 'dueokboss', '머리를 내리찍는 귀신의 단풍 바윗길',
    { goblin: 3, orc: 4, garcher: 3, rshield: 3, dueok: 2.5, yagwang: 2, gamtu: 1.6, bat: 1.6 }, ['goblin', 'orc'], ['rocks', 'rocks', 'gate', 'open', 'palisade'], [0.7, 0.15]),
  C('ssireum', '도깨비 씨름', '씨름재', 'grove', 'warchief', '도깨비들이 밤마다 씨름판을 벌이는 고개',
    { goblin: 4, orc: 5, garcher: 3, rshield: 3, shaman: 2.5, bomber: 2, gamtu: 2.2, yeongno: 1.5 }, ['goblin', 'orc'], ['open', 'grove', 'gate', 'palisade', 'rocks'], [0.55, 0.3]),
  C('tiger', '해와 달이 된 오누이', '호랑이 고개', 'snow', 'tigerboss', '떡 하나 달라는 호랑이가 사는 눈 고개',
    { wolf: 4, rassassin: 3, garcher: 3, orc: 3, goblin: 2, jangsan: 1.5, yagwang: 1.5, changgwi: 2.5, bat: 1.5 }, ['wolf', 'rassassin'], ['open', 'rocks', 'grove', 'gate', 'bridge'], [0.6, 0.3]),
  C('magpie', '은혜 갚은 까치', '옛 절터', 'mist', 'serpent', '종소리 끊긴 절터에 똬리 튼 큰 구렁이',
    { treant: 3, shaman: 3, garcher: 3, rshield: 3, bomber: 3, wolf: 2, orc: 3, myodusa: 2.2, mulgwi: 2 }, ['orc', 'bomber'], ['grove', 'bridge', 'rocks', 'gate', 'open'], [0.5, 0.2]),
  C('dangsan', '장승과 당산나무', '장승배기', 'grove', 'elder', '베어진 숲에서 나무 신령이 깨어났다',
    { treant: 5, shaman: 3, garcher: 3, wolf: 3, bomber: 2, dueok: 2, jangsan: 1.5, jine: 2.2, foxhag: 1.5 }, ['orc', 'wolf', 'bomber'], ['grove', 'grove', 'bridge', 'rocks', 'gate'], [0.5, 0.2]),
  C('bulga', '불가사리', '쇠 고개', 'ember', 'bulgaboss', '쇠란 쇠는 다 먹는 짐승의 대장간 마을',
    { orc: 4, rshield: 3, bomber: 3, catapult: 1.5, bulga: 1.5, dueok: 2, garcher: 3, goblin: 2, gangcheol: 1.8, yeongno: 1.5 }, ['orc', 'bomber'], ['gate', 'palisade', 'rocks', 'open', 'bridge'], [0.6, 0.25]),
  C('cheoyong', '처용과 역신', '앓는 마을', 'mist', 'plague', '집집마다 앓는 소리, 대문마다 걸린 탈',
    { skel: 3, yagwang: 3, shaman: 3, rassassin: 2, bomber: 3, geuseun: 1.5, garcher: 3, orc: 2, dalgyal: 2.5, songaksi: 2 }, ['yagwang', 'bomber', 'orc'], ['gate', 'palisade', 'open', 'rocks', 'bridge'], [0.3, 0.5]),
  C('imugi', '이무기', '용소', 'storm', 'imugi', '천 년을 기다린 이무기가 비를 부르는 소',
    { wolf: 3, rshield: 3, shaman: 3, garcher: 3, bulga: 1.5, jangsan: 2, treant: 3, catapult: 1.5, mulgwi: 2, myodusa: 1.8 }, ['wolf', 'orc', 'bomber'], ['bridge', 'bridge', 'rocks', 'gate', 'open'], [0.15, 0.15], 'rain'),
  C('eoduk', '어둑시니', '어스름재', 'dusk', 'skelking', '올려다볼수록 커지는 어둠이 덮은 고개',
    { skel: 5, skelarcher: 4, geuseun: 2.5, bomber: 3, yagwang: 2, rassassin: 2, necro: 1.5, dalgyal: 2, bat: 2, agwi: 1.5 }, ['skel', 'skelarcher', 'bomber'], ['gate', 'bridge', 'palisade', 'rocks', 'open'], [0.15, 0.7], 'night'),
  C('chasa', '저승 차사', '황천길', 'under', 'reaper', '명부 든 차사가 지키는 저승 가는 길',
    { skel: 5, skelarcher: 4, necro: 3, catapult: 2, rshield: 2, geuseun: 2, dueok: 1.5, agwi: 2, songaksi: 2, changgwi: 1.5 }, ['skel', 'skelarcher', 'orc'], ['gate', 'bridge', 'palisade', 'rocks', 'open'], [0.1, 0.75], 'night'),
  C('yeomra', '염라대왕', '저승 문', 'under', 'yeomra', '저승 임금이 죄를 묻는 마지막 고개',
    { skel: 4, skelarcher: 4, necro: 3, geuseun: 2, dueok: 2, bulga: 1.5, jangsan: 1.5, catapult: 2, rassassin: 2, agwi: 1.5, gangcheol: 1.5, jine: 1.5, dalgyal: 1.5 }, ['skel', 'skelarcher', 'orc'], ['gate', 'bridge', 'palisade', 'rocks', 'open'], [0.1, 0.75], 'night'),
];
export const N_CH = CHAPTERS.length;
CHAPTERS.forEach((c, i) => { c.n = i; c.short = ORD[i] + ' 고개'; c.name = `${ORD[i]} 고개 · ${c.place}`; });
// 고개 번호가 범위를 벗어나도(원정을 다 마친 뒤) 마지막 고개를 돌려준다
export const chapterOf = ch => CHAPTERS[Math.max(0, ch | 0) % N_CH];   // 끝없는 고개에서는 열두 고개가 다시 돈다
