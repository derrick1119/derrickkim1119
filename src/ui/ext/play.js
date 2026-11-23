// 관측 손맛: 콤보 계기, 아슬아슬·완벽·싹둑 같은 터지는 글자, 표본별 요령 안내, 날씨·헌터·번개 알림.
import { t } from '../../i18n/index.js';
import { h } from '../dom.js';
import { registerHud, registerBind } from '../hooks.js';

const POP = {
  nearMiss: { color: '#7ef0ff', size: 24 },
  perfect: { color: '#ffd23f', size: 22 },
  cut: { color: '#ffffff', size: 18 },
  swarm: { color: '#d4ff6a', size: 20 },
  caught: { color: '#ffb36b', size: 18 },
  recOff: { color: '#9dffb0', size: 16 },
  shiny: { color: '#ffe066', size: 20 },
};

/** 표본이 처음 나왔을 때 한 번 알려 주는 요령. */
const FIRST_SEEN = { cow: 'holdCow', balloon: 'holdBalloon', kite: 'cutKite', drone: 'droneRec' };

// ───────── 콤보 계기 ─────────

registerHud({
  id: 'combo',
  order: 10,
  mount(ui, host) {
    this.num = h('b', { class: 'combo-num' });
    this.mult = h('span', { class: 'combo-mult' });
    this.fill = h('i');
    this.el = h('div', { class: 'combo-meter', hidden: '', 'aria-live': 'off' }, this.num, this.mult, h('span', { class: 'combo-bar' }, this.fill));
    host.append(this.el);
    this.shown = 0;
  },
  update(ui) {
    const game = ui.game;
    const combo = game.phase === 'play' ? game.combo : 0;
    const on = combo >= 2;
    if (this.el.hidden === on) this.el.hidden = !on;
    if (!on) {
      this.shown = 0;
      return;
    }
    if (combo !== this.shown) {
      this.num.textContent = t('play.combo', { n: combo });
      this.mult.textContent = t('play.comboMult', { m: game.comboMult.toFixed(2) });
      this.el.classList.remove('bump');
      void this.el.offsetWidth; // 애니메이션 다시 시작
      this.el.classList.add('bump');
      this.el.classList.toggle('hot', combo >= 10);
      this.shown = combo;
    }
    const k = Math.max(0, Math.min(1, game.run.comboT / game.mod('comboWindow', 2.6)));
    this.fill.style.setProperty('--p', `${(k * 100).toFixed(1)}%`);
  },
});

// ───────── 사건에 반응하기 ─────────

registerBind({
  id: 'play',
  bind(ui) {
    const { world, game, scene, audio, haptics } = ui;
    const tut = () => game.state.tutorial;
    const pop = (x, y, key, text = t(`play.${key}`)) => {
      const st = POP[key] || { color: '#ffffff', size: 17 };
      scene.popup(x, y, text, st.color, st.size);
    };
    const once = (key, fn) => {
      if (tut()[key]) return;
      tut()[key] = true;
      fn();
    };

    world.on('collect', ({ specimen, result, tags = [], auto }) => {
      if (auto || !result || (result.report && result.gain === 0)) return;
      let y = specimen.y - 30;
      for (const tag of tags) {
        if (!POP[tag]) continue;
        pop(specimen.x, y, tag);
        y -= 22;
      }
      if (tags.includes('shiny')) {
        audio.sfx('shiny');
        scene.sparkle(specimen.x, specimen.y, 16, '#ffe066', 170);
      }
      if (tags.includes('perfect') || tags.includes('swarm')) haptics.fire('good');
      if (tags.includes('cut')) audio.sfx('snip');
      if (game.combo >= 2) audio.sfx('combo', { tier: Math.min(game.combo, 12) });
    });

    world.on('nearMiss', ({ x, y }) => {
      pop(x, y - 34, 'nearMiss');
      audio.sfx('nearMiss');
      haptics.fire('good');
      scene.ring(world.ufoX, world.layout.ufoY, '#7ef0ff', 90, 0.5);
    });

    world.on('hint', ({ key }) => ui.say(t(`play.${key}`), 2.6));
    world.on('holdStart', () => audio.sfx('click'));
    world.on('flee', (sp) => {
      audio.sfx('cluck');
      pop(sp.x, sp.y - 46, 'chickenRun');
    });
    world.on('pop', (sp) => {
      audio.sfx('pop');
      haptics.fire('warn');
      pop(sp.x, sp.y - 20, 'pop');
      scene.ring(sp.x, sp.y, '#ff6b8a', 40, 0.35);
    });
    world.on('moo', (sp) => {
      audio.sfx('moo');
      pop(sp.x, sp.y - 50, 'moo');
    });
    world.on('drop', ({ specimen }) => {
      audio.sfx('drop');
      audio.sfx('moo');
      haptics.fire('warn');
      pop(specimen.x, specimen.y - 50, 'drop');
    });
    world.on('cut', (sp) => {
      audio.sfx('snip');
      pop(sp.x, sp.y + 30, 'cut');
    });

    // 새 표본을 처음 봤을 때: 다루는 요령을 한 번 알려 준다
    world.on('spawn', (sp) => {
      const key = FIRST_SEEN[sp.kind];
      if (!key || !ui.started || game.phase !== 'play') return;
      once(`hint_${sp.kind}`, () => ui._later(600, () => ui.say(t(`play.${key}`), 3)));
    });

    // 산책하는 주민의 강아지는 주인보다 먼저 하늘을 보고 짖는다(예고)
    world.on('notice', (hm) => {
      if (hm.type !== 'walker') return;
      scene.popup(hm.x + hm.dir * 22, world.layout.groundY - 40, t('play.bark'), '#ffffff', 15);
      audio.sfx('poke');
    });
    // 시선 예고: 처음 몇 번은 끌어서 피하라고 알려 준다
    world.on('notice', () => {
      if (!tut().dragged && game.state.gen <= 3 && Math.random() < 0.7) ui.say(t('play.dragHint'), 2.2);
    });
    // 기체를 한 번이라도 끌었으면 더는 알려 주지 않는다
    let lastX = world.ufoX;
    game.on('tick', () => {
      if (!tut().dragged && Math.abs(world.ufoX - lastX) > 30 && world.pointer?.mode === 'drag') tut().dragged = true;
      lastX = world.ufoX;
    });

    world.on('weather', ({ kind }) => {
      if (!ui.started) return;
      ui.toast(t('weather.toast', { name: t(`weather.${kind}.name`), desc: t(`weather.${kind}.desc`) }), kind === 'clear' ? 'info' : 'warn');
    });
    world.on('hunter', ({ on }) => {
      ui.toast(t(on ? 'play.hunterIn' : 'play.hunterOut'), on ? 'warn' : 'good');
      if (on) {
        audio.sfx('notice');
        haptics.fire('warn');
      }
    });
    world.on('lightningWarn', () => {
      ui.say(t('play.lightningWarn'), 1.4);
      audio.sfx('thunder');
      haptics.fire('warn');
    });
    world.on('lightning', () => {
      scene.flash('#eef6ff', 0.75);
      scene.shake(4, 0.25);
    });
    world.on('sourceWarn', (s) => {
      ui.say(t(`play.sourceWarn.${s.kind}`), 1.6);
      audio.sfx('notice');
    });
    world.on('flash', () => {
      scene.flash('#ffffff', 0.55);
      audio.sfx('shutter');
    });
  },
});
