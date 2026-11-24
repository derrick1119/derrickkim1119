// 보상형 광고 자리들의 화면: 관측 부스터·본부 지원 도장(계기판), 본부 보급 풍선, 구름 즉시 충전,
// 보고서 연구비 ×3, 본부 긴급 무마, 교훈 카드 다시 뽑기, 자리 비움·출석 ×2.
// 광고 띄우기와 보상은 ui.monetize(src/monetize/service.js)가, 규칙은 game.fx.monetize 가 맡는다.
import { registerBind } from '../hooks.js';

registerBind({
  id: 'monetize-core',
  order: 1,
  bind(ui) {
    const m = ui.monetize;
    if (!m) return;
    // 광고·결제 화면이 떠 있는 동안 세계를 멈추고 소리를 끈다
    let prevBusy = false;
    m.hooks.pause = () => {
      prevBusy = ui.game.busy;
      ui.game.busy = true;
      ui.audio.suspend();
    };
    m.hooks.resume = () => {
      ui.game.busy = prevBusy;
      ui.audio.resume();
      ui.save();
    };
  },
});
