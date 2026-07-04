// engine.js — The Round Book dashboard engine, hosted by RoundBook.js.
// Ported VERBATIM from the JS that build_dash.py embeds in
// golf-dashboard.html (Jul 2026). The conditional headlines and every number
// compute from the filtered data at render time (CLAUDE.md rule 1);
// keeping the logic byte-for-byte is what preserves that guarantee, so treat
// build_dash.py as the reference when the two ever need to converge.
// Deliberate adaptations, and nothing else:
//   - data arrives via initRoundBook(root, data) instead of window.__DATA__
//   - DOM lookups are scoped to the mounted root instead of document
//   - Chart.js comes from npm instead of the CDN global
//   - course filter buttons generate from data.meta.courses (the static HTML
//     hardcoded the three current courses; a synced dashboard can grow new ones)
//   - the two inline onclick strings became addEventListener wiring (module
//     scope has no window globals)
//   - initRoundBook returns destroyRoundBook, which tears down the charts
import { Chart, registerables } from 'chart.js';
import { agg, bench, TOURPROX, fmtDate, dedupeDates } from './metrics';

Chart.register(...registerables);

let root = null;
let D = null;
const $ = (id) => root.querySelector('#' + id);


const C = {wood:'#3f78c4',iron:'#4ea87a',wedge:'#c9a24a',putter:'#7c8f84',other:'#7c8f84'};
Chart.defaults.color='#93a99c';
Chart.defaults.font.family="Inter, ui-sans-serif, system-ui, sans-serif";
Chart.defaults.font.size=12;
const GRID='#243429';
const charts={};
function draw(id,cfg){ if(charts[id])charts[id].destroy(); const el=$(id); if(!el)return; charts[id]=new Chart(el,cfg); }

// ---- value-label plugins ----
const topLab={id:'tl',afterDatasetsDraw(c){const x=c.ctx,m=c.getDatasetMeta(0),d=c.data.datasets[0];x.save();x.font='600 12px Inter';x.textAlign='center';
  m.data.forEach((b,i)=>{const v=d.data[i];if(v==null)return;x.fillStyle=Array.isArray(d.backgroundColor)?d.backgroundColor[i]:d.backgroundColor;x.fillText(c.$fmt?c.$fmt(v):v,b.x,b.y-7);});x.restore();}};
const endLab={id:'el',afterDatasetsDraw(c){if(!c.$lab)return;const x=c.ctx,m=c.getDatasetMeta(0);x.save();x.font='600 12px Inter';x.textBaseline='middle';x.fillStyle='#cfe0d6';
  m.data.forEach((b,i)=>{x.fillText(c.$lab[i],b.x+8,b.y);});x.restore();}};

// ---- state ----
let sortedDates, state, frT;

function filtered(){
  const lo=sortedDates[state.fromIdx], hi=sortedDates[state.toIdx];
  return D.rounds.filter(r=> (state.course==='All'||r.course===state.course) && r.date>=lo && r.date<=hi);
}


// ---- KPI + Overview ----
function renderOverview(){
  const a=agg(filtered());
  const k=$('kpis');
  const kp=(l,v,s,cl)=>`<div class="kpi ${cl||''}"><p class="lab">${l}</p><p class="val">${v}${s?`<small>${s}</small>`:''}</p></div>`;
  k.innerHTML = kp('Rounds',a.nRounds,'')+kp('Holes',a.nH,'')+kp('Scoring 18',a.pace18.toFixed(0),'')+
    kp('vs par','+'+a.ouP18.toFixed(0),'')+kp('Greens',a.girPct.toFixed(0),'%')+
    kp('Fairways',a.fwPct.toFixed(0),'%')+kp('Putts/18',(a.puttsPerH*18).toFixed(0),'')+
    kp('3-putt',a.threePct.toFixed(0),'%','leak');

  $('leak3').textContent=(a.puttsPerH*18).toFixed(0);
  $('leakp').textContent=a.threePct.toFixed(0)+'%';
  $('leakg').textContent=a.pGirAvg.toFixed(2);
  const puttBad=a.threePct>bench('tp',D.hcp);
  $('leakTag').textContent=puttBad?'The leak':'In this view';
  $('leakDesc').textContent=puttBad?'You strike it better than you score. This is the part that grades worse than the rest.':'Holding up fine in this slice — your three-putt rate is at or better than your handicap here.';
  $('leakRef1').textContent='· ~'+bench('putts',D.hcp).toFixed(0)+' for your hcp';
  $('leakRef2').textContent='· ~'+Math.round(bench('tp',D.hcp))+'% for your hcp';
  $('leakRef3').textContent='· 2.0 is the baseline';

  const tot=a.nH||1;
  const order=['Birdie','Par','Bogey','Double','Triple+'];
  draw('dist',{type:'bar',data:{labels:order,datasets:[{
    data:order.map(o=>+(100*a.res[o]/tot).toFixed(1)),
    backgroundColor:['#4ea87a','#3f6e57','#7c8f84','#e08a3c','#e35a50'],borderRadius:5,borderSkipped:'start',barThickness:46}]},
    plugins:[topLab],options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},
    plugins:{legend:{display:false},tooltip:{enabled:false}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:12.5}}},y:{grid:{color:GRID},border:{display:false},ticks:{callback:v=>v+'%'}}}}});

  const cats=[['Putting',D.cat.putting],['Approach',D.cat.approach],['Chipping',D.cat.chipping],['Sand',D.cat.sand],['Driving',D.cat.driving]];
  const cc=draw('cats',{type:'bar',data:{labels:cats.map(c=>c[0]),datasets:[{data:cats.map(c=>c[1]),
    backgroundColor:cats.map(c=>c[0]==='Putting'?'#e35a50':'#4ea87a'),borderRadius:4,borderSkipped:'start',barThickness:22}]},
    plugins:[endLab],options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,layout:{padding:{right:30}},
    plugins:{legend:{display:false},tooltip:{enabled:false}},
    scales:{x:{suggestedMin:0,suggestedMax:28,grid:{color:GRID},border:{display:false}},y:{grid:{display:false},border:{display:false},ticks:{font:{size:12.5}}}}}});
  charts['cats'].$lab=cats.map(c=>c[1].toFixed(1));charts['cats'].update();

  const pl=[...a.paceList].sort((x,y)=>x.date<y.date?-1:1);
  draw('trend',{type:'line',data:{labels:pl.map(p=>p.date.slice(5)),datasets:[{data:pl.map(p=>p.pace),
    borderColor:'#62c692',backgroundColor:'rgba(98,198,146,.12)',fill:true,tension:.32,pointRadius:4,
    pointBackgroundColor:'#62c692',pointBorderColor:'#0e1a14',pointBorderWidth:2,borderWidth:2.5}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},
    tooltip:{enabled:true,callbacks:{label:c=>c.parsed.y+' (18-pace)'}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:11}}},y:{grid:{color:GRID},border:{display:false},suggestedMin:78,suggestedMax:102}}}});

  const pars=[3,4,5].filter(p=>a.sN[p]);
  draw('parc',{type:'bar',data:{labels:pars.map(p=>'Par '+p),datasets:[{
    data:pars.map(p=>+(a.sSum[p]/a.sN[p]-p).toFixed(2)),
    backgroundColor:['#4ea87a','#5e9c7e','#c9a24a'].slice(0,pars.length),borderRadius:5,borderSkipped:'start',barThickness:54}]},
    plugins:[topLab],options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},
    plugins:{legend:{display:false},tooltip:{enabled:false}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:12.5}}},y:{grid:{color:GRID},border:{display:false},ticks:{callback:v=>'+'+v.toFixed(1)},suggestedMax:1.5}}}});
  charts['parc'].$fmt=v=>'+'+v.toFixed(2);charts['parc'].update();
}

