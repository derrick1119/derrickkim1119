// 고갯길에서 만나는 사건. pick() 은 [이야기, 결과...] 를 돌려준다.
import { G, act, runRnd } from '../state.js';
import { UNITS } from './units.js';

const chance = p => runRnd() < p;   // 원정의 씨앗을 따른다 (state.js 의 runRnd)
const pick = a => a[(runRnd() * a.length) | 0];
// 다음 고개에서 이어지는 사건의 표시 (state.js 의 EVENT_NEED)
const flag = k => { const r = G.run; (r.flags || (r.flags = [])).push(k); };
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
  // ── 설화와 길 위의 삶 (2단계) ──
  haedal: { title: '해님 달님', art: 'tiger', text: '"떡 하나 주면 안 잡아먹지."\n고개마다 호랑이가 같은 말을 합니다.', choices: () => [
    hero('hunter', { label: '명궁: "이번엔 네가 쫓겨라"', desc: '보물 [호랑이 가죽]', pick: () => ['화살 한 대에 호랑이가 꼬리를 말고 달아납니다.', act.relic('crest')] }),
    { label: '떡을 던져 준다', desc: '엽전 -25, 사기 +3으로 시작', pick: () => ['호랑이가 떡에 정신 팔린 사이 고개를 넘었습니다.', act.gold(-25), act.morale(3)] },
    { label: '나무에 올라 빈다', desc: '50%: 보물 · 50%: 부정', pick: () => chance(0.5) ? ['하늘에서 튼튼한 동아줄이 내려옵니다.', act.relic()] : ['썩은 동아줄이었습니다. 엉덩방아를 찧습니다.', act.curse()] },
  ] },
  bangui: { title: '방귀쟁이 며느리', art: 'jumo', text: '며느리가 참았던 방귀를 뀌자\n배나무의 배가 우수수 떨어집니다.', choices: () => [
    { label: '같이 가자고 청한다', desc: '패 [척후+] 두 장', pick: () => ['"요괴 앞에서 한 방이면 됩니다." 며느리가 웃습니다.', act.card('scout', true)] },
    { label: '떨어진 배를 줍는다', desc: '엽전 +40', pick: () => ['장에 내다 판 배가 제법 값이 나갑니다.', act.gold(40)] },
  ] },
  dokkaebibul: { title: '도깨비불', art: 'goblin', text: '골짜기에 푸른 불이 하나둘 켜집니다.\n따라가면 보물이 있다는데…', choices: () => [
    { label: '불을 따라간다', desc: '55%: 보물 · 45%: [잡념], 엽전 -20', pick: () => chance(0.55) ? ['불이 멈춘 바위 밑에 녹슨 함이 묻혀 있습니다.', act.relic()] : ['밤새 같은 자리를 맴돌았습니다.', act.doubt(), act.gold(-20)] },
    { label: '횃불을 밝혀 쫓는다', desc: '패 [횃불] 두 장', pick: () => ['불을 밝히자 도깨비불이 꺼집니다.', act.card('torch')] },
  ] },
  banjjogi: { title: '반쪽이', art: 'berserk', text: '눈도 팔도 하나뿐인 장사가 바위를 번쩍 듭니다.\n"나도 데려가 주시오!"', choices: () => [
    { label: '받아들인다', desc: '병력 패 [철퇴 장사]', pick: () => ['"반쪽이라고 얕보지 마시오!" 철퇴를 어깨에 멥니다.', act.card('u_berserk', false, 1)] },
    { label: '씨름 한 판', desc: '60%: 영웅 +1단 · 40%: 엽전 -30', pick: () => chance(0.6) ? ['간신히 이겼습니다. 영웅의 어깨가 펴집니다.', act.hero()] : ['내동댕이쳐졌습니다. 약값이 듭니다.', act.gold(-30)] },
  ] },
  gureong: { title: '구렁덩덩 신선비', art: 'serpent', text: '구렁이가 허물을 벗고 선비가 되었습니다.\n"이 허물을 태우면 나는 떠나야 하오."', choices: () => [
    { label: '허물을 지켜 준다', desc: '엽전 +30, 언젠가 보답', pick: () => { flag('gureong'); return ['"이 은혜는 꼭 갚겠소." 선비가 허물을 품에 넣습니다.', act.gold(30)]; } },
    { label: '허물을 태운다', desc: '보물 하나, 부정', pick: () => ['선비는 하늘로 떠나고, 재 속에 무언가 반짝입니다.', act.relic(), act.curse()] },
  ] },
  gureong2: { title: '신선비의 보답', art: 'serpent', text: '허물을 지켜 준 선비가 구름을 타고 내려옵니다.\n"약속을 지키러 왔소."', choices: () => [
    { label: '보답을 받는다', desc: '보물 하나, 부대 한도 +1', pick: () => ['선비가 하늘의 병서와 함께 길을 열어 줍니다.', act.relic(), act.cap(1)] },
  ] },
  jeoseung: { title: '저승사자의 실수', art: 'reaper', text: '저승사자가 명부를 뒤적입니다.\n"이상하다… 데려갈 사람이 여기 있는데."', choices: () => [
    hero('bishop', { label: '고승: 명부를 고쳐 준다', desc: '부정 씻김, 영웅 +1단', pick: () => { const c = act.cleanse(); return ['"그 이름은 이미 극락에 올랐소." 사자가 머리를 긁습니다.', act.hero(), ...(c ? [c] : [])]; } }),
    { label: '엽전으로 달랜다', desc: '엽전 -50, 보물 하나', pick: () => ['사자가 엽전을 세더니 낡은 노리개를 떨구고 갑니다.', act.gold(-50), act.relic()] },
    { label: '이름을 바꿔 적는다', desc: '50%: 엽전 +80 · 50%: 부정', pick: () => chance(0.5) ? ['사자는 엉뚱한 이를 찾아 떠났습니다. 품에서 엽전이 떨어집니다.', act.gold(80)] : ['들켰습니다! 사자가 이름 위에 붉은 점을 찍습니다.', act.curse()] },
  ] },
  dangsan: { title: '당산나무 제사', art: 'treant', text: '마을 어귀 당산나무에 금줄이 걸렸습니다.\n제사를 거들면 복을 받는답니다.', choices: () => [
    { label: '제사를 거든다', desc: '엽전 -30, 보물 하나', pick: () => ['오색 천이 바람에 흩날리고, 무당이 작은 보물을 건넵니다.', act.gold(-30), act.relic()] },
    { label: '마른 가지를 얻는다', desc: '패 [목책 세우기] 두 장', pick: () => ['당산나무의 마른 가지로 튼튼한 말뚝을 깎았습니다.', act.card('stakes')] },
  ] },
  talchum: { title: '탈춤 놀이판', art: 'shaman', text: '장터 마당에 탈꾼들이 판을 벌였습니다.\n양반탈이 거드름을 피우자 사람들이 깔깔 웃습니다.', choices: () => [
    hero('sangsoe', { label: '상쇠: 장단을 맞춘다', desc: '보물 [풍물패], 패 [함성] 두 장', pick: () => ['꽹과리 소리에 놀이판이 뒤집어집니다.', act.relic('band'), act.card('cry')] }),
    { label: '구경한다', desc: '사기 +3으로 시작', pick: () => ['한바탕 웃고 나니 다리에 힘이 붙습니다.', act.morale(3)] },
    { label: '탈꾼을 모은다', desc: '엽전 -40, 패 [함성+] 두 장', pick: () => ['탈꾼들이 앞장서서 요괴를 조롱하기로 했습니다.', act.gold(-40), act.card('cry', true)] },
  ] },
  dure: { title: '두레패', art: 'spear', text: '논두렁에서 두레패가 풍물을 치며 일합니다.\n"요괴 때문에 모내기도 못 하오."', choices: () => [
    { label: '함께 일어서자', desc: '패 [의병 봉기] 두 장', pick: () => ['농기를 앞세운 두레패가 낫과 죽창을 듭니다.', act.card('uibyeong')] },
    { label: '모내기를 돕는다', desc: '엽전 +35, 사기 +2로 시작', pick: () => ['품삯 대신 주먹밥과 엽전을 얻었습니다.', act.gold(35), act.morale(2)] },
  ] },
  sanjeok: { title: '산적 떼', art: 'berserk', text: '"이 고개를 넘으려면 통행세를 내라!"\n산적들이 길을 막았습니다.', choices: () => [
    hero('chief', { label: '두령: "내 얼굴 모르나?"', desc: '병력 패 [철퇴 장사] 두 장', pick: () => ['"형님!" 산적들이 엎드려 절하고 따라나섭니다.', act.card('u_berserk', false, 2)] }),
    { label: '통행세를 낸다', desc: '엽전 -40', pick: () => ['산적들이 순순히 길을 비킵니다.', act.gold(-40)] },
    { label: '설득한다', desc: '60%: 언젠가 도움 · 40%: 엽전 -60', pick: () => { if (chance(0.6)) { flag('sanjeok'); return ['"요괴를 친다고? 그럼 우리도 한몫 끼지." 두목이 웃습니다.']; } return ['말이 통하지 않았습니다. 짐을 털렸습니다.', act.gold(-60)]; } },
  ] },
  sanjeok2: { title: '산적 두목의 의리', art: 'berserk', text: '전에 만난 산적 두목이 무리를 이끌고 나타납니다.\n"약속대로 한몫 끼러 왔소!"', choices: () => [
    { label: '반갑게 맞는다', desc: '패 [격문] · 병력 패 [철퇴 장사]', pick: () => ['산적들이 의병의 깃발 아래 섭니다.', act.card('gyeokmun', false, 1), act.card('u_berserk', false, 1)] },
  ] },
  child: { title: '길 잃은 아이', art: 'magpie', text: '덤불 속에서 아이가 울고 있습니다.\n"엄마가 고개 너머 장에 갔어요."', choices: () => [
    { label: '데려다준다', desc: '이번엔 아무것도 · 언젠가 보답', pick: () => { flag('child'); return ['아이를 업고 한참을 걸어 장터 어귀에 내려 주었습니다.']; } },
    { label: '주먹밥을 쥐여 준다', desc: '엽전 -10, 사기 +2로 시작', pick: () => ['아이가 웃자 군사들 얼굴도 풀립니다.', act.gold(-10), act.morale(2)] },
  ] },
  child2: { title: '아이의 아버지', art: 'shield', text: '전에 데려다준 아이의 아버지가 찾아왔습니다.\n관아의 무기고지기랍니다.', choices: () => [
    { label: '고마움을 받는다', desc: '무기 하나, 엽전 +50', pick: () => ['"무기고 열쇠는 내가 쥐고 있소." 좋은 무기를 내줍니다.', act.weapon(), act.gold(50)] },
  ] },
  seowon: { title: '서원의 유생들', art: 'necro', text: '서원의 유생들이 병법을 두고 다툽니다.\n"선비님 생각은 어떻소?"', choices: () => [
    { label: '병서를 빌린다', desc: '전술 패 하나 강화(+)', pick: () => ['밤새 병서를 읽고 전술 하나를 가다듬었습니다.', act.cardUp()] },
    { label: '논쟁에 끼어든다', desc: '50%: 진법서 · 50%: [잡념]', pick: () => chance(0.5) ? ['유생들이 감복해 귀한 진법서를 건넵니다.', act.relic(pick(['f_hakik', 'f_eorin', 'f_jangsa', 'f_bangwon']))] : ['말꼬리를 잡혀 밤새 시달렸습니다.', act.doubt()] },
  ] },
  trap: { title: '사냥꾼의 덫', art: 'hunter', text: '덫에 걸린 사냥꾼이 끙끙거립니다.\n"좀 꺼내 주시오!"', choices: () => [
    { label: '구해 준다', desc: '무기 하나', pick: () => ['사냥꾼이 아끼던 활을 내어 줍니다.', act.weapon(pick(['crossbow', 'pyeonjeon', 'firebow']))] },
    { label: '덫을 챙긴다', desc: '패 [마름쇠] 두 장', pick: () => ['사냥꾼을 꺼내 주고 덫은 쓸 데가 있어 챙겼습니다.', act.card('caltrop')] },
  ] },
  dokkaebisijang: { title: '도깨비 시장', art: 'goblin', text: '자정에만 서는 도깨비 시장입니다.\n"무엇이든 바꿔 드립니다요."', choices: () => [
    { label: '부정을 판다', desc: '부정 씻김, 엽전 +30', pick: () => { const c = act.cleanse(); return c ? ['도깨비가 부정을 덥석 사 갑니다. 좋아하는 눈치입니다.', c, act.gold(30)] : ['팔 부정이 없습니다. 구경만 하고 나옵니다.', act.gold(10)]; } },
    { label: '엽전을 걸고 내기', desc: '엽전 -40 → 50%: +120', pick: () => { act.gold(-40); return chance(0.5) ? ['이겼습니다! 도깨비가 혀를 찹니다.', act.gold(120)] : ['도깨비가 이겼습니다. 엽전 꾸러미가 가벼워집니다.', '엽전 -40']; } },
    { label: '패를 바꾼다', desc: '[잡념] 없애고 패 한 종류 두 장', pick: () => { const c = act.clearDoubt(); return ['도깨비가 쓸모없는 생각을 사 가고 새 패를 줍니다.', ...(c ? [c] : []), act.card()]; } },
  ] },
  flood: { title: '불어난 개울', art: 'spear', text: '밤새 비가 와 개울이 넘쳤습니다.\n돌아가면 하루가 걸립니다.', choices: () => [
    { label: '다리를 놓는다', desc: '패 [목책 세우기+] 두 장', pick: () => ['통나무를 엮어 다리를 놓는 사이 말뚝 다루는 솜씨가 늘었습니다.', act.card('stakes', true)] },
    { label: '건너 버린다', desc: '60%: 사기 +3으로 시작 · 40%: [잡념]', pick: () => chance(0.6) ? ['다들 흠뻑 젖었지만 기세가 올랐습니다.', act.morale(3)] : ['몇몇이 떠내려갈 뻔했습니다. 다들 겁을 먹었습니다.', act.doubt()] },
  ] },
  armory: { title: '버려진 무기고', art: 'rshield', text: '불탄 관아 뒤에 무기고가 덩그러니 남았습니다.\n녹슨 자물쇠가 걸려 있습니다.', choices: () => [
    { label: '자물쇠를 부순다', desc: '무기 하나', pick: () => ['먼지 속에서 쓸 만한 무기를 찾았습니다.', act.weapon()] },
    { label: '화약을 챙긴다', desc: '패 [비격진천뢰] 한 장', pick: () => ['젖지 않은 화약 통이 하나 남아 있습니다.', act.card('jincheon', false, 1)] },
  ] },
  sansa: { title: '산사의 노승', art: 'bishop', text: '깊은 산 절에서 노승이 차를 내옵니다.\n"요괴도 원래는 길 잃은 마음이지요."', choices: () => [
    hero('archmage', { label: '신선: 바둑 한 판', desc: '보물 하나, 패 강화(+)', pick: () => ['한 수 차이로 졌습니다. 노승이 껄껄 웃으며 선물을 줍니다.', act.relic(), act.cardUp()] }),
    { label: '불공을 드린다', desc: '엽전 -30, 부정 씻김', pick: () => { const c = act.cleanse() || act.clearDoubt(); return ['향 냄새 속에서 마음이 가벼워졌습니다.', act.gold(-30), ...(c ? [c] : ['씻을 부정이 없어 복을 빌었습니다', act.morale(2)])]; } },
    { label: '약초를 얻는다', desc: '패 [약손+] 두 장', pick: () => ['노승이 산에서 캔 약초를 한 보따리 싸 줍니다.', act.card('heal', true)] },
  ] },
  sotdae: { title: '솟대 마을', art: 'magpie', text: '마을 어귀에 솟대가 줄지어 섰습니다.\n장대 끝 오리에게 소원을 빈답니다.', choices: () => [
    { label: '군대를 위해 빈다', desc: '무작위 병력 패 +1단 둘', pick: () => ['오리가 하늘로 소원을 물어 갑니다.', act.train(), act.train()] },
    { label: '영웅을 위해 빈다', desc: '영웅 +1단', pick: () => ['영웅의 꿈에 솟대 오리가 날아듭니다.', act.hero()] },
  ] },
  pansori: { title: '소리꾼', art: 'priest', text: '정자 아래 소리꾼이 북장단에 맞춰 판을 엽니다.\n"얼씨구!" 추임새가 터집니다.', choices: () => [
    { label: '한 대목 듣는다', desc: '사기 +4로 시작', pick: () => ['적벽가 한 대목에 군사들 가슴이 뜨거워집니다.', act.morale(4)] },
    { label: '고수를 데려간다', desc: '엽전 -45, 패 [진군의 북+] 두 장', pick: () => ['북채를 쥔 고수가 앞장섭니다.', act.gold(-45), act.card('horn', true)] },
  ] },
  bongsu: { title: '봉수대', art: 'xbow', text: '봉수대 군사가 연기를 올리지 못해 쩔쩔맵니다.\n요괴가 장작을 다 적셔 놓았답니다.', choices: () => [
    { label: '봉화를 올려 준다', desc: '보물 하나', pick: () => ['연기가 다섯 줄로 오르자 군사가 고마워 무언가 건넵니다.', act.relic()] },
    { label: '신호를 배운다', desc: '패 [일제 사격] 두 장', pick: () => ['연기와 깃발로 화살을 한꺼번에 쏘는 법을 배웠습니다.', act.card('salvo')] },
  ] },
  madang: { title: '마상재 놀이', art: 'knight', text: '말 위에서 재주를 넘는 마상재 패가 지나갑니다.\n"우리도 요괴 한번 쳐 볼까?"', choices: () => [
    { label: '함께 가자고 한다', desc: '병력 패 [기마 무사]', pick: () => ['말발굽 소리가 고개를 울립니다.', act.card('u_knight', false, 1)] },
    { label: '재주를 배운다', desc: '패 [마상재] 두 장', pick: () => ['말 위에서 몸을 낮추는 법을 익혔습니다.', act.card('masangjae')] },
  ] },
  gutdang: { title: '무당집', art: 'shaman', text: '대나무에 오색 천을 단 무당집입니다.\n"부정 탄 기운이 보이는구먼."', choices: () => [
    { label: '굿을 청한다', desc: '엽전 -40, 부정 하나 씻김 · 패 [대동굿]', pick: () => { const c = act.cleanse() || act.clearDoubt(); return ['방울 소리와 함께 무당이 칼춤을 춥니다.', act.gold(-40), ...(c ? [c] : []), act.card('daedong', false, 1)]; } },
    { label: '부적을 산다', desc: '엽전 -30, 패 [불 부적] 두 장', pick: () => ['무당이 붉은 글씨로 부적을 써 줍니다.', act.gold(-30), act.card('bujeok')] },
  ] },
};
// ───── 영물의 인연: 인형극이 끝나면 영물을 어떻게 맞이할지 고른다 (어느 쪽이든 영물 패가 덱에 들어온다) ─────
// first = 처음 인연을 맺을 때 (인형극 뒤), 아니면 다음 원정에서 길에서 다시 만날 때
const BEAST_EV = {
  magpie: { title: '까치의 인연', art: 'magpie', first: '까치 떼가 군기 둘레를 맴돕니다. 함께 가려는 모양입니다.', again: '까치 떼가 군기 위를 맴돕니다. 지난 원정의 인연을 기억하나 봅니다.',
    gift: ['곡식을 한 줌 뿌려 준다', 20, '배불리 먹은 까치들이 더 힘차게 납니다.'], plain: ['손짓해 부른다', '까치들이 깍깍 울며 깃대에 내려앉습니다.'] },
  sapsal: { title: '삽살개의 인연', art: 'sapsal', first: '삽살개가 꼬리를 흔들며 수레 곁을 맴돕니다.', again: '북슬북슬한 삽살개가 길가에 앉아 기다리고 있습니다. 낯익은 눈빛입니다.',
    gift: ['고깃국을 나눠 준다', 25, '국 한 사발을 비운 삽살개가 우렁차게 짖습니다.'], plain: ['쓰다듬어 준다', '삽살개가 손을 핥고 앞장섭니다.'] },
  samjoko: { title: '삼족오의 인연', art: 'samjoko', first: '삼족오가 군기 꼭대기에 앉아 날개를 고릅니다.', again: '어둠 속에서 작은 해처럼 빛나는 새가 내려옵니다. 삼족오입니다.',
    gift: ['등잔 기름을 바친다', 25, '기름을 마신 삼족오의 깃이 환하게 타오릅니다.'], plain: ['함께 가자고 한다', '삼족오가 길 앞으로 불씨를 떨굽니다.'] },
  tiger: { title: '산군의 인연', art: 'tiger', first: '산군이 길 앞에 엎드려 기다립니다.', again: '산마루에서 산군이 내려옵니다. “또 왔구나.”',
    gift: ['고기를 바친다', 30, '산군이 단숨에 먹고 크게 포효합니다.'], plain: ['예를 갖춰 절한다', '산군이 고개를 끄덕이고 앞장섭니다.'] },
  haetae: { title: '해태의 인연', art: 'haetae', first: '해태가 서낭당 앞에서 군대를 지켜봅니다.', again: '길목의 돌짐승이 눈을 뜹니다. 해태입니다.',
    gift: ['정화수를 떠 바친다', 30, '물을 마신 해태의 뿔이 맑게 빛납니다.'], plain: ['고개 숙여 맞이한다', '해태가 묵묵히 곁에 섭니다.'] },
};
export function beastEventView(id, first) {
  const e = BEAST_EV[id] || BEAST_EV.magpie, [gl, cost, gs] = e.gift, [pl, ps] = e.plain;
  return { title: e.title, art: e.art, text: first ? e.first : e.again, col: '#2f6f5c', choices: [
    { label: gl, cost, desc: `엽전 ${cost} → 영물 패 +1단`, pick: () => { act.gold(-cost); return [gs, act.beast(id, true)]; } },
    { label: pl, desc: '영물 패를 얻는다', pick: () => [ps, act.beast(id, false)] },
  ] };
}
export function eventView(p) { const e = EVENTS[p.id] || EVENTS.ssireum; return { title: e.title, art: e.art, after: e.after, text: e.text, choices: e.choices(p).filter(Boolean) }; }
