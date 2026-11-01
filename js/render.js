'use strict';
/* =========================================================
 * 서든어택: 남겨진 자들 — 화면 렌더링
 * ========================================================= */

function bar(label, v, inverse, text) {
  // inverse: 값이 높을수록 나쁨 (허기, 갈증, 피로)
  const good = inverse ? 100 - v : v;
  const cls = good >= 60 ? 'ok' : good >= 30 ? 'mid' : 'low';
  return `<div class="stat"><span class="sl">${label}</span>
    <div class="sbar"><div class="sfill ${cls}" style="width:${v}%"></div></div>
    <span class="sv">${text}</span></div>`;
}
function apPips(s) {
  const m = maxAP(s), l = apLeft(s);
  let h = '';
  for (let i = 0; i < 3; i++) h += `<i class="pip ${i < l ? 'on' : i < m ? 'used' : 'off'}"></i>`;
  return `<span class="pips" title="행동력 ${l}/${m}">${h}</span>`;
}
function statusIcons(s) {
  let h = '';
  if (s.sick) h += '<span title="질병">🤒</span>';
  if (s.health < 50) h += '<span title="부상">🩸</span>';
  if (s.hunger >= 75) h += '<span title="굶주림">🍽️</span>';
  if (s.thirst >= 75) h += '<span title="탈수">🥵</span>';
  if (s.fatigue >= 85) h += '<span title="탈진">💤</span>';
  if (s.morale < 25) h += '<span title="절망">🌧️</span>';
  return h;
}
function costHtml(cost) {
  return Object.entries(cost).map(([k, v]) =>
    `<span class="cost ${(S.inv[k] || 0) >= v ? '' : 'miss'}">${ITEMS[k].icon}${v}</span>`).join('');
}
function dangerText(d) { return ['안전', '낮음', '보통', '높음'][Math.min(3, Math.ceil(d))]; }
function token(s, extra = '') {
  const showBubble = S.selected === s.id && s.thought && !extra;
  return `<div class="token ${S.selected === s.id && !extra ? 'sel' : ''} ${extra}" style="--c:${s.color}" onclick="event.stopPropagation();G.select('${s.id}')" title="${s.name}">
    ${showBubble ? `<div class="bubble">${esc(s.thought)}</div>` : ''}
    <div class="fig"><div class="head"></div><div class="torso"></div><div class="legs"></div></div>
    <div class="tname">${s.name}</div>
    <div class="ticons">${statusIcons(s)}</div>
  </div>`;
}

/* ---------- 메인 ---------- */
function render() {
  const root = $('#root');
  if (!S || S.phase === 'title') root.innerHTML = renderTitle();
  else if (S.phase === 'day') root.innerHTML = renderDay();
  else if (S.phase === 'scav') root.innerHTML = renderScav();
  else if (S.phase === 'end') root.innerHTML = renderEnding();
  renderModal();
}

/* ---------- 타이틀 ---------- */
function renderTitle() {
  return `<div class="title-screen">
    <div class="title-noise"></div>
    <div class="title-box">
      <div class="title-sub">SUDDEN ATTACK · FAN-MADE SURVIVAL</div>
      <h1 class="title-main">서든어택<span>남겨진 자들</span></h1>
      <p class="title-quote">"전쟁에서 영웅은 총을 든 자가 아니다.<br>내일 아침을 맞이한 자다."</p>
      <div class="title-btns">
        <button class="btn big primary" onclick="G.newGame()">새 게임</button>
        <button class="btn big" onclick="G.load()" ${hasSave() ? '' : 'disabled'}>이어하기</button>
        <button class="btn big" onclick="G.help()">게임 방법</button>
      </div>
      <p class="title-foot">비공식 팬메이드 컨셉 프로토타입 · 서든어택은 넥슨의 상표입니다.</p>
    </div>
  </div>`;
}

/* ---------- 낮 화면 ---------- */
function renderHud() {
  const winter = S.day >= WINTER_DAY;
  const temp = winter ? -(6 + (S.day * 7) % 9) : 13 - Math.floor(S.day * 0.8);
  const fc = S.radioForecast;
  return `<header class="hud">
    <div class="logo">SA<small>남겨진 자들</small></div>
    <div class="hud-item"><b>${S.day}</b>일차</div>
    <div class="hud-item warn">휴전까지 D-${CEASEFIRE_DAY - S.day}</div>
    <div class="hud-item">${winter ? '❄' : '🌫'} ${temp}°C</div>
    ${fc ? `<div class="hud-item ${fc === 'high' ? 'bad' : 'good'}">📻 ${fc === 'high' ? '오늘 밤 약탈 경보' : '오늘 밤 비교적 안전'}</div>` : ''}
    ${S.protectedUntil >= S.day ? '<div class="hud-item good">🛡 순찰대 보호 중</div>' : ''}
    <div class="hud-spacer"></div>
    <button class="btn sm" onclick="G.save()">저장</button>
    <button class="btn sm" onclick="G.help()">도움말</button>
    <button class="btn sm" onclick="G.toTitle()">타이틀</button>
  </header>`;
}

