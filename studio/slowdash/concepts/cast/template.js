// 시트 공통 배치 (390×844)
function sheet(o) {
  const css = `
  *{box-sizing:border-box}
  body{margin:0;width:390px;height:844px;overflow:hidden;font-family:'WenQuanYi Zen Hei',sans-serif;background:${o.bg}}
  .page{position:relative;width:390px;height:844px;color:${o.fg};background:${o.bgGrad || o.bg}}
  header{position:absolute;left:0;top:0;width:390px;height:66px;padding:9px 14px 0}
  .kicker{font-size:12px;letter-spacing:1px;color:${o.accent};font-weight:bold}
  h1{font-size:21px;margin:1px 0 0;letter-spacing:-.6px;line-height:1.15}
  h1 small{font-size:13px;font-weight:normal;opacity:.75;margin-left:4px;letter-spacing:0}
  .sub{font-size:12px;opacity:.85;margin-top:2px}
  .card{position:absolute;border-radius:14px;overflow:hidden;background:${o.card};box-shadow:inset 0 0 0 1px ${o.line},0 2px 0 rgba(0,0,0,.18)}
  .card svg{position:absolute;left:0;top:0;display:block}
  .chip{position:absolute;font-size:12px;line-height:1;padding:4px 8px 3px;border-radius:10px;background:${o.chipBg};color:${o.chipFg};font-weight:bold}
  .cap{position:absolute;left:0;right:0;bottom:0;height:24px;font-size:12px;line-height:24px;text-align:center;color:${o.capFg || o.fg};background:${o.capBg}}
  .name{position:absolute;left:0;right:0;bottom:0;text-align:center;font-size:13px;font-weight:bold;line-height:1.1;padding-bottom:6px}
  .name i{display:block;font-style:normal;font-weight:normal;font-size:12px;opacity:.75;margin-top:3px}
  footer{position:absolute;left:10px;right:10px;top:752px;height:84px;font-size:12.5px;line-height:1.45}
  footer div{display:flex;gap:7px;margin-bottom:5px}
  footer b{flex:none;font-size:12px;padding:2px 7px 1px;border-radius:8px;height:19px;line-height:17px}
  .silrow{display:flex;align-items:center;gap:8px;margin-top:2px}.silrow b{background:rgba(255,255,255,.1);color:${o.fg}}.silrow svg{display:block}
  .pro b{background:${o.proBg};color:${o.proFg}} .con b{background:${o.conBg};color:${o.conFg}}
  `;
  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
  document.body.innerHTML = `
  <div class="page">
    <header><div class="kicker">${o.kicker}</div><h1>${o.title}<small>${o.titleSmall || ''}</small></h1><div class="sub">${o.sub}</div></header>
    <div class="card" style="left:10px;top:70px;width:370px;height:250px">${o.hero}</div>
    ${o.enemies
      .map(
        (e, i) =>
          `<div class="card" style="left:${10 + i * 126}px;top:326px;width:118px;height:146px">${e.svg}<div class="name">${e.name}<i>${e.note}</i></div></div>`
      )
      .join('')}
    <div class="card" style="left:10px;top:478px;width:238px;height:268px">${o.scene}<div class="cap">${o.sceneCap}</div></div>
    <div class="card" style="left:254px;top:478px;width:126px;height:268px">${o.cut}<div class="cap">${o.cutCap}</div></div>
    <footer><div class="pro"><b>장점</b><span>${o.pro}</span></div><div class="con"><b>단점</b><span>${o.con}</span></div>
    ${o.sil ? `<div class="silrow"><b>실루엣</b>${o.sil}</div>` : ''}</footer>
  </div>`;
}
