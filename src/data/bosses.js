// 새 두목과, 두목 싸움에 쓰이는 소품들 (units.js 의 UNITS 에 합쳐진다). 싸우는 방식은 sim/bossfight.js
import { ALT_UNITS } from './bossalt.js';
export const BOSS_UNITS = {
  gumiho: { name: '구미호', role: '보스', side: 1, boss: true, n: 1, hp: 1550, atk: 30, as: 0.95, range: 0, reach: 12, spd: 86, r: 22, large: true, dodge: 0.1,
    desc: '꼬리 아홉 달린 여우', tip: '깎을 때마다 꼬리가 떨어지며 독해집니다. 푸른 원(여우불)은 피하고, 홀린 부대는 끌어 깨우고, 둔갑하면 꼬리 달린 진짜를 치세요.' },
  foxfake: { name: '여우 허깨비', role: '허깨비', side: 1, n: 1, hp: 105, atk: 9, as: 1.0, range: 0, spd: 88, r: 18, fake: true,
    desc: '구미호가 둔갑시킨 허깨비', tip: '꼬리가 없습니다. 몇 대 맞으면 흩어집니다.' },
  dueokboss: { name: '두억시니', role: '보스', side: 1, boss: true, n: 1, hp: 1900, atk: 40, as: 1.9, range: 0, reach: 16, spd: 44, r: 28, large: true, splash: 48, stunHit: { p: 0.25, t: 0.7 },
    desc: '머리를 내리찍는 우두머리 귀신', tip: '붉은 원 셋이 차례로 떨어집니다. 부대를 끌어 거의 다 피하면 비틀거리며, 그동안 받는 피해 1.5배.' },
  tigerboss: { name: '고개 호랑이', role: '보스', side: 1, boss: true, n: 1, hp: 2000, atk: 40, as: 1.05, range: 0, reach: 12, spd: 100, r: 24, large: true,
    desc: '떡 하나 주면 안 잡아먹겠다는 호랑이', tip: '붉은 원으로 후방을 덮칩니다. 피하면 빈틈을 보입니다. "떡 하나 주면…" 할 때 세게 몰아치면 물러나고, 못 하면 사기를 뺏깁니다.' },
  serpent: { name: '구렁이', role: '보스', side: 1, boss: true, n: 1, hp: 2300, atk: 38, as: 1.5, range: 0, reach: 18, spd: 40, r: 28, large: true, splash: 40,
    desc: '종소리를 두려워하는 큰 구렁이', tip: '비늘이 단단해 피해가 덜 듭니다. [종]에 부대를 놓아 세 번 울리면 크게 다칩니다. 조인 부대는 구렁이를 몰아쳐 구하세요.' },
  bell: { name: '종', role: '소품', side: 1, n: 1, hp: 60, atk: 0, as: 9, range: 0, spd: 0, r: 22, structure: true, prop: true,
    desc: '옛 절의 종', tip: '부대를 끌어다 놓으면 울립니다. 세 번이면 구렁이가 무방비가 됩니다.' },
  bulgaboss: { name: '불가사리', role: '보스', side: 1, boss: true, n: 1, hp: 2400, atk: 38, as: 1.6, range: 0, reach: 16, spd: 40, r: 28, large: true, splash: 44, iron: { cut: 0.7, fire: 1.5 },
    desc: '쇠를 먹을수록 커지는 짐승', tip: '잿빛 원에 걸리면 무기를 먹히고 불가사리가 자랍니다. 근접 부대를 빼세요. 불(불화살비·불벼락·화차·삼족오)에 타면 줄어듭니다.' },
  plague: { name: '역신', role: '보스', side: 1, boss: true, n: 1, hp: 2100, atk: 26, as: 1.4, range: 230, proj: 'dark', spd: 46, r: 22, large: true,
    desc: '역병을 옮기는 귀신', tip: '앓는 부대(초록 기운) 곁의 부대에 병이 옮으니 떼어 놓으세요. 진군의 북·함성 같은 노랫가락 패에 역신이 무릎을 꿇습니다.' },
  imugi: { name: '이무기', role: '보스', side: 1, boss: true, n: 1, hp: 2600, atk: 42, as: 1.6, range: 0, reach: 18, spd: 40, r: 30, large: true, splash: 46,
    desc: '용이 되지 못한 큰 뱀', tip: '물벼락은 한 줄을 쓸어 가니 위아래로 비키세요. 여의주가 뜨면 부대로 스무 숨 안에 깨세요. 못 깨면 용이 됩니다.' },
  pearl: { name: '여의주', role: '소품', side: 1, n: 1, hp: 420, atk: 0, as: 9, range: 0, spd: 0, r: 18, structure: true, prop: true,
    desc: '이무기를 용으로 만드는 구슬', tip: '부대를 끌어다 놓아 깨뜨리세요.' },
  reaper: { name: '저승 차사', role: '보스', side: 1, boss: true, n: 1, hp: 2300, atk: 34, as: 1.5, range: 210, proj: 'dark', spd: 50, r: 22, large: true,
    desc: '명부를 들고 온 저승의 사자', tip: '명부에 이름이 적힌 부대는 여덟 숨 뒤 크게 다칩니다. 멀리 선 [명부 든 사자]를 먼저 물리치면 이름이 지워지고 빈틈이 생깁니다.' },
  scribe: { name: '명부 든 사자', role: '소품', side: 1, n: 1, hp: 300, atk: 0, as: 9, range: 0, spd: 0, r: 14, structure: true, prop: true,
    desc: '이름을 적는 사자', tip: '물리치면 명부에 적힌 이름이 지워집니다.' },
  yeomra: { name: '염라대왕', role: '보스', side: 1, boss: true, n: 1, hp: 3400, atk: 48, as: 1.8, range: 0, reach: 20, spd: 34, r: 32, large: true, splash: 50,
    desc: '저승의 임금', tip: '세 마당으로 싸웁니다. 업경대가 서 있으면 때린 만큼 되돌아오니 먼저 깨거나 물러나세요. 이름이 적히면 [명부 든 사자]부터 물리치세요.' },
  mirror: { name: '업경대', role: '소품', side: 1, n: 1, hp: 380, atk: 0, as: 9, range: 0, spd: 0, r: 20, structure: true, prop: true,
    desc: '지은 죄를 비추는 거울', tip: '서 있으면 염라대왕을 때린 피해가 되돌아옵니다. 부대로 깨뜨리세요.' },
};
// 고개마다의 또 다른 두목과 그 소품 (data/bossalt.js)
Object.assign(BOSS_UNITS, ALT_UNITS);