function roomFurniture(id) {
  const b = S.buildings;
  const it = (icon, label, n = 1) => `<div class="furn" title="${label}">${icon.repeat(Math.max(1, n))}<small>${label}</small></div>`;
  let h = '';
  if (id === 'roof') {
    if (b.collector) h += it('🪣', `집수기 ×${b.collector}`, b.collector);
    if (b.garden) h += it('🌱', '텃밭');
    if (b.radio) h += it('📡', '무전 안테나');
    if (!h) h = '<div class="empty-note">비어 있는 옥상</div>';
  }
  if (id === 'workshop') h += it('🛠️', `작업대 Lv${b.workbench}`);
  if (id === 'kitchen') {
    if (b.stove) h += it('🔥', '조리대');
    if (b.heater) h += it('♨️', '난로');
    if (b.radio) h += it('📻', '무전기');
    if (!b.stove && !b.heater) h += '<div class="empty-note">불 피울 곳이 없다</div>';
  }
  if (id === 'entrance') { h += it('🚪', '정문'); if (b.barricade) h += it('🧱', `바리케이드 ${b.barricade}단계`, b.barricade); }
  if (id === 'bedroom') h += b.bed ? it('🛏️', `침대 ×${b.bed}`, b.bed) : '<div class="empty-note">맨바닥에서 잔다</div>';
  if (id === 'storage') h += `<div class="furn" title="식량/식수">📦<small>🥫${S.inv.can + S.inv.meal} 💧${S.inv.water}</small></div>`;
  if (id === 'infirmary') h += it('✚', `🩹${S.inv.bandage} 💊${S.inv.medicine}`);
  return h;
}

function renderShelter() {
  const roomHtml = (r) => {
    const rubble = RUBBLE.filter((x) => x.room === r.id && !S.rubble.find((y) => y.id === x.id).cleared);
    const people = crew().filter((s) => s.room === r.id);
    const locked = r.id === 'roof' && !S.roofOpen;
    return `<div class="room room-${r.id} ${locked ? 'locked' : ''}">
      <div class="room-name">${r.name}</div>
      <div class="room-furn">${roomFurniture(r.id)}</div>
      <div class="room-rubble">${rubble.map((x) => `<button class="rubble" onclick="event.stopPropagation();G.clearRubble('${x.id}')" title="치우기 (행동력 ${x.ap})">🪨 ${x.name}<small>행동 ${x.ap}</small></button>`).join('')}</div>
      <div class="room-people">${people.map((s) => token(s)).join('')}</div>
      ${locked ? '<div class="lock-ov">🔒 계단이 잔해로 막혀 있다<br><small>입구의 「옥상 계단 잔해」를 치우세요</small></div>' : ''}
    </div>`;
  };
  const floor = (f) => SHELTER_ROOMS.filter((r) => r.floor === f).map(roomHtml).join('');
  return `<section class="shelter">
    <div class="sky ${S.day >= WINTER_DAY ? 'snow' : ''}"></div>
    <div class="building">
      <div class="floor f2">${floor(2)}</div>
      <div class="floor f1">${floor(1)}</div>
      <div class="ground-line"></div>
      <div class="floor f0">${floor(0)}</div>
    </div>
  </section>`;
}

function renderCrewTab() {
  const s = actor();
  if (!s || !active(s)) { S.selected = crew()[0]?.id; return S.selected ? renderCrewTab() : ''; }
  const others = crew();
  const btn = (label, fn, ok, title = '') => `<button class="btn act" ${ok ? '' : 'disabled'} onclick="${fn}" title="${title}">${label}</button>`;
  return `<div class="pc">
    <div class="pc-head" style="--c:${s.color}">
      <div class="pc-portrait"><div class="fig big"><div class="head"></div><div class="torso"></div><div class="legs"></div></div></div>
      <div class="pc-info">
        <div class="pc-name">${s.name} <small>${s.age}세 · ${s.role}</small></div>
        <div class="pc-trait">★ ${s.traitName} — ${s.traitDesc}</div>
        <div class="pc-ap">행동력 ${apPips(s)} <small>${apLeft(s)}/${maxAP(s)}</small>
          ${maxAP(s) === 0 ? '<span class="tag bad">사기 붕괴 — 아무것도 하지 않으려 한다</span>' : ''}
          ${s.fatigue >= 90 ? '<span class="tag bad">탈진 — 휴식만 가능</span>' : ''}</div>
      </div>
    </div>
    <p class="pc-bio">${s.bio}</p>
    <div class="pc-thought">💭 "${esc(s.thought)}"</div>
    <div class="stats">
      ${bar('체력', s.health, false, healthLabel(s.health))}
      ${bar('허기', s.hunger, true, hungerLabel(s.hunger))}
      ${bar('갈증', s.thirst, true, thirstLabel(s.thirst))}
      ${bar('피로', s.fatigue, true, fatigueLabel(s.fatigue))}
      ${bar('사기', s.morale, false, moraleLabel(s.morale))}
    </div>
    ${s.sick ? '<div class="tag bad">🤒 질병 — 매일 체력 감소, 행동력 -1. 의약품 필요</div>' : ''}

    <h4>식사 <small>(행동력 소모 없음)</small></h4>
    <div class="btnrow">
      ${btn(`🥫 통조림 <b>${S.inv.can}</b>`, `G.eat('${s.id}','can')`, S.inv.can > 0, '허기 -35')}
      ${btn(`🍲 조리식 <b>${S.inv.meal}</b>`, `G.eat('${s.id}','meal')`, S.inv.meal > 0, '허기 -45, 사기 +4')}
      ${btn(`🥕 날것 <b>${S.inv.raw}</b>`, `G.eat('${s.id}','raw')`, S.inv.raw > 0, '허기 -15, 배탈 위험')}
      ${btn(`💧 물 <b>${S.inv.water}</b>`, `G.drink('${s.id}')`, S.inv.water > 0, '갈증 -45')}
      ${btn(`☕ 커피 <b>${S.inv.coffee}</b>`, `G.luxury('${s.id}','coffee')`, S.inv.coffee > 0, '피로 -20, 사기 +8')}
      ${btn(`🚬 담배 <b>${S.inv.cigarette}</b>`, `G.luxury('${s.id}','cigarette')`, S.inv.cigarette > 0, '사기 +12, 체력 -2')}
    </div>

    <h4>행동</h4>
    <div class="btnrow">
      ${btn('💤 휴식 <small>행동 1</small>', `G.rest('${s.id}')`, apLeft(s) >= 1, '피로 -25, 사기 +4')}
      ${btn('🔨 건설·제작 ▸', "G.tab('build')", true)}
    </div>

    <h4>동료 돌보기 <small>(${s.name}의 행동력 1)</small></h4>
    <div class="care">
      ${others.map((t) => `<div class="care-row">
        <span class="care-name" style="--c:${t.color}">${t.name}${t.id === s.id ? ' (본인)' : ''}</span>
        <span class="care-st">❤${t.health} ☺${t.morale}${t.sick ? ' 🤒' : ''}</span>
        ${btn('🩹', `G.treat('${s.id}','${t.id}','bandage')`, canWork(s, 1) && S.inv.bandage > 0 && t.health < 100, `붕대 (체력 +${s.trait === 'medic' ? 40 : 20})`)}
        ${btn('💊', `G.treat('${s.id}','${t.id}','medicine')`, canWork(s, 1) && S.inv.medicine > 0, `의약품 (병 치료, 체력 +${s.trait === 'medic' ? 30 : 15})`)}
        ${t.id !== s.id ? btn('💬', `G.talk('${s.id}','${t.id}')`, canWork(s, 1), '대화 (상대 사기 상승)') : '<span class="btn-ph"></span>'}
      </div>`).join('')}
    </div>
  </div>`;
}

