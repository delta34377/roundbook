// metrics.js — The Round Book's pure computation layer.
// Ported VERBATIM from the JS embedded by build_dash.py (Jul 2026).
// Nothing in here touches the DOM, so the same functions run in the browser
// and in the Node parity harness. Rule 1 of CLAUDE.md lives here:
// every displayed number derives from these functions over the filtered data;
// BENCH is the single source of handicap references (TOURPROX for tour ones).
export function agg(rs){
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

export const BENCH={
  score:[[0,74],[5,79],[10,84],[15,90],[20,95]],
  gir:[[0,65],[5,54],[10,43],[15,32],[20,23]],
  fw:[[0,61],[5,56],[10,51],[15,46],[20,41]],
  drv:[[0,252],[5,241],[10,230],[15,217],[20,202]],
  putts:[[0,29.5],[5,30.8],[10,32],[15,33.2],[20,34.5]],
  tp:[[0,7],[5,10],[10,13],[15,17],[20,21]],
  scr:[[0,60],[5,48],[10,38],[15,30],[20,23]],
  pen:[[0,0.6],[5,1.0],[10,1.4],[15,1.9],[20,2.5]],
};
export function bench(stat,hcp){const t=BENCH[stat];if(hcp<=t[0][0])return t[0][1];if(hcp>=t[t.length-1][0])return t[t.length-1][1];
  for(let i=1;i<t.length;i++){if(hcp<=t[i][0]){const f=(hcp-t[i-1][0])/(t[i][0]-t[i-1][0]);return t[i-1][1]+f*(t[i][1]-t[i-1][1]);}}return t[t.length-1][1];}

export const TOURPROX={'50-100':16,'100-125':20,'125-150':24,'150-175':29,'175-200':34,'200+':42};

// eslint-disable-next-line no-unused-vars -- verbatim from the reference; y is the unused year
export function fmtDate(d){const [y,m,da]=d.split('-');const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return M[+m-1]+' '+(+da);}

export function dedupeDates(ds){const cnt={};ds.forEach(d=>cnt[d]=(cnt[d]||0)+1);const seen={};return ds.map(d=>{if(cnt[d]>1){seen[d]=(seen[d]||0)+1;return fmtDate(d)+' ('+seen[d]+')';}return fmtDate(d);});}

// ---- Trends: pure model (windows, pooled-by-hole verdicts, headline copy) ----
// Method parameters, not claims about the game: TREND_Z is the normal cut for a
// two-sided 90% call, gate is the holes (or chances) a block needs before a
// verdict, minEff the smallest change worth calling, dotMin/rollMin the units a
// plotted point needs. The rounds in view split in half, newer vs older, pooled
// by hole so an 18 counts twice a nine and a short round cannot swing a point.
// Nothing here fits a line through rounds.
const TREND_Z=1.64,TREND_MIN_ROUNDS=4,TREND_ROLL=3;
const tSgn=(v,d)=>{const s=v.toFixed(d),n=+s;return (n>=0?'+':'')+(n===0?(0).toFixed(d):s);};
const tPts=v=>Math.abs(Math.round(v))===1?' pt':' pts';
const TREND=[
 {key:'ou18',label:'Over par / 18',sl:'scoring',dir:'lower',kind:'mean',scale:18,bench:'score',gate:27,dotMin:7,rollMin:18,minEff:2,unitW:'holes',units:H=>H.map(h=>h.score-h.par),fmt:v=>tSgn(v,1),dfmt:v=>tSgn(v,1)+' strokes'},
 {key:'gir',label:'Greens in regulation',sl:'greens',dir:'higher',kind:'rate',scale:100,bench:'gir',gate:27,dotMin:7,rollMin:18,minEff:8,unitW:'holes',units:H=>H.filter(h=>h.gir!=null).map(h=>h.gir),fmt:v=>Math.round(v)+'%',dfmt:v=>tSgn(v,0)+tPts(v)},
 {key:'bog150',label:'Bogey or worse inside 150',sl:'bogeys inside 150',dir:'lower',kind:'rate',scale:100,bench:'',gate:12,dotMin:5,rollMin:9,minEff:10,unitW:'chances',units:H=>H.filter(h=>h.apd!=null&&h.apd<=150).map(h=>h.score-h.par>=1?1:0),fmt:v=>Math.round(v)+'%',dfmt:v=>tSgn(v,0)+tPts(v)},
 {key:'prox150',label:'Wedge proximity, 50 to 150 yds',sl:'wedge proximity',dir:'lower',kind:'median',scale:1,bench:'',gate:12,dotMin:5,rollMin:9,minEff:6,unitW:'shots',units:H=>H.filter(h=>h.agr&&h.agr[1]>=50&&h.agr[1]<=150).map(h=>h.agr[2]),fmt:v=>Math.round(v)+' ft',dfmt:v=>tSgn(v,0)+' ft'},
 {key:'tp',label:'Three-putt rate',sl:'three-putts',dir:'lower',kind:'rate',scale:100,bench:'tp',gate:27,dotMin:7,rollMin:18,minEff:6,unitW:'holes',units:H=>H.filter(h=>h.putts!=null).map(h=>h.putts>=3?1:0),fmt:v=>Math.round(v)+'%',dfmt:v=>tSgn(v,0)+tPts(v)},
 {key:'scr',label:'Scrambling',sl:'scrambling',dir:'higher',kind:'rate',scale:100,bench:'scr',gate:12,dotMin:5,rollMin:9,minEff:10,unitW:'missed greens',units:H=>H.filter(h=>h.gir===0).map(h=>h.score-h.par<=0?1:0),fmt:v=>Math.round(v)+'%',dfmt:v=>tSgn(v,0)+tPts(v)},
 {key:'dbl18',label:'Doubles or worse / 18',sl:'doubles',dir:'lower',kind:'rate',scale:18,bench:'',gate:27,dotMin:7,rollMin:18,minEff:1,unitW:'holes',units:H=>H.map(h=>h.score-h.par>=2?1:0),fmt:v=>v.toFixed(1),dfmt:v=>tSgn(v,1)+' per 18'},
 {key:'pen18',label:'Penalties / 18',sl:'penalties',dir:'lower',kind:'mean',scale:18,bench:'pen',gate:27,dotMin:7,rollMin:18,minEff:1,unitW:'holes',units:H=>H.map(h=>h.pen||0),fmt:v=>v.toFixed(1),dfmt:v=>tSgn(v,1)+' per 18'},
 {key:'fw',label:'Fairways hit',sl:'fairways',dir:'higher',kind:'rate',scale:100,bench:'fw',gate:15,dotMin:5,rollMin:9,minEff:8,unitW:'fairway holes',units:H=>H.filter(h=>h.fw!=null).map(h=>h.fw),fmt:v=>Math.round(v)+'%',dfmt:v=>tSgn(v,0)+tPts(v)},
];
const tHoles=rs=>{const H=[];rs.forEach(r=>r.holes.forEach(h=>H.push(h)));return H;};
const tMean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const tVar=a=>{if(a.length<2)return 0;const m=tMean(a);return a.reduce((s,x)=>s+(x-m)*(x-m),0)/(a.length-1);};
const tMed=a=>{const s=[...a].sort((x,y)=>x-y);const m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;};
const tUnit=(k,w)=>k===1?w.slice(0,-1):w;
function trendValue(m,u){if(!u.length)return null;return m.kind==='median'?tMed(u):tMean(u)*m.scale;}
function trendSE(m,u){if(u.length<2||m.kind==='median')return null;if(m.kind==='rate'){const p=(u.reduce((s,x)=>s+x,0)+0.5)/(u.length+1);return Math.sqrt(p*(1-p)/u.length)*m.scale;}return Math.sqrt(tVar(u)/u.length)*m.scale;}
// two-proportion z on pooled p; two-sample z on pooled variance (a block with no spread borrows the other's); Mann-Whitney z with midranks. All signed recent minus prior; 0 when the standard error is 0.
function propZ(a,b){const ka=a.reduce((s,x)=>s+x,0),kb=b.reduce((s,x)=>s+x,0);const p=(ka+kb)/(a.length+b.length);if(p<=0||p>=1)return 0;const s=Math.sqrt(p*(1-p)*(1/a.length+1/b.length));return s>0?(kb/b.length-ka/a.length)/s:0;}
function poolZ(a,b){const nP=a.length,nR=b.length;if(nP+nR<3)return 0;const sp=((nP-1)*tVar(a)+(nR-1)*tVar(b))/(nP+nR-2);const s=Math.sqrt(sp*(1/nP+1/nR));if(!(s>0))return 0;return (tMean(b)-tMean(a))/s;}
function mwZ(a,b){const all=[...a.map(x=>[x,0]),...b.map(x=>[x,1])].sort((p,q)=>p[0]-q[0]);const ranks=new Array(all.length);let i=0;while(i<all.length){let j=i;while(j+1<all.length&&all[j+1][0]===all[i][0])j++;const r=(i+j)/2+1;for(let k=i;k<=j;k++)ranks[k]=r;i=j+1;}let rb=0;all.forEach((p,k)=>{if(p[1]===1)rb+=ranks[k];});const n1=a.length,n2=b.length;const U=rb-n2*(n2+1)/2;const sd=Math.sqrt(n1*n2*(n1+n2+1)/12);return sd>0?(U-n1*n2/2)/sd:0;}
function trendVerdict(m,P,R){
  const a=m.units(P),b=m.units(R);
  const out={nP:a.length,nR:b.length,before:trendValue(m,a),now:trendValue(m,b)};
  if(a.length<m.gate||b.length<m.gate){out.state='early';out.needP=Math.max(0,m.gate-a.length);out.needR=Math.max(0,m.gate-b.length);return out;}
  const d=out.now-out.before;out.delta=d;
  out.z=m.kind==='rate'?propZ(a,b):m.kind==='median'?mwZ(a,b):poolZ(a,b);
  out.good=m.dir==='lower'?d<0:d>0;
  if(Math.abs(d)<m.minEff-1e-9)out.state='steady';
  else if(Math.abs(out.z)>=TREND_Z)out.state=out.good?'improving':'slipping';
  else out.state='noise';
  return out;
}
function trendModel(rounds,hcp){
  const rs=[...rounds].sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:a.id-b.id);const N=rs.length;
  const t={N,rs,metrics:[],mix:null};
  if(N>=TREND_MIN_ROUNDS){t.Rw=Math.floor(N/2);t.Pw=N-t.Rw;t.recent=rs.slice(N-t.Rw);t.prior=rs.slice(N-t.Rw-t.Pw,N-t.Rw);t.hR=tHoles(t.recent).length;t.hP=tHoles(t.prior).length;}
  const allH=tHoles(rs);t.parPer18=allH.length?tMean(allH.map(h=>h.par))*18:null;
  const PH=t.prior?tHoles(t.prior):null,RH=t.recent?tHoles(t.recent):null;
  TREND.forEach(m=>{
    const per=rs.map(r=>m.units(r.holes));
    const dots=per.map(u=>u.length>=m.dotMin?trendValue(m,u):null),dotN=per.map(u=>u.length);
    const roll=rs.map((r,i)=>{if(i<TREND_ROLL-1)return null;const u=m.units(tHoles(rs.slice(i-TREND_ROLL+1,i+1)));return u.length>=m.rollMin?{v:trendValue(m,u),se:trendSE(m,u),n:u.length}:null;});
    const all=m.units(allH);
    const v=PH?trendVerdict(m,PH,RH):null;
    const benchV=m.bench?(m.key==='ou18'?(t.parPer18==null?null:bench('score',hcp)-t.parPer18):bench(m.bench,hcp)):null;
    const varAll=all.length>1?(m.kind==='rate'?tMean(all)*(1-tMean(all)):tVar(all)):0;
    const effU=m.kind==='median'?m.minEff:m.minEff/m.scale;
    const need=varAll>0?Math.ceil(2*TREND_Z*TREND_Z*varAll/(effU*effU)):null;
    t.metrics.push({m,dots,dotN,roll,allV:all.length?trendValue(m,all):null,allN:all.length,v,benchV,need});
  });
  if(t.prior){const share=rs=>{const n=tHoles(rs).length,c={};rs.forEach(r=>{c[r.course]=(c[r.course]||0)+r.holes.length;});Object.keys(c).forEach(k=>c[k]/=n);return c;};
    const sR=share(t.recent),sP=share(t.prior);let best=null;
    new Set([...Object.keys(sR),...Object.keys(sP)]).forEach(c=>{const d=(sR[c]||0)-(sP[c]||0);if(!best||Math.abs(d)>Math.abs(best.d))best={c,d,r:sR[c]||0,p:sP[c]||0};});
    if(best&&Math.abs(best.d)>=0.30)t.mix=best;}
  return t;
}
// Virtual nine-hole rounds appended until both halves clear the scoring gate (copy only).
function trendRoundsNeeded(rs){
  const hc=rs.map(r=>r.holes.length),sum=a=>a.reduce((s,x)=>s+x,0);
  for(let k=0;k<=20;k++){const h=hc.concat(Array(k).fill(9)),N=h.length;if(N<TREND_MIN_ROUNDS)continue;
    const Rw=Math.floor(N/2);
    if(sum(h.slice(N-Rw))>=TREND[0].gate&&sum(h.slice(0,N-Rw))>=TREND[0].gate)return k;}
  return 21;
}
function trendHeadline(t){
  const {N}=t,gate=TREND[0].gate;const nine=k=>`${k} more nine-hole round${k===1?'':'s'}`;
  if(N===0)return['No rounds in this filter.','Widen the date range or pick another course.'];
  const k=trendRoundsNeeded(t.rs);const kTxt=k>20?'More than 20 more nine-hole rounds':`About ${nine(k)}`;
  if(N<TREND_MIN_ROUNDS)return[`${N} round${N===1?'':'s'} in view. A trend needs at least ${TREND_MIN_ROUNDS}.`,`The chart shows each round on its own. A call splits the rounds in view in half, newer against older, and needs ${gate} holes on each side. ${kTxt} gets there (fewer if you play 18).`];
  const ou=t.metrics.find(x=>x.m.key==='ou18'),V=ou.v;
  const mixTxt=t.mix?` The newer half is ${Math.round(t.mix.r*100)}% ${t.mix.c} against ${Math.round(t.mix.p*100)}% in the older half, so part of any change may be the course, not you.`:'';
  if(V.state==='early')return[`Too early to call a trend: ${N} rounds in view, ${t.hR} holes in the newer half and ${t.hP} in the older.`,`A call needs ${gate} holes on each side. ${kTxt} gets there (fewer if you play 18), or widen the filter. Meanwhile the chart shows every round and the rolling ${TREND_ROLL}-round line.`];
  const scored=t.metrics.filter(x=>x.v.state!=='early');
  const clear=scored.filter(x=>x.v.state==='improving'||x.v.state==='slipping').sort((a,b)=>Math.abs(b.v.z)-Math.abs(a.v.z));
  const imp=clear.filter(x=>x.v.state==='improving'),slp=clear.filter(x=>x.v.state==='slipping');
  const fm=x=>`${x.m.sl} ${x.m.fmt(x.v.before)} to ${x.m.fmt(x.v.now)}`;
  const ouTxt=V.state==='steady'?`Over par per 18 is steady: ${ou.m.fmt(V.now)} against ${ou.m.fmt(V.before)} before.`:V.state==='noise'?`Over par per 18 went ${ou.m.fmt(V.before)} to ${ou.m.fmt(V.now)}, inside the noise.`:`Over par per 18 ${V.state==='improving'?'came down':'went up'} from ${ou.m.fmt(V.before)} to ${ou.m.fmt(V.now)}, more than the noise.`;
  if(!clear.length){
    const mover=scored.filter(x=>x.v.state==='noise').sort((a,b)=>Math.abs(b.v.z)-Math.abs(a.v.z))[0];
    if(mover)return[`Nothing has clearly changed across the ${N} rounds in view.`,`Biggest move is ${fm(mover)}, ${mover.v.good?'better':'worse'} by ${mover.m.dfmt(Math.abs(mover.v.delta)).replace('+','')}, but ${mover.v.nR} ${mover.m.unitW} is not enough to separate that from noise. ${ouTxt}${mixTxt}`];
    const g=t.metrics.find(x=>x.m.key==='gir'),p=t.metrics.find(x=>x.m.key==='tp');
    return[`Steady across the board over the ${N} rounds in view.`,`Every metric with enough holes sits within its practical band of the older half. ${ouTxt}${g.v.state!=='early'?` Greens ${g.m.fmt(g.v.now)} against ${g.m.fmt(g.v.before)}.`:''}${p.v.state!=='early'?` Three-putts ${p.m.fmt(p.v.now)} against ${p.m.fmt(p.v.before)}.`:''}${mixTxt}`];
  }
  const strong=V.state==='improving'||V.state==='slipping'||imp.length>=2||slp.length>=2;
  if(!strong){
    if(clear.length===1){const c=clear[0];return[`One clear change across the ${N} rounds in view: ${c.m.sl} ${c.v.good?'improved':'slipped'}.`,`${c.m.label} went from ${c.m.fmt(c.v.before)} to ${c.m.fmt(c.v.now)} on ${c.v.nP} then ${c.v.nR} ${c.m.unitW}, more than the noise. Everything else is steady or inside noise. ${ouTxt} One clear mover out of ${TREND.length} is worth watching, not yet a conclusion.${mixTxt}`];}
    return[`Two changes across the ${N} rounds in view, pulling in different directions.`,`${fm(imp[0])} is better; ${fm(slp[0])} is worse. ${ouTxt} Two movers out of ${TREND.length} in opposite directions is worth watching, not yet a conclusion.${mixTxt}`];
  }
  const names=a=>{const n=a.slice(0,3).map(x=>x.m.sl);return n.length>1?n.slice(0,-1).join(', ')+' and '+n[n.length-1]:n[0];};
  const lead=c=>`Lead change is ${c.m.label.toLowerCase()}: ${c.m.fmt(c.v.before)} to ${c.m.fmt(c.v.now)} on ${c.v.nP} then ${c.v.nR} ${c.m.unitW}.`;
  if(imp.length&&!slp.length)return[`Improving: ${names(imp)} moved the right way over the ${N} rounds in view.`,`${lead(imp[0])} ${ouTxt}${V.state!=='improving'?' The pieces are moving before the total does.':''}${mixTxt}`];
  if(slp.length&&!imp.length)return[`Slipping: ${names(slp)} moved the wrong way over the ${N} rounds in view.`,`${lead(slp[0])} ${ouTxt}${mixTxt}`];
  const rider=V.state==='slipping'?` Scoring went the other way from ${imp[0].m.sl}; check doubles and penalties before crediting it.`:'';
  return[`Mixed across the ${N} rounds in view: ${names(imp)} better; ${names(slp)} worse.`,`${ouTxt} The biggest move either way is ${fm(clear[0])}.${rider}${mixTxt}`];
}
// ---- end trends ----
export { TREND, TREND_Z, TREND_MIN_ROUNDS, TREND_ROLL, tUnit, trendModel, trendHeadline, trendRoundsNeeded };
