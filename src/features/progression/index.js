// 기능 묶음: progression (core 규칙 — DOM·three.js 를 쓰지 않는다)
//   traits   대원 성격(장점 하나·단점 하나)            game.fx.traits
//   lessons  교훈 카드(들킬 때마다 셋 중 하나, 영구)    game.fx.lessons
//   goals    이번 대원의 목표 세 가지                   game.fx.goals
//   memorial 명예의 전당(귀환한 대원 30명·역대 기록)     game.fx.memorial
//   excuses  변명하기(보기 세 개와 그럴듯함)            game.fx.excuses
// 등록 순서 = 'generation' 같은 이벤트를 받는 순서. 성격이 먼저 정해져야 목표·기록이 그것을 본다.
import './strings.js';
import './traits.js';
import './lessons.js';
import './goals.js';
import './memorial.js';
import './excuses.js';
