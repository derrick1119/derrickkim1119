// 고갯길에서 만나는 사건. pick() 은 [이야기, 결과...] 를 돌려준다.
import { G, act } from '../state.js';
import { UNITS } from './units.js';

const chance = p => Math.random() < p;
const melee = d => !d.range && !d.heal;
// 그 영웅이 덱에 있을 때만 열리는 갈래
const hero = (h, c) => G.run.deck.some(q => q.id === 'h_' + h) ? Object.assign({ hero: h }, c) : null;
export const EVENTS = {
  ssireum: { title: '도깨비 씨름', art: 'orc', text: '도깨비가 길을 막고 씨름 한 판을 청합니다.\n도깨비는 왼다리가 약하다지요.', choices: () => [
    hero('chief', { label: '두령: "한 판 붙자"', desc: '엽전 +70, 영웅 +1단', pick: () => ['두령이 도깨비를 번쩍 들어 메쳤습니다. "역시 두령이여!"', act.gold(70), act.hero()] }),
    { label: '왼다리를 건다', desc: '70%: 엽전 +70 · 30%: 엽전 -30', pick: () => chance(0.7) ? ['왼다리를 걸자 도깨비가 벌렁 나자빠졌습니다.', act.gold(70)] : ['하필 오른다리가 약한 도깨비였습니다.', act.gold(-30)] },
    { label: '힘으로 겨룬다', desc: '영웅 +1단, 대신 부정 하나', pick: () => ['날이 샐 때까지 버틴 끝에 비겼습니다.', act.hero(), act.curse()] },
    { label: '못 본 척 지나간다', desc: '아무 일도 없다', pick: () => ['도깨비가 심심한 듯 돌멩이를 걷어찹니다.'] },
  ] },
  axe: { title: '금도끼 은도끼', art: 'archmage', text: '연못에 도끼를 빠뜨리자 산신령이 나타납니다.\n"이 금도끼가 네 것이냐?"', choices: () => [
    hero('archmage', { label: '신선: "아직 여기 있나"', desc: '보물 하나, 엽전 +50', pick: () => ['"형님이 술 쏟은 날부터 지켰지요." 도끼 셋을 다 줍니다.', act.relic(), act.gold(50)] }),
    { label: '"제 것은 쇠도끼요"', desc: '보물 하나', pick: () => ['"정직하구나." 산신령이 보물을 내려 줍니다.', act.relic()] },
    { label: '"예, 제 금도끼요"', desc: '50%: 엽전 +130 · 50%: 부정', pick: () => chance(0.5) ? ['산신령이 한숨을 쉬며 금도끼를 던져 줍니다.', act.gold(130)] : ['"고얀 놈!" 호통과 함께 물벼락이 떨어집니다.', act.curse()] },
  ] },
  shrine: { title: '서낭당', art: 'priest', text: '고갯마루 서낭당에 돌무더기가 쌓여 있습니다.\n"정성을 올리면 산신께서 굽어보시지요."', choices: () => [
    hero('sangsoe', { label: '상쇠: 지신밟기 한 판', desc: '보물 [큰북], 사기 +3으로 시작', pick: () => ['쇳소리에 오색 천이 춤을 춥니다. 다들 어깨가 들썩입니다.', act.relic('drum'), act.morale(3)] }),
    { label: '엽전을 바친다', cost: 40, desc: '엽전 40 → 보물 하나', pick: () => { act.gold(-40); return ['돌무더기 틈에서 반짝이는 것이 나옵니다.', act.relic()]; } },
    { label: '돌 하나를 얹는다', desc: '부정이나 [잡념] 씻김, 없으면 엽전 +15', pick: () => { const c = act.cleanse() || act.clearDoubt(); return c ? ['마음이 한결 가벼워졌습니다.', c] : ['돌 틈에서 누가 놓고 간 엽전을 찾았습니다.', act.gold(15)]; } },
  ] },
  peddler: { title: '떠돌이 약장수', art: 'wizard', text: '"이 약으로 말할 것 같으면, 애들은 가라!"\n약장수가 봇짐을 풀어 놓습니다.', choices: () => [
    { label: '보약을 산다', cost: 50, desc: '엽전 50 → 무작위 병력 패 +1단', pick: () => { act.gold(-50); return ['쓴맛에 다들 얼굴을 찌푸렸지만 효험은 확실합니다.', act.train()]; } },
    { label: '약초를 산다', cost: 30, desc: '엽전 30 → 패 [약손] 두 장', pick: () => { act.gold(-30); return ['잘 말린 약초 한 꾸러미를 받았습니다.', act.card('heal')]; } },
    { label: '그냥 지나간다', desc: '아무 일도 없다', pick: () => ['약장수 목소리가 등 뒤로 멀어집니다.'] },
  ] },
  lost: { title: '길 잃은 의병', art: 'spear', text: '산속에서 길 잃은 의병들을 만났습니다.\n굶주렸지만 눈빛은 살아 있습니다.', choices: () => [
    { label: '함께 가자고 한다', desc: '무작위 병력 패 한 장', pick: () => ['"고개만 넘으면 고향입니다. 같이 싸우겠습니다!"', act.recruit()] },
    { label: '길을 알려 준다', desc: '엽전 +45', pick: () => ['의병들이 고마워하며 노잣돈을 쥐여 줍니다.', act.gold(45)] },
  ] },
  bangmangi: { title: '도깨비 방망이', art: 'goblin', text: '수풀 속에 도깨비 방망이가 떨어져 있습니다.\n"금 나와라 뚝딱" 하면 정말 나올까요?', choices: () => [
    { label: '두드려 본다', desc: '60%: 엽전 +90 · 40%: +30, 부정', pick: () => chance(0.6) ? ['금 나와라 뚝딱! 엽전이 와르르 쏟아집니다.', act.gold(90)] : ['엽전과 함께 방망이 주인이 나타났습니다!', act.gold(30), act.curse()] },
    { label: '장작으로 쓴다', desc: '엽전 +20', pick: () => ['방망이는 불쏘시개로, 쇠붙이는 장에 팔았습니다.', act.gold(20)] },
  ] },
  boar: { title: '굶주린 멧돼지', art: 'wolf', text: '"꾸익!" 집채만 한 멧돼지가 길을 막았습니다.\n배가 몹시 고픈 모양입니다.', choices: () => [
    hero('hunter', { label: '명궁: 활을 내린다', desc: '보물 하나', pick: () => ['"너는 안 쏜다. 내가 찾는 건 흰 범뿐." 멧돼지가 땅을 팝니다.', act.relic()] }),
    { label: '먹을 것을 던져 준다', desc: '부대 한도 -1, 대신 보물 하나', pick: () => ['배부른 멧돼지가 땅을 파헤치자 보물이 드러납니다.', act.cap(-1), act.relic()] },
    { label: '쫓아낸다', desc: '55%: 엽전 +55 · 45%: 엽전 -40', pick: () => chance(0.55) ? ['달아난 멧돼지가 떨군 송이버섯을 팔았습니다.', act.gold(55)] : ['멧돼지가 짐을 죄다 들이받고 달아났습니다.', act.gold(-40)] },
  ] },
  well: { title: '우물가의 귀신', art: 'skel', text: '달빛 아래 우물가에서 소복 입은 귀신이 흐느낍니다.\n"집에 가는 길을 잃었소."', choices: () => [
    hero('bishop', { label: '고승: 염불로 달랜다', desc: '보물 [수호 부적]', pick: () => ['목탁 소리에 흐느낌이 잦아들고 부적 한 장이 남습니다.', act.relic('amulet')] }),
    { label: '굿을 해 준다', cost: 45, desc: '엽전 45 → 보물 [수호 부적]', pick: () => { act.gold(-45); return ['귀신이 환하게 웃으며 부적을 남기고 떠납니다.', act.relic('amulet')]; } },
    { label: '사연만 들어 준다', desc: '엽전 +60, 대신 [잡념] 한 장', pick: () => ['귀신이 패물 묻은 곳을 일러 줍니다. 흐느낌이 귀에 맴돕니다.', act.gold(60), act.doubt()] },
    { label: '돌아보지 않는다', desc: '아무 일도 없다', pick: () => ['흐느낌이 바람 소리에 묻힙니다.'] },
  ] },
  smith: { title: '산골 대장간', art: 'berserk', text: '산골 대장간에서 망치 소리가 울립니다.\n"뭘 손봐 드릴까?"', choices: () => [
    { label: '새 무기를 맞춘다', cost: 45, desc: '엽전 45 → 무작위 무기 하나', pick: () => { act.gold(-45); return ['갓 벼린 무기입니다. 임자를 잘 만나야 한답니다.', act.weapon()]; } },
    { label: '무기를 벼린다', cost: 55, desc: '엽전 55 → 근접 병력 패 +1단', pick: () => { act.gold(-55); return ['날이 시퍼렇게 섰습니다.', act.train(melee)]; } },
    { label: '구경만 한다', desc: '아무 일도 없다', pick: () => ['불꽃 튀는 모루를 한참 구경했습니다.'] },
  ] },
  sansam: { title: '심봤다!', art: 'bishop', text: '바위틈에서 백 년 묵은 산삼을 찾았습니다!', choices: () => [
    { label: '영웅이 먹는다', desc: '영웅 +1단', pick: () => ['영웅의 온몸에 기운이 솟구칩니다.', act.hero()] },
    { label: '달여 나눠 마신다', desc: '보물 [산삼]: 아군 체력 +10%', pick: () => ['한 사발씩 돌려 마시니 얼굴마다 생기가 돕니다.', act.relic('ginseng')] },
    { label: '장에 내다 판다', desc: '엽전 +90', pick: () => ['약재상이 눈이 휘둥그레져 값을 후하게 쳐 줍니다.', act.gold(90)] },
  ] },
  fox: { title: '여우 고개', art: 'foxlady', after: 'foxrun', text: '고운 여인이 지름길을 알려 주겠다며 손짓합니다.\n치마 아래로 꼬리가… 아홉 개?', choices: () => [
    hero('blade', { label: '검객: 눈을 마주친다', desc: '보물 하나', pick: () => ['"넌 못 홀리겠구나. 아버지 칼 찾는다지? 이거라도 가져가."', act.relic()] }),
    { label: '따라간다', desc: '50%: 보물 하나 · 50%: 부정', pick: () => chance(0.5) ? ['여우가 홀린 듯 구슬을 떨구고 달아났습니다.', act.relic()] : ['정신 차려 보니 엉뚱한 골짜기, 등에 부정이 붙었습니다.', act.curse()] },
    { label: '꼬리를 밟는다', desc: '엽전 +40', pick: () => ['"캥!" 여우가 패물을 흘리고 달아납니다.', act.gold(40)] },
  ] },
  jangseung: { title: '길가의 장승', art: 'treant', text: '장승 하나가 길 한가운데까지 걸어 나와 있습니다.\n절을 올리면 길을 지켜 준답니다.', choices: () => [
    { label: '절을 올린다', desc: '사기 +4로 시작', pick: () => ['장승의 눈매가 조금 누그러진 듯합니다.', act.morale(4)] },
    { label: '금줄을 걸어 준다', cost: 30, desc: '엽전 30 → 보물 [솟대]', pick: () => { act.gold(-30); return ['흰 종이 끼운 새끼줄을 걸자 바람이 잦아듭니다.', act.relic('sotdae')]; } },
  ] },
  scholar: { title: '떠돌이 선비', art: 'necro', text: '정자에서 갓 쓴 선비가 장기판을 펴 놓았습니다.\n"심심하던 차요. 병법 이야기나 합시다."', choices: () => [
    { label: '병법을 배운다', cost: 30, desc: '엽전 30 → 전술 패 하나 익힘(+)', pick: () => { act.gold(-30); return ['선비의 훈수 한마디에 눈이 번쩍 뜨입니다.', act.cardUp()]; } },
    { label: '내기 장기를 둔다', desc: '55%: 새 패 두 장 · 45%: [잡념]', pick: () => chance(0.55) ? ['"허허, 졌소." 선비가 병법 한 수를 적어 줍니다.', act.card()] : ['외통수에 걸렸습니다. 분해서 밤잠을 설칩니다.', act.doubt()] },
    { label: '인사만 하고 간다', desc: '아무 일도 없다', pick: () => ['선비가 다시 혼자 장기를 둡니다.'] },
  ] },
  tomb: { title: '옛 장수의 무덤', art: 'skel', text: '무덤 앞 돌상에 녹슨 병장기가 놓여 있습니다.\n십 년 전 이 고개를 지키던 이의 것입니다.', choices: () => [
    hero('commander', { label: '장군: 옛 부하를 부른다', desc: '영웅 +1단, 패 [함성] 두 장', pick: () => ['장군이 무릎 꿇고 이름을 부르자 바람이 잦아듭니다.', act.hero(), act.card('cry')] }),
    { label: '병장기를 가져간다', desc: '무기 하나, 대신 [잡념] 한 장', pick: () => ['녹을 벗기니 쓸 만합니다. 뒷덜미가 조금 서늘합니다.', act.weapon(), act.doubt()] },
    { label: '술 한 잔 올린다', desc: '패 [함성] 두 장', pick: () => ['바람결에 옛 장수의 호령이 들리는 듯합니다.', act.card('cry')] },
  ] },
  hokburi: { title: '혹부리 영감', art: 'shaman', text: '빈집에서 노래를 부르자 도깨비들이 몰려옵니다.\n"그 고운 소리는 어디서 나오느냐?"', choices: () => [
    hero('sangsoe', { label: '상쇠: 꽹과리로 받는다', desc: '보물 [풍물패], 엽전 +40', pick: () => ['쇳소리에 도깨비들이 밤새 덩실덩실 춤을 춥니다.', act.relic('band'), act.gold(40)] }),
    { label: '"이 혹에서 나오지요"', desc: '60%: 보물 하나 · 40%: 부정', pick: () => chance(0.6) ? ['도깨비가 짐꾼의 혹을 떼 가고 보물을 두고 갑니다.', act.relic()] : ['"또 속을 줄 아느냐!" 혹을 하나 더 붙여 줍니다.', act.curse()] },
    { label: '한 가락 더 뽑는다', desc: '사기 +3으로 시작, 엽전 +25', pick: () => ['도깨비들이 어깨춤을 추다 엽전을 던져 줍니다.', act.morale(3), act.gold(25)] },
  ] },
  heungbu: { title: '흥부네 박', art: 'spear', text: '흥부가 제비 박을 하나 타 보라고 합니다.\n그런데 놀부네 박이 하나 섞였답니다.', choices: () => [
    { label: '큰 박을 탄다', desc: '50%: 엽전 +120 · 50%: 부정', pick: () => chance(0.5) ? ['박이 쩍 갈라지며 금은보화가 쏟아집니다.', act.gold(120)] : ['놀부네 박입니다! 도깨비가 튀어나와 골탕을 먹입니다.', act.curse()] },
    { label: '작은 박을 탄다', desc: '75%: 병력 패 · 25%: 엽전 -40', pick: () => chance(0.75) ? ['박 속에서 목수들이 줄줄이 나와 따라나섭니다.', act.recruit()] : ['빚쟁이가 튀어나와 놀부 빚을 받아 갑니다.', act.gold(-40)] },
    { label: '톱질만 거든다', desc: '엽전 +35', pick: () => ['"슬근슬근 톱질하세!" 흥부가 품삯을 후하게 줍니다.', act.gold(35)] },
  ] },
  urung: { title: '우렁 각시', art: 'jumo', text: '외딴 초가에 들르니 밥상이 차려져 있습니다.\n물독 속 우렁이가 반짝입니다.', choices: () => [
    { label: '고맙게 먹고 간다', desc: '무작위 병력 패 +1단', pick: () => ['든든히 먹은 병사들이 힘이 솟습니다.', act.train()] },
    { label: '숨어서 지켜본다', desc: '50%: 보물 하나 · 50%: [잡념]', pick: () => chance(0.5) ? ['우렁이에서 나온 각시가 웃으며 보물을 건넵니다.', act.relic()] : ['놀란 각시가 우렁이 속으로 숨어 버렸습니다.', act.doubt()] },
    { label: '우렁이를 판다', desc: '엽전 +60, 대신 부정 하나', pick: () => ['값은 잘 받았지만 뒤통수가 따갑습니다.', act.gold(60), act.curse()] },
  ] },
  seonnyeo: { title: '선녀와 나무꾼', art: 'priest', text: '연못가 소나무에 날개옷이 걸려 있습니다.\n물속에서 선녀들이 놀고 있습니다.', choices: () => [
    { label: '날개옷을 돌려준다', desc: '영웅 +1단', pick: () => ['선녀가 손을 얹자 영웅의 몸이 깃털처럼 가볍습니다.', act.hero()] },
    { label: '날개옷을 감춘다', desc: '50%: 보물 하나 · 50%: 부정', pick: () => chance(0.5) ? ['선녀가 하늘 보물을 주고 날개옷을 찾아 갑니다.', act.relic()] : ['두레박 타고 내려온 언니들에게 혼쭐이 났습니다.', act.curse()] },
  ] },
  ojak: { title: '까막까치 다리', art: 'magpie', text: '칠석날 밤, 까치들이 견우와 직녀의 다리를 놓습니다.\n일손이 모자라 머리가 다 벗겨졌답니다.', choices: () => [
    { label: '밤새 거든다', desc: '보물 하나, 대신 [잡념] 한 장', pick: () => ['새벽녘 둘이 만났습니다. 다들 하품이 멎지 않습니다.', act.relic(), act.doubt()] },
    { label: '모이를 뿌려 준다', cost: 25, desc: '엽전 25 → 패 [척후] 두 장', pick: () => { act.gold(-25); return ['배부른 까치들이 앞길을 미리 살펴 줍니다.', act.card('scout')]; } },
    { label: '구경만 한다', desc: '사기 +3으로 시작', pick: () => ['둘이 만나는 걸 보니 다들 마음이 따뜻해집니다.', act.morale(3)] },
  ] },
  tiger: { title: '은혜 갚은 호랑이', art: 'tiger', text: '호랑이가 입을 벌린 채 끙끙 앓고 있습니다.\n목에 큰 뼈가 걸린 모양입니다.', choices: () => [
    hero('hunter', { label: '명궁: 활을 내려놓는다', desc: '보물 하나, 영웅 +1단', pick: () => ['뼈를 빼 주자 범이 북쪽을 봅니다. "흰 범은 저리 갔다."', act.relic(), act.hero()] }),
    { label: '목에 손을 넣는다', desc: '70%: 보물 하나 · 30%: [잡념]', pick: () => chance(0.7) ? ['다음 날 아침, 호랑이가 무언가를 물어다 놓았습니다.', act.relic()] : ['덥석! 겨우 손을 뺐지만 떨림이 멎지 않습니다.', act.doubt()] },
    { label: '가죽을 노린다', desc: '35%: [호랑이 가죽] · 65%: 부정', pick: () => chance(0.35) ? ['앓던 범이라 쉽게 잡았습니다. 뒷맛이 씁니다.', act.relic('crest')] : ['범이 뼈를 컥 뱉고 덤빕니다! 산신이 노하셨습니다.', act.curse()] },
  ] },
  kongjwi: { title: '콩쥐의 독', art: 'jumo', text: '처녀가 밑 빠진 독에 물을 붓다 울고 있습니다.\n독을 채워야 잔치에 간답니다.', choices: () => [
    { label: '두꺼비를 찾아 준다', desc: '패 [방패 진] 두 장', pick: () => ['두꺼비가 구멍을 막자 독이 찹니다. 막는 법을 배웠습니다.', act.card('wall')] },
    { label: '독을 고쳐 준다', cost: 30, desc: '엽전 30 → 보물 [은장도]', pick: () => { act.gold(-30); return ['콩쥐가 고맙다며 품에서 은장도를 꺼내 줍니다.', act.relic('knife')]; } },
    { label: '팥쥐 엄마 편을 든다', desc: '엽전 +50, 대신 [잡념] 한 장', pick: () => ['팥쥐 엄마가 입막음 값을 줍니다. 마음이 영 무겁습니다.', act.gold(50), act.doubt()] },
  ] },
  yagwang: { title: '야광귀', art: 'yagwang', text: '설날 밤, 야광귀가 신발을 훔치러 왔습니다.\n신을 잃으면 한 해 운이 나쁘답니다.', choices: () => [
    hero('archmage', { label: '신선: 술 한 잔 따른다', desc: '보물 [도깨비 감투], 엽전 +40', pick: () => ['"그 빗자루의 손주뻘이로구나." 야광귀가 넙죽 절합니다.', act.relic('gamtu'), act.gold(40)] }),
    { label: '문간에 체를 건다', desc: '패 [허수아비] 두 장', pick: () => ['야광귀가 체 구멍을 세다 틀리고, 또 세다 날이 샙니다.', act.card('decoy')] },
    { label: '헌 신을 내놓는다', desc: '50%: 엽전 +70 · 50%: 부정', pick: () => chance(0.5) ? ['야광귀가 신값이라며 엽전을 놓고 갑니다.', act.gold(70)] : ['헌 신 대신 영웅 신을 신고 갔습니다!', act.curse()] },
  ] },
};
export function eventView(p) { const e = EVENTS[p.id] || EVENTS.ssireum; return { title: e.title, art: e.art, after: e.after, text: e.text, choices: e.choices(p).filter(Boolean) }; }
