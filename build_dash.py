import json
data = json.load(open("dash_data.json"))
data['hcp']=13.7

CSS = """
:root{
  --bg:#0e1a14;--panel:#15241c;--panel2:#1b2e24;--line:#2a3d31;--line2:#35493b;
  --ink:#eef3ec;--muted:#93a99c;--muted2:#6f8579;
  --fairway:#4ea87a;--fairway-b:#62c692;--flag:#e35a50;--brass:#c9a24a;--wood:#3f78c4;
  --serif:"Fraunces",ui-serif,Georgia,serif;
  --sans:"Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);
  font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;line-height:1.5}
.wrap{max-width:1120px;margin:0 auto;padding:30px 20px 70px}
a{color:inherit}
.eyebrow{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--fairway);font-weight:600;margin:0 0 9px}
.mast{border-bottom:1px solid var(--line);padding-bottom:18px;margin-bottom:18px}
.mast h1{font-family:var(--serif);font-weight:500;font-size:clamp(26px,4.6vw,40px);line-height:1.02;margin:0 0 6px;letter-spacing:-.01em}
.mast h1 em{font-style:italic;color:var(--brass)}
.mast .sub{color:var(--muted);font-size:13.5px;margin:0;max-width:64ch}

/* filter bar */
.filters{display:flex;flex-wrap:wrap;gap:18px 26px;align-items:flex-end;background:var(--panel);
  border:1px solid var(--line);border-radius:13px;padding:15px 18px;margin-bottom:18px}
.fgroup{display:flex;flex-direction:column;gap:7px}
.fgroup .flab{font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted2)}
.btns{display:flex;gap:6px;flex-wrap:wrap}
.btn{background:var(--panel2);border:1px solid var(--line2);color:var(--muted);font:inherit;font-size:12.5px;
  padding:6px 12px;border-radius:8px;cursor:pointer;transition:.12s}
.btn:hover{color:var(--ink);border-color:var(--fairway)}
.btn.on{background:var(--fairway);border-color:var(--fairway);color:#08130d;font-weight:600}
.rangewrap{display:flex;align-items:center;gap:10px}
.rangewrap input[type=range]{width:140px;accent-color:var(--fairway)}
.rangewrap .rv{font-size:12px;color:var(--ink);min-width:64px}
.reset{margin-left:auto;align-self:center}
.summaryline{font-size:12px;color:var(--muted2);margin:10px 2px 0;width:100%}

/* tabs */
.tabs{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:20px;border-bottom:1px solid var(--line)}
.tab{background:none;border:none;border-bottom:2px solid transparent;color:var(--muted);font:inherit;
  font-size:14px;font-weight:500;padding:10px 14px;cursor:pointer;transition:.12s;margin-bottom:-1px}
.tab:hover{color:var(--ink)}
.tab.on{color:var(--ink);border-bottom-color:var(--brass)}
.panel{display:none}
.panel.on{display:block;animation:fade .25s ease}
@keyframes fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}

/* kpis */
.kpis{display:grid;grid-template-columns:repeat(8,1fr);gap:10px;margin-bottom:20px}
.kpi{background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:12px 12px 11px}
.kpi .lab{font-size:9.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted2);margin:0 0 6px}
.kpi .val{font-family:var(--serif);font-weight:500;font-size:23px;line-height:1;margin:0}
.kpi .val small{font-family:var(--sans);font-size:11px;color:var(--muted);font-weight:500}
.kpi.leak{border-color:rgba(227,90,80,.4);background:linear-gradient(180deg,rgba(227,90,80,.1),var(--panel))}
.kpi.leak .val{color:var(--flag)}
@media(max-width:900px){.kpis{grid-template-columns:repeat(4,1fr)}}
@media(max-width:480px){.kpis{grid-template-columns:repeat(2,1fr)}}

.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:17px 18px 15px}
.card.full{grid-column:1/-1}
.card h4{font-family:var(--serif);font-weight:500;font-size:16px;margin:0 0 3px}
.card .cap{font-size:12px;color:var(--muted);margin:0 0 13px}
.chartbox{position:relative;width:100%}
@media(max-width:760px){.grid{grid-template-columns:1fr}}

.leakband{background:linear-gradient(110deg,rgba(227,90,80,.12),var(--panel) 60%);
  border:1px solid rgba(227,90,80,.34);border-radius:14px;padding:17px 20px;margin-bottom:16px;
  display:grid;grid-template-columns:1.3fr 1fr 1fr 1fr;gap:16px;align-items:center}
.leakband .tag{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--flag);font-weight:600;margin:0 0 5px}
.leakband h3{font-family:var(--serif);font-weight:500;font-size:19px;margin:0 0 3px}
.leakband .d{font-size:12.5px;color:var(--muted);margin:0}
.lst .n{font-family:var(--serif);font-size:24px;font-weight:500;margin:0;line-height:1}
.lst .l{font-size:11px;color:var(--muted);margin:5px 0 0}
.lst .l span{color:var(--muted2)}
@media(max-width:760px){.leakband{grid-template-columns:1fr 1fr;row-gap:14px}}

/* legend / chips */
.legend{display:flex;gap:15px;flex-wrap:wrap;font-size:11.5px;color:var(--muted);margin-top:11px}
.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.chip{background:var(--panel2);border:1px solid var(--line2);border-radius:9px;padding:8px 11px;cursor:pointer;transition:.12s;text-align:center;min-width:74px}
.chip:hover{border-color:var(--fairway)}
.chip.on{border-color:var(--brass);background:rgba(201,162,74,.1)}
.chip .cd{font-family:var(--serif);font-size:17px;font-weight:500;line-height:1}
.chip .cn{font-size:10px;color:var(--muted2);margin-top:3px}
.chip .cc{display:inline-block;width:7px;height:7px;border-radius:2px;margin-right:4px;vertical-align:1px}

/* rounds */
.rndgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:12px}
.rnd{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 15px;cursor:pointer;transition:.12s}
.rnd:hover{border-color:var(--fairway);transform:translateY(-1px)}
.rnd.on{border-color:var(--brass)}
.rnd .rd{font-size:12px;color:var(--muted2)}
.rnd .rc{font-weight:600;font-size:14px;margin:2px 0 9px}
.rnd .rrow{display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-top:3px}
.rnd .rrow b{color:var(--ink);font-weight:600}
.rnd .big{font-family:var(--serif);font-size:26px;font-weight:500}
.rnd .ou{font-size:12px;color:var(--brass);margin-left:6px}
.scorecard{margin-top:16px;overflow-x:auto}
table.sc{border-collapse:collapse;width:100%;font-size:12.5px;min-width:560px}
table.sc th,table.sc td{padding:7px 9px;text-align:center;border-bottom:1px solid var(--line)}
table.sc th{color:var(--muted2);font-weight:600;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase}
table.sc td:first-child,table.sc th:first-child{text-align:left}
.sc .b-dbl{color:var(--flag);font-weight:600}
.sc .b-bird{color:var(--fairway-b);font-weight:600}
.sc .yes{color:var(--fairway)}
.sc .no{color:var(--muted2)}

/* what-if */
.wif{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.slider{margin:16px 0}
.slider label{display:flex;justify-content:space-between;font-size:13px;margin-bottom:7px}
.slider label b{color:var(--brass);font-family:var(--serif);font-size:16px}
.slider input[type=range]{width:100%;accent-color:var(--fairway)}
.proj{background:var(--panel2);border:1px solid var(--line2);border-radius:12px;padding:18px;text-align:center}
.proj .big{font-family:var(--serif);font-size:52px;font-weight:500;line-height:1;color:var(--fairway-b)}
.proj .from{font-size:13px;color:var(--muted);margin-top:6px}
.proj .saved{font-size:14px;color:var(--brass);margin-top:10px;font-weight:600}
.assump{font-size:11.5px;color:var(--muted2);margin-top:14px;line-height:1.55}
.foot{margin-top:28px;border-top:1px solid var(--line);padding-top:16px;font-size:11.5px;color:var(--muted2)}
.note{font-size:11.5px;color:var(--muted2);margin-top:10px;font-style:italic}
.takegrid{display:grid;grid-template-columns:1fr 1fr;gap:22px}
@media(max-width:760px){.takegrid{grid-template-columns:1fr}}
.takehd{font-family:var(--serif);font-weight:500;font-size:15px;margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid var(--line)}
.takehd.good{color:var(--fairway-b)}
.takehd.focus{color:var(--brass)}
.take{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 15px;margin-bottom:11px;border-left:3px solid var(--line2)}
.take.g{border-left-color:var(--fairway)}
.take.f{border-left-color:var(--brass)}
.take.f.hot{border-left-color:var(--flag)}
.take .th{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.take .tt{font-weight:600;font-size:14px;margin:0}
.take .ts{font-family:var(--serif);font-size:20px;font-weight:500;white-space:nowrap}
.take.g .ts{color:var(--fairway-b)}
.take.f .ts{color:var(--brass)}
.take.f.hot .ts{color:var(--flag)}
.take .tb{font-size:12.5px;color:var(--muted);margin:6px 0 0;line-height:1.5}
.take .rank{display:inline-block;font-size:10px;font-weight:700;color:#08130d;background:var(--brass);border-radius:4px;padding:1px 6px;margin-right:7px;vertical-align:1px}
.take.f.hot .rank{background:var(--flag)}
.take .aw{font-size:9px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted2);background:var(--panel2);border:1px solid var(--line2);border-radius:4px;padding:1px 5px;margin-left:6px;vertical-align:1px;font-weight:600}
.emptyt{font-size:13px;color:var(--muted2);font-style:italic;margin:0 0 11px}
.pt-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:13px;margin-bottom:6px}
@media(max-width:680px){.pt-grid{grid-template-columns:1fr}}
.pt-card{background:var(--panel2);border:1px solid var(--line2);border-radius:12px;padding:14px 16px}
.pt-h{font-weight:600;font-size:14px;margin-bottom:9px}
.pt-h span{color:var(--muted2);font-weight:400;font-size:11px}
.pt-big{font-family:var(--serif);font-size:30px;font-weight:500;color:var(--brass);line-height:1;margin-bottom:12px}
.pt-big span{display:block;font-family:var(--sans);font-size:10.5px;color:var(--muted2);font-weight:400;margin-top:4px;letter-spacing:.03em;text-transform:uppercase}
.pt-rows{display:flex;justify-content:space-between;font-size:12.5px;color:var(--muted);padding:4px 0;border-top:1px solid var(--line)}
.pt-rows b{color:var(--ink);font-weight:600}
.missquad{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
.missquad div{flex:1;min-width:88px;background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:10px 11px;text-align:center}
.missquad span{display:block;font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted2);margin-bottom:3px}
.missquad b{font-family:var(--serif);font-size:21px;font-weight:500;color:var(--ink);line-height:1}
.fr-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:4px 0 12px;font-size:12.5px;color:var(--muted)}
#frQuad b{font-size:17px}
.lvh-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin:14px 0 4px}
@media(max-width:680px){.lvh-grid{grid-template-columns:repeat(2,1fr)}}
.lvh-card{background:var(--panel2);border:1px solid var(--line2);border-radius:11px;padding:12px 13px;border-left-width:3px}
.lvh-card.win{border-left-color:var(--fairway-b)}
.lvh-card.lose{border-left-color:var(--flag)}
.lvh-card.flat{border-left-color:var(--muted2)}
.lvh-ph{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin-bottom:7px}
.lvh-str{font-family:var(--serif);font-size:25px;font-weight:500;color:var(--ink);line-height:1}
.lvh-str span{font-family:var(--sans);font-size:10px;color:var(--muted2);font-weight:400;margin-left:4px;letter-spacing:.02em}
.lvh-cmp{font-size:12px;color:var(--muted);margin-top:8px;line-height:1.4}
.lvh-tag{display:inline-block;margin-top:8px;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:5px}
.lvh-tag.win{background:rgba(98,198,146,.16);color:var(--fairway-b)}
.lvh-tag.lose{background:rgba(227,90,80,.16);color:var(--flag)}
.lvh-tag.flat{background:rgba(147,169,156,.14);color:var(--muted)}
.rtiles{display:grid;grid-template-columns:repeat(8,1fr);gap:8px;margin:14px 0 12px}
@media(max-width:680px){.rtiles{grid-template-columns:repeat(4,1fr)}}
.rtile{background:var(--panel2);border:1px solid var(--line);border-radius:9px;padding:9px 6px;text-align:center}
.rt-v{font-family:var(--serif);font-size:18px;font-weight:500;line-height:1}
.rt-l{font-size:9px;color:var(--muted2);text-transform:uppercase;letter-spacing:.03em;margin-top:5px}
.rmix{font-size:13px;color:var(--muted);margin:0 0 6px}
.rmix b{color:var(--ink);font-family:var(--serif);font-size:15px}
.rvs{font-size:12.5px;color:var(--muted2);margin:0 0 8px}
.rvs b{color:var(--fairway-b)}
.gir-cmp{display:flex;align-items:center;gap:18px;margin-bottom:6px}
.gc-box{flex:1;background:var(--panel2);border:1px solid var(--line2);border-radius:12px;padding:16px;text-align:center}
.gc-v{font-family:var(--serif);font-size:34px;font-weight:500;line-height:1}
.gc-l{font-size:12px;color:var(--muted);margin-top:6px}
.gc-s{font-size:11.5px;color:var(--brass);margin-top:5px}
.gc-vs{font-family:var(--serif);font-style:italic;color:var(--muted2);font-size:15px}
@media(max-width:520px){.gir-cmp{flex-direction:column;gap:10px}.gc-vs{transform:rotate(90deg)}}
.seg-bar{display:flex;height:40px;border-radius:9px;overflow:hidden;border:1px solid var(--line2)}
.seg{display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;color:#0c1611}
.seg.miss{background:#e35a50}
.seg.putt{background:#c9a24a}
.decomp-key{display:flex;gap:18px;flex-wrap:wrap;font-size:12px;color:var(--muted);margin:11px 0 13px}
.decomp-key i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.decomp-text{font-size:13.5px;color:var(--muted);line-height:1.62;margin:0}
.anat-list{list-style:none;padding:0;margin:0}
.anat-list li{padding:9px 0;border-bottom:1px solid var(--line);font-size:13.5px;color:var(--muted)}
.anat-list li:last-child{border-bottom:none}
.anat-list li b{color:var(--ink);font-family:var(--serif);font-size:17px;margin-right:5px}
.bench-head{display:grid;grid-template-columns:165px 56px 1fr 56px 70px;gap:12px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted2);padding-bottom:9px;border-bottom:1px solid var(--line2)}
.bh-you{text-align:right}.bh-avg{text-align:left}
.bench-row{display:grid;grid-template-columns:165px 56px 1fr 56px 70px;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--line)}
.bench-row:last-child{border-bottom:none}
.bench-name{font-size:13px;color:var(--ink);font-weight:500}
.bench-num{font-family:var(--serif);font-size:15.5px}
.bench-num.you{color:var(--ink);text-align:right}
.bench-num.avg{color:var(--muted2);text-align:left}
.bench-track{position:relative;height:18px;background:var(--panel2);border-radius:5px;overflow:hidden;border:1px solid var(--line)}
.bt-center{position:absolute;left:50%;top:0;bottom:0;width:2px;background:var(--line2);transform:translateX(-1px);z-index:2}
.bt-fill{position:absolute;top:0;bottom:0}
.bt-fill.ahead{background:linear-gradient(90deg,rgba(78,168,122,.35),#4ea87a)}
.bt-fill.behind{background:linear-gradient(90deg,#e35a50,rgba(227,90,80,.35))}
.bench-badge{font-size:11px;font-weight:700;text-align:center;border-radius:5px;padding:3px 0;white-space:nowrap}
.bench-badge.ahead{color:#7fd3a4;background:rgba(78,168,122,.14)}
.bench-badge.behind{color:#f08a82;background:rgba(227,90,80,.14)}
.bench-summary{font-size:12.5px;color:var(--muted);margin:15px 0 0;line-height:1.6}
@media(max-width:680px){.bench-head{grid-template-columns:108px 42px 1fr 42px}.bench-row{grid-template-columns:108px 42px 1fr 42px}.bench-badge{display:none}.bench-name{font-size:12px}}
"""

