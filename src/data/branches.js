// 병과 승급: 병력 패가 4단에 오르면 두 갈래 중 하나로 승급한다 (조선 무예서 『무예도보통지』의 무예에서 따왔다).
// 갈래를 고르면 그 패는 새 이름을 얻고, 부대의 싸우는 방식이 바뀐다.
//   arm : 그 갈래가 처음 드는 무기 (무기를 따로 끼우지 않았을 때. 무기의 효과도 함께 받는다)
//   mod : 병종 정의를 고친다 (무기 효과 뒤에 덧씌운다)
//   axis: 이 갈래가 키우는 빌드 축 (전리품·장터에서 이 축의 패가 더 자주 나온다)
// 새 효과 플래그 (sim/battle.js):
//   riposte : 근접으로 맞으면 그 확률로 되받아친다          rearK   : 배후를 칠 때 피해 배율
//   shieldK : 등패가 막는 정면 화살 피해 비율(낮을수록 단단)    bigK    : 거대 적에게 주는 피해 배율
//   braceStun: 정면 돌격을 받아치면 상대를 그만큼 기절시킨다    healHaste: 치유받은 아군의 공격 속도를 그만큼(초) 올린다
export const BRANCH_LV = 4;
export const BRANCHES = {
  sword: [
    { id: 'ssanggeom', name: '쌍검수', arm: 'twin', axis: 'charge', desc: '쌍검으로 몰아친다', tip: '공격 속도 +35%, 배후를 치면 피해 +60%, 이동 +10%', mod: d => { d.rearK = 1.6; d.spd *= 1.1; } },
    { id: 'bonguk', name: '본국검수', axis: 'wall', desc: '조선 고유의 검법', tip: '체력 +30%, 근접 피해 -20%, 맞으면 25% 확률로 되받아친다', mod: d => { d.hp *= 1.3; d.armor = Math.max(d.armor || 0, 0.2); d.riposte = 0.25; } },
  ],
  shield: [
    { id: 'cheolbyeok', name: '철벽 등패수', axis: 'wall', desc: '적을 끌어모아 버틴다', tip: '체력 +35%, 둘레의 적을 끌어모은다, 정면 화살 피해 -85%', mod: d => { d.hp *= 1.35; d.taunt = 70; d.shieldK = 0.15; } },
    { id: 'dolgyeok', name: '돌격 등패수', axis: 'charge', desc: '등패로 들이받는다', tip: '달려와 부딪히면 피해 2배와 함께 밀쳐 낸다, 이동 +20%', mod: d => { d.charge = { mult: 2, dist: 70, kb: 40 }; d.spd *= 1.2; } },
  ],
  spear: [
    { id: 'jangchang', name: '장창수', axis: 'wall', desc: '더 긴 창으로 막아선다', tip: '리치 +16, 거대 적 피해 2배, 정면 돌격을 받아치면 1.5초 기절', mod: d => { d.reach = (d.reach || 0) + 16; d.bigK = 2; d.braceStun = 1.5; } },
    { id: 'nangseon', name: '낭선수', axis: 'wall', desc: '가지 달린 대창으로 묶는다', tip: '한 번에 2명 타격, 맞은 적 2초간 속도 -40%', mod: d => { d.cleave = Math.max(d.cleave || 0, 2); d.slowHit = { amt: 0.4, t: 2 }; } },
  ],
  knight: [
    { id: 'gichang', name: '기창 돌격대', axis: 'charge', desc: '짧게 달려도 들이받는다', tip: '돌격 피해 5배, 더 멀리 밀쳐 내고, 짧은 거리에서도 돌격', mod: d => { d.charge = { mult: 5, dist: 80, kb: 50 }; } },
    { id: 'masang', name: '마상편곤수', arm: 'flail', axis: 'charge', desc: '말 위에서 편곤을 휘두른다', tip: '한 번에 3명 타격, 30% 확률로 1초 기절, 근접 피해 -15%', mod: d => { d.cleave = Math.max(d.cleave || 0, 3); d.stunHit = { p: 0.3, t: 1 }; d.armor = Math.max(d.armor || 0, 0.15); } },
  ],
  xbow: [
    { id: 'aegisal', name: '애기살 사수', axis: 'volley', desc: '통아로 짧은 화살을 멀리 쏜다', tip: '사거리 +30%, 방패를 꿰뚫는다', mod: d => { d.range *= 1.3; d.pierce = true; } },
    { id: 'yungnyang', name: '육량전 사수', axis: 'volley', desc: '무거운 화살을 쏜다', tip: '피해 +60%, 20% 확률로 0.6초 기절, 공격 속도 -20%', mod: d => { d.atk *= 1.6; d.as *= 1.2; d.stunHit = { p: 0.2, t: 0.6 }; } },
  ],
  wizard: [
    { id: 'binggyeol', name: '빙결 도사', arm: 'icetal', axis: 'talisman', desc: '얼음 부적으로 발을 묶는다', tip: '맞은 적 2.5초간 속도 -50%, 폭발 범위 +20%', mod: d => { d.aoe *= 1.2; d.slowHit = { amt: 0.5, t: 2.5 }; } },
    { id: 'sammae', name: '삼매 도사', axis: 'talisman', desc: '삼매진화로 불태운다', tip: '폭발 범위 +35%, 맞은 적 3초간 화상', mod: d => { d.aoe *= 1.35; d.burnHit = { t: 3, k: 0.5 }; } },
  ],
  priest: [
    { id: 'gutmu', name: '굿무녀', axis: 'gut', desc: '신명 나는 굿으로 북돋운다', tip: '치유받은 아군이 4초간 공격 속도 +30%, 치유량 +15%', mod: d => { d.healHaste = 4; d.heal *= 1.15; } },
    { id: 'sinnaerim', name: '신내림 무녀', arm: 'bells', axis: 'gut', desc: '신이 내려 여럿을 돌본다', tip: '한 번에 둘을 더 치유, 해로운 효과를 씻고 보호막', mod: d => { d.healN = (d.healN || 1) + 1; d.healCleanse = 30; } },
  ],
  cannon: [
    { id: 'singijeon', name: '신기전 화차', axis: 'powder', desc: '불화살을 흩뿌린다', tip: '공격 속도 +60%, 피해 -30%, 맞은 적 3초간 화상', mod: d => { d.as /= 1.6; d.atk *= 0.7; d.burnHit = { t: 3, k: 0.4 }; } },
    { id: 'chongtong', name: '총통 화차', axis: 'powder', desc: '큰 포탄을 쏜다', tip: '피해 +70%, 폭발 범위 +25%, 공격 속도 -25%', mod: d => { d.atk *= 1.7; d.aoe *= 1.25; d.as *= 1.25; } },
  ],
  berserk: [
    { id: 'dorikkae', name: '도리깨 장사', arm: 'thresher', axis: 'charge', desc: '쇠도리깨로 휩쓴다', tip: '한 번에 3명 타격, 30% 확률로 1초 기절', mod: d => { d.stunHit = { p: 0.3, t: 1 }; } },
    { id: 'cheolgap', name: '철갑 장사', axis: 'wall', desc: '쇠미늘 갑옷을 껴입었다', tip: '체력 +40%, 근접 피해 -25%, 이동 -10%', mod: d => { d.hp *= 1.4; d.armor = Math.max(d.armor || 0, 0.25); d.spd *= 0.9; } },
  ],
};
// 빌드 축: 패와 보물이 어느 방향으로 군대를 키우는지 (전리품·장터 표식과 가중치에 쓴다)
export const AXES = {
  volley: { name: '사격진', col: '#2f4d7e', sym: 'bow' },
  charge: { name: '돌격', col: '#b8382a', sym: 'horse' },
  wall: { name: '진지', col: '#5a5346', sym: 'shield' },
  powder: { name: '화약', col: '#c8642a', sym: 'cannon' },
  talisman: { name: '도술', col: '#5a4a8a', sym: 'flame' },
  gut: { name: '굿', col: '#2f6f5c', sym: 'support' },
  militia: { name: '의병', col: '#8a6a3a', sym: 'sword' },
};
const BY_ID = {}; for (const t of Object.keys(BRANCHES)) for (const b of BRANCHES[t]) { b.type = t; BY_ID[b.id] = b; }
export const branchOf = id => (id && BY_ID[id]) || null;
export const canBranch = (type, lv, br) => !br && !!BRANCHES[type] && (lv || 1) >= BRANCH_LV;
