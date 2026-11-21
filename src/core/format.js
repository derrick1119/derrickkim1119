// 숫자 표기. 길이는 cm 로 받아 cm / m / km 로 보여 준다.

function trim(n, digits) {
  return n.toFixed(digits);
}

/** 지름 표기: 42.5 cm, 3.42 m, 128 m, 1.25 km */
export function formatSize(cm) {
  if (!Number.isFinite(cm)) return '0 cm';
  if (cm < 100) return `${trim(cm, cm < 10 ? 2 : 1)} cm`;
  const m = cm / 100;
  if (m < 10) return `${trim(m, 2)} m`;
  if (m < 100) return `${trim(m, 1)} m`;
  if (m < 1000) return `${trim(m, 0)} m`;
  const km = m / 1000;
  return `${trim(km, km < 10 ? 2 : 1)} km`;
}

/** 성장량 표기. 아주 작은 값도 0 으로 보이지 않게 한다. */
export function formatGain(cm) {
  if (cm < 0.1) return `+${trim(cm, 2)} cm`;
  return `+${formatSize(cm)}`;
}

export function formatInt(n) {
  return Math.round(n).toLocaleString('en-US');
}

/** 확률 표기: 35%, 4.2%, 0.3% */
export function formatPercent(p) {
  const v = p * 100;
  if (v >= 10) return `${Math.round(v)}%`;
  if (v >= 1) return `${trim(v, 1).replace(/\.0$/, '')}%`;
  return `${trim(v, 1)}%`;
}

/** 시간 표기는 번역이 필요해서 [시, 분, 초] 로만 쪼갠다. */
export function splitDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
