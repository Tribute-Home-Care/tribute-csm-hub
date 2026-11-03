// Does the Director view actually RUN? The static test next door asserts the
// rules are written down; this one executes the module against a stub DOM and
// synthetic profiles, because a syntax-clean module that throws on render is
// worse than no module at all.
//
// Synthetic throughout. No real client, CSM or market figure appears here.
// Runs v2-metrics.js against a stub DOM with synthetic profiles and asserts
// render() produces sane HTML instead of throwing. No network, no PHI.
const fs=require('fs'),path=require('path'),vm=require('vm');
const SRC=fs.readFileSync(path.join(process.env.HOME,'tribute-csm-hub/v2/v2-metrics.js'),'utf8');

function el(tag){ return { tagName:tag, id:'', className:'', children:[], _html:'',
  set innerHTML(v){ this._html=v; }, get innerHTML(){ return this._html; },
  appendChild(c){ this.children.push(c); return c; },
  insertBefore(c){ this.children.push(c); return c; },
  querySelector(){ return null; }, querySelectorAll(){ return []; },
  addEventListener(){}, classList:{add(){},remove(){}}, parentNode:null, dataset:{} }; }

const pages={};
const home=el('div'); const main=el('div'); home.parentNode=main;
const doc={ readyState:'complete',
  getElementById(id){ if(id==='page-home')return home; return pages[id]||null; },
  querySelector(s){ return s==='.main'?main:null; },
  querySelectorAll(){ return []; },
  createElement(t){ const e=el(t);
    Object.defineProperty(e,'id',{set(v){ this._id=v; pages[v]=this; },get(){return this._id||'';}});
    return e; },
  addEventListener(){} };

// A view node that records what was painted.
const view=el('div');
let painted='';
Object.defineProperty(view,'innerHTML',{set(v){painted=v;},get(){return painted;}});

const ctx={ console, setTimeout, location:{hash:''}, fetch:async()=>({ok:true,json:async()=>({})}) };
ctx.window=ctx; ctx.document=doc;
vm.createContext(ctx);
vm.runInContext(SRC,ctx);

// after boot, host() created #page-metrics; wire its view lookup
const page=pages['page-metrics'];
if(!page) { console.log('FAIL: page element was not created at load'); process.exit(1); }
console.log('PASS: #page-metrics exists after load');
page.querySelector=(s)=> s==='#mx-view'?view:null;

function run(label, app, expect){
  ctx.window.TributeApp=app;
  try{ ctx.window.TributeMetrics.render(); }
  catch(e){ console.log('FAIL: '+label+' threw: '+e.message); process.exitCode=1; return; }
  const bad=expect.filter(x=>painted.indexOf(x)<0);
  console.log((bad.length?'FAIL':'PASS')+': '+label+(bad.length?' missing '+JSON.stringify(bad):''));
  if(bad.length) process.exitCode=1;
}

// 1. not allowed
run('a non-owner is refused', { account:{username:'someone@tributehomecare.com'},
  adminUpns:['tuadmin@tributehomecare.com'], profile:{id:'julia'} },
  ['limited to Client Solutions leadership']);

// 2. allowed, nothing read yet
const APP={ account:{username:'tuadmin@tributehomecare.com'},
  adminUpns:['tuadmin@tributehomecare.com'], profile:{id:'tuadmin'},
  profiles:[{id:'julia',name:'Julia Hanna',market:'Massachusetts'},
            {id:'jada',name:'Jada Tiglao',market:'Maryland'},
            {id:'sam',name:'Sam Noren',market:'Massachusetts',isCSC:true}],
  tpCadence:{High:14,Medium:30,Low:60}, ciCadence:{High:90,Medium:180,Low:180},
  daysAgo:(d)=>d?Math.round((Date.now()-new Date(d))/864e5):null,
  nextDue:(lv,f)=>{ if(!lv||f==='NA')return null; const x=new Date(lv); x.setDate(x.getDate()+(parseInt(f)||90)); return x; },
  data:{ profiles:{
    julia:{ clients:[
      {id:'c1',name:'Synthetic One',tier:'High',freq:'90',lastVisit:'2026-10-30'},
      {id:'c2',name:'Synthetic Two',tier:'High',freq:'90',lastVisit:'2025-01-01'},   // visit overdue
      {id:'c3',name:'Synthetic Three',tier:'Low',freq:'NA',isOffice:true}],          // excluded
      touchpoints:[{clientId:'c1',date:'2026-11-01'}], checkins:[] },
    jada:{ clients:[{id:'c4',name:'Synthetic Four',tier:'Medium',freq:'90',lastVisit:'2026-11-01',visitDeferred:true}],
      touchpoints:[{clientId:'c4',date:'2026-11-02'}], checkins:[] },
    sam:{ clients:[{id:'c9',name:'Should Not Appear',tier:'High'}], touchpoints:[], checkins:[] } } } };
run('allowed, nothing read yet', APP, ['Daily Metrics','Nothing has been read yet']);

// 3. with a cadence read: exceptions appear
ctx.window.TributeMetrics.render();
const S=ctx.window.TributeMetrics;
// poke state through a successful-looking load
ctx.window.TributeApp=APP;
ctx.fetch=async(u)=>({ok:true,json:async()=>(
  /note_cadence/.test(u)
    ? { generatedAt:'2026-11-03T00:00:00Z', daysLeftInPeriod:3,
        counts:{clients:2,withNote:1,missing:1,flagged:1,unknown:1},
        clients:[{cid:'c1',name:'Synthetic One',market:'Boston',csm:'Julia Hanna',known:true,flagged:true},
                 {cid:'cx',name:'Unreadable',market:'Boston',csm:'Julia Hanna',known:false,flagged:false}] }
    : { rows:[] })});
S.open();
setTimeout(()=>{
  const checks=[['never contacted is surfaced','Never contacted'],
    ['an overdue visit is surfaced','Visit past due'],
    ['a flagged note is surfaced','No note this month'],
    ['the unreadable client is reported','counted neither way'],
    ['the office client is excluded', null],
    ['the CSC caseload is excluded', null]];
  let bad=0;
  checks.forEach(([l,needle])=>{
    if(needle===null) return;
    const got=painted.indexOf(needle)>=0;
    console.log((got?'PASS':'FAIL')+': '+l); if(!got){bad++;}
  });
  console.log((painted.indexOf('Should Not Appear')<0?'PASS':'FAIL')+': a CSC caseload is excluded');
  console.log((painted.indexOf('Synthetic Three')<0?'PASS':'FAIL')+': an office client is excluded');
  console.log((painted.indexOf('Synthetic Four')<0?'PASS':'FAIL')+': a deferred visit is not a miss');
  if(bad) process.exitCode=1;
},50);

process.on('exit', function (c) {
  console.log('\n' + (c ? 'FAILED \u2014 see the FAIL lines above' : 'PASSED all checks'));
});
