// 본 장면: 느린 시간 중, 꺾인 획이 태엽 병정 셋을 꿰기 직전 (130×198 논리 픽셀, ×3 확대)
const W=130, H=198;
const R = i => RAMP[clamp(i,0,9)];
const SPR = {
  hero: sprite(HERO, HERO_BLADE),
  sword: sprite(SOLDIER_BODY, ARM_SWORD, [HAT_SWORD, KEY]),
  bow: sprite(SOLDIER_BODY, ARM_BOW, [HAT_BOW, KEY]),
  shield: sprite(SOLDIER_BODY, ARM_SHIELD, [HAT_SHIELD, KEY]),
  gear: sprite(GEAR), spring: sprite(SPRING), star: sprite(STAR), starE: sprite(STAR_EMPTY), clock: sprite(CLOCK_ICON),
};
const MOON={x:101,y:25,r:10};
const RIDGE=66;

function sky(b, h, moon=MOON){
  for(let y=0;y<h;y++)for(let x=0;x<W;x++){
    let v=0.9+(y/h)*3.5;
    const d=Math.hypot(x-moon.x,(y-moon.y)*1.15);
    v+=2.6*Math.pow(Math.max(0,1-d/42),1.7);
    b.set(x,y,R(ditherIdx(v,x,y,3.4)));
  }
}
function stars(b){
  const r=rng(7);
  for(let i=0;i<70;i++){
    const x=Math.floor(r()*W), y=Math.floor(r()*52), br=r();
    if(Math.hypot(x-MOON.x,y-MOON.y)<26) continue;
    if(y<11 && (x<70||x>100)) continue; // HUD 자리 비우기
    b.set(x,y, br>0.9?'8':br>0.6?'6':'5');
    if(br>0.95){b.set(x-1,y,'5');b.set(x+1,y,'5');b.set(x,y-1,'5');b.set(x,y+1,'5');}
  }
}
function moon(b, m=MOON){
  for(let y=m.y-m.r-2;y<=m.y+m.r+2;y++)for(let x=m.x-m.r-2;x<=m.x+m.r+2;x++){
    const d=Math.hypot(x-m.x,y-m.y);
    if(d<=m.r){
      let c='9';
      const lx=(x-m.x)/m.r, ly=(y-m.y)/m.r;
      if(lx+ly>0.95 && d>m.r-2.2) c='8';
      b.set(x,y,c);
    } else if(d<=m.r+1.2 && bay(x,y)<0.5) b.set(x,y,'7');
  }
  // 크레이터
  [[-3,-2],[-2,-2],[-3,-3],[3,2],[4,2],[2,4],[-4,4],[1,-5],[2,-5]].forEach(([dx,dy])=>b.set(m.x+dx,m.y+dy,'8'));
}
function clouds(b, list, light){
  const inC=(x,y)=>list.some(([cx,cy,rx,ry])=>((x-cx)/rx)**2+((y-cy)/ry)**2<=1);
  for(let y=0;y<RIDGE;y++)for(let x=0;x<W;x++){
    if(!inC(x,y))continue;
    const near=Math.max(0,1-Math.hypot(x-light.x,y-light.y)/40);
    let v=2.6+near*2.4;
    if(!inC(x,y-1)) v+=1.4; else if(!inC(x,y-2)) v+=0.6;
    if(!inC(x,y+1)) v-=0.6;
    b.set(x,y,R(ditherIdx(v,x,y)));
  }
}
function ferris(b, cx, cy, rr){
  for(let a=0;a<8;a++){const an=a*Math.PI/4+0.2; line(cx,cy,cx+Math.cos(an)*rr,cy+Math.sin(an)*rr,(x,y)=>b.set(x,y,'2'));}
  for(let t=0;t<360;t+=2){const an=t*Math.PI/180; b.set(Math.round(cx+Math.cos(an)*(rr-2)),Math.round(cy+Math.sin(an)*(rr-2)),'2');}
  for(let t=0;t<360;t+=2){const an=t*Math.PI/180; b.set(Math.round(cx+Math.cos(an)*rr),Math.round(cy+Math.sin(an)*rr), (an<Math.PI*0.25||an>Math.PI*1.55)?'5':'4');}
  for(let a=0;a<8;a++){const an=a*Math.PI/4+0.2+Math.PI/8; const gx=Math.round(cx+Math.cos(an)*rr), gy=Math.round(cy+Math.sin(an)*rr)+1;
    b.set(gx,gy,'1');b.set(gx+1,gy,'1');b.set(gx,gy+1,'1');b.set(gx+1,gy+1,'1'); if(a%3!==1) b.set(gx,gy+1,'o');}
  b.set(cx,cy,'5');
  line(cx,cy,cx-9,RIDGE,(x,y)=>b.set(x,y,'1')); line(cx,cy,cx+9,RIDGE,(x,y)=>b.set(x,y,'1'));
}
function houses(b, list, wall, roof, edge, winA, winB, seed){
  const r=rng(seed);
  list.forEach(([x0,w,top,peak,kind])=>{
    const x1=x0+w-1, cx=(x0+x1)/2;
    for(let y=top;y<RIDGE+2;y++)for(let x=x0;x<=x1;x++) b.set(x,y,wall);
    // 지붕
    for(let y=peak;y<=top;y++){
      const t=(y-peak)/Math.max(1,top-peak);
      let hw = kind==='dome'? Math.sqrt(Math.max(0,1-(1-t)**2))*(w/2+1) : kind==='flat'? w/2+1 : t*(w/2+1)+0.5;
      for(let x=Math.ceil(cx-hw);x<=Math.floor(cx+hw);x++){
        const edgeL = x<=Math.ceil(cx-hw)+0 || y===peak;
        b.set(x,y, edgeL?edge:roof);
      }
    }
    if(kind==='gable'&&w>12&&r()>0.4){const chx=Math.round(x0+w*0.7);for(let y=peak+1;y<top;y++){b.set(chx,y,roof);b.set(chx+1,y,roof);} b.set(chx,peak,edge);b.set(chx+1,peak,edge);}
    // 창문
    for(let wy=top+2; wy<RIDGE-1; wy+=4) for(let wx=x0+2; wx<x1-1; wx+=4){
      if(r()<0.45) continue;
      const lit=r()<0.75;
      b.set(wx,wy,lit?winA:roof); b.set(wx+1,wy,lit?winA:roof); b.set(wx,wy+1,lit?winB:roof); b.set(wx+1,wy+1,lit?winB:roof);
    }
  });
}
function housesNear(b, list, seed){
  const r=rng(seed);
  list.forEach(([x0,w,top,peak,kind])=>{
    const x1=x0+w-1, cx=(x0+x1)/2;
    for(let y=top;y<RIDGE+2;y++)for(let x=x0;x<=x1;x++) b.set(x,y, x===x1?'3':(x===x0?'1':'2'));
    for(let x=x0;x<=x1;x++) b.set(x,top+1,'1');
    // 굴뚝
    if(kind!=='dome' && r()>0.35){const chx=Math.round(x0+w*(r()>0.5?0.72:0.25)); const cy0=peak-2+Math.round((top-peak)*0.35);
      for(let y=cy0;y<top;y++){b.set(chx,y,'1');b.set(chx+1,y,'2');} b.set(chx-1,cy0,'4');b.set(chx,cy0,'4');b.set(chx+1,cy0,'4');b.set(chx+2,cy0,'3');}
    // 지붕
    for(let y=peak;y<=top;y++){
      const t=(y-peak)/Math.max(1,top-peak);
      const hw = kind==='dome'? Math.sqrt(Math.max(0,1-(1-t)**2))*(w/2+1) : t*(w/2+1.2)+0.5;
      const xl=Math.ceil(cx-hw), xr=Math.floor(cx+hw);
      for(let x=xl;x<=xr;x++){
        let c = (y%2===0 && (x+y)%4===0)?'2':'1';
        if(x===xr||x===xr-1&&y===peak) c='4'; else if(x===xl) c='3'; else if(y===peak) c='3';
        if(y===top) c = x===xr?'4':'0';
        b.set(x,y,c);
      }
    }
    if(kind==='dome'){ b.set(Math.round(cx),peak-1,'4'); b.set(Math.round(cx),peak-2,'5'); }
    // 창문 (2×3, 십자 창살) + 벽에 번지는 빛
    for(let wy=top+3; wy<RIDGE-2; wy+=5) for(let wx=x0+2; wx<x1-2; wx+=5){
      if(r()<0.35) continue;
      const lit=r()<0.8;
      for(let dy=-1;dy<=3;dy++)for(let dx=-1;dx<=2;dx++){ if(lit && (dx<0||dx>1||dy<0||dy>2) && bay(wx+dx,wy+dy)<0.5) b.set(wx+dx,wy+dy,'O'); }
      for(let dy=0;dy<3;dy++)for(let dx=0;dx<2;dx++) b.set(wx+dx,wy+dy, lit?(dy===1?'O':'o'):'1');
      b.set(wx,wy+3,'4'); b.set(wx+1,wy+3,'4');
    }
  });
}
function tower(b, tx){
  // 첨탑
  for(let y=11;y<=27;y++){
    const hw=(y-11)/16*8+0.4;
    for(let x=Math.ceil(tx-hw);x<=Math.floor(tx+hw);x++){
      let c = x<tx ? '3':'2';
      if(x===Math.ceil(tx-hw)) c='5';
      if(y%3===0 && x!==Math.ceil(tx-hw)) c = x<tx?'2':'1';
      b.set(x,y,c);
    }
  }
  for(let y=6;y<11;y++) b.set(tx,y,'4'); b.set(tx,7,'6'); b.set(tx+1,8,'4'); b.set(tx+2,8,'4'); b.set(tx+1,9,'4');
  for(let x=tx-10;x<=tx+10;x++){b.set(x,27,'1');b.set(x,28,'4');b.set(x,29,'1');}
  // 시계 몸
  for(let y=30;y<RIDGE+2;y++){
    const narrow = y>48?1:0;
    for(let x=tx-8+narrow;x<=tx+8-narrow;x++){
      let c='3'; if(x<=tx-7+narrow) c='5'; else if(x>=tx+6-narrow) c='2';
      if(y%5===0 && c==='3' && (x+ (y%10?2:0))%4===0) c='2';
      b.set(x,y,c);
    }
  }
  for(let x=tx-10;x<=tx+10;x++){b.set(x,48,'5');b.set(x,49,'1');}
  for(let x=tx-10;x<=tx+10;x+=2) b.set(x,50,'2');
  // 시계판
  const cx=tx, cy=38, rr=6.6;
  for(let y=cy-8;y<=cy+8;y++)for(let x=cx-8;x<=cx+8;x++){
    const d=Math.hypot(x-cx,y-cy);
    if(d<=rr){ let c='8'; if(d>rr-1.1) c='5'; else if((x-cx)+(y-cy)>3) c='7'; b.set(x,y,c);} else if(d<=rr+0.9) b.set(x,y,'1');
  }
  [[0,-5],[5,0],[0,5],[-5,0]].forEach(([dx,dy])=>b.set(cx+dx,cy+dy,'3'));
  line(cx,cy,cx-3,cy-2,(x,y)=>b.set(x,y,'1'));
  line(cx,cy,cx+1,cy-4,(x,y)=>b.set(x,y,'1'));
  line(cx,cy,cx+3,cy+3,(x,y)=>b.set(x,y,'t'));   // 멈춘 초침 (주인공 이름)
  b.set(cx,cy,'0');
  // 아치 창
  [[tx-1,53,'o'],[tx,53,'o'],[tx+1,53,'o']].forEach(()=>{});
  for(let y=53;y<=59;y++)for(let x=tx-2;x<=tx+2;x++){
    if(y===53&&(x===tx-2||x===tx+2))continue;
    b.set(x,y, (x===tx-2||x===tx+2||y===53)?'O':(x===tx?'O':'o'));
  }
}
function lights(b, x0,y0,x1,y1,sag){
  const n=Math.round(Math.abs(x1-x0));
  for(let i=0;i<=n;i++){const t=i/n; const x=Math.round(x0+(x1-x0)*t), y=Math.round(y0+(y1-y0)*t+sag*Math.sin(Math.PI*t));
    if(i%5===0) b.set(x,y+1,(i/5)%2?'o':'O'); else if(i%2===0) b.set(x,y,'1');}
}
// 지붕 비늘 기와 + 달빛 웅덩이
function roofTiles(b, y0, y1, lightFn, opt={}){
  const rows=[]; let y=y0, k=0;
  while(y<y1+12){ const t=(y-y0)/Math.max(1,(opt.span||127)); const h=Math.round((opt.h0||4.6)+(opt.h1||4.4)*Math.pow(clamp(t,0,1),0.9)); rows.push({k,y,h,w:h*2+1,off:(k%2)?(h*2+1)/2:0,b:Math.max(2,Math.round(h*0.55))}); y+=h; k++; }
  const cxo=opt.cx??65; const E=opt.edge??-2;
  const hash=(a,c)=>{let h=(a*374761393+c*668265263)^0x5bd1e995; h=Math.imul(h^(h>>>13),1274126177); return ((h^(h>>>16))>>>0)/4294967296;};
  const tileL=(r,x)=>{const ti=Math.floor((x-cxo+r.off)/r.w); const tcx=cxo-r.off+(ti+0.5)*r.w, tcy=r.y+r.h*0.6;
    return Math.floor(lightFn(tcx,tcy)+(hash(ti,r.k)-0.5)*0.7+0.5);};
  const bottom=(r,x)=>{const u=(((x-cxo+r.off)%r.w)+r.w)%r.w; const cu=(r.w-1)/2; const dx=(u-cu)/(r.w/2); return {by:r.y+r.h-1+Math.round(r.b*Math.sqrt(Math.max(0,1-dx*dx))), dx};};
  for(let yy=y0;yy<y1;yy++){
    let k2=0; while(k2+1<rows.length && rows[k2+1].y<=yy) k2++;
    for(let x=0;x<b.w;x++){
      let delta=0, row=rows[k2];
      const shadeOf=(d,dx,a)=> a===1?-1 : d===0?E : (d===1&&dx<0.3)?1 : (dx>0.6?-1:0);
      if(k2>0){ const up=bottom(rows[k2-1],x);
        if(yy<=up.by){ row=rows[k2-1]; delta=shadeOf(up.by-yy,up.dx,0); }
        else { const own=bottom(rows[k2],x); delta=shadeOf(own.by-yy,own.dx,yy-up.by); }
      } else { const own=bottom(rows[k2],x); delta=shadeOf(own.by-yy,own.dx,0); }
      b.set(x,yy,R(tileL(row,x)+delta));
    }
  }
}
// 기와 지붕(둥근 기와 줄) — 위로 갈수록 좁아져 시계탑 쪽으로 모이는 원근
function roofBarrel(b, y0, y1, lightFn, opt={}){
  const vx=opt.vx??65, cw0=opt.cw0??5.2, cw1=opt.cw1??9.5, span=opt.span??(y1-y0);
  const hash=(a,c)=>{let h=(a*374761393+c*668265263)^0x5bd1e995; h=Math.imul(h^(h>>>13),1274126177); return ((h^(h>>>16))>>>0)/4294967296;};
  // 기와 단(course) 경계
  const courses=[]; let y=y0, k=0; while(y<y1+10){ const t=clamp((y-y0)/span,0,1); const ch=Math.round((opt.ch0??4)+(opt.ch1??4)*t); courses.push({y,ch,k}); y+=ch; k++; }
  for(let yy=y0;yy<y1;yy++){
    const t=clamp((yy-y0)/span,0,1); const cw=cw0+(cw1-cw0)*t;
    let ci=0; while(ci+1<courses.length && courses[ci+1].y<=yy) ci++;
    const c=courses[ci]; const v=yy-c.y;
    for(let x=0;x<b.w;x++){
      const u=(x-vx)/cw+0.5; const col=Math.floor(u); const fr=u-col;
      // 기와 한 장의 밝기 (달빛 웅덩이 + 약간의 흔들림)
      const tx=vx+(col)*cw, ty=c.y+c.ch/2;
      let base=Math.floor(lightFn(tx,ty)+(hash(col,c.k)-0.5)*0.3+0.5);
      let d=0;
      if(fr<0.13) d=-2; else if(fr<0.24) d=-1; else if(fr>0.55&&fr<0.78) d=1; else if(fr>0.9) d=-1;
      const inBarrel = fr>=0.13;
      if(v===0 && inBarrel) d=Math.min(d,-1)-0; // 윗단 입술 아래 그늘
      if(v===c.ch-1 && inBarrel) d = (fr>0.4&&fr<0.85)?d+1:d; // 입술 밝은 테
      
      b.set(x,yy,R(base+d));
    }
  }
}
const sceneLight=(x,y)=>{
  let L=3.95+1.3*Math.exp(-(((x-60)**2)/(2*46*46)+((y-128)**2)/(2*44*44)));
  L-=0.9*Math.pow(Math.abs(x-62)/66,3);
  L+=0.25*Math.max(0,1-(y-RIDGE)/30); // 먼 쪽 안개
  return L;
};
function ridge(b, y){
  for(let x=0;x<W;x++){
    b.set(x,y,'1'); b.set(x,y+1, (x%5===1||x%5===2)?'6':'5'); b.set(x,y+2,(x%5===0)?'2':'4'); b.set(x,y+3,'2'); b.set(x,y+4,'1');
  }
}
function shadow(b,cx,cy,rx,ry,dv=-2){
  for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++)for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){
    const e=((x-cx)/rx)**2+((y-cy)/ry)**2; if(e>1)continue;
    b.shade(x,y, e<0.55?dv:(bay(x,y)<0.5?dv+1:dv));
  }
}
function chimney(b,x0,y0,x1){
  for(let y=y0;y<H;y++)for(let x=x0;x<=x1;x++){
    let c='3'; if(x===x0) c='5'; else if(x>=x1-2) c='2';
    const row=Math.floor((y-y0-3)/3); if((y-y0-3)%3===2 && y>y0+3) c= c==='5'?'4':'2';
    if((y-y0-3)%3!==2 && (x+ (row%2?2:0))%5===0 && y>y0+3 && x>x0 && x<x1-2) c='2';
    b.set(x,y,c);
  }
  for(let x=x0-1;x<=x1+1;x++){b.set(x,y0,'1');b.set(x,y0+1,'6');b.set(x,y0+2,'4');b.set(x,y0+3,'1');}
  for(let x=x0+1;x<=x1-1;x++) b.set(x,y0,'0');
  b.set(x0-1,y0+1,'5');
}
function dormer(b,x0,y0){
  // 작은 지붕창: 따뜻한 창
  const w=20;
  for(let y=y0+8;y<H;y++)for(let x=x0+2;x<x0+w-2;x++) b.set(x,y, x===x0+2?'4':'2');
  for(let y=y0;y<=y0+9;y++){const hw=(y-y0)*1.15+1; for(let x=Math.round(x0+w/2-hw);x<=Math.round(x0+w/2+hw);x++) b.set(x,y, (x<=Math.round(x0+w/2-hw)+1)?'5':(x<x0+w/2?'3':'1'));}
  for(let y=y0+11;y<y0+20;y++)for(let x=x0+6;x<x0+w-6;x++){
    let c='o'; if(x===x0+6||y===y0+11) c='O'; if(x===x0+w/2-0) c='O'; if(y===y0+15) c='O'; b.set(x,y,c);
  }
  for(let x=x0+5;x<x0+w-5;x++) b.set(x,y0+20,'5');
}
function dangerZone(b, cx, cy, rr, dir){
  const [dx,dy]=dir; const n=Math.hypot(dx,dy);
  for(let y=cy-rr-1;y<=cy+rr+1;y++)for(let x=cx-rr-1;x<=cx+rr+1;x++){
    const px=x-cx, py=y-cy; const d=Math.hypot(px,py);
    const dot=(px*dx+py*dy)/n;
    if(dot<-0.5||d>rr+0.5) continue;
    if(d>rr-0.6) b.set(x,y,'D');
    else if(d>rr-1.6) b.set(x,y,'S');
    else { b.shade(x,y,-1); if(bay(x,y)<0.12) b.set(x,y,'S'); }
  }
}
function auraRing(b,cx,cy,rx,ry){
  for(let i=0;i<80;i++){const a=i/80*Math.PI*2; const x=Math.round(cx+Math.cos(a)*rx), y=Math.round(cy+Math.sin(a)*ry); if(i%2===0) b.set(x,y,'u');}
  for(let i=0;i<4;i++){const a=i/4*Math.PI*2; const x=Math.round(cx+Math.cos(a)*rx), y=Math.round(cy+Math.sin(a)*ry); b.set(x,y,'T'); b.set(x+(i===0?-1:i===2?1:0),y+(i===1?-1:i===3?1:0),'t');}
}
function strokePath(b, pts, layer){
  for(let s=0;s<pts.length-1;s++){
    const [x0,y0]=pts[s],[x1,y1]=pts[s+1];
    line(x0,y0,x1,y1,(x,y,t)=>{
      const g = s/(pts.length-1) + t/(pts.length-1); // 0..1 전체 진행
      if(layer==='glow'){
        for(let oy=-2;oy<=2;oy++)for(let ox=-2;ox<=2;ox++){const d=Math.abs(ox)+Math.abs(oy); if(d===2 && bay(x+ox,y+oy)<0.5 && g<0.93) b.set(x+ox,y+oy,'u');}
      } else {
        const thick = g<0.88;
        if(thick) [[1,0],[-1,0],[0,1],[0,-1]].forEach(([ox,oy])=>{ if(b.get(x+ox,y+oy)!=='w') b.set(x+ox,y+oy,'T');});
        else if(bay(x,y)<0.5) b.set(x+1,y,'T');
        b.set(x,y,'w');
      }
    });
  }
}
function hud(b){
  draw(b,SPR.clock,2,1);
  const x0=11,x1=62,y0=3;
  for(let x=x0;x<=x1;x++){b.set(x,y0,'0');b.set(x,y0+3,'0');}
  b.set(x0,y0+1,'0');b.set(x0,y0+2,'0');b.set(x1,y0+1,'0');b.set(x1,y0+2,'0');
  const fill=x0+1+Math.round((x1-x0-2)*0.68);
  for(let x=x0+1;x<x1;x++){ b.set(x,y0+1, x<=fill?'T':'2'); b.set(x,y0+2, x<=fill?'t':'1'); }
  b.set(fill,y0+1,'w');
  draw(b,SPR.star,101,0); draw(b,SPR.starE,110,0); draw(b,SPR.starE,119,0);
}

