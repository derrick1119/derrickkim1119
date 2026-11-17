// THE LAMP: 불 꺼진 숲 — 하나로 이어진 길 (256 × 24 타일)
// 타일: 0 빈 곳, 1 흙(점토), 2 낙엽 더미(떨어져도 다치지 않는다)
export const ZONES = [
  { id: 'wake',   x0: 0,   x1: 47,  kind: 'forest' },   // 깨어남 · 구덩이 · 상자
  { id: 'burrow', x0: 48,  x1: 97,  kind: 'burrow' },   // 나방 굴
  { id: 'hollow', x0: 98,  x1: 135, kind: 'hollow' },   // 그림자 골짜기
  { id: 'yard',   x0: 136, x1: 181, kind: 'yard' },     // 감시자의 뜰
  { id: 'cliff',  x0: 182, x1: 203, kind: 'cliff' },    // 승강대 위
  { id: 'bridge', x0: 204, x1: 255, kind: 'bridge' },   // 밀물과 큰 등
];

export function buildLevel() {
  const w = 256, h = 24;
  const tiles = new Uint8Array(w * h);
  const set = (x, y, v = 1) => { if (x >= 0 && x < w && y >= 0 && y < h) tiles[y * w + x] = v; };
  const col = (x0, x1, top, bot = h - 1, v = 1) => { for (let x = x0; x <= x1; x++) for (let y = top; y <= bot; y++) set(x, y, v); };
  const shards = [], crates = [], lanterns = [], roosts = [], stalkers = [], flowers = [];

  // A. 깨어나는 빈터 — 왼쪽 끝에 첫 빛꽃, 쓰러진 통나무
  col(0, 1, 3); col(2, 28, 14);
  col(14, 15, 13, 13);
  flowers.push({ x: 3.2, y: 14 });
  // B. 구덩이 (29–30)
  col(31, 47, 14);
  lanterns.push({ x: 33.5, y: 14 });
  // C. 상자 — 세 칸 높이의 턱. 떠 있는 선반 위에 두 번째 빛꽃.
  set(36, 11); set(37, 11);
  flowers.push({ x: 37, y: 11 });
  crates.push({ x: 42.5, y: 14 });
  col(48, 97, 11);
  lanterns.push({ x: 52.5, y: 11 });
  // D. 나방 굴 — 불을 켜면 나방이, 끄면 유리 조각과 구덩이가 보이지 않는다
  lanterns.push({ x: 61.5, y: 11 });
  col(64, 90, 2, 6);
  roosts.push({ x: 69.5, y: 7.7 }, { x: 79.5, y: 7.7 }, { x: 87.5, y: 7.7 });
  shards.push({ x: 72, y: 10 });
  set(75, 10);
  for (let y = 11; y < h; y++) { set(81, y, 0); set(82, y, 0); }
  shards.push({ x: 85, y: 10 });
  flowers.push({ x: 90.5, y: 11 });
  lanterns.push({ x: 93.5, y: 11 });
  // E. 그림자 골짜기 — 선반 아래 굴에 빛꽃, 낙엽 더미, 벽 속에 박힌 상자
  col(98, 129, 17);
  for (let x = 98; x <= 101; x++) set(x, 14);
  flowers.push({ x: 99.5, y: 17 });
  for (let x = 102; x <= 105; x++) set(x, 17, 2);
  lanterns.push({ x: 107.5, y: 17 });
  stalkers.push({ x: 112.5, y: 17 }, { x: 119.5, y: 17 }, { x: 126.5, y: 17 });
  roosts.push({ x: 119.5, y: 12.4 });
  col(130, 183, 14);
  set(130, 16, 0);
  crates.push({ x: 130.5, y: 17 });
  lanterns.push({ x: 134.5, y: 14 });
  // F. 감시자의 뜰 — 지붕 아래에서만 불을 켤 수 있다
  for (let x = 145; x <= 149; x++) set(x, 10);
  for (let x = 162; x <= 166; x++) set(x, 10);
  const watchers = [{ x: 156, y: 4.5, x0: 142, x1: 170, gy: 14, period: 10, phase: 0 }];
  stalkers.push({ x: 152.5, y: 14 }, { x: 159.5, y: 14 }, { x: 169.5, y: 14 });
  flowers.push({ x: 156, y: 14 });
  lanterns.push({ x: 175.5, y: 14 });
  // G. 승강대 — 빛을 비추는 동안 오른다
  set(180, 14, 0); set(181, 14, 0);
  const lifts = [{ x: 180, w: 2, y0: 14, y1: 7 }];
  col(182, 203, 7);
  roosts.push({ x: 187.5, y: 3.2 });
  flowers.push({ x: 187, y: 7 });
  lanterns.push({ x: 198.5, y: 7 });
  // H. 끊어진 다리와 밀물, 그리고 큰 등
  const gaps = new Set([209, 210, 216, 217, 229, 230, 236, 237]);
  for (let x = 204; x <= 243; x++) if (!gaps.has(x)) set(x, 7);
  set(222, 6); set(223, 6);
  flowers.push({ x: 223, y: 6 });
  roosts.push({ x: 224.5, y: 2.8 });
  col(244, 255, 7);

  return {
    w, h, tiles, shards, crates, lanterns, roosts, stalkers, watchers, lifts, flowers,
    start: { x: 6.5, y: 14 },
    lamp: { x: 250.5, y: 7 },
    tide: { trigger: 204 },
    zones: ZONES,
  };
}

export const LEVEL = buildLevel();

// 그 칸(x)에서 가장 위에 있는 땅의 윗면 (y0 아래에서부터 찾는다)
export function groundTop(L, x, y0 = 0) {
  const tx = Math.max(0, Math.min(L.w - 1, Math.floor(x)));
  for (let y = Math.max(0, Math.floor(y0)); y < L.h; y++) if (L.tiles[y * L.w + tx]) return y;
  return L.h;
}
