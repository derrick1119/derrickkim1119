/**
 * ↔️ 크기 바꾸기 (38→39라운드) — 크기 바꾸기 × 가리키기 × 도감.
 * 손짓은 '톡 → 톡' 하나: 무엇이든(동물·과일·바위·우리 문·쥐구멍·사육사·모자·연못·나뭇가지…) 하나를 톡 하면 반짝 들리고,
 *   다른 하나를 톡 하면 두 물건 사이로 빛줄기가 오가며 '뿅!' — 두 크기가 서로 바뀐다(개미만 한 코끼리, 집채만 한 생쥐).
 * 크기를 따라 힘·무게·속도가 바뀐다(결정적 1/60 시뮬): 작으면 구멍·굴로 쏙, 크면 무거운 문을 쾅 밀고 연못을 첨벙첨벙 건넌다.
 *   사육사는 자기보다 작은 동물을 잡고, 더 큰 동물을 보면 '으악!' 도망간다. 커진 사과·수박은 비탈을 데굴데굴 굴러
 *   사육사를 쓰러뜨리고 연못에 풍덩 징검다리가 되고(한 번에 여러 일), 커진 나뭇가지는 통나무 다리, 커진 모자는 사육사를 폭 덮는다.
 * 39라운드: 동물마다 판 풀이의 열쇠가 되는 특기 — 생쥐는 커져도 쥐구멍 쏙 · 돼지는 구멍을 킁킁 넓힘 · 토끼는 문을 폴짝 ·
 *   코끼리는 커지면 연못 물을 쭉 · 기린은 높은 가지의 열쇠 · 하마는 첨벙 물벼락 · 판다는 미끄럼틀 데굴데굴 볼링 ·
 *   거북은 등껍질에 쏙(사육사가 돌인 줄) · 펭귄은 헤엄 · 사자는 어흥. 판 대부분이 두세 번 바꿔야 풀리고(맡겼다 돌려받기·이어 바꾸기),
 *   첫눈에 맞아 보이는 바꾸기가 다음 수를 막는 함정이 있다. 막히면 전구 단추(또는 H)가 '지금 상태에서 다음 한 수'를 보여 준다.
 * 이야기: 아기 동물들이 엄마를 찾아 우리를 나와(1장) → 숲길을 지나(2장) → 정문 밖 집으로(3장). 판마다 출구 밖에서 엄마가 기다리고,
 *   장이 끝나면 가족이 다시 만나는 장면 + 가족 사진첩 한 쪽 + 다음 장 미리 보기.
 * 실패: 사육사에게 잡히거나, '뿅'을 다 쓰고 막히면 하트 -1(그 판 다시). 하트 셋을 다 잃으면 끝.
 *   아무것도 안 누르면 동물은 막힌 곳에서 낑낑댈 뿐 — 잃는 것 없음(처음 놓인 판은 늘 안전).
 */
import { mulberry32 } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
const TK = 1 / 60;
/** 크기 1~5의 반지름(가로 폭 단위): 콩알 · 작음 · 보통 · 큼 · 집채 */
const RZ = [0, 0.048, 0.071, 0.102, 0.14, 0.19];
const SIZE_WORD = ['', '콩알만 한', '조그만', '보통', '커다란', '집채만 한'];

// ───────────────────────────── 물건 ─────────────────────────────
type Cls = 'animal' | 'hole' | 'gate' | 'keeper' | 'hat' | 'pond' | 'log' | 'iron' | 'roller' | 'prop' | 'key';
type Kind =
  | 'elephant' | 'rabbit' | 'mouse' | 'piglet' | 'hippo' | 'giraffe' | 'turtle' | 'panda' | 'penguin' | 'lion' | 'zebra' | 'koala'
  | 'hole' | 'gate' | 'keeper' | 'hat' | 'pond' | 'log' | 'iron' | 'key'
  | 'apple' | 'melon' | 'boulder'
  | 'acorn' | 'pumpkin' | 'bucket' | 'hay' | 'coconut' | 'rock' | 'puddle' | 'popcorn' | 'statue' | 'icecream' | 'drum';
/** skill: 특기(도감·시작 카드) · tip: 특기를 한 마디로(시작 카드 아래 줄) · mom: 엄마가 부르는 말 */
interface KD { name: string; c: Cls; swim?: boolean; tall?: number; roar?: boolean; say?: string; skill?: string; tip?: string }
const K: Record<Kind, KD> = {
  elephant: { name: '코끼리', c: 'animal', say: '뿌우!', skill: '커다래지면 연못 물을 쭉 마셔요', tip: '연못이 마르면 뒤 친구도 건너요' },
  rabbit: { name: '토끼', c: 'animal', say: '깡총!', skill: '문을 폴짝 뛰어넘어요', tip: '문은 닫힌 채로 남아요' },
  mouse: { name: '생쥐', c: 'animal', say: '찍!', skill: '쥐구멍은 내 집! 커져도 쏙', tip: '큰 크기를 들고 구멍을 지나요' },
  piglet: { name: '돼지', c: 'animal', say: '꿀꿀!', skill: '구멍 앞에서 킁킁 파서 한 칸 넓혀요', tip: '구멍마다 한 번만' },
  hippo: { name: '하마', c: 'animal', swim: true, say: '하암~', skill: '헤엄쳐요 · 커다래서 첨벙! 하면 물벼락', tip: '연못 옆 사육사가 꽈당' },
  giraffe: { name: '기린', c: 'animal', tall: 2, say: '음메?', skill: '목이 길어 높은 가지의 열쇠를 따요', tip: '대신 낮은 굴에선 목이 걸려요' },
  turtle: { name: '거북', c: 'animal', swim: true, say: '느릿~', skill: '등껍질에 쏙 — 사육사가 돌인 줄 알아요', tip: '사육사 앞을 그냥 지나가요' },
  panda: { name: '판다', c: 'animal', say: '냠냠', skill: '미끄럼틀에서 데굴데굴 굴러요', tip: '아래층 사육사를 볼링처럼 꽈당' },
  penguin: { name: '펭귄', c: 'animal', swim: true, say: '꽥!', skill: '작아도 헤엄쳐서 연못을 건너요', tip: '물속에선 누구보다 빨라요' },
  lion: { name: '사자', c: 'animal', roar: true, say: '어흥!', skill: '사육사보다 커지면 어흥!', tip: '멀리 있는 사육사도 모두 도망' },
  zebra: { name: '얼룩말', c: 'animal', say: '히힝!' },
  koala: { name: '코알라', c: 'animal', say: '졸려~' },
  hole: { name: '쥐구멍', c: 'hole' },
  gate: { name: '우리 문', c: 'gate' },
  keeper: { name: '사육사', c: 'keeper' },
  hat: { name: '사육사 모자', c: 'hat' },
  pond: { name: '연못', c: 'pond' },
  log: { name: '나뭇가지', c: 'log' },
  iron: { name: '쇠창살 정문', c: 'iron' },
  key: { name: '열쇠', c: 'key' },
  apple: { name: '사과', c: 'roller' },
  melon: { name: '수박', c: 'roller' },
  boulder: { name: '둥근 바위', c: 'roller' },
  acorn: { name: '도토리', c: 'prop' },
  pumpkin: { name: '호박', c: 'prop' },
  bucket: { name: '양동이', c: 'prop' },
  hay: { name: '건초', c: 'prop' },
  coconut: { name: '코코넛', c: 'prop' },
  rock: { name: '바위', c: 'prop' },
  puddle: { name: '물웅덩이', c: 'prop' },
  popcorn: { name: '팝콘', c: 'prop' },
  statue: { name: '꽃 화분', c: 'prop' },
  icecream: { name: '아이스크림', c: 'prop' },
  drum: { name: '북', c: 'prop' },
};
/** 장마다 구멍의 생김새: 벽돌 쥐구멍 · 바위 굴 · 개찰구 */
const HOLE_NAME = ['쥐구멍', '바위 굴', '개찰구'];
/** 가족 사진첩에 오르는 동물 (판을 깨면 그 판에서 탈출한 동물이 채워진다) — 처음 나오는 차례 */
const DEX: Kind[] = ['elephant', 'piglet', 'mouse', 'rabbit', 'giraffe', 'hippo', 'panda', 'turtle', 'penguin', 'lion'];
/** 기린만 닿는 높은 가지(키 칸) */
const KEY_H = 6;

// ───────────────────────────── 판 ─────────────────────────────
/** 옆에서 본 두 층 산책로 — 위층은 왼쪽 우리에서 오른쪽으로, 미끄럼틀로 슝 내려와 아래층은 왼쪽 출구로. y는 가로 폭 단위 */
const GY1 = 0.64, GY2 = 1.2;
type P2 = [number, number];
interface TD { k: Kind; z: number; x: number; y: number; walk?: boolean; trk?: P2[]; ref?: number }
/** 소품(길 밖 아무 데나) */
const T = (k: Kind, z: number, x: number, y: number, o: Partial<TD> = {}): TD => ({ k, z, x, y, ...o });
/** 길 위의 장애물 (층 1 = 위, 2 = 아래) */
const O = (k: Kind, z: number, row: number, x: number, o: Partial<TD> = {}): TD => ({ k, z, x, y: row === 1 ? GY1 : GY2, ...o });
/** 탈출할 동물 (앞에 선 것부터) */
const W = (k: Kind, z: number): TD => ({ k, z, x: 0, y: GY1, walk: true });
/** 뒤 언덕 · 가운데 잔디(두 층 사이) 높이 */
const BACK = 0.55, MID = 1.03;
interface StageDef {
  /** news: 새것이 '무엇을 하는지'(답은 말하지 않는다) · hint: 다시 할 때 띠에 뜨는 생각거리(답 아님) */
  name: string; ch: number; news: string; hint: string; par: number; things: TD[];
  /** NEW 스포트라이트를 비출 물건 번호 */
  spot?: number;
  /** 1판: 처음부터 반짝 골라져 있는 물건(첫 톡 한 번에 '뿅') */
  pre?: number;
  /** 1~3판 배우기: 시작 카드가 답을 말해도 된다(손가락 안내) */
  teach?: [number, number];
}
const PATH: P2[] = [[-0.1, GY1], [0.88, GY1], [0.88, GY2], [-0.14, GY2]];
/** 미끄럼틀 구간(길 위 거리) */
const SLIDE: [number, number] = [0.98, 1.54];
export const CHAPTERS = ['아기 동물 마을', '큰 동물 숲', '정문 광장'];
/** 장 시작 이야기(누가 왜 갇혔나 · 어디로 가나) */
export const STORY: { title: string; a: string; b: string }[] = [
  { title: '1장 · 아기 동물 마을', a: '아기 동물들이 엄마와 떨어져 우리에 갇혔어요!', b: '크기를 바꿔 우리를 나가 엄마를 만나요' },
  { title: '2장 · 큰 동물 숲', a: '엄마들은 숲 너머 초원에 모여 있대요', b: '덩치 큰 친구들과 숲길을 지나요' },
  { title: '3장 · 정문 광장', a: '정문만 지나면 진짜 집이에요!', b: '배운 걸 모두 써서 다 같이 나가요' },
];
const AP = (z: number) => T('apple', z, 0.24, 0.97, { trk: [[0.24, 0.97], [0.29, GY2], [0.7, GY2]] });
const MEL = (z: number) => T('melon', z, 0.76, 0.96, { trk: [[0.76, 0.96], [0.62, GY2]] });

export const STAGES: StageDef[] = [
  // ── 1장 아기 동물 마을: 배우기(1~3판 par 1) → 맡겼다 돌려받기 ──
  {
    name: '쥐구멍', ch: 0, news: '', hint: '반짝이는 코끼리 — 아무거나 톡!', par: 1, pre: 0,
    things: [W('elephant', 4), O('hole', 1, 1, 0.56), T('mouse', 1, 0.42, MID), T('acorn', 1, 0.76, BACK)],
  },
  {
    name: '무거운 문', ch: 0, news: '우리 문 — 크면 힘이 세져서 쾅 밀어 열어요', hint: '돼지는 문보다 커야 해요', par: 1, spot: 1, teach: [0, 2],
    things: [W('piglet', 2), O('gate', 4, 1, 0.56), T('pumpkin', 4, 0.36, MID), T('acorn', 1, 0.78, BACK), T('bucket', 2, 0.68, MID)],
  },
  {
    name: '생쥐의 비밀', ch: 0, news: '생쥐 — 쥐구멍은 내 집! 아무리 커져도 쏙 지나가요', hint: '동물끼리도 크기를 바꿀 수 있어요', par: 1, spot: 0,
    things: [W('mouse', 1), W('elephant', 4), O('hole', 1, 1, 0.52), O('gate', 4, 2, 0.5), T('acorn', 1, 0.78, BACK), T('hay', 2, 0.3, MID)],
  },
  {
    name: '사육사 아저씨', ch: 0, news: '사육사 — 자기보다 작은 동물은 잡고, 큰 동물을 보면 도망가요', hint: '돼지가 사육사 앞에 설 때 몇 크기일까요?', par: 2, spot: 3,
    things: [W('piglet', 4), O('hole', 2, 1, 0.5), O('gate', 3, 2, 0.65), O('keeper', 3, 2, 0.35), T('acorn', 1, 0.4, MID), T('bucket', 2, 0.78, BACK)],
  },
  {
    name: '폴짝 토끼', ch: 0, news: '토끼 — 문을 폴짝 뛰어넘어요 (문은 닫힌 채로 남아요)', hint: '토끼가 작아지면 그다음엔 누구를 만나죠?', par: 2, spot: 0,
    things: [W('rabbit', 4), W('elephant', 1), O('gate', 4, 1, 0.5), O('hole', 2, 2, 0.6), O('keeper', 3, 2, 0.3), T('acorn', 2, 0.3, MID), T('bucket', 3, 0.78, BACK)],
  },
  {
    name: '데굴데굴 사과', ch: 0, news: '사과 — 커지면 비탈을 데굴데굴, 길 위의 것을 차례로 쾅!', hint: '사과가 사육사보다 작으면 툭 멈춰요', par: 2, spot: 5,
    things: [W('mouse', 1), W('piglet', 3), O('hole', 1, 1, 0.5), O('gate', 3, 2, 0.68), O('keeper', 4, 2, 0.42), AP(1), T('acorn', 2, 0.3, MID)],
  },
  // ── 2장 큰 동물 숲: 동물 특기가 열쇠 ──
  {
    name: '목이 긴 기린', ch: 1, news: '연못 — 키가 연못보다 커야 첨벙 건너요 · 기린은 목만큼 키가 둘 더 커요', hint: '기린의 키 = 크기 + 2', par: 2, spot: 2,
    things: [W('giraffe', 3), O('hole', 3, 1, 0.5), O('pond', 3, 2, 0.55), T('coconut', 1, 0.3, MID), T('rock', 2, 0.78, BACK)],
  },
  {
    name: '코끼리 물 마시기', ch: 1, news: '코끼리 — 연못만큼 커지면 물을 쭉! 마른 연못은 누구나 건너요', hint: '생쥐는 쥐구멍을 큰 채로도 지나요', par: 2, spot: 0,
    things: [W('elephant', 4), W('mouse', 1), O('hole', 2, 1, 0.5), O('pond', 3, 2, 0.6), O('keeper', 3, 2, 0.3), T('coconut', 1, 0.3, MID), T('rock', 2, 0.78, BACK)],
  },
  {
    name: '하마 첨벙', ch: 1, news: '하마 — 헤엄쳐요. 커다란 하마가 첨벙! 하면 물벼락에 옆 사육사가 꽈당', hint: '하마가 연못에 들어갈 때 몇 크기일까요?', par: 2, spot: 0,
    things: [W('hippo', 5), O('hole', 2, 1, 0.5), O('gate', 3, 2, 0.78), O('pond', 3, 2, 0.52), O('keeper', 4, 2, 0.24), T('coconut', 1, 0.3, MID), T('rock', 2, 0.72, BACK)],
  },
  {
    name: '판다 볼링', ch: 1, news: '판다 — 미끄럼틀에서 데굴데굴! 아래 사육사를 볼링처럼 꽈당 (크기 상관없이)', hint: '굴러 내려온 판다는 무섭지 않아요', par: 2, spot: 0,
    things: [W('panda', 5), O('hole', 2, 1, 0.5), O('keeper', 4, 2, 0.7), O('gate', 3, 2, 0.35), T('rock', 2, 0.78, BACK)],
  },
  {
    name: '높은 가지 열쇠', ch: 1, news: '열쇠 — 커다란 기린만 닿아요. 열쇠를 따면 쇠창살 정문이 철컥!', hint: '열쇠 밑을 지날 때 기린은 몇 크기일까요?', par: 2, spot: 2,
    things: [W('giraffe', 2), O('gate', 3, 1, 0.38), T('key', 0, 0.55, GY1), O('iron', 0, 2, 0.4, { ref: 2 }), O('hole', 3, 1, 0.8), T('coconut', 1, 0.3, MID), T('rock', 4, 0.75, BACK)],
  },
  // ── 3장 정문 광장: 배운 것 섞기 ──
  {
    name: '거북 등껍질', ch: 2, news: '거북 — 등껍질에 쏙! 사육사가 돌인 줄 알고 그냥 보내요', hint: '거북은 괜찮지만 토끼는요?', par: 3, spot: 0,
    things: [W('turtle', 4), W('rabbit', 1), O('hole', 2, 1, 0.5), O('keeper', 3, 2, 0.7), O('gate', 3, 2, 0.35), T('popcorn', 1, 0.3, MID), T('icecream', 2, 0.78, BACK)],
  },
  {
    name: '사육사 모자', ch: 2, news: '모자 — 사육사만큼 커지면 폭! 사육사 눈을 가려요', hint: '코끼리는 끝에 아주 작아야 해요', par: 2, spot: 3,
    things: [W('elephant', 1), O('gate', 2, 1, 0.55), O('keeper', 3, 2, 0.68), T('hat', 1, 0.68, GY2, { ref: 2 }), O('hole', 1, 2, 0.35), T('statue', 3, 0.78, BACK), T('popcorn', 2, 0.3, MID)],
  },
  {
    name: '어흥 사자', ch: 2, news: '사자 — 사육사보다 커지면 어흥! 멀리 있는 사육사도 모두 도망', hint: '사자가 작아진 뒤엔 어흥을 못 해요', par: 3, spot: 0,
    things: [W('lion', 3), W('piglet', 1), O('hole', 1, 1, 0.5), O('keeper', 4, 2, 0.72), O('pond', 3, 2, 0.5), O('keeper', 3, 2, 0.28), T('statue', 5, 0.8, BACK), T('popcorn', 1, 0.3, MID)],
  },
  {
    name: '펭귄과 수박', ch: 2, news: '펭귄 — 작아도 헤엄쳐서 연못을 건너요 · 수박도 사과처럼 굴러요', hint: '펭귄이 사육사 앞에 설 때 몇 크기일까요?', par: 2, spot: 0,
    things: [W('penguin', 4), W('mouse', 1), O('hole', 2, 1, 0.5), O('pond', 4, 2, 0.62), O('keeper', 3, 2, 0.3), MEL(1), T('popcorn', 2, 0.3, MID)],
  },
  {
    name: '대탈출', ch: 2, news: '', hint: '큰 크기를 차례로 넘겨 줘요 — 누구에게 먼저?', par: 3,
    things: [W('giraffe', 2), W('rabbit', 1), O('gate', 3, 1, 0.38), T('key', 0, 0.56, GY1), O('hole', 3, 1, 0.8), O('keeper', 4, 2, 0.7), O('pond', 2, 2, 0.47), O('iron', 0, 2, 0.24, { ref: 3 }), T('lion', 1, 0.45, MID), T('statue', 5, 0.2, BACK)],
  },
];
export const STAGE_COUNT = STAGES.length;
const SWAP_T = 9, RESULT_T = 280, FAIL_T = 120, ALBUM_T = 340, CLEAR_PTS = 100, STAR_PTS = 100, HEART_PTS = 100;
/** 뿅 수: 최소 수 + 2 (★1 = 깸 · ★2 = 최소+1 · ★3 = 최소) */
const budgetOf = (d: StageDef) => d.par + 2;
const josa = (w: string) => ((w.charCodeAt(w.length - 1) - 0xac00) % 28 ? '을' : '를');
/** 별 조건(쉬운 말, 판마다 하나씩 늘어난다): 1판 탈출 · 2판 +한 번만 · 3판부터 +n번 안에 */
function starsOf(i: number): { label: string; short: string; max: number }[] {
  const d = STAGES[i], ws = d.things.filter((t) => t.walk), who = ws.length > 1 ? '' : K[ws[0].k].name;
  const n = ['', '한', '두', '세', '네', '다섯', '여섯'];
  const out = [{ label: who ? `${who}${josa(who)} 출구로` : '모두 출구로', short: who ? `${who} 탈출` : '모두 탈출', max: 99 }];
  if (i >= 2) out.push({ label: `${n[d.par + 1]} 번 안에 바꾸기`, short: `${n[d.par + 1]} 번 안에`, max: d.par + 1 });
  if (i >= 1) out.push({ label: d.par === 1 ? '한 번만 바꾸기' : `${n[d.par]} 번 안에 바꾸기`, short: d.par === 1 ? '한 번만' : `${n[d.par]} 번 안에`, max: d.par });
  return out;
}

// ───────────────────────────── 시뮬레이션 ─────────────────────────────
interface Th {
  id: number; k: Kind; c: Cls; z: number; x: number; y: number;
  walk: boolean; s: number; v: number; st: number; blk: number; qi: number; hop: number;
  at: number;
  /** 문: 1 밀어 엶 · 2 부서짐 / 사육사: 1 도망 · 2 기절 / 연못: 1 말랐음(코끼리) / 구멍: 1 돼지가 팜 / 열쇠: 1 땀 */
  open: number;
  /** 깃발: 동물 1 = 데굴데굴(판다) · 연못 2 = 물벼락 냄 · 사육사 4 = 거북 봄 · 문 8 = 토끼 넘음 · 구멍 16 = 생쥐 꾸깃 */
  fl: number;
  /** 돼지가 구멍을 다 파는 틱(0 = 안 팜) · 파는 구멍 */
  dig: number; dgo: number;
  trk: number; ts: number; tv: number; roll: number; rot: number;
  ref: number; fill: number;
}
interface Track { pts: P2[]; cum: number[]; L: number; hits: { ts: number; id: number }[]; pond: number }
interface Path { pts: P2[]; cum: number[]; L: number }
interface WEv { k: string; a: number; b: number; n: number }
export interface World {
  th: Th[]; path: Path; tracks: Track[]; obs: number[]; walkers: number[]; rollers: number[]; keys: number[]; ch: number;
  t: number; pend: { a: number; b: number; t: number } | null; swaps: number; fail: number; quiet: boolean; log: WEv[];
}

function mkPath(pts: P2[]): Path {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, L: cum[cum.length - 1] };
}
function at(p: { pts: P2[]; cum: number[]; L: number }, s: number): P2 {
  const { pts, cum } = p;
  if (s <= 0) return pts[0];
  for (let i = 1; i < pts.length; i++) {
    if (s <= cum[i] || i === pts.length - 1) {
      const u = Math.min(1, (s - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]));
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u];
    }
  }
  return pts[pts.length - 1];
}
function project(p: { pts: P2[]; cum: number[] }, x: number, y: number): { s: number; d: number } {
  let best = { s: 0, d: 1e9 };
  for (let i = 1; i < p.pts.length; i++) {
    const [ax, ay] = p.pts[i - 1], [bx, by] = p.pts[i], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const u = l2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
    const d = Math.hypot(ax + dx * u - x, ay + dy * u - y);
    if (d < best.d) best = { s: p.cum[i - 1] + u * Math.sqrt(l2), d };
  }
  return best;
}
/** 동물의 몸 반 길이(옆모습) */
const half = (o: Th) => RZ[o.z] * 0.86;
/** 길 위 장애물의 반 길이 */
export function depth(o: Th) {
  switch (o.c) {
    case 'pond': return 0.056 + 0.03 * o.z;
    case 'keeper': return RZ[o.z] * 0.5;
    case 'hole': return 0.07;
    case 'iron': return 0.042;
    default: return 0.028;
  }
}
const GAP = 0.022;

function mkWorld(d: StageDef, quiet = false): World {
  const path = mkPath(PATH);
  const th: Th[] = d.things.map((t, id) => ({
    id, k: t.k, c: K[t.k].c, z: t.z, x: t.x, y: t.y, walk: !!t.walk, s: 0, v: 0, st: 0, blk: -1, qi: 0, hop: 0,
    at: 0, open: 0, fl: 0, dig: 0, dgo: -1, trk: -1, ts: 0, tv: 0, roll: 0, rot: 0, ref: t.ref ?? -1, fill: -1,
  }));
  const w: World = { th, path, tracks: [], obs: [], walkers: [], rollers: [], keys: [], ch: d.ch, t: 0, pend: null, swaps: 0, fail: 0, quiet, log: [] };
  // 동물: 앞에 선 것부터 우리 안에 줄 선다
  let x = 0.3, ph = 0;
  for (const o of th) {
    if (!o.walk) continue;
    o.qi = w.walkers.length;
    if (o.qi > 0) x -= ph + half(o) + 0.04;
    else x -= half(o);
    o.s = x - PATH[0][0];
    ph = half(o);
    w.walkers.push(o.id);
  }
  for (const o of th) if (o.c === 'hole' || o.c === 'gate' || o.c === 'keeper' || o.c === 'pond' || o.c === 'iron') (o.at = project(path, o.x, o.y).s), w.obs.push(o.id);
  w.obs.sort((a, b) => th[a].at - th[b].at);
  for (const o of th) if (o.c === 'key') (o.at = project(path, o.x, o.y).s), w.keys.push(o.id);
  // 굴러가는 것: 비탈 길(트랙)과 그 길이 지나는 문·사육사·연못
  d.things.forEach((t, id) => {
    if (K[t.k].c !== 'roller' || !t.trk) return;
    const tp = mkPath(t.trk), tr: Track = { ...tp, hits: [], pond: -1 };
    for (const o of th) {
      if (o.c !== 'keeper' && o.c !== 'gate' && o.c !== 'pond') continue;
      const pr = project(tp, o.x, o.y);
      if (o.c === 'pond') {
        if (pr.d < 0.07 && pr.s > tp.L - 0.03) tr.pond = o.id;
      } else if (pr.d < 0.08) tr.hits.push({ ts: pr.s, id: o.id });
    }
    tr.hits.sort((a, b) => a.ts - b.ts);
    th[id].trk = w.tracks.length;
    w.tracks.push(tr);
    w.rollers.push(id);
  });
  for (const id of w.walkers) syncXY(w, th[id]);
  return w;
}
function syncXY(w: World, o: Th) {
  const p = at(w.path, o.s);
  o.x = p[0];
  o.y = p[1];
}
function cloneWorld(w: World): World {
  return { ...w, th: w.th.map((o) => ({ ...o })), pend: w.pend && { ...w.pend }, log: [], quiet: true };
}
const lg = (w: World, k: string, a = -1, b = -1, n = 0) => {
  if (!w.quiet) w.log.push({ k, a, b, n });
};

/** 키(구멍·연못에 쓰는 높이): 크기, 기린은 +2 */
export const heightOf = (o: Th) => o.z + (K[o.k].tall ?? 0);
function hatOf(w: World, kp: Th) {
  for (const h of w.th) if (h.c === 'hat' && h.ref === kp.id) return h;
  return null;
}
/** 사육사가 지금 잡을 수 있나: 도망·기절 아님, 모자에 덮이지 않음 */
export function onDuty(w: World, kp: Th) {
  if (kp.open) return false;
  const h = hatOf(w, kp);
  return !(h && h.z >= kp.z);
}
export const bridged = (w: World, p: Th) => w.th.some((l) => l.c === 'log' && l.ref === p.id && l.z >= p.z);
export const filled = (w: World, p: Th) => p.fill >= 0 && w.th[p.fill].z >= p.z;
/** 쇠창살 정문: 누름판 위 것이 커다랗거나(4 이상), 기린이 열쇠를 땄으면 열린다 */
export const pressed = (w: World, g: Th) => g.ref >= 0 && (w.th[g.ref].c === 'key' ? w.th[g.ref].open > 0 : w.th[g.ref].z >= 4);
export const dried = (p: Th) => p.c === 'pond' && p.open > 0;
const DIG_T = 50;

function passable(w: World, o: Th, wk: Th): boolean {
  switch (o.c) {
    // 생쥐: 쥐구멍은 내 집 — 아무리 커져도 쏙
    case 'hole': return wk.k === 'mouse' || heightOf(wk) <= o.z;
    // 토끼: 닫힌 문도 폴짝
    case 'gate': return o.open > 0 || wk.k === 'rabbit';
    // 거북: 등껍질에 쏙 — 사육사가 돌인 줄 안다
    case 'keeper': return !onDuty(w, o) || wk.k === 'turtle';
    case 'pond': return !!K[wk.k].swim || heightOf(wk) > o.z || bridged(w, o) || filled(w, o) || dried(o);
    case 'iron': return pressed(w, o);
    default: return true;
  }
}
function contact(w: World, o: Th, wk: Th) {
  if (o.c === 'gate' && !o.open) {
    if (wk.k === 'rabbit') {
      if (!(o.fl & 8)) (o.fl |= 8), lg(w, 'hop', o.id, wk.id);
    } else if (wk.z >= o.z) (o.open = 1), lg(w, 'gate', o.id, wk.id);
  } else if (o.c === 'keeper' && onDuty(w, o)) {
    if (wk.k === 'panda' && wk.fl & 1) (o.open = 2), lg(w, 'bowl', o.id, wk.id), lg(w, 'knock', o.id, wk.id);
    else if (wk.k === 'turtle') {
      if (!(o.fl & 4)) (o.fl |= 4), lg(w, 'shell', o.id, wk.id);
    } else if (wk.z > o.z) (o.open = 1), lg(w, 'flee', o.id, wk.id);
    else (wk.st = 3), (w.fail = 1), lg(w, 'caught', o.id, wk.id);
  } else if (o.c === 'pond' && !dried(o) && !bridged(w, o) && !filled(w, o)) {
    // 코끼리: 커다래지면(연못만 하거나 더 크면) 연못 물을 쭉 — 말라서 누구나 건넌다
    if (wk.k === 'elephant' && wk.z >= o.z) (o.open = 1), lg(w, 'drink', o.id, wk.id);
    // 하마: 커다래서 첨벙! — 물벼락에 연못 옆(같은 층) 사육사가 꽈당
    else if (wk.k === 'hippo' && wk.z >= 4 && !(o.fl & 2)) {
      o.fl |= 2;
      lg(w, 'wave', o.id, wk.id);
      for (const kp of w.th) if (kp.c === 'keeper' && onDuty(w, kp) && Math.abs(kp.y - o.y) < 0.05 && Math.abs(kp.x - o.x) < 0.45) (kp.open = 2), lg(w, 'knock', kp.id, wk.id);
    }
  } else if (o.c === 'hole' && wk.k === 'piglet' && !o.open && !wk.dig && heightOf(wk) > o.z && o.z < 5) {
    // 돼지: 구멍 앞에서 킁킁 파서 한 칸 넓힌다(구멍마다 한 번)
    o.open = 1;
    wk.dig = w.t + DIG_T;
    wk.dgo = o.id;
    lg(w, 'digstart', o.id, wk.id);
  } else if (o.c === 'hole' && wk.k === 'mouse' && heightOf(wk) > o.z && !(o.fl & 16)) (o.fl |= 16), lg(w, 'squish', o.id, wk.id);
}
const vmaxOf = (o: Th) => 0.34 + 0.05 * o.z;
export const onSlide = (o: Th) => o.walk && o.s > SLIDE[0] && o.s < SLIDE[1];

