/**
 * [스튜디오 M0] 발견 공장 arcade/games/screwshop.ts(25라운드 졸업본)를 그대로 옮겨 온 것. 이제부터 이 파일만 키운다.
 * 나사 풀기 공방 (25라운드: 검증된 캐주얼 뼈대 × 공장의 와우) — 나사 풀기 × 분류하기 × 가리키기(톡).
 * 기준 9(손이 하는 일은 하나): 나사를 톡. 누르고 있는 동안 그 나사가 갈 곳(상자 구멍·빈칸)과 흔들릴/떨어질 판자가 흐리게 보이고,
 *   떼면 나사가 뱅글뱅글 풀려 날아간다(나사 밖에서 떼면 취소). 키보드는 화살표 커서 + 스페이스.
 * 규칙(결정적): 판자는 겹쳐 있고 위 판자에 걸친 나사는 못 뺀다. 뺀 나사는 같은 색 상자(3개 들어감)로, 맞는 상자가 없으면 빈칸(5칸)으로.
 *   상자가 차면 닫혀 떠나고 다음 색 상자가 온다(다음 상자 2개 미리 보기) — 빈칸의 같은 색 나사는 저절로 옮겨 간다.
 *   빈칸 5개가 다 차면 실패. 판자의 나사를 다 빼면 판자가 '덜컹' 떨어진다.
 * 와우(진자): 나사 하나만 남은 판자는 그 나사를 축으로 시계추처럼 빙글 흔들리다 무게중심이 바로 아래로 오게 매달린다.
 *   매달린 판자는 다른 나사를 새로 덮거나 드러낸다 — 어느 나사를 마지막에 남기느냐가 수다.
 * 판(장난감) 8개: 목표 = 나사를 다 빼서 장난감을 다 풀기. 별 = ★ 완성 · ★ 빈칸을 P칸 넘게 안 쓰기 · ★ 연속 쏙 C번(빈칸 안 거치고 상자로).
 *   실패(빈칸이 꽉 참 · 뺄 나사가 없음) = 하트 -1, 그 판을 처음부터. 하트 셋을 다 잃거나 8판을 마치면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1판 기린(톡·진자) → 2판 돛단배(겹친 판자·빈칸) → 3판 풍차(상자 둘 — 어느 색부터)
 *   → 4판 기차(자물쇠 나사: 열쇠 나사를 먼저 파내기) → 5판 해바라기(못 판자: 안 떨어지고 매달려 계속 가림 — 아래 나사부터)
 *   → 6판 공룡(스프링 판자: 떨어지며 튕겨 옆 판자 나사를 톡 — 그 색 상자가 열려 있을 때 떨구기) → 7판 성(유리 판자: 비쳐 보이지만 막음)
 *   → 8판 로켓(전부).
 * 웃음: 작업대 위 햄스터 목수가 판자가 흔들리면 눈이 동그래지고, 상자가 차면 우쭐, 빈칸이 차오르면 식은땀, 실패하면 어질어질 별.
 *   판자 꼭대기의 참새는 '덜컹'에 놀라 폴짝 날아오른다.
 */
import { mulberry32, type Rng } from './rng.ts';
import type { Bot, GameDef, Input, Theme } from './core.ts';
import { juice } from './juice.ts';
import type { Cue } from './sfx.ts';

/** 소리 연결(🎨 ART §2): 그림(draw)의 사건 루프에서만 부른다 — 시뮬레이션·봇은 소리를 모른다. main.ts가 sfx.play를 꽂는다 */
let cue: (c: Cue, v?: number) => void = () => {};
export const setCue = (f: (c: Cue, v?: number) => void) => void (cue = f);

const A = 1.45;
/** 나사 머리 반지름 · 손가락 닿는 반지름 · 빈칸 수 · 미리 보이는 다음 상자 수 */
const SR = 0.032, HIT = 0.075, SLOTS = 5, PEEK = 2;
/** 판자 가장자리가 나사 머리를 덮는 정도: sd < COVER면 막힘, sd < HIDE면 아예 안 보임 */
const COVER = 0.021, HIDE = -0.026;
const COOL = 8, SPIN = 9, FLY = 17, RESULT_OK = 200, RESULT_FAIL = 160, NEWS_T = 200;
const STAR_PTS = 100, WIN_PTS = 100;

// ───────────────────────────── 장난감(판) ─────────────────────────────
type Kind = 'wood' | 'glass' | 'spring' | 'nail';
/** 판자 하나: 둥근 네모(가운데 cx,cy · 반폭 hx,hy · 각 a · 모서리 rr). sc = 나사 자리(작업판 좌표) */
interface Src { cx: number; cy: number; hx: number; hy: number; a: number; rr: number; kind: Kind; tone: string; deco: string; sc: number[][]; lock?: number[]; key?: number; nail?: number[]; tgt?: number; tick?: number[][]; /** 🔨 망치 머리(정지 자세의 작업판 좌표) — 나사 하나에 매달리는 순간 그 근처 나사를 쾅 (M1′ S001, GIMMICKS §2) */ ham?: number[]; /** 🪵 통나무: 떨어지면 밑에 매달린 판자들을 위부터 쳐서 떨군다 (M1′ S002) */ heavy?: boolean }
type O = Partial<Src>;
const mk = (cx: number, cy: number, hx: number, hy: number, a: number, rr: number, tone: string, sc: number[][], o: O = {}): Src => ({ cx, cy, hx, hy, a, rr: Math.min(rr, hx, hy), kind: 'wood', tone, deco: '', sc, ...o });
const bar = (x1: number, y1: number, x2: number, y2: number, t: number, tone: string, sc: number[][], o: O = {}) =>
  mk((x1 + x2) / 2, (y1 + y2) / 2, Math.hypot(x2 - x1, y2 - y1) / 2 + t, t, Math.atan2(y2 - y1, x2 - x1), t, tone, sc, o);
const plate = (cx: number, cy: number, w: number, h: number, a: number, rr: number, tone: string, sc: number[][], o: O = {}) => mk(cx, cy, w / 2, h / 2, a, rr, tone, sc, o);
const disc = (cx: number, cy: number, r: number, tone: string, sc: number[][], o: O = {}) => mk(cx, cy, r, r, 0, r, tone, sc, o);

interface StageDef { key: string; name: string; emoji: string; news: string; tip: string; boxes: number; colors: number; P: number; C: number; /** ★3을 '톡 T번 이하'로 (없으면 연속 쏙 C) */ T?: number; /** 첫 판 손가락이 가리킬 나사 번호(판자 목록 순서로 0부터) */ first?: number; /** ★3을 '한 방 H 이상'으로 (톡 한 번에 빠진 나사 수) */ H?: number; /** 🪵 통나무가 떨어져야 풀리는 나사 3개(늦은 무리)를 한 색으로 칠하고 그 색 상자를 queue[late]에 — 통나무 나사 색은 첫 상자 (📐 2판) */ late?: number; toy(): Src[] }

const GIR = '#f4bf4a', GIR2 = '#e7a93a', DINO = '#52b66c', DINO2 = '#3f9a58', BLADE = '#fff6e6', STONE = '#b9aea0', STONE2 = '#a69a8b', GLASS = '#cfe9ff';
export const STAGES: StageDef[] = [
  {
    // 📐 CONTENT.md M1′ 1판 (S001): 기린은 망치 장난감 — 머리·꼬리·몸통이 각각 망치. "칠 나사 바로 위 나사를 남기면 끄덕 쾅"
    key: 'giraffe', name: '기린', emoji: '🦒', news: '🔩 나사를 톡 → 같은 색 상자로 쏙!', tip: '🔨 망치 옆 나사를 먼저 톡 → 끄덕 쾅!', boxes: 2, colors: 3, P: 0, C: 6, T: 6, first: 8,
    // 나사 번호: #0 뒷다리 · #1 앞다리 · #2 #3 몸통(왼·오른) · #4 #5 꼬리(뿌리·끝) · #6 목 · #7 #8 머리(뒤통수·주둥이)
    // 판자 순서 = 겹침 순서(뒤가 위). 다리·목은 나사가 무게중심 바로 위라 처음부터 돌지 않는다.
    toy: () => [
      bar(0.35, 0.93, 0.35, 1.12, 0.036, GIR2, [[0.35, 1.0]], { deco: 'hoof' }),
      bar(0.69, 0.93, 0.69, 1.12, 0.036, GIR2, [[0.69, 0.99]], { deco: 'hoof' }),
      plate(0.52, 0.875, 0.4, 0.15, 0, 0.07, GIR, [[0.45, 0.86], [0.62, 0.86]], { deco: 'spots', ham: [0.5, 0.95] }),
      bar(0.37, 0.845, 0.25, 0.775, 0.022, GIR2, [[0.355, 0.84], [0.265, 0.784]], { deco: 'tail', ham: [0.24, 0.77] }),
      bar(0.7, 0.84, 0.7, 0.6, 0.042, GIR, [[0.7, 0.655]], { deco: 'spots' }),
      plate(0.78, 0.5, 0.22, 0.1, -0.2, 0.045, GIR, [[0.71, 0.515], [0.85, 0.485]], { deco: 'gHead', ham: [0.875, 0.48] }),
    ],
  },
  {
    // 📐 CONTENT.md M1′ 2판 (S002): 돛단배는 통나무 장난감 — 🪵 활대가 떨어지면 밑에 매달린 돛을 와르르. "돛은 나사 하나만 남겨 매달고, 활대는 마지막에"
    key: 'boat', name: '돛단배', emoji: '⛵', news: '🪵 활대는 통나무 — 떨어지면 밑에 매달린 판자를 와르르!', tip: '🪵 돛은 나사 하나만 남겨 매달고, 활대는 마지막에!', boxes: 2, colors: 4, P: 1, C: 6, H: 3, late: 2,
    // 나사 번호: #0 #1 선체(위·아래) · #2 #3 돛대(꼭대기·활대 밑) · #4~#6 작은 돛(위·가운데·아래) · #7~#10 큰 돛(위→아래) · #11 활대 한가운데(방아쇠)
    // 판자 순서 = 겹침 순서(뒤가 위). 활대가 #3을, 돛대가 선체 #0 #1을 누른다 → 셋은 활대가 떨어진 뒤에만 풀린다(늦은 무리 = 한 색, 셋째 상자).
    // 와르르 과녁은 돛 둘뿐: 돛대 나사는 둘 다 활대 중심(0.56)보다 위, 선체는 와르르 때 늘 나사 2개. 돛 나사는 좌우로 엇갈려 매달리면 기우뚱(14°)·빙글(37~170°).
    toy: () => [
      plate(0.5, 1.04, 0.62, 0.12, 0, 0.05, '#e2574c', [[0.5, 1.005], [0.5, 1.075]], { deco: 'port' }),
      bar(0.46, 0.4, 0.46, 1.08, 0.03, '#8a5a3b', [[0.46, 0.425], [0.46, 0.52]]),
      plate(0.3, 0.765, 0.2, 0.3, 0, 0.035, '#ffd166', [[0.27, 0.65], [0.33, 0.76], [0.27, 0.87]], { deco: 'sail' }),
      plate(0.67, 0.76, 0.26, 0.34, 0, 0.035, '#fbf3e4', [[0.64, 0.64], [0.7, 0.72], [0.64, 0.8], [0.69, 0.87]], { deco: 'sail' }),
      bar(0.23, 0.56, 0.85, 0.56, 0.028, '#a8743f', [[0.54, 0.56]], { heavy: true }),
    ],
  },
  {
    key: 'mill', name: '풍차', emoji: '🌬️', news: '📌 못 날개 — 나사를 다 빼도 못에 매달려 빙글, 계속 가려요', tip: '📌 못 날개는 다 풀면 아래로 빙글 — 밑 나사부터 빼요', boxes: 2, colors: 5, P: 1, C: 5,
    toy: () => [
      plate(0.5, 0.93, 0.3, 0.4, 0, 0.03, '#d98b5f', [[0.4, 1.07], [0.6, 1.07], [0.5, 0.82]], { deco: 'brick' }),
      plate(0.5, 0.715, 0.42, 0.08, 0, 0.03, '#8e4b3a', [[0.35, 0.715], [0.65, 0.715]], { deco: 'roof' }),
      plate(0.5, 1.07, 0.11, 0.13, 0, 0.05, '#6b4430', [[0.5, 1.035]], { deco: 'door' }),
      ...[-1, 1].flatMap((sy) => [-1, 1].map((sx) => bar(0.5, 0.61, 0.5 + 0.2 * sx, 0.61 + 0.2 * sy, 0.04, BLADE, [[0.5 + 0.1 * sx, 0.61 + 0.1 * sy], [0.5 + 0.175 * sx, 0.61 + 0.175 * sy]], { kind: 'nail', nail: [0.5, 0.61], deco: 'blade' }))),
      disc(0.5, 0.61, 0.058, '#c9503e', [[0.5, 0.61]], { deco: 'hub' }),
    ],
  },
  {
    key: 'train', name: '기차', emoji: '🚂', news: '🔒 자물쇠 나사 — 🔑 열쇠 나사를 먼저 빼요', tip: '🔑 열쇠 나사를 빼면 🔒 자물쇠가 다 풀려요', boxes: 2, colors: 5, P: 2, C: 5,
    toy: () => [
      bar(0.24, 1.125, 0.9, 1.125, 0.024, '#7d7f86', [[0.3, 1.125], [0.85, 1.125]], { deco: 'rail' }),
      plate(0.36, 0.9, 0.32, 0.14, 0, 0.065, '#2f6fd6', [[0.27, 0.9], [0.45, 0.9]], { deco: 'boiler', lock: [1] }),
      plate(0.26, 0.75, 0.15, 0.17, 0, 0.025, '#e2574c', [[0.26, 0.71], [0.26, 0.795]], { deco: 'window' }),
      bar(0.45, 0.82, 0.45, 0.65, 0.032, '#3a3a44', [[0.45, 0.685], [0.45, 0.775]], { deco: 'chimney' }),
      plate(0.74, 0.9, 0.32, 0.14, 0, 0.03, '#2fb86a', [[0.64, 0.905], [0.74, 0.91], [0.84, 0.905]], { key: 1 }),
      plate(0.74, 0.805, 0.26, 0.14, 0, 0.04, '#f7c531', [[0.66, 0.795], [0.82, 0.795]], { deco: 'crate' }),
      plate(0.18, 0.93, 0.08, 0.08, Math.PI / 4, 0.02, '#ffcf3a', [[0.18, 0.93]], { deco: 'lamp' }),
      disc(0.28, 1.035, 0.048, '#3a3a44', [[0.28, 1.035]], { deco: 'wheel' }),
      disc(0.44, 1.035, 0.048, '#3a3a44', [[0.44, 1.035]], { deco: 'wheel', lock: [0] }),
      disc(0.65, 1.035, 0.048, '#3a3a44', [[0.65, 1.035]], { deco: 'wheel', lock: [0] }),
      disc(0.81, 1.035, 0.048, '#3a3a44', [[0.81, 1.035]], { deco: 'wheel' }),
    ],
  },
  {
    key: 'flower', name: '해바라기', emoji: '🌻', news: '🪟 유리 화병 — 속이 비쳐 보이지만 막고 있어요', tip: '🪟 유리 밑 나사는 보여도 막혀 있어요', boxes: 2, colors: 5, P: 1, C: 8,
    toy: () => [
      bar(0.5, 1.1, 0.5, 0.7, 0.03, '#3f9d4a', [[0.5, 0.79], [0.5, 0.885], [0.5, 0.985]]),
      plate(0.405, 0.85, 0.22, 0.08, -0.42, 0.04, '#58b85e', [[0.345, 0.875], [0.43, 0.84]], { deco: 'leaf' }),
      plate(0.6, 0.955, 0.22, 0.08, -0.42, 0.04, '#4fae55', [[0.565, 0.97], [0.66, 0.93]], { deco: 'leaf' }),
      disc(0.5, 0.63, 0.07, '#7a4a2a', [[0.5, 0.63]], { deco: 'seeds' }),
      ...[-150, -90, -30].map((deg, j) => {
        const c = Math.cos((deg * Math.PI) / 180), sn = Math.sin((deg * Math.PI) / 180);
        return bar(0.5 + 0.02 * c, 0.63 + 0.02 * sn, 0.5 + 0.2 * c, 0.63 + 0.2 * sn, 0.044, j === 1 ? '#ffcf3a' : '#ffbe2e', [[0.5 + 0.1 * c, 0.63 + 0.1 * sn], [0.5 + 0.185 * c, 0.63 + 0.185 * sn]], { deco: 'petal' });
      }),
      plate(0.5, 1.06, 0.32, 0.14, 0, 0.05, GLASS, [[0.38, 1.06], [0.62, 1.06]], { kind: 'glass' }),
      disc(0.725, 0.49, 0.062, '#ffd23a', [[0.725, 0.49]], { deco: 'bee' }),
      disc(0.29, 0.83, 0.05, '#e8414f', [[0.29, 0.83]], { deco: 'bug' }),
    ],
  },
  {
    key: 'dino', name: '공룡', emoji: '🦕', news: '🌀 스프링 판자 — 떨어지면 튕겨서 옆 판자 나사를 톡!', tip: '🌀 스프링이 쳐 낼 나사 색 상자가 열렸을 때 떨궈요', boxes: 2, colors: 6, P: 2, C: 5,
    toy: () => [
      bar(0.32, 0.85, 0.15, 0.7, 0.042, DINO, [[0.31, 0.845], [0.235, 0.775], [0.17, 0.715]], { deco: 'spots' }),
      bar(0.4, 0.93, 0.4, 1.1, 0.04, DINO2, [[0.4, 0.945], [0.4, 1.07]], { deco: 'hoof' }),
      bar(0.62, 0.93, 0.62, 1.1, 0.04, DINO2, [[0.62, 0.945], [0.62, 1.07]], { deco: 'hoof' }),
      plate(0.5, 0.86, 0.42, 0.18, 0, 0.08, DINO, [[0.4, 0.86], [0.51, 0.89], [0.6, 0.855]], { deco: 'spots' }),
      bar(0.66, 0.8, 0.79, 0.57, 0.045, DINO, [[0.685, 0.755], [0.725, 0.685], [0.765, 0.615]]),
      plate(0.83, 0.52, 0.17, 0.09, -0.15, 0.04, DINO, [[0.795, 0.53], [0.875, 0.515]], { deco: 'dHead' }),
      plate(0.36, 0.735, 0.1, 0.1, Math.PI / 4, 0.02, '#ff8a5b', [[0.36, 0.735]], { kind: 'spring', tgt: 0, deco: 'spike' }),
      plate(0.47, 0.725, 0.1, 0.1, Math.PI / 4, 0.02, '#ff8a5b', [[0.47, 0.725]], { kind: 'spring', tgt: 4, deco: 'spike' }),
      plate(0.58, 0.72, 0.09, 0.09, Math.PI / 4, 0.02, '#ff8a5b', [[0.58, 0.72]], { kind: 'spring', tgt: 5, deco: 'spike' }),
    ],
  },
  {
    key: 'castle', name: '성', emoji: '🏰', news: '⏰ 째깍 나사 — 숫자만큼 톡 안에 안 빼면 혼자 튀어나와요', tip: '⏰ 숫자 = 남은 톡 — 0이 되면 혼자 튀어나와요', boxes: 2, colors: 6, P: 1, C: 8,
    toy: () => [
      plate(0.5, 0.97, 0.56, 0.26, 0, 0.02, STONE, [[0.3, 1.05], [0.7, 1.05], [0.5, 0.88], [0.35, 0.9]], { deco: 'brick' }),
      plate(0.2, 0.8, 0.15, 0.46, 0, 0.02, STONE2, [[0.2, 0.665], [0.2, 0.95]], { deco: 'brick' }),
      plate(0.8, 0.8, 0.15, 0.46, 0, 0.02, STONE2, [[0.8, 0.665], [0.8, 0.95]], { deco: 'brick', tick: [[0, 7]] }),
      plate(0.5, 1.045, 0.16, 0.15, 0, 0.075, '#6b4430', [[0.5, 1.03]], { deco: 'door' }),
      plate(0.2, 0.55, 0.13, 0.13, Math.PI / 4, 0.02, '#4b7bd6', [[0.2, 0.55]], { deco: 'roofT', tick: [[0, 3]] }),
      plate(0.8, 0.55, 0.13, 0.13, Math.PI / 4, 0.02, '#4b7bd6', [[0.8, 0.55]], { deco: 'roofT' }),
      plate(0.5, 0.8, 0.28, 0.14, 0, 0.03, GLASS, [[0.4, 0.8], [0.6, 0.8]], { kind: 'glass' }),
      bar(0.5, 0.7, 0.5, 0.48, 0.022, '#7a5a3a', [[0.5, 0.685], [0.5, 0.51]]),
      plate(0.6, 0.5, 0.15, 0.08, 0, 0.02, '#ef4b6a', [[0.6, 0.5]], { deco: 'flag', tick: [[0, 10]] }),
      plate(0.2, 0.81, 0.09, 0.14, 0, 0.03, GLASS, [[0.2, 0.81]], { kind: 'glass' }),
      plate(0.8, 0.81, 0.09, 0.14, 0, 0.03, GLASS, [[0.8, 0.81]], { kind: 'glass' }),
    ],
  },
  {
    key: 'rocket', name: '로켓', emoji: '🚀', news: '🚀 마지막 장난감 — 다 나와요!', tip: '🚀 열쇠·스프링·째깍·유리 — 다 섞였어요', boxes: 2, colors: 6, P: 2, C: 6,
    toy: () => [
      plate(0.5, 1.125, 0.62, 0.055, 0, 0.0275, '#7d7f86', [[0.25, 1.125], [0.75, 1.125]], { deco: 'rail' }),
      plate(0.5, 0.8, 0.26, 0.52, 0, 0.12, '#eef1f6', [[0.445, 0.6], [0.555, 0.6], [0.5, 0.79], [0.445, 0.98], [0.555, 0.98]], { key: 2 }),
      plate(0.5, 0.49, 0.15, 0.15, Math.PI / 4, 0.035, '#ef4b4b', [[0.5, 0.49]], { deco: 'nose', tick: [[0, 6]] }),
      plate(0.28, 0.97, 0.12, 0.2, -0.35, 0.04, '#ef4b4b', [[0.29, 0.92], [0.255, 1.02]], { kind: 'spring', tgt: 4 }),
      plate(0.72, 0.97, 0.12, 0.2, 0.35, 0.04, '#ef4b4b', [[0.71, 0.92], [0.745, 1.02]], { lock: [0] }),
      disc(0.5, 0.775, 0.07, GLASS, [[0.5, 0.72]], { kind: 'glass' }),
      plate(0.5, 0.88, 0.24, 0.06, 0, 0.03, '#f7c531', [[0.415, 0.88], [0.5, 0.88], [0.585, 0.88]]),
      bar(0.5, 1.035, 0.5, 1.12, 0.04, '#ff9f2b', [[0.5, 1.075]], { deco: 'flame', lock: [0] }),
      bar(0.36, 0.56, 0.36, 0.78, 0.024, '#3b82f6', [[0.36, 0.6], [0.36, 0.74]], { deco: 'stripe' }),
      bar(0.64, 0.56, 0.64, 0.78, 0.024, '#3b82f6', [[0.64, 0.6], [0.64, 0.74]], { deco: 'stripe', tick: [[1, 11]] }),
    ],
  },
];
export const STAGE_COUNT = STAGES.length;

