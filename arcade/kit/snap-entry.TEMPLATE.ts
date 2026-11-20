// 복사해서 GAMEID / 이름 세 개를 바꿔 쓴다. 스마트 봇으로 at=초 목록마다 캔버스 하나씩 그린다.
import { mulberry32 } from '/home/user/derrickkim1119/engine/rng.ts';
import { REACT, NO_INPUT } from '/home/user/derrickkim1119/arcade/core.ts';
import { peek } from '/home/user/derrickkim1119/arcade/juice.ts';
import { GAMEVAR as game, SMARTVAR as smart } from '/home/user/derrickkim1119/arcade/games/GAMEID.ts';
const q = new URLSearchParams(location.search);
const w = 380, h = Math.round(380 * (game.aspect ?? 1));
for (const sec of (q.get('at') ?? '10').split(',').map(Number)) {
  const c = document.createElement('canvas');
  c.width = w * 2; c.height = h * 2; c.style.width = w + 'px'; c.style.height = h + 'px';
  document.body.append(c);
  const ctx = c.getContext('2d')!;
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  const s = game.create(4242), rng = mulberry32(4242);
  let held: any = NO_INPUT;
  for (let t = 0; t < sec * 60 && !game.over(s); t++) {
    const inp = t % REACT === 0 ? (held = smart.act(s, rng)) : { ...held, tap: false, move: undefined, pick: undefined };
    game.step(s, inp);
    if (t > sec * 60 - 50) (game.draw(ctx, s, w, h, game.art!.palette), peek(s)?.render(ctx, w, h));
  }
  game.draw(ctx, s, w, h, game.art!.palette);
  peek(s)?.render(ctx, w, h);
}