function renderBuildTab() {
  const a = actor();
  const chips = crew().map((s) => `<button class="chip ${S.selected === s.id ? 'on' : ''}" style="--c:${s.color}" onclick="S.selected='${s.id}';render()">${s.name} ${apPips(s)}</button>`).join('');
  const rubble = RUBBLE.filter((r) => !S.rubble.find((x) => x.id === r.id).cleared);
  const rec = (r) => {
    const st = recipeState(r);
    const need = recipeAP(r, a);
    const lvl = r.cat === 'build' ? (S.buildings[r.id] || 0) : null;
    const ok = st.ok && a && canWork(a, need);
    return `<div class="recipe ${st.maxed ? 'maxed' : ''}">
      <div class="r-icon">${r.icon}</div>
      <div class="r-body">
        <div class="r-name">${r.name} ${lvl !== null && r.max > 1 ? `<small>${lvl}/${r.max}</small>` : ''}${lvl !== null && r.max === 1 && lvl ? ' <small>✔ 보유</small>' : ''}</div>
        <div class="r-desc">${r.desc}</div>
        <div class="r-cost">${costHtml(r.cost)} <span class="cost ap">⏱ 행동 ${need}</span>${r.give ? ` → ${itemsText(r.give)}` : ''}</div>
        ${!st.ok && !st.maxed ? `<div class="r-why">${st.why}</div>` : ''}
      </div>
      <button class="btn act" ${ok ? '' : 'disabled'} onclick="G.craft('${r.id}')">${r.cat === 'build' ? '건설' : '제작'}</button>
    </div>`;
  };
  return `<div class="build">
    <div class="worker">작업자: ${chips}</div>
    ${a && a.trait === 'engineer' ? '<div class="tag good">🔧 박민규의 손재주: 모든 작업 행동력 -1</div>' : ''}
    ${rubble.length ? `<h4>잔해 치우기</h4>${rubble.map((r) => `<div class="recipe">
      <div class="r-icon">🪨</div>
      <div class="r-body"><div class="r-name">${r.name}</div><div class="r-desc">획득: ${itemsText(r.loot)}${r.unlocksRoof ? ' · <b>옥상 개방</b>' : ''}</div>
      <div class="r-cost"><span class="cost ap">⏱ 행동 ${r.ap}</span></div></div>
      <button class="btn act" ${a && canWork(a, r.ap) ? '' : 'disabled'} onclick="G.clearRubble('${r.id}')">치우기</button></div>`).join('')}` : ''}
    <h4>시설 건설</h4>
    ${RECIPES.filter((r) => r.cat === 'build').map(rec).join('')}
    <h4>제작</h4>
    ${RECIPES.filter((r) => r.cat === 'craft').map(rec).join('')}
  </div>`;
}

function renderInvTab() {
  const total = weightOf(S.inv);
  return `<div class="inv">
    <div class="inv-grid">
      ${ITEM_ORDER.map((k) => `<div class="inv-cell ${S.inv[k] ? '' : 'zero'}"><span class="ii">${ITEMS[k].icon}</span><span class="in">${ITEMS[k].name}</span><b>${S.inv[k] || 0}</b></div>`).join('')}
    </div>
    <p class="hint">창고 총 무게 ${total}. 수색 시 무기는 가장 좋은 것을 자동으로 챙기며, 남은 무기는 경계 근무자가 사용합니다.</p>
    <h4>시설 현황</h4>
    <div class="inv-grid">
      ${Object.entries(S.buildings).map(([k, v]) => `<div class="inv-cell ${v ? '' : 'zero'}"><span class="in">${BUILD_NAMES[k]}</span><b>${v}</b></div>`).join('')}
    </div>
  </div>`;
}

function renderLogTab() {
  return `<div class="logs">${S.log.map((l) => `<div class="log ${l.type}"><span class="ld">D${l.day}</span>${esc(l.msg)}</div>`).join('')}</div>`;
}

