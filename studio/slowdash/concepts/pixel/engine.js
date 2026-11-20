// 아주 작은 도트 엔진: 팔레트 글자 버퍼 → ImageData
const BAYER = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
const bay = (x,y)=> (BAYER[y&3][x&3]+0.5)/16;
const RAMP = '0123456789';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rgb(hex){return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];}
const PRGB = {}; for (const k in PAL) PRGB[k]=rgb(PAL[k]);
const lum = c => { const [r,g,b]=PRGB[c]; return 0.299*r+0.587*g+0.114*b; };
const RAMP_L = RAMP.split('').map(lum);
// 색 → 청회색 램프 (느린 시간)
const DESAT = {};
for (const k in PAL){
  if (RAMP.includes(k)) { DESAT[k]=k; continue; }
  const L = lum(k); let best=0,bd=1e9;
  RAMP_L.forEach((l,i)=>{const d=Math.abs(l-L*0.92); if(d<bd){bd=d;best=i;}});
  DESAT[k]=RAMP[clamp(best,1,8)];
}
DESAT.k='0'; DESAT['0']='0';

class Buf{
  constructor(w,h){this.w=w;this.h=h;this.d=new Array(w*h).fill(null);}
  set(x,y,c){x|=0;y|=0;if(x<0||y<0||x>=this.w||y>=this.h||!c)return;this.d[y*this.w+x]=c;}
  get(x,y){x|=0;y|=0;if(x<0||y<0||x>=this.w||y>=this.h)return null;return this.d[y*this.w+x];}
  shade(x,y,dv){const c=this.get(x,y); if(c==null)return; const i=RAMP.indexOf(c); if(i<0)return; this.set(x,y,RAMP[clamp(i+dv,0,9)]);}
  toCanvas(cv){cv.width=this.w;cv.height=this.h;const ctx=cv.getContext('2d');const im=ctx.createImageData(this.w,this.h);
    for(let i=0;i<this.d.length;i++){const c=this.d[i]||'0';const [r,g,b]=PRGB[c];im.data[i*4]=r;im.data[i*4+1]=g;im.data[i*4+2]=b;im.data[i*4+3]=255;}
    ctx.putImageData(im,0,0);}
}
const ditherIdx=(v,x,y,sharp=2.2)=>{const f=Math.floor(v);const fr=v-f;const s=clamp((fr-0.5)*sharp+0.5,0,1);return f+(s>bay(x,y)?1:0);};

// 문자열 맵 → 2차원 배열 (+1 여백, 자동 외곽선)
function sprite(rows, dots=[], over=[]){
  const W=Math.max(...rows.map(r=>r.length)), H=rows.length;
  const g=[]; for(let y=0;y<H+2;y++){g.push(new Array(W+2).fill('.'));}
  rows.forEach((r,y)=>{for(let x=0;x<r.length;x++) if(r[x]!=='.') g[y+1][x+1]=r[x];});
  over.forEach(o=>o.forEach((r,y)=>{for(let x=0;x<r.length;x++) if(r[x]!=='.') g[y+1][x+1]=r[x];}));
  dots.forEach(([x,y,c])=>{g[y+1][x+1]=c;});
  const out=g.map(r=>r.slice());
  for(let y=0;y<H+2;y++)for(let x=0;x<W+2;x++){
    if(g[y][x]!=='.')continue;
    const n=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>{const v=(g[y+dy]||[])[x+dx];return v&&v!=='.'&&v!=='k';});
    if(n) out[y][x]='k';
  }
  return out;
}
function draw(buf, spr, x, y, opt={}){
  const H=spr.length, W=spr[0].length;
  for(let j=0;j<H;j++)for(let i=0;i<W;i++){
    let c=spr[j][opt.flip?W-1-i:i]; if(c==='.')continue;
    if(opt.desat) c=DESAT[c];
    if(opt.clip && !opt.clip(i,j)) continue;
    const ox = opt.off? opt.off(i,j) : [0,0];
    buf.set(x+i+ox[0], y+j+ox[1], c);
  }
}
function line(x0,y0,x1,y1,fn){
  x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
  const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let e=dx+dy;let i=0;
  const n=Math.max(dx,-dy);
  for(;;){fn(x0,y0,n?i/n:0);i++;if(x0===x1&&y0===y1)break;const e2=2*e;if(e2>=dy){e+=dy;x0+=sx;}if(e2<=dx){e+=dx;y0+=sy;}}
}
function rng(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
