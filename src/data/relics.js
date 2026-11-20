// 유물(룬): 한 원정 동안 유지되는 패시브
export const RELICS = {
  drum: { name: '큰북', desc: '전투 시작 시 사기 +3', mod: m => { m.startMorale += 3; } },
  banner: { name: '장군기', desc: '배후 공격 피해 +50% → +80%', mod: m => { m.flank += 0.3; } },
  horseshoe: { name: '무쇠 편자', desc: '기마 무사 돌격 피해 +40%, 더 짧은 거리로 돌격 준비', mod: m => { m.chargeMult *= 1.4; m.chargeDist *= 0.7; } },
  grail: { name: '정화수 사발', desc: '정화 굿 회복량 +50%, 범위 +20%', mod: m => { m.grailHeal *= 1.5; m.grailR *= 1.2; } },
  firearrow: { name: '불화살', desc: '화살비 피해 +25%, 3초간 화상 부여', mod: m => { m.rainDmg *= 1.25; m.rainBurn = 12; } },
  goldhorn: { name: '금장 북채', desc: '진군의 북 비용 -1, 지속 +3초', mod: m => { m.hornCost += 1; m.hornDur += 3; } },
  band: { name: '풍물패', desc: '사기 회복 속도 +30%', mod: m => { m.moraleRate *= 1.3; } },
  plate: { name: '두정갑', desc: '근접 보병(환도 무사·등패수·창병·철퇴 장사) 체력 +20%', mod: m => { m.hpInf *= 1.2; } },
  feather: { name: '뿔 깍지', desc: '원거리 병종 사거리 +12%, 공격 속도 +12%', mod: m => { m.rangeMul *= 1.12; m.rangedAS *= 1.12; } },
  censer: { name: '약탕기', desc: '무녀·고승 치유량 +40%', mod: m => { m.priestHeal *= 1.4; } },
  crest: { name: '호랑이 가죽', desc: '영웅 체력 +30%, 영웅기 재사용 대기 -30%', mod: m => { m.heroHp *= 1.3; m.heroCd *= 0.7; } },
  sack: { name: '엽전 꾸러미', desc: '승리 시 엽전 +50%', mod: m => { m.gold *= 1.5; } },
  oath: { name: '결사의 맹세', desc: '병력이 절반 이하인 부대의 피해 +30%', mod: m => { m.lastStand += 0.3; } },
  vanguard: { name: '선봉 깃발', desc: '전투 시작 8초간 이동 속도 +30%, 피해 +15%', mod: m => { m.vanguard = 1; } },
  powder: { name: '화약 비법', desc: '도사·화차 폭발 범위 +25%', mod: m => { m.aoeR *= 1.25; } },
  amulet: { name: '수호 부적', desc: '전투 시작 시 모든 아군에게 보호막 80', mod: m => { m.startShield += 80; } },
};
for (const k of Object.keys(RELICS)) RELICS[k].id = k;