/** 동물 하나: 앞의 막힌 곳(또는 앞 동물)까지 걷는다 */
function walkerTick(w: World, wk: Th, ahead: Th | null) {
  if (wk.st >= 2) return;
  if (wk.dig && w.t >= wk.dig) {
    const h = w.th[wk.dgo];
    h.z = Math.min(5, h.z + 1);
    wk.dig = 0;
    lg(w, 'dig', h.id, wk.id);
  }
  // 기린: 높은 가지의 열쇠를 지나가며 똑
  for (const id of w.keys) {
    const kk = w.th[id];
    if (!kk.open && heightOf(wk) >= KEY_H && wk.s >= kk.at - 0.04 && wk.s <= kk.at + 0.1) (kk.open = 1), lg(w, 'key', kk.id, wk.id);
  }
  if (onSlide(wk) && wk.k === 'panda') wk.fl |= 1;
  let lim = w.path.L + 1, blk = -1, fwd = -1;
  for (const id of w.obs) {
    const o = w.th[id];
    if (wk.s > o.at + depth(o) + half(wk)) continue;
    // 몸 가운데가 이미 지나갔으면 지나간 것 — 커져서 꼬리가 끼면 앞으로 쑥 밀려 나온다
    if (wk.s >= o.at) {
      if (!passable(w, o, wk)) fwd = Math.max(fwd, o.at + depth(o) + half(wk) + 0.004);
      continue;
    }
    const cp = o.at - depth(o) - half(wk) - GAP;
    if (wk.s >= cp - 0.003) {
      contact(w, o, wk);
      if (wk.st === 3) return;
    }
    if (!passable(w, o, wk)) {
      lim = cp;
      blk = id;
      break;
    }
  }
  if (ahead) {
    const q = ahead.s - half(ahead) - half(wk) - 0.017;
    if (q < lim) (lim = q), (blk = -2);
  }
  const was = wk.st;
  if (fwd > wk.s && fwd <= lim) {
    wk.s = Math.min(fwd, wk.s + 0.7 * TK);
    wk.v = 0;
    wk.st = 0;
    wk.blk = blk;
    syncXY(w, wk);
    return;
  }
  if (wk.s < lim - 0.0004) {
    // 미끄럼틀에선 슝, 앞이 다 트이면 신나서 뛴다
    const vm = vmaxOf(wk) * (onSlide(wk) ? 2.6 : 1) * (blk === -1 ? 1.4 : 1);
    wk.v = Math.min(vm, wk.v + 2.4 * TK);
    wk.s = Math.min(lim, wk.s + wk.v * TK);
    wk.st = 0;
    if (wk.s >= lim - 0.0004 && blk !== -1) {
      // 막힌 곳에 닿는 바로 그 틱에 문·사육사를 건드린다(한 틱 '막힘'으로 멈춘 척하지 않게)
      if (blk >= 0) contact(w, w.th[blk], wk);
      if (wk.st === 3) return;
      if (blk >= 0 && passable(w, w.th[blk], wk)) wk.st = 0;
      else (wk.v = 0), (wk.st = 1), (wk.fl &= ~1), blk >= 0 && lg(w, 'bonk', wk.id, blk);
    }
  } else if (wk.s > lim + 0.0004) {
    // 커져서 끼었으면 밀려 나온다
    wk.s = Math.max(lim, wk.s - 0.7 * TK);
    wk.v = 0;
    wk.st = 0;
    if (wk.s <= lim + 0.0004) (wk.st = 1), blk >= 0 && w.t > 5 && lg(w, 'squeeze', wk.id, blk);
  } else {
    wk.v = 0;
    if (was === 0 && blk >= 0) lg(w, 'bonk', wk.id, blk);
    wk.st = 1;
    wk.fl &= ~1;
  }
  wk.blk = blk;
  if (wk.s >= w.path.L) (wk.st = 2), lg(w, 'out', wk.id);
  syncXY(w, wk);
}
function rollerTick(w: World, r: Th) {
  if (r.roll === 3) return;
  const tr = w.tracks[r.trk];
  if (r.z < 3 || tr.L < 0.01) {
    if (r.roll === 1) (r.roll = 2), (r.tv = 0), lg(w, 'rollstop', r.id);
    return;
  }
  if (r.ts >= tr.L - 1e-6) return;
  const step = Math.max(r.tv, 0.28) * TK;
  for (const h of tr.hits) {
    if (r.ts > h.ts) continue;
    const o = w.th[h.id];
    const blocks = (o.c === 'keeper' && onDuty(w, o)) || (o.c === 'gate' && !o.open);
    if (!blocks) continue;
    const cp = h.ts - RZ[r.z] * 0.7 - 0.02;
    if (r.ts + step < cp) break;
    if (r.z >= o.z) {
      o.open = 2;
      lg(w, o.c === 'keeper' ? 'knock' : 'smash', o.id, r.id);
      r.tv *= 0.6;
      continue;
    }
    if (r.roll === 1) lg(w, 'thunk', r.id, o.id);
    r.roll = 2;
    r.tv = 0;
    return;
  }
  if (r.roll !== 1) (r.roll = 1), lg(w, 'roll', r.id);
  r.tv = Math.min(1.2 + 0.1 * r.z, Math.max(0.28, r.tv) + 3.4 * TK);
  r.ts = Math.min(tr.L, r.ts + r.tv * TK);
  r.rot += (r.tv * TK) / RZ[r.z];
  const p = at(tr, r.ts);
  r.x = p[0];
  r.y = p[1];
  if (r.ts >= tr.L - 1e-6) {
    if (tr.pond >= 0) (r.roll = 3), (w.th[tr.pond].fill = r.id), lg(w, 'splash', r.id, tr.pond);
    else (r.roll = 2), lg(w, 'rest', r.id);
    r.tv = 0;
  }
}
export function settled(w: World) {
  if (w.pend) return false;
  for (const id of w.walkers) if (w.th[id].st === 0 || w.th[id].dig) return false;
  for (const id of w.rollers) if (w.th[id].roll === 1) return false;
  return true;
}
export const allOut = (w: World) => w.walkers.every((id) => w.th[id].st === 2);
function doSwap(w: World, a: number, b: number) {
  const A_ = w.th[a], B_ = w.th[b], za = A_.z, zb = B_.z;
  A_.z = zb;
  B_.z = za;
  lg(w, 'swap', a, b, za * 10 + zb);
}
export function tick(w: World) {
  w.t++;
  if (w.pend && w.t >= w.pend.t) {
    doSwap(w, w.pend.a, w.pend.b);
    w.pend = null;
  }
  for (const id of w.rollers) rollerTick(w, w.th[id]);
  // 사자: 사육사보다 크면 어흥! — 멀리 있어도 그 사육사는 도망간다
  for (const ln of w.th) {
    if (!K[ln.k].roar || (ln.walk && ln.st >= 2)) continue;
    for (const kp of w.th) if (kp.c === 'keeper' && onDuty(w, kp) && ln.z > kp.z) (kp.open = 1), lg(w, 'roar', kp.id, ln.id);
  }
  let ahead: Th | null = null;
  for (const id of w.walkers) {
    const wk = w.th[id];
    walkerTick(w, wk, ahead);
    if (w.fail) return;
    if (wk.st !== 2) ahead = wk;
  }
}
/** 지금 바꿀 수 있는 물건: 나간 동물·도망간 사육사·쇠창살은 빼고 */
export const swappable = (o: Th) => !(o.walk && o.st >= 2) && !(o.c === 'keeper' && o.open === 1) && o.c !== 'iron' && o.c !== 'key';

// ───────────────────────────── 플래너 (잘하는 봇·막힘 힌트) ─────────────────────────────
function sig(w: World): string {
  let k = '';
  for (const o of w.th) {
    k += o.z;
    if (o.walk) k += `w${o.st}${o.st === 1 ? o.blk : Math.round(o.s * 40)}${o.fl & 1}${o.dig ? 'd' : ''}`;
    else if (o.c === 'gate' || o.c === 'keeper' || o.c === 'hole' || o.c === 'key') k += o.open;
    else if (o.c === 'roller') k += `r${o.roll}${Math.round(o.ts * 40)}`;
    else if (o.c === 'pond') k += `p${o.fill}${o.open}${o.fl & 2}`;
    k += ',';
  }
  return k;
}
/** 멈출 때까지(또는 깸·실패) 돌린다 */
export function runSettle(w: World, max = 1500) {
  for (let i = 0; i < max && !w.fail && !allOut(w); i++) {
    tick(w);
    if (i > 2 && settled(w)) break;
  }
}
const pairsOf = (w: World): [number, number][] => {
  const ids = w.th.filter(swappable).map((o) => o.id), out: [number, number][] = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) if (w.th[ids[i]].z !== w.th[ids[j]].z) out.push([ids[i], ids[j]]);
  return out;
};
/** '한 번에 여러 일'로 세는 사건 */
const BIGK = new Set(['gate', 'flee', 'roar', 'knock', 'smash', 'splash', 'drink', 'wave', 'key', 'dig', 'out']);
/** 멈출 때까지 돌리며 큰 사건 수를 센다 */
function settleCount(w: World): number {
  w.quiet = false;
  w.log = [];
  runSettle(w);
  let n = 0;
  for (const e of w.log) if (BIGK.has(e.k)) n++;
  w.log = [];
  w.quiet = true;
  return n;
}
const planMem = new Map<string, [number, number][] | null>();
/** 탐색 상한(물리 시뮬 횟수) — 힌트가 화면을 오래 멈추지 않게 */
const PLAN_CAP = 5000;
/**
 * 가장 적게 바꿔 모두 탈출하는 순서 (너비 우선 + 물리 시뮬). 같은 수라면 '한 번에 여러 일'이 많이 터지는 쪽.
 * 못 찾으면 null. 난수를 쓰지 않는다(힌트도 이것을 쓴다 — 결정적).
 */
export function solve(stage: number, w0: World, left: number): [number, number][] | null {
  const key = `${stage}|${left}|${sig(w0)}`;
  if (planMem.has(key)) return planMem.get(key)!;
  const root = cloneWorld(w0);
  runSettle(root);
  let res: [number, number][] | null = null;
  if (allOut(root) && !root.fail) res = [];
  else if (!root.fail) {
    let layer: { w: World; seq: [number, number][]; sc: number }[] = [{ w: root, seq: [], sc: 0 }];
    const seen = new Set<string>([sig(root)]);
    let cap = PLAN_CAP, best = -1;
    for (let dep = 1; dep <= Math.min(left, 4) && !res && layer.length && cap > 0; dep++) {
      const next: typeof layer = [];
      for (const n of layer) {
        for (const [a, b] of pairsOf(n.w)) {
          if (--cap < 0) break;
          const c = cloneWorld(n.w);
          doSwap(c, a, b);
          const sc = n.sc + settleCount(c);
          if (c.fail) continue;
          if (allOut(c)) {
            if (sc > best) (best = sc), (res = [...n.seq, [a, b]]);
            continue;
          }
          if (res) continue;
          const k = sig(c);
          if (seen.has(k)) continue;
          seen.add(k);
          next.push({ w: c, seq: [...n.seq, [a, b]], sc });
        }
      }
      layer = next;
    }
  }
  planMem.set(key, res);
  return res;
}

// ── 힌트 말(무엇을 왜) ──
const jong = (w: string) => (w.charCodeAt(w.length - 1) - 0xac00) % 28 > 0;
const iga = (w: string) => w + (jong(w) ? '이' : '가');
const eulreul = (w: string) => w + (jong(w) ? '을' : '를');
const wagwa = (w: string) => w + (jong(w) ? '과' : '와');
const euro = (w: string) => {
  const c = (w.charCodeAt(w.length - 1) - 0xac00) % 28;
  return w + (c > 0 && c !== 8 ? '으로' : '로');
};
/** 이 바꾸기를 하면 무슨 일이? — 시뮬을 돌려 첫 큰 사건 둘을 말로 */
function explain(w0: World, a: number, b: number): string {
  const c = cloneWorld(w0);
  runSettle(c);
  const before = c.th.map((o) => ({ s: o.s, z: o.z }));
  const nmA = thName(c, c.th[a]), nmB = thName(c, c.th[b]);
  doSwap(c, a, b);
  c.quiet = false;
  c.log = [];
  runSettle(c);
  const said: string[] = [];
  const add = (x: string) => !said.includes(x) && said.length < 2 && said.push(x);
  const nm = (id: number) => thName(c, c.th[id]);
  for (const e of c.log) {
    const A_ = e.a >= 0 ? c.th[e.a] : null, B_ = e.b >= 0 ? c.th[e.b] : null;
    switch (e.k) {
      case 'gate': add(`${iga(nm(e.b))} 커져서 문을 쾅`); break;
      case 'flee': add(`사육사가 ${eulreul(nm(e.b))} 보고 도망`); break;
      case 'roar': add('사자가 어흥! 사육사 도망'); break;
      case 'knock': if (B_ && B_.c === 'roller') add(`${iga(nm(e.b))} 굴러 사육사 꽈당`); break;
      case 'smash': add(`${iga(nm(e.b))} 굴러 문을 와장창`); break;
      case 'splash': if (A_ && B_ && A_.z >= B_.z) add(`${iga(nm(e.a))} 연못에 풍덩 징검다리`); break;
      case 'drink': add('코끼리가 연못 물을 쭉'); break;
      case 'wave': add('하마 첨벙! 사육사 꽈당'); break;
      case 'bowl': add('판다가 데굴데굴 사육사 볼링'); break;
      case 'key': add('기린이 높은 열쇠를 똑'); break;
      case 'dig': add('돼지가 구멍을 킁킁 넓혀요'); break;
      case 'hop': add('토끼가 문을 폴짝'); break;
      case 'shell': add('거북이 등껍질에 쏙'); break;
      case 'squish': add('생쥐가 큰 채로 쥐구멍 쏙'); break;
      case 'out': if (A_) add(`${A_.k === c.th[a].k || A_.k === c.th[b].k ? '' : ''}${K[A_.k].name} 탈출!`); break;
    }
  }
  // 굴을 새로 지나간 동물
  if (said.length < 2)
    for (const id of c.walkers) {
      const o = c.th[id];
      for (const h of c.th) if (h.c === 'hole' && before[id].s < h.at && o.s >= h.at && o.st !== 3 && (id === a || id === b)) add(`${iga(nm(id))} 작아져서 ${euro(thName(c, h))} 쏙`);
    }
  // 모자·다리
  for (const kp of c.th) if (kp.c === 'keeper' && !kp.open && !onDuty(c, kp) && (c.th[a].c === 'hat' || c.th[b].c === 'hat' || kp.id === a || kp.id === b)) add('모자가 사육사를 폭');
  const head = `${wagwa(nmA)} ${eulreul(nmB)} 바꾸면`;
  if (said.length) return `${head} → ${said.join(', ')}`;
  // 당장 일은 없지만 다음 수를 위한 준비(맡겨 두기)
  const big = c.th[a].z > before[a].z ? a : b, small = big === a ? b : a;
  void small;
  return `${head} → ${iga(nm(big))} ${SIZE_WORD[c.th[big].z]} 크기를 맡아 둬요`;
}

// ───────────────────────────── 게임 상태 ─────────────────────────────
interface Ev { t: number; k: string; a: number; b: number; n: number }
export interface SwapState {
  seed: number; t: number; stage: number; w: World; phase: 'play' | 'result' | 'fail' | 'album' | 'story'; pt: number; why: string; slow: number; album: number;
  hearts: number; pts: number; got: number; ofStars: number; starOk: boolean[]; sel: number; lock: boolean; down: boolean;
  dex: number[]; newDex: Kind[]; again: boolean; tries: number; dead: boolean; won: boolean; calm: number;
  firstTap: number; firstBig: number; wowN: number; seen: Set<string>; events: Ev[];
  banner: { head: string; sub: string; sub2: string; t: number } | null; spot: { id: number; t: number; label: string } | null;
  big: { text: string; t: number; x: number; y: number } | null;
  /** 다리·모자·누름판 상태(바뀌는 순간을 잡으려고) */
  flags: boolean[];
  /** 판마다 가장 많이 딴 별 · 별 더 따기 횟수 */
  best: number[]; replays: number;
  /** 막힘 힌트: 지금 보여 주는 한 수 · 이 판에서 쓴 수 · 이 판 실패 수 · 저절로 보여 줄 틱 · 진전이 마지막으로 있던 틱 */
  hint: { t: number; a: number; b: number; text: string; retry: boolean } | null;
  hintsHere: number; failsHere: number; hintStage: number; autoAt: number; prog: number; progT: number;
  /** 한 번에 여러 일: 이번 뿅에서 터진 큰 사건 수 */
  chain: number;
}
const thName = (w: World, o: Th) => (o.c === 'hole' ? HOLE_NAME[w.ch] : K[o.k].name);
const see = (s: SwapState, key: string) => (key && !s.seen.has(key) ? (s.seen.add(key), true) : false);
function wow(s: SwapState, text: string, x: number, y: number) {
  s.wowN++;
  if (s.firstBig < 0 && s.firstTap >= 0) s.firstBig = s.t;
  s.big = { text, t: s.t, x, y };
}
const ev = (s: SwapState, k: string, a = -1, b = -1, n = 0) => s.events.push({ t: s.t, k, a, b, n });
/** 이 판에서 처음 만나는 친구(특기를 시작 카드에) */
function newFriends(i: number): Kind[] {
  const out: Kind[] = [];
  for (const t of STAGES[i].things) if (t.walk && DEX.includes(t.k) && !STAGES.slice(0, i).some((e) => e.things.some((u) => u.walk && u.k === t.k))) out.push(t.k);
  return out;
}
const STORY_T = 300;

function newStage(s: SwapState, again: boolean) {
  const d = STAGES[s.stage];
  s.w = mkWorld(d);
  s.slow = 0;
  s.flags = s.w.th.map((o) => (o.c === 'pond' ? bridged(s.w, o) : o.c === 'keeper' ? !onDuty(s.w, o) : o.c === 'iron' ? pressed(s.w, o) : false));
  s.phase = 'play';
  s.pt = 0;
  s.sel = d.pre ?? -1;
  s.lock = d.pre !== undefined && !again;
  if (again) s.sel = -1;
  s.again = again;
  s.calm = 0;
  s.starOk = starsOf(s.stage).map(() => false);
  s.got = 0;
  s.ofStars = s.starOk.length;
  s.newDex = [];
  s.hint = null;
  s.chain = 0;
  s.prog = 0;
  s.progT = s.t;
  if (s.hintStage !== s.stage) (s.hintStage = s.stage), (s.hintsHere = 0), (s.failsHere = 0);
  // 두 번 실패하면 판 시작 때 힌트를 한 번 저절로
  s.autoAt = again && s.failsHere === 2 ? s.t + 100 : -1;
  const first = s.stage === 0 || STAGES[s.stage - 1].ch !== d.ch;
  const fr = newFriends(s.stage).filter((k) => !d.news.startsWith(K[k].name));
  const friend = fr.length ? `새 친구 ${K[fr[0]].name} — ${K[fr[0]].skill}` : '';
  const story = s.stage === 0 ? STORY[0].a : '';
  s.banner = again
    ? { head: `다시! ${s.stage + 1}판 · ${d.name}`, sub: d.hint, sub2: '', t: s.t }
    : { head: `${first ? CHAPTERS[d.ch] + ' · ' : ''}${s.stage + 1}판 ${d.name}`, sub: d.news ? `NEW  ${d.news}` : story || d.hint, sub2: friend || (story ? d.hint : ''), t: s.t };
  s.spot = !again && d.spot !== undefined ? { id: d.spot, t: s.t, label: d.news.split(' — ')[0] } : null;
  if (!again) {
    see(s, `stage${s.stage}`);
    if (d.news) see(s, `news:${d.news.split(' — ')[0]}`);
    if (first) see(s, `ch${d.ch}`);
  }
  ev(s, again ? 'again' : 'stage');
}
function clearStage(s: SwapState) {
  const st = starsOf(s.stage);
  s.starOk = st.map((q) => s.w.swaps <= q.max);
  s.got = s.starOk.filter(Boolean).length;
  // 같은 판을 다시 깨면 늘어난 별만 더한다
  const best = s.best[s.stage];
  s.pts += best === undefined ? CLEAR_PTS + s.got * STAR_PTS : Math.max(0, s.got - best) * STAR_PTS;
  s.best[s.stage] = Math.max(best ?? 0, s.got);
  s.phase = 'result';
  s.pt = 0;
  s.sel = -1;
  s.hint = null;
  s.newDex = [];
  for (const id of s.w.walkers) {
    const k = s.w.th[id].k, i = DEX.indexOf(k);
    if (i >= 0) {
      if (!s.dex[i]) s.newDex.push(k), see(s, `dex:${k}`);
      s.dex[i]++;
    }
  }
  if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += s.hearts * HEART_PTS);
  ev(s, 'clear', s.got);
}
function failStage(s: SwapState, why: string) {
  s.phase = 'fail';
  s.pt = 0;
  s.why = why;
  s.sel = -1;
  s.hint = null;
  s.hearts--;
  s.tries++;
  s.failsHere++;
  ev(s, 'fail', s.w.walkers.find((id) => s.w.th[id].st === 3) ?? -1);
}
/** 막힘 힌트: 잘하는 봇의 계획을 지금 상태로 한 번 돌려 다음 한 수 */
function showHint(s: SwapState) {
  if (s.phase !== 'play' || s.w.pend) return;
  const d = STAGES[s.stage], left = budgetOf(d) - s.w.swaps;
  const plan = left > 0 ? solve(s.stage, s.w, Math.min(left, d.par + 1)) : null;
  if (!plan) s.hint = { t: s.t, a: -1, b: -1, text: '이대로는 못 나가요 — 처음부터 다시 해 볼까요?', retry: true };
  else if (!plan.length) s.hint = { t: s.t, a: -1, b: -1, text: '그대로 두면 나가요! 잠깐 기다려 봐요', retry: false };
  else s.hint = { t: s.t, a: plan[0][0], b: plan[0][1], text: explain(s.w, plan[0][0], plan[0][1]), retry: false };
  if (s.sel >= 0 && s.hint.a >= 0 && s.sel !== s.hint.a && s.sel !== s.hint.b && !s.lock) (s.sel = -1), ev(s, 'desel');
  s.hintsHere++;
  see(s, 'hint');
  ev(s, 'hint');
}
/** 진전: 지나간 장애물·나간 동물·열린 것 — 15초 넘게 그대로면 전구가 반짝 */
function progressOf(w: World) {
  let p = 0;
  for (const id of w.walkers) {
    const o = w.th[id];
    if (o.st === 2) p += 50;
    else for (const ob of w.obs) if (o.s > w.th[ob].at) p++;
  }
  for (const o of w.th) if (o.open || o.fill >= 0) p++;
  return p;
}

// ───────────────────────────── 톡 ─────────────────────────────
export const RETRY: [number, number, number, number] = [0.085, 1.445, 0.15, 0.09];
/** 전구 단추(위 띠 오른쪽, 지름 ≥ 화면 폭 10%) */
export const BULB: [number, number, number, number] = [0.922, 0.085, 0.14, 0.16];
/** 결과 카드의 '별 더 따기'·'다음 판' 단추 */
export const REPLAY: [number, number, number, number] = [0.3, 1.255, 0.34, 0.075];
export const NEXT: [number, number, number, number] = [0.7, 1.255, 0.34, 0.075];
/** 톡 했을 때 그 물건의 가운데(가로 폭 단위) — 그림·봇·맞히기가 같은 것을 쓴다 */
export function hitCenter(w: World, o: Th): P2 {
  const r = RZ[Math.max(1, o.z)];
  switch (o.c) {
    case 'hole': return [o.x, o.y - blockH(o.z) * 0.5];
    case 'gate': return [o.x, o.y - doorH(o.z) * 0.5];
    case 'pond': return [o.x, o.y + 0.045];
    case 'keeper': return [o.x, o.y - keeperH(o.z) * 0.5];
    case 'hat': {
      const kp = w.th[o.ref];
      return [kp.x + 0.012, kp.y - keeperH(kp.z) - Math.max(0.028, RZ[o.z] * 0.6)];
    }
    case 'log': return [o.x, o.y - 0.055];
    default: return [o.x, o.y - r * (o.walk ? 0.95 : 0.85)];
  }
}
/** 구멍(굴) 높이 · 벽 높이 · 문 높이 · 사육사 키 (가로 폭 단위) */
/** 키 칸 → 반지름(기린은 키가 6·7까지) */
const HZ = (z: number) => RZ[Math.min(5, Math.max(1, z))] + Math.max(0, z - 5) * 0.05;
export const holeH = (z: number) => HZ(z) * 2.1;
export const blockH = (z: number) => Math.max(0.2, holeH(z) + 0.07);
export const doorH = (z: number) => 0.07 + 0.039 * z;
export const keeperH = (z: number) => RZ[z] * 2.4;
function pick(s: SwapState, x: number, y: number): number {
  let best = -1, bs = 1e9;
  for (const o of s.w.th) {
    if (!swappable(o)) continue;
    // 1판 첫 톡(코끼리가 이미 반짝): 아무 데나 톡 해도 가장 가까운 것과 뿅 — 첫 손길이 곧 가장 시원한 순간
    if (s.lock && o.id === s.sel) continue;
    const [cx, cy] = hitCenter(s.w, o), r = Math.max(0.07, RZ[Math.max(1, o.z)] * 1.05), d = Math.hypot(x - cx, y - cy);
    if (d > r + 0.09 && !s.lock) continue;
    const sc = d - r * 0.6;
    if (sc < bs) (bs = sc), (best = o.id);
  }
  return best;
}
const inBox = (x: number, y: number, b: [number, number, number, number]) => Math.abs(x - b[0]) <= b[2] / 2 && Math.abs(y - b[1]) <= b[3] / 2;
function tapAt(s: SwapState, x: number, y: number) {
  if (inBox(x, y, BULB)) return showHint(s);
  if (inBox(x, y, RETRY)) {
    if (s.w.swaps > 0 || (s.sel >= 0 && !s.lock)) newStage(s, true), ev(s, 'retry');
    return;
  }
  const id = pick(s, x, y);
  if (id < 0) return;
  if (s.w.pend) return;
  if (s.sel < 0) {
    s.sel = id;
    ev(s, 'sel', id);
    see(s, 'select');
    return;
  }
  if (s.sel === id) {
    if (!s.lock) (s.sel = -1), ev(s, 'desel', id);
    return;
  }
  if (s.w.swaps >= budgetOf(STAGES[s.stage])) {
    ev(s, 'nomore', id);
    return;
  }
  s.w.swaps++;
  s.w.pend = { a: s.sel, b: id, t: s.w.t + SWAP_T };
  // 빛줄기가 오가는 동안 세상이 반 빠르기로(잠깐 느려짐)
  s.slow = SWAP_T * 2;
  // 첫 뿅부터는 안내 띠·NEW 표시를 걷어 장면이 잘 보이게
  if (s.banner && s.t - s.banner.t < 200) s.banner.t = s.t - 200;
  s.spot = null;
  ev(s, 'beam', s.sel, id);
  s.sel = -1;
  s.lock = false;
  s.hint = null;
  s.chain = 0;
  see(s, 'swap');
}

/** 시뮬 사건 → 게임 사건(연출·큰 순간·새것) */
function absorb(s: SwapState) {
  const w = s.w;
  for (const e of w.log) {
    ev(s, e.k, e.a, e.b, e.n);
    const A_ = e.a >= 0 ? w.th[e.a] : null;
    switch (e.k) {
      case 'swap': {
        const za = Math.floor(e.n / 10), zb = e.n % 10, B_ = w.th[e.b];
        if (Math.abs(za - zb) >= 2) {
          const big = A_!.z > B_.z ? A_! : B_, small = big === A_ ? B_ : A_!;
          const subj = big.z >= 5 || small.z > 1 ? big : small, [bx] = hitCenter(w, subj);
          wow(s, big.z >= 5 ? `${SIZE_WORD[5]} ${thName(w, big)}!` : small.z <= 1 ? `${SIZE_WORD[1]} ${thName(w, small)}!` : `뿅! ${thName(w, big)} 쑥!`, bx, subj.y < 0.9 ? 0.3 : 0.93);
        }
        break;
      }
      case 'flee': see(s, 'flee'), wow(s, '으악! 사육사 도망!', A_!.x, A_!.y - 0.32); break;
      case 'knock': see(s, 'knock'), wow(s, '쾅! 사육사 꽈당!', A_!.x, A_!.y - 0.32); break;
      case 'smash': see(s, 'smash'), wow(s, '와장창!', A_!.x, A_!.y - 0.3); break;
      case 'gate': see(s, 'gate'); break;
      case 'roll': see(s, 'roll'); break;
      case 'splash': see(s, 'splash'); break;
      case 'hop': see(s, 'hop'); break;
      case 'out': see(s, 'out'); break;
      case 'roar': see(s, 'roar'), wow(s, '어흥! 사육사 도망!', A_!.x, A_!.y - 0.3); break;
      case 'drink': see(s, 'drink'), wow(s, '쭈욱! 연못이 말랐어요!', A_!.x, A_!.y - 0.3); break;
      case 'wave': see(s, 'wave'), wow(s, '첨벙! 물벼락!', A_!.x, A_!.y - 0.3); break;
      case 'bowl': see(s, 'bowl'), wow(s, '데굴데굴 판다 볼링!', A_!.x, A_!.y - 0.32); break;
      case 'key': see(s, 'key'), wow(s, '똑! 열쇠를 땄어요!', A_!.x, 0.3); break;
      case 'dig': see(s, 'dig'); break;
      case 'hop': see(s, 'hophop'); break;
      case 'shell': see(s, 'shell'); break;
      case 'squish': see(s, 'squish'); break;
    }
    // 한 번에 여러 일: 이번 뿅에서 큰 사건이 둘째·셋째로 터질 때마다 ×2 ×3 (소리 높아짐·잠깐 느려짐)
    if (BIGK.has(e.k) && w.swaps > 0) {
      s.chain++;
      if (s.chain >= 2) {
        const o = A_ ?? w.th[0];
        ev(s, 'chain', o.id, -1, s.chain);
        s.slow = Math.max(s.slow, 10);
        if (s.chain === 2) s.wowN++;
        see(s, 'chain');
      }
    }
  }
  w.log.length = 0;
  // 상태가 바뀌어 생긴 큰 순간: 다리가 놓임 · 모자가 사육사를 덮음 · 누름판이 눌림
  for (const o of w.th) {
    const on = o.c === 'pond' ? bridged(w, o) : o.c === 'keeper' ? !o.open && !onDuty(w, o) : o.c === 'iron' ? pressed(w, o) : false;
    const was = s.flags[o.id] ?? false;
    if (on !== was) {
      s.flags[o.id] = on;
      if (on && w.t > 1) {
        const k = o.c === 'pond' ? 'bridge' : o.c === 'keeper' ? 'cover' : 'press';
        ev(s, k, o.id);
        see(s, k);
        wow(s, k === 'bridge' ? '쿵! 통나무 다리!' : k === 'cover' ? '폭! 모자에 쏙!' : '철컥! 정문이 열려요!', o.x, o.y - 0.32);
      } else if (!on && w.t > 1) ev(s, o.c === 'iron' ? 'unpress' : 'undo', o.id);
    }
  }
}

/** 키보드 H(또는 ?) = 힌트 — 브라우저에서만(봇·테스트엔 창이 없다) */
let hintKeyQ = 0;
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function')
  window.addEventListener('keydown', (e) => {
    if (e.key === 'h' || e.key === 'H' || e.key === '?' || e.key === 'ㅗ') hintKeyQ++;
  });

// ───────────────────────────── 게임 ─────────────────────────────
const game: GameDef<SwapState> & { wows(s: SwapState): number } = {
  id: 'sizeswap',
  name: '↔️ 크기 바꾸기',
  genes: ['sizeswap', 'pointer', 'collect'],
  twist: '두 물건을 차례로 톡 하면 크기가 서로 뿅 바뀌는데, 크기를 따라 힘·무게까지 바뀐다 — 작아져 쥐구멍을 지난 코끼리가 생쥐에게 맡긴 큰 크기를 돌려받아 문을 쾅, 크기를 이어 넘기면 열쇠·어흥·볼링이 줄줄이 터진다',
  rules: [
    '하나 톡 → 다른 하나 톡 하면 두 크기가 뿅! 서로 바뀌어요. 무엇이든 돼요.',
    '작으면 구멍으로 쏙, 크면 문을 쾅. 사육사는 자기보다 작은 동물만 잡아요. 동물마다 특기가 있어요.',
    '아기 동물을 엄마에게! 적게 바꿀수록 별. 잡히거나 막히면 하트 -1. 막히면 전구 톡.',
  ],
  controls: 'touch',
  hint: '물건 톡 → 다른 물건 톡 = 크기 바꾸기 · 막히면 전구(H) / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '햇살 가득한 3/4 시점 동물원 디오라마 — 손그림 동물들이 크기를 뿅뿅 바꿔 탈출하고, 사육사는 웃기게 당황한다',
    mood: '연둣빛 잔디와 하얀 울타리의 아기 동물 마을, 노란 풀과 아카시아의 큰 동물 숲, 분수와 풍선이 있는 정문 광장. 빛줄기가 오가면 코끼리가 개미만 해지고 생쥐가 집채만 해져 쿵 내려앉는다.',
    palette: { bg: '#9fdc6a', ink: '#3a2a14', muted: '#7a6a4a', accent: '#ffcf3a', hot: '#ff5f3a', soft: '#fff6dc' },
  },
  guard: (s) => (s.phase === 'play' ? s.w.walkers.filter((id) => s.w.th[id].st !== 3).length : s.w.walkers.length),
  cleared: (s) => (s.phase === 'result' ? { stage: s.stage, got: s.got, of: s.ofStars } : null),
  reveals: (s) => s.seen.size,
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      seed, t: 0, stage: 0, w: null as unknown as World, phase: 'play', pt: 0, why: '', hearts: 3, pts: 0, got: 0, ofStars: 1, starOk: [false],
      sel: -1, lock: false, down: false, dex: DEX.map(() => 0), newDex: [], again: false, tries: 0, dead: false, won: false, calm: 0,
      slow: 0, album: 0, firstTap: -1, firstBig: -1, wowN: 0, seen: new Set<string>(), events: [], banner: null, spot: null, big: null, flags: [], best: [], replays: 0,
      hint: null, hintsHere: 0, failsHere: 0, hintStage: -1, autoAt: -1, prog: 0, progT: 0, chain: 0,
    } as SwapState;
    hintKeyQ = 0;
    newStage(s, false);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ?? null, fresh = !!p && !s.down;
    s.down = !!p;
    if (hintKeyQ > 0) (hintKeyQ = 0), s.phase === 'play' && showHint(s);
    if (s.phase === 'story') {
      s.pt++;
      if (s.pt >= STORY_T || (fresh && s.pt > 40)) (s.phase = 'play'), (s.pt = 0), s.banner && (s.banner.t = s.t), s.spot && (s.spot.t = s.t), (s.progT = s.t), ev(s, 'storyend');
    } else if (s.phase === 'play') {
      if (fresh) {
        if (s.firstTap < 0) s.firstTap = s.t;
        tapAt(s, p!.x, p!.y * A);
      }
      if (s.autoAt >= 0 && s.t >= s.autoAt) (s.autoAt = -1), showHint(s);
      if (s.slow > 0) s.slow--;
      if (s.slow % 2 === 0) tick(s.w);
      absorb(s);
      const pg = progressOf(s.w);
      if (pg > s.prog || s.w.pend) (s.prog = Math.max(s.prog, pg)), (s.progT = s.t);
      s.calm = settled(s.w) ? s.calm + 1 : 0;
      if (s.w.fail) failStage(s, '사육사에게 잡혔어요!');
      else if (allOut(s.w)) clearStage(s);
      else if (s.calm > 20 && s.w.swaps >= budgetOf(STAGES[s.stage])) failStage(s, '뿅을 다 썼는데 막혔어요');
    } else if (s.phase === 'result') {
      s.pt++;
      const replay = fresh && s.pt > 60 && s.got < s.ofStars && !s.won && inBox(p!.x, p!.y * A, REPLAY);
      if (replay) (s.replays++, newStage(s, false), ev(s, 'retry'));
      else if (s.pt >= RESULT_T + (s.got < s.ofStars ? 90 : 0) || (fresh && s.pt > 60)) {
        const nd = STAGES[s.stage + 1];
        // 장이 끝나면(또는 마지막 판) 도감 한 쪽이 펼쳐진다
        if (s.won || (nd && nd.ch !== STAGES[s.stage].ch)) (s.phase = 'album'), (s.pt = 0), (s.album = STAGES[s.stage].ch), ev(s, 'album');
        else (s.stage++), newStage(s, false);
      }
    } else if (s.phase === 'album') {
      s.pt++;
      if (s.pt >= ALBUM_T || (fresh && s.pt > 70)) {
        if (s.won) s.dead = true;
        // 새 장: 이야기 한 컷 → 판
        else (s.stage++), newStage(s, false), (s.phase = 'story'), (s.pt = 0), ev(s, 'story');
      }
    } else {
      s.pt++;
      if (s.pt >= FAIL_T) {
        if (s.hearts <= 0) s.dead = true;
        else newStage(s, true);
      }
    }
    if (s.events.length > 80) s.events = s.events.filter((e) => s.t - e.t < 90);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const sizeswap = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at01 = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });
const tapThing = (s: SwapState, id: number) => at01(...hitCenter(s.w, s.w.th[id]));
/** 한 쌍을 바꾸는 톡 (지금 골라진 것에 맞춰) */
function tapPair(s: SwapState, a: number, b: number): Input {
  if (s.sel < 0) return tapThing(s, a);
  if (s.sel === a) return tapThing(s, b);
  if (s.sel === b) return tapThing(s, a);
  return tapThing(s, s.sel); // 엉뚱한 것이 골라져 있으면 먼저 내려놓기
}
const ready = (s: SwapState, calm: number) => s.phase === 'play' && !s.down && !s.w.pend && s.calm >= calm;

/** 잘하는 봇: 바꿀 쌍마다 물리를 끝까지 돌려 보고(너비 우선), 가장 적게 바꿔 모두 탈출하는 순서대로 */
export const sizeswapSmart: Bot<SwapState> = {
  name: '물리를 돌려 보고 바꾸기',
  act(s) {
    // 결과·도감은 잠깐 보고 '다음' 톡
    if ((s.phase === 'result' && s.pt > 64) || (s.phase === 'album' && s.pt > 80) || (s.phase === 'story' && s.pt > 46)) return s.down ? NO : at01(NEXT[0], NEXT[1]);
    if (!ready(s, 8)) return NO;
    const plan = solve(s.stage, s.w, budgetOf(STAGES[s.stage]) - s.w.swaps);
    if (!plan || !plan.length) return plan ? NO : at01(RETRY[0], RETRY[1]);
    return tapPair(s, plan[0][0], plan[0][1]);
  },
};

