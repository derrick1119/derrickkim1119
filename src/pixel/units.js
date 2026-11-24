// (자리표시) 도트 인형은 따로 만드는 중: 다 되기 전에는 예전 그림으로 돌아간다
import { GFX } from './gfx.js';
GFX.pixel = false;
export function pxUnit() { throw new Error('pixel units not ready'); }
export const pxFlip = s => s;