// ---- Putting ----
function renderPutting(){
  const a=agg(filtered());
  $('pstats').innerHTML=
    stat((a.puttsPerH*18).toFixed(0),'putts / round','vs ~'+bench('putts',D.hcp).toFixed(0)+' for your hcp')+
    stat(a.threePct.toFixed(0)+'%','three-putts','vs ~'+Math.round(bench('tp',D.hcp))+'% for your hcp',a.threePct>bench('tp',D.hcp))+
    stat(a.onePct.toFixed(0)+'%','one-putts','')+
    stat(a.pGirAvg.toFixed(2),'putts after a GIR','2.0 is the baseline',a.pGirAvg>2);
  const pn=$('puttNote');
  if(a.threePct>bench('tp',D.hcp))pn.textContent=`Distance control is the lever in this view — your three-putt rate (${a.threePct.toFixed(0)}%) is above a ${D.hcp}'s ~${Math.round(bench('tp',D.hcp))}%. Getting first putts inside 3 feet turns threes into twos.`;
  else pn.textContent=`Your putting is holding up in this slice — three-putt rate (${a.threePct.toFixed(0)}%) is at or better than a ${D.hcp}'s ~${Math.round(bench('tp',D.hcp))}%.`;
  const pd=a.puttDist;
  draw('pdist',{type:'bar',data:{labels:['1 putt','2 putts','3 putts','4+ putts'],
    datasets:[{data:[pd[1]||0,pd[2]||0,pd[3]||0,pd[4]||0],
    backgroundColor:['#4ea87a','#7c8f84','#e08a3c','#e35a50'],borderRadius:5,borderSkipped:'start',barThickness:56}]},
    plugins:[topLab],options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},
    plugins:{legend:{display:false},tooltip:{enabled:false}},
    scales:{x:{grid:{display:false},border:{display:false}},y:{grid:{color:GRID},border:{display:false},title:{display:true,text:'holes'}}}}});
  // 3-putts per round
  const per=filtered().slice().sort((a,b)=>a.date<b.date?-1:1).map(r=>{let t=0;r.holes.forEach(h=>{if(h.putts>=3)t++;});return {date:r.date,t,n:r.n};});
  draw('p3r',{type:'bar',data:{labels:per.map(p=>p.date.slice(5)),datasets:[{
    data:per.map(p=>p.t),backgroundColor:'#e35a50',borderRadius:4,borderSkipped:'start'}]},
    plugins:[topLab],options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:16}},
    plugins:{legend:{display:false},tooltip:{enabled:false}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:11}}},y:{grid:{color:GRID},border:{display:false},title:{display:true,text:'3-putts'},ticks:{precision:0}}}}});
  // --- GIR vs non-GIR + putts by approach distance ---
  let H=[]; filtered().forEach(r=>r.holes.forEach(h=>H.push(h)));
  const med=a=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y);const m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;};
  const avgP=arr=>arr.length?arr.reduce((s,h)=>s+(h.putts||0),0)/arr.length:0;
  const fpOf=arr=>med(arr.filter(h=>h.pd&&h.pd.length).map(h=>h.pd[0]));
  const G=H.filter(h=>h.gir===1), NG=H.filter(h=>h.gir===0);
  const pG=avgP(G), pNG=avgP(NG), fG=fpOf(G), fNG=fpOf(NG);
  const gch=$('gcHead'), gcn=$('gcNote');
  if(!G.length || !NG.length){
    $('gcHit').textContent = G.length? pG.toFixed(2):'–';
    $('gcHitF').textContent = G.length? Math.round(fG)+' ft first putt':'';
    $('gcMiss').textContent = NG.length? pNG.toFixed(2):'–';
    $('gcMissF').textContent = NG.length? Math.round(fNG)+' ft first putt':'';
    gch.textContent='Putts on greens hit vs missed';
    gcn.textContent='This filter only has '+(G.length?'greens you hit':'greens you missed')+', so there\'s nothing to compare against. Widen the filter to see the split.';
  } else {
  $('gcHit').textContent=pG.toFixed(2);
  $('gcHitF').textContent=Math.round(fG)+' ft first putt';
  $('gcMiss').textContent=pNG.toFixed(2);
  $('gcMissF').textContent=Math.round(fNG)+' ft first putt';
  if(pG>pNG+0.1){gch.textContent='You putt worse on greens you hit.';
    gcn.innerHTML=`You average <b>${pG.toFixed(2)}</b> putts after hitting a green but only <b>${pNG.toFixed(2)}</b> after missing one — because your approaches finish ~${Math.round(fG)} ft away while your chips finish ~${Math.round(fNG)} ft closer. That's not a putting flaw; it's approach proximity. Tighter approaches would cut putts on your best holes.`;}
  else if(pNG>pG+0.1){gch.textContent='You putt better on greens you hit.';
    gcn.innerHTML=`You average <b>${pG.toFixed(2)}</b> putts on greens hit vs <b>${pNG.toFixed(2)}</b> on greens missed — the normal pattern, meaning your chips aren't finishing as close as your approaches in this view.`;}
  else{gch.textContent='Putts on greens hit vs missed are about even.';
    gcn.innerHTML=`<b>${pG.toFixed(2)}</b> vs <b>${pNG.toFixed(2)}</b> — your chip proximity and approach proximity are landing you about the same distance from the hole.`;}
  }
  // putts by approach distance (combo: bars=avg putts, line=first-putt ft)
  const bands=[[0,25,'<25'],[25,50,'25–50'],[50,100,'50–100'],[100,150,'100–150'],[150,200,'150–200'],[200,999,'200+']];
  const B={}; bands.forEach(b=>B[b[2]]={p:[],fp:[]});
  H.forEach(h=>{if(h.appd==null)return;for(const bb of bands){if(h.appd>=bb[0]&&h.appd<bb[1]){B[bb[2]].p.push(h.putts||0);if(h.pd&&h.pd.length)B[bb[2]].fp.push(h.pd[0]);break;}}});
  const labs=bands.map(b=>b[2]).filter(l=>B[l].p.length);
  const avgPutts=labs.map(l=>+(B[l].p.reduce((x,y)=>x+y,0)/B[l].p.length).toFixed(2));
  const firstP=labs.map(l=>Math.round(med(B[l].fp)));
  const ns=labs.map(l=>B[l].p.length);
  draw('puttByDist',{data:{labels:labs,datasets:[
    {type:'bar',label:'avg putts',data:avgPutts,backgroundColor:'#4ea87a',borderRadius:4,borderSkipped:'start',yAxisID:'y',order:2},
    {type:'line',label:'first-putt ft',data:firstP,borderColor:'#c9a24a',backgroundColor:'#c9a24a',pointRadius:3,pointBackgroundColor:'#c9a24a',borderWidth:2,tension:.25,yAxisID:'y1',order:1}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'top',labels:{boxWidth:11,font:{size:11}}},tooltip:{enabled:true,callbacks:{afterBody:items=>'from '+ns[items[0].dataIndex]+' holes'}}},
      scales:{x:{grid:{display:false},border:{display:false},title:{display:true,text:'approach distance (yds)'}},
        y:{position:'left',grid:{color:GRID},border:{display:false},suggestedMin:1.5,suggestedMax:3,title:{display:true,text:'avg putts'}},
        y1:{position:'right',grid:{display:false},border:{display:false},suggestedMin:0,title:{display:true,text:'first putt (ft)'}}}}});
  const worst=labs.length?labs[avgPutts.indexOf(Math.max(...avgPutts))]:null;
  $('pbdNote').innerHTML = worst? `Your first putt — and your putt count — climbs with approach distance. You're highest from <b>${worst} yds</b> (${Math.max(...avgPutts).toFixed(2)} putts). The putts follow the approach, not the stroke.` : 'Not enough approach data in this filter.';
  // --- fringe-putt sensitivity (Air data-quality what-if) ---
  root.querySelectorAll('[data-fr]').forEach(b=>b.classList.toggle('on',+b.dataset.fr===frT));
  const frK=H.length?18/H.length:0;
  const frTot=H.reduce((s,h)=>s+(h.putts||0),0);
  const frIsAff=h=>h.pd&&h.pd.length&&h.pd[0]>=frT&&(h.putts||0)>=1;
  const frAff=H.filter(frIsAff).length;
  const frP18r=frTot*frK, frP18a=(frTot-frAff)*frK;
  const frTpR=H.filter(h=>(h.putts||0)>=3).length;
  const frTpA=H.filter(h=>((h.putts||0)-(frIsAff(h)?1:0))>=3).length;
  const frBR=(frTot-2*H.length)*frK, frBA=(frTot-frAff-2*H.length)*frK;
  const frPct=v=>H.length?Math.round(100*v/H.length):0;
  $('frQuad').innerHTML=
    `<div><span>Putts / 18</span><b>${frP18r.toFixed(1)} → ${frP18a.toFixed(1)}</b></div>`+
    `<div><span>Three-putt rate</span><b>${frPct(frTpR)}% → ${frPct(frTpA)}%</b></div>`+
    `<div><span>Putting strokes / 18</span><b>${frBR>=0?'+':''}${frBR.toFixed(1)} → ${frBA>=0?'+':''}${frBA.toFixed(1)}</b></div>`+
    `<div><span>First putts reclassified</span><b>${frAff} of ${H.length}</b></div>`;
  const frN=$('frNote');
  if(!frAff)frN.textContent=`No first putts logged from ${frT}+ ft in this filter — nothing to reclassify at this threshold. Every number on the dashboard uses the data as recorded.`;
  else frN.innerHTML=`If the <b>${frAff}</b> first putts logged from ${frT}+ ft were really fringe strokes, you're a <b>${frP18a.toFixed(1)}</b>-putts-per-18 putter with a <b>${frPct(frTpA)}%</b> three-putt rate (${frTpR-frTpA} three-putt${frTpR-frTpA===1?'':'s'} evaporate), and putting's share of the decomposition drops from ${frBR>=0?'+':''}${frBR.toFixed(1)} to ${frBA>=0?'+':''}${frBA.toFixed(1)} per 18 — pushing more of the leak toward the short game. This card is a what-if; every other number on the dashboard uses the data as recorded.`;
}
function stat(n,l,sub,red){return `<div class="kpi ${red?'leak':''}"><p class="lab">${l}</p><p class="val">${n}</p>${sub?`<p style="font-size:11px;color:var(--muted2);margin:5px 0 0">${sub}</p>`:''}</div>`;}

