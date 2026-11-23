import './strings.js';

// 임무 미니게임. 임무마다 짧은(약 6~9초) 손맛 놀이를 하고, 그 점수(0..1)가 임무 결과를 바꾼다.
// 점수 0.5 = 보통(예전과 같은 확률·보상), 1 = 완벽(덜 들키고 더 크게 자람).
//
// playMinigame(ui, missionId) → Promise<number>
//   ui.stage(화면), ui.audio, ui.haptics, ui.game 을 쓸 수 있다. 끝나면 스스로 화면을 치운다.

/** @returns {Promise<number>} 0..1 */
export async function playMinigame(ui, missionId) {
  void ui;
  void missionId;
  return 0.5;
}