function renderDay() {
  const tabs = [['crew', '생존자'], ['build', '건설·제작'], ['inv', '창고'], ['log', '일지']];
  const body = S.tab === 'build' ? renderBuildTab() : S.tab === 'inv' ? renderInvTab() : S.tab === 'log' ? renderLogTab() : renderCrewTab();
  return `${renderHud()}
  <main class="day-main">
    ${renderShelter()}
    <aside class="panel">
      <nav class="tabs">${tabs.map(([k, n]) => `<button class="tab ${S.tab === k ? 'on' : ''}" onclick="G.tab('${k}')">${n}</button>`).join('')}</nav>
      <div class="panel-body">${body}</div>
    </aside>
  </main>
  <footer class="crewbar">
    <div class="crew-cards">
      ${crew().map((s) => `<div class="cc ${S.selected === s.id ? 'sel' : ''}" style="--c:${s.color}" onclick="G.select('${s.id}')">
        <div class="cc-top"><b>${s.name}</b>${apPips(s)}</div>
        <div class="cc-bars">
          <i style="--v:${s.health}%" class="hb" title="체력"></i>
          <i style="--v:${100 - s.hunger}%" class="fb" title="포만"></i>
          <i style="--v:${100 - s.thirst}%" class="wb" title="수분"></i>
          <i style="--v:${s.morale}%" class="mb" title="사기"></i>
        </div>
        <div class="cc-ic">${statusIcons(s)}</div>
      </div>`).join('')}
    </div>
    <button class="btn night-btn" onclick="G.openNight()">🌙 밤이 온다<small>야간 계획</small></button>
  </footer>`;
}

/* ---------- 수색 화면 ---------- */
function renderScav() {
  const sc = S.scav, def = scDef(), st = scLoc(), s = scSurv(), room = scRoom();
  const tl = timeLeft();
  const pw = weightOf(sc.pack);
  const roomsHtml = st.rooms.map((r, i) => {
    const icons = [];
    if (r.locked) icons.push('🔒');
    if (r.guard && sc.enemyAlive) icons.push('⚠');
    if (r.owned) icons.push('🏠');
    if (r.special === 'trader') icons.push('💰');
    if (r.special === 'wounded') icons.push('✚');
    if (r.special === 'helped') icons.push('🕊');
    const cnt = Object.values(r.loot).reduce((a, b) => a + b, 0);
    return `<div class="sroom ${i === sc.pos ? 'here' : ''} ${r.searched ? 'searched' : ''}">
      <div class="sr-name">${r.name}</div>
      <div class="sr-ic">${icons.join(' ')}</div>
      <div class="sr-loot">${r.searched ? (cnt ? `물자 ${cnt}` : '비었음') : '?'}</div>
      ${i === sc.pos ? `<div class="sr-me">${token(s, 'mini')}</div>` : ''}
    </div>${i < st.rooms.length - 1 ? '<div class="sr-link"></div>' : ''}`;
  }).join('');

  let roomBody = '';
  if (room.locked) roomBody = '<p class="hint">🔒 잠겨 있다. 조용히 따거나(시간 2, 소음 +1) 부숴서(시간 1, 소음 +4) 열 수 있다.</p>';
  else if (!room.searched) roomBody = '<p class="hint">아직 수색하지 않았다. 수색하면 시간 1이 지나고 소음이 생긴다.</p>';
  else if (room.closed) roomBody = '<p class="hint">노부부에게 물러나기로 했다. 이 방의 물건에는 손대지 않는다.</p>';
  else {
    const keys = ITEM_ORDER.filter((k) => room.loot[k] > 0);
    roomBody = keys.length ? `<div class="items">${keys.map((k) => `<button class="item" onclick="G.scPick('${k}')" title="${ITEMS[k].name} (무게 ${ITEMS[k].w})">${ITEMS[k].icon}<b>${room.loot[k]}</b><small>${ITEMS[k].name}</small></button>`).join('')}</div>`
      : '<p class="hint">남은 물건이 없다.</p>';
    if (room.owned && !room.closed) roomBody += '<p class="tag warn">🏠 누군가의 집이다. 여기서 가져가는 물건은 「도둑질」이 된다.</p>';
  }
  if (room.special === 'wounded') {
    roomBody += `<div class="special"><p>✚ 다리를 다친 남자가 신음하고 있다. "약… 아니면 붕대라도…"</p>
      <div class="btnrow">
        <button class="btn act" ${sc.pack.bandage ? '' : 'disabled'} onclick="G.scHelp('bandage')">🩹 붕대를 준다</button>
        <button class="btn act" ${sc.pack.medicine ? '' : 'disabled'} onclick="G.scHelp('medicine')">💊 의약품을 준다</button>
      </div><small>배낭에 있는 물건만 줄 수 있다.</small></div>`;
  }
  if (room.special === 'trader') {
    roomBody += `<div class="special"><p>💰 천막 아래 랜턴 불빛. 무장한 상인이 턱짓을 한다. "구경은 공짜야."</p>
      <button class="btn act" onclick="G.scTrade()">거래하기</button></div>`;
  }

  const packKeys = ITEM_ORDER.filter((k) => sc.pack[k] > 0);
  const noiseCls = sc.noise >= 6 ? 'bad' : sc.noise >= 3 ? 'warn' : 'good';
  return `<header class="hud scav-hud">
    <div class="logo">SA<small>야간 수색</small></div>
    <div class="hud-item"><b>${def.name}</b> <small>${def.sub}</small></div>
    <div class="hud-item">🕘 ${clockStr(sc.t)} <small>· 남은 시간 ${tl}h</small></div>
    <div class="hud-item ${noiseCls}">🔊 소음 <span class="noise">${'▮'.repeat(Math.round(sc.noise))}${'▯'.repeat(10 - Math.round(sc.noise))}</span></div>
    <div class="hud-item" style="--c:${s.color}">${s.name} ❤${s.health} 😓${s.fatigue}</div>
    <div class="hud-item">${sc.weapon ? `${ITEMS[sc.weapon].icon} ${ITEMS[sc.weapon].name}${WEAPONS[sc.weapon].gun ? ` · 탄 ${sc.ammo}` : ''}` : '✊ 맨손'}</div>
  </header>
  <main class="scav-main">
    <div class="scav-desc">${def.desc} ${sc.enemyAlive && def.enemy ? `<span class="tag bad">위험: ${def.enemy.name}</span>` : def.enemy ? '<span class="tag good">위협 제거됨</span>' : '<span class="tag good">적 없음</span>'}</div>
    <div class="srooms">${roomsHtml}</div>
    <div class="scav-body">
      <div class="box">
        <h4>📍 ${room.name}</h4>
        ${roomBody}
      </div>
      <div class="box">
        <h4>🎒 배낭 <small>${pw}/${sc.cap}</small></h4>
        <div class="wbar"><div style="width:${(pw / sc.cap) * 100}%"></div></div>
        ${packKeys.length ? `<div class="items">${packKeys.map((k) => `<button class="item" onclick="G.scDrop('${k}')" title="내려놓기">${ITEMS[k].icon}<b>${sc.pack[k]}</b><small>${ITEMS[k].name}</small></button>`).join('')}</div>` : '<p class="hint">비어 있다. 방의 물건을 클릭해 담는다.</p>'}
        <p class="hint">배낭의 물건을 클릭하면 이 방에 내려놓는다.</p>
      </div>
      <div class="box slog">
        <h4>기록</h4>
        ${sc.msgs.map((x) => `<div class="log ${x.type}">${esc(x.m)}</div>`).join('')}
      </div>
    </div>
    <div class="scav-actions">
      <button class="btn act" ${sc.pos > 0 && tl >= 1 ? '' : 'disabled'} onclick="G.scMove(-1)">◀ 이전 구역 <small>1h</small></button>
      <button class="btn act primary" ${!room.searched && !room.locked && tl >= 1 ? '' : 'disabled'} onclick="G.scSearch()">🔦 수색 <small>1h</small></button>
      ${room.locked ? `<button class="btn act" ${tl >= 2 ? '' : 'disabled'} onclick="G.scUnlock('quiet')">🗝 조용히 따기 <small>2h</small></button>
      <button class="btn act" ${tl >= 1 ? '' : 'disabled'} onclick="G.scUnlock('force')">💥 부수기 <small>1h</small></button>` : ''}
      <button class="btn act" ${sc.pos < st.rooms.length - 1 && tl >= 1 ? '' : 'disabled'} onclick="G.scMove(1)">다음 구역 ▶ <small>1h</small></button>
      <div class="hud-spacer"></div>
      <button class="btn act danger" onclick="G.scLeave()">🏠 귀환</button>
    </div>
  </main>`;
}