const dumbMem = new WeakMap<object, { next: number; down: boolean; x: number; y: number }>();
/** 못하는 봇: 아무 때나 아무 데나 톡 */
export const sizeswapRandom: Bot<SwapState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 10 + Math.floor(rng() * 40), down: false, x: 0.5, y: 0.5 }));
    if (s.t >= m.next) {
      m.down = !m.down;
      if (m.down) {
        m.next = s.t + 3 + Math.floor(rng() * 6);
        m.x = 0.04 + rng() * 0.92;
        m.y = 0.13 + rng() * 0.8;
      } else m.next = s.t + 14 + Math.floor(rng() * 50);
    }
    return m.down ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y } } : NO;
  },
};

/** 주인공: 막혀 있는 동물 중 가장 앞선 것(없으면 아직 안 나간 첫 동물) */
function hero(s: SwapState): Th | null {
  let best: Th | null = null;
  for (const id of s.w.walkers) {
    const o = s.w.th[id];
    if (o.st === 2 || o.st === 3) continue;
    if (!best || (o.st === 1 && (best.st !== 1 || o.s > best.s))) best = o;
  }
  return best;
}
/** 버릇 봇 1: 늘 주인공과 (주인공 말고) 가장 큰 것을 바꾼다 */
export const sizeswapHabit: Bot<SwapState> = {
  name: '늘 주인공과 가장 큰 것 바꾸기',
  act(s) {
    if (!ready(s, 8)) return NO;
    const hr = hero(s);
    if (!hr) return NO;
    const [hx, hy] = hitCenter(s.w, hr);
    let best: Th | null = null, bd = 1e9;
    for (const o of s.w.th) {
      if (o === hr || !swappable(o)) continue;
      const [x, y] = hitCenter(s.w, o), d = Math.hypot(x - hx, y - hy);
      if (!best || o.z > best.z || (o.z === best.z && d < bd)) (best = o), (bd = d);
    }
    return best ? tapPair(s, hr.id, best.id) : NO;
  },
};
/** 버릇 봇 2: 늘 화면에서 가장 가까운 두 개(크기가 다른 것)를 바꾼다 */
export const sizeswapHabit2: Bot<SwapState> = {
  name: '늘 가장 가까운 두 개 바꾸기',
  act(s) {
    if (!ready(s, 8)) return NO;
    let pair: [number, number] | null = null, bd = 1e9;
    const ids = s.w.th.filter(swappable).map((o) => o.id);
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const a = s.w.th[ids[i]], b = s.w.th[ids[j]];
        if (a.z === b.z) continue;
        const [ax, ay] = hitCenter(s.w, a), [bx, by] = hitCenter(s.w, b), d = Math.hypot(ax - bx, ay - by);
        if (d < bd) (bd = d), (pair = [a.id, b.id]);
      }
    return pair ? tapPair(s, pair[0], pair[1]) : NO;
  },
};
void mulberry32;
/** 분석·테스트용 (판 바로 가기 · 시뮬 복제) */
export const __jump = (s: SwapState, i: number) => ((s.stage = i), newStage(s, false));
export const cloneW = cloneWorld, pairs = pairsOf, swapNow = doSwap;

// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const OUT = '#4a2a12';
const hsh = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (u: number) => 1 - (1 - clamp(u, 0, 1)) ** 2;
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
function ell(ctx: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}
function lin(ctx: C2, x0: number, y0: number, x1: number, y1: number, ...st: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of st) g.addColorStop(o, c);
  return g;
}
function radg(ctx: C2, x: number, y: number, r0: number, r1: number, ...st: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(0.1, r1));
  for (const [o, c] of st) g.addColorStop(o, c);
  return g;
}
function rr(ctx: C2, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)));
}
function starPath(ctx: C2, x: number, y: number, r: number, k = 0.45, n = 5) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n, q = i % 2 ? r * k : r;
    if (i) ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
    else ctx.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
}
function heartPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.9, y - r * 1.25, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.9, y - r * 1.25, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
  ctx.closePath();
}
function stroke(ctx: C2, col: string, lw: number) {
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.stroke();
}
const BGC = new Map<string, HTMLCanvasElement>();
function layer(w: number, h: number, sc: number, paint: (c: C2) => void) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * sc));
  c.height = Math.max(1, Math.ceil(h * sc));
  const g = c.getContext('2d')!;
  g.scale(sc, sc);
  paint(g);
  return c;
}

// ── 장마다 색 ──
interface Pal { sky: [string, string, string]; far: string; hill: [string, string]; lawn: [string, string]; walk: [string, string]; edge: [string, string]; fg: [string, string]; tree: [string, string]; trunk: string }
const PAL: Pal[] = [
  { sky: ['#6fcaff', '#bfeaff', '#fff5d2'], far: '#b9e6a2', hill: ['#a8e07a', '#86cc58'], lawn: ['#9fdc6a', '#7cc64e'], walk: ['#f6e1ad', '#e4c487'], edge: ['#c08f55', '#8e6236'], fg: ['#93d861', '#6bbd43'], tree: ['#6cc24f', '#4ea63a'], trunk: '#8a5a32' },
  { sky: ['#ffc977', '#ffe6ad', '#fff3d6'], far: '#f0cf8a', hill: ['#e6c66a', '#cfa94a'], lawn: ['#d9cc68', '#bfb24c'], walk: ['#ecc08e', '#d39a62'], edge: ['#a3633a', '#7a4524'], fg: ['#c9d05c', '#a6b941'], tree: ['#8fbf45', '#6fa233'], trunk: '#7a4a2a' },
  { sky: ['#82d4ff', '#cdefff', '#fff1e4'], far: '#c9dff0', hill: ['#9fdc6a', '#7fc650'], lawn: ['#a3dc72', '#82c656'], walk: ['#efe3d0', '#d6c4a8'], edge: ['#a8957c', '#80705c'], fg: ['#9fdc6a', '#76c24a'], tree: ['#5fbf58', '#43a142'], trunk: '#86603a' },
];