// ---- Off the tee ----
let drvMin;
function renderTee(){
  const a=agg(filtered());
  $('tstats').innerHTML=
    stat(a.drvAvg+'y','driver avg','')+stat(a.drvMed+'y','median','')+
    stat(a.drvLong+'y','longest','')+stat(a.fwPct.toFixed(0)+'%','fairways','');
  // histogram
  const buckets={};[180,200,220,240,260,280].forEach(b=>buckets[b]=0);
  a.driver.forEach(d=>{const b=Math.min(280,Math.max(180,Math.floor(d/20)*20));buckets[b]=(buckets[b]||0)+1;});
  draw('drvh',{type:'bar',data:{labels:['180s','200s','220s','240s','260s','280s+'],
    datasets:[{data:[buckets[180],buckets[200],buckets[220],buckets[240],buckets[260],buckets[280]],
    backgroundColor:'#3f78c4',borderRadius:4,borderSkipped:'start',barThickness:42}]},
    plugins:[topLab],options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:16}},
    plugins:{legend:{display:false},tooltip:{enabled:false}},
    scales:{x:{grid:{display:false},border:{display:false}},y:{grid:{color:GRID},border:{display:false},title:{display:true,text:'drives'}}}}});
  // fairway accuracy
  draw('fwacc',{type:'bar',data:{labels:['Hit','Miss L','Miss R'],datasets:[{
    data:[a.fw,a.fwL,a.fwR],backgroundColor:['#4ea87a','#c9a24a','#e08a3c'],borderRadius:5,borderSkipped:'start',barThickness:56}]},
    plugins:[topLab],options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},
    plugins:{legend:{display:false},tooltip:{enabled:false}},
    scales:{x:{grid:{display:false},border:{display:false}},y:{grid:{color:GRID},border:{display:false},title:{display:true,text:'tee shots'}}}}});
  updateDrvSlider();
}
function updateDrvSlider(){
  const a=agg(filtered());
  const over=a.driver.filter(d=>d>=drvMin);
  const pct=a.driver.length?Math.round(100*over.length/a.driver.length):0;
  const avg=over.length?Math.round(over.reduce((x,y)=>x+y,0)/over.length):0;
  $('drvMinV').textContent=drvMin+'y';
  $('drvOut').innerHTML=`<b>${over.length}</b> of ${a.driver.length} drives (${pct}%) carried ${drvMin}y+ &nbsp;·&nbsp; averaging <b>${avg}y</b>`;
}

// ---- The bag ----
let selClub;
function renderBag(){
  // gapping ladder (smart distances)
  const L=D.ladder;
  const cols=L.map(r=>C[r.cat]);
  draw('ladder',{type:'bar',data:{labels:L.map(r=>r.name),datasets:[{data:L.map(r=>r.dist),
    backgroundColor:cols,borderRadius:4,borderSkipped:'start',barThickness:18}]},
    plugins:[endLab],options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,layout:{padding:{right:60}},
    plugins:{legend:{display:false},tooltip:{enabled:false}},
    scales:{x:{suggestedMax:290,grid:{color:GRID},border:{display:false},ticks:{callback:v=>v+'y'}},
      y:{grid:{display:false},border:{display:false},ticks:{font:{size:12}}}}}});
  charts['ladder'].$lab=L.map(r=>r.dist+'y · '+r.shots);charts['ladder'].update();
  updateGapThreshold();
  // chips
  const ch=$('clubchips');
  ch.innerHTML=D.clubs.map((c,i)=>`<div class="chip ${i===selClub?'on':''}">
    <div class="cd"><span class="cc" style="background:${C[c.cat]}"></span>${c.name}</div><div class="cn">${c.med}y · ${c.count} shots</div></div>`).join('');
  ch.querySelectorAll('.chip').forEach((el,i)=>{el.onclick=()=>{selClub=i;renderClub();};});
  renderClub();
}
let gapThresh;
function updateGapThreshold(){
  const L=D.ladder;let html='';
  for(let i=1;i<L.length;i++){const g=L[i-1].dist-L[i].dist; if(g>=gapThresh)html+=`<span style="color:var(--flag)">${L[i-1].name}→${L[i].name} (${g}y)</span> `;}
  let ov='';for(let i=1;i<L.length;i++){if(L[i-1].dist-L[i].dist<=4)ov+=`${L[i-1].name}/${L[i].name} `;}
  $('gapThreshV').textContent=gapThresh+'y';
  $('gapOut').innerHTML = (html? ('Gaps ≥ '+gapThresh+'y: '+html) : ('No gaps ≥ '+gapThresh+'y.')) + (ov? `<br><span style="color:var(--brass)">Overlapping (same distance): ${ov}</span>` : '');
}
function renderClub(){
  root.querySelectorAll('#clubchips .chip').forEach((el,i)=>el.classList.toggle('on',i===selClub));
  const c=D.clubs[selClub];
  $('clubTitle').innerHTML=`${c.name} <span style="color:var(--muted2);font-weight:400;font-size:13px">· ${c.med}y median · ${c.full} full-swing shots · range ${c.min}–${c.max}y</span>`;
  // histogram of distances
  const lo=Math.floor(c.min/10)*10, hi=Math.ceil(c.max/10)*10;
  const bins={};for(let b=lo;b<hi;b+=10)bins[b]=0;
  c.dists.forEach(d=>{const b=Math.min(hi-10,Math.floor(d/10)*10);bins[b]=(bins[b]||0)+1;});
  const labels=Object.keys(bins);
  draw('clubhist',{type:'bar',data:{labels:labels.map(b=>b+'–'+(+b+10)),datasets:[{
    data:labels.map(b=>bins[b]),backgroundColor:C[c.cat],borderRadius:3,borderSkipped:'start'}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{enabled:true}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:10},maxRotation:0,autoSkip:true}},y:{grid:{color:GRID},border:{display:false},ticks:{precision:0},title:{display:true,text:'shots'}}}}});
}

// ---- Rounds ----
let openRound;
function renderRounds(){
  const rs=filtered().slice().sort((a,b)=>a.date<b.date?1:-1);
  $('rndlist').innerHTML=rs.map(r=>{
    const a=agg([r]);
    return `<div class="rnd ${openRound===r.id?'on':''}" data-rid="${r.id}">
      <div class="rd">${fmtDate(r.date)}</div><div class="rc">${r.course}</div>
      <div><span class="big">${r.score}</span><span class="ou">+${r.ou} · ${r.n} holes</span></div>
      <div class="rrow"><span>18-pace</span><b>${r.pace18}</b></div>
      <div class="rrow"><span>Greens</span><b>${a.gir}/${a.girN}</b></div>
      <div class="rrow"><span>Putts</span><b>${a.putts.reduce((x,y)=>x+y,0)}</b></div>
    </div>`;
  }).join('') || '<p style="color:var(--muted2)">No rounds in this filter.</p>';
  root.querySelectorAll('#rndlist .rnd').forEach(el=>{el.onclick=()=>{const id=+el.dataset.rid;openRound=(openRound===id?null:id);renderRounds();};});
  const sc=$('scwrap');
  if(openRound!=null){
    const r=D.rounds.find(x=>x.id===openRound), H=r.holes;
    const girN=H.filter(h=>h.gir!=null).length, gir=H.filter(h=>h.gir===1).length;
    const fwN=H.filter(h=>h.fw!=null).length, fw=H.filter(h=>h.fw===1).length;
    const putts=H.reduce((s,h)=>s+(h.putts||0),0);
    const oneP=H.filter(h=>h.putts===1).length, threeP=H.filter(h=>h.putts>=3).length;
    const ng=H.filter(h=>h.gir===0), scrSaves=ng.filter(h=>h.score-h.par<=0).length;
    const pen=H.reduce((s,h)=>s+(h.pen||0),0);
    const drives=H.filter(h=>h.drv!=null).map(h=>h.drv), longest=drives.length?Math.max(...drives):0;
    const birdies=H.filter(h=>h.score-h.par<=-1).length, pars=H.filter(h=>h.score-h.par===0).length,
          bogeys=H.filter(h=>h.score-h.par===1).length, doubles=H.filter(h=>h.score-h.par>=2).length;
    const girPct=girN?100*gir/girN:0, puttsPH=H.filter(h=>h.putts!=null).length?putts/H.filter(h=>h.putts!=null).length:0;
    const AH=D.rounds.flatMap(x=>x.holes);
    const aGirN=AH.filter(h=>h.gir!=null).length, aGirPct=aGirN?100*AH.filter(h=>h.gir===1).length/aGirN:0;
    const aPuttsPH=AH.filter(h=>h.putts!=null).length?AH.reduce((s,h)=>s+(h.putts||0),0)/AH.filter(h=>h.putts!=null).length:0;
    const cmpH=(v,b)=>v>b*1.08?'above':v<b*0.92?'below':'about';
    const cmpL=(v,b)=>v<b*0.94?'better than':v>b*1.06?'worse than':'about';
    const appOf=h=>{if(!h.ap||!h.ap.length)return null;let best=h.ap[0];h.ap.forEach(x=>{if(x[1]<best[1])best=x;});return best;};
    const tile=(v,l)=>`<div class="rtile"><div class="rt-v">${v}</div><div class="rt-l">${l}</div></div>`;
    let cum=0; const shape=H.map(h=>{cum+=h.score-h.par;return cum;});
    let rows=H.map(h=>{
      const df=h.score-h.par, cls=df>=2?'b-dbl':df<=-1?'b-bird':'';
      const ap=appOf(h), apTxt=ap?`${ap[0]}y→${ap[1]}ft`:'—', fp=(h.pd&&h.pd.length)?h.pd[0]+'ft':'—';
      return `<tr><td>${h.h}</td><td>${h.par}</td><td class="${cls}">${h.score}</td>
        <td>${h.drv?h.drv+'y':'—'}</td>
        <td class="${h.fw===1?'yes':'no'}">${h.fw===1?'✓':h.fw===0?(h.miss||'✗'):'—'}</td>
        <td style="color:var(--muted);font-size:11.5px">${apTxt}</td>
        <td class="${h.gir===1?'yes':'no'}">${h.gir===1?'✓':h.gir===0?'–':''}</td>
        <td>${fp}</td><td>${h.putts!=null?h.putts:'–'}</td></tr>`;}).join('');
    sc.innerHTML=`<div class="card"><h4>${r.course} · ${fmtDate(r.date)}</h4>
      <p class="cap">Score ${r.score} (+${r.ou}) over ${r.n} holes · 18-pace ${r.pace18}</p>
      <div class="rtiles">
        ${tile(gir+'/'+girN,'Greens')}${tile(fw+'/'+fwN,'Fairways')}${tile(putts,'Putts')}${tile(oneP,'1-putts')}
        ${tile(threeP,'3-putts')}${tile(scrSaves+'/'+ng.length,'Scrambles')}${tile(pen,'Penalties')}${tile(longest?longest+'y':'—','Longest')}
      </div>
      <p class="rmix"><b>${birdies}</b> birdie · <b>${pars}</b> par · <b>${bogeys}</b> bogey · <b>${doubles}</b> double+</p>
      <p class="rvs">Greens <b>${cmpH(girPct,aGirPct)}</b> your ${aGirPct.toFixed(0)}% average · putting <b>${cmpL(puttsPH,aPuttsPH)}</b> your usual (${puttsPH.toFixed(2)} vs ${aPuttsPH.toFixed(2)}/hole).</p>
      <div class="chartbox" style="height:150px"><canvas id="roundShape"></canvas></div>
      <p class="cap" style="margin:2px 0 12px;font-size:11px">Cumulative strokes over par through the round — where it moved.</p>
      <div class="scorecard"><table class="sc"><thead><tr><th>Hole</th><th>Par</th><th>Score</th><th>Drive</th><th>FIR</th><th>Approach</th><th>GIR</th><th>1st putt</th><th>Putts</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
      <p class="note">Approach = distance into the green → how close it finished. FIR: ✓ hit, L/R = miss side, — = par 3.</p></div>`;
    draw('roundShape',{type:'line',data:{labels:H.map(h=>h.h),datasets:[{data:shape,borderColor:'#e08a3c',backgroundColor:'rgba(224,138,60,.12)',fill:true,tension:.25,pointRadius:2.5,pointBackgroundColor:'#e08a3c',pointBorderColor:'#0e1a14',pointBorderWidth:1.5,borderWidth:2}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{enabled:true,callbacks:{title:c=>'Through hole '+c[0].label,label:c=>(c.parsed.y>=0?'+':'')+c.parsed.y+' vs par'}}},scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:9}}},y:{grid:{color:GRID},border:{display:false},ticks:{precision:0,callback:v=>(v>=0?'+':'')+v}}}}});
  } else sc.innerHTML='<p style="color:var(--muted2);font-size:13px">Click a round to see its full report.</p>';
}

