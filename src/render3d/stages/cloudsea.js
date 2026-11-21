// 임시 무대(작업 중)
import { THREE, terrain, G } from './common.js';
export function buildCloudsea() {
  const root = new THREE.Group();
  root.add(terrain({ H: () => 0, C: () => '#8fcf4c', rows: 40, cols: 20 }));
  return { group: root, env: {}, update() {} };
}