/** 장마다 굳은 배경(하늘·먼 풍경·뒤 언덕·두 층 산책로·미끄럼틀·가운데 잔디) — 한 번만 그려 두고 쓴다 */
function getBg(ch: number, w: number, h: number, sc: number): HTMLCanvasElement {
  const key = `${ch}|${w}x${h}@${sc}`;
  const hit = BGC.get(key);
  if (hit) return hit;
  const P = PAL[ch], R = (v: number) => v * w;
  const c = layer(w, h, sc, (g) => {
    // 하늘
    g.fillStyle = lin(g, 0, 0, 0, R(0.6), [0, P.sky[0]], [0.6, P.sky[1]], [1, P.sky[2]]);
    g.fillRect(0, 0, w, R(0.62));
    g.fillStyle = radg(g, R(0.82), R(0.2), 0, R(0.5), [0, 'rgba(255,252,220,.95)'], [0.25, 'rgba(255,246,200,.4)'], [1, 'rgba(255,246,200,0)']);
    g.fillRect(0, 0, w, R(0.65));
    // 먼 산/건물
    g.fillStyle = P.far;
    g.beginPath();
    g.moveTo(0, R(0.56));
    for (let x = 0; x <= 1.001; x += 0.02) g.lineTo(R(x), R(0.4 - 0.04 * Math.sin(x * 5 + ch) - 0.02 * Math.sin(x * 13 + ch * 2)));
    g.lineTo(w, R(0.56));
    g.fill();
    if (ch === 2) {
      for (let i = 0; i < 5; i++) {
        const bx = R(0.06 + i * 0.22), by = R(0.42 + hsh(i) * 0.02), bw = R(0.13), bh = R(0.07);
        g.fillStyle = ['#f6d7b0', '#ffe4c4', '#f0c8a0'][i % 3];
        g.fillRect(bx - bw / 2, by - bh, bw, bh + R(0.1));
        g.fillStyle = ['#e0675a', '#5aa0e0', '#f0a030'][i % 3];
        g.beginPath();
        g.moveTo(bx - bw * 0.62, by - bh);
        g.lineTo(bx, by - bh - R(0.05));
        g.lineTo(bx + bw * 0.62, by - bh);
        g.fill();
        g.fillStyle = 'rgba(80,120,170,.6)';
        for (let k = 0; k < 2; k++) g.fillRect(bx - bw * 0.3 + k * bw * 0.4, by - bh * 0.6, bw * 0.18, bh * 0.3);
      }
    }
    // 뒤 언덕(위층 뒤)
    g.fillStyle = P.hill[0];
    g.beginPath();
    g.moveTo(0, R(GY1));
    for (let x = 0; x <= 1.001; x += 0.02) g.lineTo(R(x), R(0.46 - 0.03 * Math.sin(x * 6 + 1) - 0.015 * Math.sin(x * 15 + 2)));
    g.lineTo(w, R(GY1));
    g.fill();
    // 먼 나무
    for (let i = 0; i < 7; i++) {
      const tx = R(0.04 + i * 0.155 + hsh(i + 40) * 0.05), ty = R(0.47 + hsh(i + 41) * 0.02), tr = R(0.03 + hsh(i + 42) * 0.015);
      g.fillStyle = P.trunk;
      g.fillRect(tx - tr * 0.12, ty - tr * 0.6, tr * 0.24, tr * 0.8);
      g.fillStyle = i % 2 ? P.tree[0] : P.tree[1];
      if (ch === 1) (ell(g, tx, ty - tr * 0.9, tr * 1.6, tr * 0.42), g.fill());
      else {
        g.beginPath();
        g.arc(tx, ty - tr * 1.05, tr, 0, TAU);
        g.arc(tx - tr * 0.65, ty - tr * 0.65, tr * 0.7, 0, TAU);
        g.arc(tx + tr * 0.65, ty - tr * 0.65, tr * 0.7, 0, TAU);
        g.fill();
      }
    }
    // 뒤 잔디 + 관람로 울타리
    g.fillStyle = lin(g, 0, R(0.48), 0, R(GY1), [0, P.lawn[0]], [1, P.lawn[1]]);
    g.beginPath();
    g.moveTo(0, R(0.51));
    for (let x = 0; x <= 1.001; x += 0.05) g.lineTo(R(x), R(0.5 - 0.008 * Math.sin(x * 9 + ch)));
    g.lineTo(w, R(GY1));
    g.lineTo(0, R(GY1));
    g.fill();
    const fy = R(0.505);
    for (let x = 0.01; x < 1; x += 0.05) {
      g.fillStyle = ch === 0 ? '#ffffff' : ch === 1 ? '#a87444' : '#6f7d8c';
      rr(g, R(x) - R(0.005), fy - R(0.04), R(0.01), R(0.045), R(0.003));
      g.fill();
    }
    g.fillStyle = ch === 0 ? '#f4f4f4' : ch === 1 ? '#946238' : '#5f6d7c';
    g.fillRect(0, fy - R(0.032), w, R(0.007));
    g.fillRect(0, fy - R(0.016), w, R(0.007));

    // ── 산책로 한 층(윗면 + 앞면 두께) ──
    const walk = (gy: number, x0: number, x1: number) => {
      const top = R(gy - 0.07), fr = R(gy + 0.07), bot = R(gy + 0.15);
      g.fillStyle = 'rgba(40,60,20,.25)';
      g.fillRect(R(x0), bot, R(x1 - x0), R(0.02));
      g.fillStyle = lin(g, 0, top, 0, fr, [0, P.walk[1]], [0.45, P.walk[0]], [1, P.walk[0]]);
      g.fillRect(R(x0), top, R(x1 - x0), fr - top);
      if (ch === 2) {
        g.strokeStyle = 'rgba(120,100,80,.28)';
        g.lineWidth = 1;
        for (let row = 0; row < 3; row++) {
          const yy = top + (fr - top) * (row / 3);
          g.beginPath();
          g.moveTo(R(x0), yy);
          g.lineTo(R(x1), yy);
          g.stroke();
          for (let x = x0 + (row % 2) * 0.035; x < x1; x += 0.07) {
            g.beginPath();
            g.moveTo(R(x), yy);
            g.lineTo(R(x) - R(0.008), yy + (fr - top) / 3);
            g.stroke();
          }
        }
      } else
        for (let i = 0; i < 50; i++) {
          g.fillStyle = `rgba(120,80,40,${0.08 + 0.1 * hsh(i + 62 + gy * 9)})`;
          ell(g, R(x0 + (x1 - x0) * hsh(i + 60 + gy * 7)), top + (fr - top) * (0.15 + 0.75 * hsh(i + 61 + gy)), R(0.008), R(0.004));
          g.fill();
        }
      g.fillStyle = lin(g, 0, fr, 0, bot, [0, P.edge[0]], [1, P.edge[1]]);
      g.fillRect(R(x0), fr, R(x1 - x0), bot - fr);
      g.fillStyle = 'rgba(255,255,255,.3)';
      g.fillRect(R(x0), fr, R(x1 - x0), R(0.007));
      g.strokeStyle = 'rgba(60,35,20,.3)';
      g.lineWidth = 1;
      for (let x = x0; x < x1; x += ch === 0 ? 0.1 : 0.08) {
        g.beginPath();
        g.moveTo(R(x), fr);
        g.lineTo(R(x), bot);
        g.stroke();
      }
      if (ch !== 0) {
        g.beginPath();
        g.moveTo(R(x0), (fr + bot) / 2);
        g.lineTo(R(x1), (fr + bot) / 2);
        g.stroke();
      }
    };
    // 가운데 잔디(두 층 사이) — 위층 앞면 아래부터 아래층 뒤까지
    g.fillStyle = lin(g, 0, R(GY1 + 0.15), 0, R(GY2), [0, P.fg[1]], [1, P.fg[0]]);
    g.fillRect(0, R(GY1 + 0.12), w, R(GY2 - GY1));
    for (let i = 0; i < 4; i++) {
      g.fillStyle = 'rgba(255,255,230,.07)';
      g.fillRect(0, R(GY1 + 0.2 + i * 0.075), w, R(0.03));
    }
    for (let i = 0; i < 22; i++) {
      const fx = R(0.03 + 0.8 * hsh(i + 80)), fy2 = R(GY1 + 0.19 + 0.3 * hsh(i + 81)), k = R(0.009 + 0.005 * hsh(i + 82));
      if (ch === 1) {
        g.strokeStyle = 'rgba(120,110,40,.6)';
        g.lineWidth = 1.2;
        g.beginPath();
        for (const a of [-0.4, 0, 0.4]) (g.moveTo(fx, fy2), g.lineTo(fx + Math.sin(a) * k * 3, fy2 - Math.cos(a) * k * 3));
        g.stroke();
      } else {
        g.fillStyle = ['#ffffff', '#ffd84a', '#ff9ec4', '#b9a2ff'][i % 4];
        for (let q = 0; q < 5; q++) (ell(g, fx + Math.cos((q * TAU) / 5) * k, fy2 + Math.sin((q * TAU) / 5) * k, k * 0.75, k * 0.75), g.fill());
        g.fillStyle = '#ffb020';
        ell(g, fx, fy2, k * 0.55, k * 0.55);
        g.fill();
      }
    }
    // 아래 잔디 띠
    g.fillStyle = lin(g, 0, R(GY2 + 0.12), 0, R(1.42), [0, P.fg[0]], [1, P.fg[1]]);
    g.fillRect(0, R(GY2 + 0.12), w, R(1.42) - R(GY2 + 0.12));
    walk(GY1, 0, 0.93);
    walk(GY2, 0, 0.93);
    // ── 미끄럼틀(오른쪽, 위층 → 아래층) ──
    const sx = R(0.88), sw2 = R(0.11);
    for (const sd of [-1, 1]) {
      g.fillStyle = '#c99a62';
      rr(g, sx + sd * R(0.06) - R(0.008), R(GY1 - 0.02), R(0.016), R(GY2 - GY1 + 0.1), R(0.004));
      g.fill();
    }
    g.fillStyle = lin(g, sx - sw2 / 2, 0, sx + sw2 / 2, 0, [0, '#ff6a5a'], [0.5, '#ff9a6a'], [1, '#e84a3a']);
    g.beginPath();
    g.moveTo(sx - sw2 / 2, R(GY1 - 0.04));
    g.bezierCurveTo(sx - sw2 / 2 + R(0.08), R(GY1 + 0.2), sx - sw2 / 2 - R(0.04), R(GY2 - 0.25), sx - sw2 / 2, R(GY2 - 0.02));
    g.lineTo(sx + sw2 / 2, R(GY2 - 0.02));
    g.bezierCurveTo(sx + sw2 / 2 - R(0.04), R(GY2 - 0.25), sx + sw2 / 2 + R(0.08), R(GY1 + 0.2), sx + sw2 / 2, R(GY1 - 0.04));
    g.closePath();
    g.fill();
    stroke(g, OUT, 1.6);
    g.strokeStyle = 'rgba(255,255,255,.55)';
    g.lineWidth = R(0.008);
    g.beginPath();
    g.moveTo(sx - R(0.02), R(GY1));
    g.bezierCurveTo(sx + R(0.05), R(GY1 + 0.2), sx - R(0.06), R(GY2 - 0.25), sx - R(0.02), R(GY2 - 0.04));
    g.stroke();
    g.fillStyle = '#ffd23a';
    g.font = `900 ${Math.max(9, R(0.026))}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.save();
    g.translate(sx + R(0.002), R((GY1 + GY2) / 2));
    g.rotate(Math.PI / 2);
    g.fillText('미끄럼틀', 0, 0);
    g.restore();
    // ── 왼쪽 위: 우리(동물이 사는 곳) ──
    const hx = R(0.07), hy = R(GY1 - 0.07);
    g.fillStyle = ch === 0 ? '#e8584a' : ch === 1 ? '#c98a4a' : '#5a9be0';
    g.fillRect(hx - R(0.07), hy - R(0.13), R(0.14), R(0.13));
    g.fillStyle = ch === 0 ? '#b8392e' : ch === 1 ? '#8e5a2a' : '#3a6fb0';
    g.beginPath();
    g.moveTo(hx - R(0.09), hy - R(0.13));
    g.lineTo(hx, hy - R(0.2));
    g.lineTo(hx + R(0.09), hy - R(0.13));
    g.fill();
    g.fillStyle = '#4a2a12';
    rr(g, hx - R(0.028), hy - R(0.08), R(0.056), R(0.08), R(0.024));
    g.fill();
    g.fillStyle = '#fff6dc';
    rr(g, hx - R(0.05), hy - R(0.176), R(0.1), R(0.032), R(0.01));
    g.fill();
    g.fillStyle = '#4a2a12';
    g.font = `800 ${Math.max(9, R(0.024))}px system-ui, sans-serif`;
    g.fillText('우리', hx, hy - R(0.16));
    // ── 왼쪽 아래: 출구 아치 ──
    const ex = R(0.055);
    for (const sd of [-1, 1]) {
      g.fillStyle = lin(g, ex + sd * R(0.045) - R(0.012), 0, ex + sd * R(0.045) + R(0.012), 0, [0, '#c9a06a'], [1, '#9a7040']);
      rr(g, ex + sd * R(0.045) - R(0.012), R(GY2 - 0.3), R(0.024), R(0.3), R(0.006));
      g.fill();
    }
  });
  BGC.set(key, c);
  return c;
}

// ── 동물(옆모습, 오른쪽을 본다) ──
type Face = 'idle' | 'shock' | 'strain' | 'happy' | 'scared' | 'dizzy' | 'proud';
/** hide: 거북이 등껍질 속으로 숨은 정도(0~1) */
interface Look { t: number; ph: number; face: Face; sq: number; lift: number; walk: number; tall: number; swim: number; seed: number; hide?: number }
const SKIN: Record<string, { a: string; b: string; belly: string; dark: string }> = {
  elephant: { a: '#c3cedb', b: '#8f9db0', belly: '#d8e0ea', dark: '#6c7a8e' },
  mouse: { a: '#d4c3b2', b: '#a08c7a', belly: '#f1e6da', dark: '#7a6656' },
  rabbit: { a: '#ffffff', b: '#dfe3ec', belly: '#ffffff', dark: '#b8bfcc' },
  piglet: { a: '#ffd0da', b: '#f59ab0', belly: '#ffe2e8', dark: '#d97690' },
  hippo: { a: '#b8aad6', b: '#8676a8', belly: '#dccbe6', dark: '#655789' },
  giraffe: { a: '#ffd85a', b: '#efb23a', belly: '#fff0b8', dark: '#c47a2c' },
  turtle: { a: '#b6e48a', b: '#86c45c', belly: '#e6f5b8', dark: '#4f8a35' },
  panda: { a: '#ffffff', b: '#e3e6ee', belly: '#ffffff', dark: '#2d2d38' },
  penguin: { a: '#3b4560', b: '#232a3c', belly: '#ffffff', dark: '#151a28' },
  lion: { a: '#ffcf62', b: '#e7a33a', belly: '#ffe6a8', dark: '#b9701e' },
  zebra: { a: '#ffffff', b: '#e4e6ee', belly: '#ffffff', dark: '#2a2a36' },
  koala: { a: '#c4cad4', b: '#949cab', belly: '#eceef3', dark: '#3e4350' },
};
function eyeAt(ctx: C2, x: number, y: number, s: number, face: Face, L: Look) {
  const blink = face === 'idle' && (L.t + L.seed * 53) % 200 < 6;
  ctx.lineCap = 'round';
  if (face === 'happy' || face === 'proud' || blink) {
    ctx.strokeStyle = '#2a1608';
    ctx.lineWidth = Math.max(1.2, s * 0.45);
    ctx.beginPath();
    if (blink) (ctx.moveTo(x - s, y), ctx.lineTo(x + s, y));
    else ctx.arc(x, y + s * 0.5, s, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    return;
  }
  if (face === 'strain') {
    ctx.strokeStyle = '#2a1608';
    ctx.lineWidth = Math.max(1.2, s * 0.42);
    ctx.beginPath();
    ctx.moveTo(x - s, y - s * 0.7);
    ctx.lineTo(x + s * 0.6, y);
    ctx.lineTo(x - s, y + s * 0.7);
    ctx.stroke();
    return;
  }
  if (face === 'dizzy') {
    ctx.strokeStyle = '#2a1608';
    ctx.lineWidth = Math.max(1, s * 0.3);
    ctx.beginPath();
    for (let q = 0; q < 12; q++) {
      const a = q * 0.8 + L.t * 0.3, r2 = s * 0.12 + q * s * 0.09;
      q ? ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    return;
  }
  const big = face === 'shock' || face === 'scared' ? 1.35 : 1;
  ctx.fillStyle = '#ffffff';
  ell(ctx, x, y, s * 1.05 * big, s * 1.2 * big);
  ctx.fill();
  stroke(ctx, '#2a1608', Math.max(0.8, s * 0.22));
  ctx.fillStyle = '#2a1608';
  const pr = face === 'shock' || face === 'scared' ? 0.45 : 0.78;
  ell(ctx, x + s * 0.18, y + s * 0.05, s * pr, s * pr * 1.12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ell(ctx, x + s * 0.38, y - s * 0.3, s * 0.3, s * 0.3);
  ctx.fill();
}
function mouthAt(ctx: C2, x: number, y: number, s: number, face: Face) {
  ctx.strokeStyle = '#5a2a14';
  ctx.lineWidth = Math.max(1, s * 0.3);
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (face === 'shock' || face === 'scared') {
    ctx.fillStyle = '#7a2a1a';
    ell(ctx, x, y + s * 0.3, s * 0.55, s * 0.75);
    ctx.fill();
    return;
  }
  if (face === 'happy' || face === 'proud') {
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(x, y, s * 0.8, 0.1, Math.PI - 0.1);
    ctx.fill();
    return;
  }
  if (face === 'strain') (ctx.moveTo(x - s * 0.6, y + s * 0.2), ctx.lineTo(x + s * 0.6, y));
  else ctx.arc(x, y - s * 0.2, s * 0.6, 0.3, Math.PI - 0.3);
  ctx.stroke();
}
function blush(ctx: C2, x: number, y: number, s: number) {
  ctx.fillStyle = 'rgba(255,120,140,.45)';
  ell(ctx, x, y, s * 1.2, s * 0.7);
  ctx.fill();
}
/** 다리 하나(둥근 막대) */
function leg(ctx: C2, x: number, y0: number, len: number, wd: number, ang: number, col: string, hoof?: string) {
  ctx.save();
  ctx.translate(x, y0);
  ctx.rotate(ang);
  ctx.fillStyle = col;
  rr(ctx, -wd / 2, 0, wd, len, wd * 0.45);
  ctx.fill();
  stroke(ctx, OUT, Math.max(1, wd * 0.16));
  if (hoof) {
    ctx.fillStyle = hoof;
    rr(ctx, -wd / 2, len - wd * 0.42, wd, wd * 0.42, wd * 0.2);
    ctx.fill();
  }
  ctx.restore();
}
/** 동물 하나: (x, y)는 발밑, r은 크기 반지름(px) */
function drawAnimal(ctx: C2, k: Kind, x: number, y: number, r: number, L: Look) {
  const S = SKIN[k] ?? SKIN.mouse, lw = Math.max(1.2, r * 0.07);
  ctx.save();
  ctx.translate(x, y - L.lift);
  ctx.scale(1 + L.sq, 1 - L.sq);
  const sw = Math.sin(L.ph) * 0.42 * L.walk, bob = Math.abs(Math.sin(L.ph)) * r * 0.05 * L.walk;
  ctx.translate(0, -bob);
  const body = (cx: number, cy: number, rx: number, ry: number) => {
    ctx.fillStyle = lin(ctx, 0, cy - ry, 0, cy + ry, [0, S.a], [1, S.b]);
    ell(ctx, cx, cy, rx, ry);
    ctx.fill();
    stroke(ctx, OUT, lw);
  };
  const face = L.face;
  switch (k) {
    case 'penguin': {
      // 서 있는 몸
      for (const sd of [-1, 1]) {
        ctx.fillStyle = '#ff9a2a';
        ell(ctx, sd * r * 0.22 + r * 0.1 + (sd > 0 ? sw : -sw) * r * 0.2, -r * 0.05, r * 0.24, r * 0.1);
        ctx.fill();
      }
      ctx.fillStyle = lin(ctx, -r * 0.6, 0, r * 0.6, 0, [0, S.b], [1, S.a]);
      ell(ctx, 0, -r * 0.95, r * 0.62, r * 0.98);
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.fillStyle = '#ffffff';
      ell(ctx, r * 0.2, -r * 0.82, r * 0.4, r * 0.75);
      ctx.fill();
      // 날개
      ctx.save();
      ctx.translate(-r * 0.15, -r * 1.05);
      ctx.rotate(0.25 + Math.sin(L.t * 0.25) * 0.15 * (L.walk + 0.3));
      ctx.fillStyle = S.b;
      ell(ctx, 0, r * 0.35, r * 0.16, r * 0.45);
      ctx.fill();
      ctx.restore();
      // 부리
      ctx.fillStyle = '#ffa53a';
      ctx.beginPath();
      ctx.moveTo(r * 0.5, -r * 1.55);
      ctx.lineTo(r * 0.9, -r * 1.45);
      ctx.lineTo(r * 0.5, -r * 1.38);
      ctx.fill();
      eyeAt(ctx, r * 0.32, -r * 1.62, r * 0.1, face, L);
      blush(ctx, r * 0.36, -r * 1.36, r * 0.1);
      break;
    }
    case 'turtle': {
      const hd = L.hide ?? 0;
      if (hd > 0.5) {
        // 등껍질 속으로 쏙 — 납작 엎드린 돌멩이처럼
        ctx.translate(0, r * 0.28);
      } else {
      for (const [lx, far] of [[-0.55, 1], [0.45, 1], [-0.45, 0], [0.55, 0]] as [number, number][]) leg(ctx, r * lx, -r * 0.35, r * 0.36, r * 0.26, (far ? -sw : sw) * 0.6, far ? S.b : S.a);
      // 머리·목
      ctx.fillStyle = S.a;
      rr(ctx, r * 0.55, -r * 0.62, r * 0.55, r * 0.24, r * 0.12);
      ctx.fill();
      ell(ctx, r * 1.12, -r * 0.62, r * 0.32, r * 0.27);
      ctx.fill();
      stroke(ctx, OUT, lw);
      eyeAt(ctx, r * 1.18, -r * 0.7, r * 0.1, face, L);
      mouthAt(ctx, r * 1.3, -r * 0.54, r * 0.09, face);
      }
      // 등껍질
      ctx.fillStyle = lin(ctx, 0, -r * 1.25, 0, -r * 0.3, [0, '#6fcf55'], [1, '#2f8a35']);
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.4, r * 0.98, r * 0.82, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.strokeStyle = 'rgba(220,255,180,.55)';
      ctx.lineWidth = Math.max(1, r * 0.06);
      for (const [hx, hy] of [[-0.45, -0.62], [0.05, -0.85], [0.5, -0.6], [-0.1, -0.5]]) {
        ctx.beginPath();
        for (let q = 0; q < 6; q++) {
          const a = (q * TAU) / 6;
          ctx[q ? 'lineTo' : 'moveTo'](r * hx + Math.cos(a) * r * 0.2, r * hy + Math.sin(a) * r * 0.17);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.fillStyle = '#c9ef98';
      rr(ctx, -r * 1.0, -r * 0.46, r * 2.0, r * 0.14, r * 0.07);
      ctx.fill();
      break;
    }
    default: {
      const g = k === 'giraffe', legLen = g ? r * 0.95 : k === 'piglet' || k === 'hippo' ? r * 0.38 : r * 0.48;
      const by = -legLen - r * 0.55, legW = k === 'elephant' || k === 'hippo' ? r * 0.36 : g ? r * 0.18 : r * 0.24;
      const hoof = g ? '#6a3a1a' : k === 'piglet' ? '#b85a70' : k === 'elephant' ? '#eef2f6' : k === 'panda' ? undefined : undefined;
      const legCol = k === 'panda' ? S.dark : undefined;
      // 꼬리
      ctx.strokeStyle = k === 'mouse' ? '#e0a0a0' : k === 'piglet' ? S.b : S.dark;
      ctx.lineWidth = Math.max(1, r * (k === 'mouse' ? 0.07 : 0.08));
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (k === 'mouse') (ctx.moveTo(-r * 0.85, by + r * 0.2), ctx.bezierCurveTo(-r * 1.5, by + r * 0.4, -r * 1.7, by - r * 0.5, -r * 1.35, by - r * 0.6));
      else if (k === 'piglet') {
        ctx.moveTo(-r * 0.92, by - r * 0.1);
        for (let q = 0; q <= 14; q++) {
          const a = q * 0.75, rd = r * 0.05 + q * r * 0.012;
          ctx.lineTo(-r * 1.1 + Math.cos(a) * rd, by - r * 0.2 + Math.sin(a) * rd);
        }
      } else if (k !== 'rabbit' && k !== 'panda') (ctx.moveTo(-r * 0.9, by - r * 0.1), ctx.quadraticCurveTo(-r * 1.25, by + r * 0.1, -r * 1.2, by + r * 0.5));
      ctx.stroke();
      if (k === 'lion' || k === 'elephant' || k === 'giraffe') {
        ctx.fillStyle = k === 'lion' ? '#a8521a' : S.dark;
        ell(ctx, -r * 1.2, by + r * 0.55, r * 0.1, r * 0.14);
        ctx.fill();
      }
      // 먼 다리
      leg(ctx, -r * 0.45, by + r * 0.3, legLen + r * 0.2, legW, -sw, legCol ?? S.b, hoof);
      leg(ctx, r * 0.42, by + r * 0.3, legLen + r * 0.2, legW, sw, legCol ?? S.b, hoof);
      // 몸
      if (k === 'rabbit') body(-r * 0.05, by + r * 0.05, r * 0.88, r * 0.66);
      else if (k === 'mouse') body(0, by + r * 0.12, r * 0.92, r * 0.6);
      else body(0, by, r * (g ? 0.92 : 1.0), r * (g ? 0.6 : 0.72));
      if (k === 'zebra') {
        // 줄무늬
        ctx.save();
        ell(ctx, 0, by, r, r * 0.72);
        ctx.clip();
        ctx.strokeStyle = S.dark;
        ctx.lineWidth = Math.max(1.5, r * 0.11);
        for (let q = -4; q <= 4; q++) {
          ctx.beginPath();
          ctx.moveTo(q * r * 0.24, by - r * 0.8);
          ctx.quadraticCurveTo(q * r * 0.24 + r * 0.12, by, q * r * 0.24 - r * 0.04, by + r * 0.5);
          ctx.stroke();
        }
        ctx.restore();
      }
      if (k === 'panda') {
        ctx.fillStyle = S.dark;
        ctx.beginPath();
        ctx.ellipse(r * 0.2, by - r * 0.1, r * 0.34, r * 0.66, 0.15, 0, TAU);
        ctx.fill();
      }
      if (g) {
        ctx.fillStyle = S.dark;
        for (const [px, py, pr] of [[-0.5, -0.1, 0.18], [-0.1, 0.12, 0.2], [0.35, -0.12, 0.17], [-0.2, -0.38, 0.13], [0.55, 0.2, 0.13]]) {
          ell(ctx, r * px, by + r * py, r * pr, r * pr * 0.8, px);
          ctx.fill();
        }
      }
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ell(ctx, -r * 0.2, by - r * 0.38, r * 0.45, r * 0.16, -0.1);
      ctx.fill();
      // 가까운 다리
      leg(ctx, -r * 0.6, by + r * 0.35, legLen + r * 0.2, legW, sw, legCol ?? S.a, hoof);
      leg(ctx, r * 0.55, by + r * 0.35, legLen + r * 0.2, legW, -sw, legCol ?? S.a, hoof);
      if (k === 'rabbit') {
        ctx.fillStyle = '#ffffff';
        ell(ctx, -r * 0.92, by - r * 0.1, r * 0.22, r * 0.2);
        ctx.fill();
        stroke(ctx, OUT, lw * 0.8);
      }
      // 머리 위치
      let hx = r * 0.78, hy = by - r * 0.5, hr = r * 0.58;
      if (k === 'mouse') (hx = r * 0.8), (hy = by - r * 0.15), (hr = r * 0.5);
      if (k === 'piglet') (hy = by - r * 0.35), (hr = r * 0.56);
      if (g) {
        // 긴 목: 키(크기+2)만큼 위로
        const top = -L.tall + r * 0.3;
        hx = r * 0.95;
        hy = top;
        hr = r * 0.4;
        ctx.fillStyle = lin(ctx, r * 0.4, 0, r * 0.95, 0, [0, S.b], [1, S.a]);
        ctx.beginPath();
        ctx.moveTo(r * 0.35, by - r * 0.2);
        ctx.lineTo(r * 0.72, top + r * 0.1);
        ctx.lineTo(r * 1.08, top + r * 0.15);
        ctx.lineTo(r * 0.85, by + r * 0.05);
        ctx.closePath();
        ctx.fill();
        stroke(ctx, OUT, lw);
        ctx.fillStyle = S.dark;
        for (let q = 0; q < 4; q++) {
          const u = (q + 0.5) / 4;
          ell(ctx, lerp(r * 0.62, r * 0.88, u), lerp(by - r * 0.1, top + r * 0.2, u), r * 0.09, r * 0.12);
          ctx.fill();
        }
        // 갈기
        ctx.strokeStyle = '#a0521a';
        ctx.lineWidth = Math.max(1.5, r * 0.09);
        ctx.beginPath();
        ctx.moveTo(r * 0.38, by - r * 0.25);
        ctx.lineTo(r * 0.72, top + r * 0.12);
        ctx.stroke();
      }
      if (k === 'lion') {
        // 갈기
        ctx.fillStyle = lin(ctx, hx, hy - hr * 1.4, hx, hy + hr * 1.4, [0, '#e2852e'], [1, '#a8521a']);
        ctx.beginPath();
        for (let q = 0; q < 16; q++) {
          const a = (q * TAU) / 16, rd = hr * (q % 2 ? 1.25 : 1.5);
          ctx[q ? 'lineTo' : 'moveTo'](hx - r * 0.06 + Math.cos(a) * rd, hy + Math.sin(a) * rd);
        }
        ctx.closePath();
        ctx.fill();
        stroke(ctx, OUT, lw);
      }
      // 귀(머리 뒤)
      if (k === 'elephant') {
        ctx.save();
        ctx.translate(hx - hr * 0.45, hy + hr * 0.05);
        ctx.rotate(Math.sin(L.t * 0.08 + L.seed) * 0.12);
        ctx.fillStyle = lin(ctx, 0, -hr, 0, hr, [0, S.a], [1, S.b]);
        ell(ctx, 0, 0, hr * 0.78, hr * 0.95);
        ctx.fill();
        stroke(ctx, OUT, lw);
        ctx.fillStyle = '#f5c2cf';
        ell(ctx, hr * 0.08, hr * 0.05, hr * 0.5, hr * 0.68);
        ctx.fill();
        ctx.restore();
      }
      if (k === 'rabbit') {
        for (const [ax, rot] of [[-0.25, -0.35], [0.12, -0.12]]) {
          ctx.save();
          ctx.translate(hx + hr * ax, hy - hr * 0.7);
          ctx.rotate(rot + Math.sin(L.t * 0.06 + ax * 9) * 0.06);
          ctx.fillStyle = S.a;
          ell(ctx, 0, -hr * 0.85, hr * 0.27, hr * 0.92);
          ctx.fill();
          stroke(ctx, OUT, lw);
          ctx.fillStyle = '#ffc0cf';
          ell(ctx, 0, -hr * 0.85, hr * 0.13, hr * 0.68);
          ctx.fill();
          ctx.restore();
        }
      }
      if (k === 'mouse') {
        for (const ax of [-0.35, 0.2]) {
          ctx.fillStyle = S.a;
          ell(ctx, hx + hr * ax, hy - hr * 0.85, hr * 0.5, hr * 0.5);
          ctx.fill();
          stroke(ctx, OUT, lw);
          ctx.fillStyle = '#ffbfc9';
          ell(ctx, hx + hr * ax, hy - hr * 0.85, hr * 0.32, hr * 0.32);
          ctx.fill();
        }
      }
      if (k === 'koala') {
        for (const ax of [-0.6, 0.45]) {
          ctx.fillStyle = S.b;
          ell(ctx, hx + hr * ax, hy - hr * 0.55, hr * 0.48, hr * 0.46);
          ctx.fill();
          stroke(ctx, OUT, lw);
          ctx.fillStyle = '#ffffff';
          ell(ctx, hx + hr * ax, hy - hr * 0.55, hr * 0.28, hr * 0.27);
          ctx.fill();
        }
      }
      if (k === 'zebra') {
        // 갈기 + 뾰족 귀
        ctx.fillStyle = S.dark;
        ctx.beginPath();
        for (let q = 0; q <= 6; q++) {
          const u = q / 6, mx = lerp(hx - hr * 0.6, r * 0.2, u), my = lerp(hy - hr * 0.7, by - r * 0.55, u);
          ctx.lineTo(mx - r * 0.08, my - r * (q % 2 ? 0.12 : 0.04));
        }
        ctx.lineTo(r * 0.25, by - r * 0.45);
        ctx.lineTo(hx - hr * 0.4, hy - hr * 0.5);
        ctx.fill();
        for (const ax of [-0.25, 0.05]) {
          ctx.fillStyle = S.a;
          ctx.beginPath();
          ctx.moveTo(hx + hr * ax - hr * 0.15, hy - hr * 0.55);
          ctx.lineTo(hx + hr * ax, hy - hr * 1.15);
          ctx.lineTo(hx + hr * ax + hr * 0.15, hy - hr * 0.55);
          ctx.fill();
          stroke(ctx, OUT, lw * 0.8);
        }
      }
      if (k === 'panda' || k === 'hippo' || k === 'lion') {
        for (const ax of [-0.45, 0.25]) {
          ctx.fillStyle = k === 'panda' ? S.dark : k === 'lion' ? '#e7a33a' : S.b;
          ell(ctx, hx + hr * ax, hy - hr * 0.82, hr * 0.26, hr * 0.26);
          ctx.fill();
          stroke(ctx, OUT, lw * 0.8);
        }
      }
      // 머리
      if (k === 'hippo') {
        ctx.fillStyle = lin(ctx, 0, hy - hr, 0, hy + hr, [0, S.a], [1, S.b]);
        rr(ctx, hx - hr * 0.8, hy - hr * 0.85, hr * 2.0, hr * 1.55, hr * 0.7);
        ctx.fill();
        stroke(ctx, OUT, lw);
        ctx.fillStyle = S.dark;
        for (const nx of [0.75, 1.0]) (ell(ctx, hx + hr * nx, hy - hr * 0.35, hr * 0.08, hr * 0.06), ctx.fill());
      } else if (k === 'mouse') {
        ctx.fillStyle = lin(ctx, 0, hy - hr, 0, hy + hr, [0, S.a], [1, S.b]);
        ctx.beginPath();
        ctx.ellipse(hx, hy, hr, hr * 0.85, 0, Math.PI * 0.5, Math.PI * 1.5);
        ctx.quadraticCurveTo(hx + hr * 1.5, hy - hr * 0.2, hx + hr * 1.35, hy + hr * 0.15);
        ctx.quadraticCurveTo(hx + hr * 0.9, hy + hr * 0.85, hx, hy + hr * 0.85);
        ctx.fill();
        stroke(ctx, OUT, lw);
        ctx.fillStyle = '#ff8fa3';
        ell(ctx, hx + hr * 1.38, hy + hr * 0.08, hr * 0.14, hr * 0.12);
        ctx.fill();
        ctx.strokeStyle = 'rgba(80,50,30,.6)';
        ctx.lineWidth = Math.max(0.8, r * 0.025);
        ctx.beginPath();
        for (const dy of [-0.05, 0.12]) (ctx.moveTo(hx + hr * 1.1, hy + hr * dy), ctx.lineTo(hx + hr * 1.75, hy + hr * (dy * 2 - 0.05)));
        ctx.stroke();
      } else {
        ctx.fillStyle = lin(ctx, 0, hy - hr, 0, hy + hr, [0, S.a], [1, S.b]);
        if (g) ell(ctx, hx, hy, hr * 1.05, hr * 0.72);
        else if (k === 'zebra') ell(ctx, hx + hr * 0.2, hy + hr * 0.05, hr * 1.15, hr * 0.7, 0.35);
        else ell(ctx, hx, hy, hr, hr * 0.94);
        ctx.fill();
        stroke(ctx, OUT, lw);
      }
      if (g) {
        // 뿔(오시콘)
        ctx.strokeStyle = '#c47a2c';
        ctx.lineWidth = Math.max(1.5, r * 0.07);
        ctx.fillStyle = '#7a3a12';
        for (const ox of [-0.35, 0.05]) {
          ctx.beginPath();
          ctx.moveTo(hx + hr * ox, hy - hr * 0.55);
          ctx.lineTo(hx + hr * ox - hr * 0.08, hy - hr * 1.15);
          ctx.stroke();
          ell(ctx, hx + hr * ox - hr * 0.08, hy - hr * 1.18, hr * 0.13, hr * 0.13);
          ctx.fill();
        }
        ctx.fillStyle = '#fff0b8';
        ell(ctx, hx + hr * 0.7, hy + hr * 0.15, hr * 0.42, hr * 0.32);
        ctx.fill();
      }
      if (k === 'panda') {
        ctx.fillStyle = S.dark;
        ell(ctx, hx + hr * 0.28, hy - hr * 0.08, hr * 0.26, hr * 0.32, -0.4);
        ctx.fill();
      }
      if (k === 'zebra') {
        ctx.fillStyle = '#3a3a46';
        ell(ctx, hx + hr * 1.05, hy + hr * 0.42, hr * 0.38, hr * 0.3, 0.35);
        ctx.fill();
        ctx.strokeStyle = S.dark;
        ctx.lineWidth = Math.max(1.2, r * 0.07);
        for (const q of [-0.1, 0.25]) {
          ctx.beginPath();
          ctx.moveTo(hx + hr * q, hy - hr * 0.55);
          ctx.lineTo(hx + hr * (q + 0.15), hy + hr * 0.2);
          ctx.stroke();
        }
      }
      if (k === 'koala') {
        ctx.fillStyle = '#2a2a33';
        ell(ctx, hx + hr * 0.78, hy + hr * 0.12, hr * 0.24, hr * 0.32);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ell(ctx, hx + hr * 0.72, hy - hr * 0.02, hr * 0.07, hr * 0.1);
        ctx.fill();
      }
      if (k === 'lion') {
        ctx.fillStyle = '#ffe6a8';
        ell(ctx, hx + hr * 0.55, hy + hr * 0.25, hr * 0.42, hr * 0.32);
        ctx.fill();
        ctx.fillStyle = '#6a3410';
        ell(ctx, hx + hr * 0.9, hy + hr * 0.05, hr * 0.12, hr * 0.09);
        ctx.fill();
      }
      if (k === 'piglet') {
        ctx.fillStyle = '#ffb3c4';
        ell(ctx, hx + hr * 0.95, hy + hr * 0.1, hr * 0.26, hr * 0.32);
        ctx.fill();
        stroke(ctx, OUT, lw * 0.8);
        ctx.fillStyle = '#c45a74';
        for (const ny of [-0.06, 0.24]) (ell(ctx, hx + hr * 1.0, hy + hr * ny, hr * 0.05, hr * 0.07), ctx.fill());
        ctx.fillStyle = S.b;
        ctx.beginPath();
        ctx.moveTo(hx - hr * 0.3, hy - hr * 0.75);
        ctx.lineTo(hx + hr * 0.05, hy - hr * 1.15);
        ctx.lineTo(hx + hr * 0.25, hy - hr * 0.62);
        ctx.fill();
      }
      if (k === 'rabbit') {
        ctx.fillStyle = '#ff9fb2';
        ell(ctx, hx + hr * 0.9, hy + hr * 0.05, hr * 0.12, hr * 0.1);
        ctx.fill();
      }
      // 코끼리 코
      if (k === 'elephant') {
        const sway = Math.sin(L.t * 0.07 + L.seed) * 0.15 + (face === 'happy' ? -0.5 : 0);
        ctx.strokeStyle = S.b;
        ctx.lineWidth = hr * 0.42;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hx + hr * 0.6, hy + hr * 0.2);
        ctx.quadraticCurveTo(hx + hr * 1.35, hy + hr * 0.5, hx + hr * (1.3 + sway * 0.3), hy + hr * (1.2 + sway));
        ctx.stroke();
        ctx.strokeStyle = OUT;
        ctx.lineWidth = lw;
        ctx.stroke();
        ctx.strokeStyle = S.a;
        ctx.lineWidth = hr * 0.26;
        ctx.stroke();
      }
      // 얼굴
      const ex = hx + hr * (g ? 0.3 : k === 'hippo' ? 0.25 : 0.38), ey = hy - hr * (k === 'hippo' ? 0.5 : 0.12);
      eyeAt(ctx, ex, ey, Math.max(1.2, hr * (k === 'mouse' ? 0.2 : 0.18)), face, L);
      blush(ctx, ex - hr * 0.05, ey + hr * 0.42, Math.max(1, hr * 0.14));
      if (k !== 'elephant') mouthAt(ctx, hx + hr * (k === 'hippo' ? 0.85 : k === 'piglet' ? 0.62 : 0.68), hy + hr * (k === 'hippo' ? 0.35 : 0.42), Math.max(1, hr * 0.12), face);
    }
  }
  // 땀(낑낑)
  if (face === 'strain' || face === 'scared') {
    ctx.fillStyle = '#7fd4ff';
    const sx = r * 0.3, sy = -r * 2.0 + Math.sin(L.t * 0.3) * r * 0.05;
    ctx.beginPath();
    ctx.moveTo(sx, sy - r * 0.18);
    ctx.quadraticCurveTo(sx + r * 0.12, sy, sx, sy + r * 0.06);
    ctx.quadraticCurveTo(sx - r * 0.12, sy, sx, sy - r * 0.18);
    ctx.fill();
  }
  ctx.restore();
}

// ── 사육사(사람, 왼쪽을 본다) ──
type KMode = 'duty' | 'alarm' | 'flee' | 'knock' | 'grin' | 'cover';
function drawKeeper(ctx: C2, x: number, y: number, r: number, mode: KMode, t: number, cap: boolean, seed: number) {
  const lw = Math.max(1.2, r * 0.07);
  ctx.save();
  ctx.translate(x, y);
  if (mode === 'knock') {
    // 벌러덩 누워 빙글빙글 별
    ctx.rotate(-Math.PI / 2 + 0.08);
    ctx.translate(-r * 0.2, r * 0.0);
  }
  const run = mode === 'flee' ? Math.sin(t * 0.6) : 0, lookL = mode === 'duty' ? Math.sin(t * 0.03 + seed) > -0.2 : true;
  ctx.scale(lookL ? 1 : -1, 1);
  // 다리
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * r * 0.16, -r * 0.95);
    ctx.rotate(run * 0.6 * sd);
    ctx.fillStyle = '#c9a66a';
    rr(ctx, -r * 0.13, 0, r * 0.26, r * 0.9, r * 0.1);
    ctx.fill();
    stroke(ctx, OUT, lw);
    ctx.fillStyle = '#6a3a1a';
    rr(ctx, -r * 0.2, r * 0.78, r * 0.34, r * 0.17, r * 0.07);
    ctx.fill();
    ctx.restore();
  }
  // 몸
  ctx.fillStyle = lin(ctx, 0, -r * 1.85, 0, -r * 0.85, [0, '#5fbf5a'], [1, '#3e9a43']);
  rr(ctx, -r * 0.42, -r * 1.85, r * 0.84, r * 1.0, r * 0.3);
  ctx.fill();
  stroke(ctx, OUT, lw);
  ctx.fillStyle = '#7a4a1a';
  ctx.fillRect(-r * 0.42, -r * 1.02, r * 0.84, r * 0.1);
  ctx.fillStyle = '#ffe14a';
  ctx.fillRect(-r * 0.05, -r * 1.02, r * 0.1, r * 0.1);
  // 주머니·명찰
  ctx.fillStyle = '#ffffff';
  rr(ctx, r * 0.05, -r * 1.6, r * 0.22, r * 0.12, r * 0.03);
  ctx.fill();
  // 팔 + 잠자리채
  const armUp = mode === 'flee' || mode === 'alarm';
  ctx.save();
  ctx.translate(-r * 0.3, -r * 1.65);
  ctx.rotate(armUp ? 2.6 + Math.sin(t * 0.5) * 0.3 : mode === 'grin' ? 1.2 : 0.75 + Math.sin(t * 0.05) * 0.05);
  ctx.fillStyle = '#5fbf5a';
  rr(ctx, -r * 0.1, 0, r * 0.2, r * 0.62, r * 0.09);
  ctx.fill();
  stroke(ctx, OUT, lw);
  ctx.fillStyle = '#ffd7b0';
  ell(ctx, 0, r * 0.66, r * 0.11, r * 0.11);
  ctx.fill();
  if (mode !== 'flee' && mode !== 'knock') {
    // 잠자리채: 손에서 앞으로
    ctx.strokeStyle = '#8a5a2a';
    ctx.lineWidth = Math.max(1.5, r * 0.07);
    ctx.beginPath();
    ctx.moveTo(0, r * 0.66);
    ctx.lineTo(0, r * 1.7);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, r * 0.05);
    ell(ctx, 0, r * 2.0, r * 0.32, r * 0.3);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fill();
  }
  ctx.restore();
  // 머리
  const hy = -r * 2.08;
  ctx.fillStyle = '#ffd7b0';
  ell(ctx, 0, hy, r * 0.4, r * 0.4);
  ctx.fill();
  stroke(ctx, OUT, lw);
  // 콧수염·코
  ctx.fillStyle = '#6a3a1a';
  ell(ctx, -r * 0.22, hy + r * 0.14, r * 0.17, r * 0.07, 0.2);
  ctx.fill();
  ctx.fillStyle = '#f2b08a';
  ell(ctx, -r * 0.33, hy + r * 0.02, r * 0.09, r * 0.09);
  ctx.fill();
  const L: Look = { t, ph: 0, face: mode === 'flee' || mode === 'alarm' ? 'scared' : mode === 'knock' ? 'dizzy' : mode === 'grin' ? 'happy' : 'idle', sq: 0, lift: 0, walk: 0, tall: 0, swim: 0, seed };
  ctx.save();
  ctx.scale(-1, 1);
  eyeAt(ctx, r * 0.12, hy - r * 0.06, Math.max(1, r * 0.07), L.face, L);
  ctx.restore();
  if (mode === 'flee' || mode === 'alarm') {
    ctx.fillStyle = '#7a2a1a';
    ell(ctx, -r * 0.2, hy + r * 0.25, r * 0.08, r * 0.1);
    ctx.fill();
  }
  if (cap) drawHatShape(ctx, -r * 0.02, hy - r * 0.28, r * 0.52, 0);
  ctx.restore();
  if (mode === 'knock') {
    // 머리 위 별
    for (let q = 0; q < 3; q++) {
      const a = t * 0.12 + (q * TAU) / 3;
      ctx.fillStyle = '#ffe14a';
      starPath(ctx, x - r * 1.9 + Math.cos(a) * r * 0.4, y - r * 0.5 + Math.sin(a) * r * 0.15, Math.max(3, r * 0.15));
      ctx.fill();
    }
  }
}
/** 사육사 모자(사파리 모자): (x, y)는 모자 아래 가운데, s는 반 폭 */
function drawHatShape(ctx: C2, x: number, y: number, s: number, tilt: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  const lw = Math.max(1.2, s * 0.08);
  ctx.fillStyle = lin(ctx, 0, -s, 0, 0, [0, '#f2dc9e'], [1, '#cdb46e']);
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.62, s * 0.7, 0, Math.PI, 0);
  ctx.fill();
  stroke(ctx, OUT, lw);
  ctx.fillStyle = '#3e9a43';
  ctx.fillRect(-s * 0.62, -s * 0.18, s * 1.24, s * 0.16);
  ctx.fillStyle = lin(ctx, 0, -s * 0.1, 0, s * 0.15, [0, '#e8cf88'], [1, '#bfa55e']);
  ell(ctx, 0, 0, s, s * 0.18);
  ctx.fill();
  stroke(ctx, OUT, lw);
  ctx.restore();
}

// ── 길 위 장애물 ──
/** 구멍(굴): 장마다 벽돌 쥐구멍 · 바위 굴 · 개찰구 */
function drawHole(ctx: C2, ch: number, cx: number, gy: number, z: number, R: (v: number) => number, glow: number) {
  const S = (v: number) => R(v * 1.4);
  const bw = S(0.1), bh = R(blockH(z)), oh = R(holeH(z)), x0 = cx - bw / 2, top = gy - bh, dep = S(0.05);
  // 윗면(안쪽으로)
  ctx.fillStyle = ch === 0 ? '#d97a5a' : ch === 1 ? '#a89a8a' : '#7fb35e';
  ctx.beginPath();
  ctx.moveTo(x0, top);
  ctx.lineTo(x0 + dep * 0.5, top - dep * 0.55);
  ctx.lineTo(x0 + bw + dep * 0.5, top - dep * 0.55);
  ctx.lineTo(x0 + bw, top);
  ctx.closePath();
  ctx.fill();
  stroke(ctx, OUT, 1.5);
  // 옆면(오른쪽)
  ctx.fillStyle = ch === 0 ? '#a8492e' : ch === 1 ? '#6f6458' : '#4f8a3a';
  ctx.beginPath();
  ctx.moveTo(x0 + bw, top);
  ctx.lineTo(x0 + bw + dep * 0.5, top - dep * 0.55);
  ctx.lineTo(x0 + bw + dep * 0.5, gy - dep * 0.55);
  ctx.lineTo(x0 + bw, gy);
  ctx.closePath();
  ctx.fill();
  // 앞면
  const face = ctx.createLinearGradient(0, top, 0, gy);
  if (ch === 0) (face.addColorStop(0, '#ef8a63'), face.addColorStop(1, '#c75f3e'));
  else if (ch === 1) (face.addColorStop(0, '#c9bba8'), face.addColorStop(1, '#8e8170'));
  else (face.addColorStop(0, '#8ccd66'), face.addColorStop(1, '#5a9e3e'));
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.rect(x0, top, bw, bh);
  // 굴(아치) — 높이가 곧 크기
  const ow = Math.min(bw * 0.86, Math.max(S(0.045), oh * 0.92));
  ctx.moveTo(cx - ow / 2, gy);
  ctx.lineTo(cx - ow / 2, gy - oh + ow / 2);
  ctx.arc(cx, gy - oh + ow / 2, ow / 2, Math.PI, 0);
  ctx.lineTo(cx + ow / 2, gy);
  ctx.closePath();
  ctx.fill('evenodd');
  ctx.save();
  ctx.clip('evenodd');
  if (ch === 0) {
    ctx.strokeStyle = 'rgba(120,40,20,.45)';
    ctx.lineWidth = 1;
    const bhh = S(0.022);
    for (let yy = gy, row = 0; yy > top; yy -= bhh, row++) {
      ctx.beginPath();
      ctx.moveTo(x0, yy);
      ctx.lineTo(x0 + bw, yy);
      ctx.stroke();
      for (let xx = x0 + ((row % 2) * S(0.025)); xx < x0 + bw; xx += S(0.05)) {
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.lineTo(xx, yy - bhh);
        ctx.stroke();
      }
    }
  } else if (ch === 1) {
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    for (let q = 0; q < 6; q++) (ell(ctx, x0 + bw * hsh(q + z * 7), top + bh * hsh(q + 3), S(0.012), S(0.008)), ctx.fill());
  } else {
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    for (let q = 0; q < 10; q++) (ell(ctx, x0 + bw * hsh(q + 11), top + bh * hsh(q + 13), S(0.008), S(0.008)), ctx.fill());
  }
  ctx.restore();
  ctx.beginPath();
  ctx.rect(x0, top, bw, bh);
  stroke(ctx, OUT, 1.6);
  // 굴 안 어둠
  ctx.fillStyle = lin(ctx, 0, gy - oh, 0, gy, [0, '#2a1608'], [1, '#4a2a12']);
  ctx.beginPath();
  ctx.moveTo(cx - ow / 2, gy);
  ctx.lineTo(cx - ow / 2, gy - oh + ow / 2);
  ctx.arc(cx, gy - oh + ow / 2, ow / 2, Math.PI, 0);
  ctx.lineTo(cx + ow / 2, gy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = glow > 0 ? `rgba(255,220,80,${0.5 + 0.5 * glow})` : ch === 0 ? '#8a5a2a' : '#5a4a3a';
  ctx.lineWidth = Math.max(2, S(0.008));
  ctx.stroke();
  if (ch === 2) {
    // 개찰구 표지
    ctx.fillStyle = '#ffffff';
    rr(ctx, cx - S(0.03), top + S(0.008), S(0.06), S(0.022), S(0.006));
    ctx.fill();
    ctx.fillStyle = '#3a6fb0';
    ctx.font = `800 ${Math.max(8, S(0.016))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('입장', cx, top + S(0.019));
  }
}
/** 우리 문: 크면 높고 두껍고 쇠띠 · 열리면 안쪽으로 젖혀짐 · 부서지면 판자 조각 */
function drawGate(ctx: C2, cx: number, gy: number, z: number, R: (v: number) => number, ang: number, broken: boolean, ch: number) {
  const S = (v: number) => R(v * 1.4);
  const dh = R(doorH(z)), dw = S(0.04 + 0.008 * z), ph = Math.max(dh + S(0.03), S(0.12));
  // 기둥 둘(뒤·앞)
  for (const sd of [-1, 1]) {
    const px = cx + sd * (dw / 2 + S(0.012));
    ctx.fillStyle = lin(ctx, px - S(0.01), 0, px + S(0.01), 0, [0, ch === 2 ? '#9aa6b2' : '#b07a48'], [1, ch === 2 ? '#6c7884' : '#7a4e28']);
    rr(ctx, px - S(0.01), gy - ph, S(0.02), ph, S(0.004));
    ctx.fill();
    stroke(ctx, OUT, 1.3);
    ctx.fillStyle = ch === 2 ? '#c4ccd4' : '#d8a46a';
    ell(ctx, px, gy - ph, S(0.012), S(0.006));
    ctx.fill();
  }
  if (broken) {
    ctx.fillStyle = '#b07a48';
    for (let q = 0; q < 4; q++) {
      ctx.save();
      ctx.translate(cx - dw + q * dw * 0.6, gy - S(0.006));
      ctx.rotate(-0.3 + q * 0.25);
      rr(ctx, -S(0.025), -S(0.006), S(0.05), S(0.012), S(0.004));
      ctx.fill();
      stroke(ctx, OUT, 1);
      ctx.restore();
    }
    return;
  }
  // 문짝: 안쪽(뒤)으로 젖혀질수록 가로가 좁아지고 위로 물러난다
  const k = Math.cos(ang), back = Math.sin(ang) * S(0.03);
  ctx.save();
  ctx.translate(cx + dw / 2, gy - back);
  ctx.scale(Math.max(0.08, k), 1);
  const x0 = -dw;
  ctx.fillStyle = lin(ctx, x0, 0, 0, 0, [0, ang > 0.2 ? '#a06a38' : '#d9a066'], [1, ang > 0.2 ? '#7a4e28' : '#b27840']);
  rr(ctx, x0, -dh, dw, dh, S(0.006));
  ctx.fill();
  stroke(ctx, OUT, 1.6);
  ctx.strokeStyle = 'rgba(90,50,20,.45)';
  ctx.lineWidth = 1;
  for (let q = 1; q < 3; q++) {
    ctx.beginPath();
    ctx.moveTo(x0 + (dw * q) / 3, -dh + 2);
    ctx.lineTo(x0 + (dw * q) / 3, -2);
    ctx.stroke();
  }
  // 쇠띠·자물쇠: 크기만큼
  ctx.fillStyle = '#6f7a86';
  const bands = Math.max(1, z - 1);
  for (let q = 0; q < bands; q++) {
    const yy = -dh * ((q + 0.6) / (bands + 0.2));
    ctx.fillRect(x0, yy - S(0.004), dw, S(0.008));
    ctx.fillStyle = '#c4ccd4';
    ell(ctx, x0 + S(0.008), yy, S(0.003), S(0.003));
    ctx.fill();
    ctx.fillStyle = '#6f7a86';
  }
  if (z >= 4) {
    ctx.fillStyle = '#ffcf3a';
    rr(ctx, x0 - S(0.006), -dh * 0.5, S(0.022), S(0.026), S(0.004));
    ctx.fill();
    stroke(ctx, OUT, 1);
  }
  ctx.restore();
}
/** 연못: 길을 끊고 물이 찬다 — 크면 길고 깊다 */
function drawPond(ctx: C2, ch: number, cx: number, gy: number, z: number, R: (v: number) => number, t: number, P: Pal, dry = 0) {
  const S = (v: number) => R(v * 1.4);
  const hl = R(0.056 + 0.03 * z), top0 = gy - R(0.07), fr = gy + R(0.07), bot = gy + R(0.15), deep = Math.min(fr + R(0.04 + 0.04 * z), R(1.4) + (gy > 1 ? 0 : 9e9));
  // 코끼리가 마시면 물이 쭉 내려가고 진흙 바닥이 드러난다
  const top = lerp(top0, deep - S(0.02), dry);
  if (dry > 0) {
    ctx.fillStyle = P.fg[0];
    ctx.fillRect(cx - hl, fr, hl * 2, Math.max(bot, deep) - fr + S(0.01));
    ctx.fillStyle = lin(ctx, 0, top0, 0, deep, [0, '#b08a5a'], [1, '#7a5530']);
    ctx.beginPath();
    ctx.moveTo(cx - hl, top0 + S(0.012));
    ctx.lineTo(cx + hl, top0 + S(0.012));
    ctx.lineTo(cx + hl, deep);
    ctx.lineTo(cx - hl, deep);
    ctx.closePath();
    ctx.fill();
    stroke(ctx, '#5a3a1a', 1.4);
    ctx.fillStyle = '#c9a272';
    ell(ctx, cx, top0 + S(0.05), hl * 0.96, S(0.03));
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,58,26,.6)';
    ctx.lineWidth = 1.2;
    for (let q = 0; q < 4; q++) {
      const qx = cx - hl * 0.7 + q * hl * 0.45;
      ctx.beginPath();
      ctx.moveTo(qx, top0 + S(0.035));
      ctx.lineTo(qx + S(0.012), top0 + S(0.05));
      ctx.lineTo(qx - S(0.004), top0 + S(0.065));
      ctx.stroke();
    }
    if (dry >= 0.98) {
      // 마른 바닥에서 파닥파닥 물고기 한 마리
      const fy = top0 + S(0.04) - Math.abs(Math.sin(t * 0.25)) * S(0.03);
      ctx.fillStyle = '#ffa53a';
      ell(ctx, cx + hl * 0.3, fy, S(0.012), S(0.007), Math.sin(t * 0.5) * 0.6);
      ctx.fill();
    }
    if (dry >= 0.98) {
      for (const sd of [-1, 1]) {
        ctx.fillStyle = ch === 1 ? '#a89a8a' : '#c8c0b0';
        ell(ctx, cx + sd * hl, gy + S(0.01), S(0.016), S(0.04));
        ctx.fill();
        stroke(ctx, OUT, 1.2);
      }
      return;
    }
  }
  // 길 앞면을 파내고 유리 수조처럼 물 깊이를 보인다
  ctx.fillStyle = P.fg[0];
  ctx.fillRect(cx - hl, fr, hl * 2, Math.max(bot, deep) - fr + S(0.01));
  ctx.fillStyle = lin(ctx, 0, top, 0, deep, [0, '#7ad8ff'], [0.4, '#3fb0ea'], [1, '#1f78c0']);
  ctx.beginPath();
  ctx.moveTo(cx - hl, top + S(0.012));
  ctx.lineTo(cx + hl, top + S(0.012));
  ctx.lineTo(cx + hl, deep - S(0.02));
  ctx.quadraticCurveTo(cx + hl, deep, cx + hl - S(0.02), deep);
  ctx.lineTo(cx - hl + S(0.02), deep);
  ctx.quadraticCurveTo(cx - hl, deep, cx - hl, deep - S(0.02));
  ctx.closePath();
  ctx.fill();
  stroke(ctx, '#1a5a8a', 1.6);
  // 물 표면(윗면)
  ctx.fillStyle = 'rgba(200,240,255,.75)';
  ell(ctx, cx, top + S(0.05), hl * 0.96, S(0.03));
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  ctx.lineWidth = 1.2;
  for (let q = 0; q < 3; q++) {
    const u = ((t * 0.01 + q / 3) % 1), rx = hl * (0.25 + 0.6 * u);
    ctx.globalAlpha = 1 - u;
    ell(ctx, cx + Math.sin(q * 2.1) * hl * 0.3, top + S(0.05), rx, rx * 0.22);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // 수조 안: 물풀·물고기·거품
  ctx.strokeStyle = '#2f9a5a';
  ctx.lineWidth = Math.max(1.5, S(0.005));
  for (let q = 0; q < 3; q++) {
    const qx = cx - hl * 0.7 + q * hl * 0.7;
    ctx.beginPath();
    ctx.moveTo(qx, deep - 2);
    ctx.quadraticCurveTo(qx + Math.sin(t * 0.05 + q) * S(0.01), deep - S(0.03), qx, deep - S(0.05));
    ctx.stroke();
  }
  if (z >= 2) {
    const fx = cx + Math.sin(t * 0.02) * hl * 0.6, fy = (fr + deep) / 2;
    ctx.fillStyle = '#ffa53a';
    ell(ctx, fx, fy, S(0.012), S(0.007));
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(fx - S(0.01) * Math.sign(Math.cos(t * 0.02)), fy);
    ctx.lineTo(fx - S(0.02) * Math.sign(Math.cos(t * 0.02)), fy - S(0.007));
    ctx.lineTo(fx - S(0.02) * Math.sign(Math.cos(t * 0.02)), fy + S(0.007));
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  for (let q = 0; q < 3; q++) {
    const by = deep - ((t * 0.6 + q * 40) % (deep - fr));
    ell(ctx, cx - hl * 0.4 + q * hl * 0.4, by, S(0.004), S(0.004));
    ctx.fill();
  }
  // 수련잎
  ctx.fillStyle = '#5cc25a';
  ell(ctx, cx + hl * 0.45, top + S(0.04), S(0.02), S(0.008));
  ctx.fill();
  // 둑(양쪽 돌)
  for (const sd of [-1, 1]) {
    ctx.fillStyle = ch === 1 ? '#a89a8a' : '#c8c0b0';
    ell(ctx, cx + sd * hl, gy + S(0.01), S(0.016), S(0.04));
    ctx.fill();
    stroke(ctx, OUT, 1.2);
  }
}
/** 쇠창살 정문 + 누름판 사슬 */
function drawIron(ctx: C2, cx: number, gy: number, lift: number, R: (v: number) => number, keyLock = false) {
  const S = (v: number) => R(v * 1.4);
  const ph = S(0.3), hw = S(0.05);
  ctx.fillStyle = 'rgba(0,0,0,.15)';
  ell(ctx, cx, gy + S(0.005), hw * 1.6, S(0.012));
  ctx.fill();
  // 창살
  const by = gy - lift;
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - hw, gy - ph, hw * 2, ph);
  ctx.clip();
  ctx.strokeStyle = '#5a6470';
  ctx.lineWidth = Math.max(2, S(0.008));
  for (let q = 0; q < 5; q++) {
    const bx = cx - hw + (q + 0.5) * (hw * 2) / 5;
    ctx.beginPath();
    ctx.moveTo(bx, by - ph);
    ctx.lineTo(bx, by - S(0.008));
    ctx.stroke();
    ctx.fillStyle = '#5a6470';
    ctx.beginPath();
    ctx.moveTo(bx - S(0.006), by - S(0.012));
    ctx.lineTo(bx, by);
    ctx.lineTo(bx + S(0.006), by - S(0.012));
    ctx.fill();
  }
  for (const yy of [0.25, 0.6]) {
    ctx.fillStyle = '#6f7a86';
    ctx.fillRect(cx - hw, by - ph * yy, hw * 2, S(0.008));
  }
  ctx.restore();
  // 돌기둥 둘 + 가로 들보
  for (const sd of [-1, 1]) {
    ctx.fillStyle = lin(ctx, cx + sd * hw - S(0.018), 0, cx + sd * hw + S(0.018), 0, [0, '#d8d0c4'], [1, '#9a9080']);
    rr(ctx, cx + sd * hw - S(0.018), gy - ph - S(0.02), S(0.036), ph + S(0.02), S(0.006));
    ctx.fill();
    stroke(ctx, OUT, 1.5);
  }
  ctx.fillStyle = lin(ctx, 0, gy - ph - S(0.05), 0, gy - ph, [0, '#e8e0d4'], [1, '#b0a694']);
  rr(ctx, cx - hw - S(0.03), gy - ph - S(0.05), hw * 2 + S(0.06), S(0.04), S(0.008));
  ctx.fill();
  stroke(ctx, OUT, 1.5);
  ctx.fillStyle = '#ffcf3a';
  ctx.font = `900 ${Math.max(9, S(0.022))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('정문', cx, gy - ph - S(0.03));
  if (keyLock && lift < R(0.05)) {
    // 열쇠 구멍 자물쇠: 높은 가지의 열쇠와 짝
    const ly = gy - ph * 0.45;
    ctx.fillStyle = '#ffcf3a';
    rr(ctx, cx - S(0.022), ly - S(0.012), S(0.044), S(0.036), S(0.008));
    ctx.fill();
    stroke(ctx, OUT, 1.4);
    ctx.strokeStyle = '#ffcf3a';
    ctx.lineWidth = Math.max(2, S(0.008));
    ctx.beginPath();
    ctx.arc(cx, ly - S(0.012), S(0.014), Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#4a2a12';
    ell(ctx, cx, ly + S(0.002), S(0.005), S(0.005));
    ctx.fill();
    ctx.fillRect(cx - S(0.002), ly + S(0.002), S(0.004), S(0.012));
  }
}
/** 열쇠가 걸리는 높이(가로 폭 단위) — 커다란 기린 머리 높이 */
const KEY_Y = 0.215;
/** 높은 가지의 열쇠 나무 */
function drawKeyTree(ctx: C2, x: number, gy: number, taken: boolean, t: number, R: (v: number) => number, P: Pal, ch: number) {
  const ky = R(KEY_Y), bx = x - R(0.07);
  // 줄기(길 뒤)
  ctx.fillStyle = lin(ctx, bx - R(0.016), 0, bx + R(0.016), 0, [0, P.trunk], [1, '#5a3a1a']);
  rr(ctx, bx - R(0.016), ky - R(0.04), R(0.032), gy - ky + R(0.04), R(0.01));
  ctx.fill();
  stroke(ctx, OUT, 1.4);
  // 잎 뭉치
  ctx.fillStyle = ch === 1 ? '#7cb24a' : P.tree[0];
  ctx.beginPath();
  for (const [dx, dy, r] of [[-0.03, -0.06, 0.05], [0.02, -0.075, 0.055], [-0.065, -0.02, 0.04]] as [number, number, number][]) {
    ctx.moveTo(bx + R(dx + r), ky + R(dy));
    ctx.arc(bx + R(dx), ky + R(dy), R(r), 0, TAU);
  }
  ctx.fill();
  stroke(ctx, OUT, 1.2);
  // 열쇠가 걸린 가지
  ctx.strokeStyle = P.trunk;
  ctx.lineWidth = Math.max(2, R(0.01));
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx, ky - R(0.01));
  ctx.quadraticCurveTo(bx + R(0.04), ky - R(0.035), x + R(0.01), ky - R(0.03));
  ctx.stroke();
  if (taken) return;
  const sw = Math.sin(t * 0.06) * 0.25;
  ctx.save();
  ctx.translate(x, ky - R(0.03));
  ctx.rotate(sw);
  ctx.strokeStyle = 'rgba(80,60,40,.8)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, R(0.025));
  ctx.stroke();
  drawKey(ctx, 0, R(0.05), R(0.028), t);
  ctx.restore();
}
/** 금빛 열쇠 */
function drawKey(ctx: C2, x: number, y: number, k: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = radg(ctx, 0, -k * 0.4, 0, k * 1.6, [0, 'rgba(255,240,150,.55)'], [1, 'rgba(255,240,150,0)']);
  ell(ctx, 0, 0, k * 1.6, k * 1.6);
  ctx.fill();
  ctx.fillStyle = '#ffcf3a';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.2, k * 0.12);
  ell(ctx, 0, -k * 0.55, k * 0.45, k * 0.45);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffe9a0';
  ell(ctx, 0, -k * 0.55, k * 0.18, k * 0.18);
  ctx.fill();
  ctx.fillStyle = '#ffcf3a';
  rr(ctx, -k * 0.11, -k * 0.15, k * 0.22, k * 1.05, k * 0.06);
  ctx.fill();
  ctx.stroke();
  for (const yy of [0.55, 0.78]) {
    rr(ctx, k * 0.08, k * yy, k * 0.26, k * 0.14, k * 0.04);
    ctx.fill();
    ctx.stroke();
  }
  if ((t >> 3) % 6 === 0) {
    ctx.fillStyle = '#ffffff';
    starPath(ctx, k * 0.35, -k * 0.85, k * 0.22, 0.4, 4);
    ctx.fill();
  }
  ctx.restore();
}
/** 누름판(받침대 위) */
function drawPlate(ctx: C2, x: number, y: number, on: number, R: (v: number) => number) {
  const S = (v: number) => R(v * 1.4);
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ell(ctx, x, y + S(0.03), S(0.07), S(0.014));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, y, 0, y + S(0.03), [0, '#d8d0c4'], [1, '#9a9080']);
  rr(ctx, x - S(0.06), y, S(0.12), S(0.03), S(0.006));
  ctx.fill();
  stroke(ctx, OUT, 1.4);
  ctx.fillStyle = on > 0.5 ? '#7ae06a' : '#ff8a5a';
  rr(ctx, x - S(0.05), y - S(0.008) + on * S(0.006), S(0.1), S(0.012), S(0.004));
  ctx.fill();
  stroke(ctx, OUT, 1.2);
}
/** 굴러가는 것 · 소품 */
function drawThing(ctx: C2, k: Kind, x: number, y: number, r: number, rot: number, t: number) {
  const lw = Math.max(1.2, r * 0.07);
  ctx.save();
  ctx.translate(x, y);
  switch (k) {
    case 'apple': {
      ctx.translate(0, -r);
      ctx.rotate(rot);
      ctx.fillStyle = radg(ctx, -r * 0.35, -r * 0.35, r * 0.1, r * 1.2, [0, '#ff8a7a'], [0.5, '#e8382a'], [1, '#a81c14']);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.7);
      ctx.bezierCurveTo(r * 0.6, -r * 1.15, r * 1.25, -r * 0.3, r * 0.85, r * 0.55);
      ctx.bezierCurveTo(r * 0.6, r * 1.05, -r * 0.6, r * 1.05, -r * 0.85, r * 0.55);
      ctx.bezierCurveTo(-r * 1.25, -r * 0.3, -r * 0.6, -r * 1.15, 0, -r * 0.7);
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.strokeStyle = '#6a3a1a';
      ctx.lineWidth = Math.max(1.5, r * 0.1);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.65);
      ctx.lineTo(r * 0.08, -r * 1.05);
      ctx.stroke();
      ctx.fillStyle = '#5cc25a';
      ell(ctx, r * 0.32, -r * 0.95, r * 0.26, r * 0.12, -0.5);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ell(ctx, -r * 0.4, -r * 0.25, r * 0.16, r * 0.26, 0.4);
      ctx.fill();
      break;
    }
    case 'boulder': {
      ctx.translate(0, -r);
      ctx.rotate(rot);
      ctx.fillStyle = radg(ctx, -r * 0.35, -r * 0.35, r * 0.1, r * 1.15, [0, '#e6e2da'], [0.55, '#a8a296'], [1, '#6e6a62']);
      ctx.beginPath();
      for (let q = 0; q < 9; q++) {
        const a = (q * TAU) / 9, rd = r * (0.94 + 0.07 * Math.sin(q * 2.7));
        ctx[q ? 'lineTo' : 'moveTo'](Math.cos(a) * rd, Math.sin(a) * rd);
      }
      ctx.closePath();
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.strokeStyle = 'rgba(70,60,50,.5)';
      ctx.lineWidth = Math.max(1, r * 0.06);
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.6);
      ctx.lineTo(r * 0.05, -r * 0.1);
      ctx.lineTo(-r * 0.15, r * 0.35);
      ctx.moveTo(r * 0.05, -r * 0.1);
      ctx.lineTo(r * 0.45, r * 0.05);
      ctx.stroke();
      ctx.fillStyle = 'rgba(110,170,70,.65)';
      ell(ctx, r * 0.35, -r * 0.55, r * 0.28, r * 0.12, 0.5);
      ctx.fill();
      break;
    }
    case 'melon': {
      ctx.translate(0, -r);
      ctx.rotate(rot);
      ctx.fillStyle = radg(ctx, -r * 0.3, -r * 0.3, r * 0.1, r * 1.1, [0, '#9be06a'], [1, '#2f8a35']);
      ell(ctx, 0, 0, r, r * 0.92);
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = '#1f5a24';
      ctx.lineWidth = Math.max(2, r * 0.16);
      for (let q = -2; q <= 2; q++) {
        ctx.beginPath();
        ctx.moveTo(q * r * 0.42, -r);
        ctx.quadraticCurveTo(q * r * 0.42 + r * 0.15, 0, q * r * 0.42, r);
        ctx.stroke();
      }
      ctx.restore();
      ell(ctx, 0, 0, r, r * 0.92);
      stroke(ctx, OUT, lw);
      ctx.fillStyle = 'rgba(255,255,255,.4)';
      ell(ctx, -r * 0.4, -r * 0.4, r * 0.2, r * 0.12, -0.6);
      ctx.fill();
      break;
    }
    case 'acorn': {
      ctx.fillStyle = lin(ctx, -r, 0, r, 0, [0, '#d9893a'], [1, '#9a5a20']);
      ell(ctx, 0, -r * 0.8, r * 0.72, r * 0.82);
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.fillStyle = '#7a4a22';
      ctx.beginPath();
      ctx.ellipse(0, -r * 1.25, r * 0.85, r * 0.5, 0, Math.PI, 0);
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.strokeStyle = '#5a3412';
      ctx.lineWidth = Math.max(1.5, r * 0.12);
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.7);
      ctx.lineTo(r * 0.1, -r * 1.95);
      ctx.stroke();
      break;
    }
    case 'pumpkin': {
      ctx.fillStyle = lin(ctx, 0, -r * 1.7, 0, 0, [0, '#ffb04a'], [1, '#e86a10']);
      for (const [ox, wd] of [[-0.55, 0.55], [0.55, 0.55], [0, 0.6]] as [number, number][]) {
        ell(ctx, r * ox, -r * 0.8, r * wd, r * 0.8);
        ctx.fill();
        stroke(ctx, '#a84a0a', lw);
      }
      ctx.fillStyle = '#5a8a2a';
      rr(ctx, -r * 0.1, -r * 1.85, r * 0.2, r * 0.3, r * 0.06);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ell(ctx, -r * 0.2, -r * 1.2, r * 0.18, r * 0.1, -0.4);
      ctx.fill();
      break;
    }
    case 'bucket': {
      ctx.fillStyle = lin(ctx, -r, 0, r, 0, [0, '#8fd0ff'], [1, '#3a8ad0']);
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, -r * 1.5);
      ctx.lineTo(r * 0.85, -r * 1.5);
      ctx.lineTo(r * 0.65, 0);
      ctx.lineTo(-r * 0.65, 0);
      ctx.closePath();
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.fillStyle = '#2a6aa8';
      ell(ctx, 0, -r * 1.5, r * 0.85, r * 0.18);
      ctx.fill();
      ctx.strokeStyle = '#6f7a86';
      ctx.lineWidth = Math.max(1.2, r * 0.08);
      ctx.beginPath();
      ctx.arc(0, -r * 1.5, r * 0.8, Math.PI, 0);
      ctx.stroke();
      break;
    }
    case 'hay': {
      ctx.fillStyle = lin(ctx, 0, -r * 1.4, 0, 0, [0, '#ffe68a'], [1, '#d9a83a']);
      rr(ctx, -r * 1.05, -r * 1.35, r * 2.1, r * 1.35, r * 0.35);
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.strokeStyle = 'rgba(160,110,20,.6)';
      ctx.lineWidth = 1;
      for (let q = 0; q < 6; q++) {
        ctx.beginPath();
        ctx.moveTo(-r + q * r * 0.4, -r * 1.2);
        ctx.lineTo(-r + q * r * 0.4 + r * 0.15, -r * 0.15);
        ctx.stroke();
      }
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(-r * 1.05, -r * 0.8, r * 2.1, r * 0.12);
      break;
    }
    case 'coconut': {
      ctx.fillStyle = radg(ctx, -r * 0.3, -r * 1.2, r * 0.1, r * 1.1, [0, '#a8743a'], [1, '#5a3412']);
      ell(ctx, 0, -r * 0.88, r * 0.9, r * 0.86);
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.fillStyle = '#3a2008';
      for (const [ox, oy] of [[-0.2, -1.0], [0.15, -1.05], [0, -0.78]]) (ell(ctx, r * ox, r * oy, r * 0.09, r * 0.09), ctx.fill());
      break;
    }
    case 'rock': {
      ctx.fillStyle = lin(ctx, 0, -r * 1.7, 0, 0, [0, '#d8d4cc'], [1, '#8a8278']);
      ctx.beginPath();
      ctx.moveTo(-r * 1.05, 0);
      ctx.quadraticCurveTo(-r * 1.15, -r * 1.2, -r * 0.3, -r * 1.55);
      ctx.quadraticCurveTo(r * 0.6, -r * 1.75, r * 1.0, -r * 0.9);
      ctx.quadraticCurveTo(r * 1.2, -r * 0.2, r * 0.95, 0);
      ctx.closePath();
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.fillStyle = 'rgba(255,255,255,.4)';
      ell(ctx, -r * 0.35, -r * 1.25, r * 0.3, r * 0.14, -0.3);
      ctx.fill();
      ctx.fillStyle = 'rgba(90,140,60,.6)';
      ell(ctx, r * 0.4, -r * 0.2, r * 0.3, r * 0.12);
      ctx.fill();
      break;
    }
    case 'puddle': {
      ctx.fillStyle = lin(ctx, 0, -r * 0.4, 0, r * 0.2, [0, '#9be4ff'], [1, '#3fa0e0']);
      ell(ctx, 0, -r * 0.1, r * 1.3, r * 0.42);
      ctx.fill();
      stroke(ctx, '#2a78b0', lw);
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = 1.2;
      const u = (t * 0.012) % 1;
      ctx.globalAlpha = 1 - u;
      ell(ctx, r * 0.2, -r * 0.12, r * 0.9 * u + 2, r * 0.3 * u + 1);
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case 'popcorn': {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, -r * 1.4);
      ctx.lineTo(r * 0.8, -r * 1.4);
      ctx.lineTo(r * 0.6, 0);
      ctx.lineTo(-r * 0.6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#e8382a';
      for (let q = -2; q <= 2; q += 2) ctx.fillRect(q * r * 0.28 - r * 0.14, -r * 1.5, r * 0.28, r * 1.6);
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, -r * 1.4);
      ctx.lineTo(r * 0.8, -r * 1.4);
      ctx.lineTo(r * 0.6, 0);
      ctx.lineTo(-r * 0.6, 0);
      ctx.closePath();
      stroke(ctx, OUT, lw);
      ctx.fillStyle = '#fff6d0';
      for (const [ox, oy] of [[-0.5, -1.5], [0, -1.65], [0.5, -1.5], [-0.25, -1.75], [0.28, -1.8]]) {
        ell(ctx, r * ox, r * oy, r * 0.28, r * 0.25);
        ctx.fill();
        stroke(ctx, '#e0c070', 1);
      }
      break;
    }
    case 'statue': {
      // 꽃 화분
      ctx.fillStyle = lin(ctx, -r, 0, r, 0, [0, '#e8865a'], [1, '#b8552e']);
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, -r * 1.0);
      ctx.lineTo(r * 0.9, -r * 1.0);
      ctx.lineTo(r * 0.7, 0);
      ctx.lineTo(-r * 0.7, 0);
      ctx.closePath();
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.fillStyle = '#c8603a';
      rr(ctx, -r, -r * 1.12, r * 2, r * 0.2, r * 0.06);
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.fillStyle = '#4ea63a';
      ell(ctx, 0, -r * 1.4, r * 0.95, r * 0.42);
      ctx.fill();
      for (let q = 0; q < 5; q++) {
        const fx = -r * 0.7 + q * r * 0.35, fy = -r * (1.55 + 0.2 * Math.sin(q * 2.1)) + Math.sin(t * 0.04 + q) * r * 0.03;
        ctx.fillStyle = ['#ff6a8a', '#ffd23a', '#c08aff', '#ff8a3a', '#5ad0ff'][q];
        for (let p = 0; p < 5; p++) (ell(ctx, fx + Math.cos((p * TAU) / 5) * r * 0.12, fy + Math.sin((p * TAU) / 5) * r * 0.12, r * 0.1, r * 0.1), ctx.fill());
        ctx.fillStyle = '#fff6b0';
        ell(ctx, fx, fy, r * 0.07, r * 0.07);
        ctx.fill();
      }
      break;
    }
    case 'icecream': {
      ctx.fillStyle = lin(ctx, -r * 0.4, 0, r * 0.4, 0, [0, '#f2c27a'], [1, '#c8853a']);
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, -r * 1.0);
      ctx.lineTo(r * 0.45, -r * 1.0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      stroke(ctx, OUT, lw);
      for (const [oy, col] of [[-1.15, '#ffb3c9'], [-1.55, '#bfe8ff']] as [number, string][]) {
        ctx.fillStyle = col;
        ell(ctx, 0, r * oy, r * 0.52, r * 0.42);
        ctx.fill();
        stroke(ctx, OUT, lw);
      }
      ctx.fillStyle = '#e8382a';
      ell(ctx, r * 0.05, -r * 2.0, r * 0.12, r * 0.12);
      ctx.fill();
      break;
    }
    case 'drum': {
      ctx.fillStyle = lin(ctx, -r, 0, r, 0, [0, '#ff6a5a'], [1, '#c0302a']);
      rr(ctx, -r * 0.95, -r * 1.3, r * 1.9, r * 1.3, r * 0.2);
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.fillStyle = '#ffcf3a';
      ctx.fillRect(-r * 0.95, -r * 1.3, r * 1.9, r * 0.14);
      ctx.fillRect(-r * 0.95, -r * 0.14, r * 1.9, r * 0.14);
      ctx.fillStyle = '#fff6e6';
      ell(ctx, 0, -r * 1.3, r * 0.95, r * 0.22);
      ctx.fill();
      stroke(ctx, OUT, lw);
      break;
    }
  }
  ctx.restore();
}
/** 나뭇가지(서 있을 때) / 통나무 다리(누웠을 때) */
function drawLog(ctx: C2, x: number, gy: number, len: number, ang: number, R: (v: number) => number) {
  const S = (v: number) => R(v * 1.4);
  const th = Math.max(S(0.014), len * 0.12);
  ctx.save();
  ctx.translate(x, gy);
  ctx.rotate(ang);
  ctx.fillStyle = lin(ctx, 0, -th, 0, th, [0, '#b07a48'], [1, '#7a4e28']);
  rr(ctx, 0, -th, len, th * 2, th);
  ctx.fill();
  stroke(ctx, OUT, 1.5);
  ctx.strokeStyle = 'rgba(70,40,15,.45)';
  ctx.lineWidth = 1;
  for (let q = 1; q < 4; q++) {
    ctx.beginPath();
    ctx.moveTo((len * q) / 4, -th * 0.6);
    ctx.lineTo((len * q) / 4 + th, th * 0.4);
    ctx.stroke();
  }
  ctx.fillStyle = '#e8c08a';
  ell(ctx, len, 0, th * 0.45, th);
  ctx.fill();
  stroke(ctx, OUT, 1.2);
  ctx.fillStyle = '#5cc25a';
  ell(ctx, len * 0.55, -th * 1.2, th * 0.8, th * 0.4, -0.3);
  ctx.fill();
  ctx.restore();
}

// ── 화면 상태(연출만, 시뮬레이션과 무관) ──
interface Vis {
  w: World | null; ev: number;
  sz: number[]; sv: number[]; land: number[]; landDone: boolean[]; face: number[]; faceK: Face[]; bonk: number[]; bubT: string[];
  ang: number[]; flee: number[]; knock: number[]; logA: number[]; step: number[];
  beam: { a: number; b: number; t: number } | null; chain: number; lift: number[]; caught: { k: number; wk: number; t: number } | null;
  roar: { from: number; to: number; t: number }[]; starT: number; pops: { x: number; y: number; t: number }[]; react: ({ t: number; text: string } | null)[]; card: string; dings: number; chimed: boolean; wob: number[]; hop: number[]; hopA: number[]; albumT: number; albumN: number; albumNext: boolean; slid: boolean[];
  dry: number[]; keyFly: { id: number; t: number; to: number; done?: boolean } | null; waves: { x: number; y: number; t: number; to: number }[]; outT: number; outK: Kind | null; hintT: number;
}
const VIS = new WeakMap<object, Vis>();
function visOf(s: SwapState): Vis {
  let v = VIS.get(s);
  if (!v) VIS.set(s, (v = { w: null, ev: -1, sz: [], sv: [], land: [], landDone: [], face: [], faceK: [], bonk: [], bubT: [], ang: [], flee: [], knock: [], logA: [], step: [], beam: null, chain: 0, lift: [], caught: null, roar: [], starT: 0, pops: [], react: [], card: '', dings: 0, chimed: false, wob: [], hop: [], hopA: [], albumT: 0, albumN: 0, albumNext: false, slid: [], dry: [], keyFly: null, waves: [], outT: -999, outK: null, hintT: -999 }));
  if (v.w !== s.w) {
    const n = s.w.th.length;
    v.w = s.w;
    // 이전 판의 사건은 새 판 물건 번호와 안 맞으니 건너뛴다
    v.ev = Math.max(v.ev, s.t - 1);
    v.sz = s.w.th.map((o) => RZ[Math.max(1, o.z)]);
    v.sv = Array(n).fill(0);
    v.land = Array(n).fill(-999);
    v.landDone = Array(n).fill(true);
    v.face = Array(n).fill(-999);
    v.faceK = Array(n).fill('idle');
    v.bonk = Array(n).fill(-999);
    v.bubT = Array(n).fill('');
    v.ang = Array(n).fill(0);
    v.flee = Array(n).fill(-999);
    v.knock = Array(n).fill(-999);
    v.logA = s.w.th.map((o) => (o.c === 'log' && bridged(s.w, s.w.th[o.ref]) ? 1 : 0));
    v.step = Array(n).fill(0);
    v.lift = Array(n).fill(0);
    v.beam = null;
    v.chain = 0;
    v.caught = null;
    v.roar = [];
    v.react = Array(n).fill(null);
    v.wob = Array(n).fill(-999);
    v.slid = Array(n).fill(false);
    v.hop = Array(n).fill(-999);
    v.hopA = Array(n).fill(0);
    v.dry = s.w.th.map((o) => (dried(o) ? 1 : 0));
    v.keyFly = null;
    v.waves = [];
    v.outT = -999;
    v.outK = null;
  }
  return v;
}
/** 막힌 동물의 말풍선 */
function bonkText(wk: Th, o: Th): string {
  if (o.c === 'hole') return wk.k === 'giraffe' ? '목이 걸려!' : '너무 커!';
  if (o.c === 'gate') return '너무 무거워!';
  if (o.c === 'pond') return '너무 깊어!';
  if (o.c === 'iron') return '꽉 닫혔어!';
  return '';
}

function drawAll(ctx: C2, s: SwapState, w: number, h: number, th: Theme) {
  void th;
  const fx = juice(s), v = visOf(s), W_ = s.w, t = s.t, d = STAGES[s.stage], P = PAL[d.ch];
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const sc = typeof ctx.getTransform === 'function' ? ctx.getTransform().a || 1 : 1;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const cen = (o: Th) => hitCenter(W_, o);

  // ── 사건 → 연출·소리 ──
  for (const e of s.events) {
    if (e.t <= v.ev) continue;
    const A_ = e.a >= 0 && e.a < W_.th.length ? W_.th[e.a] : null, B_ = e.b >= 0 && e.b < W_.th.length ? W_.th[e.b] : null;
    switch (e.k) {
      case 'stage':
        fx.sound('chime', 1, 0.6);
        v.chain = 0;
        break;
      case 'again':
        fx.sound('whoosh', 0.8, 0.6);
        v.chain = 0;
        break;
      case 'sel': {
        if (!A_) break;
        const [cx, cy] = cen(A_);
        fx.sound('tick', 1.5 - 0.18 * A_.z, 1);
        fx.sound('pop', 1.4 - 0.12 * A_.z, 0.5);
        fx.ring(X(cx), Y(cy), '#ffe14a', R(Math.max(0.07, RZ[Math.max(1, A_.z)] * 1.3)), 3);
        fx.burst(X(cx), Y(cy), '#fff6a0', 10, 2.5, 2);
        break;
      }
      case 'desel':
        fx.sound('tick', 0.7, 0.7);
        break;
      case 'beam':
        v.beam = { a: e.a, b: e.b, t: e.t };
        fx.sound('zap', 1, 0.8);
        fx.sound('whoosh', 1.4, 0.5);
        break;
      case 'swap': {
        if (!A_ || !B_) break;
        v.beam = null;
        const za = Math.floor(e.n / 10), zb = e.n % 10;
        for (const [o, z0] of [[A_, za], [B_, zb]] as [Th, number][]) {
          const [cx, cy] = cen(o);
          v.face[o.id] = t;
          v.faceK[o.id] = 'shock';
          v.wob[o.id] = t;
          if (o.z > z0) {
            // 커지는 쪽: 쑥 솟았다가 쿵 내려앉는다
            v.land[o.id] = t;
            v.landDone[o.id] = false;
            fx.sound('swell', 1.5 - 0.2 * o.z, 1);
            fx.burst(X(cx), Y(cy), '#ffe98a', 14 + o.z * 4, 3 + o.z, 2.6);
          } else if (o.z < z0) {
            fx.sound('shrink', 0.8 + 0.25 * (5 - o.z), 1);
            fx.burst(X(cx), Y(cy), '#bfe8ff', 18, 3.5, 2.2);
            if (!s.big || t - s.big.t > 5) fx.pop(X(cx), Y(cy) - R(0.04), '뿅!', '#bfe8ff', Math.max(16, R(0.06)));
          }
        }
        for (const o of [A_, B_]) if (K[o.k].c === 'animal' || o.c === 'keeper') v.react[o.id] = { t, text: o.c === 'keeper' ? (o.z < (o === A_ ? za : zb) ? '어어?!' : '으하하!') : o.z > (o === A_ ? za : zb) ? `${K[o.k].say ?? ''}?!` : '어라?' };
        const [ax, ay] = cen(A_), [bx, by] = cen(B_);
        fx.ring(X((ax + bx) / 2), Y((ay + by) / 2), '#ffffff', R(0.12), 4);
        fx.blink('#fff6c0', 0.18);
        break;
      }
      case 'gate':
        if (A_) {
          fx.sound('crack', 0.8, 0.9);
          fx.sound('thud', 1.1, 0.8);
          fx.burst(X(A_.x), Y(A_.y - 0.04), '#d8b080', 18, 4, 2.8);
          fx.pop(X(A_.x), Y(A_.y - doorH(A_.z) - 0.06), '쾅!', '#ffe14a', Math.max(18, R(0.07)));
          fx.kick(6);
          if (B_) (v.face[B_.id] = t), (v.faceK[B_.id] = 'proud');
        }
        break;
      case 'flee':
      case 'roar':
        if (A_) {
          v.flee[A_.id] = t;
          fx.sound('boing', 1.7, 0.9);
          fx.sound('whoosh', 1.2, 0.7);
          fx.pop(X(A_.x), Y(A_.y - keeperH(A_.z) - 0.07), '으악!', '#ffffff', Math.max(16, R(0.065)));
          if (e.k === 'roar' && B_) {
            v.roar.push({ from: B_.id, to: A_.id, t });
            fx.sound('thud', 0.5, 1);
            v.face[B_.id] = t;
            v.faceK[B_.id] = 'proud';
            const [lx, ly] = cen(B_);
            fx.pop(X(lx), Y(ly) - R(0.08), '어흥!', '#ffcf3a', Math.max(20, R(0.08)));
            fx.kick(8);
          }
        }
        break;
      case 'knock':
        if (A_) {
          v.knock[A_.id] = t;
          fx.sound('thud', 0.6, 1.2);
          fx.sound('crack', 1.2, 0.8);
          fx.sound('chime', 1.4, 0.5);
          fx.kick(12);
          fx.burst(X(A_.x), Y(A_.y - 0.08), '#ffe14a', 26, 6, 3.2);
          fx.pop(X(A_.x), Y(A_.y - 0.25), '꽈당!', '#ffffff', Math.max(20, R(0.075)));
        }
        break;
      case 'smash':
        if (A_) {
          fx.sound('crack', 0.7, 1.2);
          fx.sound('thud', 0.7, 1);
          fx.kick(10);
          fx.burst(X(A_.x), Y(A_.y - 0.07), '#c08a50', 26, 6, 3.2);
          fx.pop(X(A_.x), Y(A_.y - 0.24), '와장창!', '#ffffff', Math.max(18, R(0.07)));
        }
        break;
      case 'thunk':
        if (A_) fx.sound('thud', 1.4, 0.6), fx.pop(X(A_.x), Y(A_.y - 0.08), '툭', '#ffffff', 14);
        break;
      case 'roll':
        if (A_) fx.sound('whoosh', 0.7, 0.9), fx.pop(X(A_.x), Y(A_.y - RZ[A_.z] * 2 - 0.03), '데굴데굴!', '#ffffff', Math.max(14, R(0.042)));
        break;
      case 'splash':
        if (A_ && B_) {
          fx.sound('splash', 1 - 0.08 * A_.z, 1.2);
          fx.kick(7);
          fx.burst(X(B_.x), Y(B_.y - 0.02), '#9be4ff', 34, 6, 3.2);
          fx.pop(X(B_.x), Y(B_.y - 0.2), filled(W_, B_) ? '풍덩! 징검다리!' : '풍덩!', '#ffffff', Math.max(16, R(0.06)));
        }
        break;
      case 'rest':
        if (A_) fx.sound('thud', 1.3, 0.5);
        break;
      case 'bonk':
        if (A_ && B_) {
          v.bonk[A_.id] = t;
          v.bubT[A_.id] = bonkText(A_, B_);
          fx.sound('boing', 1.4 - 0.15 * A_.z, 0.6);
          v.face[A_.id] = t;
          v.faceK[A_.id] = B_.c === 'gate' || B_.c === 'iron' ? 'strain' : 'shock';
        }
        break;
      case 'squeeze':
        if (A_) (v.bonk[A_.id] = t), (v.bubT[A_.id] = '끼었어!'), fx.sound('boing', 0.9, 0.6);
        break;
      case 'out':
        if (A_) {
          v.chain++;
          fx.sound('coin', 0.9 + 0.12 * v.chain, 1);
          fx.sound('chime', 1 + 0.1 * v.chain, 0.5);
          for (let q = 0; q < 4; q++) fx.burst(X(0.07), Y(GY2 - 0.1 - q * 0.05), ['#ff6a8a', '#ffd23a', '#5ad0ff', '#7ae06a'][q], 12, 4.5, 2.8);
          fx.pop(X(0.2), Y(GY2 - 0.32), `${K[A_.k].name} 탈출!`, '#ffe14a', Math.max(16, R(0.06)));
        }
        break;
      case 'caught':
        if (A_ && B_) {
          v.caught = { k: A_.id, wk: B_.id, t };
          fx.sound('fail', 1, 1);
          fx.sound('whoosh', 0.6, 0.8);
          fx.pop(X(A_.x), Y(A_.y - keeperH(A_.z) - 0.08), '잡았다!', '#ff8a5a', Math.max(18, R(0.07)));
          fx.kick(6);
        }
        break;
      case 'bridge':
        if (A_) {
          fx.sound('thud', 0.7, 1.1);
          fx.sound('crack', 1.3, 0.6);
          fx.kick(8);
          fx.burst(X(A_.x), Y(A_.y - 0.01), '#c8a070', 26, 5, 2.8);
        }
        break;
      case 'cover':
        if (A_) {
          fx.sound('pop', 0.6, 1);
          fx.sound('thud', 1.0, 0.8);
          fx.burst(X(A_.x), Y(A_.y - 0.08), '#f2dc9e', 22, 5, 2.8);
        }
        break;
      case 'press':
        fx.sound('ding', 1, 0.9);
        fx.sound('rewind', 0.8, 0.8);
        fx.kick(4);
        break;
      case 'unpress':
        fx.sound('thud', 0.8, 0.8);
        break;
      case 'nomore':
        fx.sound('fail', 1.4, 0.5);
        fx.pop(X(0.5), Y(0.5), '뿅을 다 썼어요', '#ffffff', 16);
        break;
      case 'retry':
        fx.sound('whoosh', 0.9, 0.8);
        break;
      case 'album':
        v.albumT = e.t;
        v.albumN = 0;
        v.albumNext = false;
        fx.sound('whoosh', 0.7, 1);
        break;
      case 'clear':
        v.starT = e.t;
        fx.sound('clear', 1, 1);
        break;
      case 'fail':
        fx.sound('thud', 0.8, 0.8);
        break;
      case 'drink':
        if (A_ && B_) {
          fx.sound('swell', 0.7, 1);
          fx.sound('splash', 0.8, 0.9);
          fx.kick(5);
          for (let q = 0; q < 3; q++) fx.burst(X(A_.x - 0.04 + q * 0.04), Y(A_.y), '#9be4ff', 10, 3, 2.4);
          fx.pop(X(B_.x), Y(B_.y) - R(0.3), '쭈우욱~ 푸우!', '#bfe8ff', Math.max(16, R(0.055)));
          (v.face[B_.id] = t), (v.faceK[B_.id] = 'proud');
        }
        break;
      case 'wave':
        if (A_ && B_) {
          fx.sound('splash', 0.5, 1.4);
          fx.sound('thud', 0.6, 1);
          fx.kick(10);
          fx.burst(X(A_.x), Y(A_.y - 0.04), '#9be4ff', 40, 7, 3.4);
          fx.ring(X(A_.x), Y(A_.y), '#bfe8ff', R(0.3), 6);
          fx.pop(X(A_.x), Y(A_.y) - R(0.28), '첨벙!!', '#bfe8ff', Math.max(20, R(0.08)));
          for (const kp of W_.th) if (kp.c === 'keeper' && Math.abs(kp.y - A_.y) < 0.05 && Math.abs(kp.x - A_.x) < 0.45) v.waves.push({ x: A_.x, y: A_.y, t, to: kp.id });
          (v.face[B_.id] = t), (v.faceK[B_.id] = 'proud');
        }
        break;
      case 'bowl':
        if (A_ && B_) {
          fx.sound('boing', 0.8, 1);
          fx.sound('crack', 1.1, 0.9);
          fx.pop(X(A_.x), Y(A_.y) - R(0.36), '스트라이크!', '#ffe14a', Math.max(18, R(0.07)));
        }
        break;
      case 'key':
        if (A_ && B_) {
          fx.sound('chime', 1.6, 1);
          fx.sound('ding', 1.3, 0.9);
          fx.burst(X(A_.x), Y(KEY_Y), '#ffe14a', 22, 4, 2.6);
          fx.pop(X(A_.x), Y(KEY_Y) - R(0.04), '똑!', '#ffe14a', Math.max(18, R(0.065)));
          const ir = W_.th.find((q) => q.c === 'iron' && q.ref === A_.id);
          v.keyFly = { id: A_.id, t, to: ir ? ir.id : -1 };
          (v.face[B_.id] = t), (v.faceK[B_.id] = 'proud');
        }
        break;
      case 'digstart':
        if (A_ && B_) fx.sound('tick', 0.8, 0.8), (v.face[B_.id] = t), (v.faceK[B_.id] = 'strain');
        break;
      case 'dig':
        if (A_ && B_) {
          fx.sound('crack', 1.4, 0.9);
          fx.sound('pop', 1.1, 0.7);
          fx.burst(X(A_.x), Y(A_.y - 0.04), '#b08a5a', 20, 4, 2.6);
          fx.pop(X(A_.x), Y(A_.y) - R(blockH(A_.z)) - R(0.03), '구멍이 한 칸 쑥!', '#ffe14a', Math.max(14, R(0.045)));
          (v.face[B_.id] = t), (v.faceK[B_.id] = 'proud');
        }
        break;
      case 'hop':
        if (B_) fx.sound('boing', 1.7 - 0.12 * B_.z, 0.9), fx.pop(X(B_.x) + R(0.05), Y(B_.y) - R(0.2), '폴짝!', '#ffffff', Math.max(16, R(0.055)));
        break;
      case 'shell':
        if (A_ && B_) fx.sound('pop', 0.7, 0.8), fx.pop(X(A_.x), Y(A_.y) - R(keeperH(A_.z)) - R(0.08), '어? 돌이네?', '#ffffff', Math.max(13, R(0.04)));
        break;
      case 'squish':
        if (B_) fx.sound('shrink', 1.5, 0.8), fx.pop(X(A_ ? A_.x : B_.x), Y(B_.y) - R(0.16), '꾸깃꾸깃 쏙!', '#ffe14a', Math.max(15, R(0.05)));
        break;
      case 'chain': {
        const o = A_ ?? W_.th[0], [cx, cy] = cen(o), n = e.n;
        fx.sound('ding', 1 + 0.16 * n, 1);
        fx.sound('chime', 1.1 + 0.12 * n, 0.6);
        fx.kick(3 + n * 2);
        fx.pop(X(cx) + R(0.06), Y(cy) - R(0.1), `×${n}`, n >= 3 ? '#ff6a3a' : '#ffcf3a', Math.max(20, R(0.06 + 0.012 * n)));
        break;
      }
      case 'hint':
        v.hintT = e.t;
        fx.sound('chime', 1.3, 0.6);
        fx.sound('pop', 1.5, 0.4);
        break;
      case 'story':
        fx.sound('swell', 0.9, 0.8);
        break;
      case 'storyend':
        fx.sound('whoosh', 1, 0.7);
        fx.sound('chime', 1, 0.5);
        break;
    }
    if (e.k === 'out' && A_) (v.outT = t), (v.outK = A_.k);
  }
  v.ev = Math.max(v.ev, ...s.events.map((e) => e.t), v.ev);
  const card = s.phase === 'play' ? '' : `${s.phase}${s.stage}${s.tries}${s.replays}`;
  if (card && s.pt >= 18 && v.card !== card) (v.card = card), (fx.popups.length = 0), (fx.particles.length = 0), (fx.rings.length = 0);
  // 별 하나씩 '띵' (프레임이 틱을 건너뛰어도 한 번씩)
  if (s.phase === 'result') {
    for (let q = 0; q < s.got; q++) if (t - v.starT >= 34 + q * 14 && v.dings <= q) (v.dings = q + 1), fx.sound('ding', 1 + q * 0.18, 0.9), fx.burst(X(0.5 + (q - (s.ofStars - 1) / 2) * 0.15), Y(0.41), '#ffe14a', 14, 4, 2.6);
    if (s.newDex.length && t - v.starT >= 80 && !v.chimed) (v.chimed = true), fx.sound('chime', 1.2, 0.9);
  } else (v.dings = 0), (v.chimed = false);

  // ── 크기 용수철(늘었다 줄었다 출렁) · 쿵 내려앉으면 둘레가 들썩 ──
  for (const o of W_.th) {
    const i = o.id, tgt = RZ[Math.max(1, o.z)];
    v.sv[i] = v.sv[i] * 0.74 + (tgt - v.sz[i]) * 0.26;
    v.sz[i] += v.sv[i];
    if (!v.landDone[i] && t - v.land[i] >= 13) {
      v.landDone[i] = true;
      const [cx] = cen(o), gy = o.y;
      fx.sound('thud', 1.3 - 0.18 * o.z, 0.6 + 0.12 * o.z);
      fx.kick(2 + o.z * 2.4);
      fx.ring(X(cx), Y(gy), 'rgba(255,255,255,.85)', R(RZ[o.z] * 2.4), 4);
      fx.burst(X(cx), Y(gy), '#e8d0a0', 10 + o.z * 5, 2 + o.z, 2.6);
      if (o.z >= 4 && (!s.big || t - s.big.t > 25)) fx.pop(X(cx), Y(gy) - R(RZ[o.z] * 2.2), '쿵!', '#ffffff', Math.max(18, R(0.06 + o.z * 0.006)));
      // 둘레의 것들이 들썩(가까울수록, 큰 것이 내려앉을수록 높이)
      if (o.z >= 3)
        for (const q of W_.th) {
          if (q === o || q.c === 'hole' || q.c === 'pond' || q.c === 'iron' || (q.walk && q.st === 2)) continue;
          const dd = Math.hypot(q.x - o.x, q.y - o.y);
          if (dd < 0.45) (v.hop[q.id] = t), (v.hopA[q.id] = R(0.012 + 0.008 * o.z) / (1 + dd * 5));
        }
    }
  }
  for (const id of W_.rollers) {
    const r = W_.th[id];
    if (r.roll === 1 && t % 8 === 0) fx.sound('thud', 0.9 - 0.08 * r.z, 0.3), fx.burst(X(r.x), Y(r.y), '#e0c898', 3, 1.4, 2);
  }
  const zr = (o: Th) => v.sz[o.id];
  /** 커지는 쪽: 쑥 솟았다 쿵 + 둘레 들썩 */
  const landLift = (o: Th) => {
    const u = (t - v.land[o.id]) / 13, u2 = (t - v.hop[o.id]) / 14;
    return (u >= 0 && u < 1 ? R(0.07) * Math.sin(u * Math.PI) : 0) + (u2 >= 0 && u2 < 1 ? v.hopA[o.id] * Math.sin(u2 * Math.PI) : 0);
  };
  /** 바뀐 직후 0.5초: 찌그러졌다 튕기는 출렁 */
  const wob = (o: Th) => {
    const k = t - v.wob[o.id];
    return k >= 0 && k < 32 ? 0.24 * Math.sin(k * 0.55) * Math.exp(-k / 11) : 0;
  };
  const squash = (o: Th, x: number, y: number, f: () => void) => {
    const q = wob(o);
    if (!q) return f();
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1 + q, 1 - q);
    ctx.translate(-x, -y);
    f();
    ctx.restore();
  };

  // ── 배경 ──
  ctx.drawImage(getBg(d.ch, Math.round(w), Math.round(h), Math.min(3, Math.max(1, Math.round(sc)))), 0, 0, w, h);
  ctx.save();
  fx.begin(ctx);
  drawLife(ctx, s, w, t, d.ch, R);
  // 빛줄기가 오가는 동안: 살짝 느려진 세상(둘레 어둡게)
  if (v.beam) {
    const u = clamp((t - v.beam.t) / (SWAP_T * 2), 0, 1);
    ctx.fillStyle = `rgba(40,20,60,${0.16 * Math.sin(u * Math.PI)})`;
    ctx.fillRect(0, 0, w, h);
  }

  // ── 비탈(굴러가는 것의 길) ──
  for (const id of W_.rollers) {
    const tr = W_.tracks[W_.th[id].trk];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(120,80,30,.25)';
    ctx.lineWidth = R(0.065);
    ctx.beginPath();
    tr.pts.forEach(([px, py], j) => ctx[j ? 'lineTo' : 'moveTo'](X(px), Y(py) + R(0.014)));
    ctx.stroke();
    ctx.strokeStyle = d.ch === 1 ? '#d9a868' : '#d8b886';
    ctx.lineWidth = R(0.048);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = R(0.01);
    ctx.stroke();
    const [sx, sy] = tr.pts[0];
    if (W_.th[id].k === 'apple') {
      ctx.fillStyle = P.trunk;
      rr(ctx, X(sx) + R(0.03), Y(sy) - R(0.16), R(0.032), R(0.17), R(0.01));
      ctx.fill();
      ctx.fillStyle = P.tree[0];
      ctx.beginPath();
      ctx.arc(X(sx) + R(0.045), Y(sy) - R(0.23), R(0.09), 0, TAU);
      ctx.arc(X(sx) - R(0.025), Y(sy) - R(0.17), R(0.065), 0, TAU);
      ctx.arc(X(sx) + R(0.12), Y(sy) - R(0.17), R(0.065), 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#e8382a';
      for (const [ax, ay] of [[0.0, -0.25], [0.09, -0.27], [0.13, -0.16]]) (ell(ctx, X(sx) + R(ax), Y(sy) + R(ay), R(0.011), R(0.011)), ctx.fill());
    } else {
      ctx.fillStyle = P.hill[1];
      ell(ctx, X(sx), Y(sy) + R(0.012), R(0.1), R(0.03));
      ctx.fill();
    }
  }

  // ── 누름판 사슬 ──
  const irons = W_.th.filter((o) => o.c === 'iron');
  for (const ir of irons) {
    const pz = W_.th[ir.ref];
    ctx.strokeStyle = '#6f7a86';
    ctx.lineWidth = Math.max(1.5, R(0.006));
    ctx.setLineDash([R(0.012), R(0.007)]);
    ctx.beginPath();
    ctx.moveTo(X(pz.x + 0.08), Y(pz.y + 0.02));
    ctx.quadraticCurveTo(X((pz.x + ir.x) / 2), Y(Math.max(pz.y, ir.y - 0.4) + 0.1), X(ir.x + 0.1), Y(ir.y - 0.4));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── 그릴 것 모으기: 뒤(위)에서 앞(아래)으로, 같은 층은 x 순서 ──
  type Item = { y: number; x: number; f: () => void };
  const items: Item[] = [], bubs: [number, number, string][] = [];
  const obs = W_.obs.map((id) => W_.th[id]);
  const holes = obs.filter((o) => o.c === 'hole');
  const dirOf = (o: Th) => (o.s < SLIDE[0] ? 1 : o.s > SLIDE[1] ? -1 : 1);
  const drawProp = (o: Th) => {
    const sel = s.sel === o.id, rpx = R(zr(o)), lift = (sel ? R(0.022) + Math.sin(t * 0.2) * R(0.005) : 0) + landLift(o);
    const plate = irons.find((ir) => ir.ref === o.id);
    if (plate) drawPlate(ctx, X(o.x), Y(o.y), pressed(W_, plate) ? 1 : 0, R);
    const gy = Y(o.y) - (plate ? R(0.012) - (pressed(W_, plate) ? R(0.008) : 0) : 0);
    if (sel) glowUnder(ctx, X(o.x), gy, rpx, t);
    ctx.fillStyle = 'rgba(30,40,10,.22)';
    ell(ctx, X(o.x), gy + 1, rpx * 1.1, rpx * 0.28);
    ctx.fill();
    squash(o, X(o.x), gy, () => {
      if (o.k === 'lion') {
        const L: Look = { t, ph: 0, face: t - v.face[o.id] < 60 ? v.faceK[o.id] : o.z >= 4 ? 'proud' : 'idle', sq: 0, lift, walk: 0, tall: 0, swim: 0, seed: o.id };
        drawAnimal(ctx, 'lion', X(o.x), gy, rpx, L);
        drawCage(ctx, X(o.x), gy, R(0.085), o.z >= 3, t);
      } else if (K[o.k].c === 'animal') {
        const L: Look = { t, ph: 0, face: t - v.face[o.id] < 60 ? v.faceK[o.id] : 'idle', sq: 0, lift, walk: 0, tall: R(holeH(Math.min(7, heightOf(o)))), swim: 0, seed: o.id };
        drawAnimal(ctx, o.k, X(o.x), gy, rpx, L);
      } else drawThing(ctx, o.k, X(o.x), gy - lift, rpx, o.rot, t);
    });
  };
  for (const o of W_.th) {
    if (o.walk) continue;
    if (o.c === 'prop' || o.c === 'animal' || o.c === 'roller') {
      if (o.c === 'roller' && o.roll === 3) items.push({ y: o.y - 0.001, x: o.x, f: () => drawThing(ctx, o.k, X(o.x), Y(o.y + 0.06), R(zr(o)), o.rot, t) });
      else items.push({ y: o.y, x: o.x, f: () => drawProp(o) });
    }
  }
  for (const o of obs) {
    const sel = s.sel === o.id, lift = sel ? R(0.016) : 0;
    if (o.c === 'pond') {
      v.dry[o.id] = Math.min(dried(o) ? 1 : 0, (v.dry[o.id] ?? 0) + 0.02) * (dried(o) ? 1 : 0);
      items.push({ y: o.y - 0.002, x: o.x, f: () => squash(o, X(o.x), Y(o.y), () => drawPond(ctx, d.ch, X(o.x), Y(o.y), o.z, R, t, P, v.dry[o.id])) });
    }
    if (o.c === 'hole') items.push({ y: o.y, x: o.x - 0.001, f: () => squash(o, X(o.x), Y(o.y), () => drawHole(ctx, d.ch, X(o.x), Y(o.y), o.z, R, sel ? 0.6 + 0.4 * Math.sin(t * 0.2) : 0)) });
    if (o.c === 'gate') {
      v.ang[o.id] += ((o.open ? 1.35 : 0) - v.ang[o.id]) * 0.16;
      items.push({ y: o.y, x: o.x - 0.001, f: () => {
        if (sel) glowUnder(ctx, X(o.x), Y(o.y), R(0.07), t);
        squash(o, X(o.x), Y(o.y), () => drawGate(ctx, X(o.x), Y(o.y) - lift, o.z, R, v.ang[o.id], o.open === 2, d.ch));
      } });
    }
    if (o.c === 'iron') {
      v.lift[o.id] += ((pressed(W_, o) ? R(0.3) : 0) - v.lift[o.id]) * 0.12;
      items.push({ y: o.y, x: o.x - 0.001, f: () => drawIron(ctx, X(o.x), Y(o.y), v.lift[o.id], R, W_.th[o.ref]?.c === 'key') });
    }
  }
  // 나뭇가지 / 통나무 다리
  for (const o of W_.th) {
    if (o.c !== 'log') continue;
    const p = W_.th[o.ref], on = bridged(W_, p);
    v.logA[o.id] += ((on ? 1 : 0) - v.logA[o.id]) * 0.18;
    items.push({ y: o.y + 0.001, x: o.x, f: () => {
      const a = v.logA[o.id], hl = 0.056 + 0.03 * p.z, toward = p.x < o.x ? -1 : 1;
      const lenUp = R(Math.max(0.07, zr(o) * 3.2)), lenBr = Math.abs(X(o.x) - X(p.x - toward * hl)) + R(0.03), sel = s.sel === o.id;
      if (sel) glowUnder(ctx, X(o.x), Y(o.y), R(0.06), t);
      squash(o, X(o.x), Y(o.y), () => drawLog(ctx, X(o.x), Y(o.y) - R(0.008) - (sel ? R(0.016) : 0), lerp(lenUp, lenBr, a), toward < 0 ? lerp(-Math.PI / 2 + 0.28, -Math.PI, a) : lerp(-Math.PI / 2 - 0.28, 0, a), R));
    } });
  }
  // 높은 가지의 열쇠(기린)
  for (const o of W_.th) {
    if (o.c !== 'key') continue;
    items.push({ y: o.y - 0.03, x: o.x, f: () => drawKeyTree(ctx, X(o.x), Y(o.y - 0.025), o.open > 0, t, R, P, d.ch) });
  }
  // 사육사
  const kMode = (o: Th): KMode => {
    if (v.caught && v.caught.k === o.id) return 'grin';
    if (o.open === 2) return 'knock';
    if (o.open === 1) return 'flee';
    const hat = W_.th.find((hh) => hh.c === 'hat' && hh.ref === o.id);
    if (hat && hat.z >= o.z) return 'cover';
    const near = W_.walkers.some((id) => {
      const wk = W_.th[id];
      return wk.st < 2 && Math.abs(wk.y - o.y) < 0.05 && Math.abs(o.x - wk.x) < 0.25 && wk.z <= o.z;
    });
    return near ? 'alarm' : 'duty';
  };
  for (const o of obs) {
    if (o.c !== 'keeper') continue;
    const face = o.y > 0.9 ? -1 : 1; // 아래층은 오른쪽(동물이 오는 쪽)을 본다
    items.push({ y: o.y, x: o.x, f: () => {
      const m = kMode(o), hat = W_.th.find((hh) => hh.c === 'hat' && hh.ref === o.id);
      let kx = X(o.x), ky = Y(o.y);
      if (m === 'flee') {
        const u = t - v.flee[o.id];
        kx -= face * (R(u * 0.011) + R(0.012) * Math.sin(u * 0.5));
        ky -= Math.abs(Math.sin(u * 0.3)) * R(0.04);
        if (kx > w + R(0.15) || kx < -R(0.15)) return;
      }
      const kr = R(zr(o)), sel = s.sel === o.id;
      if (sel) glowUnder(ctx, kx, ky, kr, t);
      ctx.fillStyle = 'rgba(30,40,10,.22)';
      ell(ctx, kx, ky + 1, kr * 0.9, kr * 0.25);
      ctx.fill();
      if (m === 'cover' && hat) {
        const hs = R(zr(hat)) * 1.25;
        for (const sd of [-1, 1]) {
          ctx.fillStyle = '#6a3a1a';
          rr(ctx, kx + sd * kr * 0.2 - kr * 0.1 + Math.sin(t * 0.4 + sd) * kr * 0.05, ky - kr * 0.25, kr * 0.2, kr * 0.25, kr * 0.06);
          ctx.fill();
        }
        squash(hat, kx, ky, () => drawHatShape(ctx, kx + Math.sin(t * 0.15) * R(0.005), ky - kr * 0.2, hs, Math.sin(t * 0.1) * 0.05));
        if ((t >> 6) % 3 === 0) bubs.push([kx, ky - hs * 1.1, '어? 깜깜해!']);
        return;
      }
      ctx.save();
      ctx.translate(kx, 0);
      ctx.scale(m === 'flee' ? -face : face, 1);
      squash(o, 0, ky, () => drawKeeper(ctx, 0, ky - (sel ? R(0.02) : 0) - landLift(o), kr, m, t, !hat, o.id));
      ctx.restore();
      if (hat && m !== 'flee') {
        const hs = R(zr(hat)) * 1.15, hsel = s.sel === hat.id;
        if (hsel) glowUnder(ctx, kx, ky - R(keeperH(o.z)) - R(0.01), hs, t);
        if (m === 'knock') drawHatShape(ctx, kx - face * kr * 2.1, ky - hs * 0.1, hs, -0.6 * face);
        else squash(hat, kx, ky - R(keeperH(o.z)), () => drawHatShape(ctx, kx - face * kr * 0.01, ky - R(keeperH(o.z)) + kr * 0.12 - (hsel ? R(0.02) : 0) - landLift(hat), hs, -0.08 * face));
      }
      if (m === 'alarm' && (t >> 4) % 2 === 0) bubs.push([kx, ky - R(keeperH(o.z)) - R(0.06), '!']);
    } });
  }
  for (const o of W_.th) {
    if (o.c !== 'hat') continue;
    const kp = W_.th[o.ref];
    if (kp.open !== 1) continue;
    items.push({ y: kp.y, x: kp.x, f: () => drawHatShape(ctx, X(kp.x), Y(kp.y) - R(0.005), R(zr(o)) * 1.15, 0.1) });
  }
  // 동물
  const drawWalker = (o: Th) => {
    const rpx = R(zr(o)), sel = s.sel === o.id, dir = dirOf(o), slide = onSlide(o);
    let x = X(o.x);
    const y = Y(o.y);
    const caught = v.caught && v.caught.wk === o.id;
    const pond = obs.find((p) => p.c === 'pond' && Math.abs(o.y - p.y) < 0.05 && Math.abs(o.x - p.x) < 0.056 + 0.03 * p.z);
    const inWater = !!pond && !bridged(W_, pond) && !filled(W_, pond) && (v.dry[pond.id] ?? 0) < 0.6;
    const swim = inWater && !!K[o.k].swim;
    let lift = (sel ? R(0.025) + Math.sin(t * 0.2) * R(0.006) : 0) + landLift(o);
    if (caught) {
      const kp = W_.th[v.caught!.k], u = clamp((t - v.caught!.t) / 20, 0, 1);
      x = lerp(x, X(kp.x) + (kp.y > 0.9 ? 1 : -1) * R(0.07), u);
      lift += R(0.16) * u + Math.sin(t * 0.5) * R(0.008);
    }
    if (swim) lift -= R(0.025);
    // 토끼: 닫힌 문 위로 폴짝(포물선)
    if (o.k === 'rabbit')
      for (const g of obs) {
        if (g.c !== 'gate' || g.open || Math.abs(g.y - o.y) > 0.05) continue;
        const a0 = g.at - depth(g) - half(o) - GAP, a1 = g.at + depth(g) + half(o), u = (o.s - a0) / (a1 - a0);
        if (u > 0 && u < 1) lift += Math.sin(u * Math.PI) * (R(doorH(g.z)) + R(0.03));
      }
    const bl = o.blk >= 0 ? W_.th[o.blk] : null;
    let face: Face = t - v.face[o.id] < 60 ? v.faceK[o.id] : o.st === 1 ? (bl?.c === 'gate' || bl?.c === 'iron' ? 'strain' : 'idle') : slide ? 'happy' : o.st === 0 && o.blk === -1 ? 'happy' : 'idle';
    if (caught) face = 'scared';
    // 거북: 일하는 사육사 가까이에선 등껍질 속으로 쏙
    const hideK = o.k === 'turtle' ? obs.find((k2) => k2.c === 'keeper' && onDuty(W_, k2) && Math.abs(k2.y - o.y) < 0.05 && Math.abs(k2.x - o.x) < 0.13) : undefined;
    const L: Look = { t, ph: (o.s / Math.max(0.02, zr(o))) * 1.6, face, sq: (o.st === 1 && o.blk >= 0 ? Math.max(0, 0.08 - (t - v.bonk[o.id]) * 0.006) : 0) + wob(o), lift, walk: o.st === 0 && !slide ? 1 : 0, tall: Math.min(R(holeH(Math.min(7, heightOf(o)))), y - R(0.17)), swim: swim ? 1 : 0, seed: o.id, hide: hideK ? 1 : 0 };
    if (hideK && (t >> 5) % 3 !== 2) bubs.push([X(hideK.x), Y(hideK.y) - R(keeperH(hideK.z)) - R(0.05), '어? 돌인가?']);
    // 돼지: 구멍 앞에서 킁킁 파파팍
    if (o.dig) {
      if (t % 5 === 0) fx.burst(x + dir * rpx * 0.9, y - R(0.01), '#b08a5a', 4, 2.6, 2.4);
      if (t % 10 === 0) fx.sound('tick', 1.3 + 0.2 * ((t / 10) % 2), 0.4);
      bubs.push([x, y - rpx * 2.2, '킁킁 파파팍!']);
      L.sq = 0.06 * Math.sin(t * 0.8);
    }
    if (o.st === 0 && o.z >= 4 && !slide) {
      const stepK = Math.floor(L.ph / Math.PI);
      if (stepK !== v.step[o.id]) {
        v.step[o.id] = stepK;
        fx.sound('thud', 1.6 - 0.15 * o.z, 0.25 + 0.05 * o.z);
        if (o.z >= 5) fx.kick(2);
        fx.burst(x - dir * rpx * 0.4, y, '#e0c898', 4, 1.6, 2);
      }
    }
    if (slide && !v.slid[o.id]) (v.slid[o.id] = true), fx.sound('whoosh', 1.5 - 0.15 * o.z, 0.9), fx.sound('boing', 1.6 - 0.15 * o.z, 0.4);
    if (slide && t % 10 === 0) fx.burst(x, y - rpx * 0.3, '#ffffff', 3, 1.2, 1.6);
    if (sel) glowUnder(ctx, x, y, rpx, t);
    if (!caught && !swim && !slide) {
      ctx.fillStyle = 'rgba(30,40,10,.25)';
      ell(ctx, x, y + 1, rpx * 1.15, rpx * 0.28);
      ctx.fill();
    }
    // 굴을 지나는 중이면 굴 모양으로 잘라 그린다
    const hole = holes.find((hh) => Math.abs(o.y - hh.y) < 0.05 && Math.abs(o.x - hh.x) < 0.07 + zr(o) * 1.3);
    ctx.save();
    if (hole) {
      const bw = R(0.14), bh = R(blockH(hole.z)), oh = R(holeH(hole.z)), hx0 = X(hole.x) - bw / 2, ow = Math.min(bw * 0.86, Math.max(R(0.063), oh * 0.92));
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.rect(hx0, Y(hole.y) - bh, bw, bh);
      ctx.rect(X(hole.x) - ow / 2, Y(hole.y) - oh, ow, oh);
      ctx.clip('evenodd');
    }
    ctx.translate(x, y);
    // 생쥐: 큰 채로 쥐구멍을 지날 땐 꾸깃꾸깃 납작
    if (hole && o.k === 'mouse' && heightOf(o) > hole.z) {
      const k = clamp((R(holeH(hole.z)) * 0.95) / Math.max(1, rpx * 1.5), 0.22, 1);
      ctx.scale(1 + (1 - k) * 0.6, k);
    }
    // 판다: 미끄럼틀부터 데굴데굴 공처럼
    if (o.k === 'panda' && o.fl & 1) {
      ctx.translate(0, -rpx * 0.8);
      ctx.rotate(-dir * (o.s / Math.max(0.01, zr(o))) * 0.9);
      ctx.translate(0, rpx * 0.8);
      if (t % 6 === 0) fx.burst(x, y - R(0.01), '#e0c898', 3, 1.6, 2);
    } else if (slide) ctx.rotate(0.35);
    ctx.scale(dir, 1);
    drawAnimal(ctx, o.k, 0, 0, rpx, L);
    ctx.restore();
    if (slide && (t >> 3) % 4 === 0) bubs.push([x - R(0.06), y - rpx * 2, o.k === 'panda' ? '데굴데굴~' : '슝~']);
    if (inWater && !caught) {
      const hl = R(0.056 + 0.03 * pond!.z);
      ctx.save();
      ctx.beginPath();
      ctx.rect(X(pond!.x) - hl, Y(pond!.y - 0.007), hl * 2, R(0.25));
      ctx.clip();
      ctx.fillStyle = 'rgba(60,170,230,.55)';
      ctx.fillRect(x - rpx * 1.6, y - R(0.014) - (swim ? R(0.014) : 0), rpx * 3.2, R(0.25));
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 1.5;
      ell(ctx, x, y - R(0.011), rpx * (1.1 + 0.15 * Math.sin(t * 0.2)), R(0.011));
      ctx.stroke();
      if (o.st === 0 && t % 12 === 0) fx.burst(x + dir * rpx * 0.6, y - R(0.014), '#bfeaff', 3, 1.5, 1.6), fx.sound('splash', 1.6 - 0.1 * o.z, 0.25);
    }
    if (o.st === 1 && o.blk >= 0 && v.bubT[o.id] && (t - v.bonk[o.id]) % 300 < 150 && s.phase === 'play' && (s.sel !== o.id || s.lock)) {
      const top = y - Math.max(L.tall, rpx * 2.1) - lift;
      bubs.push([x, top - R(0.02), v.bubT[o.id]]);
    }
  };
  for (const id of W_.walkers) {
    const o = W_.th[id];
    if (o.st === 2) continue;
    items.push({ y: o.y + 0.0005, x: o.x + 0.0005, f: () => drawWalker(o) });
  }
  items.sort((a, b) => (Math.abs(a.y - b.y) > 0.03 ? a.y - b.y : a.x - b.x));
  for (const it of items) it.f();

  // 출구 밖에서 기다리는 엄마(들) — 판마다 누구를 구하는지 첫눈에
  drawMoms(ctx, s, v, t, R, bubs);
  // 코끼리가 연못 물을 쭈욱(물줄기) → 코로 푸우(물보라)
  for (const pd of obs) {
    if (pd.c !== 'pond' || !dried(pd)) continue;
    const el = W_.walkers.map((id) => W_.th[id]).find((q) => q.k === 'elephant' && q.st !== 2 && Math.abs(q.y - pd.y) < 0.05 && Math.abs(q.x - pd.x) < 0.4);
    const dv = v.dry[pd.id] ?? 1;
    if (!el || dv >= 1) continue;
    const er = R(zr(el)), dir = dirOf(el), hx = X(el.x) + dir * er * 1.35, hy = Y(el.y) - er * 1.25;
    ctx.strokeStyle = 'rgba(90,190,250,.85)';
    ctx.lineWidth = Math.max(3, R(0.014) * (1 - dv * 0.5));
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let q = 0; q <= 10; q++) {
      const u = q / 10, px = lerp(X(pd.x), hx, u), py = lerp(Y(pd.y) + R(0.03), hy, u) - Math.sin(u * Math.PI) * R(0.05) + Math.sin(t * 0.6 + q) * R(0.004);
      ctx[q ? 'lineTo' : 'moveTo'](px, py);
    }
    ctx.stroke();
    if (t % 3 === 0) fx.burst(hx, hy - R(0.06), '#9be4ff', 3, 2.4, 2.2);
  }
  // 하마 물벼락: 물방울 무더기가 사육사에게 철썩
  for (const wv of v.waves) {
    const u = (t - wv.t) / 28;
    if (u > 1) continue;
    const kp = W_.th[wv.to], x0 = X(wv.x), x1 = X(kp.x), y0 = Y(wv.y);
    for (let q = 0; q < 7; q++) {
      const uu = clamp(u * 1.3 - q * 0.05, 0, 1), px = lerp(x0, x1, uu), py = y0 - Math.sin(uu * Math.PI) * R(0.2) - R(0.03);
      ctx.fillStyle = `rgba(110,200,255,${0.95 - q * 0.11})`;
      ell(ctx, px, py, R(0.026 - q * 0.002), R(0.034 - q * 0.003));
      ctx.fill();
    }
  }
  // 딴 열쇠가 정문 자물쇠로 휙
  if (v.keyFly && v.keyFly.to >= 0) {
    const u = (t - v.keyFly.t) / 42;
    if (u < 1) {
      const kk = W_.th[v.keyFly.id], ir = W_.th[v.keyFly.to], e2 = ease(u);
      const px = lerp(X(kk.x), X(ir.x), e2), py = lerp(Y(KEY_Y) + R(0.02), Y(ir.y) - R(0.19), e2) - Math.sin(e2 * Math.PI) * R(0.14);
      drawKey(ctx, px, py, R(0.034), t);
      if (t % 3 === 0) fx.burst(px, py, '#ffe14a', 2, 1.4, 2);
      if (u > 0.9 && !v.keyFly.done) (v.keyFly.done = true), fx.sound('ding', 0.9, 1), fx.burst(X(ir.x), Y(ir.y) - R(0.19), '#ffe14a', 16, 3, 2.4);
    }
  }

  // 사자 어흥: 충격파
  for (const rq of v.roar) {
    const u = (t - rq.t) / 40;
    if (u > 1) continue;
    const [lx, ly] = cen(W_.th[rq.from]);
    for (let q = 0; q < 3; q++) {
      ctx.strokeStyle = `rgba(255,210,80,${(1 - u) * (0.8 - q * 0.2)})`;
      ctx.lineWidth = R(0.014) * (1 - u);
      ctx.beginPath();
      ctx.arc(X(lx), Y(ly), R(0.1 + u * 0.6 + q * 0.07), 0, TAU);
      ctx.stroke();
    }
  }
  for (const [bx, by, tx] of bubs) bubble(ctx, bx, by, tx, R, tx === '!' || tx === '슝~' ? 0 : 1);
  // 바뀐 직후 한마디
  for (const o of W_.th) {
    const rq = v.react[o.id];
    if (!rq || t - rq.t > 55 || (o.walk && o.st === 2) || !rq.text) continue;
    const [cx, cy] = cen(o), top = o.walk || o.c === 'keeper' ? Y(o.y) - Math.max(R(holeH(Math.min(5, heightOf(o)))), R(zr(o)) * 2.2) : Y(cy) - R(zr(o)) * 1.3;
    bubble(ctx, X(cx), Math.min(top, Y(cy)) - R(0.025) - landLift(o), rq.text, R, 0);
  }

  // ── 고른 것: 크기 칸 · 빛줄기 ──
  if (s.phase === 'play' && s.sel >= 0) {
    for (const o of W_.th) {
      if (!swappable(o) || o.id === s.sel) continue;
      const [cx, cy] = cen(o), rr2 = R(Math.max(0.07, zr(o) * 1.05));
      ctx.strokeStyle = `rgba(255,255,255,${0.45 + 0.35 * Math.sin(t * 0.18 + o.id)})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([R(0.014), R(0.009)]);
      ell(ctx, X(cx), Y(cy), rr2, rr2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const o of W_.th) if (swappable(o)) sizePips(ctx, o, X(cen(o)[0]), Y(cen(o)[1]) + R(Math.max(0.06, zr(o) * 1.05)) + R(0.02), R, o.id === s.sel);
  }
  if (s.phase === 'play' && s.sel >= 0 && s.stage < 3 && !s.lock && !s.hint) {
    const o = W_.th[s.sel], [cx, cy] = cen(o);
    bubble(ctx, X(cx), Y(cy) - R(Math.max(0.07, zr(o) * 1.4)) - R(0.03), '이제 바꿀 것을 톡!', R, 0);
  }
  if (v.beam) {
    const A_ = W_.th[v.beam.a], B_ = W_.th[v.beam.b], u = clamp((t - v.beam.t) / (SWAP_T * 2), 0, 1);
    const [ax, ay] = cen(A_), [bx, by] = cen(B_), dx = bx - ax, dy = by - ay, dl = Math.max(1e-6, Math.hypot(dx, dy));
    const bend = Math.min(0.2, 0.35 * dl) * (dx >= 0 ? 1 : -1), mx = (ax + bx) / 2 + (dy / dl) * bend, my = (ay + by) / 2 - Math.abs(dx / dl) * bend - 0.05;
    const pt = (q: number): P2 => [(1 - q) ** 2 * ax + 2 * (1 - q) * q * mx + q * q * bx, (1 - q) ** 2 * ay + 2 * (1 - q) * q * my + q * q * by];
    ctx.lineCap = 'round';
    for (const [col, lw2] of [['rgba(255,230,120,.35)', R(0.06)], ['rgba(255,240,170,.75)', R(0.028)], ['#ffffff', R(0.01)]] as [string, number][]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = lw2 * (0.6 + 0.4 * Math.sin(u * Math.PI));
      ctx.beginPath();
      ctx.moveTo(X(ax), Y(ay));
      ctx.quadraticCurveTo(X(mx), Y(my), X(bx), Y(by));
      ctx.stroke();
    }
    for (const [q, col] of [[u, '#ffe14a'], [1 - u, '#7fe0ff']] as [number, string][]) {
      for (let k2 = 0; k2 < 5; k2++) {
        const [px, py] = pt(clamp(q - (q === u ? 1 : -1) * k2 * 0.05, 0, 1));
        ctx.fillStyle = col;
        ctx.globalAlpha = 1 - k2 * 0.18;
        starPath(ctx, X(px), Y(py), R(0.042 - k2 * 0.006), 0.4, 4);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // 두 물건이 같이 부르르
    for (const o of [A_, B_]) {
      const [cx, cy] = cen(o);
      ctx.strokeStyle = `rgba(255,255,255,${0.8 - u * 0.5})`;
      ctx.lineWidth = 3;
      ell(ctx, X(cx), Y(cy), R(Math.max(0.07, zr(o) * 1.2)) * (1 + 0.15 * Math.sin(t * 0.9)), R(Math.max(0.07, zr(o) * 1.2)) * (1 + 0.15 * Math.sin(t * 0.9)));
      ctx.stroke();
    }
  }
  // 큰 순간 글자
  if (s.big && t - s.big.t < 70) {
    const u = (t - s.big.t) / 70, sc2 = u < 0.15 ? ease(u / 0.15) * 1.15 : 1.15 - 0.15 * ease((u - 0.15) / 0.2);
    ctx.save();
    ctx.globalAlpha = u > 0.75 ? (1 - u) / 0.25 : 1;
    font(0.068, 900);
    const tw0 = ctx.measureText(s.big.text).width, fit = Math.min(1, R(0.9) / Math.max(1, tw0 * 1.15)), half2 = (tw0 * fit * 1.15) / 2;
    ctx.translate(clamp(X(s.big.x), R(0.03) + half2, R(0.97) - half2), Y(clamp(s.big.y, 0.26, 1.2)) - R(0.04) * u);
    ctx.scale(sc2 * fit, sc2 * fit);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = R(0.018);
    ctx.strokeStyle = '#4a2a12';
    ctx.lineJoin = 'round';
    ctx.strokeText(s.big.text, 0, 0);
    ctx.fillStyle = '#ffe14a';
    ctx.fillText(s.big.text, 0, 0);
    ctx.restore();
  }
  ctx.restore();

  drawHud(ctx, s, v, w, h, R, font);
}
/** 출구 밖 엄마: 이 판에서 구할 아기들의 엄마가 기다린다(처음엔 '아가야~', 아기가 나오면 하트) */
function drawMoms(ctx: C2, s: SwapState, v: Vis, t: number, R: (v: number) => number, bubs: [number, number, string][]) {
  const W_ = s.w, kinds: Kind[] = [];
  for (const id of W_.walkers) if (!kinds.includes(W_.th[id].k)) kinds.push(W_.th[id].k);
  const since = t - (s.banner?.t ?? 0), happy = t - v.outT < 80;
  kinds.slice(0, 2).forEach((k, i) => {
    const babyOut = W_.walkers.some((id) => W_.th[id].k === k && W_.th[id].st === 2);
    const mx = R(i ? -0.035 : 0.035), my = R(GY2 + 0.012 - i * 0.03), mr = R(k === 'giraffe' ? 0.06 : k === 'mouse' || k === 'rabbit' ? 0.06 : 0.075) * (i ? 0.9 : 1);
    const hop = babyOut ? Math.max(0, Math.sin(t * 0.18 + i)) * R(0.012) : 0;
    ctx.fillStyle = 'rgba(30,40,10,.22)';
    ell(ctx, mx, my + 1, mr * 1.1, mr * 0.26);
    ctx.fill();
    const L: Look = { t, ph: 0, face: babyOut || happy ? 'happy' : 'idle', sq: 0, lift: hop, walk: 0, tall: R(0.2), swim: 0, seed: 7 + i };
    drawAnimal(ctx, k, mx, my, mr, L);
    // 머리 위 작은 리본(엄마 표시)
    const top = my - (k === 'giraffe' ? R(0.24) : mr * 2.0) - hop;
    if (babyOut) {
      ctx.fillStyle = '#ff5a7a';
      heartPath(ctx, mx + R(0.02), top - R(0.02) - ((t * 0.6) % R(0.05)), R(0.014));
      ctx.fill();
    }
    if (i === 0) {
      if (happy) bubs.push([Math.max(R(0.1), mx + R(0.06)), top, '우리 아가!']);
      else if (s.phase === 'play' && (since < 200 || (t >> 6) % 5 === 0) && !babyOut) bubs.push([Math.max(R(0.1), mx + R(0.06)), top, '아가야~ 이리 와!']);
    }
  });
  // 판 시작: 우리 안 아기가 '엄마!'
  if (s.phase === 'play' && since < 170 && !s.again) {
    const lead = W_.th[W_.walkers[0]];
    if (lead && lead.st !== 2) bubs.push([R(lead.x), R(lead.y) - Math.max(R(holeH(Math.min(5, heightOf(lead)))), R(RZ[lead.z]) * 2.2) - R(0.02), '엄마!']);
  }
}
/** 살아 있는 배경: 구름·새·관람객·나비·깃발 */
function drawLife(ctx: C2, s: SwapState, w: number, t: number, ch: number, R: (v: number) => number) {
  void w;
  // 구름
  for (let i = 0; i < 4; i++) {
    const cx = ((hsh(i) * 1.3 + t * 0.00012 * (1 + i * 0.3)) % 1.3) - 0.15, cy = 0.2 + hsh(i + 9) * 0.12, cw = 0.07 + hsh(i + 5) * 0.05;
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath();
    for (const [dx, dy, q] of [[-0.5, 0.1, 0.42], [0, -0.15, 0.58], [0.5, 0.1, 0.45], [0.2, 0.18, 0.42]]) {
      ctx.moveTo(R(cx + dx * cw + q * cw), R(cy + dy * cw));
      ctx.arc(R(cx + dx * cw), R(cy + dy * cw), R(q * cw), 0, TAU);
    }
    ctx.fill();
  }
  // 새 두 마리
  for (let i = 0; i < 2; i++) {
    const bx = ((t * 0.0011 * (1 + i * 0.4) + i * 0.5) % 1.2) - 0.1, by = 0.22 + 0.03 * Math.sin(t * 0.03 + i * 3) + i * 0.05, fl = Math.sin(t * 0.4 + i) * 0.5;
    ctx.strokeStyle = '#4a3a5a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(R(bx - 0.016), R(by - 0.008 * fl));
    ctx.quadraticCurveTo(R(bx - 0.006), R(by - 0.01), R(bx), R(by));
    ctx.quadraticCurveTo(R(bx + 0.006), R(by - 0.01), R(bx + 0.016), R(by - 0.008 * fl));
    ctx.stroke();
  }
  // 뒤 관람로의 구경꾼(풍선 든 아이·어른) — 천천히 걸어간다
  for (let i = 0; i < 4; i++) {
    const dir = i % 2 ? -1 : 1, px = (((hsh(i + 30) + dir * t * 0.0009 * (0.7 + 0.3 * hsh(i))) % 1.2) + 1.2) % 1.2 - 0.1, py = 0.5;
    const k = R(0.016 + (i % 2) * 0.006), bob = Math.abs(Math.sin(t * 0.15 + i)) * k * 0.12;
    const x = R(px), y = R(py) - bob;
    ctx.fillStyle = ['#ff7a8a', '#5aa0e0', '#ffcf3a', '#8a6ad0'][i];
    rr(ctx, x - k * 0.45, y - k * 1.55, k * 0.9, k * 1.0, k * 0.3);
    ctx.fill();
    ctx.fillStyle = '#ffd7b0';
    ell(ctx, x, y - k * 1.9, k * 0.38, k * 0.38);
    ctx.fill();
    ctx.fillStyle = '#5a3a1a';
    ctx.beginPath();
    ctx.arc(x, y - k * 2.0, k * 0.38, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#3a3a5a';
    ctx.fillRect(x - k * 0.3, y - k * 0.6, k * 0.22, k * 0.6);
    ctx.fillRect(x + k * 0.08, y - k * 0.6, k * 0.22, k * 0.6);
    if (i % 2 === 0) {
      // 풍선
      const bxp = x + dir * k * 0.9, byp = y - k * 3.6 + Math.sin(t * 0.05 + i) * k * 0.2;
      ctx.strokeStyle = 'rgba(80,60,40,.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + dir * k * 0.45, y - k * 1.3);
      ctx.lineTo(bxp, byp + k * 0.5);
      ctx.stroke();
      ctx.fillStyle = ['#ff5a6a', '#ffd23a'][i / 2];
      ell(ctx, bxp, byp, k * 0.45, k * 0.55);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ell(ctx, bxp - k * 0.15, byp - k * 0.2, k * 0.1, k * 0.15);
      ctx.fill();
    }
  }
  // 출구 표지 + 깃발(왼쪽 아래)
  const ex = R(0.055), top = R(GY2 - 0.3);
  ctx.fillStyle = '#ffffff';
  rr(ctx, ex - R(0.05), top - R(0.05), R(0.12), R(0.052), R(0.012));
  ctx.fill();
  stroke(ctx, OUT, 1.5);
  ctx.fillStyle = '#e8382a';
  ctx.font = `900 ${Math.max(12, R(0.032))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('← 출구', ex + R(0.01), top - R(0.023));
  ctx.fillStyle = ch === 1 ? '#ff8a3a' : '#ff5a6a';
  ctx.beginPath();
  ctx.moveTo(ex + R(0.045), top - R(0.05));
  for (let q = 0; q <= 6; q++) ctx.lineTo(ex + R(0.045) + R(0.01) * q, top - R(0.05) - R(0.045) + Math.sin(t * 0.15 + q) * R(0.004) * q);
  ctx.lineTo(ex + R(0.045) + R(0.06), top - R(0.05) - R(0.018));
  ctx.lineTo(ex + R(0.045), top - R(0.05) - R(0.032));
  ctx.fill();
  // 앞 잔디의 꼬마 구경꾼: 오리 가족(마을) · 미어캣(숲) · 비둘기(광장) — 왔다 갔다
  for (let i = 0; i < 3; i++) {
    const per = 1600, u = ((t + i * 18) % per) / per, dir = u < 0.5 ? 1 : -1, px = 0.08 + 0.66 * (u < 0.5 ? u * 2 : 2 - u * 2) - i * 0.045 * dir;
    const x = R(px), y = R(GY1 + 0.25 + (i % 2) * 0.01), k = R(i ? 0.012 : 0.015), bob = Math.abs(Math.sin(t * 0.25 + i)) * k * 0.25;
    ctx.save();
    ctx.translate(x, y - bob);
    ctx.scale(dir, 1);
    ctx.fillStyle = 'rgba(30,50,10,.2)';
    ell(ctx, 0, bob + 1, k * 1.1, k * 0.3);
    ctx.fill();
    if (ch === 1) {
      ctx.fillStyle = '#d8a868';
      ell(ctx, 0, -k * 1.1, k * 0.45, k * 1.05);
      ctx.fill();
      stroke(ctx, OUT, 1);
      ctx.fillStyle = '#3a2a14';
      ell(ctx, k * 0.12, -k * 1.85, k * 0.07, k * 0.07);
      ctx.fill();
    } else {
      ctx.fillStyle = ch === 0 ? (i ? '#ffe14a' : '#ffffff') : '#b8c0cc';
      ell(ctx, 0, -k * 0.6, k, k * 0.62);
      ctx.fill();
      stroke(ctx, OUT, 1);
      ell(ctx, k * 0.75, -k * 1.2, k * 0.42, k * 0.42);
      ctx.fill();
      stroke(ctx, OUT, 1);
      ctx.fillStyle = '#ff9a2a';
      ctx.beginPath();
      ctx.moveTo(k * 1.1, -k * 1.25);
      ctx.lineTo(k * 1.45, -k * 1.15);
      ctx.lineTo(k * 1.1, -k * 1.05);
      ctx.fill();
      ctx.fillStyle = '#2a1608';
      ell(ctx, k * 0.88, -k * 1.32, k * 0.07, k * 0.07);
      ctx.fill();
    }
    ctx.restore();
  }
  // 나비
  for (let i = 0; i < 2; i++) {
    const u = t * 0.006 + i * 3.1, bx = R(0.5 + 0.4 * Math.sin(u * (1 + i * 0.3)) * (i ? -1 : 1)), by = R(1.2 + 0.08 * Math.sin(u * 1.7 + i));
    const fl = Math.abs(Math.sin(t * 0.35 + i * 2)), k = R(0.014);
    ctx.fillStyle = i ? '#ffb0d8' : '#fff27a';
    for (const sd of [-1, 1]) (ell(ctx, bx + sd * k * 0.7 * (0.3 + fl), by - k * 0.2, k * 0.7 * (0.3 + fl), k * 0.75), ctx.fill());
    ctx.fillStyle = '#5a3a1a';
    ell(ctx, bx, by, k * 0.18, k * 0.6);
    ctx.fill();
  }
  void s;
}
/** 고른 것 밑 금빛 동그라미 + 반짝이 */
function glowUnder(ctx: C2, x: number, y: number, r: number, t: number) {
  ctx.fillStyle = radg(ctx, x, y - r, 0, r * 2.4, [0, 'rgba(255,240,150,.55)'], [1, 'rgba(255,240,150,0)']);
  ctx.fillRect(x - r * 2.5, y - r * 3.5, r * 5, r * 5);
  ctx.strokeStyle = '#ffd23a';
  ctx.lineWidth = 3;
  ell(ctx, x, y + 1, r * 1.35 + 3, r * 0.38 + 2);
  ctx.stroke();
  for (let q = 0; q < 4; q++) {
    const a = t * 0.08 + (q * TAU) / 4;
    ctx.fillStyle = '#fff6a0';
    starPath(ctx, x + Math.cos(a) * (r * 1.5 + 6), y - r + Math.sin(a) * (r * 1.2 + 4), 3 + (q % 2) * 1.5, 0.4, 4);
    ctx.fill();
  }
}
function drawCage(ctx: C2, x: number, y: number, r: number, broken: boolean, t: number) {
  ctx.strokeStyle = '#6f7a86';
  ctx.lineWidth = Math.max(2, r * 0.07);
  if (broken) {
    for (let q = 0; q < 4; q++) {
      ctx.save();
      ctx.translate(x - r * 1.6 + q * r, y - r * 0.05);
      ctx.rotate(-0.8 + q * 0.5);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 0.8, 0);
      ctx.stroke();
      ctx.restore();
    }
    return;
  }
  for (let q = 0; q < 5; q++) {
    const bx = x - r + (q * r * 2) / 4;
    ctx.beginPath();
    ctx.moveTo(bx, y);
    ctx.lineTo(bx, y - r * 1.7);
    ctx.stroke();
  }
  ctx.fillStyle = '#8a95a2';
  rr(ctx, x - r * 1.15, y - r * 1.85, r * 2.3, r * 0.22, r * 0.08);
  ctx.fill();
  ctx.fillStyle = '#fff6dc';
  rr(ctx, x - r * 0.75, y - r * 2.45, r * 1.5, r * 0.5, r * 0.12);
  ctx.fill();
  stroke(ctx, OUT, 1.2);
  ctx.fillStyle = '#d9480f';
  ctx.font = `900 ${Math.max(9, r * 0.36)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('사자', x, y - r * 2.2 + Math.sin(t * 0.1) * 0.5);
}
/** 말풍선 */
function bubble(ctx: C2, x: number, y: number, text: string, R: (v: number) => number, kind: number) {
  ctx.font = `800 ${Math.max(12, R(0.03))}px system-ui, sans-serif`;
  const tw = ctx.measureText(text).width, bw = tw + R(0.032), bh = Math.max(18, R(0.05));
  const bx = clamp(x - bw / 2, R(0.01), R(0.99) - bw);
  ctx.fillStyle = kind ? '#ffffff' : '#fff1a8';
  rr(ctx, bx, y - bh, bw, bh, bh * 0.45);
  ctx.fill();
  stroke(ctx, OUT, 1.6);
  ctx.beginPath();
  ctx.moveTo(x - R(0.01), y - 1);
  ctx.lineTo(x, y + R(0.014));
  ctx.lineTo(x + R(0.01), y - 1);
  ctx.fill();
  ctx.fillStyle = '#3a2a14';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + bw / 2, y - bh / 2 + 1);
}
/** 크기 칸(점 다섯) — 무엇을 고르고 있을 때만 */
function sizePips(ctx: C2, o: Th, x: number, y: number, R: (v: number) => number, hot: boolean) {
  const n = 5, gap = R(0.017), r0 = R(0.0055);
  ctx.fillStyle = 'rgba(40,25,10,.55)';
  rr(ctx, x - gap * 2.5 - r0 * 1.5, y - r0 * 2, gap * 5 + r0, r0 * 4, r0 * 2);
  ctx.fill();
  for (let q = 0; q < n; q++) {
    ctx.fillStyle = q < o.z ? (hot ? '#ffe14a' : '#ffffff') : 'rgba(255,255,255,.22)';
    ell(ctx, x - gap * 2 + q * gap, y, r0, r0);
    ctx.fill();
  }
}
/** 손가락(안내) */
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y + press * k * 0.15);
  ctx.rotate(-0.35);
  ctx.fillStyle = 'rgba(60,30,10,.22)';
  ell(ctx, k * 0.2, k * 1.25, k * 0.4, k * 0.12);
  ctx.fill();
  ctx.fillStyle = '#fff6ec';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(2, k * 0.08);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-k * 0.12, 0);
  ctx.lineTo(-k * 0.12, k * 0.55);
  ctx.quadraticCurveTo(-k * 0.45, k * 0.42, -k * 0.38, k * 0.62);
  ctx.lineTo(-k * 0.12, k * 1.05);
  ctx.quadraticCurveTo(k * 0.1, k * 1.25, k * 0.42, k * 1.05);
  ctx.quadraticCurveTo(k * 0.55, k * 0.75, k * 0.48, k * 0.5);
  ctx.quadraticCurveTo(k * 0.45, k * 0.38, k * 0.32, k * 0.4);
  ctx.quadraticCurveTo(k * 0.3, k * 0.3, k * 0.18, k * 0.32);
  ctx.quadraticCurveTo(k * 0.15, k * 0.24, k * 0.1, k * 0.26);
  ctx.lineTo(k * 0.1, 0);
  ctx.quadraticCurveTo(-k * 0.01, -k * 0.14, -k * 0.12, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
/** 도감 사진(동그라미 안 동물) / 실루엣 */
const SIL = new Map<string, HTMLCanvasElement>();
function portrait(ctx: C2, k: Kind, x: number, y: number, rad: number, mode: 'color' | 'sil' | 'lock', t: number) {
  ctx.save();
  ctx.fillStyle = mode === 'color' ? lin(ctx, 0, y - rad, 0, y + rad, [0, '#fff6dc'], [1, '#ffe2a8']) : mode === 'sil' ? '#cfe8ff' : '#d8d2c6';
  ell(ctx, x, y, rad, rad);
  ctx.fill();
  stroke(ctx, mode === 'sil' ? '#3d8df5' : OUT, mode === 'sil' ? 2.2 : 1.5);
  ell(ctx, x, y, rad - 1, rad - 1);
  ctx.clip();
  const ar = rad * (k === 'giraffe' ? 0.42 : k === 'penguin' ? 0.62 : 0.6), fy = y + rad * (k === 'giraffe' ? 0.95 : 0.78);
  const L: Look = { t, ph: 0, face: 'happy', sq: 0, lift: 0, walk: 0, tall: rad * 1.7, swim: 0, seed: 1 };
  if (mode === 'color') drawAnimal(ctx, k, x - rad * 0.12, fy, ar, L);
  else {
    const key = `${k}|${Math.round(rad)}|${mode}`;
    let c = SIL.get(key);
    if (!c && typeof document !== 'undefined') {
      c = document.createElement('canvas');
      const S2 = Math.ceil(rad * 2 * 2);
      c.width = S2;
      c.height = S2;
      const g = c.getContext('2d')!;
      g.scale(2, 2);
      drawAnimal(g, k, rad - rad * 0.12, rad + rad * (k === 'giraffe' ? 0.95 : 0.78), ar, L);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = mode === 'sil' ? '#2a4a7a' : '#a89e90';
      g.fillRect(0, 0, S2, S2);
      SIL.set(key, c);
    }
    if (c) ctx.drawImage(c, x - rad, y - rad, rad * 2, rad * 2);
  }
  ctx.restore();
  if (mode !== 'color') {
    ctx.fillStyle = mode === 'sil' ? '#ffffff' : '#7a7064';
    ctx.font = `900 ${Math.max(12, rad * 0.8)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (mode === 'lock') ctx.fillText('?', x, y + 1);
  }
}
/** 다음에 풀릴 새 친구 (지금 판 다음부터) */
function nextNew(s: SwapState): Kind | null {
  for (let i = s.stage + (s.phase === 'result' ? 1 : 0); i < STAGES.length; i++) {
    for (const t of STAGES[i].things) if (t.walk && DEX.includes(t.k) && !s.dex[DEX.indexOf(t.k)] && !(i === s.stage && s.newDex.includes(t.k))) return t.k;
  }
  return null;
}

/** 긴 말을 폭에 맞춰 줄로: ' — ' 다음 ' · ' 다음 가운데 띄어쓰기 */
function wrapText(ctx: C2, text: string, maxW: number): string[] {
  const out: string[] = [];
  const fit = (q: string) => {
    if (ctx.measureText(q).width <= maxW || !q.includes(' ')) return void out.push(q);
    if (q.includes(' · ')) return q.split(' · ').forEach((p, i, arr) => fit(i < arr.length - 1 ? p : p));
    const sp = [...q].map((c, i) => (c === ' ' ? i : -1)).filter((i) => i > 0);
    const mid = sp.reduce((b, i) => (Math.abs(i - q.length / 2) < Math.abs(b - q.length / 2) ? i : b), sp[0]);
    fit(q.slice(0, mid));
    fit(q.slice(mid + 1));
  };
  for (const part of text.split(' — ')) fit(part);
  return out;
}
/** 전구 단추: 0 보통 · 1 은은히 반짝(실패·막힘) · 2 환하게(힌트 중) */
function drawBulb(ctx: C2, x: number, y: number, r: number, t: number, glow: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  // 단추 바탕
  ctx.fillStyle = 'rgba(60,35,15,.25)';
  ell(ctx, 0, r * 0.1, r * 1.02, r * 1.02);
  ctx.fill();
  ctx.fillStyle = glow ? lin(ctx, 0, -r, 0, r, [0, '#fff6c0'], [1, '#ffd65a']) : lin(ctx, 0, -r, 0, r, [0, '#fffaf0'], [1, '#ffe2b0']);
  ell(ctx, 0, 0, r, r);
  ctx.fill();
  stroke(ctx, '#c08a50', 2);
  if (glow) {
    const pulse = glow === 2 ? 1 : 0.5 + 0.5 * Math.sin(t * 0.15);
    ctx.strokeStyle = `rgba(255,190,40,${0.35 + 0.45 * pulse})`;
    ctx.lineWidth = r * 0.12;
    ell(ctx, 0, 0, r * (1.12 + 0.08 * pulse), r * (1.12 + 0.08 * pulse));
    ctx.stroke();
    // 빛살
    ctx.strokeStyle = `rgba(255,170,20,${0.5 + 0.5 * pulse})`;
    ctx.lineWidth = Math.max(1.5, r * 0.07);
    ctx.lineCap = 'round';
    for (let q = 0; q < 5; q++) {
      const a = -Math.PI / 2 + (q - 2) * 0.55;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.62, -r * 0.18 + Math.sin(a) * r * 0.62);
      ctx.lineTo(Math.cos(a) * r * 0.82, -r * 0.18 + Math.sin(a) * r * 0.82);
      ctx.stroke();
    }
  }
  ctx.rotate(rot);
  // 유리알
  const gy = -r * 0.18, gr = r * 0.4;
  ctx.fillStyle = glow ? radg(ctx, -gr * 0.3, gy - gr * 0.3, 0, gr * 1.3, [0, '#ffffff'], [0.5, '#fff27a'], [1, '#ffc21a']) : radg(ctx, -gr * 0.3, gy - gr * 0.3, 0, gr * 1.3, [0, '#ffffff'], [1, '#e8eef4']);
  ctx.beginPath();
  ctx.arc(0, gy, gr, Math.PI * 0.82, Math.PI * 0.18);
  ctx.lineTo(gr * 0.42, gy + gr * 1.05);
  ctx.lineTo(-gr * 0.42, gy + gr * 1.05);
  ctx.closePath();
  ctx.fill();
  stroke(ctx, OUT, Math.max(1.4, r * 0.06));
  // 필라멘트
  ctx.strokeStyle = glow ? '#d9480f' : '#9a8a70';
  ctx.lineWidth = Math.max(1, r * 0.045);
  ctx.beginPath();
  ctx.moveTo(-gr * 0.3, gy + gr * 0.9);
  ctx.lineTo(-gr * 0.22, gy);
  ctx.quadraticCurveTo(0, gy - gr * 0.45, gr * 0.22, gy);
  ctx.lineTo(gr * 0.3, gy + gr * 0.9);
  ctx.stroke();
  // 나사 꼭지
  for (let q = 0; q < 3; q++) {
    ctx.fillStyle = q % 2 ? '#8a95a2' : '#b8c2cc';
    rr(ctx, -gr * 0.48, gy + gr * 1.05 + q * r * 0.09, gr * 0.96, r * 0.09, r * 0.03);
    ctx.fill();
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, r * 0.04);
  rr(ctx, -gr * 0.48, gy + gr * 1.05, gr * 0.96, r * 0.27, r * 0.03);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ell(ctx, -gr * 0.38, gy - gr * 0.35, gr * 0.16, gr * 0.24, -0.5);
  ctx.fill();
  ctx.restore();
}
/** 막힘 힌트 그리기: 말 카드 + 손가락(첫째 → 둘째 되풀이) + 바뀐 뒤 크기 미리 보기 */
function drawHint(ctx: C2, s: SwapState, t: number, w: number, R: (v: number) => number, font: (sz: number, wgt?: number) => void) {
  const hh = s.hint!, k = t - hh.t, W_ = s.w;
  const fade = clamp(k / 8, 0, 1);
  ctx.save();
  ctx.globalAlpha = fade;
  // 미리 보기와 손가락
  if (hh.retry) {
    const [rx, ry] = RETRY, press = (k % 50) / 50 > 0.45 && (k % 50) / 50 < 0.65 ? 1 : 0;
    ctx.strokeStyle = `rgba(255,220,80,${0.6 + 0.4 * Math.sin(t * 0.3)})`;
    ctx.lineWidth = 4;
    rr(ctx, R(rx - RETRY[2] / 2 - 0.01), R(ry - RETRY[3] / 2 - 0.01), R(RETRY[2] + 0.02), R(RETRY[3] + 0.02), R(0.025));
    ctx.stroke();
    drawHand(ctx, R(rx) + R(0.05), R(ry) - R(0.1), R(0.07), press);
  } else if (hh.a >= 0) {
    const A_ = W_.th[hh.a], B_ = W_.th[hh.b], [ax, ay] = hitCenter(W_, A_), [bx, by] = hitCenter(W_, B_);
    // 점선 호(두 물건 사이를 크기가 오간다)
    const dx = bx - ax, dy = by - ay, dl = Math.max(1e-6, Math.hypot(dx, dy)), bend = Math.min(0.18, 0.3 * dl) * (dx >= 0 ? 1 : -1);
    const mx = (ax + bx) / 2 + (dy / dl) * bend, my = (ay + by) / 2 - Math.abs(dx / dl) * bend - 0.04;
    ctx.strokeStyle = 'rgba(255,255,255,.95)';
    ctx.lineWidth = 3;
    ctx.setLineDash([R(0.016), R(0.012)]);
    ctx.lineDashOffset = -t * 0.8;
    ctx.beginPath();
    ctx.moveTo(R(ax), R(ay));
    ctx.quadraticCurveTo(R(mx), R(my), R(bx), R(by));
    ctx.stroke();
    ctx.setLineDash([]);
    // 바뀐 뒤 크기(반투명 동그라미 + 크기 칸)
    for (const [o, z2, cxx, cyy] of [[A_, B_.z, ax, ay], [B_, A_.z, bx, by]] as [Th, number, number, number][]) {
      const r2 = R(Math.max(0.06, RZ[Math.max(1, z2)] * 1.05));
      ctx.strokeStyle = 'rgba(255,225,80,.9)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([R(0.01), R(0.008)]);
      ell(ctx, R(cxx), R(cyy), r2, r2);
      ctx.stroke();
      ctx.setLineDash([]);
      sizePips(ctx, { ...o, z: z2 }, R(cxx), R(cyy) + Math.max(r2, R(0.06)) + R(0.022), R, true);
    }
    // 손가락: 하나가 골라져 있으면 다른 하나만, 아니면 첫째 → 둘째
    const cyc = 56, which = s.sel === hh.a ? 1 : s.sel === hh.b ? 0 : Math.floor(k / cyc) % 2, ph = (k % cyc) / cyc;
    const tg = which ? B_ : A_, [tx, ty] = which ? [bx, by] : [ax, ay], press = ph > 0.45 && ph < 0.65 ? 1 : 0;
    if (press) {
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 3;
      ell(ctx, R(tx), R(ty), R(0.03) + ph * R(0.035), R(0.03) + ph * R(0.035));
      ctx.stroke();
    }
    const off = R(Math.max(0.03, RZ[Math.max(1, tg.z)] * 0.8));
    drawHand(ctx, R(tx) + off * 0.4, R(ty) + off * 0.6, R(0.075), press);
    // 순서 번호
    ctx.fillStyle = '#d9480f';
    ell(ctx, R(tx) + off * 0.4 + R(0.07), R(ty) + off * 0.6 + R(0.02), R(0.02), R(0.02));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    font(0.026, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(which ? '2' : '1', R(tx) + off * 0.4 + R(0.07), R(ty) + off * 0.6 + R(0.021));
  }
  // 말 카드(위 띠 바로 아래) — 8초 뒤엔 접힌다
  const ka = k < 480 ? 1 : clamp((540 - k) / 60, 0, 1);
  if (ka > 0) {
    ctx.globalAlpha = fade * ka;
    ctx.font = `800 ${Math.max(12, R(0.031))}px system-ui, sans-serif`;
    const lines = wrapText(ctx, hh.text.replace(' → ', ' — '), R(0.8));
    const bh = R(0.03) + lines.length * R(0.04), by = R(0.168);
    ctx.fillStyle = 'rgba(60,35,15,.3)';
    rr(ctx, R(0.03), by + R(0.006), R(0.94), bh, R(0.025));
    ctx.fill();
    ctx.fillStyle = '#fffbe0';
    rr(ctx, R(0.03), by, R(0.94), bh, R(0.025));
    ctx.fill();
    stroke(ctx, '#ffb020', 2.5);
    drawBulb(ctx, R(0.075), by + bh / 2, R(0.03), t, 2, 0);
    ctx.fillStyle = '#4a2a12';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, R(0.125), by + R(0.035) + i * R(0.04)));
  }
  ctx.restore();
  void w;
}
function drawHud(ctx: C2, s: SwapState, v: Vis, w: number, h: number, R: (v: number) => number, font: (sz: number, wgt?: number) => void) {
  const t = s.t, d = STAGES[s.stage], st = starsOf(s.stage), budget = budgetOf(d);
  // ── 위 띠 ──
  ctx.fillStyle = 'rgba(60,35,15,.25)';
  rr(ctx, R(0.015), R(0.018), R(0.97), R(0.145), R(0.03));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, R(0.01), 0, R(0.15), [0, '#fffaf0'], [1, '#ffeccb']);
  rr(ctx, R(0.015), R(0.01), R(0.97), R(0.145), R(0.03));
  ctx.fill();
  stroke(ctx, '#c08a50', 2);
  // 하트
  for (let i = 0; i < 3; i++) {
    const on = i < s.hearts, hx = R(0.06 + i * 0.058), hy = R(0.05);
    const broken = !on && s.phase === 'fail' && i === s.hearts && s.pt < 60;
    ctx.fillStyle = on || broken ? '#ff4a6a' : 'rgba(120,90,70,.25)';
    heartPath(ctx, hx + (broken ? Math.sin(t * 1.3) * R(0.006) : 0), hy, R(0.021));
    ctx.fill();
    if (on) stroke(ctx, '#a8203a', 1.4);
  }
  // 판 이름(왼쪽)
  const left = Math.max(0, budget - s.w.swaps), pipL = R(0.835 - (budget - 1) * 0.036);
  ctx.fillStyle = '#4a2a12';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const title = `${d.ch + 1}-${s.stage + 1 - STAGES.findIndex((q) => q.ch === d.ch)} ${d.name}`;
  font(0.04, 900);
  const tw0 = ctx.measureText(title).width, room = pipL - R(0.06) - R(0.215);
  if (tw0 > room) ctx.font = `900 ${Math.max(12, (R(0.04) * room) / tw0)}px system-ui, sans-serif`;
  ctx.fillText(title, R(0.215), R(0.052));
  // 남은 뿅(반짝이)
  ctx.fillStyle = '#b8780e';
  font(0.03, 900);
  ctx.textAlign = 'right';
  ctx.fillText('뿅', pipL - R(0.022), R(0.053));
  ctx.textAlign = 'center';
  for (let i = 0; i < budget; i++) {
    const on = i < left, bx = R(0.835 - i * 0.036), by = R(0.05);
    ctx.fillStyle = on ? '#ffcf3a' : 'rgba(120,90,70,.22)';
    starPath(ctx, bx, by, R(on ? 0.019 + 0.002 * Math.sin(t * 0.15 + i) : 0.014), 0.42, 4);
    ctx.fill();
    if (on) stroke(ctx, '#b8780e', 1.2);
  }
  // 별 조건 칩(쉬운 말)
  ctx.font = `800 ${Math.max(12, R(0.032))}px system-ui, sans-serif`;
  let labels = st.map((q) => q.label), ws = labels.map((l) => ctx.measureText(l).width + R(0.06));
  let tot = ws.reduce((a, b) => a + b, 0) + R(0.012) * (ws.length - 1);
  if (tot > R(0.82)) {
    // 좁으면 짧은 말로
    labels = st.map((q) => q.short);
    ws = labels.map((l) => ctx.measureText(l).width + R(0.06));
    tot = ws.reduce((a, b) => a + b, 0) + R(0.012) * (ws.length - 1);
  }
  let cx = R(0.445) - tot / 2;
  st.forEach((q, i) => {
    const ok = s.phase === 'result' ? s.starOk[i] : s.w.swaps <= q.max, cw = ws[i], cy = R(0.112);
    ctx.fillStyle = ok ? '#fff3c4' : '#ece4d6';
    rr(ctx, cx, cy - R(0.024), cw, R(0.048), R(0.024));
    ctx.fill();
    stroke(ctx, ok ? '#e0a020' : '#c8bca8', 1.4);
    ctx.fillStyle = ok ? '#ffb020' : '#c8bca8';
    starPath(ctx, cx + R(0.026), cy, R(0.015));
    ctx.fill();
    ctx.fillStyle = ok ? '#4a2a12' : '#a09480';
    ctx.textAlign = 'left';
    ctx.fillText(labels[i], cx + R(0.046), cy + 1);
    cx += cw + R(0.012);
  });
  // 전구 단추(막힘 힌트): 한 번 실패하면 흔들, 15초 진전 없으면 반짝, 힌트 중엔 환하게
  if (s.phase === 'play' || s.phase === 'fail') {
    const stuck = s.phase === 'play' && t - s.progT > 900 && !s.hint, nudge = s.failsHere >= 1 || stuck, lit = !!s.hint && s.phase === 'play';
    drawBulb(ctx, R(BULB[0]), R(BULB[1]), R(0.058), t, lit ? 2 : nudge ? 1 : 0, s.failsHere >= 1 ? Math.sin(t * 0.2) * 0.18 * (0.6 + 0.4 * Math.sin(t * 0.05)) : stuck ? Math.sin(t * 0.3) * 0.12 : 0);
    if (stuck && (t >> 5) % 2 === 0) {
      ctx.fillStyle = '#4a2a12';
      font(0.028, 900);
      ctx.textAlign = 'right';
      ctx.fillText('막혔나요? 톡!', R(0.86), R(0.19));
    }
  }

  // ── 아래 띠: 다시 · 도감 ──
  const by0 = R(1.39);
  ctx.fillStyle = lin(ctx, 0, by0, 0, h, [0, '#8a5a32'], [1, '#6a4020']);
  ctx.fillRect(0, by0, w, h - by0);
  ctx.fillStyle = 'rgba(255,255,255,.15)';
  ctx.fillRect(0, by0, w, R(0.005));
  const [rx, ry, rw, rh] = RETRY;
  const canRetry = s.phase === 'play' && (s.w.swaps > 0 || (s.sel >= 0 && !s.lock));
  ctx.fillStyle = canRetry ? '#fff3c4' : 'rgba(255,243,196,.45)';
  rr(ctx, R(rx - rw / 2), R(ry - rh / 2), R(rw), R(rh), R(0.02));
  ctx.fill();
  stroke(ctx, '#4a2a12', 1.5);
  ctx.fillStyle = '#4a2a12';
  font(0.034, 900);
  ctx.textAlign = 'center';
  ctx.fillText('↺ 다시', R(rx), R(ry) + 1);
  const nx = nextNew(s);
  ctx.fillStyle = '#ffe9c4';
  font(0.028, 800);
  ctx.textAlign = 'left';
  ctx.fillText(`탈출한 친구들 ${s.dex.filter(Boolean).length}/${DEX.length}`, R(0.18), R(1.408));
  // 모은 친구는 작은 동물로 서서 깡총, 다음 친구는 실루엣, 나머지는 ?
  const here = s.w.walkers.filter((id) => s.w.th[id].st === 2).map((id) => s.w.th[id].k);
  DEX.forEach((k, i) => {
    const px = R(0.21 + i * 0.064), py = R(1.462), got = s.dex[i] > 0 || here.includes(k);
    if (got) {
      ctx.fillStyle = 'rgba(160,220,110,.9)';
      ell(ctx, px, py + R(0.016), R(0.027), R(0.008));
      ctx.fill();
      const hop = Math.max(0, Math.sin(t * 0.09 + i * 1.7)) * R(0.01);
      const L: Look = { t, ph: 0, face: 'happy', sq: 0, lift: hop, walk: 0, tall: R(0.07), swim: 0, seed: i };
      drawAnimal(ctx, k, px, py + R(0.016), R(k === 'giraffe' ? 0.012 : k === 'penguin' ? 0.017 : 0.016), L);
      if (!s.dex[i]) (ctx.fillStyle = '#ffe14a'), starPath(ctx, px + R(0.02), py - R(0.02), R(0.008), 0.4, 4), ctx.fill();
    } else {
      const pulse = k === nx ? 1 + 0.06 * Math.sin(t * 0.15) : 1;
      portrait(ctx, k, px, py, R(0.025) * pulse, k === nx ? 'sil' : 'lock', t);
    }
  });
  void v;

  // ── 판 시작 띠(안내): 새것이 하는 일 · 새 친구 특기 (답은 말하지 않는다) ──
  const bLines = s.banner ? (ctx.font = `800 ${Math.max(12, R(0.032))}px system-ui, sans-serif`, [...wrapText(ctx, s.banner.sub, R(0.9)), ...(s.banner.sub2 ? wrapText(ctx, s.banner.sub2, R(0.9)) : [])]) : [];
  const bDur = 230 + Math.max(0, bLines.length - 2) * 70;
  if (s.banner && t - s.banner.t < bDur && s.phase === 'play' && !(s.hint && t - s.hint.t > 8)) {
    const u = (t - s.banner.t) / bDur, a = u < 0.06 ? u / 0.06 : u > 0.88 ? (1 - u) / 0.12 : 1;
    ctx.save();
    ctx.globalAlpha = a;
    const by = R(0.162) + (1 - ease(Math.min(1, u * 8))) * -R(0.04);
    ctx.font = `800 ${Math.max(12, R(0.032))}px system-ui, sans-serif`;
    const subW = Math.max(...bLines.map((l) => ctx.measureText(l).width));
    const bw = Math.min(R(0.97), Math.max(R(0.6), subW + R(0.06))), bh = R(0.072) + bLines.length * R(0.038);
    ctx.fillStyle = 'rgba(60,35,15,.3)';
    rr(ctx, R(0.5) - bw / 2, by + R(0.006), bw, bh, R(0.03));
    ctx.fill();
    ctx.fillStyle = '#fff6dc';
    rr(ctx, R(0.5) - bw / 2, by, bw, bh, R(0.03));
    ctx.fill();
    stroke(ctx, '#e0a020', 2);
    ctx.fillStyle = '#4a2a12';
    ctx.textAlign = 'center';
    font(0.04, 900);
    ctx.fillText(s.banner.head, R(0.5), by + R(0.033));
    const nSub = s.banner.sub ? wrapText(ctx, s.banner.sub, R(0.9)).length : 0;
    ctx.font = `800 ${Math.max(12, R(0.032))}px system-ui, sans-serif`;
    bLines.forEach((l, i) => {
      ctx.fillStyle = i < nSub ? (s.banner!.sub.startsWith('NEW') ? '#d9480f' : '#6a4a2a') : '#2f7a3a';
      ctx.fillText(l, R(0.5), by + R(0.074) + i * R(0.038));
    });
    ctx.restore();
  }
  // ── 막힘 힌트: 다음 한 수(손가락 톡 → 톡) · 무엇을 왜 · 바뀐 뒤 크기 미리 보기 ──
  if (s.hint && s.phase === 'play') drawHint(ctx, s, t, w, R, font);
  // ── NEW 스포트라이트 ──
  if (s.spot && s.phase === 'play' && t - s.spot.t < 300) {
    const o = s.w.th[s.spot.id], [cx, cy] = hitCenter(s.w, o), u = (t - s.spot.t) / 300;
    const rad = R(Math.max(0.08, RZ[Math.max(1, o.z)] * 1.5)) * (1 + 0.08 * Math.sin(t * 0.2));
    ctx.save();
    ctx.globalAlpha = u > 0.85 ? (1 - u) / 0.15 : 1;
    ctx.strokeStyle = '#ffcf3a';
    ctx.lineWidth = 3;
    ctx.setLineDash([R(0.016), R(0.01)]);
    ctx.lineDashOffset = -t * 0.6;
    ell(ctx, R(cx), R(cy), rad, rad);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `900 ${Math.max(12, R(0.032))}px system-ui, sans-serif`;
    const lab = `NEW ${s.spot.label}`, lw2 = ctx.measureText(lab).width + R(0.03);
    const lx = clamp(R(cx) - lw2 / 2, R(0.01), R(0.99) - lw2), ly = R(cy) - rad - R(0.05);
    ctx.fillStyle = '#d9480f';
    rr(ctx, lx, ly, lw2, R(0.042), R(0.012));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(lab, lx + lw2 / 2, ly + R(0.022));
    ctx.restore();
  }
  // ── 손가락 안내(1·2판, 아직 안 바꿨을 때) ──
  if (s.phase === 'play' && s.stage <= 1 && s.w.swaps === 0 && !s.hint) {
    const tgts = s.stage === 0 ? [2] : [0, 2];
    const cyc = 70, k2 = Math.floor(t / cyc) % tgts.length, ph = (t % cyc) / cyc;
    const want = s.stage === 1 && s.sel === 0 ? 2 : tgts[k2];
    const o = s.w.th[want], [cx, cy] = hitCenter(s.w, o);
    const press = ph > 0.45 && ph < 0.65 ? 1 : 0;
    if (press) {
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = 2.5;
      ell(ctx, R(cx), R(cy), R(0.03) + ph * R(0.03), R(0.03) + ph * R(0.03));
      ctx.stroke();
    }
    const off = R(Math.max(0.03, RZ[Math.max(1, o.z)] * 0.9));
    drawHand(ctx, R(cx) + off * 0.5, R(cy) + off, R(0.07), press);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#4a2a12';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    font(0.036, 900);
    ctx.textAlign = 'center';
    const tip = s.stage === 0 ? '톡!' : s.sel === 0 ? '이제 호박 톡!' : want === 0 ? '하나 톡' : '다른 하나 톡';
    ctx.strokeText(tip, R(cx) + R(0.1) + off * 0.5, R(cy) + off + R(0.05));
    ctx.fillText(tip, R(cx) + R(0.1) + off * 0.5, R(cy) + off + R(0.05));
  }
  // ── 결과·실패 카드 ──
  if (s.phase === 'result') drawResult(ctx, s, v, w, h, R, font);
  if (s.phase === 'album') drawAlbum(ctx, s, v, w, h, R, font);
  if (s.phase === 'story') drawStory(ctx, s, w, h, R, font);
  if (s.phase === 'fail' && s.pt > 28) {
    const u = clamp((s.pt - 28) / 14, 0, 1);
    ctx.save();
    ctx.globalAlpha = u;
    ctx.fillStyle = 'rgba(40,20,10,.18)';
    ctx.fillRect(0, R(0.16), w, R(1.23));
    const cy = R(0.3) + (1 - ease(u)) * R(0.06);
    ctx.fillStyle = '#fff6dc';
    rr(ctx, R(0.12), cy, R(0.76), R(0.25), R(0.04));
    ctx.fill();
    stroke(ctx, '#c08a50', 2.5);
    ctx.fillStyle = '#d9480f';
    ctx.textAlign = 'center';
    font(0.06, 900);
    ctx.fillText(s.why.includes('잡혔') ? '잡혔다!' : '꽉 막혔어요!', R(0.5), cy + R(0.06));
    ctx.fillStyle = '#4a2a12';
    font(0.034, 800);
    ctx.fillText(s.why, R(0.5), cy + R(0.12));
    ctx.fillText(s.hearts > 0 ? `하트 -1 · 다시 해 봐요!` : '하트를 다 썼어요', R(0.5), cy + R(0.18));
    ctx.restore();
  }
}
/** 그 장에서 처음 만나는 친구들 */
function chFriends(ch: number): Kind[] {
  const out: Kind[] = [];
  STAGES.forEach((d) => {
    for (const t of d.things) if (t.walk && DEX.includes(t.k) && !out.includes(t.k) && !STAGES.some((e, j) => j < STAGES.indexOf(d) && e.things.some((u) => u.walk && u.k === t.k))) d.ch === ch && out.push(t.k);
  });
  return out;
}
/** 장 시작 이야기 한 컷: 그림책 한 쪽 — 아기들은 왼쪽에서 '엄마!', 엄마들은 저 멀리 기다린다 */
function drawStory(ctx: C2, s: SwapState, w: number, h: number, R: (v: number) => number, font: (sz: number, wgt?: number) => void) {
  const t = s.t, k0 = s.pt, ch = STAGES[s.stage].ch, st = STORY[ch], u = clamp(k0 / 18, 0, 1);
  ctx.save();
  ctx.fillStyle = `rgba(30,15,5,${0.6 * u})`;
  ctx.fillRect(0, 0, w, h);
  const x0 = R(0.05), y0 = R(0.17) + (1 - ease(u)) * R(0.08), pw = R(0.9), ph = R(1.16);
  ctx.globalAlpha = u;
  ctx.fillStyle = 'rgba(30,15,5,.35)';
  rr(ctx, x0 + R(0.01), y0 + R(0.012), pw, ph, R(0.04));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + ph, [0, '#fff8e6'], [1, '#f6e2b8']);
  rr(ctx, x0, y0, pw, ph, R(0.04));
  ctx.fill();
  stroke(ctx, '#a8743a', 3);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#d9480f';
  font(0.058, 900);
  ctx.fillText(st.title, R(0.5), y0 + R(0.07));
  // 그림 칸
  const gx = R(0.09), gy = y0 + R(0.13), gw = R(0.82), gh = R(0.62);
  ctx.save();
  rr(ctx, gx, gy, gw, gh, R(0.03));
  ctx.clip();
  ctx.drawImage(getBg(ch, Math.round(w), Math.round(h), 1), 0, R(0.3), w, R(0.95), gx, gy, gw, gh);
  ctx.fillStyle = 'rgba(255,240,200,.18)';
  ctx.fillRect(gx, gy, gw, gh);
  // 저 멀리 언덕 위 엄마들(장마다) — 하트가 퐁퐁
  const fr = chFriends(ch), moms = fr.length ? fr : DEX.slice(0, 3);
  const hillY = gy + gh * 0.42;
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ell(ctx, gx + gw * 0.74, hillY + R(0.03), gw * 0.3, R(0.05));
  ctx.fill();
  moms.slice(0, 5).forEach((k, i) => {
    const mx = gx + gw * (0.6 + i * 0.075), my = hillY + R(0.02) - (i % 2) * R(0.012), hop = Math.max(0, Math.sin(t * 0.12 + i)) * R(0.008);
    ctx.globalAlpha = u * 0.85;
    drawAnimal(ctx, k, mx, my, R(k === 'giraffe' ? 0.022 : 0.034), { t, ph: 0, face: 'happy', sq: 0, lift: hop, walk: 0, tall: R(0.1), swim: 0, seed: i });
    if ((t + i * 20) % 90 < 40) {
      ctx.fillStyle = '#ff5a7a';
      heartPath(ctx, mx, my - R(0.09) - ((t + i * 20) % 90) * R(0.0008), R(0.011));
      ctx.fill();
    }
  });
  ctx.globalAlpha = u;
  // 점선 발자국 길
  ctx.strokeStyle = 'rgba(120,80,30,.55)';
  ctx.lineWidth = 3;
  ctx.setLineDash([R(0.012), R(0.014)]);
  ctx.beginPath();
  ctx.moveTo(gx + gw * 0.18, gy + gh * 0.86);
  ctx.quadraticCurveTo(gx + gw * 0.45, gy + gh * 0.88, gx + gw * 0.62, hillY + R(0.05));
  ctx.stroke();
  ctx.setLineDash([]);
  // 아기들: 왼쪽 앞에서 '엄마!'
  const babies = ch === 0 ? DEX.slice(0, 4) : DEX.filter((_, i) => i < DEX.indexOf(fr[0] ?? 'lion')).slice(-4);
  babies.forEach((k, i) => {
    const bx = gx + gw * (0.12 + i * 0.11), by2 = gy + gh * (0.93 - (i % 2) * 0.03), hop = Math.max(0, Math.sin(t * 0.2 + i * 1.3)) * R(0.012);
    ctx.fillStyle = 'rgba(30,40,10,.25)';
    ell(ctx, bx, by2 + 1, R(0.04), R(0.01));
    ctx.fill();
    drawAnimal(ctx, k, bx, by2, R(k === 'giraffe' ? 0.026 : 0.04), { t, ph: t * 0.2 + i, face: 'happy', sq: 0, lift: hop, walk: 1, tall: R(0.12), swim: 0, seed: i });
  });
  ctx.restore();
  rr(ctx, gx, gy, gw, gh, R(0.03));
  stroke(ctx, '#a8743a', 2.5);
  if (k0 > 20) bubble(ctx, gx + gw * 0.2, gy + gh * 0.66, '엄마!', R, 1);
  if (k0 > 45) bubble(ctx, gx + gw * 0.74, hillY - R(0.08), '아가야~ 여기야!', R, 1);
  // 이야기 두 줄
  ctx.fillStyle = '#4a2a12';
  font(0.036, 900);
  ctx.fillText(st.a, R(0.5), y0 + R(0.83));
  ctx.fillStyle = '#6a4a2a';
  font(0.033, 800);
  ctx.fillText(st.b, R(0.5), y0 + R(0.89));
  // 이번 장 새 친구 실루엣
  ctx.fillStyle = '#3d6fb0';
  font(0.03, 900);
  ctx.fillText(`이번 장에서 만날 새 친구 ${fr.length}마리`, R(0.5), y0 + R(0.955));
  fr.forEach((k, i) => portrait(ctx, k, R(0.5) + (i - (fr.length - 1) / 2) * R(0.1), y0 + R(1.03), R(0.035), 'sil', t));
  if (k0 > 40) {
    ctx.fillStyle = `rgba(74,42,18,${0.6 + 0.4 * Math.sin(t * 0.15)})`;
    font(0.034, 900);
    ctx.fillText('톡 하면 시작 ▶', R(0.5), y0 + ph - R(0.035));
  }
  ctx.restore();
}
/** 장 끝 보상: 도감 한 쪽이 펼쳐지며 이번 장 친구들이 '찰칵' 붙고, 다음 장 무대가 실루엣으로 */
function drawAlbum(ctx: C2, s: SwapState, v: Vis, w: number, h: number, R: (v: number) => number, font: (sz: number, wgt?: number) => void) {
  const t = s.t, k0 = t - v.albumT, ch = s.album, fr = chFriends(ch), u = clamp(k0 / 20, 0, 1);
  ctx.save();
  ctx.fillStyle = `rgba(30,15,5,${0.55 * u})`;
  ctx.fillRect(0, 0, w, h);
  // 책장이 펼쳐짐(가로로 열림)
  const open = ease(clamp(k0 / 22, 0, 1)), x0 = R(0.05), y0 = R(0.15), pw = R(0.9), ph = R(1.2);
  ctx.translate(R(0.5), 0);
  ctx.scale(Math.max(0.02, open), 1);
  ctx.translate(-R(0.5), 0);
  ctx.fillStyle = 'rgba(30,15,5,.35)';
  rr(ctx, x0 + R(0.01), y0 + R(0.012), pw, ph, R(0.04));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + ph, [0, '#fff8e6'], [1, '#f6e2b8']);
  rr(ctx, x0, y0, pw, ph, R(0.04));
  ctx.fill();
  stroke(ctx, '#a8743a', 3);
  // 공책 고리
  for (let q = 0; q < 6; q++) {
    ctx.fillStyle = '#c8a070';
    ell(ctx, x0 + R(0.03), y0 + R(0.12 + q * 0.19), R(0.012), R(0.012));
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#d9480f';
  font(0.05, 900);
  ctx.fillText(`${ch + 1}장 가족 사진첩`, R(0.5), y0 + R(0.06));
  ctx.fillStyle = '#6a4a2a';
  font(0.032, 800);
  ctx.fillText(s.won ? '모든 아기가 엄마 품으로! 동물원 대탈출 끝!' : '엄마를 다시 만났어요! 찰칵!', R(0.5), y0 + R(0.115));
  // 사진: 하나씩 찰칵
  const cols = fr.length > 4 ? 3 : fr.length === 3 ? 3 : 2, cw = R(cols === 3 ? 0.24 : 0.25), chh = cw * 1.18, gap = R(0.03);
  const gx0 = R(0.5) - (cols * cw + (cols - 1) * gap) / 2;
  fr.forEach((k, i) => {
    const kk = k0 - (34 + i * 30);
    if (kk < 0) return;
    if (v.albumN <= i) {
      v.albumN = i + 1;
      const fx = juice(s);
      fx.sound('coin', 1 + i * 0.12, 1);
      fx.sound('chime', 1 + i * 0.08, 0.7);
      fx.blink('#ffffff', 0.45);
    }
    const col = i % cols, row = Math.floor(i / cols), px = gx0 + col * (cw + gap) + cw / 2, py = y0 + R(0.16) + row * (chh + gap) + chh / 2;
    const pop = kk < 10 ? 1 + 0.35 * Math.sin((kk / 10) * Math.PI) : 1, rot = (i % 2 ? 0.05 : -0.05) * (1 + (kk < 10 ? 1 - kk / 10 : 0));
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.scale(pop, pop);
    ctx.fillStyle = 'rgba(40,20,10,.25)';
    rr(ctx, -cw / 2 + R(0.006), -chh / 2 + R(0.008), cw, chh, R(0.008));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    rr(ctx, -cw / 2, -chh / 2, cw, chh, R(0.008));
    ctx.fill();
    stroke(ctx, '#d8ccb8', 1.5);
    const iw = cw - R(0.03), ih = chh - R(0.075);
    ctx.fillStyle = lin(ctx, 0, -chh / 2, 0, -chh / 2 + ih, [0, '#9fdcff'], [0.6, '#d8f4ff'], [0.61, '#9fdc6a'], [1, '#7cc64e']);
    ctx.fillRect(-iw / 2, -chh / 2 + R(0.015), iw, ih);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-iw / 2, -chh / 2 + R(0.015), iw, ih);
    ctx.clip();
    // 엄마(뒤, 크게) + 아기(앞, 작게) — 하트 퐁퐁
    const gy2 = -chh / 2 + R(0.015) + ih * 0.92, base = Math.min(iw, ih);
    const Lm: Look = { t, ph: 0, face: 'happy', sq: 0, lift: 0, walk: 0, tall: ih * 0.85, swim: 0, seed: i + 5 };
    drawAnimal(ctx, k, R(0.025), gy2 - R(0.004), base * (k === 'giraffe' ? 0.15 : 0.27), Lm);
    const L: Look = { t, ph: 0, face: 'happy', sq: 0, lift: Math.abs(Math.sin(t * 0.12 + i)) * R(0.01), walk: 0, tall: ih * 0.5, swim: 0, seed: i };
    drawAnimal(ctx, k, -R(0.04), gy2 + R(0.004), base * (k === 'giraffe' ? 0.08 : 0.15), L);
    ctx.fillStyle = '#ff5a7a';
    heartPath(ctx, -R(0.005), -chh / 2 + R(0.04) + Math.sin(t * 0.1 + i) * R(0.004), R(0.012));
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#4a2a12';
    font(0.03, 900);
    ctx.fillText(K[k].name, 0, chh / 2 - R(0.03));
    // 테이프
    ctx.fillStyle = 'rgba(255,220,120,.75)';
    ctx.fillRect(-R(0.035), -chh / 2 - R(0.012), R(0.07), R(0.024));
    if (kk < 18) {
      ctx.fillStyle = '#ff4a6a';
      font(0.034, 900);
      ctx.fillText('찰칵!', 0, -chh / 2 - R(0.04));
    }
    ctx.restore();
  });
  // 다음 장 미리 보기(실루엣 무대)
  const done = k0 > 34 + fr.length * 30;
  const ny = y0 + R(0.79);
  if (done && !s.won) {
    const nch = ch + 1, wx = R(0.12), ww = R(0.76), wh = R(0.25), a2 = clamp((k0 - (34 + fr.length * 30)) / 20, 0, 1);
    if (!v.albumNext) (v.albumNext = true), juice(s).sound('swell', 0.8, 0.8);
    ctx.globalAlpha = a2;
    ctx.save();
    rr(ctx, wx, ny, ww, wh, R(0.03));
    ctx.clip();
    const bg = getBg(nch, Math.round(w), Math.round(h), 1);
    ctx.drawImage(bg, 0, R(0.25), w, R(0.5), wx, ny, ww, wh);
    ctx.fillStyle = 'rgba(20,30,70,.62)';
    ctx.fillRect(wx, ny, ww, wh);
    chFriends(nch).forEach((k, i, arr) => {
      const px = wx + (ww * (i + 0.5)) / arr.length, py = ny + wh * 0.62;
      portrait(ctx, k, px, py, R(0.045), 'sil', t);
    });
    ctx.restore();
    rr(ctx, wx, ny, ww, wh, R(0.03));
    stroke(ctx, '#3d8df5', 3);
    ctx.fillStyle = '#ffffff';
    font(0.04, 900);
    ctx.fillText(`다음 장 · ${CHAPTERS[nch]}`, R(0.5), ny + R(0.045));
    ctx.fillStyle = '#3d6fb0';
    font(0.032, 900);
    ctx.fillText(`새 친구 ${chFriends(nch).length}마리가 기다려요…?`, R(0.5), ny + wh + R(0.035));
    ctx.globalAlpha = 1;
  } else if (done && s.won) {
    if (!v.albumNext) (v.albumNext = true), juice(s).sound('clear', 1.2, 1), juice(s).burst(R(0.5), ny, '#ffe14a', 40, 6, 3);
    // 모두 함께: 열두 친구가 줄지어 깡총
    DEX.forEach((k, i) => {
      const gx = R(0.17 + (i % 6) * 0.132 + (i >= 6 ? 0.066 : 0)), gy = ny + R(i < 6 ? 0.09 : 0.2), hop = Math.max(0, Math.sin(t * 0.12 + i * 0.9)) * R(0.012);
      const L: Look = { t, ph: 0, face: 'happy', sq: 0, lift: hop, walk: 0, tall: R(0.08), swim: 0, seed: i };
      if (s.dex[i] || s.won) drawAnimal(ctx, k, gx, gy, R(k === 'giraffe' ? 0.016 : 0.024), L);
    });
    ctx.fillStyle = '#d9480f';
    font(0.044, 900);
    ctx.fillText(`탈출한 친구들 ${s.dex.filter(Boolean).length}/${DEX.length} · 대탈출 완성!`, R(0.5), ny + R(0.27));
  }
  if (k0 > 70) {
    ctx.fillStyle = `rgba(74,42,18,${0.6 + 0.4 * Math.sin(t * 0.15)})`;
    font(0.034, 900);
    ctx.fillText(s.won ? '톡 하면 끝!' : '톡 하면 다음 장 ▶', R(0.5), y0 + ph - R(0.035));
  }
  ctx.restore();
}
function drawResult(ctx: C2, s: SwapState, v: Vis, w: number, h: number, R: (v: number) => number, font: (sz: number, wgt?: number) => void) {
  void h;
  const u = clamp((s.pt - 16) / 18, 0, 1);
  if (u <= 0) return;
  const t = s.t;
  ctx.save();
  ctx.globalAlpha = u;
  ctx.fillStyle = 'rgba(40,20,10,.4)';
  ctx.fillRect(0, R(0.16), w, R(1.23));
  const y0 = R(0.24) + (1 - ease(u)) * R(0.08), cw = R(0.86), ch = R(1.08), x0 = R(0.07);
  ctx.fillStyle = 'rgba(40,20,10,.3)';
  rr(ctx, x0, y0 + R(0.01), cw, ch, R(0.05));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + ch, [0, '#fffaf0'], [1, '#ffe9c4']);
  rr(ctx, x0, y0, cw, ch, R(0.05));
  ctx.fill();
  stroke(ctx, '#c08a50', 3);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#d9480f';
  font(0.068, 900);
  ctx.fillText(s.won ? '동물원 대탈출 성공!' : '탈출 성공!', R(0.5), y0 + R(0.07));
  // 별
  for (let i = 0; i < s.ofStars; i++) {
    const k = t - v.starT - (34 + i * 14), sx = R(0.5) + (i - (s.ofStars - 1) / 2) * R(0.15), sy = y0 + R(0.17);
    const on = s.starOk[i] && k >= 0, pop = on ? (k < 8 ? 1 + 0.4 * Math.sin((k / 8) * Math.PI) : 1) : 1;
    ctx.fillStyle = on ? '#ffcf3a' : '#e3d6c0';
    starPath(ctx, sx, sy, R(0.055) * pop);
    ctx.fill();
    stroke(ctx, on ? '#b8780e' : '#c8bca8', 2);
  }
  ctx.fillStyle = '#6a4a2a';
  font(0.034, 800);
  ctx.fillText(`바꾼 횟수 ${s.w.swaps}번${s.got < s.ofStars ? ` · 별 셋은 ${starsOf(s.stage)[s.ofStars - 1].max}번` : ''}`, R(0.5), y0 + R(0.255));
  if (s.hintsHere > 0) {
    ctx.fillStyle = '#a08a60';
    font(0.026, 800);
    ctx.fillText(`힌트 ${s.hintsHere}번`, R(0.83), y0 + R(0.04));
  }
  // 도감 사진(폴라로이드)
  const nk = s.newDex[0] ?? s.w.th[s.w.walkers[0]].k, isNew = s.newDex.length > 0, py = y0 + R(0.3);
  ctx.save();
  ctx.translate(R(0.5), py + R(0.2));
  ctx.rotate(-0.04);
  ctx.fillStyle = 'rgba(40,20,10,.25)';
  rr(ctx, -R(0.2) + R(0.008), -R(0.2) + R(0.01), R(0.4), R(0.46), R(0.01));
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  rr(ctx, -R(0.2), -R(0.2), R(0.4), R(0.46), R(0.01));
  ctx.fill();
  stroke(ctx, '#d8ccb8', 1.5);
  ctx.fillStyle = lin(ctx, 0, -R(0.18), 0, R(0.16), [0, '#9fdcff'], [0.65, '#d8f4ff'], [0.66, '#9fdc6a'], [1, '#7cc64e']);
  ctx.fillRect(-R(0.18), -R(0.18), R(0.36), R(0.34));
  const L: Look = { t, ph: t * 0.1, face: 'happy', sq: 0, lift: Math.abs(Math.sin(t * 0.1)) * R(0.01), walk: 0, tall: R(0.27), swim: 0, seed: 2 };
  ctx.save();
  ctx.beginPath();
  ctx.rect(-R(0.18), -R(0.18), R(0.36), R(0.34));
  ctx.clip();
  if (s.won) {
    // 마지막: 모두 함께 단체 사진
    DEX.forEach((k, i) => {
      const row = i < 5 ? 1 : 0, col = row ? i : i - 5, gx = -R(0.14) + col * R(0.07) + (row ? 0 : R(0.035)), gy = row ? R(0.13) : R(0.04);
      drawAnimal(ctx, k, gx, gy, R(k === 'giraffe' ? 0.022 : 0.03), { ...L, ph: i, lift: Math.abs(Math.sin(t * 0.1 + i)) * R(0.008), seed: i });
    });
  } else drawAnimal(ctx, nk, -R(0.02), R(0.12), R(nk === 'giraffe' ? 0.06 : 0.085), L);
  ctx.restore();
  ctx.fillStyle = '#4a2a12';
  font(0.04, 900);
  ctx.fillText(s.won ? '모두 함께 찰칵!' : K[nk].name, 0, R(0.205));
  ctx.restore();
  if (isNew) {
    const k2 = t - v.starT - 80, pop = k2 >= 0 && k2 < 10 ? 1 + 0.3 * Math.sin((k2 / 10) * Math.PI) : 1;
    ctx.save();
    ctx.translate(R(0.74), py + R(0.03));
    ctx.rotate(0.2);
    ctx.scale(pop, pop);
    ctx.fillStyle = '#ff4a6a';
    rr(ctx, -R(0.09), -R(0.03), R(0.18), R(0.06), R(0.03));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    font(0.032, 900);
    ctx.fillText('새 친구!', 0, 1);
    ctx.restore();
  }
  ctx.fillStyle = '#6a4a2a';
  font(0.032, 800);
  ctx.fillText(s.won ? '동물원 친구 열 마리가 모두 밖으로!' : isNew ? `특기: ${K[nk].skill}` : '또 만났어요! 도감 사진 한 장 더', R(0.5), py + R(0.515));
  // 다음 친구 실루엣
  const nx = nextNew(s);
  if (nx && !s.won) {
    const ny = y0 + R(0.92);
    portrait(ctx, nx, R(0.3), ny, R(0.055), 'sil', t);
    ctx.fillStyle = '#3d6fb0';
    ctx.textAlign = 'left';
    font(0.034, 900);
    ctx.fillText('다음에 만날 친구는…?', R(0.38), ny);
    ctx.textAlign = 'center';
  } else if (s.won) {
    ctx.fillStyle = '#3d6fb0';
    font(0.036, 900);
    ctx.fillText(`도감 ${s.dex.filter(Boolean).length}/${DEX.length} — 모두 탈출!`, R(0.5), y0 + R(0.92));
  }
  if (s.pt > 60) {
    const btn = (b: [number, number, number, number], label: string, hot: boolean) => {
      ctx.fillStyle = hot ? '#ffcf3a' : '#fff3c4';
      rr(ctx, R(b[0] - b[2] / 2), R(b[1] - b[3] / 2), R(b[2]), R(b[3]), R(0.03));
      ctx.fill();
      stroke(ctx, '#4a2a12', 2);
      ctx.fillStyle = '#4a2a12';
      font(0.034, 900);
      ctx.fillText(label, R(b[0]), R(b[1]) + 1);
    };
    if (s.won) {
      ctx.fillStyle = '#4a2a12';
      font(0.036, 900);
      ctx.fillText('끝까지 탈출했어요!', R(0.5), R(NEXT[1]));
    } else if (s.got < s.ofStars) {
      btn(REPLAY, '↺ 별 더 따기', false);
      btn(NEXT, '다음 판 ▶', true);
    } else btn([0.5, NEXT[1], 0.5, NEXT[3]], '다음 판 ▶', true);
  }
  // 장이 끝나면: 다음 장 미리 보기 띠
  const nd = STAGES[s.stage + 1];
  if (nd && nd.ch !== STAGES[s.stage].ch) {
    ctx.save();
    ctx.translate(R(0.5), y0 - R(0.012));
    ctx.rotate(-0.03);
    ctx.fillStyle = '#3d8df5';
    rr(ctx, -R(0.4), -R(0.03), R(0.8), R(0.06), R(0.03));
    ctx.fill();
    stroke(ctx, '#1c5aa8', 2);
    ctx.fillStyle = '#ffffff';
    font(0.032, 900);
    ctx.fillText(`${STAGES[s.stage].ch + 1}장 끝! 다음은 ${CHAPTERS[nd.ch]}`, 0, 1);
    ctx.restore();
  }
  ctx.restore();
}

/** 분석용 그림 모음(동물·소품 한눈에) */
export function __gallery(ctx: C2, ks: Kind[], props: Kind[]) {
  ks.forEach((k, i) => {
    const x = 80 + (i % 5) * 290, y = 260 + Math.floor(i / 5) * 260;
    for (const [j, f] of (['idle', 'shock', 'strain', 'happy'] as Face[]).entries()) {
      const L: Look = { t: 30, ph: j, face: f, sq: 0, lift: 0, walk: j === 0 ? 0 : 1, tall: 170, swim: 0, seed: i };
      if (j === 0) drawAnimal(ctx, k, x + 40, y, 45, L);
      else drawAnimal(ctx, k, x + 110 + j * 45, y - 120, 16, L);
    }
  });
  props.forEach((k, i) => drawThing(ctx, k, 60 + i * 110, 680, 34, 0, 10));
  drawKeeper(ctx, 1420, 250, 50, 'duty', 10, true, 1);
  drawKeeper(ctx, 1420, 500, 50, 'alarm', 10, false, 1);
}
