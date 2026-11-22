// 출정 프롤로그: 영웅마다 인형극 한 편 (긴 밤이 찾아온 일과 그 영웅이 고개에 오르는 까닭을 한 이야기로)
import { nav } from '../nav.js';
import { newRun } from '../state.js';
import { UNITS } from '../data/units.js';
import { prologuePlay } from '../data/story.js';
import { Play } from '../ui/theater.js';

export class PrologueScene {
  constructor(a) { this.hero = (a && a.hero) || 'commander'; this.play = new Play({ beats: prologuePlay(this.hero), title: `${UNITS[this.hero].name} 이야기`, onDone: () => this.go() }); }
  go() { if (this.left) return; this.left = true; newRun(this.hero); nav.go('run'); }
  frame(g, dt) { this.play.frame(g, dt); }
  key(k) { this.play.key(k); }
}
