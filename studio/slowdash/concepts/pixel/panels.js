// 아래 띠: 벤 직후 컷 · 얼굴 확대
function drawCut(cv){
  const b=new Buf(62,40);
  roofBarrel(b,0,40,(x,y)=>4.1+1.0*Math.exp(-(((x-28)**2)/(2*24*24)+((y-22)**2)/(2*18*18)))-0.8*Math.pow(Math.abs(x-31)/31,3),{vx:31,cw0:8,cw1:10,ch0:6,ch1:2,span:40});
  const p0=[-1,30], p1=[35,26];
  const yAt=x=>p0[1]+(x-p0[0])*(p1[1]-p0[1])/(p1[0]-p0[0]);
  // 주인공: 지나간 끝에서 '씩'
  const happy=sprite(HERO.map((r,i)=>FACE_HAPPY[i]||r),HERO_BLADE);
  shadow(b,46,36,10,2);
  draw(b,happy,31,11);
  // 반으로 갈린 병정
  const spr=SPR.sword, tlx=3, tly=14, Ww=spr[0].length, Hh=spr.length, mid=tlx+9;
  shadow(b,tlx+10,tly+20,8,2);
  for(let j=0;j<Hh;j++)for(let i=0;i<Ww;i++){
    let c=spr[j][i]; if(c==='.')continue;
    const x=tlx+i,y=tly+j; const up = y+0.5 < yAt(x+0.5);
    let ox=0, oy=0;
    if(up){ ox=2; oy=-5 + Math.round((x-mid)*0.3); } else { ox=-1; oy=1; }
    const nearCut = Math.abs((y+0.5)-yAt(x+0.5))<1.0;
    if(nearCut && c!=='k') c = (c==='1')?'4':'j';
    b.set(x+ox,y+oy,c);
  }
  // 칼빛 한 줄 (가늘게, 양끝은 흩어짐)
  line(p0[0],p0[1],p1[0],p1[1],(x,y,t)=>{
    if((t<0.12||t>0.9) && bay(x,y)>0.5) return;
    b.set(x,y,'w'); if(t>0.1 && t<0.9 && bay(x,y+1)<0.55) b.set(x,y+1,'T');
  });
  // 틈에서 톱니·스프링이 퐁
  draw(b,SPR.gear,21,9); draw(b,SPR.spring,25,19); draw(b,SPR.gear,-2,21);
  [[20,8],[29,10],[30,18],[3,19]].forEach(([x,y])=>b.set(x,y,'9'));
  draw(b,SPR.star,51,2);
  b.toCanvas(cv);
}
function drawFace(cv){
  const b=new Buf(62,40);
  for(let y=0;y<40;y++)for(let x=0;x<62;x++){
    const v=2.0+2.6*Math.exp(-(((x-21)**2)+((y-19)**2)*1.1)/(2*17*17));
    b.set(x,y,R(ditherIdx(v,x,y,3)));
  }
  for(let y=0;y<40;y++)for(let x=42;x<62;x++) b.set(x,y,'1');
  for(let y=0;y<40;y++) b.set(42,y,'0');
  for(let x=42;x<62;x++) b.set(x,20,'0');
  const crop=(spr,x0,y0,w,h)=>spr.slice(y0,y0+h).map(r=>r.slice(x0,x0+w));
  const head=crop(SPR.hero,7,0,20,17);
  for(let j=0;j<head.length;j++)for(let i=0;i<head[0].length;i++){const c=head[j][i]; if(c==='.')continue;
    for(let a=0;a<2;a++)for(let c2=0;c2<2;c2++) b.set(1+i*2+a,5+j*2+c2,c);}
  const happy=sprite(HERO.map((r,i)=>FACE_HAPPY[i]||r),HERO_BLADE), ouch=sprite(HERO.map((r,i)=>FACE_OUCH[i]||r),HERO_BLADE);
  draw(b,crop(happy,7,0,19,16),43,3);
  draw(b,crop(ouch,7,0,19,16),43,23);
  b.toCanvas(cv);
}