/* ---------- 엔딩 ---------- */
const EPILOGUE = {
  taeho: ['총을 내려놓고 고향의 과수원으로 돌아갔다.', '살아남았지만, 밤마다 조준경 너머의 얼굴들을 본다.'],
  seojin: ['도시에 새로 문을 연 병원에서 다시 흰 가운을 입었다.', '피 냄새를 견디지 못해 다시는 병원에 들어가지 못했다.'],
  mingyu: ['폐허가 된 거리에 작은 수리점을 열었다. 고치지 못하는 건 없다고 한다.', '보급창고에서 잃은 동료들의 이름을 매일 밤 되뇐다.'],
  sora: ['구호단체의 길잡이가 되어 실종자들을 찾아 나섰다.', '어디에도 머물지 못하고 또다시 길을 떠났다.'],
  doyun: ['거리 공연을 시작했다. 그의 노래는 전쟁을 기억하는 노래가 되었다.', '기타 줄을 갈지 않은 채 오랫동안 연주하지 않았다.'],
};
function renderEnding() {
  const win = S.ending === 'win';
  const fates = S.survivors.map((s) => {
    let t, cls;
    if (!s.alive) { t = `${s.name}은(는) 휴전을 보지 못했다.`; cls = 'dead'; }
    else if (s.gone) { t = `${s.name}의 행방은 아무도 모른다.`; cls = 'gone'; }
    else if (s.morale >= 45 && s.health >= 40) { t = `${s.name}은(는) 살아남았다. ${EPILOGUE[s.id][0]}`; cls = 'good'; }
    else { t = `${s.name}은(는) 살아남았다. ${EPILOGUE[s.id][1]}`; cls = 'bad'; }
    return `<div class="fate ${cls}" style="--c:${s.color}"><div class="fig"><div class="head"></div><div class="torso"></div><div class="legs"></div></div><p>${t}</p></div>`;
  }).join('');
  const st = S.stats;
  return `<div class="ending ${win ? 'win' : 'lose'}">
    <h1>${win ? '휴전' : '침묵'}</h1>
    <p class="end-lead">${win
      ? `${S.day}일째 아침, 무전기에서, 거리의 확성기에서 같은 말이 흘러나왔다. "모든 교전을 중단한다." 총성이 멎은 도시에 처음으로 새소리가 들렸다.`
      : `${S.day}일째. 은신처에는 더 이상 아무도 남지 않았다. 도시는 여전히 불타고 있다.`}</p>
    <div class="fates">${fates}</div>
    <div class="end-stats">
      <span>수색 ${st.scavs}회</span><span>살상 ${st.kills}</span><span>도둑질 ${st.stolen}</span>
      <span>도움 ${st.helped}</span><span>습격 ${st.raids}회 (격퇴 ${st.repelled})</span><span>사망 ${st.deaths}</span>
    </div>
    <button class="btn big primary" onclick="G.restart()">새 게임</button>
    <button class="btn big" onclick="S=null;render()">타이틀로</button>
  </div>`;
}

