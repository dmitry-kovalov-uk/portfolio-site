(function () {
  const fullCnv = document.getElementById('fullcnv');
  const fCtx    = fullCnv.getContext('2d');
  const cnv     = document.getElementById('cnv');
  const ctx     = cnv.getContext('2d');
  const screen  = document.getElementById('screen');
  const term    = document.getElementById('terminal');
  const flive   = document.getElementById('flive');

  /* ── Resize canvases ──────────────────────────────────────────── */
  function resizeFull() { fullCnv.width = window.innerWidth; fullCnv.height = window.innerHeight; }
  function resizeScreen() { cnv.width = screen.offsetWidth; cnv.height = screen.offsetHeight; }
  resizeFull(); resizeScreen();
  window.addEventListener('resize', () => { resizeFull(); resizeScreen(); });

  /* ── IP fetch ─────────────────────────────────────────────────── */
  let visitorIP = 'RESOLVING';
  fetch('https://api.ipify.org?format=json')
    .then(r => r.json()).then(d => {
        const p = d.ip.split('.');
        visitorIP = p.length === 4 ? `${p[0]}.${p[1]}.*.*` : d.ip.replace(/:[^:]+$/, ':****');
      })
    .catch(() => { visitorIP = 'CLASSIFIED'; });
  function updateFooter() {
    flive.textContent = `IP: ${visitorIP}  |  SYS: ${Date.now().toString(16).toUpperCase().slice(-6)}`;
  }
  setInterval(updateFooter, 3200);

  /* ═══════════════════════════════════════════════════════════════
     SHARED: SHIP DRAWING (works on any canvas context)
  ═══════════════════════════════════════════════════════════════ */
  function drawShipOn(ac, x, y, ang) {
    ac.save(); ac.translate(x, y); ac.rotate(ang);
    const eg = ac.createRadialGradient(-36,0,1,-36,0,22);
    eg.addColorStop(0,'rgba(255,150,0,.95)'); eg.addColorStop(.4,'rgba(255,60,0,.4)'); eg.addColorStop(1,'rgba(255,60,0,0)');
    ac.beginPath(); ac.ellipse(-36,0,22,13,0,0,Math.PI*2); ac.fillStyle=eg; ac.fill();
    ac.beginPath();
    ac.moveTo(40,0); ac.lineTo(24,-8); ac.lineTo(-28,-10); ac.lineTo(-40,0); ac.lineTo(-28,10); ac.lineTo(24,8); ac.closePath();
    ac.fillStyle='#bfd0e0'; ac.strokeStyle='#00d4ff'; ac.lineWidth=.7; ac.fill(); ac.stroke();
    ac.beginPath(); ac.moveTo(8,-8); ac.lineTo(-8,-8); ac.lineTo(-32,-36); ac.lineTo(-14,-10); ac.closePath();
    ac.fillStyle='#7a98aa'; ac.fill(); ac.stroke();
    ac.beginPath(); ac.moveTo(8,8); ac.lineTo(-8,8); ac.lineTo(-32,36); ac.lineTo(-14,10); ac.closePath();
    ac.fillStyle='#7a98aa'; ac.fill(); ac.stroke();
    ac.beginPath(); ac.ellipse(22,-5,10,6,-0.25,0,Math.PI*2);
    ac.fillStyle='#002233'; ac.strokeStyle='#00aacc'; ac.lineWidth=.7; ac.fill(); ac.stroke();
    ac.beginPath(); ac.ellipse(-30,0,10,5,0,0,Math.PI*2); ac.fillStyle='#526070'; ac.fill();
    ac.beginPath(); ac.ellipse(-37,0,6,3.5,0,0,Math.PI*2); ac.fillStyle='rgba(255,130,0,.9)'; ac.fill();
    ac.restore();
  }

  /* ── Shared particle helpers ──────────────────────────────────── */
  function spawnBurst(store, x, y, count, boost) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (1.5 + Math.random() * 4) * (boost || 1);
      store.push({
        x, y, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd - (boost||1)*0.5,
        life: 1, decay: .012 + Math.random()*.022,
        size: 1.2 + Math.random() * 4,
        cyan: Math.random() < .35,
      });
    }
  }

  function tickParts(store) {
    for (let i = store.length-1; i >= 0; i--) {
      const p = store[i];
      p.x += p.vx; p.y += p.vy; p.vy += .06;
      p.life -= p.decay; p.size *= .979;
      if (p.life <= 0) store.splice(i, 1);
    }
  }

  function drawParts(ac, store) {
    store.forEach(p => {
      const col = p.cyan ? `rgba(0,180,255,${p.life*.8})` : `rgba(255,120,0,${p.life})`;
      ac.beginPath(); ac.arc(p.x, p.y, p.size, 0, Math.PI*2);
      ac.fillStyle = col; ac.fill();
      const g = ac.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*3);
      g.addColorStop(0, p.cyan?`rgba(0,160,255,${p.life*.2})`:`rgba(255,100,0,${p.life*.2})`);
      g.addColorStop(1,'transparent');
      ac.beginPath(); ac.arc(p.x,p.y,p.size*3,0,Math.PI*2); ac.fillStyle=g; ac.fill();
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     INTRO — full-page canvas
  ═══════════════════════════════════════════════════════════════ */
  const INTRO_DUR  = 4500;
  const FORGE_T    = 0.60;   // trigger forge at this normalised time
  const COVER_END  = 0.82;   // dark cover fully gone by here

  const introStars = Array.from({length:120}, () => ({
    x: Math.random(), y: Math.random(),
    r: Math.random()*1.3+.2, a: Math.random()*.5+.15
  }));
  const iParts = [];
  let   iT0 = null, forgeTriggered = false;

  function iShipPos(t) {
    const W = fullCnv.width, H = fullCnv.height;
    const x0=-120, y0=H+120, cpx=W*.28, cpy=H*.86, tx=W*.5, ty=H*.5;
    if (t < .78) {
      const s=t/.78, q=1-s;
      return { x:q*q*x0+2*q*s*cpx+s*s*tx, y:q*q*y0+2*q*s*cpy+s*s*ty };
    }
    const s=(t-.78)/.22;
    return { x:tx + s*W*.8, y:ty - s*H*.42 };
  }
  function iShipAngle(t) {
    const a=iShipPos(Math.max(0,t-.007)), b=iShipPos(Math.min(1,t+.007));
    return Math.atan2(b.y-a.y, b.x-a.x);
  }

  function introFrame(ts) {
    if (!iT0) iT0 = ts;
    const t = Math.min((ts - iT0) / INTRO_DUR, 1);

    fCtx.clearRect(0, 0, fullCnv.width, fullCnv.height);

    /* dark cover: fades away between FORGE_T and COVER_END */
    const coverA = t < FORGE_T ? 1 : Math.max(0, 1 - (t-FORGE_T)/(COVER_END-FORGE_T));
    if (coverA > 0) {
      fCtx.globalAlpha = coverA;
      fCtx.fillStyle = '#030508';
      fCtx.fillRect(0, 0, fullCnv.width, fullCnv.height);
      fCtx.globalAlpha = 1;
    }

    /* stars: fade in first 12%, fade out with cover */
    const starA = Math.min(1, t/.12) * Math.max(0, coverA);
    if (starA > 0) {
      introStars.forEach(s => {
        fCtx.beginPath();
        fCtx.arc(s.x*fullCnv.width, s.y*fullCnv.height, s.r, 0, Math.PI*2);
        fCtx.fillStyle = `rgba(140,190,255,${s.a*starA})`;
        fCtx.fill();
      });
    }

    /* ship: enters at t=0.08 */
    if (t > 0.08) {
      const shipT = Math.min(1, (t - 0.08) / 0.72);
      const pos   = iShipPos(shipT);
      const ang   = iShipAngle(shipT);
      const nx    = pos.x - Math.cos(ang)*38;
      const ny    = pos.y - Math.sin(ang)*38;

      /* normal engine particles */
      const burst = shipT > .72 ? Math.floor(20*(shipT-.72)/.28) : 0;
      spawnBurst(iParts, nx, ny, 5 + burst, 1 + burst*.15);

      tickParts(iParts);
      drawParts(fCtx, iParts);
      drawShipOn(fCtx, pos.x, pos.y, ang);

      /* forge glow emanating from ship position as it nears centre */
      if (shipT > .70) {
        const fi = (shipT-.70)/.30;
        const gr = fCtx.createRadialGradient(pos.x,pos.y,0,pos.x,pos.y,180*fi+20);
        const ga = Math.sin(fi*Math.PI) * .8;
        gr.addColorStop(0,   `rgba(180,220,255,${ga})`);
        gr.addColorStop(.3,  `rgba(0,100,255,${ga*.6})`);
        gr.addColorStop(1,   'rgba(0,0,80,0)');
        fCtx.beginPath(); fCtx.arc(pos.x,pos.y,180*fi+20,0,Math.PI*2);
        fCtx.fillStyle = gr; fCtx.fill();
      }
    }

    /* trigger terminal forge */
    if (t >= FORGE_T && !forgeTriggered) {
      forgeTriggered = true;
      term.classList.add('forged');
      setTimeout(revealContent, 900);
    }

    if (t < 1) {
      requestAnimationFrame(introFrame);
    } else {
      fullCnv.style.display = 'none';
      startScreenCanvas();
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     CONTENT REVEAL
  ═══════════════════════════════════════════════════════════════ */
  const rows = ['r0','r1','r2','r3','r4','r5','r6','r7'];
  function revealContent() {
    rows.forEach((id, i) => {
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.classList.add('show');
      }, i * 160);
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     SCREEN CANVAS — persistent effects
  ═══════════════════════════════════════════════════════════════ */

  /* ── Radar ────────────────────────────────────────────────────── */
  let radarAngle = -Math.PI/2;
  const radarBlips = [];
  function radarR() { return Math.min(cnv.width * .092, 68); }

  function drawRadar() {
    const R=radarR(), cx=cnv.width-R-14, cy=R+14;
    radarAngle += .022;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.clip();
    ctx.fillStyle='rgba(0,14,7,.9)'; ctx.fill();
    for (let i=0;i<38;i++) {
      const a0=radarAngle-1.15*(i/38), a1=radarAngle-1.15*((i+1)/38);
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,R,a0,a1,true); ctx.closePath();
      ctx.fillStyle=`rgba(0,255,80,${(1-i/38)*.30})`; ctx.fill();
    }
    [.33,.66,1].forEach(f=>{
      ctx.beginPath(); ctx.arc(cx,cy,R*f,0,Math.PI*2);
      ctx.strokeStyle='rgba(0,180,70,.2)'; ctx.lineWidth=1; ctx.stroke();
    });
    ctx.strokeStyle='rgba(0,180,70,.18)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(cx-R,cy); ctx.lineTo(cx+R,cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx,cy-R); ctx.lineTo(cx,cy+R); ctx.stroke();
    if (Math.random()<.018 && radarBlips.length<14) {
      const a=radarAngle+(Math.random()-.5)*.12;
      const d=(.2+Math.random()*.72)*R;
      radarBlips.push({x:cx+Math.cos(a)*d, y:cy+Math.sin(a)*d, life:1});
    }
    for (let i=radarBlips.length-1;i>=0;i--) {
      const b=radarBlips[i]; b.life-=.006;
      if(b.life<=0){radarBlips.splice(i,1);continue;}
      ctx.beginPath(); ctx.arc(b.x,b.y,2.8,0,Math.PI*2);
      ctx.fillStyle=`rgba(0,255,90,${b.life})`;
      ctx.shadowColor='#00ff55'; ctx.shadowBlur=10; ctx.fill(); ctx.shadowBlur=0;
    }
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.lineTo(cx+Math.cos(radarAngle)*R,cy+Math.sin(radarAngle)*R);
    ctx.strokeStyle='rgba(0,255,80,.95)'; ctx.lineWidth=1.5;
    ctx.shadowColor='#00ff55'; ctx.shadowBlur=6; ctx.stroke(); ctx.shadowBlur=0;
    ctx.beginPath(); ctx.arc(cx,cy,2.5,0,Math.PI*2);
    ctx.fillStyle='#00ff88'; ctx.shadowColor='#00ff88'; ctx.shadowBlur=6; ctx.fill(); ctx.shadowBlur=0;
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2);
    ctx.strokeStyle='#00aa44'; ctx.lineWidth=1.5; ctx.stroke();
    ctx.font=`bold ${Math.max(7,R*.11)}px Courier New`;
    ctx.fillStyle='rgba(0,200,70,.55)'; ctx.textAlign='center';
    ctx.fillText('RADAR', cx, cy+R+13);
  }

  /* ── Welding ──────────────────────────────────────────────────── */
  const welds = [];
  function maybeWeld() {
    if (Math.random()<.004) {
      const W=cnv.width,H=cnv.height;
      const pts=[[18,18],[W-18,18],[18,H-18],[W-18,H-18]];
      const [cx,cy]=pts[Math.floor(Math.random()*pts.length)];
      const weld={cx,cy,flashLife:1,sparks:[]};
      for(let i=0;i<22;i++){
        const a=Math.random()*Math.PI*2, spd=1.8+Math.random()*5;
        const r=Math.random();
        weld.sparks.push({x:cx,y:cy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-1.5,
          life:1,decay:.016+Math.random()*.025,size:.8+Math.random()*2.2,
          hot:r<.25?'w':r<.6?'y':'o'});
      }
      welds.push(weld);
    }
  }
  function drawWelds() {
    for(let wi=welds.length-1;wi>=0;wi--){
      const w=welds[wi];
      if(w.flashLife>0){
        w.flashLife-=.09; const fl=Math.max(0,w.flashLife);
        const fg=ctx.createRadialGradient(w.cx,w.cy,0,w.cx,w.cy,28*fl);
        fg.addColorStop(0,`rgba(220,240,255,${fl})`); fg.addColorStop(.25,`rgba(100,160,255,${fl*.75})`); fg.addColorStop(1,'rgba(0,60,255,0)');
        ctx.beginPath();ctx.arc(w.cx,w.cy,28*fl,0,Math.PI*2);ctx.fillStyle=fg;ctx.fill();
        ctx.beginPath();ctx.arc(w.cx,w.cy,3.5*fl,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,255,255,${fl})`;ctx.shadowColor='#ccddff';ctx.shadowBlur=22;ctx.fill();ctx.shadowBlur=0;
      }
      for(let i=w.sparks.length-1;i>=0;i--){
        const s=w.sparks[i];
        const px=s.x,py=s.y;
        s.vx*=.97;s.vy+=.13;s.x+=s.vx;s.y+=s.vy;s.life-=s.decay;s.size*=.965;
        if(s.life<=0){w.sparks.splice(i,1);continue;}
        const col=s.hot==='w'?`rgba(255,255,255,${s.life})`:s.hot==='y'?`rgba(255,240,60,${s.life})`:`rgba(255,120,0,${s.life})`;
        ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(s.x,s.y);
        ctx.strokeStyle=col;ctx.lineWidth=s.size*.7;
        ctx.shadowColor=s.hot==='w'?'#fff':s.hot==='y'?'#ffff44':'#ff6600';ctx.shadowBlur=5;ctx.stroke();ctx.shadowBlur=0;
        ctx.beginPath();ctx.arc(s.x,s.y,s.size,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
      }
      if(w.flashLife<=0&&w.sparks.length===0) welds.splice(wi,1);
    }
  }

  /* ── Flying objects — one of each type max ────────────────────── */
  const flyObjs = [];
  let objTick = 0;
  const ALL_TYPES = ['ufo','alien','comet','shootstar'];

  function createFlyObj(type) {
    const W=cnv.width,H=cnv.height, fromL=Math.random()>.5;
    const fast=type==='comet'||type==='shootstar';
    const o={type,phase:Math.random()*Math.PI*2,dir:fromL?1:-1,
      speed:type==='shootstar'?9+Math.random()*9:type==='comet'?5+Math.random()*4:.5+Math.random()*1.4,
      scale:.45+Math.random()*.65,x:fromL?-180:W+180,
      y:fast?Math.random()*H:16+Math.random()*(H-80),lightTick:0};
    flyObjs.push(o);
  }

  function maybeSpawn() {
    objTick++;
    if (objTick % 200 !== 0) return;
    const existing = new Set(flyObjs.map(o => o.type));
    const avail = ALL_TYPES.filter(t => !existing.has(t));
    if (avail.length > 0) createFlyObj(avail[Math.floor(Math.random()*avail.length)]);
  }

  function updateFlyObjs() {
    flyObjs.forEach(o=>{
      o.x+=o.speed*o.dir; o.phase+=.04;
      if(o.type==='ufo'||o.type==='alien') o.y+=Math.sin(o.phase)*.45;
      if(o.type==='ufo') o.lightTick++;
    });
    for(let i=flyObjs.length-1;i>=0;i--){
      const o=flyObjs[i];
      if((o.dir>0&&o.x>cnv.width+220)||(o.dir<0&&o.x<-220)) flyObjs.splice(i,1);
    }
  }

  function drawFlyObjs() {
    flyObjs.forEach(o=>{
      ctx.save();
      if(o.type==='ufo')        {ctx.globalAlpha=.45; drawUFO(o);}
      else if(o.type==='alien') {ctx.globalAlpha=.50; drawAlien(o);}
      else if(o.type==='comet')   drawComet(o);
      else                        drawShootStar(o);
      ctx.restore();
    });
  }

  function drawUFO(o){
    ctx.save(); ctx.translate(o.x,o.y); const s=o.scale;
    if(o.lightTick%200<70){
      const fade=Math.sin((o.lightTick%200)/70*Math.PI);
      const tb=ctx.createLinearGradient(0,12*s,0,65*s);
      tb.addColorStop(0,`rgba(0,255,180,${.3*fade})`); tb.addColorStop(1,'rgba(0,255,180,0)');
      ctx.beginPath();ctx.moveTo(-9*s,12*s);ctx.lineTo(-28*s,65*s);ctx.lineTo(28*s,65*s);ctx.lineTo(9*s,12*s);ctx.closePath();ctx.fillStyle=tb;ctx.fill();
    }
    ctx.beginPath();ctx.ellipse(0,0,42*s,12*s,0,0,Math.PI*2);
    const sg=ctx.createLinearGradient(0,-12*s,0,12*s);
    sg.addColorStop(0,'#9ae0ff');sg.addColorStop(1,'#3a70a0');
    ctx.fillStyle=sg;ctx.strokeStyle='#00d4ff';ctx.lineWidth=1;ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(0,-7*s,20*s,16*s,0,Math.PI,0);
    ctx.fillStyle='rgba(0,200,255,.22)';ctx.strokeStyle='#88ddff';ctx.lineWidth=1.5;ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(-6*s,-13*s,6*s,3.5*s,-0.5,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,.28)';ctx.fill();
    const lx=[-26*s,-13*s,0,13*s,26*s],lc=['#ff0','#f80','#0ff','#f0f','#ff0'];
    lx.forEach((x,i)=>{
      const on=Math.floor(o.lightTick/7+i)%4!==0;
      ctx.beginPath();ctx.arc(x,10*s,3.2*s,0,Math.PI*2);ctx.fillStyle=on?lc[i]:'#222';
      if(on){ctx.shadowColor=lc[i];ctx.shadowBlur=10;}ctx.fill();ctx.shadowBlur=0;
    });
    ctx.restore();
  }

  function drawAlien(o){
    ctx.save();ctx.translate(o.x,o.y+Math.sin(o.phase)*3);const s=o.scale;
    if(o.dir<0) ctx.scale(-1,1);
    ctx.fillStyle='#2a3a4a';ctx.strokeStyle='#445566';ctx.lineWidth=1;
    ctx.beginPath();ctx.rect(-18*s,2*s,9*s,24*s);ctx.fill();ctx.stroke();
    const fl=.7+Math.sin(o.phase*5)*.3;
    ctx.beginPath();ctx.ellipse(-13.5*s,28*s,3.5*s,7*s*fl,0,0,Math.PI*2);
    ctx.fillStyle=`rgba(255,${80+Math.floor(fl*80)},0,.85)`;ctx.fill();
    ctx.beginPath();ctx.rect(-11*s,4*s,22*s,26*s);
    ctx.fillStyle='#2a4a6a';ctx.strokeStyle='#4a7a9a';ctx.lineWidth=1.5;ctx.fill();ctx.stroke();
    [-1,1].forEach(side=>{
      ctx.beginPath();ctx.moveTo(side*11*s,9*s);ctx.lineTo(side*22*s,18*s);
      ctx.strokeStyle='#1e3a52';ctx.lineWidth=5.5*s;ctx.stroke();
      ctx.strokeStyle='#4a7a9a';ctx.lineWidth=4*s;ctx.stroke();
      ctx.beginPath();ctx.arc(side*22*s,19*s,3.5*s,0,Math.PI*2);ctx.fillStyle='#ddeeff';ctx.fill();
    });
    [-1,1].forEach(side=>{
      ctx.beginPath();ctx.moveTo(side*5*s,30*s);ctx.lineTo(side*7*s,44*s);
      ctx.strokeStyle='#1e3a52';ctx.lineWidth=5.5*s;ctx.stroke();
      ctx.strokeStyle='#4a7a9a';ctx.lineWidth=4*s;ctx.stroke();
      ctx.beginPath();ctx.ellipse(side*8.5*s,45*s,5.5*s,3.5*s,0,0,Math.PI*2);ctx.fillStyle='#1a2a3a';ctx.fill();
    });
    ctx.beginPath();ctx.arc(0,-4*s,18*s,0,Math.PI*2);
    ctx.fillStyle='rgba(100,220,255,.1)';ctx.strokeStyle='rgba(100,220,255,.75)';ctx.lineWidth=2.2;ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.arc(-6*s,-11*s,5.5*s,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,.18)';ctx.fill();
    ctx.beginPath();ctx.ellipse(0,-3*s,11*s,13*s,0,0,Math.PI*2);ctx.fillStyle='#3a7a3a';ctx.fill();
    [-4.5*s,4.5*s].forEach(ex=>{
      ctx.beginPath();ctx.ellipse(ex,-5*s,3.8*s,5.5*s,0,0,Math.PI*2);ctx.fillStyle='#0a0a0a';ctx.fill();
      ctx.beginPath();ctx.arc(ex+1.2*s,-7.5*s,1.4*s,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
    });
    ctx.beginPath();ctx.arc(0,2*s,3.5*s,0,Math.PI);ctx.strokeStyle='#1a4a1a';ctx.lineWidth=1.2;ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,-16*s);ctx.lineTo(-5*s,-30*s);ctx.strokeStyle='#5aaa5a';ctx.lineWidth=1.5;ctx.stroke();
    ctx.beginPath();ctx.arc(-5*s,-32*s,3.2*s,0,Math.PI*2);
    ctx.fillStyle='#ff0';ctx.shadowColor='#ff0';ctx.shadowBlur=8;ctx.fill();ctx.shadowBlur=0;
    ctx.restore();
  }

  function drawComet(o){
    ctx.save();ctx.translate(o.x,o.y);const s=o.scale,td=o.dir>0?-1:1,tl=95+s*55;
    const g=ctx.createLinearGradient(0,0,td*tl,0);
    g.addColorStop(0,'rgba(200,220,255,0)');g.addColorStop(.6,'rgba(150,200,255,.35)');g.addColorStop(1,'rgba(255,255,255,.88)');
    ctx.beginPath();ctx.moveTo(td*tl,-3.5*s);ctx.lineTo(0,0);ctx.lineTo(td*tl,3.5*s);ctx.closePath();ctx.fillStyle=g;ctx.fill();
    const ng=ctx.createRadialGradient(0,0,0,0,0,13*s);
    ng.addColorStop(0,'rgba(255,255,255,1)');ng.addColorStop(.3,'rgba(180,220,255,.8)');ng.addColorStop(1,'rgba(100,150,255,0)');
    ctx.beginPath();ctx.arc(0,0,13*s,0,Math.PI*2);ctx.fillStyle=ng;ctx.fill();
    ctx.beginPath();ctx.arc(0,0,3.5*s,0,Math.PI*2);ctx.fillStyle='#fff';ctx.shadowColor='#aaddff';ctx.shadowBlur=18;ctx.fill();ctx.shadowBlur=0;
    ctx.restore();
  }

  function drawShootStar(o){
    ctx.save();ctx.translate(o.x,o.y);const s=o.scale*.55,td=o.dir>0?-1:1,tl=130*s;
    const g=ctx.createLinearGradient(0,0,td*tl,0);
    g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(255,255,255,.92)');
    ctx.beginPath();ctx.moveTo(td*tl,-1.5*s);ctx.lineTo(0,0);ctx.lineTo(td*tl,1.5*s);ctx.closePath();ctx.fillStyle=g;ctx.fill();
    ctx.beginPath();ctx.arc(0,0,2.5*s,0,Math.PI*2);ctx.fillStyle='#fff';ctx.shadowColor='#fff';ctx.shadowBlur=10;ctx.fill();ctx.shadowBlur=0;
    ctx.restore();
  }

  /* ── Screen canvas loop ───────────────────────────────────────── */
  function startScreenCanvas() {
    /* stagger-spawn one of each type */
    ALL_TYPES.forEach((type, i) => setTimeout(() => createFlyObj(type), i * 700));
    persistFrame();
  }

  function drawDarkOverlay() {
    const grd = ctx.createRadialGradient(
      cnv.width * .38, cnv.height * .45, 0,
      cnv.width * .38, cnv.height * .45, cnv.width * .72
    );
    grd.addColorStop(0,   'rgba(0,8,16,.72)');
    grd.addColorStop(0.7, 'rgba(0,8,16,.45)');
    grd.addColorStop(1,   'rgba(0,8,16,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, cnv.width, cnv.height);
  }

  function persistFrame() {
    ctx.clearRect(0, 0, cnv.width, cnv.height);
    maybeSpawn(); updateFlyObjs(); drawFlyObjs();
    maybeWeld();  drawWelds();
    drawDarkOverlay();
    drawRadar();
    requestAnimationFrame(persistFrame);
  }

  /* ── Kick off ─────────────────────────────────────────────────── */
  setTimeout(() => requestAnimationFrame(introFrame), 200);
})();

(function(){
  const wrap    = document.getElementById('terminal');
  const dock    = document.getElementById('dock-icon');
  const EASE_IN = 'transform .38s cubic-bezier(.55,0,1,.8), opacity .3s ease-in';
  const EASE_OUT= 'transform .42s cubic-bezier(0,0,.2,1), opacity .35s ease-out';

  /* ── Red: close tab ── */
  document.getElementById('btn-close').addEventListener('click', () => {
    window.close();
    setTimeout(() => { if (history.length > 1) history.back(); }, 100);
  });

  /* ── Yellow: minimize ── */
  function spawnGhost(fromRect, toRect, onDone) {
    const g = document.createElement('div');
    g.style.cssText = `position:fixed;left:${fromRect.left}px;top:${fromRect.top}px;
      width:${fromRect.width}px;height:${fromRect.height}px;
      background:#1c2028;border:2px solid #3a4550;border-radius:14px;
      z-index:9500;pointer-events:none;transition:none;`;
    document.body.appendChild(g);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      g.style.transition = 'all .4s cubic-bezier(.4,0,1,1)';
      g.style.left   = toRect.left   + 'px';
      g.style.top    = toRect.top    + 'px';
      g.style.width  = toRect.width  + 'px';
      g.style.height = toRect.height + 'px';
      g.style.opacity = '0';
      g.style.borderRadius = '13px';
    }));
    setTimeout(() => { g.remove(); onDone && onDone(); }, 420);
  }

  document.getElementById('btn-min').addEventListener('click', () => {
    const termRect = wrap.getBoundingClientRect();
    wrap.style.visibility = 'hidden';
    dock.classList.add('show');
    const dockRect = dock.querySelector('.d-app').getBoundingClientRect();
    spawnGhost(termRect, dockRect);
  });

  window.unminimize = () => {
    const dockRect = dock.querySelector('.d-app').getBoundingClientRect();
    dock.classList.remove('show');
    spawnGhost(dockRect, wrap.getBoundingClientRect(), () => {
      wrap.style.visibility = 'visible';
    });
  };

  /* ── Green: fullscreen ── */
  document.getElementById('btn-max').addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) {
        await (document.documentElement.requestFullscreen
          || document.documentElement.webkitRequestFullscreen
          || document.documentElement.mozRequestFullScreen
        ).call(document.documentElement);
      } else {
        await (document.exitFullscreen
          || document.webkitExitFullscreen
          || document.mozCancelFullScreen
        ).call(document);
      }
    } catch(e) {}
  });
})();

(function(){
  const tooltip = document.getElementById('skill-tooltip');
  let hide;
  document.querySelectorAll('.tag[data-tip]').forEach(tag => {
    tag.addEventListener('mouseenter', () => {
      clearTimeout(hide);
      const r = tag.getBoundingClientRect();
      tooltip.textContent = tag.dataset.tip;
      const m = 8;
      const tw = tooltip.offsetWidth || 210;
      const maxLeft = window.innerWidth - tw - m;
      const left = Math.max(m, Math.min(r.left, maxLeft));
      tooltip.style.left = left + 'px';
      tooltip.style.top  = (r.bottom + 6) + 'px';
      tooltip.classList.add('visible');
    });
    tag.addEventListener('mouseleave', () => {
      hide = setTimeout(() => tooltip.classList.remove('visible'), 150);
    });
  });
})();
