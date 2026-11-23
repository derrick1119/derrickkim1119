// 출정 프롤로그: 영웅마다 인형극 한 편 (긴 밤이 찾아온 일과 그 영웅이 고개에 오르는 까닭을 한 이야기로)
import { bgm } from '../audio.js';
import { nav } from '../nav.js';
import { newRun } from '../state.js';
import { UNITS } from '../data/units.js';
import { prologuePlay } from '../data/story.js';
import { Play } from '../ui/theater.js';

export class PrologueScene {
  constructor(a) { this.hero = (a && a.hero) || 'commander'; this.daily = a && a.daily; this.seed = a && a.seed != null ? a.seed : null; this.play = new Play({ beats: prologuePlay(this.hero), title: `${UNITS[this.hero].name} 이야기`, onDone: () => this.go() }); }
  go() { if (this.left) return; this.left = true; newRun(this.hero, this.daily ? { daily: this.daily } : this.seed != null ? { seed: this.seed } : {}); nav.go('run'); }
  frame(g, dt) { bgm('story'); this.play.frame(g, dt); }
  key(k) { this.play.key(k); }
}