/* ---------- 모달 ---------- */
function renderModal() {
  const box = $('#modal');
  const m = S && S.modals && S.modals[0];
  if (!m) { box.className = ''; box.innerHTML = ''; return; }
  box.className = 'show';
  let h = '';
  switch (m.type) {
    case 'intro': h = modalIntro(); break;
    case 'help': h = modalHelp(); break;
    case 'night': h = modalNight(); break;
    case 'encounter': h = modalEncounter(m); break;
    case 'scavEnd': h = modalScavEnd(); break;
    case 'trade': h = modalTrade(m); break;
    case 'report': h = modalReport(m); break;
    case 'event': h = modalEvent(m); break;
    case 'confirm': h = `<div class="mbox"><p class="mtext">${esc(m.text)}</p><div class="mbtns"><button class="btn" onclick="G.closeModal()">취소</button><button class="btn primary" onclick="G.confirmYes()">확인</button></div></div>`; break;
    case 'eventResult': h = `<div class="mbox"><h2>${m.title}</h2><p class="mtext">${esc(m.text)}</p><div class="mbtns"><button class="btn primary" onclick="G.closeModal()">확인</button></div></div>`; break;
  }
  box.innerHTML = h;
}

function modalIntro() {
  return `<div class="mbox wide story">
    <h2>프롤로그</h2>
    <p class="mtext">용병 기업들의 전쟁이 도시를 집어삼킨 지 넉 달.
정규군도, 계약 용병들도 하나둘 철수했다. 남겨진 것은 폐허와, 떠나지 못한 사람들뿐이다.

계약이 끝난 저격수 <b>강태호</b>, 야전병원의 의무병 <b>윤서진</b>, 제3보급창고의 정비병 <b>박민규</b>.
세 사람은 무너진 건물 하나에 몸을 숨겼다.

라디오에서는 휴전 협상 소식이 간간이 들린다. <b>${CEASEFIRE_DAY}일</b>. 그때까지 살아남아야 한다.</p>
    <div class="howto">
      <div><b>☀ 낮</b> 생존자를 선택해 먹이고, 쉬게 하고, 시설을 짓고, 잔해를 치우세요. 각자 하루 행동력 3.</div>
      <div><b>🌙 밤</b> 누구는 자고, 누구는 경계를 서고, 한 명은 어둠 속으로 물자를 찾으러 나갑니다.</div>
      <div><b>🔦 수색</b> 시간·소음·배낭 공간을 관리하세요. 소음이 커질수록 적과 마주칠 확률이 오릅니다.</div>
      <div><b>⚖ 선택</b> 살아남기 위해 무엇을 할 것인가. 훔치고 죽이는 일은 마음에 상처를 남깁니다.</div>
    </div>
    <div class="mbtns"><button class="btn primary big" onclick="G.closeModal()">첫째 날을 시작한다</button></div>
  </div>`;
}
function modalHelp() {
  return `<div class="mbox wide">
    <h2>게임 방법</h2>
    <div class="help">
      <h4>목표</h4><p>${CEASEFIRE_DAY}일째 아침 휴전 발표까지 한 명이라도 살아남으면 승리. 모두 죽거나 떠나면 패배.</p>
      <h4>생존자 상태</h4>
      <p><b>체력</b> 0이 되면 사망. 침대에서 자고 잘 먹으면 회복. <b>허기·갈증</b> 매일 밤 증가, 75 이상이면 체력과 사기가 깎임.
      <b>피로</b> 행동·수색·경계로 증가, 90 이상이면 휴식만 가능. <b>사기</b> 35 미만이면 행동력 -1, 15 미만이면 아무것도 하지 않음, 0으로 이틀 버티면 은신처를 떠남.</p>
      <h4>낮</h4><p>잔해를 치워 재료를 얻고(🪨 클릭), 건설·제작 탭에서 시설을 지으세요. 의무병은 치료 2배, 정비병은 작업 행동력 -1.</p>
      <h4>밤</h4><p>침대 수(없으면 바닥 취침), 경계(약탈 방어), 수색(한 명) 중 하나를 배정. 바리케이드·경계 근무자·무기가 약탈을 막습니다. 무전기가 있으면 약탈 경보를 미리 받을 수 있습니다.</p>
      <h4>수색</h4><p>21:00부터 06:00까지 9시간. 이동·수색 1시간, 잠긴 문 1~2시간. 소음이 높을수록 적 조우 확률 증가. 적과 마주치면 교전·도주·은신(·협상) 중 선택.</p>
      <h4>지역</h4><p>웨어하우스(재료) · 프로방스(민간인, 적 없음) · 드래곤로드(암시장) · 크로스포트(${LOCATIONS[3].unlockDay}일~, 연료) · 제3보급창고(${LOCATIONS[4].unlockDay}일~, 무기·의약품, 매우 위험)</p>
      <h4>겨울</h4><p>${WINTER_DAY}일차부터 혹한. 난로에 연료나 목재를 태우지 않으면 병에 걸리기 쉽고 사기가 떨어집니다.</p>
    </div>
    <div class="mbtns"><button class="btn primary" onclick="G.closeModal()">닫기</button></div>
  </div>`;
}