// ───────────────────────────── 판 미리 계산 ─────────────────────────────
interface Pose { cx: number; cy: number; a: number; px: number; py: number; d: number }
export interface Level {
  pl: Src[]; N: number; all: number; px: number[]; py: number[]; owner: number[]; col: number[]; lockM: number; keyM: number;
  ps: number[][]; pm: number[]; si: number[]; poses: Pose[][]; cov: number[][]; hid: number[][]; queue: number[]; boxes: number; pal: number[];
  /** 째깍 나사: 이 톡 수가 되면 혼자 튀어나온다 (0 = 없음) */
  tmr: number[];
  /** 🔨 판자 k가 자세 q로 매달렸을 때 망치 머리 자리 [x,y]와 칠 수 있는 나사 후보(가까운 순, HAM 안) */
  hamP: number[][][];
  hamT: number[][][];
}
/** 🔨 망치 머리가 닿는 거리 */
export const HAM = 0.06;

/** 둥근 네모까지의 거리(안쪽이면 음수) */
function sdf(cx: number, cy: number, a: number, hx: number, hy: number, rr: number, px: number, py: number) {
  const dx = px - cx, dy = py - cy, c = Math.cos(a), s = Math.sin(a);
  const lx = Math.abs(dx * c + dy * s), ly = Math.abs(-dx * s + dy * c);
  const qx = lx - (hx - rr), qy = ly - (hy - rr);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr;
}
/** 피벗(px,py)에 매달린 판자: 무게중심이 바로 아래로 오게 d만큼 돈다 */
function hangPose(cx: number, cy: number, a: number, px: number, py: number): Pose {
  const vx = cx - px, vy = cy - py;
  if (Math.hypot(vx, vy) < 0.012) return { cx, cy, a, px, py, d: 0 };
  let d = Math.PI / 2 - Math.atan2(vy, vx);
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  const c = Math.cos(d), s = Math.sin(d);
  return { cx: px + vx * c - vy * s, cy: py + vx * s + vy * c, a: a + d, px, py, d };
}

function shuffle<T>(a: T[], r: Rng): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function geometry(pl: Src[]): Level {
  const px: number[] = [], py: number[] = [], owner: number[] = [], si: number[] = [], tmr: number[] = [];
  const ps: number[][] = pl.map(() => []);
  let lockM = 0, keyM = 0;
  pl.forEach((p, k) =>
    p.sc.forEach(([x, y], j) => {
      const i = px.length;
      px.push(x), py.push(y), owner.push(k), si.push(ps[k].length), ps[k].push(i), tmr.push(p.tick?.find((q) => q[0] === j)?.[1] ?? 0);
      if (p.lock?.includes(j)) lockM |= 1 << i;
      if (p.key === j) keyM |= 1 << i;
    }),
  );
  const N = px.length;
  const pm = ps.map((l) => l.reduce((m, i) => m | (1 << i), 0));
  const poses = pl.map((p, k) => {
    const o: Pose = { cx: p.cx, cy: p.cy, a: p.a, px: p.cx, py: p.cy, d: 0 };
    if (p.kind === 'nail') return [o, hangPose(p.cx, p.cy, p.a, p.nail![0], p.nail![1])];
    return [o, ...ps[k].map((i) => hangPose(p.cx, p.cy, p.a, px[i], py[i]))];
  });
  const mask = (k: number, q: Pose, lim: number, glassOk: boolean) => {
    if (!glassOk && pl[k].kind === 'glass') return 0;
    let m = 0;
    for (let i = 0; i < N; i++) if (owner[i] < k && sdf(q.cx, q.cy, q.a, pl[k].hx, pl[k].hy, pl[k].rr, px[i], py[i]) < lim) m |= 1 << i;
    return m;
  };
  const cov = poses.map((arr, k) => arr.map((q) => mask(k, q, COVER, true)));
  // 🔨 망치: 정지 자세의 머리 지점을 매달린 자세로 돌려 옮긴다(피벗 둘레로 d만큼)
  const hamP = pl.map((p, k) => poses[k].map((q) => {
    if (!p.ham) return [];
    const [hx, hy] = p.ham, c = Math.cos(q.d), s = Math.sin(q.d);
    return [q.px + (hx - q.px) * c - (hy - q.py) * s, q.py + (hx - q.px) * s + (hy - q.py) * c];
  }));
  const hamT = pl.map((_, k) => hamP[k].map((h, q) => {
    if (!h.length || q === 0) return [];
    const near: [number, number][] = [];
    for (let i = 0; i < N; i++) if (owner[i] !== k) { const dd = Math.hypot(px[i] - h[0], py[i] - h[1]); if (dd < HAM) near.push([dd, i]); }
    return near.sort((a, b) => a[0] - b[0]).map((e) => e[1]);
  }));
  const hid = poses.map((arr, k) => arr.map((q) => mask(k, q, HIDE, false)));
  return { pl, N, all: (1 << N) - 1, px, py, owner, col: [], lockM, keyM, ps, pm, si, poses, cov, hid, queue: [], boxes: 1, pal: [], tmr, hamP, hamT };
}

// ───────────────────────────── 규칙(시뮬레이션) ─────────────────────────────
export interface Sim { gone: number; box: number[]; bn: number[]; qi: number; slots: number[]; peak: number; streak: number; best: number; key: boolean; fail: number; n: number; taps: number; /** 한 방: 톡 한 번에 빠진 나사 수의 최대(톡한 것 포함) */ shot: number }
type RE =
  | { k: 'out'; s: number; pop: boolean }
  | { k: 'box'; s: number; col: number; bi: number; hole: number; n: number }
  | { k: 'slot'; s: number; col: number; idx: number; lost: number }
  | { k: 'pull'; idx: number; col: number; bi: number; hole: number }
  | { k: 'done'; bi: number; col: number; next: number }
  | { k: 'hang'; p: number; pose: number }
  | { k: 'fall'; p: number }
  | { k: 'boing'; p: number; t: number; s: number }
  | { k: 'key' }
  | { k: 'tick'; s: number }
  | { k: 'bonk'; p: number; s: number; x: number; y: number }
  | { k: 'crash'; p: number; by: number; s: number; i: number };

export function newSim(L: Level): Sim {
  const box: number[] = [], bn: number[] = [];
  let qi = 0;
  for (let b = 0; b < L.boxes; b++) box.push(qi < L.queue.length ? L.queue[qi++] : -1), bn.push(0);
  return { gone: 0, box, bn, qi, slots: [], peak: 0, streak: 0, best: 0, key: !L.keyM, fail: 0, n: 0, taps: 0, shot: 0 };
}
export const cloneSim = (S: Sim): Sim => ({ ...S, box: S.box.slice(), bn: S.bn.slice(), slots: S.slots.slice() });

export function poseOf(L: Level, k: number, gone: number) {
  const rem = L.pm[k] & ~gone;
  if (L.pl[k].kind === 'nail') return rem ? 0 : 1;
  if (!rem) return -1;
  if (rem & (rem - 1)) return 0;
  return 1 + L.si[31 - Math.clz32(rem)];
}
export function blockedM(L: Level, gone: number) {
  let m = 0;
  for (let k = 0; k < L.pl.length; k++) {
    const q = poseOf(L, k, gone);
    if (q >= 0) m |= L.cov[k][q];
  }
  return m;
}
function hiddenM(L: Level, gone: number) {
  let m = 0;
  for (let k = 0; k < L.pl.length; k++) {
    const q = poseOf(L, k, gone);
    if (q >= 0) m |= L.hid[k][q];
  }
  return m;
}
/** 못 판자가 다 풀려 매달리면 다시는 안 움직인다 — 그 밑에 깔린 나사는 영영 못 뺀다 */
export function stuckM(L: Level, gone: number) {
  let m = 0;
  for (let k = 0; k < L.pl.length; k++) if (L.pl[k].kind === 'nail' && !(L.pm[k] & ~gone)) m |= L.cov[k][1];
  return m & L.all & ~gone;
}
const visibleM = (L: Level, gone: number) => L.all & ~gone & ~hiddenM(L, gone);
export const freeM = (L: Level, S: Sim) => L.all & ~S.gone & ~blockedM(L, S.gone) & (S.key ? -1 : ~L.lockM);

function place(L: Level, S: Sim, col: number, s: number, rec?: RE[]) {
  let bi = -1;
  for (let i = 0; i < S.box.length; i++) if (S.box[i] === col && S.bn[i] < 3 && (bi < 0 || S.bn[i] > S.bn[bi])) bi = i;
  if (bi >= 0) {
    S.bn[bi]++;
    S.streak++;
    if (S.streak > S.best) S.best = S.streak;
    rec?.push({ k: 'box', s, col, bi, hole: S.bn[bi] - 1, n: S.streak });
    if (S.bn[bi] === 3) complete(L, S, bi, rec);
  } else {
    S.slots.push(col);
    const lost = S.streak;
    S.streak = 0;
    if (S.slots.length > S.peak) S.peak = S.slots.length;
    rec?.push({ k: 'slot', s, col, idx: S.slots.length - 1, lost });
  }
}
function complete(L: Level, S: Sim, bi: number, rec?: RE[]) {
  const old = S.box[bi], nx = S.qi < L.queue.length ? L.queue[S.qi++] : -1;
  S.box[bi] = nx;
  S.bn[bi] = 0;
  rec?.push({ k: 'done', bi, col: old, next: nx });
  if (nx < 0) return;
  for (let j = 0; j < S.slots.length && S.bn[bi] < 3; )
    if (S.slots[j] === nx) {
      S.slots.splice(j, 1);
      S.bn[bi]++;
      rec?.push({ k: 'pull', idx: j, col: nx, bi, hole: S.bn[bi] - 1 });
    } else j++;
  if (S.bn[bi] === 3) complete(L, S, bi, rec);
}
function removeScrew(L: Level, S: Sim, s: number, pop: boolean, rec: RE[] | undefined, depth: number, knock = false) {
  const k = L.owner[s], before = poseOf(L, k, S.gone);
  S.gone |= 1 << s;
  S.n++;
  rec?.push({ k: 'out', s, pop });
  if ((L.keyM >> s) & 1 && !S.key) {
    S.key = true;
    rec?.push({ k: 'key' });
  }
  place(L, S, L.col[s], s, rec);
  const after = poseOf(L, k, S.gone);
  if (after === before) return;
  if (after >= 0) {
    rec?.push({ k: 'hang', p: k, pose: after });
    // 🔨 망치: 막 매달린 판자의 망치 머리가 닿는 나사 하나를 쾅(덮여 있어도, 🔒는 열쇠 전엔 못 침)
    if (after >= 1 && depth <= 3) {
      const hit = L.hamT[k][after].find((i) => !((S.gone >> i) & 1) && (S.key || !((L.lockM >> i) & 1)));
      if (hit !== undefined) {
        const [hx, hy] = L.hamP[k][after];
        rec?.push({ k: 'bonk', p: k, s: hit, x: hx, y: hy });
        removeScrew(L, S, hit, true, rec, depth + 1);
      }
    }
    return;
  }
  rec?.push({ k: 'fall', p: k });
  const P = L.pl[k];
  // 🪵 통나무(그리고 통나무에 맞아 떨어지는 판자 = 도미노): 떨어지기 직전 자세의 가로 폭 안, 아래에 매달린 판자를 위부터 친다
  if ((P.heavy || knock) && depth <= 6) {
    const q = L.poses[k][Math.max(0, before)], ex = Math.abs(P.hx * Math.cos(q.a)) + Math.abs(P.hy * Math.sin(q.a));
    const hit: [number, number][] = [];
    for (let j = 0; j < L.pl.length; j++) {
      if (j === k || L.pl[j].kind === 'nail') continue;
      const pj = poseOf(L, j, S.gone);
      if (pj < 1) continue;
      const v = L.poses[j][pj];
      if (Math.abs(v.px - q.cx) <= ex && v.py > q.cy) hit.push([v.py, j]);
    }
    hit.sort((a, b) => a[0] - b[0]);
    let n = 0;
    for (const [, j] of hit) {
      const rem = L.pm[j] & ~S.gone;
      if (poseOf(L, j, S.gone) < 1 || !rem || (!S.key && rem & L.lockM)) continue; // 앞선 도미노에 이미 떨어졌거나 🔒
      const i = 31 - Math.clz32(rem);
      rec?.push({ k: 'crash', p: j, by: k, s: i, i: ++n });
      removeScrew(L, S, i, true, rec, depth + 1, true);
    }
  }
  if (P.kind !== 'spring' || P.tgt === undefined || depth > 3) return;
  // 스프링: 떨어지며 튕겨 겨눈 판자를 치면, 그 판자에서 가장 가까운 나사 하나가 튀어나온다(덮여 있어도)
  const t = P.tgt, rem = L.pm[t] & ~S.gone & (S.key ? -1 : ~L.lockM);
  if (!rem) return;
  let best = -1, bd = 9;
  for (const i of L.ps[t])
    if ((rem >> i) & 1) {
      const dd = Math.hypot(L.px[i] - P.cx, L.py[i] - P.cy);
      if (dd < bd) (bd = dd), (best = i);
    }
  rec?.push({ k: 'boing', p: k, t, s: best });
  removeScrew(L, S, best, true, rec, depth + 1);
}
/** 나사 s를 뺀다 (막힘·자물쇠는 부르는 쪽이 확인) */
export function apply(L: Level, S: Sim, s: number, rec?: RE[]) {
  S.taps++;
  const n0 = S.n;
  removeScrew(L, S, s, false, rec, 0);
  // 째깍 나사: 정해진 톡 수가 지나도 남아 있으면 혼자 튀어나온다
  for (let i = 0; i < L.N; i++)
    if (L.tmr[i] && S.taps >= L.tmr[i] && !((S.gone >> i) & 1) && (S.key || !((L.lockM >> i) & 1))) {
      rec?.push({ k: 'tick', s: i });
      removeScrew(L, S, i, true, rec, 0);
    }
  S.shot = Math.max(S.shot, S.n - n0);
  if (S.slots.length >= SLOTS) S.fail = 1;
  else if (S.n < L.N && (!freeM(L, S) || stuckM(L, S.gone))) S.fail = 2;
}
/** ★3 조건: 톡 T번 이하(T가 있으면) 또는 연속 쏙 C번 */
export const star3 = (d: StageDef, S: Sim) => (d.H !== undefined ? S.shot >= d.H : d.T !== undefined ? S.taps <= d.T : S.best >= d.C);
export const starsOf = (d: StageDef, S: Sim) => 1 + (S.peak <= d.P ? 1 : 0) + (star3(d, S) ? 1 : 0);