// ---- Scoring Anatomy ----
function renderAnatomy(){
  const rs=filtered();
  let H=[]; rs.forEach(r=>r.holes.forEach(h=>H.push(h)));
  const nonGir=H.filter(h=>h.gir===0), gir=H.filter(h=>h.gir===1);
  const scrN=nonGir.filter(h=>h.score-h.par<=0).length;
  const scrPct=nonGir.length?Math.round(100*scrN/nonGir.length):0;
  const bad=H.filter(h=>h.score-h.par>=1);
  const badMiss=bad.filter(h=>h.gir===0).length;
  const missPct=bad.length?Math.round(100*badMiss/bad.length):0, puttPct=bad.length?100-missPct:0;
  const dbl=H.filter(h=>h.score-h.par>=2);
  const dblMiss=dbl.filter(h=>h.gir===0).length, dblPen=dbl.filter(h=>h.pen>0).length, dbl3p=dbl.filter(h=>h.putts>=3&&h.gir===1).length;
  const med=a=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y);const m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;};
  const chip=nonGir.filter(h=>h.pd&&h.pd.length).map(h=>h.pd[0]);
  let m=0,fc=0; H.forEach(h=>{if(!h.pd)return;h.pd.forEach((ft,i)=>{if(ft>=5&&ft<15){fc++;if(i===h.pd.length-1)m++;}});});
  const make515=fc?Math.round(100*m/fc):0;
  const p45=H.filter(h=>h.fw!=null), fwHit=p45.filter(h=>h.fw===1), fwMiss=p45.filter(h=>h.fw===0);
  const gp=a=>a.length?Math.round(100*a.filter(h=>h.gir===1).length/a.length):0;
  $('anstats').innerHTML=
    stat(scrPct+'%','scrambling','vs ~'+Math.round(bench('scr',D.hcp))+'% for your hcp',scrPct<bench('scr',D.hcp))+
    stat(Math.round(med(chip))+'ft','chip proximity','when you miss · tour ~8 ft',med(chip)>12)+
    stat(gir.length+'/'+H.length,'greens hit','')+
    stat(make515+'%','makes 5-15ft','the putts that save pars',make515<30);
  // --- 4-bucket strokes decomposition (exact: sums to over-par) + vs-13.7 verdicts ---
  const k=H.length?18/H.length:0;
  const putting=H.reduce((s,h)=>s+(h.putts-2),0);
  const penalty=H.reduce((s,h)=>s+(h.pen||0),0);
  const shortgame=H.reduce((s,h)=>s+(h.dc||0),0);
  const totalOver=H.reduce((s,h)=>s+(h.score-h.par),0);
  const approach=totalOver-putting-penalty-shortgame;
  const buckets=[['Approach',approach,'#e35a50'],['Putting',putting,'#c9a24a'],['Penalties',penalty,'#3f78c4'],['Short game',shortgame,'#6f8579']];
  const posTot=buckets.reduce((s,b)=>s+Math.max(0,b[1]),0)||1;
  $('decompbar').innerHTML=buckets.map(b=>{const w=Math.max(0,b[1])/posTot*100;return w>0?`<div class="seg" style="width:${w}%;background:${b[2]}">${w>9?Math.round(w)+'%':''}</div>`:'';}).join('');
  $('decompkey').innerHTML=buckets.map(b=>`<span><i style="background:${b[2]}"></i>${b[0]} ${(b[1]*k>=0?'+':'')}${(b[1]*k).toFixed(1)}/18</span>`).join('');
  // per-phase benchmark stat + verdict
  const drv=H.filter(h=>h.drv).map(h=>h.drv);
  const drvMed=drv.length?med(drv):0;
  const putts18=H.length?H.reduce((s,h)=>s+h.putts,0)/H.length*18:0;
  const tpPct=H.length?100*H.filter(h=>h.putts>=3).length/H.length:0;
  const pen18=penalty*k, girPctA=H.length?100*gir.length/H.length:0;
  const bGirF=bench('gir',D.hcp),bScrF=bench('scr',D.hcp),bPutF=bench('putts',D.hcp),bPenF=bench('pen',D.hcp);
  const bScr=Math.round(bScrF),bGir=Math.round(bGirF),bPut=bPutF,bTp=Math.round(bench('tp',D.hcp)),bPen=bPenF,bDrv=Math.round(bench('drv',D.hcp));
  $('decompTitle').textContent=`Where your strokes go — and where you lose vs a ${D.hcp}`;
  function lvh(ph,strk,cmp,win,tag){const cls=win===1?'win':win===-1?'lose':'flat';return `<div class="lvh-card ${cls}"><div class="lvh-ph">${ph}</div><div class="lvh-str">${strk>=0?'+':''}${strk.toFixed(1)}<span>str/18</span></div><div class="lvh-cmp">${cmp}</div><span class="lvh-tag ${cls}">${tag}</span></div>`;}
  const cards=[
    lvh('Approach', approach*k, `${Math.round(girPctA)}% greens vs ~${bGir}% · ${drvMed}y vs ~${bDrv}y`, girPctA>bGirF?1:-1, girPctA>bGirF?'Strength':'Leak'),
    lvh('Short game', shortgame*k, `${scrPct}% scrambling vs ~${bScr}% — most of its cost hides in Approach &amp; Putting`, scrPct<bScrF?-1:1, scrPct<bScrF?'Leak':'Strength'),
    lvh('Putting', putting*k, `${Math.round(putts18)} putts/18 &amp; ${Math.round(tpPct)}% 3-putts vs ~${Math.round(bPut)} &amp; ${bTp}% · Air may over-count putts`, putts18>bPutF?-1:1, putts18>bPutF?'Leak':'Strength'),
    lvh('Off the tee', penalty*k, `${pen18.toFixed(1)} penalties/18 vs ~${bPen.toFixed(1)} · ${drvMed}y is a weapon`, pen18>bPenF?-1:0, pen18>bPenF?'Leak':'Even'),
  ];
  $('lvhGrid').innerHTML=cards.join('');
  $('decomptext').innerHTML=`Approach is your biggest <em>bucket</em> only because everyone misses some greens — but at <b>${Math.round(girPctA)}%</b> you hit more than a ${D.hcp}'s ~${bGir}%, so it's actually a strength. The real leaks are the short game (a <b>${scrPct}%</b> scramble rate turns missed greens into bogeys) and putting (<b>${Math.round(putts18)}</b> putts/18). Short game looks small in the bar because a blown up-and-down surfaces as an extra putt or the green miss itself — the ${scrPct}%-vs-~${bScr}% gap is the engine behind both other buckets. Note: Arccos Air has no putter sensor and may log fringe strokes as putts, so treat the putting figure as a ceiling — the toggle on the Putting tab sizes the band.`;
  draw('scrchart',{type:'bar',data:{labels:['You','Your hcp','Tour'],datasets:[{data:[scrPct,Math.round(bench('scr',D.hcp)),58],backgroundColor:['#e35a50','#5e9c7e','#4ea87a'],borderRadius:5,borderSkipped:'start',barThickness:54}]},
    plugins:[topLab],options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{grid:{display:false},border:{display:false}},y:{grid:{color:GRID},border:{display:false},max:70,ticks:{callback:v=>v+'%'}}}}});
  charts['scrchart'].$fmt=v=>v+'%';charts['scrchart'].update();
  draw('cascade',{type:'bar',data:{labels:['Fairway hit','Fairway missed'],datasets:[{data:[gp(fwHit),gp(fwMiss)],backgroundColor:['#4ea87a','#c9a24a'],borderRadius:5,borderSkipped:'start',barThickness:54}]},
    plugins:[topLab],options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{grid:{display:false},border:{display:false}},y:{grid:{color:GRID},border:{display:false},max:100,ticks:{callback:v=>v+'%'}}}}});
  charts['cascade'].$fmt=v=>v+'%';charts['cascade'].update();
  $('dblanat').innerHTML=
    `<li><b>${dbl.length}</b> doubles or worse in this view</li>`+
    `<li><b>${dbl.length?Math.round(100*dblMiss/dbl.length):0}%</b> missed the green</li>`+
    `<li><b>${dbl.length?Math.round(100*dblPen/dbl.length):0}%</b> involved a penalty</li>`+
    `<li><b>${dbl3p}</b> were a three-putt from a green you hit</li>`;
  const ah=$('anHead'),asub=$('anSub');
  if(girPctA>bGirF && (putts18>bPutF || scrPct<bScrF)){ah.textContent=`You strike it better than a ${D.hcp}. You lose it on and around the green.`;asub.innerHTML=`You hit <b>${Math.round(girPctA)}%</b> of greens (vs ~${bGir}% for a ${D.hcp}) and carry it ${drvMed}y — real ball-striking strength. The strokes pile up after you reach the green area: a <b>${scrPct}%</b> scramble rate and <b>${Math.round(putts18)}</b> putts/18 are what hold the score back.`;}
  else if(scrPct<bScrF){ah.textContent='The leak in this slice is the short game.';asub.innerHTML=`Your scramble rate is <b>${scrPct}%</b> vs ~${bScr}% for a ${D.hcp} — missed greens are turning into dropped shots. Ball-striking (<b>${Math.round(girPctA)}%</b> greens) is keeping you in it.`;}
  else{ah.textContent='Tidy in this slice — the leaks are narrow.';asub.innerHTML=`In this filter your scramble rate (<b>${scrPct}%</b>) and putting (<b>${Math.round(putts18)}</b>/18) are close to a ${D.hcp}, with <b>${Math.round(girPctA)}%</b> greens hit.`;}
  const tt=$('threadText');
  if(make515<30)tt.innerHTML=`Your make rate from <b style="color:var(--ink)">5–15 feet</b> is <b>${make515}%</b> in this view — the same putts decide whether you save par after a chip <em>and</em> whether you avoid a three-putt. That one range pays off on both your good holes and your bad ones, which makes it the highest-leverage thing to practice — and it's a specific-distance problem, not "putt better."`;
  else tt.innerHTML=`Your make rate from <b style="color:var(--ink)">5–15 feet</b> is <b>${make515}%</b> here — solid. When this range holds up, both your three-putt avoidance and your up-and-down saves improve together, which is why it's the range that matters most either way.`;
}

