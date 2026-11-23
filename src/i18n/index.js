// 문구 조회. t('report.title'), t('hud.gen', { n: 3 })
import ko from './ko.js';
import en from './en.js';

const PACKS = { ko, en };

/**
 * 기능 모듈이 자기 문구를 더한다. registerStrings('goals', { ko: {...}, en: {...} }) → t('goals.xxx')
 * 두 언어의 키 구조가 같아야 한다(tests/i18n.test.js 가 검사한다).
 */
export const EXTRA = {};
export function registerStrings(ns, packs) {
  EXTRA[ns] = packs;
  for (const lang of Object.keys(PACKS)) {
    if (packs[lang]) PACKS[lang][ns] = { ...(PACKS[lang][ns] || {}), ...packs[lang] };
  }
}
export const LANGS = [
  { id: 'ko', label: '한국어' },
  { id: 'en', label: 'English' },
];

let current = 'ko';

export function detectLang() {
  const nav = typeof navigator !== 'undefined' ? navigator.language || '' : '';
  return nav.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

export function setLang(lang) {
  current = PACKS[lang] ? lang : 'ko';
  if (typeof document !== 'undefined') document.documentElement.lang = current;
  return current;
}

export const getLang = () => current;

function lookup(pack, key) {
  let node = pack;
  for (const part of key.split('.')) {
    if (node == null) return undefined;
    node = node[part];
  }
  return node;
}

const BATCHIM_PAIRS = {
  '(이)가': ['이', '가'],
  '(으)로': ['으로', '로'],
  '을(를)': ['을', '를'],
  '은(는)': ['은', '는'],
  '와(과)': ['과', '와'],
};
const JOSA_RE = /([\s\S])([」”’)\]]*)(\(이\)가|\(으\)로|을\(를\)|은\(는\)|와\(과\))/g;

/** 앞 글자의 받침에 맞춰 조사를 고른다. 한글이 아니면 받침 없는 쪽으로 쓴다. */
export function resolveJosa(text) {
  return text.replace(JOSA_RE, (_, ch, closers, josa) => {
    const [withBatchim, without] = BATCHIM_PAIRS[josa];
    const code = ch.charCodeAt(0);
    let pick = without;
    if (code >= 0xac00 && code <= 0xd7a3) {
      const jong = (code - 0xac00) % 28;
      // '(으)로' 는 ㄹ 받침 뒤에서도 '로' 가 된다.
      pick = jong === 0 || (josa === '(으)로' && jong === 8) ? without : withBatchim;
    } else if (/[0-9]/.test(ch)) {
      // 숫자는 읽는 소리로 받침을 따진다: 0(영) 1(일) 3(삼) 6(육) 7(칠) 8(팔)
      const hasBatchim = '013678'.includes(ch);
      pick = hasBatchim && !(josa === '(으)로' && '178'.includes(ch)) ? withBatchim : without;
    }
    return ch + closers + pick;
  });
}

function fill(str, params) {
  const out = params ? str.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)) : str;
  return current === 'ko' ? resolveJosa(out) : out;
}

/** 문구 하나. 없는 키는 한국어 → 키 이름 순으로 대신한다. */
export function t(key, params) {
  let v = lookup(PACKS[current], key);
  if (typeof v !== 'string') v = lookup(PACKS.ko, key);
  if (typeof v !== 'string') return key;
  return fill(v, params);
}

/** 문구 목록(대사·팁처럼 여러 줄인 것). */
export function tList(key) {
  let v = lookup(PACKS[current], key);
  if (!Array.isArray(v)) v = lookup(PACKS.ko, key);
  return Array.isArray(v) ? v.map((s) => fill(s)) : [];
}

export function tPick(key, rng = Math.random) {
  const list = tList(key);
  return list.length ? list[Math.floor(rng() * list.length)] : '';
}

/** 초 → '2시간 5분' / '2h 5m'. 가장 큰 두 단위만 보여 준다. */
export function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const u = (k) => t(`unit.${k}`);
  if (h > 0) return m > 0 ? `${h}${u('h')} ${m}${u('m')}` : `${h}${u('h')}`;
  if (m > 0) return sec > 0 && m < 10 ? `${m}${u('m')} ${sec}${u('s')}` : `${m}${u('m')}`;
  return `${sec}${u('s')}`;
}