// ───────────────────────────── 판 만들기(색칠 + 고르기) ─────────────────────────────
function paint(G: Level, d: StageDef, r: Rng): Level {
  const pal = shuffle([0, 1, 2, 3, 4, 5], r).slice(0, d.colors);
  const groups = G.N / 3, gcol: number[] = [];
  for (let c = 0; c < d.colors; c++) gcol.push(pal[c]);
  while (gcol.length < groups) gcol.push(pal[Math.floor(r() * d.colors)]);
  const col: number[] = [];
  for (const c of gcol) col.push(c, c, c);
  shuffle(col, r);
  const queue = shuffle(gcol.slice(), r);
  const hv = G.pl.findIndex((p) => p.heavy);
  if (d.late !== undefined && hv >= 0 && d.colors * 3 === G.N) {
    // 📐 2판: 🪵 통나무 없이 뺄 수 있는 것을 다 빼 보고 남는 나사(늦은 무리) = 한 색 X, X 상자는 queue[d.late].
    //   통나무 나사 색 = 첫 상자 색(맞는 색 먼저 하는 버릇은 통나무를 먼저 쏜다)
    const hm = G.pm[hv];
    let gone = 0;
    for (let f = 1; f; gone |= f) f = G.all & ~gone & ~blockedM(G, gone) & ~hm;
    const late = G.all & ~gone & ~hm;
    let n3 = 0;
    for (let i = 0; i < G.N; i++) n3 += (late >> i) & 1;
    if (n3 === 3) { // 늦은 무리가 정확히 3개(한 상자)일 때만
      const X = pal[0], rest = pal.slice(1), pool = shuffle(rest.flatMap((c) => [c, c, c]), r), q = shuffle(rest.slice(), r);
      let j = 0;
      for (let i = 0; i < G.N; i++) col[i] = (late >> i) & 1 ? X : pool[j++];
      q.splice(d.late, 0, X);
      const b = G.ps[hv][0];
      if (col[b] !== q[0]) {
        const k = col.findIndex((c, i) => c === q[0] && !((late >> i) & 1) && i !== b);
        [col[b], col[k]] = [col[k], col[b]];
      }
      return { ...G, col, queue: q, boxes: d.boxes, pal };
    }
  }
  const L: Level = { ...G, col, queue, boxes: d.boxes, pal };
  if (d.first !== undefined) {
    // 📐 1판: 손가락 첫 톡에 빠지는 나사(🔨 쾅 맞은 것 포함)의 색을 처음 상자들로 → 첫 톡이 '쏙 + 쾅 쏙'
    const S = newSim({ ...L, queue: [...new Set(col)] }), rec: RE[] = [];
    apply(L, S, d.first, rec);
    const want = [...new Set(rec.filter((e) => e.k === 'out').map((e) => col[(e as { s: number }).s]))];
    for (const [pos, c] of want.slice(0, d.boxes).entries()) {
      const j = queue.indexOf(c, pos);
      if (j > pos) [queue[pos], queue[j]] = [queue[j], queue[pos]];
    }
    return L;
  }
  // 첫 상자 색은 처음부터 뺄 수 있는 나사가 있게 (첫 톡에 '쏙')
  const f0 = freeM(L, newSim(L));
  const okc = (c: number) => L.col.some((cc, i) => cc === c && (f0 >> i) & 1);
  if (!okc(queue[0])) {
    const j = queue.findIndex(okc);
    if (j > 0) [queue[0], queue[j]] = [queue[j], queue[0]];
  }
  return L;
}
/** 아무 나사나 빼는 사람이 이 판을 깰 확률 */
function randomPass(L: Level, r: Rng, n: number) {
  let ok = 0;
  for (let k = 0; k < n; k++) {
    const S = newSim(L);
    while (!S.fail && S.n < L.N) {
      const f = freeM(L, S), list: number[] = [];
      for (let i = 0; i < L.N; i++) if ((f >> i) & 1) list.push(i);
      apply(L, S, list[Math.floor(r() * list.length)]);
    }
    if (!S.fail) ok++;
  }
  return ok / n;
}
/** 버릇 하나: 맞는 상자가 있는 나사부터(위에서부터), 없으면 맨 위 나사 */
export function habitPick(L: Level, S: Sim, known = L.all) {
  const f = freeM(L, S) & known;
  let best = -1, bv = 1e9;
  for (let i = 0; i < L.N; i++)
    if ((f >> i) & 1) {
      const v = (S.box.includes(L.col[i]) ? 0 : 10) + L.py[i];
      if (v < bv) (bv = v), (best = i);
    }
  return best;
}
/** 시뮬 한 판(그림 없이): 받은 고르기로 끝까지 — 별 수(실패 0) */
function playOut(L: Level, d: StageDef, pick: (S: Sim) => number, first?: number) {
  const S = newSim(L);
  if (first !== undefined) apply(L, S, first);
  while (!S.fail && S.n < L.N) apply(L, S, pick(S));
  return S.fail ? 0 : starsOf(d, S);
}
const levelCache = new Map<string, Level>();
function buildLevel(seed: number, stage: number): Level {
  const ck = `${seed}:${stage}`, hit = levelCache.get(ck);
  if (hit) return hit;
  const d = STAGES[stage], G = geometry(d.toy()), r = mulberry32((seed * 31 + stage * 7919 + 17) >>> 0);
  let pick: Level | null = null, bv = -1e9;
  const K = stage === 1 ? 12 : stage < 2 ? 8 : 10;
  for (let c = 0; c < K; c++) {
    const L = paint(G, d, r);
    let v: number;
    if (stage === 0 && d.first !== undefined) {
      // 📐 1판 고르기: 장인(손가락 첫 톡) ★3 ×2 + 장인 스스로 ★3 + 무작위 클리어 − 막 누르기(손가락 첫 톡 뒤) ★2 이상 ×2
      const smart = (S: Sim) => bestMove(L, S, d), mash = (S: Sim) => {
        const f = freeM(L, S), o: number[] = [];
        for (let i = 0; i < L.N; i++) if ((f >> i) & 1) o.push(i);
        return o[Math.floor(r() * o.length)];
      };
      let mg = 0;
      for (let k = 0; k < 100; k++) mg += playOut(L, d, mash, d.first) >= 2 ? 1 : 0; // 📋 S002: 표본 20 → 100
      const rp = randomPass(L, r, 30);
      v = (playOut(L, d, smart, d.first) === 3 ? 2 : 0) + (playOut(L, d, smart) === 3 ? 1 : 0) + Math.min(1, rp / 0.95) - (mg / 100) * 2;
    } else if (stage === 0) v = randomPass(L, r, 30);
    else if (stage === 1) {
      // 📐 2판 고르기: 장인 ★3이 안 되면 탈락 · 버릇①(맞는 색 먼저)이 ★3이면 탈락 · 그다음 무작위 클리어(0.92까지) − 막 누르기 ★2 이상(0.1 넘는 만큼)
      const mash = (S: Sim) => {
        const f = freeM(L, S), o: number[] = [];
        for (let i = 0; i < L.N; i++) if ((f >> i) & 1) o.push(i);
        return o[Math.floor(r() * o.length)];
      };
      if (playOut(L, d, (S) => bestMove(L, S, d)) !== 3) v = -9 + randomPass(L, r, 10);
      else if (playOut(L, d, (S) => habitPick(L, S)) === 3) v = -3;
      else {
        let mg = 0;
        for (let k = 0; k < 12; k++) mg += playOut(L, d, mash) >= 2 ? 1 : 0;
        v = 2 + 2 * Math.min(1, randomPass(L, r, 20) / 0.92) - Math.max(0, mg / 12 - 0.1) * 4;
      }
    }
    else {
      // 버릇대로 두면 별 셋이 안 나오고, 내다보고 두면 별 셋이 나오는 판을 고른다 (무엇을 먼저 뺄지가 수가 되게)
      const H = newSim(L);
      while (!H.fail && H.n < L.N) apply(L, H, habitPick(L, H));
      const M = newSim(L);
      while (!M.fail && M.n < L.N) apply(L, M, bestMove(L, M, d));
      v = (H.fail || starsOf(d, H) < 3 ? 2 : 0) + (M.fail ? 0 : starsOf(d, M) === 3 ? 1.5 : 0.4) + randomPass(L, r, 10) * 0.3;
    }
    if (v > bv) (bv = v), (pick = L);
    if (stage >= 2 && bv >= 3.5 + 0.3 * 0.5) break;
    if (stage === 1 && bv >= 3.9) break; // 📐 2판: 장인 ★3 · 버릇① 실패 · 무작위 ≥ 0.87 · 막 누르기 ★2 이상 ≤ 1/12
  }
  if (levelCache.size > 400) levelCache.clear();
  levelCache.set(ck, pick!);
  return pick!;
}

// ───────────────────────────── 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number; n?: number }
interface PV { pose: number; px: number; py: number; phi: number; vp: number; tgt: number; wait: number; wob: number; wv: number; fall: null | { x: number; y: number; vx: number; vy: number; a: number; va: number; hit: number; t: number }; boing: number; bx: number; by: number }
interface Fl { col: number; key: boolean; x0: number; y0: number; x1: number; y1: number; t0: number; dur: number; spin: number; to: number; sc: number }
interface VBox { col: number; t0: number; land: number[] }
export interface ShopState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'settle' | 'result'; pt: number;
  L: Level; S: Sim; known: number;
  down: boolean; ax: number; ay: number; press: number; cool: number; lastTap: number; taps: number;
  hearts: number; stars: number; got: number; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number;
  /** 판별 최고 별·점수 (↺ 다시 해도 합계는 최고만) · ★3 못 땄을 때 결과 화면에서 기다리는 중 */
  bestSt: number[]; bestPts: number[]; retries: number;
  seen: Set<string>; tips: Set<string>; events: Ev[]; news: { text: string; t: number } | null; newsQ: string[]; startT: number; clearT: number;
  pv: PV[]; fl: Fl[]; vb: VBox[]; lv: { col: number; bi: number; t0: number }[]; vs: { col: number; at: number; x: number }[]; ready: number[];
  mood: string; moodT: number; bird: number;
}

const ev = (s: ShopState, kind: string, x: number, y: number, text?: string, col?: string, v?: number, n?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v, n });
function tip(s: ShopState, key: string, text: string) {
  if (s.tips.has(key) || s.newsQ.length) return;
  s.tips.add(key);
  s.newsQ.push(text);
}
function see(s: ShopState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}
const setMood = (s: ShopState, m: string) => ((s.mood = m), (s.moodT = s.t));

// 화면 배치 (가로 0~1, 세로 0~A)
const BX0 = 0.035, BX1 = 0.965, BY0 = 0.37, BY1 = 1.19;
const BOX_Y = 0.165, BOX_W = 0.25, BOX_H = 0.12, TRAY_Y = 0.312;
const boxX = (L: Level, bi: number) => (L.boxes === 1 ? 0.34 : bi === 0 ? 0.19 : 0.47);
const holeXY = (L: Level, bi: number, h: number): [number, number] => [boxX(L, bi) + (h - 1) * 0.07, BOX_Y - 0.022];
const slotXY = (i: number): [number, number] => [0.5 + (i - 2) * 0.13, TRAY_Y];
const peekX = (L: Level, j: number) => (L.boxes === 1 ? 0.64 + j * 0.15 : 0.73 + j * 0.14);

function newStage(s: ShopState) {
  const d = STAGES[s.stage];
  s.L = buildLevel(s.seed, s.stage);
  s.S = newSim(s.L);
  const L = s.L;
  s.pv = L.pl.map((_, k) => {
    const q = poseOf(L, k, 0), P = L.poses[k][Math.max(0, q)];
    return { pose: q, px: P.px, py: P.py, phi: q > 0 ? P.d : 0, vp: 0, tgt: q > 0 ? P.d : 0, wait: 0, wob: 0, wv: 0, fall: null, boing: -99, bx: 0, by: 0 };
  });
  s.fl = [];
  s.vb = s.S.box.map((c) => ({ col: c, t0: s.t - 99, land: [Infinity, Infinity, Infinity] }));
  s.lv = [];
  s.vs = [];
  s.ready = s.S.box.map(() => s.t);
  s.known = visibleM(L, 0);
  s.phase = 'play';
  s.pt = 0;
  s.press = -1;
  s.cool = s.t + 20;
  s.startT = s.t;
  s.got = 0;
  setMood(s, 'idle');
  see(s, d.key, d.news);
  ev(s, 'stage', 0.5, 0.7, `${s.stage + 1}판 · ${d.name}`, '#fff6d6');
}

/** 스튜디오: 측정·테스트용 — 아무 판에서나 시작(새 판을 깐다) */
export function startStage(s: ShopState, k: number) {
  s.stage = Math.max(0, Math.min(STAGES.length - 1, k));
  newStage(s);
}