// ---- Takeaways ----
function takeCard(cls,title,stat,body){return `<div class="take ${cls}"><div class="th"><p class="tt">${title}</p><div class="ts">${stat}</div></div><p class="tb">${body}</p></div>`;}
function renderTakeaways(){
  const a=agg(filtered());
  const par=(p)=> a.sN[p]? +(a.sSum[p]/a.sN[p]-p).toFixed(2) : null;
  const penRd = a.nRounds? a.penTot/a.nRounds : null;
  const conv = a.girHoles? 100*a.girPB/a.girHoles : null;
  // each signal: dir low=lower-better, high=higher-better; good/bad thresholds; value; label+body per bucket
  const S=[
    {dir:'low',good:12,bad:20,val:a.hp?a.threePct:null,stat:Math.round(a.threePct)+'%',
      sl:'Putting',fl:'Lag putting',
      sb:`Sharp on the greens in this view — ${Math.round(a.threePct)}% three-putts and ${a.pGirAvg.toFixed(2)} putts per green hit. This is what good looks like for you.`,
      fb:`Of the ${a.girHoles} greens you hit, ${a.girHoles?Math.round(100*a.girBog/a.girHoles):0}% slipped to bogey or worse — almost all three-putts (${a.pGirAvg.toFixed(2)} putts per green). First-putt speed is the lever: get long putts inside 3 feet.`},
    {dir:'high',good:245,bad:215,val:a.driver.length?a.drvMed:null,stat:a.drvMed+'y',
      sl:'Distance off the tee',fl:'Tee-shot distance',
      sb:`Median ${a.drvMed}y — long for your level and Arccos's top-graded part of your game. Build around it.`,
      fb:`Driver is playing short here (median ${a.drvMed}y) versus your usual length.`},
    {dir:'high',good:38,bad:25,val:a.girN?a.girPct:null,stat:Math.round(a.girPct)+'%',
      sl:'Hitting greens',fl:'Hitting greens',
      sb:`${a.girHoles} greens in regulation (${Math.round(a.girPct)}%) — more than your handicap suggests. You manufacture chances.`,
      fb:`${Math.round(a.girPct)}% greens in this slice — more iron consistency would feed your whole scorecard.`},
    {dir:'high',good:55,bad:42,val:a.fwN?a.fwPct:null,stat:Math.round(a.fwPct)+'%',
      sl:'Fairways',fl:'Fairway accuracy',
      sb:`${Math.round(a.fwPct)}% fairways — finding the short grass and setting up your approaches.`,
      fb:`${Math.round(a.fwPct)}% fairways — long but loose. Tighter tee shots, or clubbing down on trouble holes, trims the big numbers.`},
    {dir:'low',good:0.8,bad:1.8,val:penRd,stat:(penRd!=null?penRd.toFixed(1):'0')+'/rd',
      sl:'Keeping it in play',fl:'Penalty trouble',
      sb:`Only ${penRd!=null?penRd.toFixed(1):'0'} penalty strokes a round — your misses stay in play. Long, not wild.`,
      fb:`${penRd!=null?penRd.toFixed(1):'0'} penalty strokes a round${a.penAvg!=null?`, averaging +${a.penAvg.toFixed(1)} on those holes`:''}. Club down on genuinely tight holes.`},
    {dir:'low',good:12,bad:20,val:a.nH?100*a.dblTotal/a.nH:null,stat:Math.round(100*a.dblTotal/Math.max(1,a.nH))+'%',
      sl:'Avoiding big numbers',fl:'Big numbers',
      sb:`Only ${Math.round(100*a.dblTotal/a.nH)}% of holes are double-or-worse — you avoid the card-wreckers.`,
      fb:`${Math.round(100*a.dblTotal/a.nH)}% of holes are double-or-worse${a.dblPar4?`, ${a.dblPar4} of ${a.dblTotal} on par 4s`:''}. Usually a missed green plus a forced recovery — one safe play saves the double.`},
    {dir:'low',good:0.6,bad:1.1,val:par(3),stat:par(3)!=null?'+'+par(3).toFixed(2):'—',
      sl:'Par 3s',fl:'Par 3s',
      sb:`+${par(3)!=null?par(3).toFixed(2):''} on par 3s — your steadiest holes. Lean on them.`,
      fb:`+${par(3)!=null?par(3).toFixed(2):''} on par 3s — tee-club selection and commitment would help here.`},
    {dir:'low',good:0.85,bad:1.2,val:par(5),stat:par(5)!=null?'+'+par(5).toFixed(2):'—',
      sl:'Par 5s',fl:'Par 5 scoring',
      sb:`+${par(5)!=null?par(5).toFixed(2):''} on par 5s — turning your length into scoring chances.`,
      fb:`+${par(5)!=null?par(5).toFixed(2):''} on par 5s, your toughest type. Play them as three smart shots, not a hero second.`},
    {dir:'high',good:62,bad:45,val:conv,stat:conv!=null?Math.round(conv)+'%':'—',
      sl:'Cashing your chances',fl:'Converting greens',
      sb:`${conv!=null?Math.round(conv):0}% of greens hit became par-or-better — you cash the chances you create.`,
      fb:`Only ${conv!=null?Math.round(conv):0}% of greens became par-or-better (${a.girHoles?Math.round(100*a.birdies/a.girHoles):0}% birdies). Free strokes already sitting on the green.`},
  ];
  function cls(v,good,bad,dir){
    if(v==null||isNaN(v))return null;
    if(dir==='low'){ if(v<=good)return{b:'s',sev:(good-v)/Math.max(1e-6,bad-good)}; if(v>=bad)return{b:'f',sev:(v-bad)/Math.max(1e-6,bad-good)}; }
    else{ if(v>=good)return{b:'s',sev:(v-good)/Math.max(1e-6,good-bad)}; if(v<=bad)return{b:'f',sev:(bad-v)/Math.max(1e-6,good-bad)}; }
    return {b:'n',sev:0};
  }
  let str=[],foc=[];
  S.forEach(sg=>{const c=cls(sg.val,sg.good,sg.bad,sg.dir);if(!c||c.b==='n')return;
    if(c.b==='s')str.push({sev:c.sev,label:sg.sl,body:sg.sb,stat:sg.stat});
    else foc.push({sev:c.sev,label:sg.fl,body:sg.fb,stat:sg.stat});});
  str.sort((x,y)=>y.sev-x.sev); foc.sort((x,y)=>y.sev-x.sev);
  const topS=str[0],topF=foc[0],ol=$('oneLiner'),osub=$('oneSub');
  if(topS&&topF){ol.textContent=`Ahead on ${topS.label.toLowerCase()}, held back by ${topF.label.toLowerCase()}.`;osub.textContent=`Across the rounds in view, ${topS.label.toLowerCase()} is your clearest strength and ${topF.label.toLowerCase()} is the biggest thing costing you.`;}
  else if(topF){ol.textContent=`Where to focus: ${topF.label.toLowerCase()}.`;osub.textContent=`Nothing rates as a standout strength in this slice — ${topF.label.toLowerCase()} is the clearest thing to work on.`;}
  else if(topS){ol.textContent=`Solid all around — led by ${topS.label.toLowerCase()}.`;osub.textContent=`No glaring weakness shows up in this view.`;}
  else{ol.textContent=`Not enough holes in this filter to call it.`;osub.textContent=`Widen the date range or pick a course with more rounds.`;}
  // strengths
  let s=str.map(it=>takeCard('g',it.label,it.stat,it.body)).join('');
  if(!str.length)s='<p class="emptyt">No standout strengths in this slice — small sample.</p>';
  s+=takeCard('g','Sand play <span class="aw">all rounds</span>','#2',`Arccos grades your sand game (${D.cat.sand}) second only to driving. Account-wide grade — per-shot sand data isn't exportable.`);
  $('strengths').innerHTML=s;
  // focus (ranked, #1 is hot)
  let f=foc.map((it,i)=>`<div class="take ${i===0?'f hot':'f'}"><div class="th"><p class="tt"><span class="rank">${i+1}</span>${it.label}</p><div class="ts">${it.stat}</div></div><p class="tb">${it.body}</p></div>`).join('');
  if(!foc.length)f='<p class="emptyt">Nothing is screaming for attention in this slice — nice.</p>';
  let mg=0,gA='',gB='',dA=0,dB=0;for(let i=1;i<D.ladder.length;i++){if(D.ladder[i].dist>=130)continue;const g=D.ladder[i-1].dist-D.ladder[i].dist;if(g>mg){mg=g;gA=D.ladder[i-1].name;gB=D.ladder[i].name;dA=D.ladder[i-1].dist;dB=D.ladder[i].dist;}}
  if(mg)f+=takeCard('f','Wedge gapping <span class="aw">all rounds</span>',mg+'y',`Biggest gap in your scoring zone is ${gA} (${dA}y) → ${gB} (${dB}y). A club around ${Math.round((dA+dB)/2)}y fills it with a stock swing instead of a half-shot.`);
  $('focus').innerHTML=f;
}