function cityMap() {
  const locs = unlockedLocs();
  const sel = S.plan.loc;
  const lines = locs.map((l) => `<line x1="50" y1="46" x2="${l.x}" y2="${l.y}" class="mline ${sel === l.id ? 'on' : ''}"/>`).join('');
  const nodes = LOCATIONS.map((l) => {
    const open = S.day >= l.unlockDay;
    const left = locLootLeft(l.id);
    return `<g class="mnode ${open ? '' : 'closed'} ${sel === l.id ? 'on' : ''}" ${open ? `onclick="G.setLoc('${l.id}')"` : ''} transform="translate(${l.x},${l.y})">
      <circle r="${sel === l.id ? 4.2 : 3.4}"/>
      <text y="-5.5" text-anchor="middle">${open ? l.name : '???'}</text>
      <text y="8.5" text-anchor="middle" class="msub">${open ? `위험 ${dangerText(l.danger)}` : `${l.unlockDay}일차 해금`}${open && left !== null ? ` · 물자 ${left}` : ''}</text>
    </g>`;
  }).join('');
  return `<svg class="citymap" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
    <defs><pattern id="grid" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M6 0H0V6" fill="none" stroke="#2a3324" stroke-width="0.3"/></pattern></defs>
    <rect width="100" height="100" fill="url(#grid)"/>
    <path d="M60 0 C55 25 70 40 62 55 S70 85 95 100" class="river"/>
    <path d="M0 62 L100 48" class="road"/><path d="M38 0 L45 100" class="road"/>
    ${lines}
    <g transform="translate(50,46)" class="mhome"><rect x="-3" y="-3" width="6" height="6"/><text y="9" text-anchor="middle">은신처</text></g>
    ${nodes}
  </svg>`;
}

function modalNight() {
  const a = S.plan.assign;
  const bedsUsed = Object.values(a).filter((v) => v === 'bed').length;
  const opts = [['bed', '🛏 침대'], ['floor', '🧎 바닥'], ['guard', '🔦 경계'], ['scav', '🎒 수색']];
  const scav = Object.keys(a).find((k) => a[k] === 'scav');
  const loc = S.plan.loc && LOCATIONS.find((l) => l.id === S.plan.loc);
  const rows = crew().map((s) => `<div class="nrow">
    <span class="nname" style="--c:${s.color}">${s.name} <small>❤${s.health} 😓${s.fatigue}${s.sick ? ' 🤒' : ''}</small></span>
    <div class="nopts">${opts.map(([k, n]) => `<button class="nopt ${a[s.id] === k ? 'on' : ''}" ${k === 'bed' && !S.buildings.bed ? 'disabled' : ''} onclick="G.setNight('${s.id}','${k}')">${n}</button>`).join('')}</div>
  </div>`).join('');
  const guards = Object.values(a).filter((v) => v === 'guard').length;
  return `<div class="mbox wide night">
    <h2>🌙 ${S.day}일차 밤</h2>
    <p class="mtext small">침대 ${bedsUsed}/${S.buildings.bed} · 경계 ${guards}명 · 바리케이드 ${S.buildings.barricade}단계${S.radioForecast ? ` · 📻 ${S.radioForecast === 'high' ? '<b class="bad">약탈 경보</b>' : '<b class="good">비교적 안전</b>'}` : ''}${S.protectedUntil >= S.day ? ' · 🛡 순찰대 보호' : ''}</p>
    <div class="nrows">${rows}</div>
    ${scav ? `<div class="nmap">
      <div class="nmap-l">${cityMap()}</div>
      <div class="nmap-r">${loc ? `<h3>${loc.name}</h3><div class="msub2">${loc.sub} · 위험도 ${dangerText(loc.danger)}</div><p>${loc.desc}</p>
        ${S.locs[loc.id] ? `<p class="hint">방문 ${S.locs[loc.id].visits}회 · 확인된 남은 물자 약 ${locLootLeft(loc.id)}</p>` : '<p class="hint">아직 가 본 적 없는 곳.</p>'}
        <p class="hint">${sv(scav).name}의 배낭 ${12 + (sv(scav).trait === 'scout' ? 4 : 0)}칸</p>`
        : '<p class="hint">지도에서 수색할 지역을 고르세요.</p>'}</div>
    </div>` : '<p class="hint">수색을 보내지 않으면 다른 사람들이 푹 쉴 수 있지만, 물자는 줄어들기만 합니다.</p>'}
    <div class="mbtns">
      <button class="btn" onclick="S.plan=null;G.closeModal()">돌아가기</button>
      <button class="btn primary" onclick="G.startNight()">밤을 맞이한다</button>
    </div>
  </div>`;
}