function finish(s: ShopState) {
  s.phase = 'result';
  s.pt = 0;
  const d = STAGES[s.stage], S = s.S;
  if (s.ok) {
    const st = starsOf(d, S), pp = st * STAR_PTS + Math.max(0, 4 - S.peak) * 10 + Math.min(S.best, 12) * 2;
    s.got = st;
    // ↺ 다시 해도 판별 최고만 합계에 (S002)
    if (st > (s.bestSt[s.stage] ?? 0)) (s.stars += st - (s.bestSt[s.stage] ?? 0)), (s.bestSt[s.stage] = st);
    if (pp > (s.bestPts[s.stage] ?? 0)) (s.pts += pp - (s.bestPts[s.stage] ?? 0)), (s.bestPts[s.stage] = pp);
    s.clearT = s.t;
    if (s.stage === STAGES.length - 1 && !s.won) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.75, `${d.emoji} 완성! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, '#fff1a8', st);
    setMood(s, 'cheer');
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.75, s.why, '#ffd0c8');
    setMood(s, 'dizzy');
  }
}

/** 손가락 자리에서 가장 가까운(보이는) 나사 */
function pickScrew(s: ShopState, x: number, y: number) {
  const L = s.L, gone = s.S.gone, vis = visibleM(L, gone), blk = blockedM(L, gone);
  let best = -1, bd = HIT;
  for (let i = 0; i < L.N; i++) {
    if (!((vis >> i) & 1)) continue;
    const dd = Math.hypot(L.px[i] - x, L.py[i] - y) + ((blk >> i) & 1 ? 0.012 : 0);
    if (dd < bd) (bd = dd), (best = i);
  }
  return best;
}

/** 나사 하나를 뺀 결과를 화면 연출(날아가는 나사·상자·빈칸·판자)로 옮긴다 */
function playRec(s: ShopState, rec: RE[]) {
  const L = s.L;
  let delay = 0, slotsHit = false, popped = false, lastLand = 0, shotX = 0, shotY = 0, shotN = 0, shotBad = 0;
  for (const e of rec) {
    if (e.k === 'out') {
      popped = e.pop;
      const pv = s.pv[L.owner[e.s]];
      if (!e.pop) pv.wv += 0.035 * (L.px[e.s] < L.pl[L.owner[e.s]].cx ? 1 : -1);
      continue;
    }
    if (e.k === 'box' || e.k === 'slot') {
      const t0 = s.t + delay, dur = SPIN + FLY + (e.k === 'slot' ? 2 : 0);
      const [x1, y1] = e.k === 'box' ? holeXY(L, e.bi, e.hole) : slotXY(e.idx);
      const spin = popped ? 2 : SPIN, dur2 = dur - SPIN + spin; // 🎨: 튄 나사는 드르륵 없이 +2틱에 뽁
      s.fl.push({ col: e.col, key: !!((L.keyM >> e.s) & 1), x0: L.px[e.s], y0: L.py[e.s], x1, y1, t0, dur: dur2, spin, to: e.k === 'box' ? 0 : 1, sc: e.k === 'box' ? 0.82 : 0.95 });
      if (popped) ev(s, 'pluck', L.px[e.s], L.py[e.s], undefined, L.pl[L.owner[e.s]].tone, t0 + 2);
      lastLand = Math.max(lastLand, t0 + spin + 2), shotX += L.px[e.s], shotY += L.py[e.s], shotN++, shotBad += e.k === 'slot' ? 1 : 0;
      // 🎨 손맛 4박: 드르륵(풀림 시작) → 뽁(구멍을 떠남) → 쏙/통(착지)
      if (!popped) ev(s, 'twist', L.px[e.s], L.py[e.s], undefined, undefined, t0), ev(s, 'pluck', L.px[e.s], L.py[e.s], undefined, L.pl[L.owner[e.s]].tone, t0 + SPIN);
      if (e.k === 'box') {
        s.vb[e.bi].land[e.hole] = t0 + dur2;
        s.ready[e.bi] = Math.max(s.ready[e.bi], t0 + dur2);
        ev(s, 'in', x1, y1, undefined, COLS[e.col], t0 + dur2, e.n);
      } else {
        s.vs.push({ col: e.col, at: t0 + dur2, x: x1 });
        slotsHit = true;
        ev(s, 'slot', x1, y1, undefined, undefined, t0 + dur2, e.lost);
      }
      continue;
    }
    if (e.k === 'pull') {
      const v = s.vs[e.idx], t0 = Math.max(s.t + delay, s.ready[e.bi], v ? v.at : 0), dur = 16;
      const [x1, y1] = holeXY(L, e.bi, e.hole);
      s.vs.splice(e.idx, 1);
      s.fl.push({ col: e.col, key: false, x0: v ? v.x : 0.5, y0: TRAY_Y, x1, y1, t0, dur, spin: 0, to: 0, sc: 0.82 });
      s.vb[e.bi].land[e.hole] = t0 + dur;
      s.ready[e.bi] = t0 + dur;
      ev(s, 'pull', x1, y1, undefined, undefined, t0 + dur);
      continue;
    }
    if (e.k === 'done') {
      const tc = s.ready[e.bi] + 4;
      s.lv.push({ col: e.col, bi: e.bi, t0: tc });
      ev(s, 'done', boxX(L, e.bi), BOX_Y, undefined, COLS[e.col], tc + 8); // 🎨: 뚜껑이 닿는 순간
      s.vb[e.bi] = { col: e.next, t0: tc + 22, land: [Infinity, Infinity, Infinity] };
      s.ready[e.bi] = tc + 34;
      continue;
    }
    if (e.k === 'hang') {
      const pv = s.pv[e.p], P = L.poses[e.p][e.pose];
      pv.pose = e.pose;
      pv.px = P.px;
      pv.py = P.py;
      pv.tgt = P.d;
      pv.phi = 0;
      pv.vp = Math.abs(P.d) > 3.05 ? 0.02 : 0;
      pv.wait = s.t + delay + SPIN - 2;
      if (Math.abs(P.d) > 0.2) ev(s, 'swing', P.px, P.py, '빙글~', '#fff3c4', s.t + delay + SPIN);
      if (rec.some((b) => b.k === 'bonk' && b.p === e.p)) see(s, 'hammer', '🔨 망치 판자 — 매달리면 끄덕! 닿는 나사를 쾅 쳐서 빼요'); // 🧪 S001: 첫 쾅에 바로
      see(s, 'swing', '🎐 나사 하나 남은 판자는 그 나사에 매달려 빙글!');
      if (L.pl[e.p].ham && e.pose >= 1 && !rec.some((b) => b.k === 'bonk' && b.p === e.p)) {
        ev(s, 'air', L.hamP[e.p][e.pose][0], L.hamP[e.p][e.pose][1], '💨 허공', '#d8c3a5', s.t + delay + SPIN + 10);
        see(s, 'air', '💨 허공! 망치 옆 나사를 먼저 빼야 쾅');
      }
      continue;
    }
    if (e.k === 'fall') {
      if (L.pl[e.p].heavy && !rec.some((c) => c.k === 'crash')) see(s, 'log0', '🪵 와르르 0 — 돛을 나사 하나로 매단 뒤 활대를!'); // 📐 S002
      const pv = s.pv[e.p], tr = plankXf(s, e.p), sp = L.pl[e.p].kind === 'spring';
      const lever = pv.pose > 0 ? pv.vp : 0;
      pv.pose = -1;
      pv.fall = { x: tr.cx, y: tr.cy, vx: -lever * (tr.cy - pv.py) + (sp ? 0 : 0.002 * (tr.cx < 0.5 ? -1 : 1)), vy: sp ? -0.028 : -0.006, a: tr.a, va: lever * 0.6 + (tr.cx < 0.5 ? -0.03 : 0.03), hit: 0, t: s.t + delay + SPIN - 2 };
      ev(s, 'fall', tr.cx, tr.cy, '덜컹!', '#ffe9c4', s.t + delay + SPIN + 18);
      continue;
    }
    if (e.k === 'boing') {
      const pv = s.pv[e.p], tq = L.poses[e.t][Math.max(0, s.pv[e.t].pose)];
      pv.boing = s.t + delay + SPIN;
      pv.bx = (tq.cx + L.px[e.s]) / 2;
      pv.by = (tq.cy + L.py[e.s]) / 2;
      if (pv.fall) (pv.fall.vx = (pv.bx - pv.fall.x) / 18), (pv.fall.vy = (pv.by - pv.fall.y) / 18 - 0.016);
      ev(s, 'boing', pv.bx, pv.by, '띠용~ 퉁!', '#ffd6a8', s.t + delay + SPIN + 16);
      delay += 18;
      see(s, 'spring', '🌀 스프링 판자 — 떨어지면 튕겨서 옆 판자 나사를 톡!');
      continue;
    }
    if (e.k === 'crash') {
      // 🪵 와르르: 통나무가 떨어지며 매달린 판자를 차례로 (🎨 §2.2+: 7틱 간격, 위 판자부터)
      const v = L.poses[e.p][Math.max(1, s.pv[e.p].pose)];
      ev(s, 'crash', v.px, v.py, e.i === 1 ? '와르르!' : undefined, L.pl[e.p].tone, s.t + delay + SPIN + 6, e.i);
      delay += 7;
      see(s, 'log', '🪵 통나무 — 떨어지면 밑에 매달린 판자를 와르르!');
      continue;
    }
    if (e.k === 'bonk') {
      // 🔨 쾅: 판자가 빙글 매달려 망치가 닿는 순간
      const nx = rec[rec.indexOf(e) + 2]; // out → box|slot
      ev(s, 'bonk', e.x, e.y, '쾅!', nx && nx.k === 'slot' ? 'slot' : 'box', s.t + delay + SPIN + 10, e.p);
      delay += SPIN + 10; // 맞은 나사는 망치가 닿는 순간 튀어나간다
      see(s, 'hammer', '🔨 망치 판자 — 매달리면 끄덕! 닿는 나사를 쾅 쳐서 빼요');
      continue;
    }
    if (e.k === 'tick') {
      ev(s, 'tick', L.px[e.s], L.py[e.s], '⏰ 펑! 혼자 튀어나왔다', '#ffd0a8', s.t + delay + 4);
      delay += 6;
      continue;
    }
    if (e.k === 'key') {
      ev(s, 'key', 0.5, 0.8, '🔑 철컥! 자물쇠가 다 풀렸어요', '#fff1a8', s.t + delay + SPIN + FLY);
    }
  }
  const S = s.S;
  if (slotsHit) see(s, 'slot', '⬜ 맞는 상자가 없으면 빈칸으로 — 5칸 다 차면 실패!');
  if (rec.some((e) => e.k === 'pull')) tip(s, 'pull', '빈칸 나사는 맞는 상자가 오면 저절로 쏙!');
  if (rec.some((e) => e.k === 'fall')) tip(s, 'fall', '덜컹! 판자가 떨어지면 아래 나사가 드러나요');
  if (S.slots.length >= 3 && !S.fail) setMood(s, 'worry');
  else if (rec.some((e) => e.k === 'fall' || (e.k === 'hang' && Math.abs(L.poses[e.p][e.pose].d) > 0.3))) setMood(s, 'wow');
  else if (rec.some((e) => e.k === 'done') || S.streak >= 4) setMood(s, 'smug');
  // 🎨 §2.4 한 방: 톡 한 번에 2개 이상 빠지면(빈칸으로 간 게 절반 이상이면 작게)
  if (shotN >= 2) ev(s, 'shot', shotX / shotN, shotY / shotN - 0.09, shotBad * 2 >= shotN ? 'bad' : undefined, undefined, lastLand, shotN);
  const C = STAGES[s.stage].C;
  if ((S.streak === 3 || S.streak === C || (S.streak > C && S.streak % 4 === 0)) && rec.some((e) => e.k === 'box')) ev(s, 'streak', 0.5, BOX_Y, S.streak >= C ? `★ 연속 쏙 ${S.streak}!` : `연속 쏙 ${S.streak}!`, S.streak >= C ? '#ffd166' : '#bff7c4', s.t + SPIN + FLY);
}

function tapScrew(s: ShopState, k: number) {
  const L = s.L, S = s.S;
  if ((blockedM(L, S.gone) >> k) & 1) {
    ev(s, 'blocked', L.px[k], L.py[k], '막혀 있어요!', '#ffd0c8', k);
    setMood(s, 'huh');
    tip(s, 'blocked', '위 판자에 걸린 나사는 못 빼요 — 위 판자부터!');
    return;
  }
  if (!S.key && (L.lockM >> k) & 1) {
    ev(s, 'locked', L.px[k], L.py[k], '🔒 열쇠 나사부터!', '#ffd0c8', k);
    setMood(s, 'huh');
    return;
  }
  const rec: RE[] = [], vis0 = visibleM(L, S.gone), free0 = freeM(L, S);
  apply(L, S, k, rec);
  s.cool = s.t + COOL;
  s.lastTap = s.t;
  s.taps++;
  playRec(s, rec);
  // 판자가 비켜서 드러난(또는 풀린) 나사는 반짝
  const vis1 = visibleM(L, S.gone), shown = (vis1 & ~vis0) | (freeM(L, S) & ~free0 & ~S.gone);
  const late = rec.some((e) => e.k === 'fall') ? SPIN + 16 : SPIN + 6;
  for (let i = 0; i < L.N; i++) if ((shown >> i) & 1) ev(s, 'reveal', L.px[i], L.py[i], (vis1 & ~vis0) >> i & 1 ? '!' : undefined, '#fff6a8', s.t + late);
  s.known |= vis1;
  if (S.fail) {
    s.phase = 'settle';
    s.pt = 0;
    s.ok = false;
    s.why = S.fail === 1 ? '빈칸이 꽉 찼어요!' : stuckM(L, S.gone) ? '못 날개에 깔려 영영 못 빼요!' : '더 뺄 나사가 없어요!';
    ev(s, 'jam', 0.5, TRAY_Y, S.fail === 1 ? '꽉!' : '꽉 막혔다…', '#ffb4a8', s.t + SPIN + FLY);
  } else if (S.n === L.N) {
    s.phase = 'settle';
    s.pt = 0;
    s.ok = true;
    // 다 풀리면 못 판자도 '툭' 빠져 떨어진다
    s.pv.forEach((pv, j) => {
      if (L.pl[j].kind !== 'nail' || pv.fall) return;
      const tr = plankXf(s, j);
      pv.fall = { x: tr.cx, y: tr.cy, vx: (j % 2 ? 1 : -1) * 0.003, vy: -0.01, a: tr.a, va: (j % 2 ? 1 : -1) * 0.05, hit: 0, t: s.t + 20 + j * 4 };
    });
  }
}

/** 판자 k가 지금 화면에서 어디에 (가운데·각도) */
function plankXf(s: ShopState, k: number): { cx: number; cy: number; a: number } {
  const L = s.L, pv = s.pv[k], P = L.poses[k][0];
  if (pv.fall) return { cx: pv.fall.x, cy: pv.fall.y, a: pv.fall.a };
  if (pv.pose > 0) {
    const c = Math.cos(pv.phi), sn = Math.sin(pv.phi), vx = P.cx - pv.px, vy = P.cy - pv.py;
    return { cx: pv.px + vx * c - vy * sn, cy: pv.py + vx * sn + vy * c, a: P.a + pv.phi };
  }
  return { cx: P.cx, cy: P.cy, a: P.a + pv.wob };
}

function animate(s: ShopState) {
  for (const pv of s.pv) {
    if (pv.fall) {
      const f = pv.fall;
      if (s.t < f.t) continue;
      if (s.t < pv.boing + 2 && pv.boing > 0) {
        f.x += f.vx;
        f.y += f.vy;
        f.vy += 0.0016;
        f.a += 0.25;
        continue;
      }
      f.vy += 0.0016;
      f.x += f.vx;
      f.y += f.vy;
      f.a += f.va;
      if (!f.hit && f.y > 1.2 && f.vy > 0) (f.hit = 1), (f.vy *= -0.32), (f.va *= -0.6), (f.vx *= 0.6);
      continue;
    }
    if (pv.pose > 0 && s.t >= pv.wait) {
      const P = s.L.poses[s.pv.indexOf(pv)][0], len = Math.max(0.05, Math.hypot(P.cx - pv.px, P.cy - pv.py));
      pv.vp += (-0.0032 / len) * Math.sin(pv.phi - pv.tgt) - 0.045 * pv.vp;
      pv.phi += pv.vp;
    } else if (pv.pose === 0) {
      pv.wv += -0.18 * pv.wob - 0.14 * pv.wv;
      pv.wob += pv.wv;
    }
  }
  s.vs.forEach((v, i) => (v.x += (slotXY(i)[0] - v.x) * 0.2));
  if (s.fl.length) s.fl = s.fl.filter((f) => s.t < f.t0 + f.dur + 2);
  if (s.lv.length) s.lv = s.lv.filter((l) => s.t < l.t0 + 44);
}

export const screwshop: GameDef<ShopState> = {
  id: 'screwshop',
  name: '나사 풀기 공방',
  genes: ['unscrew', 'sort', 'pointer'],
  twist: '마지막 나사 하나에 매달린 판자는 그 나사를 축으로 시계추처럼 빙글 흔들려 내려앉는다 — 어느 나사를 마지막에 남기느냐에 따라 판자가 다른 나사를 덮거나 드러내서, 빼는 순서가 수가 된다',
  rules: ['나사를 톡 → 같은 색 상자로 쏙! 맞는 상자가 없으면 빈칸으로.', '빈칸 5개가 다 차면 실패, 나사를 다 빼서 판자를 모두 떨구면 완성.'],
  controls: 'touch',
  hint: '나사를 톡! 누르고 있으면 갈 곳이 보여요 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '햄스터 목수의 장난감 공방',
    mood: '따뜻한 작업등 아래 나무 장난감 판 — 색칠한 판자에 반짝이는 색 나사, 판자 그림자와 두께, 톱밥 날리는 작업대 위에서 안전모 쓴 햄스터 목수가 드라이버를 들고 구경한다.',
    palette: { bg: '#3a2a20', ink: '#fff8ec', muted: '#d8c3a5', accent: '#ffc65c', hot: '#ff5a4f', soft: '#f3e2c4' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, known: 0,
      down: false, ax: 0, ay: 0, press: -1, cool: 0, lastTap: -99, taps: 0,
      hearts: 3, stars: 0, got: 0, bestSt: [], bestPts: [], retries: 0, pts: 0, ok: false, why: '', won: false, dead: false, tries: 0,
      seen: new Set<string>(), tips: new Set<string>(), events: [], news: null, newsQ: [], startT: 0, clearT: 0,
      pv: [], fl: [], vb: [], lv: [], vs: [], ready: [], mood: 'idle', moodT: 0, bird: 0,
    } as unknown as ShopState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, release = !p && s.down;
    if (p) (s.ax = p.x), (s.ay = p.y);
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 50 || (s.events.length && s.t - s.events[0].t > 200)) s.events = s.events.filter((e) => s.t - e.t < 200);
    animate(s);
    if (s.mood !== 'idle' && s.t - s.moodT > (s.mood === 'dizzy' || s.mood === 'cheer' ? 400 : 70)) s.mood = s.S.slots.length >= 3 ? 'worry' : 'idle';
    if (s.phase === 'result') {
      // ★3을 못 땄으면 자동으로 안 넘어간다(🧪 S001: ★1도 만세 + 자동 다음 판이라 놓친 걸 못 느낌) — 왼쪽 ↺ 다시 · 오른쪽 다음
      if (s.ok && s.got < 3) {
        if (release && s.pt > 30 && s.ay * A > 0.5) {
          if (s.ax < 0.5) s.retries++, newStage(s);
          else if (s.won) s.dead = true;
          else s.stage++, newStage(s);
        }
        return;
      }
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else newStage(s);
      }
      return;
    }
    if (s.phase === 'settle') {
      if (s.pt >= (s.ok ? 46 : 40)) finish(s);
      return;
    }
    if (p) s.press = pickScrew(s, p.x, p.y * A);
    if (!release) return;
    const k = s.press;
    s.press = -1;
    if (k < 0) {
      const y = s.ay * A;
      if (y > BY0 && y < BY1) ev(s, 'miss', s.ax, y, '나사를 톡!', '#fff3df');
      return;
    }
    if (s.t < s.cool) return;
    tapScrew(s, k);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
/** 봇이 아는 것만: 본 적 없는(판자 밑에 숨은) 나사 색은 모르고, 상자는 열린 것 + 다음 PEEK개까지만 안다 */
export function viewOf(s: ShopState): Level {
  const L = s.L;
  return { ...L, col: L.col.map((c, i) => ((s.known >> i) & 1 ? c : -1)), queue: L.queue.map((c, i) => (i < s.S.qi + PEEK ? c : -2)) };
}
function value(V: Level, S: Sim, d: StageDef) {
  if (S.fail) return -1e7 + S.n * 1000;
  let v = S.n * 100 - S.slots.length * 45 - S.peak * 20;
  if (S.peak > d.P) v -= 350 + 120 * (S.peak - d.P);
  if (d.H !== undefined) v += Math.min(S.shot, d.H) * 90 + (S.shot >= d.H ? 400 : 0) + Math.min(S.streak, 6) * 10;
  else if (d.T !== undefined) v += (S.n - S.taps) * 60 - Math.max(0, S.taps - d.T) * 120 + Math.min(S.streak, 6) * 10;
  else v += Math.min(S.best, d.C) * 35 + (S.best >= d.C ? 260 : 0) + Math.min(S.streak, d.C) * 12;
  const f = freeM(V, S);
  for (let i = 0; i < V.N; i++)
    if ((f >> i) & 1) {
      v += 4;
      if (V.col[i] >= 0 && S.box.includes(V.col[i])) v += 14;
      else if (V.col[i] >= 0 && V.queue.slice(S.qi, S.qi + 2).includes(V.col[i])) v += 5;
    }
  if (S.n === V.N) v += 3000;
  return v;
}
function movesOf(V: Level, S: Sim) {
  const f = freeM(V, S), out: number[] = [];
  for (let i = 0; i < V.N; i++) if ((f >> i) & 1 && V.col[i] >= 0) out.push(i);
  return out;
}
function search(V: Level, S: Sim, d: StageDef, depth: number): number {
  if (S.fail || depth === 0 || S.n === V.N) return value(V, S, d);
  const mv = movesOf(V, S);
  if (!mv.length) return value(V, S, d);
  let best = -1e9;
  for (const m of mv) {
    const S2 = cloneSim(S);
    apply(V, S2, m);
    const v = search(V, S2, d, depth - 1);
    if (v > best) best = v;
  }
  return best;
}
/** 보이는 것(V)만으로 몇 수 앞까지 시뮬레이션해 가장 좋은 나사 */
function bestMove(V: Level, S0: Sim, d: StageDef): number {
  const mv = movesOf(V, S0);
  if (!mv.length) return habitPick(V, S0);
  if (mv.length === 1) return mv[0];
  const depth = mv.length <= 4 ? 4 : mv.length <= 8 ? 3 : 2;
  let best = -1e9, pick = mv[0];
  for (const m of mv) {
    const S2 = cloneSim(S0);
    apply(V, S2, m);
    const v = search(V, S2, d, depth - 1);
    if (v > best) (best = v), (pick = m);
  }
  return pick;
}
export const planMove = (s: ShopState) => {
  const m = bestMove(viewOf(s), s.S, STAGES[s.stage]);
  return m >= 0 ? m : habitPick(s.L, s.S);
};

const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (L: Level, i: number): Input => ({ tap: false, dir: 0, pointer: { x: L.px[i], y: L.py[i] / A } });
const brain = new WeakMap<object, { key: string; m: number }>();
/** 봇: 몇 수 앞까지(본 것만으로) 시뮬레이션해 뺄 나사를 고른다. 사람처럼 한 번 빼고 조금 지켜본다 */
export const screwshopSmart: Bot<ShopState> = {
  name: '공방 장인',
  act(s) {
    if (s.phase !== 'play' || s.down || s.t < s.cool || s.t - s.lastTap < 24 || s.t - s.startT < 30) return NO;
    const key = `${s.stage}:${s.tries}:${s.S.gone}`;
    let m = brain.get(s);
    if (!m || m.key !== key) brain.set(s, (m = { key, m: planMove(s) }));
    return m.m >= 0 ? at(s.L, m.m) : NO;
  },
};
/** 버릇 봇(측정용): 맞는 상자 나사부터 위에서 아래로, 없으면 맨 위 나사 */
export const screwshopHabit: Bot<ShopState> = {
  name: '버릇: 맞는 색부터',
  act(s) {
    if (s.phase !== 'play' || s.down || s.t < s.cool || s.t - s.lastTap < 24 || s.t - s.startT < 30) return NO;
    const m = habitPick(s.L, s.S, s.known);
    return m >= 0 ? at(s.L, m) : NO;
  },
};

const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 봇: 아무 때나 보이는 나사 아무거나 톡 (가끔 화면 아무 데나) */
export const screwshopRandom: Bot<ShopState> = {
  name: '아무 나사나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 60), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 110);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    const L = s.L, vis = visibleM(L, s.S.gone), list: number[] = [];
    for (let i = 0; i < L.N; i++) if ((vis >> i) & 1) list.push(i);
    if (rng() < 0.2 || !list.length) m.p = { x: rng(), y: rng() };
    else {
      const i = list[Math.floor(rng() * list.length)];
      m.p = { x: L.px[i] + (rng() - 0.5) * 0.03, y: (L.py[i] + (rng() - 0.5) * 0.03) / A };
    }
    return { tap: false, dir: 0, pointer: m.p };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const hex = (c: string) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const p = hex(a), q = hex(b);
  return '#' + p.map((v, i) => Math.round(v + (q[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
const ease = (q: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, q)), 2.2);
export const COLS = ['#ef4b4b', '#3b82f6', '#f7c531', '#2fb86a', '#a45ee0', '#ff8a2b'];

/** 미리 보기: 지금 이 나사를 빼면? */
interface Preview { rec: RE[]; S: Sim; freed: number; blockers: number[]; state: 'ok' | 'blocked' | 'locked' }
const pvCache = new WeakMap<object, { key: string; p: Preview }>();
function preview(s: ShopState, k: number): Preview {
  const key = `${k}:${s.S.gone}:${s.stage}`, c = pvCache.get(s);
  if (c && c.key === key) return c.p;
  const L = s.L, S = cloneSim(s.S), rec: RE[] = [], blk = blockedM(L, S.gone);
  let p: Preview;
  if ((blk >> k) & 1) {
    const blockers: number[] = [];
    for (let j = 0; j < L.pl.length; j++) {
      const q = poseOf(L, j, S.gone);
      if (q >= 0 && (L.cov[j][q] >> k) & 1) blockers.push(j);
    }
    p = { rec, S, freed: 0, blockers, state: 'blocked' };
  } else if (!S.key && (L.lockM >> k) & 1) p = { rec, S, freed: 0, blockers: [], state: 'locked' };
  else {
    const f0 = freeM(L, S);
    apply(L, S, k, rec);
    p = { rec, S, freed: freeM(L, S) & ~f0 & ~S.gone, blockers: [], state: 'ok' };
  }
  pvCache.set(s, { key, p });
  return p;
}

const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();
function drawAll(ctx: CanvasRenderingContext2D, s: ShopState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, L = s.L, S = s.S, d = STAGES[s.stage];
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  ctx.save();
  fx.begin(ctx);
  // ═════════ 공방 벽 ═════════
  const wall = ctx.createLinearGradient(0, 0, 0, h);
  wall.addColorStop(0, '#2c1f18');
  wall.addColorStop(0.5, '#3f2c20');
  wall.addColorStop(1, '#2a1c14');
  ctx.fillStyle = wall;
  ctx.fillRect(-10, -10, w + 20, h + 20);
  ctx.strokeStyle = 'rgba(0,0,0,.25)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 7; k++) (ctx.beginPath(), ctx.moveTo(X(k / 7), 0), ctx.lineTo(X(k / 7), h), ctx.stroke());
  // 작업등 빛 번짐
  const glow = ctx.createRadialGradient(X(0.5), Y(0.42), R(0.05), X(0.5), Y(0.62), R(0.85));
  glow.addColorStop(0, 'rgba(255,214,150,.42)');
  glow.addColorStop(0.5, 'rgba(255,190,120,.12)');
  glow.addColorStop(1, 'rgba(255,180,100,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  // ═════════ 선반 + 상자 ═════════
  drawShelf(ctx, s, X, Y, R, font);
  // ═════════ 빈칸 쟁반 ═════════
  drawTray(ctx, s, X, Y, R, font);
  // ═════════ 장난감 판(합판) ═════════
  {
    const x0 = X(BX0), y0 = Y(BY0), x1 = X(BX1), y1 = Y(BY1);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.roundRect(x0 + R(0.012), y0 + R(0.016), x1 - x0, y1 - y0, R(0.02));
    ctx.fill();
    ctx.fillStyle = '#b98c5a';
    ctx.beginPath();
    ctx.roundRect(x0 + R(0.006), y0 + R(0.008), x1 - x0, y1 - y0, R(0.02));
    ctx.fill();
    const ply = ctx.createLinearGradient(x0, y0, x1, y1);
    ply.addColorStop(0, '#f3dfba');
    ply.addColorStop(0.55, '#ead1a4');
    ply.addColorStop(1, '#d9b98a');
    ctx.fillStyle = ply;
    ctx.beginPath();
    ctx.roundRect(x0, y0, x1 - x0, y1 - y0, R(0.02));
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(160,110,60,.13)';
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 14; k++) {
      const yy = BY0 + (k + 0.5) * ((BY1 - BY0) / 14);
      ctx.beginPath();
      for (let x = BX0; x <= BX1 + 0.01; x += 0.03) ctx.lineTo(X(x), Y(yy + 0.006 * Math.sin(x * 9 + k * 1.7)));
      ctx.stroke();
    }
    // 페그보드 구멍
    ctx.fillStyle = 'rgba(120,80,40,.22)';
    for (let gx = BX0 + 0.045; gx < BX1; gx += 0.075) for (let gy = BY0 + 0.045; gy < BY1; gy += 0.075) (ctx.beginPath(), ctx.arc(X(gx), Y(gy), R(0.0065), 0, TAU), ctx.fill());
    const sh = ctx.createRadialGradient(X(0.5), Y(0.6), R(0.1), X(0.5), Y(0.75), R(0.7));
    sh.addColorStop(0, 'rgba(255,240,200,.18)');
    sh.addColorStop(1, 'rgba(80,40,10,.22)');
    ctx.fillStyle = sh;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.restore();
    ctx.strokeStyle = 'rgba(110,70,30,.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x0, y0, x1 - x0, y1 - y0, R(0.02));
    ctx.stroke();
  }
  // 작업등 빛 속 먼지
  for (let k = 0; k < 18; k++) {
    const px = 0.15 + hsh(k + 300) * 0.7, py = BY0 + ((hsh(k + 310) * (BY1 - BY0) + t * 0.0004 * (1 + (k % 3))) % (BY1 - BY0));
    ctx.fillStyle = `rgba(255,240,200,${0.18 + 0.22 * Math.abs(Math.sin(t / 60 + k))})`;
    ctx.beginPath();
    ctx.arc(X(px + 0.01 * Math.sin(t / 90 + k)), Y(py), R(0.004 + 0.003 * (k % 2)), 0, TAU);
    ctx.fill();
  }
  // ═════════ 판자와 나사 ═════════
  const pressK = s.down && s.phase === 'play' ? s.press : -1, pre = pressK >= 0 ? preview(s, pressK) : null;
  const flying = new Set<number>();
  for (const f of s.fl) if (t < f.t0 + SPIN && f.spin) flying.add(Math.round(f.x0 * 1000) * 7 + Math.round(f.y0 * 1000));
  for (let k = 0; k < L.pl.length; k++) {
    const pv = s.pv[k];
    if (pv.fall) continue;
    drawPlank(ctx, s, k, plankXf(s, k), X, Y, R, t);
    for (const i of L.ps[k]) {
      if ((S.gone >> i) & 1) continue;
      drawScrew(ctx, X(L.px[i]), Y(L.py[i]), R(SR) * (i === pressK ? 0.9 : 1), L.col[i], 0, { lock: !S.key && !!((L.lockM >> i) & 1), key: !!((L.keyM >> i) & 1), t, hot: i === pressK, tick: L.tmr[i] ? L.tmr[i] - S.taps : 0 });
    }
  }
  // 못 날개 경고: 나사 하나 남은 못 판자가 매달릴 자리와 거기 깔릴 나사(⚠)를 늘 흐리게
  for (let k = 0; k < L.pl.length; k++) {
    const P = L.pl[k], rem = L.pm[k] & ~S.gone;
    if (P.kind !== 'nail' || !rem || rem & (rem - 1) || s.pv[k].fall) continue;
    const q = L.poses[k][1], under = L.cov[k][1] & L.all & ~S.gone;
    ctx.save();
    ctx.translate(X(q.cx), Y(q.cy));
    ctx.rotate(q.a);
    ctx.strokeStyle = under ? 'rgba(255,120,90,.55)' : 'rgba(255,255,255,.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 5]);
    plankPath(ctx, P, R);
    ctx.stroke();
    ctx.restore();
    for (let i = 0; i < L.N; i++)
      if ((under >> i) & 1) {
        ctx.font = `900 ${Math.max(12, R(0.04))}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('⚠️', X(L.px[i]) - R(0.035), Y(L.py[i]) - R(0.03) + Math.sin(t * 0.2) * 1.5);
      }
  }
  // 놓친 표시: 막힌 나사를 누르면 가린 판자를 빨갛게
  if (pre && pre.state === 'blocked')
    for (const j of pre.blockers) {
      const tr = plankXf(s, j), P = L.pl[j];
      ctx.save();
      ctx.translate(X(tr.cx), Y(tr.cy));
      ctx.rotate(tr.a);
      ctx.strokeStyle = `rgba(255,80,70,${0.6 + 0.3 * Math.sin(t * 0.3)})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.roundRect(-R(P.hx), -R(P.hy), R(P.hx * 2), R(P.hy * 2), R(P.rr));
      ctx.stroke();
      ctx.restore();
    }
  // 떨어지는 판자 (판 위로 지나간다)
  for (let k = 0; k < L.pl.length; k++) {
    const pv = s.pv[k];
    if (!pv.fall || pv.fall.y > A + 0.5) continue;
    drawPlank(ctx, s, k, plankXf(s, k), X, Y, R, t);
  }
  // ═════════ 미리 보기 ═════════
  if (pre && pressK >= 0) (ctx.textBaseline = 'middle'), drawPreview(ctx, s, pressK, pre, X, Y, R, font), (ctx.textBaseline = 'alphabetic');
  // ═════════ 작업대 ═════════
  drawBench(ctx, X, Y, R, w, h);
  // 다시 떨어지는 판자는 작업대 앞으로 (덜컹 튕긴 뒤)
  // ═════════ 날아가는 나사 ═════════
  for (const f of s.fl) {
    if (t < f.t0) {
      if (f.to === 0 && f.spin === 0) continue;
      if (f.spin) drawScrew(ctx, X(f.x0), Y(f.y0), R(SR), f.col, 0, { t, key: f.key });
      continue;
    }
    const u = t - f.t0;
    let x: number, y: number, sc: number, rot: number;
    if (u < f.spin) {
      const q = u / f.spin;
      x = f.x0;
      y = f.y0 - 0.012 * q;
      sc = 1.2 + 0.15 * q; // 🎨: 떼는 첫 프레임에 바로 1.2
      rot = u * 0.9;
      // 나사산 (빠져나오는 몸통)
      ctx.fillStyle = '#9aa3ad';
      ctx.fillRect(X(x) - R(0.007), Y(y), R(0.014), R(0.03 * q));
      ctx.strokeStyle = '#6b737c';
      ctx.lineWidth = 1;
      for (let k = 0; k < 3; k++) if (k * 0.01 < 0.03 * q) (ctx.beginPath(), ctx.moveTo(X(x) - R(0.008), Y(y + 0.004 + k * 0.01)), ctx.lineTo(X(x) + R(0.008), Y(y + 0.008 + k * 0.01)), ctx.stroke());
    } else {
      const q = ease((u - f.spin) / (f.dur - f.spin));
      x = f.x0 + (f.x1 - f.x0) * q;
      y = f.y0 + (f.y1 - f.y0) * q - Math.sin(Math.PI * q) * 0.1;
      sc = 1.35 + (f.sc - 1.35) * q;
      rot = f.spin * 0.9 + u * 0.5;
      ctx.strokeStyle = `rgba(255,240,200,${0.35 * (1 - q)})`;
      ctx.lineWidth = R(0.012);
      ctx.beginPath();
      const q0 = Math.max(0, q - 0.18);
      ctx.moveTo(X(f.x0 + (f.x1 - f.x0) * q0), Y(f.y0 + (f.y1 - f.y0) * q0 - Math.sin(Math.PI * q0) * 0.1));
      ctx.lineTo(X(x), Y(y));
      ctx.stroke();
    }
    drawScrew(ctx, X(x), Y(y), R(SR) * sc, f.col, rot, { t, key: f.key });
  }
  // ═════════ 햄스터 목수 + 참새 ═════════
  drawHamster(ctx, X(0.11), Y(1.235), R(0.19), s, t);
  drawBird(ctx, s, X, Y, R, t);
  // 가장자리 어둡게
  const vg = ctx.createRadialGradient(w / 2, h * 0.5, R(0.45), w / 2, h * 0.5, R(1.05));
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(10,5,0,.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  // ═════════ 사건 연출 ═════════
  /** 떠오르는 글자: HUD·상자 줄을 가리지 않게 판 안으로, 겹치면 위로 비켜 */
  const say = (x: number, y: number, text: string, col: string, size: number, punch = false) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    y = Math.max(Y(BY0 + 0.1), Math.min(Y(BY1 - 0.02), y));
    for (let k = 0; k < 6 && rec.some((q) => t - q.t < 45 && Math.abs(q.x - x) < w * 0.32 && Math.abs(q.y - y) < size + 5); k++) y += size + 6;
    rec.push({ x, y, t });
    if (rec.length > 12) rec.shift();
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    const hw = ctx.measureText(text).width / 2 + 6;
    fx.pop(Math.max(hw, Math.min(w - hw, x)), y, text, col, size, punch);
  };
  const seenT = fx.memo.t ?? -1;
  let reveals = 0;
  // 누름 첫 틱: '딸' (🎨)
  if (pressK >= 0 && fx.memo.pk !== pressK && t > seenT) cue('press');
  fx.memo.pk = pressK;
  for (const e of s.events) {
    const due = e.v !== undefined && ['in', 'slot', 'pull', 'done', 'swing', 'fall', 'boing', 'key', 'jam', 'streak', 'tick', 'reveal', 'twist', 'pluck', 'bonk', 'shot', 'air', 'crash'].includes(e.kind) ? e.v : e.t;
    if (due <= seenT || due > t) continue;
    const x = X(e.x), y = Y(e.y);
    if (e.kind === 'reveal') fx.ring(x, y, '#fff6a8', R(0.06), 3), fx.burst(x, y, '#fff6a8', 6, 1.6, 1.5), e.text && fx.pop(x + R(0.03), y - R(0.04), e.text, e.col!, 16), cue('reveal', reveals++);
    if (e.kind === 'twist') fx.ring(x, y, '#ffffff', R(0.06), 2), fx.burst(x, y, '#eef2f6', 4, 2, 1.4), cue('twist');
    if (e.kind === 'pluck') fx.ring(x, y, '#fff3c4', R(0.045), 2), fx.burst(x, y, e.col!, 6, 2.4, 1.8), fx.burst(x, y, '#ffffff', 3, 2, 1.2), cue('pluck');
    if (e.kind === 'in') {
      // 🎨 §3 연속 쏙: 음계가 오르고, 상자 앞에 숫자가 커지며 뜬다
      const n = e.n ?? 1;
      fx.burst(x, y, e.col!, 8, 2.6, 2.2), fx.burst(x, y, '#ffffff', 4, 2.6, 2.2), fx.hold(n >= 5 ? 3 : 2), cue('in', n);
      if (n >= 5) fx.burst(x, y, '#ffd166', 4, 3, 2.2);
      if (n >= 8) fx.kick(1.5);
      if (n >= 2) {
        const C = d.T === undefined && d.H === undefined ? d.C : -1, txt = n === C ? `★ 연속 ${n}!` : n >= 11 ? `${n} 🔥` : n >= 8 ? `${n} 착착착!` : n === 5 ? '5 착착!' : String(n);
        const col = n === C || (n > 5 && n < 8) ? '#ffd166' : n >= 8 ? '#ffb347' : n === 5 ? '#ffd166' : n >= 3 ? '#bff7c4' : '#fff6e0';
        fx.pop(Math.max(R(0.1), Math.min(w - R(0.1), x)), Y(BOX_Y + 0.03), txt, col, Math.min(36, 14 + 2.6 * n), true);
        if (n === C) fx.burst(x, y, '#ffd166', 12, 3.4, 2.4), fx.ring(x, y, '#ffd166', R(0.1), 3);
      }
    }
    if (e.kind === 'pull') fx.burst(x, y, '#c8f7c5', 10, 2.2, 1.8), fx.ring(X(e.x), Y(TRAY_Y), '#c8f7c5', R(0.05), 2), cue('pull');
    if (e.kind === 'slot') {
      fx.burst(x, y, '#d6dde6', 6, 1.6, 1.6), fx.kick(1), cue('slot');
      if ((e.n ?? 0) >= 3) say(x, y + R(0.06), `연속 ${e.n} 끝`, '#d8c3a5', 13), cue('brk');
    }
    if (e.kind === 'done') fx.burst(x, y, e.col!, 16, 4, 2.6), fx.burst(x, y, '#ffe066', 10, 4, 2.6), fx.ring(x, y, '#ffe066', R(0.16), 4), fx.kick(4), fx.hold(4), cue('done'); // '딸깍!' 글자는 연속 숫자와 겹쳐 뺐다(✏️ → 🎨)
    if (e.kind === 'swing') fx.ring(x, y, '#ffffff', R(0.09), 3), fx.burst(x, y, '#e8cfa0', 6, 1.8, 1.8), say(x + R(0.05), y - R(0.05), e.text!, e.col!, 20), cue('swing');
    if (e.kind === 'fall') fx.kick(1.5), say(x, Math.min(y, Y(1.05)), e.text!, e.col!, 20), cue('fall');
    if (e.kind === 'bonk') {
      // 🎨 §2.2+ 쾅: 맞은 나사가 빈칸으로 가면 작게
      fx.memo['bonk' + (e.n ?? 0)] = t;
      const bad = e.col === 'slot';
      fx.ring(x, y, '#fff3c4', R(0.09), 4), fx.burst(x, y, '#ffe08a', bad ? 6 : 14, 3.6, 2.4), fx.burst(x, y, '#c9ced6', 6, 3, 1.6), fx.burst(x, y, '#ffffff', 4, 5, 1.2);
      fx.kick(bad ? 3 : 5), fx.hold(bad ? 2 : 4), say(x, y - R(0.06), bad ? '쾅' : '쾅!', bad ? '#e8d9c0' : '#ffe08a', bad ? 20 : 26), cue('bonk');
    }
    if (e.kind === 'crash') {
      const i = e.n ?? 1;
      fx.burst(x, y, e.col!, 6 + 2 * i, 2.8 + 0.3 * i, 2.2), fx.burst(x, y, '#e9d3a6', 8, 2.4, 1.6), fx.ring(x, y, '#e9d3a6', R(0.05 + 0.01 * i), 3);
      fx.kick(Math.min(7, 2 + 1.5 * i)), fx.hold(1), cue('crash', i);
      if (e.text) say(x, y - R(0.06), e.text, '#f2d7a6', 22);
    }
    if (e.kind === 'air') fx.burst(x, y, '#e8dcc8', 6, 1.4, 1.6), say(x, y - R(0.04), e.text!, e.col!, 15), cue('blocked');
    if (e.kind === 'shot') {
      // 🎨 §2.4 한 방 단계: 판 안에 쇠빛 하늘색 — 연속 숫자(상자 줄, 따뜻한 색)와 겹치지 않게
      const h = e.n ?? 2, bad = e.text === 'bad';
      if (bad) say(x, y, `한 방 ${h}`, '#d8c3a5', 16);
      else {
        const sz = h >= 5 ? Math.min(40, 28 + 2 * h) : [0, 0, 20, 26, 32][h], col = h >= 5 ? '#ffffff' : ['', '', '#cfefff', '#8fe3ff', '#6fd6ff'][h];
        say(x, y, h >= 5 ? `💥 한 방 ${h}!` : h === 4 ? '한 방 4!!' : h === 3 ? '한 방 3!' : '한 방 2', col, sz, true); // 겹치면 비켜 선다(🧪 S001)
        fx.burst(x, y, '#8fe3ff', [0, 0, 6, 10, 16][Math.min(4, h)] || 24, 3.4, 2.2);
        if (h >= 3) fx.ring(x, y, '#8fe3ff', R(0.06 + 0.06 * Math.min(3, h - 2)), 3 + Math.min(2, h - 3)), fx.hold(Math.min(5, h)), fx.kick(h >= 5 ? 7 : h === 4 ? 5 : 3), setMood(s, h >= 4 ? 'cheer' : 'wow');
        if (h >= 4) fx.burst(x, y, '#ffffff', h >= 5 ? 12 : 8, 4, 2), fx.blink('#dff6ff', h >= 5 ? 0.18 : 0.1);
        cue('shot', h);
      }
    }
    if (e.kind === 'boing') fx.ring(x, y, '#ffd6a8', R(0.1), 5), fx.kick(4), fx.hold(4), say(x, y - R(0.05), e.text!, e.col!, 18), fx.burst(x, y, '#ffb36b', 16, 3.4, 2.4), cue('boing');
    if (e.kind === 'tick') fx.burst(x, y, '#ffb36b', 14, 3, 2.2), fx.kick(3), fx.hold(2), say(x, y + R(0.07), e.text!, e.col!, 15), cue('tick');
    if (e.kind === 'key') fx.blink('#fff1a8', 0.25), say(w / 2, Y(0.62), e.text!, e.col!, 17), cue('key');
    // 🎨: 실패는 벌이 아니라 웃음 — 빨간 번쩍을 빼고 쟁반 나사가 '뻥' 튀어 오른다
    if (e.kind === 'jam') {
      fx.kick(4), fx.ring(X(0.5), Y(TRAY_Y), '#ffb36b', R(0.3), 6), cue('jam');
      S.slots.forEach((c, i) => fx.burst(X(slotXY(i)[0]), Y(TRAY_Y), COLS[c], 2, 3, 4));
    }
    if (e.kind === 'blocked' || e.kind === 'locked') say(x, y - R(0.06), e.text!, e.col!, 15), cue('blocked');
    if (e.kind === 'miss') say(x, y, e.text!, e.col!, 14);
    if (e.kind === 'stage') fx.blink('#fff6d6', 0.18);
    if (e.kind === 'clear') {
      fx.burst(X(0.5), Y(0.75), '#ffe066', 46, 6, 3.2), fx.burst(X(0.5), Y(0.75), '#ff8fb1', 30, 5, 3), fx.ring(X(0.5), Y(0.75), '#ffe066', R(0.35), 6), fx.blink('#fff6c8', 0.25), fx.hold(6), cue('clear');
    }
    if (e.kind === 'fail') fx.kick(3), fx.blink('#ffe0b0', 0.1), cue('fail');
  }
  fx.memo.t = t;
  // 떨어진 판자가 작업대에 '덜컹'
  for (let k = 0; k < L.pl.length; k++) {
    const f = s.pv[k].fall;
    if (f && f.hit === 1 && (fx.memo['hit' + k] ?? -1) !== s.startT) {
      fx.memo['hit' + k] = s.startT;
      // 🎨: 덜컹은 작업대에 닿을 때 크게 — 큰 판자일수록 낮은 쿵
      const P = L.pl[k];
      fx.kick(7), fx.hold(3), cue('thud', Math.max(85, Math.min(160, 170 - 600 * Math.sqrt(P.hx * P.hy))));
      fx.burst(X(f.x), Y(1.2), '#e9d3a6', 26, 3.6, 2.6);
    }
  }
  ctx.restore();
  drawHud(ctx, s, d, w, X, Y, R, font, th);
}

function drawShelf(ctx: CanvasRenderingContext2D, s: ShopState, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, w?: number) => void) {
  const L = s.L, S = s.S, t = s.t;
  // 선반
  const sy = BOX_Y + BOX_H * 0.5;
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fillRect(X(0.02), Y(sy + 0.012), X(0.96), R(0.03));
  const g = ctx.createLinearGradient(0, Y(sy), 0, Y(sy + 0.03));
  g.addColorStop(0, '#c9965e');
  g.addColorStop(1, '#8a5a32');
  ctx.fillStyle = g;
  ctx.fillRect(X(0.02), Y(sy), X(0.96), R(0.026));
  ctx.fillStyle = 'rgba(255,240,210,.35)';
  ctx.fillRect(X(0.02), Y(sy), X(0.96), R(0.005));
  // 떠나는 상자
  for (const l of s.lv) {
    const u = t - l.t0;
    if (u < 0) {
      drawBox(ctx, X(boxX(L, l.bi)), Y(BOX_Y), R, l.col, 3, 0, 1, t);
      continue;
    }
    const lid = Math.min(1, (u / 8) ** 2), up = Math.max(0, u - 10); // 🎨: 뚜껑 가속 하강
    drawBox(ctx, X(boxX(L, l.bi) + up * up * 0.0011), Y(BOX_Y - Math.sin(Math.min(1, up / 6) * Math.PI) * 0.012), R, l.col, 3, lid, 1 - Math.max(0, (up - 18) / 14), t);
    if (u < 26) {
      font(0.045, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(40,20,5,.8)';
      ctx.globalAlpha = Math.min(1, (26 - u) / 8);
      ctx.strokeText('딸깍!', X(boxX(L, l.bi)), Y(BOX_Y + 0.045));
      ctx.fillStyle = '#fff1a8';
      ctx.fillText('딸깍!', X(boxX(L, l.bi)), Y(BOX_Y + 0.045));
      ctx.globalAlpha = 1;
    }
  }
  // 열린 상자
  for (let bi = 0; bi < s.vb.length; bi++) {
    const vb = s.vb[bi];
    if (vb.col < 0) continue;
    const u = t - vb.t0;
    if (u < 0) continue;
    const slide = u < 12 ? 1 - ease(u / 12) : 0;
    const n = vb.land.filter((x) => x <= t).length;
    const bump = vb.land.some((x) => t - x >= 0 && t - x < 8) ? 0.012 : 0;
    drawBox(ctx, X(boxX(L, bi) + slide * 0.7), Y(BOX_Y - bump), R, vb.col, n, 0, 1, t);
  }
  // 다음 상자 미리 보기 (아직 화면에 안 나온 상자 = 논리 큐에서 화면 상자보다 뒤)
  const shown = new Set<number>();
  let qv = S.qi;
  // 화면에 아직 들어오지 않은 새 상자는 미리 보기 쪽에 남겨 둔다
  const pending = s.vb.filter((v) => v.t0 > t && v.col >= 0).length;
  qv -= pending;
  font(0.032, 800);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,240,215,.75)';
  ctx.fillText('다음', X(peekX(L, 0) + 0.07), Y(BOX_Y - BOX_H * 0.62));
  for (let j = 0; j < PEEK; j++) {
    const qi = qv + j;
    if (qi >= L.queue.length) break;
    shown.add(qi);
    ctx.save();
    ctx.globalAlpha = 0.85 - j * 0.15;
    drawBox(ctx, X(peekX(L, j)), Y(BOX_Y + 0.012), (r) => R(r) * 0.55, L.queue[qi], 0, 0, 1, t);
    ctx.restore();
  }
  if (qv + PEEK < L.queue.length) {
    font(0.034, 900);
    ctx.fillStyle = 'rgba(255,240,215,.6)';
    ctx.fillText(`+${L.queue.length - qv - PEEK}`, X(peekX(L, PEEK - 1) + 0.085), Y(BOX_Y + 0.02));
  }
}

function drawBox(ctx: CanvasRenderingContext2D, x: number, y: number, R: (r: number) => number, col: number, n: number, lid: number, alpha: number, t: number) {
  if (col < 0 || alpha <= 0) return;
  const bw = R(BOX_W), bh = R(BOX_H), c = COLS[col];
  ctx.save();
  ctx.globalAlpha *= Math.max(0, alpha);
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath();
  ctx.ellipse(x + bw * 0.04, y + bh * 0.52, bw * 0.52, bh * 0.12, 0, 0, TAU);
  ctx.fill();
  // 앞면
  const g = ctx.createLinearGradient(0, y - bh * 0.2, 0, y + bh * 0.5);
  g.addColorStop(0, mix(c, '#ffffff', 0.12));
  g.addColorStop(1, mix(c, '#000000', 0.28));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x - bw / 2, y - bh * 0.18, bw, bh * 0.68, bh * 0.1);
  ctx.fill();
  // 윗면 테두리 (3/4 시점) + 열린 속
  ctx.fillStyle = mix(c, '#ffffff', 0.35);
  ctx.beginPath();
  ctx.moveTo(x - bw / 2, y - bh * 0.18);
  ctx.lineTo(x - bw / 2 + bw * 0.06, y - bh * 0.52);
  ctx.lineTo(x + bw / 2 - bw * 0.06, y - bh * 0.52);
  ctx.lineTo(x + bw / 2, y - bh * 0.18);
  ctx.closePath();
  ctx.fill();
  const ig = ctx.createLinearGradient(0, y - bh * 0.46, 0, y - bh * 0.22);
  ig.addColorStop(0, mix(c, '#000000', 0.62));
  ig.addColorStop(1, mix(c, '#000000', 0.35));
  ctx.fillStyle = ig;
  ctx.beginPath();
  ctx.moveTo(x - bw / 2 + bw * 0.05, y - bh * 0.23);
  ctx.lineTo(x - bw / 2 + bw * 0.09, y - bh * 0.46);
  ctx.lineTo(x + bw / 2 - bw * 0.09, y - bh * 0.46);
  ctx.lineTo(x + bw / 2 - bw * 0.05, y - bh * 0.23);
  ctx.closePath();
  ctx.fill();
  // 세로 널빤지 결 · 모서리 기둥
  ctx.strokeStyle = 'rgba(0,0,0,.18)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 5; k++) (ctx.beginPath(), ctx.moveTo(x - bw / 2 + (bw * k) / 5, y - bh * 0.16), ctx.lineTo(x - bw / 2 + (bw * k) / 5, y + bh * 0.48), ctx.stroke());
  ctx.fillStyle = mix(c, '#000000', 0.3);
  ctx.fillRect(x - bw / 2, y - bh * 0.18, bw * 0.06, bh * 0.68);
  ctx.fillRect(x + bw / 2 - bw * 0.06, y - bh * 0.18, bw * 0.06, bh * 0.68);
  // 칸 셋 (들어간 나사가 꽂힌다)
  for (let hh = 0; hh < 3; hh++) {
    const hx = x + (hh - 1) * bw * 0.28, hy = y - bh * 0.34;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(hx, hy + bh * 0.02, bw * 0.085, bh * 0.075, 0, 0, TAU);
    ctx.fill();
    if (hh < n) drawScrew(ctx, hx, hy - bh * 0.02, bw * 0.095, col, hh * 0.7, { t });
  }
  // 앞면 표시 (나사 머리 무늬)
  ctx.globalAlpha *= 0.9;
  drawMark(ctx, x, y + bh * 0.15, bh * 0.16, col, 0, 'rgba(255,255,255,.85)', 2.4);
  // 뚜껑
  if (lid > 0) {
    const ly = y - bh * 0.5 - (1 - lid) * bh * 0.6;
    ctx.fillStyle = mix(c, '#000000', 0.12);
    ctx.beginPath();
    ctx.roundRect(x - bw * 0.53, ly - bh * 0.06, bw * 1.06, bh * 0.36, bh * 0.08);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.fillRect(x - bw * 0.5, ly - bh * 0.04, bw, bh * 0.05);
  }
  ctx.restore();
}

/** 나사 머리 무늬: 색마다 다른 홈(색약도 구별) */
function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: number, rot: number, stroke: string, lw: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.strokeStyle = stroke;
  ctx.fillStyle = stroke;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const m = col % 6;
  if (m === 0) ctx.moveTo(-r, 0), ctx.lineTo(r, 0), ctx.moveTo(0, -r), ctx.lineTo(0, r);
  else if (m === 1) ctx.moveTo(-r, 0), ctx.lineTo(r, 0);
  else if (m === 2) for (let k = 0; k < 3; k++) ctx.moveTo(Math.cos((k * Math.PI) / 3) * r, Math.sin((k * Math.PI) / 3) * r), ctx.lineTo(-Math.cos((k * Math.PI) / 3) * r, -Math.sin((k * Math.PI) / 3) * r);
  else if (m === 3) ctx.rect(-r * 0.6, -r * 0.6, r * 1.2, r * 1.2);
  else if (m === 4) ctx.moveTo(0, -r * 0.8), ctx.lineTo(r * 0.75, r * 0.55), ctx.lineTo(-r * 0.75, r * 0.55), ctx.closePath();
  else ctx.arc(0, 0, r * 0.55, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawScrew(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: number, rot: number, o: { lock?: boolean; key?: boolean; t: number; hot?: boolean; tick?: number }) {
  const c = col >= 0 ? COLS[col] : '#9aa0a8';
  // 박힌 구멍 그림자
  ctx.fillStyle = 'rgba(40,20,5,.4)';
  ctx.beginPath();
  ctx.arc(x + r * 0.12, y + r * 0.2, r * 1.12, 0, TAU);
  ctx.fill();
  if (o.key) {
    ctx.strokeStyle = '#ffd34d';
    ctx.lineWidth = Math.max(2, r * 0.22);
    ctx.beginPath();
    ctx.arc(x, y, r * 1.3, 0, TAU);
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, mix(c, '#ffffff', 0.65));
  g.addColorStop(0.45, c);
  g.addColorStop(1, mix(c, '#000000', 0.38));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = mix(c, '#000000', 0.5);
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.stroke();
  drawMark(ctx, x, y, r * 0.5, col, rot + 0.4, 'rgba(30,20,10,.65)', Math.max(1.6, r * 0.2));
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.35, y - r * 0.45, r * 0.28, r * 0.15, -0.6, 0, TAU);
  ctx.fill();
  if (o.hot) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.45 + Math.sin(o.t * 0.4) * 1.5, 0, TAU);
    ctx.stroke();
  }
  if (o.lock) {
    const lx = x + r * 0.7, ly = y + r * 0.55, lw = r * 0.85;
    ctx.strokeStyle = '#555';
    ctx.lineWidth = Math.max(1.5, r * 0.16);
    ctx.beginPath();
    ctx.arc(lx, ly - lw * 0.35, lw * 0.32, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#ffcf3a';
    ctx.strokeStyle = '#7a5a10';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(lx - lw * 0.45, ly - lw * 0.35, lw * 0.9, lw * 0.7, lw * 0.12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#5a4008';
    ctx.fillRect(lx - lw * 0.06, ly - lw * 0.15, lw * 0.12, lw * 0.28);
  }
  if (o.tick) {
    // 째깍 시계: 남은 톡 수
    const cx = x + r * 0.95, cy = y - r * 0.95, cr = Math.max(7, r * 0.62), hot = o.tick <= 2;
    const sh = hot ? Math.sin(o.t * 0.6) * 1.5 : 0;
    ctx.fillStyle = hot ? '#ff5a4f' : '#fff6e0';
    ctx.strokeStyle = '#3a2210';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx + sh, cy, cr, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = hot ? '#ffffff' : '#3a2210';
    ctx.font = `900 ${Math.max(11, cr * 1.25)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(o.tick), cx + sh, cy + 1);
    ctx.textBaseline = 'alphabetic';
  }
  if (o.key) {
    const kx = x + r * 0.95, ky = y - r * 0.95;
    ctx.fillStyle = '#ffd34d';
    ctx.strokeStyle = '#8a6200';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(kx, ky, r * 0.34, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(kx - r * 0.06, ky, r * 0.12, r * 0.6);
    ctx.fillRect(kx, ky + r * 0.42, r * 0.22, r * 0.1);
  }
}