// ---- Benchmarks vs handicap ----
let benchHcp;
function renderBench(){
  if(benchHcp===null)benchHcp=D.hcp;
  const a=agg(filtered());
  const H=[];filtered().forEach(r=>r.holes.forEach(h=>H.push(h)));
  const ng=H.filter(h=>h.gir===0);const scr=ng.length?100*ng.filter(h=>h.score-h.par<=0).length/ng.length:0;
  const penRd=a.nRounds?a.penTot/a.nRounds:0;
  $('benchHcpV').textContent=benchHcp.toFixed(1);
  const defs=[
    ['Scoring per 18',a.pace18,bench('score',benchHcp),'low',v=>v.toFixed(1)],
    ['Greens in regulation',a.girPct,bench('gir',benchHcp),'high',v=>Math.round(v)+'%'],
    ['Fairways hit',a.fwPct,bench('fw',benchHcp),'high',v=>Math.round(v)+'%'],
    ['Driving distance',a.drvAvg,bench('drv',benchHcp),'high',v=>Math.round(v)+'y'],
    ['Putts per 18',a.puttsPerH*18,bench('putts',benchHcp),'low',v=>v.toFixed(1)],
    ['Three-putt rate',a.threePct,bench('tp',benchHcp),'low',v=>Math.round(v)+'%'],
    ['Scrambling',scr,bench('scr',benchHcp),'high',v=>Math.round(v)+'%'],
    ['Penalties per round',penRd,bench('pen',benchHcp),'low',v=>v.toFixed(1)],
  ];
  const C=defs.map(([name,you,b,dir,fmt])=>{
    let frac=dir==='high'?(you-b)/b:(b-you)/b; if(!isFinite(frac))frac=0; frac=Math.max(-1,Math.min(1,frac));
    return {name,you,b,dir,fmt,frac,ahead:frac>=0};
  });
  $('benchrows').innerHTML=C.map(r=>{
    const w=Math.abs(r.frac)*50;
    const bar=r.ahead?`<div class="bt-fill ahead" style="left:50%;width:${w}%"></div>`:`<div class="bt-fill behind" style="left:${50-w}%;width:${w}%"></div>`;
    const gap=r.fmt(Math.abs(r.you-r.b));
    return `<div class="bench-row"><div class="bench-name">${r.name}</div>
      <div class="bench-num you">${r.fmt(r.you)}</div>
      <div class="bench-track"><div class="bt-center"></div>${bar}</div>
      <div class="bench-num avg">${r.fmt(r.b)}</div>
      <div class="bench-badge ${r.ahead?'ahead':'behind'}">${r.ahead?'▲':'▼'} ${gap}</div></div>`;
  }).join('');
  const nAhead=C.filter(r=>r.ahead).length;
  const worst=C.slice().sort((x,y)=>x.frac-y.frac)[0];
  const best=C.slice().sort((x,y)=>y.frac-x.frac)[0];
  const lvl = Math.abs(benchHcp-D.hcp)<0.05? `your own ${D.hcp} handicap` : `a ${benchHcp.toFixed(1)} handicap`;
  $('benchsummary').innerHTML=`Against ${lvl}, you're ahead on <b>${nAhead}</b> of ${C.length}. Biggest edge: <b style="color:#7fd3a4">${best.name.toLowerCase()}</b>. Furthest behind: <b style="color:#f08a82">${worst.name.toLowerCase()}</b>${benchHcp<D.hcp-0.05?' — the gap to close to get there':''}.`;
}

