// 수익화 시작: 앱(Capacitor 네이티브)이면 AdMob·RevenueCat 공급자, 아니면 개발용 가짜 공급자.
import { Monetize } from './service.js';
import { createMockProvider } from './providers/mock.js';

/** @param {import('../core/game.js').Game} game */
export async function createMonetize(game) {
  let provider = null;
  const cap = globalThis.Capacitor;
  if (cap?.isNativePlatform?.()) {
    try {
      const { createNativeProvider } = await import('./providers/native.js');
      provider = createNativeProvider();
    } catch (err) {
      console.warn('네이티브 광고·결제를 시작하지 못해 가짜 공급자를 씁니다.', err);
    }
  }
  if (!provider) provider = createMockProvider();
  const m = new Monetize(game, provider);
  await m.init();
  return m;
}
