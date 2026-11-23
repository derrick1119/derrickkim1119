// 3D 장면 확장 지점. 날씨·반짝이 오라·사진기 같은 부가 연출은 여기에 층(layer)으로 등록한다.
//
// registerLayer({
//   id: 'shiny',
//   create(scene) {            // scene = Scene3D (scene.engine, scene.world, scene.game, scene.engine.scene ...)
//     return {
//       update(dt) {},         // 매 프레임(게임이 멈춰 있어도)
//       sync() {},             // 3D 객체를 세계 상태에 맞출 때(_sync3d 끝)
//       overlay(ctx) {},       // 2D 덧그림 캔버스(CSS 픽셀 좌표)
//       stage(stageId) {},     // 무대가 바뀔 때
//       dispose() {},
//     };
//   },
// });
//
// 등록은 src/render3d/layers/index.js 가 확장 파일들을 불러오면서 일어난다.

const registry = [];

export function registerLayer(layer) {
  const i = registry.findIndex((l) => l.id === layer.id);
  if (i >= 0) registry.splice(i, 1, layer);
  else registry.push(layer);
  registry.sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
  return layer;
}

export function layers() {
  return registry;
}