// ---- Approach & scoring yardages ----
function renderApproach(){
  const rs=filtered();
  let H=[]; rs.forEach(r=>r.holes.forEach(h=>H.push(h)));
  const bands=[[50,100,'50-100'],[100,125,'100-125'],[125,150,'125-150'],[150,175,'150-175'],[175,200,'175-200'],[200,400,'200+']];
  const A={}; bands.forEach(b=>A[b[2]]={hit:0,n:0,prox:[]});
  H.forEach(h=>(h.ap||[]).forEach(p=>{const sd=p[0],pf=p[1];for(const bb of bands){if(sd>=bb[0]&&sd<bb[1]){A[bb[2]].n++;if(pf<=33)A[bb[2]].hit++;A[bb[2]].prox.push(pf);break;}}}));
  const med=a=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y);const m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;};
  const labs=bands.map(b=>b[2]).filter(l=>A[l].n>0);
  draw('apHit',{type:'bar',data:{labels:labs,datasets:[{data:labs.map(l=>Math.round(100*A[l].hit/A[l].n)),backgroundColor:'#4ea87a',borderRadius:4,borderSkipped:'start',barThickness:40}]},
    plugins:[topLab],options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:11}}},y:{grid:{color:GRID},border:{display:false},max:100,title:{display:true,text:'hit green %'},ticks:{callback:v=>v+'%'}}}}});
  charts['apHit'].$fmt=v=>v+'%';charts['apHit'].update();
  draw('apProx',{type:'bar',data:{labels:labs,datasets:[
    {label:'You',data:labs.map(l=>Math.round(med(A[l].prox))),backgroundColor:'#c9a24a',borderRadius:4,borderSkipped:'start'},
    {label:'Tour',data:labs.map(l=>TOURPROX[l]||null),backgroundColor:'#39564a',borderRadius:4,borderSkipped:'start'}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'top',labels:{boxWidth:11,font:{size:11}}},tooltip:{enabled:true,callbacks:{label:c=>c.dataset.label+': '+c.parsed.y+' ft'}}},scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:11}}},y:{grid:{color:GRID},border:{display:false},title:{display:true,text:'feet from pin'}}}}});
  // dynamic insight from wedge band
  const w=A['50-100'];
  const ah=$('apHead'),asub=$('apSub');
  if(w&&w.n){const wp=Math.round(med(w.prox));
    ah.textContent=`From wedge range you're leaving it ${wp} feet.`;
    asub.innerHTML=`From 50–100 yards you finish about <b>${wp} ft</b> from the pin (tour ~${TOURPROX['50-100']} ft) and hit the green <b>${Math.round(100*w.hit/w.n)}%</b> of the time. Tighter approaches here is the upstream fix for both leaks — closer shots mean more greens hit and shorter first putts on the ones you do.`;}
  else {ah.textContent='Approach proximity by distance.';asub.textContent='Not enough approach shots in this filter to break down.';}

  // --- proximity by club + miss pattern (from agr: [club,startYd,proxFt,crossFt,alongFt]) ---
  const AG=[]; H.forEach(h=>{if(h.agr)AG.push(h.agr);});
  const byClub={}; AG.forEach(a=>{(byClub[a[0]]=byClub[a[0]]||[]).push(a[2]);});
  const CORDER=['3H','4i','5i','6i','7i','8i','9i','PW','GW','56°','60°'];
  const pcRows=CORDER.filter(c=>byClub[c]&&byClub[c].length>=3).map(c=>({c,n:byClub[c].length,m:Math.round(med(byClub[c]))}));
  const pcH=$('pcHead'),pcS=$('pcSub');
  if(pcRows.length>=2){
    const mn=Math.min(...pcRows.map(r=>r.m)),mx=Math.max(...pcRows.map(r=>r.m));
    const disp=[...pcRows].sort((a,b)=>b.m-a.m); // loosest at top
    const valH={id:'valH',afterDatasetsDraw(c){const ds=c.getDatasetMeta(0);const ctx=c.ctx;ctx.save();ctx.font='600 11px Inter';ctx.fillStyle='#eef3ec';ctx.textBaseline='middle';ds.data.forEach((b,i)=>{ctx.fillText(c.data.datasets[0].data[i]+' ft',b.x+6,b.y);});ctx.restore();}};
    draw('apClub',{type:'bar',data:{labels:disp.map(r=>r.c),datasets:[{data:disp.map(r=>r.m),
      backgroundColor:disp.map(r=>r.m===mn?'#62c692':(r.m===mx?'#e35a50':'#c9a24a')),borderRadius:4,borderSkipped:false,barThickness:20}]},
      plugins:[valH],options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,layout:{padding:{right:42}},
        plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.parsed.x+' ft · '+disp[c.dataIndex].n+' shots'}}},
        scales:{x:{grid:{color:GRID},border:{display:false},title:{display:true,text:'median feet from pin'},suggestedMax:mx+12},
                y:{grid:{display:false},border:{display:false},ticks:{font:{size:13}}}}}});
    const sharp=[...pcRows].sort((a,b)=>a.m-b.m)[0];
    const wedges=pcRows.filter(r=>['PW','GW','56°','60°'].includes(r.c));
    const mostUsed=[...pcRows].sort((a,b)=>b.n-a.n)[0];
    const bestWedge=wedges.length?[...wedges].sort((a,b)=>a.m-b.m)[0]:null;
    const worstWedge=wedges.length?[...wedges].sort((a,b)=>b.m-a.m)[0]:null;
    pcH.textContent=`Your ${sharp.c} is your sharpest club — ${sharp.m} ft.`;
    let s=`Across approaches that found the green area, your <b>${sharp.c}</b> finishes closest at <b>${sharp.m} ft</b>. `;
    if(worstWedge&&worstWedge.c!==sharp.c&&worstWedge.m>=sharp.m*1.7){
      s+=`The leak in the scoring zone is your <b>${worstWedge.c}</b> at <b>${worstWedge.m} ft</b> over ${worstWedge.n} shots`;
      s+=worstWedge.c===mostUsed.c?`, your most-hit approach club`:``;
      if(bestWedge&&bestWedge.c!==worstWedge.c)s+=` — looser than your ${bestWedge.c} (${bestWedge.m} ft)`;
      s+=`. That's the club to take to the range.`;
    }
    pcS.innerHTML=s;
  } else { pcH.textContent='Proximity by club.'; pcS.textContent='Not enough approaches per club in this filter (need 3+ each).'; }

  // miss pattern scatter
  const amH=$('amHead'),amS=$('amSub'),amQ=$('amQuad');
  if(AG.length){
    const hit=AG.filter(a=>a[2]<=33),miss=AG.filter(a=>a[2]>33);
    const shortN=AG.filter(a=>a[4]<0).length,leftN=AG.filter(a=>a[3]<0).length;
    const mShort=miss.length?Math.round(100*miss.filter(a=>a[4]<0).length/miss.length):0;
    const mLeft=miss.length?Math.round(100*miss.filter(a=>a[3]<0).length/miss.length):0;
    const pts=arr=>arr.map(a=>({x:a[3],y:a[4],c:a[0],p:a[2]}));
    const lim=Math.max(45,...AG.map(a=>Math.max(Math.abs(a[3]),Math.abs(a[4]))))*1.06;
    const pinPlot={id:'pinPlot',beforeDatasetsDraw(c){const x=c.scales.x,y=c.scales.y,ca=c.chartArea,ctx=c.ctx;
      const cx=x.getPixelForValue(0),cy=y.getPixelForValue(0);ctx.save();
      ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=1;ctx.beginPath();
      ctx.moveTo(ca.left,cy);ctx.lineTo(ca.right,cy);ctx.moveTo(cx,ca.top);ctx.lineTo(cx,ca.bottom);ctx.stroke();
      const rx=Math.abs(x.getPixelForValue(33)-cx),ry=Math.abs(y.getPixelForValue(33)-cy);
      ctx.strokeStyle='rgba(78,168,122,.55)';ctx.setLineDash([5,4]);ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,7);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='#c9a24a';ctx.beginPath();ctx.arc(cx,cy,4.5,0,7);ctx.fill();ctx.restore();}};
    draw('apMiss',{type:'scatter',data:{datasets:[
      {label:'Found green',data:pts(hit),backgroundColor:'rgba(98,198,146,.85)',pointRadius:5,pointHoverRadius:7},
      {label:'Missed green',data:pts(miss),backgroundColor:'rgba(227,90,80,.82)',pointRadius:5,pointHoverRadius:7}]},
      plugins:[pinPlot],options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:true,position:'top',labels:{boxWidth:9,font:{size:11},color:'#93a99c'}},
          tooltip:{callbacks:{label:c=>{const r=c.raw;return `${r.c}: ${r.p} ft (${Math.abs(Math.round(r.y))} ${r.y<0?'short':'long'}, ${Math.abs(Math.round(r.x))} ${r.x<0?'left':'right'})`;}}}},
        scales:{x:{min:-lim,max:lim,grid:{display:false},border:{display:false},title:{display:true,text:'\u2190 left          right \u2192',color:'#93a99c'}},
                y:{min:-lim,max:lim,grid:{display:false},border:{display:false},title:{display:true,text:'short \u2193          long \u2191',color:'#93a99c'}}}}});
    amH.textContent = (miss.length&&mShort>=55)?'When you miss, you miss short.':'Where your approaches finish.';
    let ms=`Of your <b>${miss.length}</b> missed greens, <b>${mShort}% finish short</b> and the side is ${Math.abs(mLeft-50)<=12?'a coin flip':(mLeft>50?'tilted left':'tilted right')} (${mLeft}% left, ${100-mLeft}% right). `;
    if(mShort>=55) ms+=`That's a club-selection problem, not a swing-path one — taking one more club is close to a free stroke.`;
    else if(miss.length) ms+=`No strong short bias in this view.`;
    amS.innerHTML = miss.length?ms:`Every approach in this filter found the green — nothing missed to chart.`;
    const pct=(k)=>Math.round(100*k/AG.length);
    amQ.innerHTML = `<div><span>Short</span><b>${pct(shortN)}%</b></div><div><span>Long</span><b>${pct(AG.length-shortN)}%</b></div><div><span>Left</span><b>${pct(leftN)}%</b></div><div><span>Right</span><b>${pct(AG.length-leftN)}%</b></div>`;
  } else { amH.textContent='Miss pattern.'; amS.textContent='No approach shots in this filter to chart.'; amQ.innerHTML=''; }
  // par-type breakdown
  const PT=[3,4,5].map(p=>{const sub=H.filter(h=>h.par===p);if(!sub.length)return null;
    const over=sub.reduce((s,h)=>s+(h.score-h.par),0)/sub.length;
    const gir=100*sub.filter(h=>h.gir===1).length/sub.length;
    const putts=sub.reduce((s,h)=>s+(h.putts||0),0)/sub.length;
    const bird=100*sub.filter(h=>h.score-h.par<=-1).length/sub.length;
    const bog=100*sub.filter(h=>h.score-h.par>=1).length/sub.length;
    return {p,n:sub.length,over,gir,putts,bird,bog};}).filter(Boolean);
  $('ptGrid').innerHTML=PT.map(t=>
    `<div class="pt-card"><div class="pt-h">Par ${t.p} <span>· ${t.n} holes</span></div>
     <div class="pt-big">+${t.over.toFixed(2)}<span>avg vs par</span></div>
     <div class="pt-rows"><span>Greens</span><b>${Math.round(t.gir)}%</b></div>
     <div class="pt-rows"><span>Putts</span><b>${t.putts.toFixed(2)}</b></div>
     <div class="pt-rows"><span>Birdies</span><b>${Math.round(t.bird)}%</b></div>
     <div class="pt-rows"><span>Bogey+</span><b>${Math.round(t.bog)}%</b></div></div>`).join('');
  const worst=PT.slice().sort((a,b)=>b.over-a.over)[0];
  const p5=PT.find(t=>t.p===5);
  const ptn=$('ptNote');
  if(p5 && worst.p===5 && p5.bird<5)
    ptn.innerHTML=`Your toughest type is the <b>par 5</b> (+${p5.over.toFixed(2)}, just ${Math.round(p5.gir)}% greens, ${Math.round(p5.bird)}% birdies) — which is backwards for the longest hitter in your bag. These should be your birdie holes; right now they're scoring like your hardest.`;
  else ptn.innerHTML=`Your toughest hole type in this view is the <b>par ${worst.p}</b> at +${worst.over.toFixed(2)} over par.`;
}