function plankPath(ctx: CanvasRenderingContext2D, P: Src, R: (r: number) => number) {
  ctx.beginPath();
  ctx.roundRect(-R(P.hx), -R(P.hy), R(P.hx * 2), R(P.hy * 2), R(P.rr));
}

/** 🔨 망치 머리 (🎨 ART §2.5): 판자 앞면 좌표계 안에 빨간 손잡이 띠 2줄 + 쇠 목 + 쇠머리. 장전되면 테두리가 금빛, 가끔 반짝 */
function drawHammerHead(ctx: CanvasRenderingContext2D, P: Src, R: (r: number) => number, t: number, k: number, s: ShopState) {
  const dx = P.ham![0] - P.cx, dy = P.ham![1] - P.cy, c = Math.cos(-P.a), sn = Math.sin(-P.a);
  const lx = R(dx * c - dy * sn), ly = R(dx * sn + dy * c), ang = Math.atan2(ly, lx), L = s.L;
  // 쾅 찌그러짐(맞힌 뒤 8틱)
  const bt = juice(s).memo['bonk' + k] ?? -99, u = t - bt, sq = u < 3 ? [0.82, 1.12] : u < 8 ? [1.06, 0.97] : [1, 1];
  // 장전: 남은 나사 2개이고 어느 매달림에서든 칠 나사가 살아 있다
  const rem = L.pm[k] & ~s.S.gone, armed = rem && (rem & (rem - 1)) && !(rem & (rem - 1) & (rem - 2)) && L.hamT[k].some((a) => a.some((i) => !((s.S.gone >> i) & 1)));
  ctx.save();
  ctx.translate(lx, ly);
  ctx.rotate(ang);
  for (const bx of [-0.05, -0.032]) {
    ctx.fillStyle = '#e8414f';
    ctx.fillRect(R(bx), -R(0.02), R(0.01), R(0.04));
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(R(bx), -R(0.02), R(0.01), 1);
  }
  ctx.fillStyle = '#8b939c';
  ctx.fillRect(-R(0.014), -R(0.011), R(0.014), R(0.022));
  ctx.scale(sq[0], sq[1]);
  const w = R(0.032), h = R(0.072), x0 = R(0.006) - w / 2;
  ctx.fillStyle = 'rgba(30,15,5,.35)';
  ctx.beginPath();
  ctx.roundRect(x0 + R(0.006), -h / 2 + R(0.009), w, h, R(0.006));
  ctx.fill();
  const g = ctx.createLinearGradient(x0 + w, 0, x0, 0);
  g.addColorStop(0, '#f4f7fa');
  g.addColorStop(0.5, '#aab2bb');
  g.addColorStop(1, '#6f7780');
  ctx.fillStyle = g;
  ctx.strokeStyle = armed ? `rgba(255,224,138,${0.55 + 0.3 * Math.sin(t * 0.1)})` : '#3f454c';
  ctx.lineWidth = armed ? 2.5 : 1.5;
  ctx.beginPath();
  ctx.roundRect(x0, -h / 2, w, h, R(0.006));
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#5d646d';
  ctx.fillRect(x0, -h / 2, w, R(0.008));
  ctx.fillRect(x0, h / 2 - R(0.008), w, R(0.008));
  ctx.fillStyle = '#4b525a';
  ctx.beginPath();
  ctx.arc(R(0.006), 0, R(0.006), 0, Math.PI * 2);
  ctx.fill();
  if ((t + 37 * k) % 150 < 10) {
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    const q = ((t + 37 * k) % 150) / 10;
    ctx.fillRect(x0 - w + q * 2 * w, -h / 2, R(0.01), h);
  }
  ctx.restore();
}