function drawScene(cv){
  const b=new Buf(W,H);
  sky(b,RIDGE+2);
  stars(b);
  moon(b);
  clouds(b,[[44,50,7,4],[54,48,6,5],[63,51,7,3],[124,46,8,5],[115,49,7,4],[-2,53,10,3]],{x:95,y:30});
  ferris(b,24,46,13);
  // 먼 마을 (실루엣)
  houses(b,[[-3,12,54,49,'gable'],[34,9,56,52,'gable'],[44,12,53,47,'gable'],[62,8,57,53,'flat'],[106,10,55,50,'gable'],[118,14,52,46,'gable']],'3','3','4','O','3',11);
  tower(b,90);
  // 공중에 멈춘 새 한 마리 (정적)
  [[58,27,'2'],[59,28,'2'],[60,28,'4'],[61,27,'2'],[62,26,'2'],[57,26,'2'],[60,29,'1']].forEach(([x,y,c])=>b.set(x,y,c));
  clouds(b,[[119,33,15,1.6],[106,35,9,1.3],[40,16,12,1.1],[50,15,6,1.4]],MOON);
  // 가까운 마을 (따뜻한 창)
  housesNear(b,[[-2,15,57,50,'gable'],[13,12,60,55,'dome'],[29,17,58,50,'gable'],[50,14,60,54,'gable'],[66,12,57,51,'dome'],[102,14,59,53,'gable'],[115,17,56,48,'gable']],5);
  lights(b,82,49,56,55,4); lights(b,98,49,118,52,3);
  ridge(b,RIDGE);
  roofBarrel(b,RIDGE+5,H,sceneLight,{});
  chimney(b,-1,160,12);
  dormer(b,111,170);

  // 위치
  const HERO_TL=[48,165];
  const S=[64,178], B=[24,140], E=[119,68];
  const P=t=>[B[0]+(E[0]-B[0])*t, B[1]+(E[1]-B[1])*t];
  const e1=P(0.27), e2=P(0.52), e3=P(0.77);
  const sTL=(c)=>[Math.round(c[0]-9),Math.round(c[1]-14)];
  const far=[18,86], dng=[103,141];

  // 그림자
  shadow(b,HERO_TL[0]+15,HERO_TL[1]+25,11,2.6);
  [far,dng,e1,e2,e3].forEach(c=>shadow(b,c[0],c[1]+6,7,2));
  dangerZone(b,dng[0],dng[1]+5,14,[64-dng[0],185-dng[1]]);
  auraRing(b,HERO_TL[0]+15,HERO_TL[1]+24,19,6);
  strokePath(b,[S,B,E],'glow');
  // 적
  draw(b,SPR.sword,...sTL(far),{desat:true});
  draw(b,SPR.sword,...sTL(dng),{desat:true,flip:true});
  draw(b,SPR.bow,...sTL(e3));
  draw(b,SPR.shield,...sTL(e2));
  draw(b,SPR.sword,...sTL(e1));
  strokePath(b,[S,B,E],'core');
  // 꺾임점
  [[0,-2],[1,-1],[2,0],[1,1],[0,2],[-1,1],[-2,0],[-1,-1]].forEach(([dx,dy])=>b.set(B[0]+dx,B[1]+dy,'T'));
  b.set(B[0],B[1],'w');
  // 주인공
  draw(b,SPR.hero,...HERO_TL);
  hud(b);
  b.toCanvas(cv);
  return b;
}