// ---- helpers / wiring ----
function renderTiger5(){
  const rs=filtered();
  let H=[]; rs.forEach(r=>r.holes.forEach(h=>H.push(h)));
  const k=H.length?18/H.length:0;
  if(!H.length){$('t5Head').textContent='No rounds in this filter.';$('t5Sub').textContent='';$('t5stats').innerHTML='';$('t5break').innerHTML='';return;}
  const c_dbl=H.filter(h=>h.score-h.par>=2).length;
  const c_3p =H.filter(h=>h.putts>=3).length;
  const c_p5 =H.filter(h=>h.par===5&&h.score-h.par>=1).length;
  const c_150=H.filter(h=>h.apd!=null&&h.apd<=150&&h.score-h.par>=1).length;
  const c_dc =H.filter(h=>h.dc===1).length;
  const cats=[['Bogey+ inside 150',c_150],['Three-putts',c_3p],['Doubles or worse',c_dbl],['Par-5 bogeys+',c_p5],['Double chips',c_dc]];
  const total=cats.reduce((s,c)=>s+c[1],0), per18=total*k;
  const sorted=[...cats].sort((a,b)=>b[1]-a[1]); const big=sorted[0];
  $('t5Head').textContent=`You average ${per18.toFixed(1)} of Tiger's five mistakes per 18 holes.`;
  $('t5Sub').innerHTML=`Tiger tracked five unforced errors and figured six or fewer per tournament — about <b>1.5 a round</b> — meant he'd win. Your most common by far is <b>${big[0].toLowerCase()}</b> at <b>${(big[1]*k).toFixed(1)}/18</b>${big[0]==='Bogey+ inside 150'?', dropped shots with a scoring club in hand — the same wedge-proximity and short-game leak the rest of the dashboard keeps surfacing':', the one to attack first'}.`;
  const perHole=H.map(h=>((h.score-h.par>=2)?1:0)+((h.putts>=3)?1:0)+((h.par===5&&h.score-h.par>=1)?1:0)+((h.apd!=null&&h.apd<=150&&h.score-h.par>=1)?1:0)+((h.dc===1)?1:0));
  const clean=perHole.filter(c=>c===0).length;
  $('t5stats').innerHTML=
    stat(per18.toFixed(1),'Tiger-5 mistakes / 18','Tiger aimed for ~1.5',per18>1.5)+
    stat((big[1]*k).toFixed(1)+'/18',big[0].toLowerCase()+', your most common',big[1]+' in this view',big[1]>0)+
    stat(Math.round(100*clean/H.length)+'%','mistake-free holes',clean+' of '+H.length+' holes');
  const valH={id:'vh',afterDatasetsDraw(ch){const m=ch.getDatasetMeta(0),x=ch.ctx;x.save();x.font='600 11px Inter';x.fillStyle='#eef3ec';x.textBaseline='middle';m.data.forEach((b,i)=>{x.fillText(ch.data.datasets[0].data[i].toFixed(1),b.x+6,b.y);});x.restore();}};
  draw('t5chart',{type:'bar',data:{labels:sorted.map(c=>c[0]),datasets:[{data:sorted.map(c=>+(c[1]*k).toFixed(1)),backgroundColor:sorted.map((c,i)=>i===0?'#e35a50':'#c9a24a'),borderRadius:4,borderSkipped:false,barThickness:26}]},
    plugins:[valH],options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,layout:{padding:{right:42}},plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>{const cc=sorted[c.dataIndex];return cc[1]+' total · '+(cc[1]*k).toFixed(1)+'/18';}}}},scales:{x:{grid:{color:GRID},border:{display:false},title:{display:true,text:'per 18 holes'}},y:{grid:{display:false},border:{display:false},ticks:{font:{size:12}}}}}});
  const rdata=rs.map(r=>{const hh=r.holes;const t=hh.filter(h=>h.score-h.par>=2).length+hh.filter(h=>h.putts>=3).length+hh.filter(h=>h.par===5&&h.score-h.par>=1).length+hh.filter(h=>h.apd!=null&&h.apd<=150&&h.score-h.par>=1).length+hh.filter(h=>h.dc===1).length;return {d:r.date,id:r.id,v:+(t/r.n*18).toFixed(1)};}).sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:(a.id-b.id));
  const tgt={id:'tgt',afterDatasetsDraw(ch){const y=ch.scales.y,a=ch.chartArea,x=ch.ctx;const yy=y.getPixelForValue(1.5);if(yy<a.top||yy>a.bottom)return;x.save();x.strokeStyle='rgba(98,198,146,.75)';x.setLineDash([5,4]);x.beginPath();x.moveTo(a.left,yy);x.lineTo(a.right,yy);x.stroke();x.setLineDash([]);x.fillStyle='#62c692';x.font='10px Inter';x.fillText('Tiger ~1.5',a.left+4,yy-4);x.restore();}};
  draw('t5rounds',{type:'bar',data:{labels:dedupeDates(rdata.map(r=>r.d)),datasets:[{data:rdata.map(r=>r.v),backgroundColor:'#c9a24a',borderRadius:4,borderSkipped:'start',barThickness:20}]},
    plugins:[tgt],options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.parsed.y+' / 18'}}},scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:10},maxRotation:55,minRotation:55}},y:{grid:{color:GRID},border:{display:false},beginAtZero:true,title:{display:true,text:'mistakes / 18'}}}}});
  $('t5break').innerHTML=sorted.map(c=>{const pr=(c[1]*k);return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-top:1px solid var(--line)"><span style="font-size:13px;color:var(--muted)">${c[0]}</span><span><b style="font-size:15px;color:var(--ink)">${c[1]}</b> <span style="color:var(--muted2);font-size:11px">· ${pr.toFixed(1)}/18</span></span></div>`;}).join('');
}

function renderActive(){const t=root.querySelector('.tab.on').dataset.tab;
  if(t==='overview')renderOverview();else if(t==='putting')renderPutting();else if(t==='tee')renderTee();
  else if(t==='bag')renderBag();else if(t==='rounds')renderRounds();else if(t==='takeaways')renderTakeaways();else if(t==='anatomy')renderAnatomy();else if(t==='benchmarks')renderBench();else if(t==='approach')renderApproach();else if(t==='tiger5')renderTiger5();}
function updateSummary(){const rs=filtered();const ds=rs.map(r=>r.date).sort();
  $('summary').textContent= rs.length?
    `Showing ${rs.length} rounds · ${rs.reduce((s,r)=>s+r.n,0)} holes · ${fmtDate(ds[0])}–${fmtDate(ds[ds.length-1])}${state.course!=='All'?' · '+state.course:''}`
    :'No rounds match this filter.';}


function shortCourse(name){
  let s=String(name).replace(/^The\s+/i,'');
  s=s.replace(/\s+(Country Club|Golf Club|Golf Course|Golf Links|Club|Course|Links|CC|GC)$/i,'');
  return s.trim()||name;
}
const escAttr=(s)=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function buildCourseButtons(){
  $('coursebtns').innerHTML=['All',...D.meta.courses].map(c=>`<button class="btn ${c==='All'?'on':''}" data-course="${escAttr(c)}">${c==='All'?'All':escAttr(shortCourse(c))}</button>`).join('\n');
}

export function initRoundBook(rootEl, data){
  root=rootEl; D=data;
  if(D.hcp==null)D.hcp=13.7; // CLAUDE.md rule 6; the sync/seed inject the real value
  sortedDates=[...new Set(D.rounds.map(r=>r.date))].sort();
  state={course:'All',fromIdx:0,toIdx:sortedDates.length-1};
  frT=50; drvMin=150; selClub=0; gapThresh=18; openRound=null; benchHcp=null;
  buildCourseButtons();
  // tabs
  root.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
    root.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));
    root.querySelectorAll('.panel').forEach(x=>x.classList.remove('on'));
    t.classList.add('on');$('p-'+t.dataset.tab).classList.add('on');renderActive();});
  // course buttons
  root.querySelectorAll('[data-course]').forEach(b=>b.onclick=()=>{
    root.querySelectorAll('[data-course]').forEach(x=>x.classList.remove('on'));b.classList.add('on');
    state.course=b.dataset.course;updateSummary();renderActive();});
  // date range
  const f=$('fromR'),tt=$('toR');
  f.max=tt.max=sortedDates.length-1;f.value=0;tt.value=sortedDates.length-1;
  function dr(){state.fromIdx=Math.min(+f.value,+tt.value);state.toIdx=Math.max(+f.value,+tt.value);
    $('fromV').textContent=fmtDate(sortedDates[state.fromIdx]);
    $('toV').textContent=fmtDate(sortedDates[state.toIdx]);
    updateSummary();renderActive();}
  f.oninput=dr;tt.oninput=dr;
  $('resetF').onclick=()=>{state={course:'All',fromIdx:0,toIdx:sortedDates.length-1};
    f.value=0;tt.value=sortedDates.length-1;root.querySelectorAll('[data-course]').forEach(x=>x.classList.toggle('on',x.dataset.course==='All'));dr();};
  // tee slider
  const dm=$('drvMin');dm.oninput=()=>{drvMin=+dm.value;updateDrvSlider();};
  // gap threshold
  const gt=$('gapThresh');gt.oninput=()=>{gapThresh=+gt.value;updateGapThreshold();};
  // what-if sliders
  // benchmark selector
  root.querySelectorAll('[data-bh]').forEach(b=>b.onclick=()=>{
    root.querySelectorAll('[data-bh]').forEach(x=>x.classList.remove('on'));b.classList.add('on');
    benchHcp = b.dataset.bh==='self'? D.hcp : +b.dataset.bh;
    $('benchSlider').value=benchHcp; renderBench();});
  const bs=$('benchSlider');bs.value=D.hcp;
  root.querySelector('[data-bh="self"]').textContent='My handicap · '+D.hcp;
  root.querySelectorAll('[data-fr]').forEach(b=>b.onclick=()=>{frT=+b.dataset.fr;renderPutting();});
  bs.oninput=()=>{benchHcp=+bs.value;root.querySelectorAll('[data-bh]').forEach(x=>x.classList.remove('on'));renderBench();};
  $('fromV').textContent=fmtDate(sortedDates[0]);
  $('toV').textContent=fmtDate(sortedDates[sortedDates.length-1]);
  $('footMeta').textContent='through '+fmtDate(D.meta.dateMax)+' · '+D.meta.nRounds+' rounds, '+D.meta.nHoles+' holes';
  updateSummary();renderOverview();

  return destroyRoundBook;
}

export function destroyRoundBook(){
  Object.keys(charts).forEach(k=>{try{charts[k].destroy();}catch(e){}delete charts[k];});
  root=null; D=null;
}