function drawPlank(ctx: CanvasRenderingContext2D, s: ShopState, k: number, tr: { cx: number; cy: number; a: number }, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, t: number) {
  const L = s.L, P = L.pl[k], S = s.S, pv = s.pv[k];
  const glass = P.kind === 'glass';
  const lift = pv.fall ? 1.6 : 1;
  // 판 위 그림자
  ctx.save();
  ctx.translate(X(tr.cx) + R(0.012) * lift, Y(tr.cy) + R(0.017) * lift);
  ctx.rotate(tr.a);
  ctx.fillStyle = glass ? 'rgba(40,60,80,.12)' : 'rgba(50,25,5,.3)';
  plankPath(ctx, P, R);
  ctx.fill();
  ctx.restore();
  // 두께 (옆면)
  ctx.save();
  ctx.translate(X(tr.cx) + R(0.004), Y(tr.cy) + R(0.008));
  ctx.rotate(tr.a);
  ctx.fillStyle = glass ? 'rgba(150,200,230,.45)' : mix(P.tone, '#000000', 0.4);
  plankPath(ctx, P, R);
  ctx.fill();
  ctx.restore();
  // 앞면
  ctx.save();
  ctx.translate(X(tr.cx), Y(tr.cy));
  ctx.rotate(tr.a);
  const hx = R(P.hx), hy = R(P.hy);
  if (glass) {
    ctx.fillStyle = 'rgba(205,235,255,.28)';
    plankPath(ctx, P, R);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = R(0.012);
    for (let k2 = -1; k2 <= 1; k2++) (ctx.beginPath(), ctx.moveTo(-hx + k2 * hx * 0.7, hy), ctx.lineTo(-hx * 0.2 + k2 * hx * 0.7, -hy), ctx.stroke());
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 2;
    plankPath(ctx, P, R);
    ctx.stroke();
  } else {
    const g = ctx.createLinearGradient(-hx * 0.3, -hy, hx * 0.3, hy);
    g.addColorStop(0, mix(P.tone, '#ffffff', 0.28));
    g.addColorStop(0.5, P.tone);
    g.addColorStop(1, mix(P.tone, '#000000', 0.16));
    ctx.fillStyle = g;
    plankPath(ctx, P, R);
    ctx.fill();
    ctx.save();
    ctx.clip();
    // 나뭇결
    ctx.strokeStyle = mix(P.tone, '#5a3410', 0.35);
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 1;
    const nl = Math.max(2, Math.round(hy / R(0.018)));
    for (let j = 0; j < nl; j++) {
      const yy = -hy + ((j + 0.5) * 2 * hy) / nl;
      ctx.beginPath();
      for (let xx = -hx; xx <= hx + 1; xx += Math.max(4, hx / 8)) ctx.lineTo(xx, yy + Math.sin(xx / R(0.03) + j * 2 + k) * R(0.004));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    drawDeco(ctx, P, R, t, k);
    ctx.restore();
    // 모서리 빛
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-hx + 1.5, -hy + 1.5, hx * 2 - 3, hy * 2 - 3, Math.max(0, R(P.rr) - 1.5));
    ctx.stroke();
    ctx.strokeStyle = mix(P.tone, '#000000', 0.45);
    ctx.lineWidth = 1.2;
    plankPath(ctx, P, R);
    ctx.stroke();
  }
  if (P.ham) drawHammerHead(ctx, P, R, t, k, s);
  if (P.heavy) {
    // 🪵 통나무: 양 끝 나이테 + 껍질 띠 (무거워 보이게)
    ctx.strokeStyle = 'rgba(60,30,10,.55)';
    ctx.lineWidth = 1.5;
    for (const sx of [-1, 1]) {
      const cx = sx * (hx - hy * 0.9);
      for (const rr of [0.75, 0.5, 0.25]) (ctx.beginPath(), ctx.arc(cx, 0, hy * rr, 0, Math.PI * 2), ctx.stroke());
    }
    ctx.fillStyle = 'rgba(60,30,10,.25)';
    ctx.fillRect(-hx + hy * 2, -hy, hx * 2 - hy * 4, hy * 0.35);
  }
  // 스프링 표시
  if (P.kind === 'spring') {
    ctx.strokeStyle = '#d8dde4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const n = 5, len = Math.min(hx, hy) * 1.2;
    for (let j = 0; j <= n * 2; j++) ctx.lineTo(-len / 2 + (j * len) / (n * 2), j % 2 ? -len * 0.18 : len * 0.18);
    ctx.stroke();
  }
  // 뚫린 구멍(뺀 나사 자리) · 남은 나사의 받침
  for (const i of L.ps[k]) {
    const dx = L.px[i] - L.poses[k][0].cx, dy = L.py[i] - L.poses[k][0].cy, a0 = -L.poses[k][0].a;
    const lx = dx * Math.cos(a0) - dy * Math.sin(a0), ly = dx * Math.sin(a0) + dy * Math.cos(a0);
    if ((S.gone >> i) & 1) {
      ctx.fillStyle = 'rgba(40,20,5,.65)';
      ctx.beginPath();
      ctx.arc(R(lx), R(ly), R(SR * 0.62), 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(R(lx), R(ly) + 0.8, R(SR * 0.62), 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  }
  ctx.restore();
  // 못(빠지지 않는 축)
  if (P.kind === 'nail' && P.nail) {
    const nx = X(P.nail[0]), ny = Y(P.nail[1]), r = R(0.016);
    const g = ctx.createRadialGradient(nx - r * 0.3, ny - r * 0.3, 1, nx, ny, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#7b828c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(nx, ny, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#4b5058';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawDeco(ctx: CanvasRenderingContext2D, P: Src, R: (r: number) => number, t: number, k: number) {
  const hx = R(P.hx), hy = R(P.hy), dk = mix(P.tone, '#000000', 0.45);
  const eye = (x: number, y: number, r: number) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2a1a10';
    const bl = (t + k * 37) % 200 < 6 ? 0.2 : 1;
    ctx.beginPath();
    ctx.ellipse(x + r * 0.15, y, r * 0.55, r * 0.6 * bl, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + r * 0.35, y - r * 0.25, r * 0.2, 0, TAU);
    ctx.fill();
  };
  switch (P.deco) {
    case 'spots':
      ctx.fillStyle = mix(P.tone, '#8a4a10', 0.55);
      for (let j = 0; j < 6; j++) {
        const x = (hsh(k * 13 + j) * 1.6 - 0.8) * hx, y = (hsh(k * 7 + j + 50) * 1.4 - 0.7) * hy;
        ctx.beginPath();
        ctx.ellipse(x, y, R(0.018 + 0.01 * hsh(j + k)), R(0.013), j, 0, TAU);
        ctx.fill();
      }
      break;
    case 'gHead':
      ctx.fillStyle = dk;
      ctx.fillRect(-hx * 0.15, -hy - R(0.028), R(0.008), R(0.03));
      ctx.fillRect(hx * 0.15, -hy - R(0.028), R(0.008), R(0.03));
      eye(hx * 0.05, -hy * 0.15, R(0.014));
      ctx.fillStyle = mix(P.tone, '#c06030', 0.5);
      ctx.beginPath();
      ctx.ellipse(hx * 0.72, hy * 0.2, hx * 0.3, hy * 0.6, 0, 0, TAU);
      ctx.fill();
      break;
    case 'dHead':
      eye(-hx * 0.05, -hy * 0.2, R(0.014));
      ctx.strokeStyle = dk;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(hx * 0.45, hy * 0.1, hx * 0.3, 0.2, 1.4);
      ctx.stroke();
      break;
    case 'hoof':
      ctx.fillStyle = '#5a3a20';
      ctx.fillRect(hx - R(0.03), -hy, R(0.03), hy * 2);
      break;
    case 'tail':
      ctx.fillStyle = '#6b4020';
      ctx.beginPath();
      ctx.arc(hx - R(0.01), 0, hy * 1.1, 0, TAU);
      ctx.fill();
      break;
    case 'waves':
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = -hx; x <= hx; x += 3) ctx.lineTo(x, -hy * 0.1 + Math.sin(x / R(0.02) + t * 0.05) * R(0.008));
      ctx.stroke();
      break;
    case 'port':
      for (const fx0 of [-0.5, 0.0, 0.5]) {
        ctx.fillStyle = '#fff3d6';
        ctx.beginPath();
        ctx.arc(fx0 * hx * 0.7 + hx * 0.12, -hy * 0.25, R(0.014), 0, TAU);
        ctx.fill();
        ctx.strokeStyle = dk;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.fillRect(-hx, hy * 0.35, hx * 2, R(0.008));
      break;
    case 'sail':
      ctx.strokeStyle = 'rgba(180,120,60,.35)';
      ctx.lineWidth = 2;
      for (let j = -1; j <= 1; j++) (ctx.beginPath(), ctx.moveTo(-hx, j * hy * 0.5), ctx.quadraticCurveTo(0, j * hy * 0.5 + R(0.02), hx, j * hy * 0.5), ctx.stroke());
      break;
    case 'flag':
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath();
      ctx.arc(hx * 0.35, 0, hy * 0.45, 0, TAU);
      ctx.fill();
      break;
    case 'brick':
      ctx.strokeStyle = 'rgba(80,40,20,.3)';
      ctx.lineWidth = 1;
      for (let j = 0; j * R(0.04) < hy * 2; j++) {
        const y = -hy + j * R(0.04);
        ctx.beginPath();
        ctx.moveTo(-hx, y);
        ctx.lineTo(hx, y);
        ctx.stroke();
        for (let x = -hx + (j % 2) * R(0.035); x < hx; x += R(0.07)) (ctx.beginPath(), ctx.moveTo(x, y), ctx.lineTo(x, y + R(0.04)), ctx.stroke());
      }
      break;
    case 'roof':
    case 'roofT':
      ctx.strokeStyle = 'rgba(0,0,0,.2)';
      ctx.lineWidth = 2;
      for (let x = -hx; x < hx; x += R(0.03)) (ctx.beginPath(), ctx.moveTo(x, -hy), ctx.lineTo(x + R(0.02), hy), ctx.stroke());
      break;
    case 'door':
      ctx.fillStyle = '#ffcf3a';
      ctx.beginPath();
      ctx.arc(hx * 0.5, hy * 0.2, R(0.008), 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.3)';
      ctx.lineWidth = 1.5;
      (ctx.beginPath(), ctx.moveTo(0, -hy), ctx.lineTo(0, hy), ctx.stroke());
      break;
    case 'blade':
      ctx.strokeStyle = 'rgba(150,110,70,.45)';
      ctx.lineWidth = 1;
      for (let x = -hx * 0.4; x < hx; x += R(0.025)) (ctx.beginPath(), ctx.moveTo(x, -hy), ctx.lineTo(x, hy), ctx.stroke());
      break;
    case 'hub':
    case 'seeds':
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      for (let j = 0; j < 10; j++) {
        const a = j * 2.4, r = Math.sqrt(j / 10) * hx * 0.8;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r, Math.sin(a) * r, R(0.005), 0, TAU);
        ctx.fill();
      }
      break;
    case 'boiler':
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      for (const x of [-0.4, 0.2]) ctx.fillRect(x * hx, -hy, R(0.01), hy * 2);
      eye(hx * 0.6, -hy * 0.2, R(0.016));
      break;
    case 'window':
      ctx.fillStyle = '#bfe3ff';
      ctx.fillRect(-hx * 0.6, -hy * 0.75, hx * 1.2, hy * 0.5);
      break;
    case 'chimney':
      ctx.fillStyle = '#22222a';
      ctx.fillRect(-hx, -hy * 1.2, R(0.02), hy * 2.4);
      break;
    case 'crate':
      ctx.strokeStyle = 'rgba(120,70,0,.4)';
      ctx.lineWidth = 2;
      (ctx.beginPath(), ctx.moveTo(-hx, -hy), ctx.lineTo(hx, hy), ctx.moveTo(-hx, hy), ctx.lineTo(hx, -hy), ctx.stroke());
      break;
    case 'wheel':
      ctx.strokeStyle = '#9aa0a8';
      ctx.lineWidth = 2;
      for (let j = 0; j < 3; j++) (ctx.beginPath(), ctx.moveTo(Math.cos(j) * hx, Math.sin(j) * hx), ctx.lineTo(-Math.cos(j) * hx, -Math.sin(j) * hx), ctx.stroke());
      ctx.beginPath();
      ctx.arc(0, 0, hx * 0.8, 0, TAU);
      ctx.stroke();
      break;
    case 'rail':
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      for (let x = -hx; x < hx; x += R(0.05)) ctx.fillRect(x, -hy, R(0.012), hy * 2);
      break;
    case 'pot':
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      ctx.fillRect(-hx, -hy, hx * 2, hy * 0.35);
      break;
    case 'leaf':
      ctx.strokeStyle = 'rgba(20,80,20,.45)';
      ctx.lineWidth = 1.5;
      (ctx.beginPath(), ctx.moveTo(-hx, 0), ctx.lineTo(hx, 0), ctx.stroke());
      break;
    case 'petal':
      ctx.fillStyle = 'rgba(255,255,255,.3)';
      ctx.beginPath();
      ctx.ellipse(hx * 0.2, -hy * 0.3, hx * 0.5, hy * 0.25, 0, 0, TAU);
      ctx.fill();
      break;
    case 'bee':
      ctx.fillStyle = '#2a1a10';
      for (const x of [-0.35, 0.25]) ctx.fillRect(x * hx, -hy, hx * 0.22, hy * 2);
      ctx.fillStyle = 'rgba(220,240,255,.85)';
      ctx.beginPath();
      ctx.ellipse(-hx * 0.2, -hy * 1.05, hx * 0.35, hy * 0.25, -0.3, 0, TAU);
      ctx.ellipse(hx * 0.3, -hy * 1.05, hx * 0.35, hy * 0.25, 0.3, 0, TAU);
      ctx.fill();
      eye(hx * 0.62, -hy * 0.2, R(0.011));
      break;
    case 'bug':
      ctx.fillStyle = '#2a1a10';
      ctx.fillRect(-R(0.003), -hy, R(0.006), hy * 2);
      for (const [x, y] of [[-0.45, -0.4], [0.45, -0.35], [-0.4, 0.4], [0.42, 0.45]]) (ctx.beginPath(), ctx.arc(x * hx, y * hy, R(0.009), 0, TAU), ctx.fill());
      ctx.beginPath();
      ctx.arc(0, -hy * 0.95, hx * 0.38, 0, TAU);
      ctx.fill();
      break;
    case 'spike':
      ctx.fillStyle = 'rgba(255,255,255,.3)';
      ctx.fillRect(-hx, -hy, hx * 2, hy * 0.5);
      break;
    case 'nose':
      ctx.fillStyle = 'rgba(255,255,255,.3)';
      ctx.beginPath();
      ctx.arc(-hx * 0.3, -hy * 0.3, hx * 0.3, 0, TAU);
      ctx.fill();
      break;
    case 'flame':
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.ellipse(hx * 0.1, 0, hx * 0.5, hy * 0.55, 0, 0, TAU);
      ctx.fill();
      break;
  }
}

function drawPreview(ctx: CanvasRenderingContext2D, s: ShopState, k: number, pre: Preview, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, w?: number) => void) {
  const L = s.L, t = s.t;
  if (pre.state !== 'ok') {
    font(0.036, 900);
    ctx.textAlign = 'center';
    const msg = pre.state === 'blocked' ? '🚫 위 판자가 막고 있어요' : '🔒 열쇠 나사를 먼저!';
    const y = Y(L.py[k]) - R(0.07), x = Math.max(R(0.2), Math.min(R(0.8), X(L.px[k])));
    ctx.fillStyle = 'rgba(60,10,5,.82)';
    const tw = ctx.measureText(msg).width + R(0.04);
    ctx.beginPath();
    ctx.roundRect(x - tw / 2, y - R(0.028), tw, R(0.052), R(0.02));
    ctx.fill();
    ctx.fillStyle = '#ffd0c8';
    ctx.fillText(msg, x, y + 1);
    return;
  }
  // 매달릴/떨어질 판자의 유령
  for (const e of pre.rec) {
    if (e.k === 'bonk') {
      // 🎯 망치가 칠 나사 (🎨 C S001 전 임시 표시: 노란 겨냥 고리 + 점선)
      const tx = X(L.px[e.s]), ty = Y(L.py[e.s]);
      ctx.save();
      ctx.strokeStyle = '#ffe08a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(tx, ty, R(SR) * 1.7, 0, Math.PI * 2);
      ctx.stroke();
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2 + t * 0.05;
        ctx.beginPath();
        ctx.moveTo(tx + Math.cos(a) * R(SR) * 1.3, ty + Math.sin(a) * R(SR) * 1.3);
        ctx.lineTo(tx + Math.cos(a) * R(SR) * 2.2, ty + Math.sin(a) * R(SR) * 2.2);
        ctx.stroke();
      }
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X(e.x), Y(e.y));
      ctx.lineTo(tx, ty);
      ctx.stroke();
      // 🎨 §2.5: 맞은 나사가 어디로 가는지 알약 글자
      const nx = pre.rec[pre.rec.indexOf(e) + 2], toSlot = nx && nx.k === 'slot';
      const lab = toSlot ? '🎯 쾅 → 빈칸' : '🎯 쾅 → 쏙';
      font(0.03, 900);
      const lw = ctx.measureText(lab).width + 14;
      ctx.setLineDash([]);
      // 🧪 S001: 알약을 과녁 위로(아래엔 '덜컹' 글자가 온다), '→ 빈칸'은 주황
      const py = ty - R(0.1);
      ctx.fillStyle = 'rgba(30,18,8,.9)';
      ctx.beginPath();
      ctx.roundRect(tx - lw / 2, py - R(0.022), lw, R(0.044), R(0.022));
      ctx.fill();
      ctx.fillStyle = toSlot ? '#ffb36b' : '#c8ffc8';
      ctx.textAlign = 'center';
      ctx.fillText(lab, tx, py + 1);
      ctx.restore();
    }
    if (e.k === 'hang' && L.pl[e.p].ham && e.pose >= 1 && !pre.rec.some((b) => b.k === 'bonk' && b.p === e.p)) {
      // 💨 허공: 망치가 아무것도 못 친다 — 막 누르면 톡을 버리는 이유가 누르는 동안 보인다
      const [hx, hy] = L.hamP[e.p][e.pose];
      ctx.save();
      ctx.fillStyle = 'rgba(200,190,170,.7)';
      ctx.beginPath();
      ctx.arc(X(hx), Y(hy), R(0.02), 0, Math.PI * 2);
      ctx.fill();
      font(0.032, 900);
      ctx.textAlign = 'center';
      const aw = ctx.measureText('💨 허공').width + 14; // 🧪 S001: 판 색과 섞이지 않게 어두운 알약
      ctx.fillStyle = 'rgba(30,18,8,.9)';
      ctx.beginPath();
      ctx.roundRect(X(hx) - aw / 2, Y(hy) - R(0.062), aw, R(0.044), R(0.022));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText('💨 허공', X(hx), Y(hy) - R(0.04) + 1);
      ctx.restore();
    }
    if (e.k === 'hang') {
      const P = L.pl[e.p], q = L.poses[e.p][e.pose];
      ctx.save();
      ctx.translate(X(q.cx), Y(q.cy));
      ctx.rotate(q.a);
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      plankPath(ctx, P, R);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      // 휘는 화살표
      const r0 = R(Math.hypot(P.cx - q.px, P.cy - q.py)) * 0.75, a0 = Math.atan2(P.cy - q.py, P.cx - q.px), a1 = Math.atan2(q.cy - q.py, q.cx - q.px);
      if (r0 > R(0.03) && Math.abs(q.d) > 0.15) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(X(q.px), Y(q.py), r0, a0, a1, q.d < 0);
        ctx.stroke();
        const ex = X(q.px) + Math.cos(a1) * r0, ey = Y(q.py) + Math.sin(a1) * r0, ta = a1 + (q.d > 0 ? Math.PI / 2 : -Math.PI / 2);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(ex + Math.cos(ta) * 8, ey + Math.sin(ta) * 8);
        ctx.lineTo(ex + Math.cos(ta + 2.5) * 7, ey + Math.sin(ta + 2.5) * 7);
        ctx.lineTo(ex + Math.cos(ta - 2.5) * 7, ey + Math.sin(ta - 2.5) * 7);
        ctx.fill();
      }
    }
    if (e.k === 'fall') {
      const P = L.pl[e.p], tr = plankXf(s, e.p);
      ctx.save();
      ctx.translate(X(tr.cx), Y(tr.cy) + R(0.03 + 0.01 * Math.sin(t * 0.25)));
      ctx.rotate(tr.a);
      ctx.strokeStyle = 'rgba(255,220,150,.95)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      plankPath(ctx, P, R);
      ctx.stroke();
      ctx.restore();
      font(0.034, 900);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe9c4';
      ctx.fillText('⬇ 덜컹', X(tr.cx), Y(tr.cy) + R(0.01));
    }
    if (e.k === 'boing') {
      ctx.strokeStyle = 'rgba(255,170,90,.95)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(X(L.pl[e.p].cx), Y(L.pl[e.p].cy));
      ctx.quadraticCurveTo(X((L.pl[e.p].cx + L.px[e.s]) / 2), Y(Math.min(L.pl[e.p].cy, L.py[e.s]) - 0.1), X(L.px[e.s]), Y(L.py[e.s]));
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.setLineDash([]);
  // 못 날개에 영영 깔리는 나사: 빨간 ✗
  const dead = stuckM(L, pre.S.gone);
  for (let i = 0; i < L.N; i++)
    if ((dead >> i) & 1) {
      const x = X(L.px[i]), y = Y(L.py[i]), r = R(SR);
      ctx.strokeStyle = '#ff4a3a';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(x - r, y - r);
      ctx.lineTo(x + r, y + r);
      ctx.moveTo(x + r, y - r);
      ctx.lineTo(x - r, y + r);
      ctx.stroke();
    }
  // 새로 풀리는 나사 반짝
  for (let i = 0; i < L.N; i++)
    if ((pre.freed >> i) & 1) {
      ctx.strokeStyle = `rgba(190,255,190,${0.6 + 0.4 * Math.sin(t * 0.3 + i)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(X(L.px[i]), Y(L.py[i]), R(SR * 1.5), 0, TAU);
      ctx.stroke();
    }
  // 나사가 갈 곳: 점선 호
  const first = pre.rec.find((e) => e.k === 'box' || e.k === 'slot');
  if (first && (first.k === 'box' || first.k === 'slot')) {
    const [x1, y1] = first.k === 'box' ? holeXY(L, first.bi, first.hole) : slotXY(first.idx);
    const x0 = L.px[k], y0 = L.py[k];
    ctx.strokeStyle = first.k === 'box' ? 'rgba(200,255,200,.95)' : pre.S.fail ? 'rgba(255,110,90,.95)' : 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([3, 5]);
    ctx.lineDashOffset = -t * 0.6;
    ctx.beginPath();
    ctx.moveTo(X(x0), Y(y0));
    ctx.quadraticCurveTo(X((x0 + x1) / 2), Y(Math.min(y0, y1) - 0.12), X(x1), Y(y1));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t * 0.3);
    drawScrew(ctx, X(x1), Y(y1), R(SR) * 0.85, L.col[k], 0, { t });
    ctx.restore();
    font(0.034, 900);
    ctx.textAlign = 'center';
    const lab = pre.S.fail === 2 ? '⚠ 이러면 꽉 막혀요!' : first.k === 'box' ? (pre.rec.some((e) => e.k === 'done') ? '쏙 → 상자 완성!' : '쏙!') : pre.S.fail ? '⚠ 빈칸이 꽉 차요!' : `빈칸으로 (${pre.S.slots.length}/5)`;
    const lx = X(Math.max(0.2, Math.min(0.8, x0))), ly = Y(Math.max(BY0 + 0.1, y0 - 0.075));
    const tw = ctx.measureText(lab).width + R(0.04);
    ctx.fillStyle = 'rgba(30,18,8,.82)';
    ctx.beginPath();
    ctx.roundRect(lx - tw / 2, ly - R(0.026), tw, R(0.05), R(0.025));
    ctx.fill();
    ctx.fillStyle = pre.S.fail ? '#ffb4a8' : first.k === 'box' ? '#c8ffc8' : '#ffffff';
    ctx.fillText(lab, lx, ly + 1);
  }
}

function drawTray(ctx: CanvasRenderingContext2D, s: ShopState, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, w?: number) => void) {
  const t = s.t, n = s.S.slots.length;
  const x0 = X(0.2), x1 = X(0.8), y0 = Y(TRAY_Y - 0.04), y1 = Y(TRAY_Y + 0.04);
  const danger = n >= 4 ? 2 : n >= 3 ? 1 : 0;
  if (danger) {
    ctx.save();
    ctx.shadowColor = danger === 2 ? '#ff4a3a' : '#ffa53a';
    ctx.shadowBlur = R(0.03) * (1 + (danger === 2 ? 0.5 * Math.sin(t * 0.3) : 0));
    ctx.fillStyle = 'rgba(0,0,0,.01)';
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.roundRect(x0 + 3, y0 + 5, x1 - x0, y1 - y0, R(0.03));
  ctx.fill();
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#c9ced6');
  g.addColorStop(1, '#7c838e');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x0, y0, x1 - x0, y1 - y0, R(0.03));
  ctx.fill();
  ctx.strokeStyle = danger === 2 ? '#ff6a5a' : danger ? '#ffb85a' : 'rgba(255,255,255,.5)';
  ctx.lineWidth = danger ? 2.5 : 1.2;
  ctx.stroke();
  for (let i = 0; i < SLOTS; i++) {
    const [sx, sy] = slotXY(i);
    ctx.fillStyle = i === SLOTS - 1 ? 'rgba(120,20,10,.55)' : 'rgba(30,30,40,.55)';
    ctx.beginPath();
    ctx.arc(X(sx), Y(sy), R(0.034), 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(X(sx), Y(sy) + 1, R(0.034), 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  for (const v of s.vs) if (t >= v.at) drawScrew(ctx, X(v.x), Y(TRAY_Y), R(SR) * 0.95, v.col, 0, { t });
  font(0.03, 800);
  ctx.textAlign = 'right';
  ctx.fillStyle = danger === 2 ? '#ffb4a8' : 'rgba(255,240,215,.75)';
  ctx.fillText('빈칸', x0 - R(0.012), Y(TRAY_Y) + R(0.011));
  ctx.textAlign = 'left';
  ctx.fillText(`${n}/5`, x1 + R(0.012), Y(TRAY_Y) + R(0.011));
}

function drawBench(ctx: CanvasRenderingContext2D, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, w: number, h: number) {
  const top = Y(1.19), front = Y(1.245);
  const g = ctx.createLinearGradient(0, top, 0, front);
  g.addColorStop(0, '#d9a96c');
  g.addColorStop(1, '#b98450');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-5, front);
  ctx.lineTo(X(0.02), top);
  ctx.lineTo(X(0.98), top);
  ctx.lineTo(w + 5, front);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,70,30,.3)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 4; k++) (ctx.beginPath(), ctx.moveTo(X(0.02 + k * 0.24) - 4, top), ctx.lineTo(X(k * 0.25) - 8 + k * 2, front), ctx.stroke());
  // 톱밥·대팻밥
  for (let k = 0; k < 10; k++) {
    ctx.fillStyle = `rgba(255,235,190,${0.35 + 0.3 * hsh(k)})`;
    ctx.beginPath();
    ctx.ellipse(X(0.25 + hsh(k + 3) * 0.7), Y(1.205 + hsh(k + 9) * 0.03), R(0.008 + 0.006 * hsh(k)), R(0.003), hsh(k) * 3, 0, TAU);
    ctx.fill();
  }
  // 연필
  ctx.save();
  ctx.translate(X(0.83), Y(1.222));
  ctx.rotate(-0.12);
  ctx.fillStyle = '#ffcf3a';
  ctx.fillRect(-R(0.06), -R(0.006), R(0.1), R(0.012));
  ctx.fillStyle = '#f2d4a8';
  ctx.beginPath();
  ctx.moveTo(R(0.04), -R(0.006));
  ctx.lineTo(R(0.058), 0);
  ctx.lineTo(R(0.04), R(0.006));
  ctx.fill();
  ctx.restore();
  const fg = ctx.createLinearGradient(0, front, 0, h);
  fg.addColorStop(0, '#8a5a32');
  fg.addColorStop(1, '#4a2c16');
  ctx.fillStyle = fg;
  ctx.fillRect(-5, front, w + 10, h - front + 5);
  ctx.strokeStyle = 'rgba(0,0,0,.2)';
  for (let k = 0; k < 5; k++) {
    ctx.beginPath();
    for (let x = 0; x <= 1.01; x += 0.05) ctx.lineTo(X(x), front + (k + 0.6) * ((h - front) / 5) + Math.sin(x * 8 + k) * 2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,230,190,.25)';
  ctx.fillRect(-5, front, w + 10, 2);
}

function drawHamster(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, s: ShopState, t: number) {
  const mood = s.mood, age = t - s.moodT;
  const fur = '#eaa45a', belly = '#fff1d8', dk = '#7a4a22';
  let bob = Math.sin(t * 0.08) * u * 0.015, tilt = 0, jump = 0;
  if (mood === 'wow') jump = Math.max(0, Math.sin(Math.min(1, age / 14) * Math.PI)) * u * 0.12;
  if (mood === 'cheer') jump = Math.abs(Math.sin(age * 0.18)) * u * 0.12;
  if (mood === 'dizzy') tilt = Math.sin(age * 0.12) * 0.25;
  if (mood === 'smug') tilt = -0.08;
  ctx.save();
  ctx.translate(x, y - jump + bob);
  ctx.rotate(tilt);
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.ellipse(0, jump - bob, u * 0.32, u * 0.06, 0, 0, TAU);
  ctx.fill();
  // 발
  ctx.fillStyle = '#f2a7a0';
  for (const sx of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sx * u * 0.13, -u * 0.02, u * 0.07, u * 0.035, 0, 0, TAU), ctx.fill());
  // 몸
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.25, u * 0.3, u * 0.26, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.2, u * 0.19, u * 0.18, 0, 0, TAU);
  ctx.fill();
  // 연장 띠
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(-u * 0.29, -u * 0.13, u * 0.58, u * 0.05);
  ctx.fillStyle = '#c9ced6';
  ctx.fillRect(u * 0.12, -u * 0.13, u * 0.03, u * 0.09);
  // 팔 + 드라이버
  const armUp = mood === 'cheer' || mood === 'wow';
  ctx.strokeStyle = fur;
  ctx.lineWidth = u * 0.08;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-u * 0.24, -u * 0.3);
  ctx.lineTo(-u * 0.34, armUp ? -u * 0.55 : -u * 0.16);
  ctx.moveTo(u * 0.24, -u * 0.3);
  const hx = u * 0.36, hy = armUp ? -u * 0.58 : mood === 'smug' ? -u * 0.38 : -u * 0.2;
  ctx.lineTo(hx, hy);
  ctx.stroke();
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(armUp ? -0.4 : mood === 'smug' ? -0.9 : 0.3);
  ctx.fillStyle = '#e8414f';
  ctx.beginPath();
  ctx.roundRect(-u * 0.035, -u * 0.08, u * 0.07, u * 0.11, u * 0.02);
  ctx.fill();
  ctx.fillStyle = '#c9ced6';
  ctx.fillRect(-u * 0.012, -u * 0.2, u * 0.024, u * 0.12);
  ctx.restore();
  // 머리
  const hy0 = -u * 0.6;
  ctx.fillStyle = fur;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sx * u * 0.2, hy0 - u * 0.17, u * 0.08, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#f7b3ae';
  for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(sx * u * 0.2, hy0 - u * 0.17, u * 0.045, 0, TAU), ctx.fill());
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, hy0, u * 0.27, u * 0.22, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(0, hy0 + u * 0.07, u * 0.19, u * 0.13, 0, 0, TAU);
  ctx.fill();
  // 볼
  ctx.fillStyle = mood === 'smug' || mood === 'cheer' ? 'rgba(255,110,120,.6)' : 'rgba(255,140,140,.4)';
  for (const sx of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sx * u * 0.16, hy0 + u * 0.06, u * 0.06, u * 0.04, 0, 0, TAU), ctx.fill());
  // 눈
  const ey = hy0 - u * 0.02;
  ctx.fillStyle = '#2a1a10';
  ctx.strokeStyle = '#2a1a10';
  ctx.lineWidth = Math.max(1.5, u * 0.025);
  for (const sx of [-1, 1]) {
    const ex = sx * u * 0.1;
    if (mood === 'smug' || mood === 'cheer') (ctx.beginPath(), ctx.arc(ex, ey + u * 0.01, u * 0.035, Math.PI * 1.1, Math.PI * 1.9), ctx.stroke());
    else if (mood === 'dizzy') {
      ctx.beginPath();
      for (let a = 0; a < 9; a += 0.4) ctx.lineTo(ex + Math.cos(a + age * 0.2) * a * u * 0.005, ey + Math.sin(a + age * 0.2) * a * u * 0.005);
      ctx.stroke();
    } else if (mood === 'wow' || mood === 'huh') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey, u * 0.05, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#2a1a10';
      ctx.beginPath();
      ctx.arc(ex, ey, u * 0.022, 0, TAU);
      ctx.fill();
    } else {
      const bl = t % 180 < 6 ? 0.2 : 1;
      ctx.beginPath();
      ctx.ellipse(ex, ey, u * 0.03, u * 0.036 * bl, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + u * 0.01, ey - u * 0.012, u * 0.01, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#2a1a10';
    }
  }
  // 코·입
  ctx.fillStyle = '#e46a7a';
  ctx.beginPath();
  ctx.ellipse(0, hy0 + u * 0.035, u * 0.025, u * 0.018, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = dk;
  ctx.lineWidth = Math.max(1.2, u * 0.018);
  ctx.beginPath();
  if (mood === 'wow') (ctx.fillStyle = '#7a2a2a'), ctx.ellipse(0, hy0 + u * 0.1, u * 0.035, u * 0.045, 0, 0, TAU), ctx.fill();
  else if (mood === 'worry' || mood === 'dizzy') {
    ctx.moveTo(-u * 0.05, hy0 + u * 0.1);
    for (let k = 0; k <= 4; k++) ctx.lineTo(-u * 0.05 + k * u * 0.025, hy0 + u * 0.1 + (k % 2 ? -1 : 1) * u * 0.01);
    ctx.stroke();
  } else {
    ctx.arc(-u * 0.025, hy0 + u * 0.06, u * 0.025, 0.2, Math.PI - 0.2);
    ctx.arc(u * 0.025, hy0 + u * 0.06, u * 0.025, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  // 안전모
  ctx.fillStyle = '#ffc61a';
  ctx.beginPath();
  ctx.ellipse(0, hy0 - u * 0.13, u * 0.22, u * 0.15, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#e8a800';
  ctx.beginPath();
  ctx.roundRect(-u * 0.27, hy0 - u * 0.14, u * 0.54, u * 0.05, u * 0.02);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.beginPath();
  ctx.ellipse(-u * 0.07, hy0 - u * 0.22, u * 0.06, u * 0.03, -0.4, 0, TAU);
  ctx.fill();
  // 식은땀 · 어질 별
  if (mood === 'worry') {
    ctx.fillStyle = '#9ad8ff';
    const dy = (age % 40) * u * 0.004;
    ctx.beginPath();
    ctx.ellipse(u * 0.26, hy0 - u * 0.05 + dy, u * 0.025, u * 0.04, 0, 0, TAU);
    ctx.fill();
  }
  if (mood === 'dizzy') {
    ctx.fillStyle = '#ffe066';
    ctx.font = `${Math.max(12, u * 0.14)}px system-ui`;
    ctx.textAlign = 'center';
    for (let k = 0; k < 3; k++) {
      const a = age * 0.1 + (k * TAU) / 3;
      ctx.fillText('★', Math.cos(a) * u * 0.28, hy0 - u * 0.3 + Math.sin(a) * u * 0.06);
    }
  }
  if (mood === 'smug' && age < 60) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.max(12, u * 0.15)}px system-ui`;
    ctx.textAlign = 'left';
    ctx.fillText('후훗', u * 0.3, hy0 - u * 0.25);
  }
  ctx.restore();
}

function drawBird(ctx: CanvasRenderingContext2D, s: ShopState, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, t: number) {
  // 판자가 떨어지면 폴짝 날아오른다
  const lastFall = s.events.reduce((m, e) => (e.kind === 'fall' && e.v !== undefined && e.v <= t ? Math.max(m, e.v) : m), -999);
  const age = t - lastFall, fly = age < 50 ? Math.sin((age / 50) * Math.PI) : 0;
  const ph = (t % 600) / 600, walk = ph < 0.1 ? ph / 0.1 : ph < 0.5 ? 1 : ph < 0.6 ? 1 - (ph - 0.5) / 0.1 : 0;
  const hop = (ph < 0.1 || (ph > 0.5 && ph < 0.6)) && t % 12 < 6 ? R(0.012) : 0;
  const x = X(0.92 - 0.12 * walk), y = Y(1.2) - fly * R(0.1) - hop, u = R(0.064);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-1, 1);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(0, u * 0.36 + fly * R(0.1) + hop, u * 0.5, u * 0.12, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#8a5a3a';
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 0.5, u * 0.38, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#f3e2c4';
  ctx.beginPath();
  ctx.ellipse(u * 0.1, u * 0.1, u * 0.3, u * 0.22, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#6b4020';
  const wing = fly > 0 ? Math.sin(t * 0.8) * 0.8 : 0;
  ctx.save();
  ctx.translate(-u * 0.1, -u * 0.05);
  ctx.rotate(-0.3 + wing);
  ctx.beginPath();
  ctx.ellipse(-u * 0.15, 0, u * 0.3, u * 0.15, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#8a5a3a';
  ctx.beginPath();
  ctx.arc(u * 0.35, -u * 0.3, u * 0.22, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath();
  ctx.arc(u * 0.42, -u * 0.34, u * (fly > 0 ? 0.07 : 0.045), 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffb02e';
  ctx.beginPath();
  ctx.moveTo(u * 0.55, -u * 0.3);
  ctx.lineTo(u * 0.72, -u * 0.26);
  ctx.lineTo(u * 0.55, -u * 0.22);
  ctx.fill();
  ctx.restore();
  if (fly > 0.5) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.max(12, R(0.034))}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('짹!', x - R(0.02), y - R(0.07));
  }
}

function drawHud(ctx: CanvasRenderingContext2D, s: ShopState, d: StageDef, w: number, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, w?: number) => void, th: Theme) {
  const t = s.t, S = s.S;
  const hb = R(0.068);
  ctx.fillStyle = 'rgba(25,15,8,.82)';
  ctx.fillRect(0, 0, w, hb);
  font(0.04, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff1d6';
  ctx.fillText(`${s.stage + 1}/${STAGES.length}판 · ${d.emoji} ${d.name}`, R(0.03), hb * 0.52);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd166';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.06) - ctx.measureText(stt).width, hb * 0.52);
  // 새것 알림
  if (s.news && t - s.news.t < NEWS_T + 20 && s.phase !== 'result') { // 🧪 M0.1: 완성 띠 위에 안내가 겹치지 않게
    const age = t - s.news.t, a = Math.min(1, age / 10, (NEWS_T + 20 - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    font(0.036, 900);
    ctx.textAlign = 'center';
    const tx = `✨ ${s.news.text}`;
    let fs = 0.036;
    while (ctx.measureText(tx).width > w - R(0.05) && fs > 0.03) font((fs -= 0.001), 900);
    const tw2 = Math.min(w - 8, ctx.measureText(tx).width + 22), by2 = Y(BY0 + 0.035) - drop;
    ctx.fillStyle = 'rgba(40,24,12,.9)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.027), tw2, R(0.054), R(0.027));
    ctx.fill();
    ctx.fillStyle = '#fff1d6';
    ctx.fillText(tx, w / 2, by2 + 1);
    ctx.globalAlpha = 1;
  }
  // 판 시작 큰 글씨
  {
    const age = t - s.startT;
    if (age < 100 && s.phase === 'play') {
      const a = Math.min(1, age / 8, (100 - age) / 20), sc = 1 + Math.max(0, 8 - age) * 0.04;
      ctx.globalAlpha = a;
      ctx.save();
      ctx.translate(w / 2, Y(0.66));
      ctx.scale(sc, sc);
      font(0.075, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(40,20,5,.75)';
      const big = `${d.emoji} ${s.stage + 1}판 · ${d.name}`;
      ctx.strokeText(big, 0, 0);
      ctx.fillStyle = '#fff6d6';
      ctx.fillText(big, 0, 0);
      font(0.04, 800);
      const sub = `나사 ${s.L.N}개를 다 풀어요`;
      ctx.strokeText(sub, 0, R(0.065));
      ctx.fillText(sub, 0, R(0.065));
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  // 결과
  if (s.phase === 'result') {
    const age = s.pt, a = Math.min(1, age / 10);
    ctx.globalAlpha = a;
    ctx.fillStyle = s.ok ? 'rgba(40,50,20,.62)' : 'rgba(70,20,20,.62)';
    ctx.fillRect(0, Y(0.6), w, R(s.ok && s.got < 3 ? 0.36 : 0.26)); // ↺·다음 버튼까지
    ctx.textAlign = 'center';
    font(s.ok ? 0.06 : 0.052, 900);
    ctx.fillStyle = s.ok ? '#fff1a8' : '#ffd0c8';
    ctx.fillText(s.ok ? (s.won ? '공방 완성! 🎉' : `${d.emoji} ${d.name} 완성!`) : s.why, w / 2, Y(0.66));
    if (s.ok) {
      for (let k = 0; k < 3; k++) {
        const ag = age - 14 - k * 10, got = k < s.got;
        if (ag < 0) continue;
        const sc = got ? 1 + Math.max(0, 1 - ag / 8) * 0.8 : 1;
        font(0.08 * sc, 900);
        ctx.fillStyle = got ? '#ffd166' : 'rgba(255,255,255,.35)';
        ctx.fillText(got ? '★' : '☆', w / 2 + (k - 1) * R(0.1), Y(0.75));
        if (got && (juice(s).memo['star' + k] ?? -1) < s.clearT) (juice(s).memo['star' + k] = s.clearT), juice(s).burst(w / 2 + (k - 1) * R(0.1), Y(0.75), '#ffe066', k === 2 ? 28 : 14, 3, 2.4), cue('star', k);
      }
      // 별 이유: 얻은 값 / 목표 (S002, 허들 ①)
      const ok2 = S.peak <= d.P, ok3 = star3(d, S);
      const t3 = d.H !== undefined ? `한 방 ${S.shot} / ${d.H}` : d.T !== undefined ? `톡 ${S.taps} / ${d.T}` : `연속 쏙 ${S.best} / ${d.C}`;
      font(0.04, 900);
      ctx.fillStyle = ok2 ? '#c8ffc8' : '#ffb36b';
      ctx.fillText(`${ok2 ? '✓' : '✗'} 빈칸 ${S.peak} / ${d.P}`, w / 2 - R(0.2), Y(0.825));
      ctx.fillStyle = ok3 ? '#c8ffc8' : '#ffb36b';
      ctx.fillText(`${ok3 ? '✓' : '✗'} ${t3}`, w / 2 + R(0.2), Y(0.825));
      if (s.got < 3 && age > 30) {
        // ↺ 다시 · 다음 ▶ (화면 왼쪽 절반 · 오른쪽 절반 아무 데나)
        const by = Y(0.905), bh = R(0.075);
        ([[0.06, '↺ 다시 (★3 도전)', '#ffd166', '#3a2a00'], [0.53, s.won ? '끝내기 ▶' : '다음 판 ▶', 'rgba(255,248,236,.18)', '#fff8ec']] as const).forEach(([x0, txt, bg, fg]) => {
          ctx.fillStyle = bg;
          ctx.beginPath();
          ctx.roundRect(X(x0), by - bh / 2, R(0.41), bh, bh / 2);
          ctx.fill();
          font(0.042, 900);
          ctx.fillStyle = fg;
          ctx.fillText(txt, X(x0) + R(0.205), by + 1);
        });
      }
    } else {
      font(0.042, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.hearts > 0 ? '♥ -1 · 이 장난감을 처음부터 다시' : '하트를 다 썼어요 — 끝', w / 2, Y(0.75));
    }
    ctx.globalAlpha = 1;
  }
  // ═════════ 아래 띠: 별 목표 · 안내 ═════════
  {
    const y2 = Y(1.3), chips = [
      { txt: '완성', st: s.phase === 'result' && s.ok ? true : null },
      { txt: d.P === 0 ? '빈칸 안 쓰기' : `빈칸 ${d.P}칸까지`, st: S.peak > d.P ? false : s.phase === 'result' && s.ok ? true : null },
      d.H !== undefined ? { txt: `한 방 ${d.H}`, st: S.shot >= d.H ? true : null } : d.T !== undefined ? { txt: `톡 ${d.T}번 이하`, st: S.taps > d.T ? false : s.phase === 'result' && s.ok ? true : null } : { txt: `연속 쏙 ${d.C}`, st: S.best >= d.C ? true : null },
    ];
    const gx0 = R(0.225), gw = (w - gx0 - R(0.015)) / 3;
    chips.forEach(({ txt, st }, k) => {
      const gx = gx0 + k * gw;
      ctx.fillStyle = st === true ? 'rgba(255,209,102,.3)' : st === false ? 'rgba(0,0,0,.3)' : 'rgba(255,240,210,.12)';
      ctx.beginPath();
      ctx.roundRect(gx + 2, y2 - R(0.026), gw - 4, R(0.052), R(0.026));
      ctx.fill();
      ctx.textAlign = 'center';
      font(0.034, 800);
      ctx.fillStyle = st === false ? 'rgba(255,255,255,.45)' : '#fff6e0';
      ctx.fillText(`${st === true ? '★' : st === false ? '✗' : '☆'} ${txt}`, gx + gw / 2, y2 + 1);
    });
    // 지금 연속 쏙
    if (S.streak > 0 && s.phase === 'play') {
      font(0.032, 800);
      ctx.textAlign = 'right';
      ctx.fillStyle = S.streak >= d.C ? '#ffd166' : '#c8f7c5';
      ctx.fillText(`지금 연속 ${S.streak}`, w - R(0.03), Y(1.36));
    }
    const y3 = Y(1.415);
    let tip = '👆 나사를 톡! 누르고 있으면 갈 곳이 보여요';
    if (s.stage === 0 && s.taps === 0) tip = '👆 나사를 톡 — 같은 색 상자로 쏙!';
    else if (s.down && s.press >= 0) tip = '떼면 쏙! · 나사 밖에서 떼면 취소';
    else if (s.phase === 'result') tip = s.ok ? (s.got < 3 ? '↺ 왼쪽: 같은 장난감 다시 · 오른쪽: 다음 판' : '다음 장난감이 와요!') : '같은 장난감을 다시 — 이번엔 미리 보고 톡';
    else if (S.slots.length >= 4) tip = '⚠ 빈칸이 하나 남았어요 — 상자 색을 골라 빼요!';
    else if (!S.key) tip = '🔒 자물쇠 나사는 🔑 열쇠 나사를 빼야 풀려요';
    else tip = d.tip; // 📐: 1판도 첫 톡 뒤엔 판 팁
    ctx.textAlign = 'center';
    font(0.036, 800);
    ctx.fillStyle = 'rgba(255,240,214,.92)';
    ctx.fillText(tip, w / 2 + R(0.06), y3);
  }
  // 첫 판: 손가락으로 추천 나사 가리키기
  if (s.stage === 0 && s.taps === 0 && s.phase === 'play' && t - s.startT > 40) {
    const L = s.L, f = freeM(L, S);
    let k = -1;
    if (d.first !== undefined && (f >> d.first) & 1) k = d.first;
    else for (let i = 0; i < L.N; i++) if ((f >> i) & 1 && S.box.includes(L.col[i]) && (k < 0 || L.py[i] < L.py[k])) k = i;
    if (k >= 0) {
      const bob = Math.sin(t * 0.15) * R(0.012);
      ctx.font = `${Math.max(16, R(0.07))}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('👆', X(L.px[k]) + R(0.02), Y(L.py[k]) + R(0.07) + bob);
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(X(L.px[k]), Y(L.py[k]), R(SR * 1.6) + Math.sin(t * 0.15) * 2, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.textBaseline = 'alphabetic';
}