JS = r"""
const D = window.__DATA__;
const C = {wood:'#3f78c4',iron:'#4ea87a',wedge:'#c9a24a',putter:'#7c8f84',other:'#7c8f84'};
Chart.defaults.color='#93a99c';
Chart.defaults.font.family="Inter, ui-sans-serif, system-ui, sans-serif";
Chart.defaults.font.size=12;
const GRID='#243429';
const charts={};
function draw(id,cfg){ if(charts[id])charts[id].destroy(); const el=document.getElementById(id); if(!el)return; charts[id]=new Chart(el,cfg); }

// ---- value-label plugins ----
const topLab={id:'tl',afterDatasetsDraw(c){const x=c.ctx,m=c.getDatasetMeta(0),d=c.data.datasets[0];x.save();x.font='600 12px Inter';x.textAlign='center';
  m.data.forEach((b,i)=>{const v=d.data[i];if(v==null)return;x.fillStyle=Array.isArray(d.backgroundColor)?d.backgroundColor[i]:d.backgroundColor;x.fillText(c.$fmt?c.$fmt(v):v,b.x,b.y-7);});x.restore();}};
const endLab={id:'el',afterDatasetsDraw(c){if(!c.$lab)return;const x=c.ctx,m=c.getDatasetMeta(0);x.save();x.font='600 12px Inter';x.textBaseline='middle';x.fillStyle='#cfe0d6';
  m.data.forEach((b,i)=>{x.fillText(c.$lab[i],b.x+8,b.y);});x.restore();}};

// ---- state ----
const sortedDates=[...new Set(D.rounds.map(r=>r.date))].sort();
let state={course:'All',fromIdx:0,toIdx:sortedDates.length-1};
let frT=50;

function filtered(){
  const lo=sortedDates[state.fromIdx], hi=sortedDates[state.toIdx];
  return D.rounds.filter(r=> (state.course==='All'||r.course===state.course) && r.date>=lo && r.date<=hi);
}

function agg(rs){
  let res={'Eagle+':0,Birdie:0,Par:0,Bogey:0,Double:0,'Triple+':0};
  let sSum={3:0,4:0,5:0},sN={3:0,4:0,5:0};
  let gir=0,girN=0,fw=0,fwN=0,fwL=0,fwR=0,tp=0,op=0,hp=0,nH=0,tScore=0,tPar=0;
  let putts=[],pGir=[],driver=[],puttDist={1:0,2:0,3:0,4:0};
  let girPB=0,girBog=0,bogeyGir=0,dblPar4=0,penTot=0,penHoles=0,fwHitD=[],fwMissD=[],penD=[];
  rs.forEach(r=>r.holes.forEach(h=>{
    nH++;tScore+=h.score;tPar+=h.par;
    const df=h.score-h.par;
    const k=df<=-2?'Eagle+':df===-1?'Birdie':df===0?'Par':df===1?'Bogey':df===2?'Double':'Triple+';res[k]++;
    sSum[h.par]+=h.score;sN[h.par]++;
    if(h.putts!=null){hp++;putts.push(h.putts);if(h.putts>=3)tp++;const pk=Math.min(h.putts,4);puttDist[pk]=(puttDist[pk]||0)+1;if(h.putts===1)op++;if(h.gir===1)pGir.push(h.putts);}
    if(h.gir!=null){girN++;if(h.gir===1)gir++;}
    if(h.fw!=null){fwN++;if(h.fw===1){fw++;fwHitD.push(df);}else{fwMissD.push(df);if(h.miss==='L')fwL++;if(h.miss==='R')fwR++;}}
    if(h.gir===1){if(df<=0)girPB++;else girBog++;}if(df===1&&h.gir===1)bogeyGir++;if(df>=2&&h.par===4)dblPar4++;if(h.pen){penTot+=h.pen;penHoles++;penD.push(df);}
    if(h.drv!=null)driver.push(h.drv);
  }));
  const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
  const med=a=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y);const m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;};
  return {nRounds:rs.length,nH,res,sSum,sN,
    pace18: nH? (tScore/nH*18):0, ouP18: nH? ((tScore-tPar)/nH*18):0,
    girPct: girN? 100*gir/girN:0, gir, girN,
    fwPct: fwN?100*fw/fwN:0, fw,fwN,fwL,fwR,
    puttsPerH: hp?avg(putts):0, threePct: hp?100*tp/hp:0, onePct: hp?100*op/hp:0,
    tp, hp, putts, puttDist, pGirAvg: pGir.length?avg(pGir):0,
    drvAvg: driver.length?Math.round(avg(driver)):0, drvMed: driver.length?Math.round(med(driver)):0,
    drvLong: driver.length?Math.max(...driver):0, driver,
    girHoles:gir,girPB,girBog,birdies:res.Birdie,bogeys:res.Bogey,bogeyGir,
    dblTotal:res.Double+res['Triple+'],dblPar4,
    fwHitAvg:fwHitD.length?avg(fwHitD):null,fwMissAvg:fwMissD.length?avg(fwMissD):null,
    penTot,penHoles,penAvg:penD.length?avg(penD):null,
    paceList: rs.map(r=>({date:r.date,pace:r.pace18}))
  };
}

// ---- KPI + Overview ----
function renderOverview(){
  const a=agg(filtered());
  const k=document.getElementById('kpis');
  const kp=(l,v,s,cl)=>`<div class="kpi ${cl||''}"><p class="lab">${l}</p><p class="val">${v}${s?`<small>${s}</small>`:''}</p></div>`;
  k.innerHTML = kp('Rounds',a.nRounds,'')+kp('Holes',a.nH,'')+kp('Scoring 18',a.pace18.toFixed(0),'')+
    kp('vs par','+'+a.ouP18.toFixed(0),'')+kp('Greens',a.girPct.toFixed(0),'%')+
    kp('Fairways',a.fwPct.toFixed(0),'%')+kp('Putts/18',(a.puttsPerH*18).toFixed(0),'')+
    kp('3-putt',a.threePct.toFixed(0),'%','leak');

  document.getElementById('leak3').textContent=(a.puttsPerH*18).toFixed(0);
  document.getElementById('leakp').textContent=a.threePct.toFixed(0)+'%';
  document.getElementById('leakg').textContent=a.pGirAvg.toFixed(2);
  const puttBad=a.threePct>bench('tp',D.hcp);
  document.getElementById('leakTag').textContent=puttBad?'The leak':'In this view';
  document.getElementById('leakDesc').textContent=puttBad?'You strike it better than you score. This is the part that grades worse than the rest.':'Holding up fine in this slice — your three-putt rate is at or better than your handicap here.';
  document.getElementById('leakRef1').textContent='· ~'+bench('putts',D.hcp).toFixed(0)+' for your hcp';
  document.getElementById('leakRef2').textContent='· ~'+Math.round(bench('tp',D.hcp))+'% for your hcp';
  document.getElementById('leakRef3').textContent='· 2.0 is the baseline';

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
  document.getElementById('pstats').innerHTML=
    stat((a.puttsPerH*18).toFixed(0),'putts / round','vs ~'+bench('putts',D.hcp).toFixed(0)+' for your hcp')+
    stat(a.threePct.toFixed(0)+'%','three-putts','vs ~'+Math.round(bench('tp',D.hcp))+'% for your hcp',a.threePct>bench('tp',D.hcp))+
    stat(a.onePct.toFixed(0)+'%','one-putts','')+
    stat(a.pGirAvg.toFixed(2),'putts after a GIR','2.0 is the baseline',a.pGirAvg>2);
  const pn=document.getElementById('puttNote');
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
  const gch=document.getElementById('gcHead'), gcn=document.getElementById('gcNote');
  if(!G.length || !NG.length){
    document.getElementById('gcHit').textContent = G.length? pG.toFixed(2):'–';
    document.getElementById('gcHitF').textContent = G.length? Math.round(fG)+' ft first putt':'';
    document.getElementById('gcMiss').textContent = NG.length? pNG.toFixed(2):'–';
    document.getElementById('gcMissF').textContent = NG.length? Math.round(fNG)+' ft first putt':'';
    gch.textContent='Putts on greens hit vs missed';
    gcn.textContent='This filter only has '+(G.length?'greens you hit':'greens you missed')+', so there\'s nothing to compare against. Widen the filter to see the split.';
  } else {
  document.getElementById('gcHit').textContent=pG.toFixed(2);
  document.getElementById('gcHitF').textContent=Math.round(fG)+' ft first putt';
  document.getElementById('gcMiss').textContent=pNG.toFixed(2);
  document.getElementById('gcMissF').textContent=Math.round(fNG)+' ft first putt';
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
  document.getElementById('pbdNote').innerHTML = worst? `Your first putt — and your putt count — climbs with approach distance. You're highest from <b>${worst} yds</b> (${Math.max(...avgPutts).toFixed(2)} putts). The putts follow the approach, not the stroke.` : 'Not enough approach data in this filter.';
  // --- fringe-putt sensitivity (Air data-quality what-if) ---
  document.querySelectorAll('[data-fr]').forEach(b=>b.classList.toggle('on',+b.dataset.fr===frT));
  const frK=H.length?18/H.length:0;
  const frTot=H.reduce((s,h)=>s+(h.putts||0),0);
  const frIsAff=h=>h.pd&&h.pd.length&&h.pd[0]>=frT&&(h.putts||0)>=1;
  const frAff=H.filter(frIsAff).length;
  const frP18r=frTot*frK, frP18a=(frTot-frAff)*frK;
  const frTpR=H.filter(h=>(h.putts||0)>=3).length;
  const frTpA=H.filter(h=>((h.putts||0)-(frIsAff(h)?1:0))>=3).length;
  const frBR=(frTot-2*H.length)*frK, frBA=(frTot-frAff-2*H.length)*frK;
  const frPct=v=>H.length?Math.round(100*v/H.length):0;
  document.getElementById('frQuad').innerHTML=
    `<div><span>Putts / 18</span><b>${frP18r.toFixed(1)} → ${frP18a.toFixed(1)}</b></div>`+
    `<div><span>Three-putt rate</span><b>${frPct(frTpR)}% → ${frPct(frTpA)}%</b></div>`+
    `<div><span>Putting strokes / 18</span><b>${frBR>=0?'+':''}${frBR.toFixed(1)} → ${frBA>=0?'+':''}${frBA.toFixed(1)}</b></div>`+
    `<div><span>First putts reclassified</span><b>${frAff} of ${H.length}</b></div>`;
  const frN=document.getElementById('frNote');
  if(!frAff)frN.textContent=`No first putts logged from ${frT}+ ft in this filter — nothing to reclassify at this threshold. Every number on the dashboard uses the data as recorded.`;
  else frN.innerHTML=`If the <b>${frAff}</b> first putts logged from ${frT}+ ft were really fringe strokes, you're a <b>${frP18a.toFixed(1)}</b>-putts-per-18 putter with a <b>${frPct(frTpA)}%</b> three-putt rate (${frTpR-frTpA} three-putt${frTpR-frTpA===1?'':'s'} evaporate), and putting's share of the decomposition drops from ${frBR>=0?'+':''}${frBR.toFixed(1)} to ${frBA>=0?'+':''}${frBA.toFixed(1)} per 18 — pushing more of the leak toward the short game. This card is a what-if; every other number on the dashboard uses the data as recorded.`;
}
function stat(n,l,sub,red){return `<div class="kpi ${red?'leak':''}"><p class="lab">${l}</p><p class="val">${n}</p>${sub?`<p style="font-size:11px;color:var(--muted2);margin:5px 0 0">${sub}</p>`:''}</div>`;}

// ---- Off the tee ----
let drvMin=150;
function renderTee(){
  const a=agg(filtered());
  document.getElementById('tstats').innerHTML=
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
  document.getElementById('drvMinV').textContent=drvMin+'y';
  document.getElementById('drvOut').innerHTML=`<b>${over.length}</b> of ${a.driver.length} drives (${pct}%) carried ${drvMin}y+ &nbsp;·&nbsp; averaging <b>${avg}y</b>`;
}

// ---- The bag ----
let selClub=0;
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
  const ch=document.getElementById('clubchips');
  ch.innerHTML=D.clubs.map((c,i)=>`<div class="chip ${i===selClub?'on':''}" onclick="selClub=${i};renderClub()">
    <div class="cd"><span class="cc" style="background:${C[c.cat]}"></span>${c.name}</div><div class="cn">${c.med}y · ${c.count} shots</div></div>`).join('');
  renderClub();
}
let gapThresh=18;
function updateGapThreshold(){
  const L=D.ladder;let html='';
  for(let i=1;i<L.length;i++){const g=L[i-1].dist-L[i].dist; if(g>=gapThresh)html+=`<span style="color:var(--flag)">${L[i-1].name}→${L[i].name} (${g}y)</span> `;}
  let ov='';for(let i=1;i<L.length;i++){if(L[i-1].dist-L[i].dist<=4)ov+=`${L[i-1].name}/${L[i].name} `;}
  document.getElementById('gapThreshV').textContent=gapThresh+'y';
  document.getElementById('gapOut').innerHTML = (html? ('Gaps ≥ '+gapThresh+'y: '+html) : ('No gaps ≥ '+gapThresh+'y.')) + (ov? `<br><span style="color:var(--brass)">Overlapping (same distance): ${ov}</span>` : '');
}
function renderClub(){
  document.querySelectorAll('#clubchips .chip').forEach((el,i)=>el.classList.toggle('on',i===selClub));
  const c=D.clubs[selClub];
  document.getElementById('clubTitle').innerHTML=`${c.name} <span style="color:var(--muted2);font-weight:400;font-size:13px">· ${c.med}y median · ${c.full} full-swing shots · range ${c.min}–${c.max}y</span>`;
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
let openRound=null;
function renderRounds(){
  const rs=filtered().slice().sort((a,b)=>a.date<b.date?1:-1);
  document.getElementById('rndlist').innerHTML=rs.map(r=>{
    const a=agg([r]);
    return `<div class="rnd ${openRound===r.id?'on':''}" onclick="openRound=(openRound===${r.id}?null:${r.id});renderRounds()">
      <div class="rd">${fmtDate(r.date)}</div><div class="rc">${r.course}</div>
      <div><span class="big">${r.score}</span><span class="ou">+${r.ou} · ${r.n} holes</span></div>
      <div class="rrow"><span>18-pace</span><b>${r.pace18}</b></div>
      <div class="rrow"><span>Greens</span><b>${a.gir}/${a.girN}</b></div>
      <div class="rrow"><span>Putts</span><b>${a.putts.reduce((x,y)=>x+y,0)}</b></div>
    </div>`;
  }).join('') || '<p style="color:var(--muted2)">No rounds in this filter.</p>';
  const sc=document.getElementById('scwrap');
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
  document.getElementById('anstats').innerHTML=
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
  document.getElementById('decompbar').innerHTML=buckets.map(b=>{const w=Math.max(0,b[1])/posTot*100;return w>0?`<div class="seg" style="width:${w}%;background:${b[2]}">${w>9?Math.round(w)+'%':''}</div>`:'';}).join('');
  document.getElementById('decompkey').innerHTML=buckets.map(b=>`<span><i style="background:${b[2]}"></i>${b[0]} ${(b[1]*k>=0?'+':'')}${(b[1]*k).toFixed(1)}/18</span>`).join('');
  // per-phase benchmark stat + verdict
  const drv=H.filter(h=>h.drv).map(h=>h.drv);
  const drvMed=drv.length?med(drv):0;
  const putts18=H.length?H.reduce((s,h)=>s+h.putts,0)/H.length*18:0;
  const tpPct=H.length?100*H.filter(h=>h.putts>=3).length/H.length:0;
  const pen18=penalty*k, girPctA=H.length?100*gir.length/H.length:0;
  const bGirF=bench('gir',D.hcp),bScrF=bench('scr',D.hcp),bPutF=bench('putts',D.hcp),bPenF=bench('pen',D.hcp);
  const bScr=Math.round(bScrF),bGir=Math.round(bGirF),bPut=bPutF,bTp=Math.round(bench('tp',D.hcp)),bPen=bPenF,bDrv=Math.round(bench('drv',D.hcp));
  document.getElementById('decompTitle').textContent=`Where your strokes go — and where you lose vs a ${D.hcp}`;
  function lvh(ph,strk,cmp,win,tag){const cls=win===1?'win':win===-1?'lose':'flat';return `<div class="lvh-card ${cls}"><div class="lvh-ph">${ph}</div><div class="lvh-str">${strk>=0?'+':''}${strk.toFixed(1)}<span>str/18</span></div><div class="lvh-cmp">${cmp}</div><span class="lvh-tag ${cls}">${tag}</span></div>`;}
  const cards=[
    lvh('Approach', approach*k, `${Math.round(girPctA)}% greens vs ~${bGir}% · ${drvMed}y vs ~${bDrv}y`, girPctA>bGirF?1:-1, girPctA>bGirF?'Strength':'Leak'),
    lvh('Short game', shortgame*k, `${scrPct}% scrambling vs ~${bScr}% — most of its cost hides in Approach &amp; Putting`, scrPct<bScrF?-1:1, scrPct<bScrF?'Leak':'Strength'),
    lvh('Putting', putting*k, `${Math.round(putts18)} putts/18 &amp; ${Math.round(tpPct)}% 3-putts vs ~${Math.round(bPut)} &amp; ${bTp}% · Air may over-count putts`, putts18>bPutF?-1:1, putts18>bPutF?'Leak':'Strength'),
    lvh('Off the tee', penalty*k, `${pen18.toFixed(1)} penalties/18 vs ~${bPen.toFixed(1)} · ${drvMed}y is a weapon`, pen18>bPenF?-1:0, pen18>bPenF?'Leak':'Even'),
  ];
  document.getElementById('lvhGrid').innerHTML=cards.join('');
  document.getElementById('decomptext').innerHTML=`Approach is your biggest <em>bucket</em> only because everyone misses some greens — but at <b>${Math.round(girPctA)}%</b> you hit more than a ${D.hcp}'s ~${bGir}%, so it's actually a strength. The real leaks are the short game (a <b>${scrPct}%</b> scramble rate turns missed greens into bogeys) and putting (<b>${Math.round(putts18)}</b> putts/18). Short game looks small in the bar because a blown up-and-down surfaces as an extra putt or the green miss itself — the ${scrPct}%-vs-~${bScr}% gap is the engine behind both other buckets. Note: Arccos Air has no putter sensor and may log fringe strokes as putts, so treat the putting figure as a ceiling — the toggle on the Putting tab sizes the band.`;
  draw('scrchart',{type:'bar',data:{labels:['You','Your hcp','Tour'],datasets:[{data:[scrPct,Math.round(bench('scr',D.hcp)),58],backgroundColor:['#e35a50','#5e9c7e','#4ea87a'],borderRadius:5,borderSkipped:'start',barThickness:54}]},
    plugins:[topLab],options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{grid:{display:false},border:{display:false}},y:{grid:{color:GRID},border:{display:false},max:70,ticks:{callback:v=>v+'%'}}}}});
  charts['scrchart'].$fmt=v=>v+'%';charts['scrchart'].update();
  draw('cascade',{type:'bar',data:{labels:['Fairway hit','Fairway missed'],datasets:[{data:[gp(fwHit),gp(fwMiss)],backgroundColor:['#4ea87a','#c9a24a'],borderRadius:5,borderSkipped:'start',barThickness:54}]},
    plugins:[topLab],options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{grid:{display:false},border:{display:false}},y:{grid:{color:GRID},border:{display:false},max:100,ticks:{callback:v=>v+'%'}}}}});
  charts['cascade'].$fmt=v=>v+'%';charts['cascade'].update();
  document.getElementById('dblanat').innerHTML=
    `<li><b>${dbl.length}</b> doubles or worse in this view</li>`+
    `<li><b>${dbl.length?Math.round(100*dblMiss/dbl.length):0}%</b> missed the green</li>`+
    `<li><b>${dbl.length?Math.round(100*dblPen/dbl.length):0}%</b> involved a penalty</li>`+
    `<li><b>${dbl3p}</b> were a three-putt from a green you hit</li>`;
  const ah=document.getElementById('anHead'),asub=document.getElementById('anSub');
  if(girPctA>bGirF && (putts18>bPutF || scrPct<bScrF)){ah.textContent=`You strike it better than a ${D.hcp}. You lose it on and around the green.`;asub.innerHTML=`You hit <b>${Math.round(girPctA)}%</b> of greens (vs ~${bGir}% for a ${D.hcp}) and carry it ${drvMed}y — real ball-striking strength. The strokes pile up after you reach the green area: a <b>${scrPct}%</b> scramble rate and <b>${Math.round(putts18)}</b> putts/18 are what hold the score back.`;}
  else if(scrPct<bScrF){ah.textContent='The leak in this slice is the short game.';asub.innerHTML=`Your scramble rate is <b>${scrPct}%</b> vs ~${bScr}% for a ${D.hcp} — missed greens are turning into dropped shots. Ball-striking (<b>${Math.round(girPctA)}%</b> greens) is keeping you in it.`;}
  else{ah.textContent='Tidy in this slice — the leaks are narrow.';asub.innerHTML=`In this filter your scramble rate (<b>${scrPct}%</b>) and putting (<b>${Math.round(putts18)}</b>/18) are close to a ${D.hcp}, with <b>${Math.round(girPctA)}%</b> greens hit.`;}
  const tt=document.getElementById('threadText');
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
  const topS=str[0],topF=foc[0],ol=document.getElementById('oneLiner'),osub=document.getElementById('oneSub');
  if(topS&&topF){ol.textContent=`Ahead on ${topS.label.toLowerCase()}, held back by ${topF.label.toLowerCase()}.`;osub.textContent=`Across the rounds in view, ${topS.label.toLowerCase()} is your clearest strength and ${topF.label.toLowerCase()} is the biggest thing costing you.`;}
  else if(topF){ol.textContent=`Where to focus: ${topF.label.toLowerCase()}.`;osub.textContent=`Nothing rates as a standout strength in this slice — ${topF.label.toLowerCase()} is the clearest thing to work on.`;}
  else if(topS){ol.textContent=`Solid all around — led by ${topS.label.toLowerCase()}.`;osub.textContent=`No glaring weakness shows up in this view.`;}
  else{ol.textContent=`Not enough holes in this filter to call it.`;osub.textContent=`Widen the date range or pick a course with more rounds.`;}
  // strengths
  let s=str.map(it=>takeCard('g',it.label,it.stat,it.body)).join('');
  if(!str.length)s='<p class="emptyt">No standout strengths in this slice — small sample.</p>';
  s+=takeCard('g','Sand play <span class="aw">all rounds</span>','#2',`Arccos grades your sand game (${D.cat.sand}) second only to driving. Account-wide grade — per-shot sand data isn't exportable.`);
  document.getElementById('strengths').innerHTML=s;
  // focus (ranked, #1 is hot)
  let f=foc.map((it,i)=>`<div class="take ${i===0?'f hot':'f'}"><div class="th"><p class="tt"><span class="rank">${i+1}</span>${it.label}</p><div class="ts">${it.stat}</div></div><p class="tb">${it.body}</p></div>`).join('');
  if(!foc.length)f='<p class="emptyt">Nothing is screaming for attention in this slice — nice.</p>';
  let mg=0,gA='',gB='',dA=0,dB=0;for(let i=1;i<D.ladder.length;i++){if(D.ladder[i].dist>=130)continue;const g=D.ladder[i-1].dist-D.ladder[i].dist;if(g>mg){mg=g;gA=D.ladder[i-1].name;gB=D.ladder[i].name;dA=D.ladder[i-1].dist;dB=D.ladder[i].dist;}}
  if(mg)f+=takeCard('f','Wedge gapping <span class="aw">all rounds</span>',mg+'y',`Biggest gap in your scoring zone is ${gA} (${dA}y) → ${gB} (${dB}y). A club around ${Math.round((dA+dB)/2)}y fills it with a stock swing instead of a half-shot.`);
  document.getElementById('focus').innerHTML=f;
}

// ---- Benchmarks vs handicap ----
const BENCH={
  score:[[0,74],[5,79],[10,84],[15,90],[20,95]],
  gir:[[0,65],[5,54],[10,43],[15,32],[20,23]],
  fw:[[0,61],[5,56],[10,51],[15,46],[20,41]],
  drv:[[0,252],[5,241],[10,230],[15,217],[20,202]],
  putts:[[0,29.5],[5,30.8],[10,32],[15,33.2],[20,34.5]],
  tp:[[0,7],[5,10],[10,13],[15,17],[20,21]],
  scr:[[0,60],[5,48],[10,38],[15,30],[20,23]],
  pen:[[0,0.6],[5,1.0],[10,1.4],[15,1.9],[20,2.5]],
};
function bench(stat,hcp){const t=BENCH[stat];if(hcp<=t[0][0])return t[0][1];if(hcp>=t[t.length-1][0])return t[t.length-1][1];
  for(let i=1;i<t.length;i++){if(hcp<=t[i][0]){const f=(hcp-t[i-1][0])/(t[i][0]-t[i-1][0]);return t[i-1][1]+f*(t[i][1]-t[i-1][1]);}}return t[t.length-1][1];}
let benchHcp=null;
function renderBench(){
  if(benchHcp===null)benchHcp=D.hcp;
  const a=agg(filtered());
  const H=[];filtered().forEach(r=>r.holes.forEach(h=>H.push(h)));
  const ng=H.filter(h=>h.gir===0);const scr=ng.length?100*ng.filter(h=>h.score-h.par<=0).length/ng.length:0;
  const penRd=a.nRounds?a.penTot/a.nRounds:0;
  document.getElementById('benchHcpV').textContent=benchHcp.toFixed(1);
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
  document.getElementById('benchrows').innerHTML=C.map(r=>{
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
  document.getElementById('benchsummary').innerHTML=`Against ${lvl}, you're ahead on <b>${nAhead}</b> of ${C.length}. Biggest edge: <b style="color:#7fd3a4">${best.name.toLowerCase()}</b>. Furthest behind: <b style="color:#f08a82">${worst.name.toLowerCase()}</b>${benchHcp<D.hcp-0.05?' — the gap to close to get there':''}.`;
}

// ---- Approach & scoring yardages ----
const TOURPROX={'50-100':16,'100-125':20,'125-150':24,'150-175':29,'175-200':34,'200+':42};
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
  const ah=document.getElementById('apHead'),asub=document.getElementById('apSub');
  if(w&&w.n){const wp=Math.round(med(w.prox));
    ah.textContent=`From wedge range you're leaving it ${wp} feet.`;
    asub.innerHTML=`From 50–100 yards you finish about <b>${wp} ft</b> from the pin (tour ~${TOURPROX['50-100']} ft) and hit the green <b>${Math.round(100*w.hit/w.n)}%</b> of the time. Tighter approaches here is the upstream fix for both leaks — closer shots mean more greens hit and shorter first putts on the ones you do.`;}
  else {ah.textContent='Approach proximity by distance.';asub.textContent='Not enough approach shots in this filter to break down.';}

  // --- proximity by club + miss pattern (from agr: [club,startYd,proxFt,crossFt,alongFt]) ---
  const AG=[]; H.forEach(h=>{if(h.agr)AG.push(h.agr);});
  const byClub={}; AG.forEach(a=>{(byClub[a[0]]=byClub[a[0]]||[]).push(a[2]);});
  const CORDER=['3H','4i','5i','6i','7i','8i','9i','PW','GW','56°','60°'];
  const pcRows=CORDER.filter(c=>byClub[c]&&byClub[c].length>=3).map(c=>({c,n:byClub[c].length,m:Math.round(med(byClub[c]))}));
  const pcH=document.getElementById('pcHead'),pcS=document.getElementById('pcSub');
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
  const amH=document.getElementById('amHead'),amS=document.getElementById('amSub'),amQ=document.getElementById('amQuad');
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
  document.getElementById('ptGrid').innerHTML=PT.map(t=>
    `<div class="pt-card"><div class="pt-h">Par ${t.p} <span>· ${t.n} holes</span></div>
     <div class="pt-big">+${t.over.toFixed(2)}<span>avg vs par</span></div>
     <div class="pt-rows"><span>Greens</span><b>${Math.round(t.gir)}%</b></div>
     <div class="pt-rows"><span>Putts</span><b>${t.putts.toFixed(2)}</b></div>
     <div class="pt-rows"><span>Birdies</span><b>${Math.round(t.bird)}%</b></div>
     <div class="pt-rows"><span>Bogey+</span><b>${Math.round(t.bog)}%</b></div></div>`).join('');
  const worst=PT.slice().sort((a,b)=>b.over-a.over)[0];
  const p5=PT.find(t=>t.p===5);
  const ptn=document.getElementById('ptNote');
  if(p5 && worst.p===5 && p5.bird<5)
    ptn.innerHTML=`Your toughest type is the <b>par 5</b> (+${p5.over.toFixed(2)}, just ${Math.round(p5.gir)}% greens, ${Math.round(p5.bird)}% birdies) — which is backwards for the longest hitter in your bag. These should be your birdie holes; right now they're scoring like your hardest.`;
  else ptn.innerHTML=`Your toughest hole type in this view is the <b>par ${worst.p}</b> at +${worst.over.toFixed(2)} over par.`;
}

// ---- helpers / wiring ----
function fmtDate(d){const [y,m,da]=d.split('-');const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return M[+m-1]+' '+(+da);}
function dedupeDates(ds){const cnt={};ds.forEach(d=>cnt[d]=(cnt[d]||0)+1);const seen={};return ds.map(d=>{if(cnt[d]>1){seen[d]=(seen[d]||0)+1;return fmtDate(d)+' ('+seen[d]+')';}return fmtDate(d);});}
function renderTiger5(){
  const rs=filtered();
  let H=[]; rs.forEach(r=>r.holes.forEach(h=>H.push(h)));
  const k=H.length?18/H.length:0;
  if(!H.length){document.getElementById('t5Head').textContent='No rounds in this filter.';document.getElementById('t5Sub').textContent='';document.getElementById('t5stats').innerHTML='';document.getElementById('t5break').innerHTML='';return;}
  const c_dbl=H.filter(h=>h.score-h.par>=2).length;
  const c_3p =H.filter(h=>h.putts>=3).length;
  const c_p5 =H.filter(h=>h.par===5&&h.score-h.par>=1).length;
  const c_150=H.filter(h=>h.apd!=null&&h.apd<=150&&h.score-h.par>=1).length;
  const c_dc =H.filter(h=>h.dc===1).length;
  const cats=[['Bogey+ inside 150',c_150],['Three-putts',c_3p],['Doubles or worse',c_dbl],['Par-5 bogeys+',c_p5],['Double chips',c_dc]];
  const total=cats.reduce((s,c)=>s+c[1],0), per18=total*k;
  const sorted=[...cats].sort((a,b)=>b[1]-a[1]); const big=sorted[0];
  document.getElementById('t5Head').textContent=`You average ${per18.toFixed(1)} of Tiger's five mistakes per 18 holes.`;
  document.getElementById('t5Sub').innerHTML=`Tiger tracked five unforced errors and figured six or fewer per tournament — about <b>1.5 a round</b> — meant he'd win. Your most common by far is <b>${big[0].toLowerCase()}</b> at <b>${(big[1]*k).toFixed(1)}/18</b>${big[0]==='Bogey+ inside 150'?', dropped shots with a scoring club in hand — the same wedge-proximity and short-game leak the rest of the dashboard keeps surfacing':', the one to attack first'}.`;
  const perHole=H.map(h=>((h.score-h.par>=2)?1:0)+((h.putts>=3)?1:0)+((h.par===5&&h.score-h.par>=1)?1:0)+((h.apd!=null&&h.apd<=150&&h.score-h.par>=1)?1:0)+((h.dc===1)?1:0));
  const clean=perHole.filter(c=>c===0).length;
  document.getElementById('t5stats').innerHTML=
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
  document.getElementById('t5break').innerHTML=sorted.map(c=>{const pr=(c[1]*k);return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-top:1px solid var(--line)"><span style="font-size:13px;color:var(--muted)">${c[0]}</span><span><b style="font-size:15px;color:var(--ink)">${c[1]}</b> <span style="color:var(--muted2);font-size:11px">· ${pr.toFixed(1)}/18</span></span></div>`;}).join('');
}

function renderActive(){const t=document.querySelector('.tab.on').dataset.tab;
  if(t==='overview')renderOverview();else if(t==='putting')renderPutting();else if(t==='tee')renderTee();
  else if(t==='bag')renderBag();else if(t==='rounds')renderRounds();else if(t==='takeaways')renderTakeaways();else if(t==='anatomy')renderAnatomy();else if(t==='benchmarks')renderBench();else if(t==='approach')renderApproach();else if(t==='tiger5')renderTiger5();}
function updateSummary(){const rs=filtered();const ds=rs.map(r=>r.date).sort();
  document.getElementById('summary').textContent= rs.length?
    `Showing ${rs.length} rounds · ${rs.reduce((s,r)=>s+r.n,0)} holes · ${fmtDate(ds[0])}–${fmtDate(ds[ds.length-1])}${state.course!=='All'?' · '+state.course:''}`
    :'No rounds match this filter.';}

window.addEventListener('DOMContentLoaded',()=>{
  // tabs
  document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));
    document.querySelectorAll('.panel').forEach(x=>x.classList.remove('on'));
    t.classList.add('on');document.getElementById('p-'+t.dataset.tab).classList.add('on');renderActive();});
  // course buttons
  document.querySelectorAll('[data-course]').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('[data-course]').forEach(x=>x.classList.remove('on'));b.classList.add('on');
    state.course=b.dataset.course;updateSummary();renderActive();});
  // date range
  const f=document.getElementById('fromR'),tt=document.getElementById('toR');
  f.max=tt.max=sortedDates.length-1;f.value=0;tt.value=sortedDates.length-1;
  function dr(){state.fromIdx=Math.min(+f.value,+tt.value);state.toIdx=Math.max(+f.value,+tt.value);
    document.getElementById('fromV').textContent=fmtDate(sortedDates[state.fromIdx]);
    document.getElementById('toV').textContent=fmtDate(sortedDates[state.toIdx]);
    updateSummary();renderActive();}
  f.oninput=dr;tt.oninput=dr;
  document.getElementById('resetF').onclick=()=>{state={course:'All',fromIdx:0,toIdx:sortedDates.length-1};
    f.value=0;tt.value=sortedDates.length-1;document.querySelectorAll('[data-course]').forEach(x=>x.classList.toggle('on',x.dataset.course==='All'));dr();};
  // tee slider
  const dm=document.getElementById('drvMin');dm.oninput=()=>{drvMin=+dm.value;updateDrvSlider();};
  // gap threshold
  const gt=document.getElementById('gapThresh');gt.oninput=()=>{gapThresh=+gt.value;updateGapThreshold();};
  // what-if sliders
  // benchmark selector
  document.querySelectorAll('[data-bh]').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('[data-bh]').forEach(x=>x.classList.remove('on'));b.classList.add('on');
    benchHcp = b.dataset.bh==='self'? D.hcp : +b.dataset.bh;
    document.getElementById('benchSlider').value=benchHcp; renderBench();});
  const bs=document.getElementById('benchSlider');bs.value=D.hcp;
  document.querySelector('[data-bh="self"]').textContent='My handicap · '+D.hcp;
  document.querySelectorAll('[data-fr]').forEach(b=>b.onclick=()=>{frT=+b.dataset.fr;renderPutting();});
  bs.oninput=()=>{benchHcp=+bs.value;document.querySelectorAll('[data-bh]').forEach(x=>x.classList.remove('on'));renderBench();};
  document.getElementById('fromV').textContent=fmtDate(sortedDates[0]);
  document.getElementById('toV').textContent=fmtDate(sortedDates[sortedDates.length-1]);
  document.getElementById('footMeta').textContent='through '+fmtDate(D.meta.dateMax)+' · '+D.meta.nRounds+' rounds, '+D.meta.nHoles+' holes';
  updateSummary();renderOverview();
});
"""

