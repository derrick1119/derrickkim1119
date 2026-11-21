// 무대 7종(3D 디오라마). 무대마다 { group, env, update } 를 만든다.
//
// 공통 약속(엔진 좌표, engine.js 참고)
//   · 지구인은 z = 0 에서 걷는다. z ∈ [−0.9, 0.9] 에는 0.1 보다 높은 것을 두지 않고, 그 앞(z > 0.9)에는 0.15 보다 높은 것을 두지 않는다.
//   · 땅은 z ≈ +9 부터 지평선까지 화면 폭 전체를 덮는다.
//   · 놀이 영역 위쪽 절반의 하늘은 비워 둔다(기체·표본 자리). 볼거리는 지평선 근처에 낮게, 양옆은 액자처럼 채운다.
//   · 움직이는 것은 몇 개만 남기고(userData.dynamic), 나머지는 bakeStatic 으로 재질별로 합친다.
import { buildFarm } from './stages/farm.js';
import { buildSuburb } from './stages/suburb.js';
import { buildCamp } from './stages/camp.js';
import { buildCity } from './stages/city.js';
import { buildObservatory } from './stages/observatory.js';
import { buildCloudsea } from './stages/cloudsea.js';
import { buildOrbit } from './stages/orbit.js';

export const STAGES = ['farm', 'suburb', 'camp', 'city', 'observatory', 'cloudsea', 'orbit'];

const BUILDERS = {
  farm: buildFarm,
  suburb: buildSuburb,
  camp: buildCamp,
  city: buildCity,
  observatory: buildObservatory,
  cloudsea: buildCloudsea,
  orbit: buildOrbit,
};

/**
 * 무대 하나를 만든다.
 * @param {string} id STAGES 중 하나
 * @param {{w: number, h: number}} size 화면 크기(CSS px). 양옆 소품을 화면 폭에 맞춰 놓는 데 쓴다.
 * @returns {{ group: import('three').Group, env: object, update(t: number, dt: number): void }}
 */
export function buildStage(id, { w = 390, h = 844 } = {}) {
  const make = BUILDERS[id] || BUILDERS.farm;
  const st = make({ w: Math.max(300, w), h });
  st.group.name = `stage:${id}`;
  return st;
}
