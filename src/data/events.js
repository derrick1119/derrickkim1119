// 고갯길에서 만나는 사건. pick() 은 [이야기, 결과...] 를 돌려준다.
import { G, act } from '../state.js';
import { UNITS } from './units.js';

const chance = p => Math.random() < p;
const melee = d => !d.range && !d.heal;
export const EVENTS = {
  rest: { title: '주막', art: 'priest', text: '고갯마루 주막에 들렀습니다. 두목과 맞서기 전에 숨을 고를 수 있습니다.', choices: p => [
    { label: '쉬어 간다', desc: G.run.crowns < 3 ? '깃발 +1' : '깃발이 가득 — 대신 군량 +1', pick: () => ['뜨끈한 국밥 한 그릇에 기운을 차렸습니다.', act.flag(1)] },
    p.train ? { label: `${UNITS[p.train].name} 조련`, desc: `${UNITS[p.train].name} Lv +1 (체력·${UNITS[p.train].heal ? '치유량' : '공격력'} +20%)`, pick: () => ['주막 마당에서 밤새 합을 맞췄습니다.', act.trainType(p.train)] } : null,
    { label: '영웅 수련', desc: '영웅 Lv +1 (체력·공격력·영웅기 +20%)', pick: () => ['영웅이 홀로 새벽 수련을 마쳤습니다.', act.hero()] },
    { label: '잔치를 벌인다', cost: 90, desc: '엽전 90 → 깃발 +1 그리고 무작위 병종 Lv +1', pick: () => { act.gold(-90); return ['고기와 술이 돌자 사기가 하늘을 찌릅니다.', act.flag(1), act.train()]; } },
  ] },
  ssireum: { title: '도깨비 씨름', art: 'orc', text: '길목에서 도깨비 하나가 씨름 한 판을 청합니다. "이기면 엽전을 주마. 지면 네 것을 좀 가져가마!"\n도깨비는 왼다리가 약하다는 옛말이 있습니다.', choices: () => [
    { label: '왼다리를 건다', desc: '70%: 엽전 +70  ·  30%: 엽전 -30', pick: () => chance(0.7) ? ['왼다리를 걸자 도깨비가 벌렁 나자빠졌습니다.', act.gold(70)] : ['하필 오른다리가 약한 도깨비였습니다.', act.gold(-30)] },
    { label: '힘으로 겨룬다', desc: '영웅 Lv +1, 대신 부정이 하나 붙는다', pick: () => ['날이 샐 때까지 버틴 끝에 비겼습니다. 도깨비가 씩씩대며 사라집니다.', act.hero(), act.curse()] },
    { label: '못 본 척 지나간다', desc: '아무 일도 없다', pick: () => ['도깨비가 심심한 듯 돌멩이를 걷어찹니다.'] },
  ] },
  axe: { title: '금도끼 은도끼', art: 'archmage', text: '연못에 도끼를 빠뜨리자 물안개 속에서 산신령이 금도끼를 들고 나타납니다.\n"이 금도끼가 네 것이냐?"', choices: () => [
    { label: '"제 것은 쇠도끼입니다"', desc: '보물 하나를 얻는다', pick: () => ['"정직하구나." 산신령이 보물을 내려 줍니다.', act.relic()] },
    { label: '"예, 제 금도끼입니다"', desc: '50%: 엽전 +130  ·  50%: 부정', pick: () => chance(0.5) ? ['산신령이 한숨을 쉬며 금도끼를 던져 주고 사라집니다.', act.gold(130)] : ['"고얀 놈!" 호통과 함께 물벼락이 떨어집니다.', act.curse()] },
  ] },
  shrine: { title: '서낭당', art: 'priest', text: '고갯마루 서낭당에 돌무더기가 쌓여 있습니다. 무녀가 말합니다.\n"정성을 올리면 산신께서 굽어보실 겁니다."', choices: () => [
    { label: '엽전을 바친다', cost: 40, desc: '엽전 40 → 깃발 +1 (가득하면 군량 +1)', pick: () => { act.gold(-40); return ['오색 천이 바람에 나부낍니다.', act.flag(1)]; } },
    { label: '돌 하나를 얹는다', desc: '부정이 있으면 하나 씻긴다. 없으면 엽전 +15', pick: () => { const c = act.cleanse(); return c ? ['마음이 한결 가벼워졌습니다.', c] : ['돌 틈에서 누가 놓고 간 엽전을 발견했습니다.', act.gold(15)]; } },
  ] },
  peddler: { title: '떠돌이 약장수', art: 'wizard', text: '"이 약으로 말할 것 같으면, 애들은 가라!"\n약장수가 봇짐을 풀어 놓습니다. 솜씨 좋은 의병도 소개해 준다고 합니다.', choices: () => [
    { label: '보약을 산다', cost: 50, desc: '엽전 50 → 무작위 병종 Lv +1', pick: () => { act.gold(-50); return ['쓴맛에 다들 얼굴을 찌푸렸지만 효험은 확실합니다.', act.train()]; } },
    { label: '의병을 소개받는다', cost: 35, desc: '엽전 35 → 무작위 병종 인원 증가', pick: () => { act.gold(-35); return ['약장수의 조카들이 합류했습니다.', act.reinforce()]; } },
    { label: '그냥 지나간다', desc: '아무 일도 없다', pick: () => ['약장수의 목소리가 등 뒤로 멀어집니다.'] },
  ] },
  lost: { title: '길 잃은 의병', art: 'spear', text: '산속에서 길 잃은 의병 무리를 만났습니다. 지치고 굶주렸지만 눈빛은 살아 있습니다.', choices: () => [
    { label: '함께 가자고 한다', desc: '무작위 부대 하나가 합류한다', pick: () => ['"이 고개만 넘으면 고향입니다. 같이 싸우겠습니다!"', act.recruit()] },
    { label: '길을 알려주고 보낸다', desc: '엽전 +45', pick: () => ['의병들이 고마워하며 노잣돈을 쥐여 줍니다.', act.gold(45)] },
  ] },
  bangmangi: { title: '도깨비 방망이', art: 'goblin', text: '수풀 속에 주인 없는 도깨비 방망이가 떨어져 있습니다.\n"금 나와라 뚝딱" 하면 정말 금이 나올까요?', choices: () => [
    { label: '두드려 본다', desc: '60%: 엽전 +90  ·  40%: 엽전 +30 과 부정', pick: () => chance(0.6) ? ['금 나와라 뚝딱! 엽전이 와르르 쏟아집니다.', act.gold(90)] : ['엽전과 함께 방망이 주인이 나타나 골탕을 먹입니다.', act.gold(30), act.curse()] },
    { label: '장작으로 쓴다', desc: '엽전 +20', pick: () => ['잘 마른 방망이라 불이 잘 붙습니다. 남은 쇠붙이는 팔았습니다.', act.gold(20)] },
  ] },
  boar: { title: '굶주린 멧돼지', art: 'wolf', text: '"꾸익!" 집채만 한 멧돼지가 길을 막고 섰습니다. 배가 몹시 고픈 모양입니다.', choices: () => [
    { label: '군량을 던져 준다', desc: '군량 -1, 대신 보물 하나', pick: () => ['배를 채운 멧돼지가 땅을 파헤치자 묻혀 있던 보물이 드러납니다.', act.cap(-1), act.relic()] },
    { label: '쫓아낸다', desc: '55%: 엽전 +55  ·  45%: 엽전 -40', pick: () => chance(0.55) ? ['멧돼지가 달아나며 떨군 송이버섯을 장에 팔았습니다.', act.gold(55)] : ['멧돼지가 짐을 죄다 들이받고 달아났습니다.', act.gold(-40)] },
  ] },
  well: { title: '우물가의 귀신', art: 'skel', text: '달빛 아래 우물가에서 소복 입은 귀신이 흐느낍니다.\n"내 한을… 풀어 주오."', choices: () => [
    { label: '굿으로 한을 풀어 준다', cost: 45, desc: '엽전 45 → 보물 [수호 부적]', pick: () => { act.gold(-45); return ['귀신이 환하게 웃으며 부적 한 장을 남기고 사라집니다.', act.relic('amulet')]; } },
    { label: '사연만 들어 준다', desc: '엽전 +60, 대신 부정이 하나 붙는다', pick: () => ['귀신이 숨겨 둔 패물이 있는 곳을 일러 줍니다. 등골이 서늘합니다.', act.gold(60), act.curse()] },
    { label: '돌아보지 않고 떠난다', desc: '아무 일도 없다', pick: () => ['흐느낌이 바람 소리에 묻힙니다.'] },
  ] },
  smith: { title: '산골 대장간', art: 'berserk', text: '산골 대장간에서 망치 소리가 울립니다. 대장장이가 땀을 훔치며 묻습니다.\n"뭘 손봐 드릴까?"', choices: () => [
    { label: '무기를 벼린다', cost: 55, desc: '엽전 55 → 무작위 근접 병종 Lv +1', pick: () => { act.gold(-55); return ['날이 시퍼렇게 섰습니다.', act.train(melee)]; } },
    { label: '갑옷을 맞춘다', cost: 60, desc: '엽전 60 → 보물 [두정갑]', pick: () => { act.gold(-60); return ['쇠못을 촘촘히 박은 갑옷이 완성됐습니다.', act.relic('plate')]; } },
    { label: '구경만 한다', desc: '아무 일도 없다', pick: () => ['불꽃 튀는 모루를 한참 구경했습니다.'] },
  ] },
  sansam: { title: '심봤다!', art: 'bishop', text: '바위틈에서 백 년 묵은 산삼을 발견했습니다!', choices: () => [
    { label: '영웅이 먹는다', desc: '영웅 Lv +1', pick: () => ['영웅의 온몸에 기운이 솟구칩니다.', act.hero()] },
    { label: '달여서 나눠 마신다', desc: '보물 [산삼] — 모든 아군 체력 +10%', pick: () => ['한 사발씩 돌려 마시니 모두 얼굴에 생기가 돕니다.', act.relic('ginseng')] },
    { label: '장에 내다 판다', desc: '엽전 +90', pick: () => ['약재상이 눈이 휘둥그레져 값을 후하게 쳐 줍니다.', act.gold(90)] },
  ] },
  fox: { title: '여우 고개', art: 'rassassin', text: '고운 여인이 손짓합니다. "이리 오세요, 지름길을 알려 드리지요."\n치맛자락 아래로 꼬리가… 아홉 개?', choices: () => [
    { label: '따라간다', desc: '50%: 보물 하나  ·  50%: 깃발 -1', pick: () => chance(0.5) ? ['여우가 홀린 듯 구슬을 떨어뜨리고 달아났습니다.', act.relic()] : ['정신을 차려 보니 엉뚱한 골짜기를 헤매고 있었습니다.', act.flag(-1)] },
    { label: '꼬리를 밟는다', desc: '엽전 +40', pick: () => ['"캥!" 여우가 패물을 흘리고 달아납니다.', act.gold(40)] },
  ] },
  jangseung: { title: '길가의 장승', art: 'treant', text: '길가의 장승이 눈을 부라리고 서 있습니다. 정성껏 절을 올리면 길을 지켜 준다고 합니다.', choices: () => [
    { label: '절을 올린다', desc: '다음 싸움을 사기 +4 로 시작한다', pick: () => ['장승의 눈매가 조금 누그러진 듯합니다.', act.morale(4)] },
    { label: '금줄을 걸어 준다', cost: 30, desc: '엽전 30 → 보물 [솟대]', pick: () => { act.gold(-30); return ['새끼줄에 흰 종이를 끼워 걸자 바람이 잦아듭니다.', act.relic('sotdae')]; } },
  ] },
};
export function eventView(p) { const e = EVENTS[p.id] || EVENTS.rest; return { title: e.title, art: e.art, text: e.text, choices: e.choices(p).filter(Boolean) }; }