BODY = """
<div class="wrap">
  <header class="mast">
    <p class="eyebrow">Personal Round Book · Arccos · interactive</p>
    <h1>The Round Book <em>— explore it.</em></h1>
    <p class="sub">Every chart and slider computes live from your tracked shots. Filter by course or date, drill into any round, explore your bag, and project where strokes are hiding.</p>
  </header>

  <div class="filters">
    <div class="fgroup"><span class="flab">Course</span>
      <div class="btns" id="coursebtns">
        <button class="btn on" data-course="All">All</button>
        <button class="btn" data-course="Birchwood CC">Birchwood</button>
        <button class="btn" data-course="Longshore Golf Club">Longshore</button>
        <button class="btn" data-course="The Connecticut GC">Connecticut</button>
      </div>
    </div>
    <div class="fgroup"><span class="flab">From</span>
      <div class="rangewrap"><input type="range" id="fromR" min="0" step="1"><span class="rv" id="fromV"></span></div>
    </div>
    <div class="fgroup"><span class="flab">To</span>
      <div class="rangewrap"><input type="range" id="toR" min="0" step="1"><span class="rv" id="toV"></span></div>
    </div>
    <button class="btn reset" id="resetF">Reset</button>
    <div class="summaryline" id="summary"></div>
  </div>

  <nav class="tabs">
    <button class="tab on" data-tab="overview">Overview</button>
    <button class="tab" data-tab="putting">Putting</button>
    <button class="tab" data-tab="tee">Off the Tee</button>
    <button class="tab" data-tab="approach">Approach</button>
    <button class="tab" data-tab="bag">The Bag</button>
    <button class="tab" data-tab="rounds">Rounds</button>
    <button class="tab" data-tab="takeaways">Takeaways</button>
    <button class="tab" data-tab="anatomy">Anatomy</button>
    <button class="tab" data-tab="benchmarks">Benchmarks</button>
    <button class="tab" data-tab="tiger5">Tiger 5</button>
  </nav>

  <!-- OVERVIEW -->
  <section class="panel on" id="p-overview">
    <div class="kpis" id="kpis"></div>
    <div class="leakband">
      <div><p class="tag" id="leakTag">The leak</p><h3 id="leakName">Putting</h3><p class="d" id="leakDesc">Every other part of your game grades better than your overall number. This is the one that doesn't.</p></div>
      <div class="lst"><p class="n" id="leak3">40</p><p class="l">putts / round <span id="leakRef1"></span></p></div>
      <div class="lst"><p class="n" id="leakp">29%</p><p class="l">three-putts <span id="leakRef2"></span></p></div>
      <div class="lst"><p class="n" id="leakg">2.45</p><p class="l">putts after a GIR <span id="leakRef3"></span></p></div>
    </div>
    <div class="grid">
      <div class="card"><h4>Scorecard shape</h4><p class="cap">Every hole by result, in the current filter.</p><div class="chartbox" style="height:230px"><canvas id="dist"></canvas></div></div>
      <div class="card"><h4>Where strokes go</h4><p class="cap">Arccos category handicap (all rounds) — lower is better.</p><div class="chartbox" style="height:230px"><canvas id="cats"></canvas></div></div>
      <div class="card"><h4>Scoring, round by round</h4><p class="cap">Each round scaled to an 18-hole pace.</p><div class="chartbox" style="height:220px"><canvas id="trend"></canvas></div></div>
      <div class="card"><h4>By par type</h4><p class="cap">Strokes over par.</p><div class="chartbox" style="height:220px"><canvas id="parc"></canvas></div></div>
    </div>
  </section>

  <!-- PUTTING -->
  <section class="panel" id="p-putting">
    <div class="kpis" id="pstats" style="grid-template-columns:repeat(4,1fr)"></div>
    <div class="grid">
      <div class="card"><h4>How many putts per hole</h4><p class="cap">How often each hole takes 1, 2, 3, or 4 putts, in the current filter.</p><div class="chartbox" style="height:250px"><canvas id="pdist"></canvas></div></div>
      <div class="card"><h4>Three-putts per round</h4><p class="cap">Where they're clustering.</p><div class="chartbox" style="height:250px"><canvas id="p3r"></canvas></div></div>
    </div>
    <p class="note" id="puttNote"></p>
    <div class="card full" style="margin-top:16px;border-color:rgba(201,162,74,.3)">
      <h4 id="gcHead" style="font-size:17px;margin:0 0 12px"></h4>
      <div class="gir-cmp">
        <div class="gc-box"><div class="gc-v" id="gcHit">–</div><div class="gc-l">putts on greens hit</div><div class="gc-s" id="gcHitF"></div></div>
        <div class="gc-vs">vs</div>
        <div class="gc-box"><div class="gc-v" id="gcMiss">–</div><div class="gc-l">putts on greens missed</div><div class="gc-s" id="gcMissF"></div></div>
      </div>
      <p class="note" id="gcNote"></p>
    </div>
    <div class="card full" style="margin-top:16px">
      <h4>Putts by how far you came in from</h4>
      <p class="cap">Average putts on the hole, grouped by your approach distance, with the first-putt length that drives them.</p>
      <div class="chartbox" style="height:250px"><canvas id="puttByDist"></canvas></div>
      <p class="note" id="pbdNote"></p>
    </div>
    <div class="card full" style="margin-top:16px">
      <p class="eyebrow">Data quality</p>
      <h4>How real is the putting number?</h4>
      <p class="cap">Arccos Air has no putter sensor, so strokes from the fringe can get logged as putts. Pick a threshold: any hole whose first putt was logged from at least that far gets one stroke reclassified from putt to fringe shot. Recorded → adjusted; the truth likely sits in between.</p>
      <div class="fr-row"><span>If first putts from</span><button class="btn" data-fr="40">40 ft</button><button class="btn on" data-fr="50">50 ft</button><button class="btn" data-fr="60">60 ft</button><span>were fringe strokes:</span></div>
      <div class="missquad" id="frQuad"></div>
      <p class="note" id="frNote"></p>
    </div>
  </section>

  <!-- TEE -->
  <section class="panel" id="p-tee">
    <div class="kpis" id="tstats" style="grid-template-columns:repeat(4,1fr)"></div>
    <div class="card full" style="margin-bottom:16px">
      <h4>Distance explorer</h4><p class="cap">Drag to see how many of your drives clear a target distance.</p>
      <div class="rangewrap" style="margin:6px 0 10px"><input type="range" id="drvMin" min="150" max="300" step="5" value="150" style="width:260px"><span class="rv" id="drvMinV">150y</span></div>
      <p id="drvOut" style="font-size:13.5px;color:var(--muted)"></p>
    </div>
    <div class="grid">
      <div class="card"><h4>Every drive</h4><p class="cap">Tee-shot distances, current filter.</p><div class="chartbox" style="height:230px"><canvas id="drvh"></canvas></div></div>
      <div class="card"><h4>Fairway accuracy</h4><p class="cap">Hit vs missed left / right.</p><div class="chartbox" style="height:230px"><canvas id="fwacc"></canvas></div></div>
    </div>
  </section>

  <!-- APPROACH -->
  <section class="panel" id="p-approach">
    <div class="card full" style="margin-bottom:16px;border-color:rgba(201,162,74,.3)">
      <p class="eyebrow">Scoring yardages</p>
      <h4 id="apHead" style="font-size:19px;margin:0 0 4px"></h4>
      <p class="cap" id="apSub" style="margin:0"></p>
    </div>
    <div class="grid">
      <div class="card"><h4>How often you hit the green</h4><p class="cap">By the distance you're hitting from (full shots over 50 yards).</p><div class="chartbox" style="height:240px"><canvas id="apHit"></canvas></div></div>
      <div class="card"><h4>How close you finish</h4><p class="cap">Median proximity to the pin — you vs tour averages.</p><div class="chartbox" style="height:240px"><canvas id="apProx"></canvas></div></div>
    </div>
    <div class="card full" style="margin-top:16px">
      <p class="eyebrow">By club</p>
      <h4 id="pcHead" style="font-size:18px;margin:0 0 4px"></h4>
      <p class="cap" id="pcSub" style="margin:0 0 10px"></p>
      <div class="chartbox" style="height:300px"><canvas id="apClub"></canvas></div>
      <p class="note">Median distance to the pin after an approach that finished within 50 yards of the green, grouped by the club you hit. Clubs with at least 3 such shots shown. Air units don't record lie, so these are finishes regardless of lie.</p>
    </div>
    <div class="card full" style="margin-top:16px">
      <p class="eyebrow">Miss pattern</p>
      <h4 id="amHead" style="font-size:18px;margin:0 0 4px"></h4>
      <p class="cap" id="amSub" style="margin:0 0 10px"></p>
      <div class="chartbox" style="height:380px"><canvas id="apMiss"></canvas></div>
      <div class="missquad" id="amQuad"></div>
      <p class="note">Each dot is one approach, placed where it finished relative to the pin at center. Green found the green, red missed. Up = long, down = short; right/left as you faced the shot. Dashed ring ≈ green proximity (33 ft).</p>
    </div>
    <div class="card full" style="margin-top:16px">
      <h4>By par type</h4><p class="cap">Where your strokes go on each kind of hole.</p>
      <div class="pt-grid" id="ptGrid"></div>
      <p class="note" id="ptNote"></p>
    </div>
    <p class="note">Approach distances and proximity come from your GPS shot positions (start-to-pin, end-to-pin); "hit green" ≈ finishing within 33 ft. Tour proximity figures are reference averages. Small sample, so read as direction.</p>
  </section>

  <!-- BAG -->
  <section class="panel" id="p-bag">
    <div class="card full" style="margin-bottom:16px">
      <h4>The bag, by distance</h4><p class="cap">Arccos smart distances, longest to shortest. Drag the gap finder to highlight holes in your set.</p>
      <div class="chartbox" style="height:330px"><canvas id="ladder"></canvas></div>
      <div class="legend"><span><i style="background:#3f78c4"></i>Woods</span><span><i style="background:#4ea87a"></i>Irons</span><span><i style="background:#c9a24a"></i>Wedges</span></div>
      <div class="rangewrap" style="margin-top:14px"><span style="font-size:12px;color:var(--muted2)">Gap finder</span><input type="range" id="gapThresh" min="8" max="40" step="1" value="18" style="width:200px"><span class="rv" id="gapThreshV">18y</span></div>
      <p id="gapOut" style="font-size:13px;color:var(--muted);margin-top:10px"></p>
    </div>
    <div class="card full">
      <h4>Club explorer</h4><p class="cap">Tap a club to see how you actually use it across distances.</p>
      <div class="chips" id="clubchips"></div>
      <h4 id="clubTitle" style="font-size:15px;margin-top:6px"></h4>
      <div class="chartbox" style="height:220px"><canvas id="clubhist"></canvas></div>
    </div>
  </section>

  <!-- ROUNDS -->
  <section class="panel" id="p-rounds">
    <div class="rndgrid" id="rndlist"></div>
    <div id="scwrap" style="margin-top:18px"></div>
  </section>

  <!-- TAKEAWAYS -->
  <section class="panel" id="p-takeaways">
    <div class="card full" style="margin-bottom:18px;border-color:var(--line2)">
      <p class="eyebrow" style="margin-bottom:6px">The one-liner</p>
      <h4 id="oneLiner" style="font-size:19px;margin:0 0 4px">Your scoring gap is conversion, not creation.</h4>
      <p class="cap" id="oneSub" style="margin:0">You give yourself chances — more greens than your handicap suggests. The strokes leak when those chances don't turn into pars.</p>
    </div>
    <div class="takegrid">
      <div><h3 class="takehd good">What's working</h3><div id="strengths"></div></div>
      <div><h3 class="takehd focus">Where to focus</h3><div id="focus"></div></div>
    </div>
    <p class="note">Strengths and focus areas recompute from the rounds in your current filter (except the sand grade, which is Arccos's account-wide number).</p>
  </section>

  <!-- ANATOMY -->
  <section class="panel" id="p-anatomy">
    <div class="card full" style="margin-bottom:16px;border-color:rgba(227,90,80,.32)">
      <p class="eyebrow" style="margin-bottom:6px">The real picture</p>
      <h4 id="anHead" style="font-size:19px;margin:0 0 4px">You strike it better than your handicap. You lose it on and around the green.</h4>
      <p class="cap" id="anSub" style="margin:0">You reach greens more often than your handicap and you're long off the tee. The strokes pile up after that, in the short game and on the greens.</p>
    </div>
    <div class="kpis" id="anstats" style="grid-template-columns:repeat(4,1fr)"></div>
    <div class="card full" style="margin-bottom:16px">
      <h4 id="decompTitle">Where your strokes go — and where you lose vs your handicap</h4><p class="cap">Your strokes over par split by phase, with how each phase stacks up against your handicap benchmark.</p>
      <div class="seg-bar" id="decompbar"></div>
      <div class="decomp-key" id="decompkey"></div>
      <div class="lvh-grid" id="lvhGrid"></div>
      <p class="decomp-text" id="decomptext"></p>
    </div>
    <div class="grid">
      <div class="card"><h4>Scrambling</h4><p class="cap">Par saves when you miss the green.</p><div class="chartbox" style="height:230px"><canvas id="scrchart"></canvas></div></div>
      <div class="card"><h4>Fairways cascade into greens</h4><p class="cap">Your GIR rate, split by whether you found the short grass.</p><div class="chartbox" style="height:230px"><canvas id="cascade"></canvas></div></div>
    </div>
    <div class="grid" style="margin-top:16px">
      <div class="card"><h4>Anatomy of a double</h4><p class="cap">What your blow-up holes have in common.</p><ul class="anat-list" id="dblanat"></ul></div>
      <div class="card"><h4>The thread tying both leaks together</h4><p class="cap" style="margin-bottom:12px">One distance does double duty.</p>
        <p id="threadText" style="font-size:13.5px;color:var(--muted);line-height:1.62"></p></div>
    </div>
    <p class="note">The decomposition uses Arccos's official score, putt, and penalty fields and sums exactly to your strokes over par; double chips and chip proximity come from your GPS shot positions. Small sample (the rounds in your filter) — read as direction, not gospel.</p>
  </section>

  <!-- BENCHMARKS -->
  <section class="panel" id="p-benchmarks">
    <div class="card full" style="margin-bottom:16px">
      <div style="display:flex;flex-wrap:wrap;gap:16px 26px;align-items:flex-end">
        <div class="fgroup"><span class="flab">Compare against</span>
          <div class="btns" id="benchbtns">
            <button class="btn on" data-bh="self">My handicap · 13.7</button>
            <button class="btn" data-bh="10">10</button>
            <button class="btn" data-bh="5">5</button>
            <button class="btn" data-bh="0">Scratch</button>
          </div>
        </div>
        <div class="fgroup"><span class="flab">or drag to any target</span>
          <div class="rangewrap"><input type="range" id="benchSlider" min="0" max="25" step="0.5"><span class="rv">a <b id="benchHcpV" style="color:var(--brass)">13.7</b> hcp</span></div>
        </div>
      </div>
      <p style="font-size:12px;color:var(--muted2);margin:13px 0 0">Center line is that golfer's average. <span style="color:#7fd3a4">Right = you're better</span>, <span style="color:#f08a82">left = you're behind</span>. The two numbers are you vs their average.</p>
    </div>
    <div class="card full">
      <div class="bench-head"><span></span><span class="bh-you">You</span><span></span><span class="bh-avg">Avg</span><span></span></div>
      <div id="benchrows"></div>
      <p class="bench-summary" id="benchsummary"></p>
    </div>
  </section>

  <!-- TIGER 5 -->
  <section class="panel" id="p-tiger5">
    <div class="card full" style="margin-bottom:16px;border-color:rgba(201,162,74,.3)">
      <p class="eyebrow">The Tiger 5</p>
      <h4 id="t5Head" style="font-size:19px;margin:0 0 4px"></h4>
      <p class="cap" id="t5Sub" style="margin:0"></p>
    </div>
    <div class="kpis" id="t5stats" style="grid-template-columns:repeat(3,1fr)"></div>
    <div class="card full" style="margin:16px 0">
      <h4>The five mistakes, per round</h4><p class="cap">Average times per round you commit each. The dashed line is Tiger's whole-target of ~1.5 mistakes per <em>round</em> (he aimed for six per tournament).</p>
      <div class="chartbox" style="height:300px"><canvas id="t5chart"></canvas></div>
    </div>
    <div class="grid">
      <div class="card"><h4>Round by round</h4><p class="cap">Total Tiger-5 mistakes in each round, normalized per 18.</p><div class="chartbox" style="height:280px"><canvas id="t5rounds"></canvas></div></div>
      <div class="card"><h4>What it's costing you</h4><p class="cap" style="margin-bottom:10px">Where the mistakes concentrate.</p><div id="t5break"></div></div>
    </div>
    <p class="note">Definitions follow Scott Fawcett's DECADE system: doubles+ (score ≥ par+2), three-putts (3+ putts), par-5 bogeys+ (bogey or worse on a par 5), bogeys+ inside 150 (a bogey or worse on a hole where your approach to the green started ≤150 yds), and double chips (two or more greenside shots from inside 30 yds). A single hole can trip more than one, so the total counts mistake-events, not holes. Inside-150 uses approach distance, not lie, since Air doesn't record lie. Small sample — read as direction.</p>
  </section>

  <p class="foot"><b>Computed live from your Arccos export</b> <span id="footMeta"></span>. Lie-based stats (sand saves, rough/sand splits, per-shot strokes gained) aren't shown — that layer isn't accessible to export. Scrambling here is score-based (par or better after a missed green). Category handicaps are account-wide; everything else respects the filters.</p>
</div>
"""

html = ("<!doctype html><html lang='en'><head><meta charset='utf-8'>"
"<meta name='viewport' content='width=device-width, initial-scale=1'>"
"<title>Round Book — interactive</title>"
"<link rel='preconnect' href='https://fonts.googleapis.com'><link rel='preconnect' href='https://fonts.gstatic.com' crossorigin>"
"<link href='https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap' rel='stylesheet'>"
"<script src='https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'></script>"
"<style>"+CSS+"</style></head><body>"+BODY+
"<script>window.__DATA__="+json.dumps(data)+";</script>"
"<script>"+JS+"</script></body></html>")

import sys
OUT = sys.argv[1] if len(sys.argv) > 1 else "golf-dashboard.html"
open(OUT,"w").write(html)
print("written:", OUT)
