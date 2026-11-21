// 기기 기능: 진동, 공유·복사, PWA 서비스 워커. 없는 기능은 조용히 건너뛴다.

const PATTERNS = {
  tap: 8,
  good: [10, 30, 14],
  warn: 18,
  spotted: [40, 50, 120],
  stamp: 30,
};

export class Haptics {
  constructor(on) {
    this.on = on;
    this.supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  }

  set(on) {
    this.on = on;
  }

  /** @param {keyof typeof PATTERNS} name */
  fire(name) {
    if (!this.on || !this.supported) return;
    try {
      navigator.vibrate(PATTERNS[name] ?? 8);
    } catch {
      /* 무시 */
    }
  }
}

/** 글을 클립보드에 넣는다. 반드시 클릭 핸들러 안에서 부른다. */
export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 아래 예비 방법으로 */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * 결과를 공유한다. 공유 시트가 없으면 복사로 대신한다.
 * @returns {Promise<'shared'|'copied'|'failed'>}
 */
export async function shareText(text) {
  try {
    if (navigator.share && window.top === window) {
      await navigator.share({ text });
      return 'shared';
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return 'shared'; // 사용자가 닫았다
  }
  return (await copyText(text)) ? 'copied' : 'failed';
}

/**
 * 서비스 워커를 등록해 오프라인에서도 열리게 한다.
 * 다른 페이지 안에 끼워진 경우(미리보기 등)와 로컬 개발 서버에서는 등록하지 않는다.
 * @param {() => void} onUpdate 새 버전이 받아졌을 때
 */
export function registerServiceWorker(onUpdate) {
  try {
    if (!('serviceWorker' in navigator)) return;
    if (window.top !== window) return;
    if (!/^https:$/.test(location.protocol)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => {
          reg.addEventListener('updatefound', () => {
            const worker = reg.installing;
            if (!worker) return;
            worker.addEventListener('statechange', () => {
              if (worker.state === 'installed' && navigator.serviceWorker.controller) onUpdate?.();
            });
          });
        })
        .catch(() => {});
    });
  } catch {
    /* 무시 */
  }
}

export const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
