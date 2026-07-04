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