function modalEncounter(m) {
  const s = scSurv(), sc = S.scav, def = scDef();
  if (m.kind === 'owner') {
    return `<div class="mbox enc">
      <h2>🏠 집주인이 깨어났다</h2>
      <p class="mtext">삐걱, 문이 열리고 등불이 비친다. 허리가 굽은 할머니와 할아버지가 떨며 서 있다.
"제발… 우리한테 남은 건 그게 전부라우. 약도, 영감 약이야…"</p>
      <div class="mbtns col">
        <button class="btn" onclick="G.encounter('apologize')">🙇 사과하고 물러난다 <small>이 방에서 챙긴 물건을 돌려놓는다</small></button>
        <button class="btn danger" onclick="G.encounter('ignore')">🫥 외면하고 챙긴다 <small>사기에 큰 타격</small></button>
      </div>
    </div>`;
  }
  const e = def.enemy;
  const ep = e.power + (m.ambushed ? 1 : 0);
  const canBribe = e.negotiable && valueOf(sc.pack) >= 8;
  return `<div class="mbox enc">
    <h2>⚠ 조우 — ${e.name}</h2>
    <p class="mtext">${m.ambushed ? '숨을 곳이 없다. 놈들이 총구를 들이댄다!' : m.forced ? `${scRoom().name}에 무장한 ${e.name}이(가) 지키고 서 있다.` : `발소리. 손전등 불빛. ${e.name}이(가) 이쪽으로 다가온다.`}</p>
    <p class="hint">${s.name} 전투력 ${fightPower(s, sc.weapon, sc.ammo).toFixed(1)} vs 적 ${ep.toFixed(1)}</p>
    <div class="mbtns col">
      <button class="btn danger" onclick="G.encounter('fight')">⚔ 교전 <b>${pct(winChance(s, sc.weapon, sc.ammo, ep))}</b><small>패배 시 큰 부상, 배낭 절반 손실</small></button>
      <button class="btn" onclick="G.encounter('flee')">🏃 도주 <b>${pct(fleeChance(s))}</b><small>성공해도 오늘 수색 종료</small></button>
      ${m.noHide ? '' : `<button class="btn" onclick="G.encounter('hide')">🤫 숨는다 <b>${pct(hideChance(s))}</b><small>실패 시 불리한 교전</small></button>`}
      ${e.negotiable ? `<button class="btn" ${canBribe ? '' : 'disabled'} onclick="G.encounter('bribe')">💬 협상 <b>100%</b><small>배낭에서 가치 8 이상의 물건을 넘긴다</small></button>` : ''}
    </div>
  </div>`;
}

function modalScavEnd() {
  const sc = S.scav, s = scSurv();
  const why = { dawn: '동이 트기 시작한다. 더 늦기 전에 돌아가야 한다.', leave: '충분하다. 은신처로 돌아간다.', fled: '정신없이 도망쳐 은신처로 향했다.', beaten: '피를 흘리며 간신히 은신처로 기어 돌아갔다.', died: `${s.name}의 무전이 끊겼다.` }[sc.endReason];
  return `<div class="mbox">
    <h2>${sc.died ? '☠ 귀환 실패' : '🏠 귀환'}</h2>
    <p class="mtext">${why}</p>
    ${sc.died ? '' : `<p>가져온 물자: <b>${itemsText(sc.pack)}</b></p>`}
    <div class="mbtns"><button class="btn primary" onclick="S.modals.shift();resolveNight()">아침을 맞이한다</button></div>
  </div>`;
}

function modalTrade(m) {
  const src = tradeSrc(m), stock = tradeStock(m);
  const ev = tradeEval(m);
  const col = (side, pool, bag) => ITEM_ORDER.filter((k) => pool[k] > 0).map((k) => `<div class="trow">
      <span>${ITEMS[k].icon} ${ITEMS[k].name} <small>×${pool[k]} · 가치 ${side === 'ask' ? Math.ceil(ITEMS[k].val * m.markup) : ITEMS[k].val}</small></span>
      <span class="tctl"><button onclick="G.tradeAdj('${side}','${k}',-1)">−</button><b>${bag[k] || 0}</b><button onclick="G.tradeAdj('${side}','${k}',1)">＋</button></span>
    </div>`).join('') || '<p class="hint">없음</p>';
  return `<div class="mbox wide trade">
    <h2>💰 ${m.title}</h2>
    <div class="tcols">
      <div><h4>내 물건 (${m.src === 'pack' ? '배낭' : '창고'})</h4>${col('offer', src, m.offer)}</div>
      <div><h4>상인 물건</h4>${col('ask', stock, m.ask)}</div>
    </div>
    <div class="tsum ${ev.ok ? 'good' : 'bad'}">내가 주는 가치 <b>${ev.give}</b> ⇄ 받는 가치 <b>${ev.get}</b>${ev.weightOk ? '' : ' · 배낭 공간 부족'}</div>
    <div class="mbtns">
      <button class="btn" onclick="G.closeModal()">그만두기</button>
      <button class="btn primary" ${ev.ok ? '' : 'disabled'} onclick="G.tradeDo()">거래</button>
    </div>
  </div>`;
}

function modalReport(m) {
  return `<div class="mbox wide report">
    <h2>☀ ${S.day}일차 아침 <small>휴전까지 D-${CEASEFIRE_DAY - S.day}</small></h2>
    <div class="rlines">${m.lines.length ? m.lines.map((l) => `<div class="log ${l.t}">${esc(l.m)}</div>`).join('') : '<div class="log">특별한 일 없이 밤이 지나갔다.</div>'}</div>
    <div class="rcrew">${crew().map((s) => `<div class="rc" style="--c:${s.color}"><b>${s.name}</b> ❤${s.health} 🍽${hungerLabel(s.hunger)} 💧${thirstLabel(s.thirst)} ☺${moraleLabel(s.morale)}${s.sick ? ' 🤒' : ''}</div>`).join('')}</div>
    <div class="mbtns"><button class="btn primary" onclick="G.closeModal()">하루를 시작한다</button></div>
  </div>`;
}

function modalEvent(m) {
  const ev = m.ev;
  const who = ev.who ? SURVIVOR_DEFS[ev.who] : null;
  return `<div class="mbox event">
    <h2>${ev.title}</h2>
    ${who ? `<div class="evwho" style="--c:${who.color}"><div class="fig big"><div class="head"></div><div class="torso"></div><div class="legs"></div></div>
      <div><b>${who.name}</b> ${who.age}세 · ${who.role}<br><small>★ ${who.traitName} — ${who.traitDesc}</small></div></div>` : ''}
    <p class="mtext">${esc(ev.text)}</p>
    <div class="mbtns col">${ev.options.map((o, i) => `<button class="btn" ${o.cond && !o.cond() ? 'disabled' : ''} onclick="G.eventChoose(${i})">${o.label}</button>`).join('')}</div>
  </div>`;
}
