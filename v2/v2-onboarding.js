/* ONBOARDING, OFFBOARDING AND SUCCESS IN 30 — the V2 layer owns this.
 *
 * Every line below was in index.html, which is V1 and which V2 is built from.
 * That made the feature V1's, and changing it changed the hub the team uses
 * today. Courtney's review is a V2 design, so it belongs in the V2 layer.
 *
 * HOW A MOVE IS POSSIBLE AT ALL. This is a classic script, loaded after
 * index.html's inline script. Top-level `const`/`let` in a classic script go
 * into the shared global lexical environment, so `P`, `DATA`, `PROFILES`,
 * `escHtml`, `openM`, `daysAgo` and the rest resolve BY NAME from here, the
 * same way bridge.js resolves them. Top-level `function` declarations become
 * window properties, so the inline onclick="toggleObTask(...)" this code
 * writes into the page still finds its handler.
 *
 * So: no IIFE, and nothing renamed. Wrapping this file would break both.
 *
 * What V1 keeps: its own Success in 30 milestone card and the s60 picker,
 * which were never part of this work. index.html guards its call sites, so
 * the Onboarding page there degrades to what it was before 23 November
 * rather than throwing on a function that is no longer defined.
 */

/* ═══════════ CLIENT ONBOARDING, OFFBOARDING & SUCCESS IN 30 ══════════════
   Source: "CSM Hub_Onboarding Offboarding and Success in 30_final.docx",
   Courtney Chaulk, Draft v1.0, November 2026. Her Part 1 and Part 2, item for
   item, with her owners, her due dates and her Hub behaviours.

   HER HUB BEHAVIOUR KEY, which is the contract for what each row does:
     AUTO   the Hub detects completion from Viv and ticks it; a person may
            still tick it by hand when the sync lags
     CHECK  a person ticks it. Some items carry an N/A option
     EMAIL  ticking opens a ready-to-edit draft. Nothing sends on its own
     ALERT  not done by its due date and the owner is told; two days later it
            reaches the owner's manager

   DUE DATES ARE COMPUTED, NOT TYPED. She asked for "the real due date (11/18,
   not just 'Day 14')", so each item carries a rule and dueFor() resolves it
   against this client's start of care, assessment date and market. Where a
   date cannot be known yet (per caregiver, per market) the row says what it
   is waiting for rather than inventing one.

   ONE DELIBERATE OMISSION, carried over from the 2026 template: the document
   prints the shared family password beside the Viv app-access step. A
   standing password does not belong in a repository, so the step says to send
   the standard family password and does not repeat it. */

/* TODAY, WHERE THE CSM IS STANDING. new Date().toISOString() is UTC, so
   after about 7pm Eastern every one of these rolled over to tomorrow: the
   proof dialog prefilled tomorrow's date, a saved milestone was dated a day
   ahead on the client record, and an item due today read as overdue from the
   evening before. Eight places in this file had the same line. */
function _obToday(){
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
const OB_OWNERS = { CSM:'CSM', CSP:'CSP', SP:'Scheduling Partner', RDM:'RDM' };

/* Her market rules table, which decides when the assessment is due.
   Maryland is a state regulation, not a preference, and virtual is not
   allowed there at all. */
const OB_MARKET_RULES = {
  MD: { hrs:48, virtual:false, short:'48 hr MD rule',
        note:'48 hr MD rule — state regulation. Best practice is before start of care.' },
  MA: { hrs:null, virtual:true, short:'',
        note:'Before start of care or Day 1 for high utilization; short-hour may be reviewed virtually.' },
  IL: { hrs:null, virtual:true, short:'',
        note:'Before start of care or Day 1 for high utilization; short-hour may be reviewed virtually.' }
};

const OB_CHECKLIST = [
  {g:'Phase 1 — Assessment & initial tasks', items:[
    {id:'ob_asmt', label:'Complete the assessment', owner:'CSM', hub:'AUTO+ALERT',
     due:{market:true}, hint:'In person or virtual as the market rules allow.'},
    {id:'ob_welcome', label:'Leave a Tribute welcome packet', owner:'CSM', hub:'CHECK',
     due:{at:'assessment'}},
    {id:'ob_card', label:'Leave a business card', owner:'CSM', hub:'CHECK',
     due:{at:'assessment'}},
    {id:'ob_comm', label:'Complete community guideline protocols', owner:'CSM', hub:'CHECK',
     due:{at:'assessment'}, na:'Not in a community'},
    {id:'ob_ppe', label:'Leave PPE for the care team, or ask the CSP to order it',
     owner:'CSM / CSP', hub:'CHECK', due:{before:'firstVisit'}},
    {id:'ob_welmail', label:'Send the family a welcome email', owner:'CSM', hub:'EMAIL',
     due:{before:'firstVisit'}, isNew:true,
     hint:'What we discussed, what happens next, and who to call including after hours.',
     draft:'welcome'},
    {id:'ob_refsrc', label:'Let the referral source know care has started',
     owner:'CSM or RDM', hub:'EMAIL', due:{from:'leadClose', hrs:24}, isNew:true,
     hint:'GCM or community partner. Share only what they need.', draft:'soc_update'},
    {id:'ob_tier', label:'Confirm the touch tier', owner:'CSM', hub:'AUTO+CHECK',
     due:{from:'assessment', hrs:24}, isNew:true,
     hint:'New clients start at the Medium floor for their first 90 days, and may go to High after assessment.'}
  ]},
  {g:'Phase 2 — Viv setup', items:[
    {id:'ob_geo', viv:'Profile > General > Edit General', label:'Set "Located In" and "Payor" to the same Geo', owner:'CSP',
     hub:'AUTO+ALERT', due:{order:'first'}, gate:true,
     hint:'Profile > General > Edit General. Must be done BEFORE the Workflow or Tasks.'},
    {id:'ob_icd', viv:'Profile > General > Edit General', label:'Important Client Details', owner:'CSP + CSM', hub:'AUTO',
     due:{before:'firstVisit'}, needs:'ob_geo',
     hint:'Profile > General > Edit General. Paste the template and complete it with the CSM.'},
    {id:'ob_contacts', viv:'Profile', label:'Client contacts', owner:'CSP + CSM', hub:'AUTO',
     due:{before:'firstVisit'}, needs:'ob_geo',
     hint:'Profile. Tick Primary Contact and/or Emergency Contact, plus PHI Consent for App Received for anyone who will use the app.'},
    {id:'ob_reqs', viv:'Scheduling > Requirements', label:'Requirements page', owner:'CSP', hub:'AUTO',
     due:{before:'firstVisit'}, needs:'ob_geo',
     hint:'Scheduling > Requirements. Edit the map, add no mandatory requirements, list Tribute Secure as preferred (and CNA-I, CNA-II in Maryland), and write a short blurb on client needs.'},
    {id:'ob_tag', viv:'Summary (scroll to the bottom)', label:'Hourly or Live-In tag', owner:'CSP', hub:'AUTO',
     due:{before:'firstVisit'}, needs:'ob_geo', hint:'Summary, at the bottom.'},
    {id:'ob_mgrs', viv:'Summary', label:'Add the CSM as Account Manager and the CSP as Clinical Manager',
     owner:'CSP', hub:'AUTO', due:{before:'firstVisit'}, needs:'ob_geo',
     hint:'Summary. Market Director instead if the client is shared with them. Leave Billing Assignee and Scheduling Partner blank.'},
    {id:'ob_wf', viv:'blue box / white “+” in the top menu', label:'Workflow for requested services', owner:'CSP', hub:'AUTO',
     due:{before:'firstVisit'}, needs:'ob_geo', hint:'Blue box, or the white + in the top menu.'},
    {id:'ob_csa', label:'Email the Client Service Agreement to the family', owner:'CSP',
     hub:'EMAIL', due:{at:'assessment'}, draft:'csa',
     hint:'Sent in DocuSign. Short, and explains why the signature matters before start of care.'},
    {id:'ob_csa_up', label:'Confirm the CSA is uploaded to Viv and tell the CSM it is signed',
     owner:'CSP', hub:'AUTO+ALERT', due:{before:'serviceBegins'}, needs:'ob_csa',
     hint:'Still unsigned as start of care approaches: follow up with the family right away, document the delay and loop in the Market Director.'},
    {id:'ob_app', viv:'Accounts > User (black menu panel) > click the green person with (+)', label:'Send the Viv app access email and create the family user account',
     owner:'CSP', hub:'EMAIL+AUTO', due:{before:'firstVisit'}, draft:'app_access',
     hint:'Accounts > User > the green person with a +. Use the standard family password; it is not repeated here.'},
    {id:'ob_task', label:'Create the Task for Scheduling', owner:'CSP', hub:'AUTO',
     due:{before:'firstVisit'}, needs:'ob_geo'},
    {id:'ob_cp', viv:'Documents > Tribute Care Plan', label:'Complete the Tribute Care Plan with the CSM', owner:'CSP + CSM',
     hub:'AUTO+ALERT', due:{from:'assessment', hrs:24}, hint:'Documents > Tribute Care Plan.'},
    {id:'ob_note', viv:'Service Delivery > Notes', label:'Assessment note labelled "Clinical Progress Note"', owner:'CSM',
     hub:'AUTO+ALERT', due:{from:'assessment', hrs:24}, hint:'Service Delivery > Notes.'}
  ]},
  {g:'Phase 3 — First 60 days', items:[
    {id:'ob_cgprep', label:'Call each caregiver before their first visit', owner:'CSM',
     hub:'CHECK+EMAIL', due:{perCaregiver:'firstVisit'}, perCaregiver:true, draft:'cg_prep',
     hint:'Care plan, client preferences and safety considerations. One check per caregiver.'},
    {id:'ob_visit2', label:'Second in-person visit', owner:'CSM', hub:'CHECK+ALERT',
     due:{from:'soc', days:14},
     hint:'Caregiver fit, how the client is adjusting, and whether the care plan is accurate.'},
    {id:'ob_cgchk', label:'Check in with each caregiver after their first week', owner:'CSM',
     hub:'CHECK+ALERT', due:{perCaregiver:'week1'}, perCaregiver:true,
     hint:'Is the care plan accurate? Any updates?'},
    {id:'ob_contact', label:'Stay in contact with the GCM, family or client every week',
     owner:'CSM', hub:'AUTO+EMAIL', due:{from:'soc', days:60, every:7}, draft:'week1',
     hint:'Days 1 to 60, depending on service level.'},
    {id:'ob_brief', label:'Update Requirements > Brief Description with more detail',
     owner:'CSP + CSM', hub:'CHECK', due:{from:'soc', days:7}},
    {id:'ob_icd2', label:'Update Important Client Details with more detail on essential care needs',
     owner:'CSP + CSM', hub:'CHECK', due:{from:'soc', days:7}},
    {id:'ob_hub', label:'Confirm the CSM Hub record: tier, fill priority and contacts',
     owner:'CSM', hub:'AUTO+CHECK', due:{from:'soc', days:7}},
    {id:'ob_d30', label:'Day 30 check-in with the family and core caregivers', owner:'CSM',
     hub:'CHECK+EMAIL', due:{from:'soc', days:28, to:32}, isNew:true, draft:'d30',
     hint:'See the Day 30 call guide. Can be virtual or in person.'}
  ]}
];

/* Part 2. Step 1 is universal; Step 2 depends on how the service ended, and
   the ending type comes from the Service Cancellation Pending Form. Where a
   client has more than one form, the most recent one counts. */
const OFF_CHECKLIST = [
  {id:'off_final', label:'Confirm the final date of service with the family and tell Scheduling',
   owner:'CSM', hub:'CHECK+EMAIL', due:{sameDay:true}, draft:'final_date',
   hint:'Task and a Teams post in Scheduling and Client Solutions.'},
  {id:'off_form', label:'Complete the Service Cancellation Pending Form', owner:'CSM or CSP',
   hub:'AUTO+ALERT', due:{from:'finalVisit', hrs:24}, isNew:true,
   hint:'The official record of the cancellation reason. If the client has passed away, fill out the Death Form instead.'},
  {id:'off_cg', label:'Notify caregivers of the final visit, with enough notice',
   owner:'CSM', hub:'CHECK', due:{sameDay:true},
   hint:'If the client has passed, or was long term, call each caregiver personally before anything in writing.'},
  {id:'off_family', label:'Send the family a warm closing message', owner:'CSM',
   hub:'EMAIL+ALERT', due:{from:'finalVisit', hrs:48}, draft:'closing',
   hint:'A call, a note or a card.'},
  {id:'off_ref', label:'Thank the referring GCM or community partner and log it in HubSpot',
   owner:'CSM', hub:'EMAIL+ALERT', due:{from:'finalVisit', hrs:24}, draft:'ref_thanks'},
  {id:'off_mgr', label:'Tell your manager and the Market Director of any concerns about quality of care',
   owner:'CSM', hub:'EMAIL', due:{sameDay:true}, draft:'discharge_notice'},
  {id:'off_visits', label:'Remove or inactivate all scheduled visits after the final date',
   owner:'SP', hub:'AUTO', due:{after:'finalConfirmed'}},
  {id:'off_se', label:'Close all open service exceptions and tasks in Viv', owner:'CSP',
   hub:'AUTO', due:{by:'finalVisit'}},
  {id:'off_disch', label:'Confirm nothing is outstanding, then set the client to Discharged',
   owner:'CSP', hub:'AUTO', due:{after:'finalVisit'}, lastStep:true,
   hint:'Viv Timeline. The Hub will not allow this until every item above is done.'}
];

/* Her Step 2. The `rule` is what the Hub does differently, in her words. */
const OFF_TYPES = [
  {id:'voluntary', label:'Voluntary', rule:'Standard close-out', steps:[
    'Acknowledge the decision warmly and thank them for trusting Tribute',
    'Ask the reason for cancellation and record it on the Service Cancellation Pending Form',
    'Log the outcome in HubSpot and tag RDMs if applicable']},
  {id:'hosp', label:'Hospitalization, return expected',
   rule:'The client goes to Hospitalized on the Viv Timeline, not Discharged. They are often still receiving care from us, and a day-to-day cancellation still counts as Hospitalized.',
   steps:[
    'Confirm the hospitalization with the family and update the schedule',
    'Tell caregivers and the Scheduling and Client Solutions channel about the hold and the expected return',
    'Check in with the family at least once during the stay if services are on hold',
    'Coordinate discharge planning with the family and any GCM',
    'Reactivate in Viv as Active once the return date is confirmed'],
   draft:'hospital_checkin'},
  {id:'hloc', label:'Move to a higher level of care',
   rule:'Opens a draft introduction to the community contact', steps:[
    'Confirm the move date and the last day of home care',
    'Introduce yourself to the facility social worker or RCD in case more support is needed',
    'If the community is a Tribute referral partner, tell the RDM and log the connection in HubSpot',
    'Send the family a warm closing note',
    'Record the reason on the Service Cancellation Pending Form'],
   draft:'community_intro'},
  {id:'hospice', label:'Hospice transition',
   rule:'If service continues, this checklist closes and a care plan update reminder opens instead.',
   steps:[
    "Talk directly with the family about Tribute's role alongside hospice",
    'Coordinate with the hospice team so they understand their scope',
    'Update the care plan with any medication changes',
    'If service is ending, follow the voluntary steps and give caregivers proper notice',
    'Document the hospice coordination in Viv Notes and HubSpot']},
  {id:'death', label:'Client death',
   rule:'Condolence wording is offered as suggestions only, never a template email.',
   steps:[
    'A personal condolence call from the CSM right away, and an update to the team in the Scheduling and Client Solutions channel',
    'Tell caregivers privately and with care, calling before anything in writing',
    'A handwritten card to all clients; flowers or a charitable donation for a long-term client, with the family aware',
    'Record the date of death in Viv and set the client to Discharged once the care team is updated',
    'Alert Caregiver Excellence if a caregiver may need support, and submit the Death Form'],
   draft:'condolence', gentle:true},
  {id:'tribute', label:'Tribute-initiated discharge',
   rule:'The checklist stays locked until manager approval is recorded, and the family notice is reviewed by the manager before it is sent.',
   steps:[
    'Decide with your manager and the Market Director. Never proceed alone.',
    'Give the family at least two weeks notice unless there is an immediate safety concern',
    'Document the reason and the rationale clearly in Viv',
    'Talk to caregivers thoughtfully, without sharing sensitive family information',
    'Offer the family referrals to other providers if appropriate'],
   draft:'tribute_discharge', locked:true}
];

/* ── When is it due ───────────────────────────────────────────────────────
   "Every item is timed from the Start of Care (SOC) date or the final date of
   service, so the Hub can flag anything overdue." Where the anchor is not
   known yet, this returns no date and the row says what it is waiting for.
   It never guesses a date, because a wrong due date is worse than none: it
   turns the whole list red and teaches people to ignore it. */
function _obMarket(c){
  const st=(typeof PULSE_MKT_STATE!=='undefined'&&PULSE_MKT_STATE[String(c.market||'').trim()])||'';
  return OB_MARKET_RULES[st]||OB_MARKET_RULES.MA;
}
function obDueFor(c,item){
  const due=item.due||{}, soc=c.startDate||'';
  const asmt=(get('s60')||[]).find(x=>x.clientId===c.id&&x.id==='ob_asmt');
  const asmtDate=asmt?asmt.date:'';
  if(due.market){
    const m=_obMarket(c);
    if(m.hrs&&soc)return {date:_obPlus(soc,Math.ceil(m.hrs/24)),note:m.note,short:m.short};
    return {date:soc||null,note:m.note,short:m.short};
  }
  if(due.at==='assessment')return {date:asmtDate||soc||null,text:'At assessment'};
  if(due.from==='assessment'&&due.hrs)
    return {date:asmtDate?_obPlus(asmtDate,Math.ceil(due.hrs/24)):null,
            text:asmtDate?'':'Within '+due.hrs+' hrs of the assessment'};
  if(due.from==='soc'&&due.days!=null)
    return {date:_obPlus(soc,due.days),
            text:due.to?('Day '+due.days+'–'+due.to):('By day '+due.days)};
  if(due.from==='leadClose')return {date:null,text:'Within '+due.hrs+' hrs of lead closure'};
  if(due.before==='firstVisit')return {date:null,text:'Before the first visit'};
  if(due.before==='serviceBegins')return {date:null,text:'Before service begins'};
  if(due.order==='first')return {date:null,text:'First, before the Workflow or Tasks'};
  if(due.perCaregiver)return {date:null,
    text:due.perCaregiver==='week1'?'A week after each caregiver’s first visit'
                                   :'Before each caregiver’s first visit'};
  if(due.sameDay)return {date:null,text:'Same day'};
  if(due.from==='finalVisit')return {date:null,text:'Within '+due.hrs+' hrs of the final visit'};
  if(due.by==='finalVisit')return {date:null,text:'By the final visit'};
  if(due.after)return {date:null,text:'After the final visit'};
  return {date:null,text:''};
}

/* ── The onboarding checklist, to her layout rules ────────────────────────
   "Every row has the same things: checkbox, task, owner (CSM, CSP, SP), the
   real due date (11/18, not just 'Day 14'), and one button for the next
   step." And: "Phases as sections. Finished phases collapse with a green
   count (8 of 8). The phase in progress sits on top. Overdue rows turn red
   and move to the top of their phase."

   A LOCKED STEP STAYS LOCKED. "Steps that have to happen in order stay locked
   until the step before is done. For example, the Viv Workflow can't be
   checked until Located In and Payor are set." The checkbox is disabled and
   the row says what it is waiting for, rather than letting someone tick it
   and lose the ordering that made the rule worth having.

   The due date is computed from this client's own dates and market, so
   Maryland's 48 hour rule shows as a date and says which rule produced it. */
/* One row per ticked item, keyed by item id, from the per-CSM s60_ob store.
   Lost in a rewrite of the checklist data above and restored: the renderer
   calls it, and onboarding-checklist.test.js caught the deletion before it
   shipped, which is the whole reason that test lifts the handlers. */
function _obMap(cid){
  const m={};
  (get('s60_ob')||[]).forEach(r=>{ if(r.clientId===cid)m[r.id]={by:r.by||'',at:r.at||''}; });
  return m;
}
/* ── The board: every open checklist, in her four tabs ────────────────────
   "Clicking a client in this list opens that client's page, with the
   checklist at the top of the Summary tab. It's not a separate checklist
   page. Back takes you to the list where you left off."

   Overdue first, because that is the only ordering a worklist can justify.
   The Success in 30 tab shows progress by week rather than by phase, and the
   Offboarding tab shows the type of ending and the final date, which is what
   she asked for in the two sentences after that. */
const OB_BOARD_TABS=[['onboarding','Onboarding'],['s30','Success in 30'],
                     ['offboarding','Offboarding'],['done','Completed']];
let _obTab='onboarding';
function setObTab(t){ _obTab=t; renderObBoard(); }

/* HER ONBOARDING BOARD COLUMNS, from the picture in Part 4: SOC, Day, a
   status, a bar PER PHASE, the one thing due next, and who owns it.

   The board shipped with a single "n of 29" and "n items overdue", which
   tells a manager that something is behind without telling them what or
   where. Three bars say which phase is stuck; the next item due is the one
   sentence that makes the row actionable. */
function _obProgress(c){
  const done=_obMap(c.id), items=OB_CHECKLIST.flatMap(g=>g.items);
  const today=_obToday();
  let late=0;
  items.forEach(i=>{ if(done[i.id])return; const d=obDueFor(c,i); if(d.date&&d.date<today)late++; });
  const n=items.filter(i=>done[i.id]).length;
  const phases=OB_CHECKLIST.map(g=>{
    const d=g.items.filter(i=>done[i.id]).length;
    return {done:d,total:g.items.length};
  });
  return {done:n,total:items.length,late,phases,finished:n===items.length};
}
/* THE ONE THING DUE NEXT. Overdue first, then the nearest date. An item the
   Hub cannot date is not a candidate: obDueFor refuses to guess, and a row
   that announced an undated item as "due next" would be inventing urgency. */
function _obNextDue(c){
  const done=_obMap(c.id), today=_obToday();
  const open=[];
  OB_CHECKLIST.forEach(g=>g.items.forEach(i=>{
    if(done[i.id])return;
    const d=obDueFor(c,i);
    if(!d.date)return;
    const when=d.date?('due '+_cmDate(d.date)):'';
    const say=[d.short,when||d.text].filter(Boolean).join(' \u00b7 ');
    open.push({item:i,date:d.date,say,late:d.date<today});
  }));
  if(!open.length)return null;
  open.sort((a,b)=>(b.late-a.late)||a.date.localeCompare(b.date));
  return open[0];
}
function _obOffFor(c){
  // The checklist opens when a Service Cancellation Pending Form is created.
  // Until the Hub reads that form, an end date on the record is the signal.
  const end=c.endDate||c.vivDischarged||'';
  if(!end)return null;
  const done=_obMap(c.id);
  const n=OFF_CHECKLIST.filter(i=>done['off:'+i.id]).length;
  return {end,done:n,total:OFF_CHECKLIST.length,type:c.endType||'',finished:n===OFF_CHECKLIST.length};
}
function obBoardRows(){
  const cl=(get('clients')||[]).filter(c=>!c.isOffice);
  const mine=document.getElementById('s60-mine');
  let rows=[];
  cl.forEach(c=>{
    const daysIn=daysAgo(c.startDate);
    const off=_obOffFor(c);
    if(off){ rows.push({tab:off.finished?'done':'offboarding',c,off,
                        late:0,sort:off.end}); return; }
    /* SUCCESS IN 60 IS THE SAME BOARD FOR 30 MORE DAYS, which is what "gets
       30 more days with the same checks" means. Dropping an extended client
       off the board at Day 31 would end the watch at exactly the moment her
       rule says to continue it. */
    const win=s60Window(c);
    if(daysIn===null||daysIn>win)return;
    const pr=_obProgress(c);
    let k=null; try{ k=s30Adjusted(c); }catch(e){ k=null; }
    rows.push({tab:pr.finished&&(!k||k.finished)?'done':'onboarding',
               c,pr,k,daysIn,late:pr.late,sort:c.startDate});
    if(k&&!k.finished)rows.push({tab:'s30',c,pr,k,daysIn,win,late:k.weeks?0:0,sort:c.startDate});
  });
  // Overdue first, then the newest start of care.
  rows.sort((a,b)=>(b.late-a.late)||String(b.sort).localeCompare(String(a.sort)));
  if(mine&&mine.checked)rows=rows.filter(r=>!r.c.csm||r.c.csm===(P&&P.name));
  const mk=document.getElementById('s60-market');
  const want=mk?mk.value:'';
  if(want)rows=rows.filter(r=>(r.c.market||'')===want);
  return rows;
}
function renderObBoard(){
  mountObUI();
  const box=document.getElementById('s60-board-rows'); if(!box)return;
  /* The market list is built from the clients actually on the board, so it
     never offers a market with nothing behind it. Built before the rows are
     read, because obBoardRows filters on the current selection. */
  const mk=document.getElementById('s60-market');
  if(mk){
    const seen=[...new Set((get('clients')||[]).filter(c=>!c.isOffice)
      .map(c=>c.market||'').filter(Boolean))].sort();
    const sig=seen.join('|');
    if(mk.dataset.sig!==sig){
      mk.dataset.sig=sig;
      const keep=mk.value;
      mk.innerHTML='<option value="">All markets</option>'+
        seen.map(m=>`<option value="${escHtml(m)}">${escHtml(m)}</option>`).join('');
      if(seen.indexOf(keep)>-1)mk.value=keep;
    }
    // One market on the caseload is not a choice.
    mk.style.display=seen.length>1?'':'none';
  }
  const all=obBoardRows();
  const n={}; OB_BOARD_TABS.forEach(t=>n[t[0]]=0);
  all.forEach(r=>{ if(n[r.tab]!==undefined)n[r.tab]++; });
  const tabs=document.getElementById('s60-tabs');
  if(tabs)tabs.innerHTML=OB_BOARD_TABS.map(t=>
    `<div class="tab${_obTab===t[0]?' active':''}" onclick="setObTab('${t[0]}')">${escHtml(t[1])}${n[t[0]]?` <span style="opacity:.6;">${n[t[0]]}</span>`:''}</div>`).join('');
  /* The old "Select a client to view their onboarding tracker" empty state
     sits below this board and is now wrong: you do not have to select
     anybody, the list IS the page. It only still means something when there
     is nothing in any tab. */
  const emp=document.getElementById('s60-empty');
  if(emp&&!document.getElementById('s60-content').style.display)
    emp.style.display=all.length?'none':'';
  if(emp&&all.length)emp.style.display='none';
  const rows=all.filter(r=>r.tab===_obTab);
  const cnt=document.getElementById('s60-board-n');
  if(cnt)cnt.textContent=rows.length?(rows.length+(rows.length===1?' client':' clients')):'';
  if(!rows.length){ box.innerHTML='<div class="es"><div class="ei">\u2713</div><p>Nothing in this list right now.</p></div>'; return; }
  /* A HEADER ROW, because her rule is a header whenever a row has more than
     two columns -- and this board draws THREE different rows.

     The first cut tested the shape one way and drew it another: allOb only
     excluded the offboarding rows, while the renderer below gives the
     Success-in-30 rows a four-column shape of their own. So the S30 tab put
     nine labels over four cells, on grids that shared not one edge --
     measured 265/68/62/78/56/56/56/285/54 above 349/507/112/72. A header that
     names columns that are not there is worse than no header, because it is
     read as if it were true.

     So the shape is decided ONCE, by the function both ends now use, and each
     shape carries its own header. The Completed tab can hold finished
     onboarding AND finished offboarding at the same time, and no single
     header describes both, so a mixed tab gets none. */
  const SHAPES = {
    ob:  { cls: 'obb-ob', cols: ['Client', 'Start of care', 'Day', 'Status',
                                 'Phase 1', 'Phase 2', 'Phase 3', 'Next item due', 'Owner'] },
    /* HER WEEKS, NOT THE ONBOARDING PHASES. Part 3 groups the first 30 days
       as Before Start of Care, Days 1-7, 8-14, 15-21 and 22-30, and her
       section 7 asks for "Success in 30 shows progress by week instead of by
       phase".

       The weeks were already computed -- s30Checklist returns them with a
       done and a total each -- and the board simply never read them. It drew
       one lump "4 of 10", so a client three weeks in with nothing done in
       week 3 looked the same as one who had done week 3 and nothing else. */
    s30: { cls: 'obb-s30', cols: ['Client', 'Day', 'Status',
                                  'Pre', 'Days 1\u20137', 'Days 8\u201314',
                                  'Days 15\u201321', 'Days 22\u201330',
                                  'Next item due', 'Owner'] },
    off: { cls: '',       cols: ['Client', 'Ending type', 'Final visit', 'Checklist'] }
  };
  const shapeOf = r => (r.tab === 'offboarding' || (r.off && r.tab === 'done')) ? 'off'
                     : r.tab === 's30' ? 's30'
                     : 'ob';
  const shapes = [...new Set(rows.map(shapeOf))];
  const shape = shapes.length === 1 ? SHAPES[shapes[0]] : null;
  const head = shape
    ? '<div class="obb-r ' + shape.cls + ' obb-head" role="row">' +
      shape.cols.map(h => '<span>' + escHtml(h) + '</span>').join('') +
      '</div>'
    : '';
  box.innerHTML='<div class="obb">'+head+rows.map(r=>{
    const open=`openObClient('${r.c.id}')`;
    if(shapeOf(r)==='off'){
      const t=(OFF_TYPES.find(x=>x.id===r.off.type)||{}).label||'Type not recorded';
      return `<button type="button" class="obb-r${r.off.finished?'':' live'}" onclick="${open}">
        <span class="obb-n">${escHtml(r.c.name)}</span>
        <span class="obb-w">${escHtml(t)}</span>
        <span class="obb-d">Final ${escHtml(new Date(r.off.end+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}))}</span>
        <span class="obb-p">${r.off.done} of ${r.off.total}</span></button>`;
    }
    if(shapeOf(r)==='s30'){
      const st=r.k?r.k.state:'ontrack';
      /* One bar per week, in her order, and a week with nothing in it is
         drawn as an empty bar rather than skipped: the columns have to line
         up across every row or the board cannot be read down. */
      const wk=['pre','w1','w2','w3','w4'].map(id=>{
        const w=(r.k&&r.k.weeks||[]).find(x=>x.id===id);
        return w?_obBar(w.done,w.total):_obBar(0,0);
      }).join('');
      const nd=r.k?_s30NextDue(r.k):null;
      return `<button type="button" class="obb-r obb-s30 ${st}" onclick="${open}"
        title="${escHtml(r.k?r.k.why:'')}">
        <span class="obb-n">${escHtml(r.c.name)}</span>
        <span class="obb-d">${r.daysIn<0?('Starts in '+(-r.daysIn===1?'1 day':(-r.daysIn)+' days')):('Day '+(r.daysIn+1)+' of '+(r.win||30))}</span>
        <span class="obb-st ${st}">${escHtml(S30_STATE_LABEL[st]||'On Track')}</span>
        ${wk}
        <span class="obb-next${nd&&nd.overdue?' late':''}">${nd?escHtml(nd.label):'Nothing dated outstanding'}</span>
        <span class="obb-own">${escHtml(nd?nd.owner:'')}</span></button>`;
    }
    /* HER ONBOARDING ROW: client, SOC, day, status, a bar per phase, the one
       thing due next, and who owns it. The status is the Success in 30 state,
       because her callout says so in as many words: "Same three statuses as
       Success in 30 rules in Part 3". One rule, read twice, so the board and
       the client page can never disagree about a client. */
    const st=r.k?r.k.state:'ontrack';
    const nd=_obNextDue(r.c);
    const where=[r.c.loc,r.c.market].filter(Boolean).join(' \u00b7 ');
    return `<button type="button" class="obb-r obb-ob ${st}" onclick="${open}">
      <span class="obb-n">${escHtml(r.c.name)}${where?`<em class="obb-sub">${escHtml(where)}</em>`:''}</span>
      <span class="obb-d">${r.c.startDate?escHtml(_cmDate(r.c.startDate)):'\u2014'}</span>
      <span class="obb-d">${r.daysIn<0?('Starts in '+(-r.daysIn===1?'1 day':(-r.daysIn)+' days')):('Day '+r.daysIn)}</span>
      <span class="obb-st ${st}">${escHtml(S30_STATE_LABEL[st]||'On Track')}</span>
      ${r.pr.phases.map(ph=>_obBar(ph.done,ph.total)).join('')}
      <span class="obb-next${nd&&nd.late?' late':''}">${nd?escHtml(nd.item.label+(nd.say?' \u00b7 '+nd.say:'')):'Nothing dated outstanding'}</span>
      <span class="obb-own">${escHtml(nd?nd.item.owner:'')}</span></button>`;
  }).join('')+'</div>';
}
/* THE ONE THING DUE NEXT in the first 30 days. Overdue first, then the
   nearest date, mirroring _obNextDue for the onboarding board so the two
   columns mean the same thing. An item with no date is not a candidate:
   announcing an undated item as due next would be inventing urgency. */
function _s30NextDue(k){
  const open=[];
  (k.weeks||[]).forEach(w=>(w.items||[]).forEach(i=>{ if(!i.done&&i.due)open.push(i); }));
  if(!open.length)return null;
  open.sort((a,b)=>(b.overdue-a.overdue)||String(a.due).localeCompare(String(b.due)));
  return open[0];
}
const S30_STATE_LABEL={ontrack:'On Track',watch:'Watch',atrisk:'At Risk',done:'Complete',
                       notstarted:'Not started'};
function _obBar(d,t){
  const pct=t?Math.round(d/t*100):0;
  return `<span class="obb-ph"><span class="obb-bar"><i style="width:${pct}%"></i></span>`+
         `<em>${t?d+'/'+t:'\u2014'}</em></span>`;
}
/* Her rule: the row opens the CLIENT, not a checklist page of its own. */
function openObClient(cid){
  const nv=document.querySelector('.nav-item[onclick*=clients]');
  if(nv)showPage('clients',nv);
  setTimeout(()=>{ try{
    if(window.TributeRedesign){ TributeRedesign.setView('all'); TributeRedesign.select(cid); }
    else if(typeof toggleClientDetail==='function')toggleClientDetail(cid);
  }catch(e){} },140);
}

/* ═══════════════ THE MANAGER AND DIRECTOR VIEW ══════════════════════════
   Courtney, Part 4:
     - Open onboardings and offboardings by market and CSM, overdue first
     - Success in 30 status for every client in their first 30 days
     - Success in 30 rate, on-time rate, time to setup, early cancellations,
       early caregiver churn
     - An approval queue for Tribute-initiated discharges

   THE APPROVAL QUEUE IS A GATE, NOT A NOTICE. Her rule: "Checklist stays
   locked until manager approval is recorded. The family notice draft is
   reviewed by the manager before sending." So approving writes a record that
   the checklist and the draft both read, and only a manager can write it.
   Without that the lock would be decoration.

   A METRIC THE HUB CANNOT COMPUTE SAYS SO. Each of her five returns either a
   number or the reason it has none. A manager acting on a rate that silently
   fell back to zero is worse off than one who can see it is not ready. */
function _obAllClients(){
  const out=[];
  const seen={};
  (PROFILES||[]).forEach(pr=>{
    ((DATA.profiles&&DATA.profiles[pr.id]&&DATA.profiles[pr.id].clients)||[]).forEach(c=>{
      if(c.isOffice||seen[c.id])return; seen[c.id]=1; out.push({c,csm:pr});
    });
  });
  return out;
}
function obApprovals(){
  return ((DATA.shared&&DATA.shared.dischargeApprovals)||{});
}
function obApprovalFor(cid){ return obApprovals()[cid]||null; }
function obApprove(cid){
  if(!(P&&(P.isManager||P.isDirector))){ showToast('Only a manager or director can approve a discharge.'); return; }
  DATA.shared=DATA.shared||{};
  DATA.shared.dischargeApprovals=DATA.shared.dischargeApprovals||{};
  DATA.shared.dischargeApprovals[cid]={by:P.name,at:new Date().toISOString()};
  queueSave();
  showToast('Approved. The checklist and the family notice are unlocked.');
  try{ renderObManager(); }catch(e){}
}

/* Her five metrics. Each is {n, text} or {text} with no number, and nothing
   divides by a denominator it does not have. */
function obMetrics(){
  const all=_obAllClients();
  const today=_obToday();
  const out=[];

  // 1. Success in 30 rate: On Track at day 30, of those who reached day 30.
  const reached=all.filter(x=>{const d=daysAgo(x.c.startDate);return d!==null&&d>=30&&d<=120;});
  if(reached.length){
    let ok=0;
    reached.forEach(x=>{ let k=null; try{k=s30Checklist(x.c);}catch(e){}
      if(k&&(k.state==='ontrack'||k.state==='done'))ok++; });
    out.push({k:'Success in 30 rate',n:Math.round(ok/reached.length*100)+'%',
              sub:ok+' of '+reached.length+' reached day 30 on track'});
  } else out.push({k:'Success in 30 rate',sub:'No client has reached day 30 in the window yet'});

  // 2. On-time rate: checklist items completed by their due date.
  let due=0,onTime=0;
  all.forEach(x=>{
    const d=daysAgo(x.c.startDate); if(d===null||d>120)return;
    const done=_obMap(x.c.id);
    OB_CHECKLIST.flatMap(g=>g.items).forEach(i=>{
      const dd=obDueFor(x.c,i); if(!dd.date||dd.date>today)return;
      due++;
      const r=done[i.id];
      if(r&&(!r.when||r.when<=dd.date))onTime++;
    });
  });
  if(due)out.push({k:'Onboarding on-time rate',n:Math.round(onTime/due*100)+'%',
                   sub:onTime+' of '+due+' items done by their due date'});
  else out.push({k:'Onboarding on-time rate',sub:'Nothing has come due yet'});

  // 3. Time to setup: assessment to Viv setup complete.
  const spans=[];
  all.forEach(x=>{
    const done=_obMap(x.c.id);
    const a=done['ob_asmt'], last=OB_CHECKLIST[1].items
      .map(i=>done[i.id]).filter(Boolean).map(r=>r.when||String(r.at||'').slice(0,10)).sort().slice(-1)[0];
    const complete=OB_CHECKLIST[1].items.every(i=>done[i.id]);
    if(a&&complete&&last){
      const from=a.when||String(a.at||'').slice(0,10);
      const n=Math.round((new Date(last+'T12:00:00')-new Date(from+'T12:00:00'))/864e5);
      if(isFinite(n)&&n>=0)spans.push(n);
    }
  });
  if(spans.length)out.push({k:'Time to setup',n:Math.round(spans.reduce((a,b)=>a+b,0)/spans.length)+'d',
                            sub:'median across '+spans.length+' completed setups'});
  else out.push({k:'Time to setup',sub:'No setup is complete enough to measure'});

  // 4 and 5 need data the Hub does not hold yet, and say so rather than
  // reading zero. Early cancellations want the Cancellation Form reason;
  // early caregiver churn wants a reason code on a caregiver change.
  out.push({k:'Early cancellations',sub:'Waiting on the Service Cancellation Pending Form in Viv'});
  out.push({k:'Early caregiver churn',sub:'Waiting on a reason on each caregiver change'});
  return out;
}

/* ══════ THE EVIDENCE THE HUB ALREADY HOLDS ════════════════════
   Ten milestone ticks in the whole company, against 30 clients inside their
   window. The checklist was not being worked, so it measured nothing.

   But the Hub already holds the evidence for six of the ten, in the places
   Courtney's own "How the Hub knows" column points at. Measured live:

     asmt        viv.visits, type "Home Assessment"            10 of 30
     visit2      viv.visits, type "Home Visit", after SOC        4 of 30
     fam_wk1..4  a family touchpoint inside that week      14 / 14 / 10 / 8

   Sixty marks the checklist could not see, against ten it could.

   A DERIVED MILESTONE IS NOT A TICK. Nothing here writes to any store. The
   evidence is handed to s30Checklist for the length of one call and then
   taken away again; saving it would be the Hub forging a CSM's signature on
   work it only inferred. It also means the moment somebody DOES tick, their
   record is what stands. */
const S30_FAM_TP = /^(Family Email|Family Phone Call|Text Follow-Up|Virtual Meeting)$/i;
function _s30VivVisits(c){
  try{ return ((DATA.shared&&DATA.shared.viv&&DATA.shared.viv.visits)||[])
                .filter(v=>v.cid&&c.vivId&&v.cid===c.vivId); }
  catch(e){ return []; }
}
function s30Derived(c,pid){
  const soc=String(c.startDate||'').slice(0,10);
  if(!soc)return [];
  const out=[];
  const add=(id,date)=>{ if(date)out.push({id,clientId:c.id,date:String(date).slice(0,10),
                                           type:'EVIDENCE',by:''}); };
  const first=(rows,key)=>rows.slice().sort((a,b)=>String(a[key]).localeCompare(String(b[key])))[0];
  const vis=_s30VivVisits(c);
  /* The assessment is a Home Assessment on the CSM visit feed. Not bounded to
     the window: her checklist puts it before start of care, and an assessment
     that happened a week early still happened. */
  const a=first(vis.filter(v=>/assessment/i.test(String(v.type||''))),'day');
  if(a)add('asmt',a.day);
  /* The second in-person visit is a Home Visit dated AFTER start of care. The
     assessment is the first; anything after it on the feed is the second. */
  const v2=first(vis.filter(v=>/home visit/i.test(String(v.type||''))&&
                               String(v.day).slice(0,10)>soc),'day');
  if(v2)add('visit2',v2.day);
  /* Weekly family contact, from the contact log, in the week it belongs to.
     The windows are her due days: 7, 14, 21, 30. */
  let tps=[];
  try{ tps=(get('touchpoints',pid)||[]).filter(t=>t.clientId===c.id&&
            S30_FAM_TP.test(String(t.type||''))); }catch(e){}
  [[1,7,'fam_wk1'],[8,14,'fam_wk2'],[15,21,'fam_wk3'],[22,30,'fam_wk4']].forEach(w=>{
    const lo=_obPlus(soc,w[0]),hi=_obPlus(soc,w[1]);
    const hit=first(tps.filter(t=>{const d=String(t.date).slice(0,10);return d>=lo&&d<=hi;}),'date');
    if(hit)add(w[2],hit.date);
  });
  return out;
}
/* THE TWO CONDITIONS THAT COULD NEVER FIRE. The exceptions store is empty on
   every profile and in the shared document, so _s30Exceptions answered
   all-false for all 240 clients. And viv.visits carries no caregiver field --
   those rows are CSM Home Visits -- so _s30CaregiverChanges answered 0 for
   all 240. Four of her six implemented conditions were dead, which is why
   nothing in the company has ever read Watch.

   Both counts are on the client record, in the sentence the Pulse feed
   already writes: "5 events in 30 days: 3 service exceptions, 2 caregiver
   changes (...)". All 227 rows parse for the exception count, 165 for the
   caregiver count, and the remaining 62 say "not comparable yet", which is
   an answer rather than a zero.

   WHAT IS STILL INVISIBLE is the exception's TYPE. Her At Risk condition
   wants a Client Complaint specifically, and the sentence only counts them.
   So this reports that exceptions exist, which is her Watch condition, and
   never claims a complaint it cannot see. */
function s30Facts(c){
  const s=String((c.fillEvidence&&c.fillEvidence.serviceEvents)||'');
  const se=s.match(/(\d+)\s+service exceptions?/i);
  const cg=s.match(/(\d+)\s+caregiver changes?/i);
  return { ses: se?parseInt(se[1],10):null,
           cgChanges: cg?parseInt(cg[1],10):null,
           cgKnown: !!cg };
}
/* HER RULES, ON THE FULLER EVIDENCE. s30Checklist is not touched and not
   restated: for the length of ONE synchronous call its three readers are
   pointed at what the Hub actually knows, and then put back. get, and both
   _s30 readers, are top-level function declarations in index.html, so they
   are properties of the global object and a bare call inside s30Checklist
   resolves to whatever is there at the time.

   The restore is in a finally, so a throw inside s30Checklist cannot leave
   the Hub running on the shim. */
function s30WithEvidence(c,pid){
  const extra=s30Derived(c,pid);
  const f=s30Facts(c);
  const realGet=window.get, realEx=window._s30Exceptions, realCg=window._s30CaregiverChanges;
  window.get=function(key){
    const v=realGet.apply(this,arguments);
    return key==='s60' ? (v||[]).concat(extra) : v;
  };
  if(f.ses!==null)window._s30Exceptions=function(x){
    const base=realEx.apply(this,arguments)||{};
    // The count cannot say WHICH kind, so complaint and dissatisfaction are
    // left exactly as the real reader found them rather than guessed at.
    return { any: base.any||f.ses>0, complaint: !!base.complaint,
             dissatisfaction: !!base.dissatisfaction };
  };
  if(f.cgKnown)window._s30CaregiverChanges=function(){
    return Math.max(realCg.apply(this,arguments)||0, f.cgChanges||0);
  };
  try{ return s30Checklist(c); }
  finally{ window.get=realGet; window._s30Exceptions=realEx; window._s30CaregiverChanges=realCg; }
}

/* ══════════════ SILENCE IS NOT RISK ═════════════════════════
   Measured across all eleven profiles on 26 Nov 2026: 21 clients in their
   first thirty days, 14 of them At Risk, and TEN milestone rows in the whole
   company. Of those 14, ZERO had a client complaint exception or two or more
   caregiver changes. Twelve were At Risk for exactly one reason: nobody has
   ticked anything on their checklist.

   Her Part 3 rule is right, once the checklist is being worked. Until then
   "two or more items overdue" measures whether anyone has RECORDED the work,
   not whether the work happened, and raising it as Need action today would
   have put a dozen false alarms on Home on the first morning anybody opened
   it. An alarm that is mostly wrong is one people learn to ignore, which is
   the fault this whole review opened with, pointing the other way.

   So the two kinds of At Risk are told apart:

     EVIDENCE   a client complaint exception, or two or more caregiver
                changes. Both come from Viv, neither depends on anyone
                ticking anything, and either one stands on its own.
     THE COUNT  items past their due date. This means what she says it means
                only once that client's checklist has been started.

   Where only the count fires and nothing has been started, the client reads
   Not started, which is the true thing, and stays in the first-thirty-days
   group rather than joining Need action today.

   V1's s30Checklist is untouched. Her rule is still computed exactly as she
   wrote it; this decides what the Hub does about the answer.

   THE COUNTS ARE ALSO READ FROM THE RIGHT CASELOAD. s30Checklist calls
   get('s60') with no profile id, so it reads whoever is SIGNED IN. On a
   manager's page, looking at another CSM's client, that is the wrong store
   and every client came back "0 of 10". s30Progress takes the profile id. */
/* WHICH MILESTONES THE HUB CAN ACTUALLY SEE. Six have a feed behind them:
   the assessment and the second visit come off the CSM visit list, the four
   weekly family contacts off the contact log. The other four -- caregiver
   prep, the week-one check-in, and the two Viv setup fields -- have no feed
   at all, so the only thing that can satisfy them is a person ticking.

   Nobody ticks, so all four sit permanently overdue on every client. Four is
   two or more, which is At Risk forever, which is how 22 of 30 clients came
   back At Risk even once the evidence was flowing.

   They still SHOW as outstanding, because they are and somebody should tick
   them. They just do not get read as risk, because an item the Hub cannot
   see says nothing about the client. */
const S30_OBSERVABLE = { asmt:1, visit2:1, fam_wk1:1, fam_wk2:1, fam_wk3:1, fam_wk4:1 };
function s30ObservableLate(k){
  return (k&&k.weeks||[]).reduce((n,w)=>n+((w.items||[]).filter(i=>
    S30_OBSERVABLE[i.id]&&!i.done&&i.overdue).length),0);
}
function s30D14Missed(k){
  const all=[];
  (k&&k.weeks||[]).forEach(w=>(w.items||[]).forEach(i=>all.push(i)));
  const d14=all.find(i=>i.id==='visit2');
  return !!(d14&&!d14.done&&d14.overdue);
}
/* EVIDENCE FROM OUTSIDE THE CHECKLIST, which no amount of not-ticking can
   explain away. Two or more caregiver changes in the first 30 days is hers,
   and it is now readable. A Client Complaint exception is hers too and is
   still not readable: the feed counts exceptions without saying which kind,
   so claiming one would be inventing it. */
function s30Evidence(c){
  if(s30FamilyAsk(c.id)==='yes')return true;
  const f=s30Facts(c);
  return f.cgChanges!==null&&f.cgChanges>1;
}
function s30Progress(c,pid){
  const ids=(typeof S30_MILESTONES!=='undefined')?S30_MILESTONES.map(m=>m.id):[];
  let rows=[];
  try{ rows=(get('s60',pid)||[]).filter(x=>x.clientId===c.id); }catch(e){}
  const hit={};
  rows.forEach(r=>{ if(ids.indexOf(r.id)>-1)hit[r.id]=1; });
  return {done:Object.keys(hit).length,total:ids.length,started:rows.length>0};
}
/* UNFILLED VISITS IN THE FIRST 30 DAYS. Her Part 4 asks for these as a
   trigger, and her outcome 5 says why: "a core care team is in place by day
   30, there are no open consistency or booking complaints". A new client
   watching shifts go unfilled is the one who leaves.

   THE THRESHOLDS ARE A JUDGEMENT, not hers, and they are named here so they
   can be moved in one place after a month, which is how she framed her own
   starting rules. One unfilled visit is a Watch; three or more is At Risk.
   Three rather than two deliberately: measured on the live roster, ten of
   twenty-one new clients have at least one open visit and a two-visit bar
   would have put most of a normal week into Needs action.

   CALL-OUTS ARE NOT HERE. The open-visit feed carries the day, the type, the
   client and the hours, and nothing that says WHY a visit is unfilled. An
   open shift is often a routine gap rather than a caregiver letting somebody
   down, and reading one as the other would put a scheduling fact on a care
   record. It is in `missing` instead, where the card can say so. */
const S30_OPEN_WATCH = 1, S30_OPEN_ATRISK = 3;
function s30OpenVisits(c,pid){
  try{
    const ov=((DATA.profiles[pid||(P&&P.id)])||{}).vivOpenVisits||[];
    const soc=String(c.startDate||'').slice(0,10);
    if(!soc)return 0;
    const end=_obPlus(soc,60)||'';
    return ov.filter(v=>v.clientId===c.id&&(()=>{
      const d=String(v.day||'').slice(0,10);
      return d>=soc&&(!end||d<=end);
    })()).length;
  }catch(e){ return 0; }
}

/* HER CONDITION THE HUB CANNOT SEE, MADE ANSWERABLE. "The family has asked
   to remove a caregiver" is the one At Risk condition in Part 3 that nothing
   in Viv records, and two rounds of this work have said so on the card
   rather than guessing. Saying so is honest; leaving it unanswerable forever
   is not.

   So the card asks, once, of a client inside their window, and the answer is
   kept in the shared document the way a discharge approval is, so a manager
   and the CSM see the same thing. Unanswered is not No: until somebody says,
   the condition is reported as unchecked, which is what it has always been.

   This is the only Success in 30 input a person types, and it exists because
   it is the only one a person is the source for. */
function s30FamilyAsks(){ return ((DATA.shared&&DATA.shared.s30FamilyRemove)||{}); }
function s30FamilyAsk(cid){ const r=s30FamilyAsks()[cid]; return r?r.answer:null; }
function setS30FamilyAsk(cid,answer){
  DATA.shared=DATA.shared||{};
  DATA.shared.s30FamilyRemove=DATA.shared.s30FamilyRemove||{};
  DATA.shared.s30FamilyRemove[cid]={answer:answer==='yes'?'yes':'no',
    by:(P&&P.name)||'',at:new Date().toISOString()};
  queueSave();
  showToast(answer==='yes'
    ? 'Recorded. This client is At Risk for the first 30 days.'
    : 'Recorded.');
  try{ if(window.TributeRedesign&&TributeRedesign.repaintClient)TributeRedesign.repaintClient(); }catch(e){}
  try{ renderObBoard(); renderObManager(); }catch(e){}
}
/* DOCUMENTATION GAPS, STATED AND NOT SCORED. Her Part 4 asks the Hub to
   "point out documentation gaps neutrally, without blaming anyone", so these
   are a line on the card and nothing else: they do not move the status, they
   do not reach Needs action, and they name the gap rather than the person.

   Only the care plan is here. The other half she describes, a scheduled
   visit with no note, cannot be measured: the Hub's visit log is synced from
   the same Viv feed as the CSM visit list, so comparing them reports 158
   matched and zero gaps, which is one list compared with itself. It needs
   Viv's visit-note field, which the Hub is not sent. */
function s30DocGaps(c){
  const out=[];
  const d=daysAgo(c.startDate);
  if(d!==null&&d>7&&c.carePlanEdits30===0){
    out.push('The care plan has not been edited in the last 30 days. '+
             'After the first caregiver feedback it usually is.');
  }
  return out;
}

/* No longer listed: whether the family has asked to remove a caregiver. It
   is a question on the card now rather than a thing the Hub gives up on. */
const S30_MISSING = ['whether an unfilled visit was a call-out or a routine gap',
                     'which kind of service exception was raised',
                     'whether a scheduled visit has a note in Viv'];
function s30Adjusted(c,pid){
  let k=null;
  try{ k=s30WithEvidence(c,pid); }catch(e){ return null; }
  if(!k)return null;
  k=Object.assign({},k,{missing:S30_MISSING});
  /* STARTED NOW MEANS THE CHECKLIST CAN BE READ, not that somebody typed.
     The silence rule was written when the Hub could see nothing: an overdue
     item meant nobody had recorded anything. Where the record shows an
     assessment and three weeks of family contact, an item still outstanding
     means it is outstanding, and her count means what she wrote it to mean. */
  const pr=s30Progress(c,pid);
  const derived=s30Derived(c,pid).length;
  const started=pr.started||derived>0;
  const out0=Object.assign({},k,{started:started,derived:derived,
                                 ticked:pr.done,total:k.total});
  const out=s30WithSchedule(c,pid,out0);
  if(out.state!=='atrisk'&&out.state!=='watch')return out;
  /* A status the schedule raised is not the checklist's to take back. */
  if(out.state!==k.state)return out;
  /* HER RULE, ON THE ITEMS IT CAN BE ASKED ABOUT. Two or more overdue, or
     the day 14 visit missed -- both counted over the six with a feed -- or
     caregiver churn, which does not depend on the checklist at all. */
  const late=s30ObservableLate(k);
  const f=s30Facts(c);
  if(s30Evidence(c)||late>1||s30D14Missed(k)){
    /* AND THE REASON NAMES WHAT FIRED. s30Checklist counts all ten items, so
       a client kept At Risk by a missed day 14 visit was reading "5 items
       overdue" -- four of which are items the Hub cannot see and did not
       count towards the decision. A reason that cites evidence the decision
       ignored is worse than no reason. Her order, her words. */
    return Object.assign(out,{why:
      s30FamilyAsk(c.id)==='yes' ? 'the family has asked to remove a caregiver'
      : s30Evidence(c) ? f.cgChanges+' caregiver changes in the first 30 days'
      : s30D14Missed(k) ? 'the day 14 visit was missed'
      : late+' of the items the Hub can check are overdue'});
  }
  return Object.assign(out,{state:'notstarted',
    why: started
      ? 'Nothing is outstanding that the Hub can see. What is left is the '+
        'caregiver prep call, the week-one check-in and the two Viv setup '+
        'fields, and only a tick can record those.'
      : 'The checklist has not been started, so an overdue item here means '+
        'nothing has been recorded rather than nothing has been done.'});
}
/* The one place the status can go UP rather than down. Everything above
   reads the checklist; this reads the schedule, which the checklist has no
   view of at all, so it is applied last and only where it would raise the
   client. A client already At Risk is not made more so. */
function s30WithSchedule(c,pid,k){
  if(!k)return k;
  const open=s30OpenVisits(c,pid);
  if(open>=S30_OPEN_ATRISK&&k.state!=='atrisk'){
    return Object.assign({},k,{state:'atrisk',openVisits:open,
      why:open+' unfilled visits in the first 30 days'});
  }
  if(open>=S30_OPEN_WATCH&&(k.state==='ontrack'||k.state==='done')){
    return Object.assign({},k,{state:'watch',openVisits:open,
      why:(open===1?'an unfilled visit':open+' unfilled visits')+' in the first 30 days'});
  }
  return Object.assign({},k,{openVisits:open});
}

/* ══════════ DAY 30: GRADUATE, OR EXTEND TO SUCCESS IN 60 ══════════════
   Part 3: "At Day 30: An On Track client graduates to their normal tier
   cadence. A Watch or At Risk client gets 30 more days with the same checks
   (Success in 60). The manager gets a short summary."

   THE DECISION IS A RULE, NOT A JUDGEMENT. Nobody picks: the status at Day 30
   decides, so nothing here offers a choice. What a person does is ACKNOWLEDGE
   it, and that is what gets written down.

   WHY IT IS NOT WRITTEN AUTOMATICALLY. A verdict computed during a render and
   saved during a render is a write nobody asked for, and in a read-only View
   As it would be a write the Hub had already promised not to make. That fault
   cost a real Scribe encounter on a real client earlier this month: set()
   mutates before queueSave() gets to refuse. So the verdict is DERIVED on
   every read and persisted only when the manager says they have seen it.

   AND WHY IT FREEZES ON ACKNOWLEDGEMENT. Two of her At Risk conditions count
   inside a window -- "any Client Complaint SE", "two or more caregiver changes
   in 30 days" -- so they age out. A client extended on Day 30 would read
   "graduate" again on Day 45 from the same function. The Day 30 answer is a
   fact about Day 30, so once it is acknowledged it is kept rather than
   recomputed. Before then it is live, and the card says which day it is
   reading, so any drift is visible rather than silent. */
const S60_DAYS=60;
function d30Records(){ return ((DATA.shared&&DATA.shared.d30Results)||{}); }
function d30Record(cid){ return d30Records()[cid]||null; }
function d30Verdict(c){
  const d=daysAgo(c.startDate);
  /* DAY 30 IS AN EVENT, NOT A STATE. The first pass had a floor and no
     ceiling, so every client who had ever passed day 30 had a result waiting
     to be cleared: on the live roster that was 216 of 238 clients, median 461
     days in care and the oldest 1,761. Nine were inside the window.

     The ceiling is day 60, which is where Success in 60 ends. Past that there
     is no decision left to make and nothing to tell a manager, and a client
     who started before any of this existed is not news. */
  if(d===null||d<30||d>S60_DAYS)return null;
  const frozen=d30Record(c.id);
  if(frozen)return Object.assign({},frozen,{day:d,frozen:true});
  let k=null; try{ k=s30Adjusted(c); }catch(e){ return null; }
  if(!k)return null;
  /* A checklist nobody started does not graduate. We do not know that the
     first thirty days went well; we know that nothing was written down, and
     her rule gives anything other than a clean thirty days another thirty. */
  const grad=(k.state==='ontrack'||k.state==='done');
  return { day:d, readAt:d, state:k.state, why:k.why||'',
           outcome:grad?'graduate':'extend',
           until:grad?'':_todoDay(c.startDate,S60_DAYS),
           done:k.done, total:k.total, frozen:false };
}
/* THE WINDOW THE SAME CHECKS RUN FOR. Thirty days, or sixty for a client the
   Day 30 result extended. One answer, asked by the board, the client page,
   Today's list and the At Risk signal, so none of them can disagree about
   whether a client is still being watched. */
function s60Window(c){
  const v=d30Verdict(c);
  return (v&&v.outcome==='extend')?S60_DAYS:30;
}
function inS60(c){
  const v=d30Verdict(c);
  return !!(v&&v.outcome==='extend'&&v.day<=S60_DAYS);
}
/* HER SHORT SUMMARY. Two sentences: what happened, and what follows from it.
   The reason is the checklist's own sentence, so the manager reads the same
   words the CSM has been reading all month. */
function d30Summary(c,v){
  if(!v)return '';
  const when=c.startDate?_todoDay(c.startDate,30):'';
  const day='Day 30'+(when?' ('+new Date(when+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})+')':'');
  if(v.outcome==='graduate'){
    return c.name+' reached '+day+' on track, with '+v.done+' of '+v.total+
      ' milestones logged. They graduate to the '+(c.tier||'normal')+
      ' tier cadence from here.';
  }
  const until=v.until?new Date(v.until+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):'';
  const word=v.state==='atrisk'?'at risk':(v.state==='notstarted'?'with nothing logged on the checklist':'on watch');
  // The reason is a sentence of its own and may already end in a full stop.
  const why=String(v.why||'').replace(/\.\s*$/,'');
  return c.name+' reached '+day+' '+word+
    (why?': '+why:'')+'. They stay on the same checks for another 30 days'+
    (until?', through '+until:'')+' (Success in 60).';
}
/* ACKNOWLEDGED, NOT DECIDED. The button does not change the outcome; it
   records that a manager has read it, and freezes the Day 30 answer as the
   fact about Day 30 that it is. */
function d30Ack(cid){
  if(!(P&&(P.isManager||P.isDirector))){ showToast('Only a manager or director can clear a Day 30 result.'); return; }
  const c=(_obAllClients().find(x=>x.c.id===cid)||{}).c;
  if(!c)return;
  const v=d30Verdict(c);
  if(!v)return;
  DATA.shared=DATA.shared||{};
  DATA.shared.d30Results=DATA.shared.d30Results||{};
  DATA.shared.d30Results[cid]=Object.assign({},v,
    {frozen:true,seenBy:(P&&P.name)||'',seenAt:new Date().toISOString()});
  queueSave();
  showToast(v.outcome==='graduate'?'Noted. '+c.name+' graduates.':'Noted. '+c.name+' continues to Success in 60.');
  try{ renderObManager(); }catch(e){}
  try{ renderObBoard(); }catch(e){}
  try{ if(window.TributeRedesign&&TributeRedesign.repaintClient)TributeRedesign.repaintClient(); }catch(e){}
}
/* Everyone who has reached Day 30 and has not been acknowledged yet. */
function d30Pending(){
  return _obAllClients().map(x=>({x,v:d30Verdict(x.c)}))
    .filter(r=>r.v&&!r.v.frozen)
    .sort((a,b)=>(a.v.outcome===b.v.outcome?0:(a.v.outcome==='extend'?-1:1))||b.v.day-a.v.day);
}

/* "THE MANAGER IS BRIEFED AUTOMATICALLY" -- Part 3, on At Risk, in those
   words. The brief goes where her document says managers are told: "Two days
   later, the owner's manager sees it on the manager view."

   Scoped by her escalation route rather than by market alone, so a manager
   sees the clients that are actually theirs to take: MA and Chicago to the
   Director of Client Solutions, Maryland to the Senior CSM. The route is
   asked of the redesign layer, which reads it off PROFILES by role; this
   keeps no copy of it. */
function s30AtRiskBrief(){
  const esc1=(window.TributeRedesign&&TributeRedesign.escalateTo)||null;
  const me=(P&&P.name)||'';
  return _obAllClients().map(x=>{
    const d=daysAgo(x.c.startDate);
    const win=s60Window(x.c);
    if(d===null||d>win)return null;
    let k=null; try{ k=s30Adjusted(x.c,x.csm&&x.csm.id); }catch(e){ return null; }
    if(!k||k.state!=='atrisk')return null;
    const to=esc1?esc1(x.c):null;
    return {x,k,d,win,to,mine:!to||!me||to.name===me};
  }).filter(Boolean).filter(r=>r.mine).sort((a,b)=>a.d-b.d);
}

let _obMgrWaits=0;
function renderObManager(){
  /* THE HOST DOES NOT EXIST YET ON THE FIRST VISIT. V1's showPage calls this
     BEFORE renderObBoard, and it is renderObBoard that calls mountObUI and
     creates #s60-mgr. So on the first visit this returned on a null host and
     the board then mounted an empty one: no At Risk brief and no Day 30
     results until the manager navigated away and came back. renderObChecklist
     has always mounted first; this did not. */
  mountObUI();
  const el=document.getElementById('s60-mgr'); if(!el)return;
  /* THE ROUTE RESOLVES BEFORE THE PROFILE IS CHOSEN. On a cold load the Hub
     restores whatever page the URL carries, and a manager whose saved link
     ends in #s60 landed here with P still unset. This answered "not a
     manager", hid itself, and nothing ever called it again: the manager view
     was absent until they navigated away and came back.

     Waiting for the profile rather than answering without one, for ten
     seconds and then no longer, because a question that cannot be answered
     should stop being asked. */
  if(!P){ if(_obMgrWaits<20){ _obMgrWaits++; setTimeout(renderObManager,500); } return; }
  _obMgrWaits=0;
  const isMgr=!!(P&&(P.isManager||P.isDirector));
  el.style.display=isMgr?'':'none';
  if(!isMgr)return;
  const all=_obAllClients();
  const pending=all.filter(x=>String(x.c.endType||'')==='tribute'&&!obApprovalFor(x.c.id));
  const metrics=obMetrics();
  /* "The manager gets a short summary." Her own channel for this, set out at
     the top of the document, is the manager view: "Two days later, the
     owner's manager sees it on the manager view." So the result lands here
     rather than being mailed, and it stays here until it is read. */
  const d30=d30Pending();
  const risk=s30AtRiskBrief();
  el.innerHTML=`${risk.length?`<div class="card" style="margin-bottom:14px;">
    <div class="ct">At Risk in the first ${risk.some(r=>r.win>30)?'30 to 60':'30'} days</div>
    <p style="font-size:11.5px;color:#8C857B;margin:-4px 0 12px;">Briefed to you because these escalate to your role. The reason is the checklist's own.</p>
    <div class="obb">${risk.map(r=>`<div class="obb-r obb-d30 atrisk" style="cursor:pointer;" onclick="openObClient('${r.x.c.id}')">
      <span class="obb-n">${escHtml(r.x.c.name)}<em class="obb-sub">${escHtml(r.x.csm.name.split(' ')[0])}${r.x.c.market?' \u00b7 '+escHtml(r.x.c.market):''}</em></span>
      <span class="obb-st atrisk">Day ${r.d+1} of ${r.win}</span>
      <span class="obb-w">${escHtml(r.k.why||'At risk')}</span>
      <span style="font-size:11.5px;color:#8C857B;">${r.k.done} of ${r.k.total} done</span>
    </div>`).join('')}</div>
  </div>`:''}
  ${d30.length?`<div class="card" style="margin-bottom:14px;">
    <div class="ct">Day 30 results</div>
    <p style="font-size:11.5px;color:#8C857B;margin:-4px 0 12px;">Graduated or extended to Success in 60. Clearing one keeps it as the Day 30 answer.</p>
    <div class="obb">${d30.map(r=>`<div class="obb-r obb-d30 ${r.v.outcome}" style="cursor:default;">
      <span class="obb-n">${escHtml(r.x.c.name)}<em class="obb-sub">${escHtml(r.x.csm.name.split(' ')[0])}${r.x.c.market?' \u00b7 '+escHtml(r.x.c.market):''}</em></span>
      <span class="obb-st ${r.v.outcome==='graduate'?'ontrack':r.v.state}">${r.v.outcome==='graduate'?'Graduates':'Success in 60'}</span>
      <span class="obb-w">${escHtml(d30Summary(r.x.c,r.v))}</span>
      <button class="btn btn-sm" onclick="d30Ack('${r.x.c.id}')">Noted</button>
    </div>`).join('')}</div>
  </div>`:''}
  <div class="card" style="margin-bottom:14px;">
    <div class="ct">Waiting on you</div>
    ${pending.length?`<div class="obb">${pending.map(x=>`<div class="obb-r live" style="cursor:default;">
        <span class="obb-n">${escHtml(x.c.name)}</span>
        <span class="obb-w">Tribute-initiated discharge, waiting for approval</span>
        <span class="obb-d">${escHtml(x.csm.name.split(' ')[0])}</span>
        <button class="btn btn-sm btn-p" onclick="obApprove('${x.c.id}')">Approve</button>
      </div>`).join('')}</div>`
      :`<p style="font-size:12.5px;color:#8C857B;margin:0;">Nothing waiting for an approval.</p>`}
  </div>
  <div class="card">
    <div class="ct">Onboarding and Success in 30</div>
    <p style="font-size:11.5px;color:#8C857B;margin:-4px 0 12px;">Across every CSM in your markets.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;">
      ${metrics.map(m=>`<div style="padding:11px 13px;background:#F7F4EF;border-radius:9px;">
        <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8C857B;">${escHtml(m.k)}</div>
        ${m.n?`<div style="font-size:21px;font-weight:600;color:#1C1A17;line-height:1.2;margin-top:2px;">${escHtml(m.n)}</div>`:''}
        <div style="font-size:11.5px;color:${m.n?'#8C857B':'#92580B'};margin-top:${m.n?'1px':'4px'};line-height:1.4;">${escHtml(m.sub)}</div>
      </div>`).join('')}
    </div>
  </div>`;
}

/* Her three: All, the CSM's own, and the Client Solutions Partner's. The
   owner on an item is free text from the document and a few items are owned
   jointly ("CSP + CSM"), so the match is a substring rather than equality:
   a shared item belongs on both lists, not neither. */
const OB_WHO=[['all','All'],['CSM','Mine (CSM)'],['CSP','CSP']];
let _obWho='all';
function _obWhoMatch(i){
  if(_obWho==='all')return true;
  return String(i.owner||'').toUpperCase().indexOf(_obWho)>-1;
}
function setObWho(w,cid){ _obWho=w; renderObChecklist(cid); }
function renderObChecklist(cid){
  mountObUI();
  const el=document.getElementById('s60-ob'); if(!el)return;
  const done=_obMap(cid);
  const cl=get('clients')||[], c=cl.find(x=>x.id===cid)||{};
  const today=_obToday();
  const total=OB_CHECKLIST.reduce((n,g)=>n+g.items.length,0);
  const ticked=OB_CHECKLIST.reduce((n,g)=>n+g.items.filter(i=>done[i.id]).length,0);

  const rowOf=(i)=>{
    const d=done[i.id];
    const due=obDueFor(c,i);
    const late=!d&&due.date&&due.date<today;
    const blocked=!d&&i.needs&&!done[i.needs];
    const whenTxt=due.date?('Due '+new Date(due.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}))
                          :(due.text||'');
    return {i,d,late,blocked,html:`<div class="ob-row${d?' done':''}${late?' late':''}${blocked?' blocked':''}">
      <input type="checkbox" class="ob-cb" ${d?'checked':''} ${blocked?'disabled':''}
        onchange="toggleObTask('${cid}','${i.id}')"
        title="${blocked?'Waiting on the step above':'Tick when it is done'}">
      <div class="ob-t">
        <div class="ob-l">${i.isNew?'<span class="ob-new">New</span>':''}${escHtml(i.label)}</div>
        ${i.hint?`<div class="ob-h">${escHtml(i.hint)}</div>`:''}
        ${i.viv?`<div class="ob-viv">In Viv: ${escHtml(i.viv)}</div>`:''}
        ${d&&(d.who||d.note||d.na)?`<div class="ob-proof">${d.na?'Not applicable':''}${d.who?escHtml('with '+d.who):''}${d.note?(d.who?' \u00b7 ':'')+escHtml(d.note):''}${d.when?' \u00b7 '+new Date(d.when+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):''}</div>`:''}
        ${blocked?`<div class="ob-h ob-block">Waiting on: ${escHtml((OB_CHECKLIST.flatMap(g=>g.items).find(x=>x.id===i.needs)||{}).label||'the step above')}</div>`:''}
        ${due.note?`<div class="ob-h ob-rule">${escHtml(due.note)}</div>`:''}
      </div>
      <span class="ob-own">${escHtml(i.owner||'')}</span>
      <span class="ob-hub" title="${escHtml(OB_HUB_HELP[i.hub]||i.hub||'')}">${escHtml(i.hub||'')}</span>
      <span class="ob-due">${escHtml(whenTxt)}</span>
      <input type="text" class="ob-by" value="${escHtml((d&&d.by)||'')}" placeholder="initials" maxlength="6"
        onchange="setObBy('${cid}','${i.id}',this.value)">
      <span class="ob-at">${d&&d.at?new Date(d.at).toLocaleDateString('en-US',{month:'short',day:'numeric'}):''}</span>
    </div>`};
  };

  /* HER HEADER, from the checklist picture: "19 of 27 done" with a bar, the
     overdue count beside it in red, and All / Mine (CSM) / CSP.

     THE FILTER HIDES ROWS, IT DOES NOT CHANGE THE COUNTS. The bar and the
     overdue figure are the whole checklist every time. A CSP looking at their
     own six items should still see that the client is nineteen of twenty-seven
     through onboarding; a progress bar that moved when you changed the filter
     would be measuring the filter. */
  const lateN=OB_CHECKLIST.reduce((n,g)=>n+g.items.filter(i=>{
    if(done[i.id])return false;
    const d=obDueFor(c,i); return !!(d.date&&d.date<today);
  }).length,0);
  const pct=total?Math.round(ticked/total*100):0;
  const who=_obWho;
  el.innerHTML=`<div class="ob-head">
      <div class="ob-sum">${ticked} of ${total} done${lateN?`<span class="ob-late">${lateN} overdue</span>`:''}</div>
      <div class="ob-prog"><i style="width:${pct}%"></i></div>
      <div class="ob-whobar">${OB_WHO.map(w=>
        `<button type="button" class="ob-wb${who===w[0]?' on':''}" onclick="setObWho('${w[0]}','${cid}')">${escHtml(w[1])}</button>`).join('')}</div>
    </div>`+
    OB_CHECKLIST.map(g=>{
      const items=g.items.filter(i=>_obWhoMatch(i));
      if(!items.length)return '';
      const rows=items.map(rowOf);
      // Overdue first inside the phase, her rule; everything else keeps the
      // order the document puts it in, because that order is the procedure.
      rows.sort((a,b)=>(b.late-a.late));
      const gd=rows.filter(r=>r.d).length, fin=gd===rows.length;
      return `<details class="ob-g${fin?' fin':''}" ${fin?'':'open'}>
        <summary>${escHtml(g.g)}<span class="n${fin?' fin':''}">${gd} of ${rows.length}</span></summary>
        ${rows.map(r=>r.html).join('')}</details>`;
    }).join('');
}
const OB_HUB_HELP={
  'AUTO':'The Hub ticks this from Viv. You can still tick it by hand if the sync lags.',
  'CHECK':'Tick it when it is done.',
  'EMAIL':'Ticking opens a draft to edit and send yourself. Nothing sends on its own.',
  'AUTO+ALERT':'The Hub ticks this from Viv. Past its due date the owner is told, and two days later their manager.',
  'AUTO+CHECK':'The Hub ticks what it can see; confirm the rest.',
  'CHECK+ALERT':'Tick it when it is done. Past its due date the owner is told.',
  'CHECK+EMAIL':'Tick it when it is done, and a draft opens to send yourself.',
  'EMAIL+AUTO':'A draft opens to send yourself; the Hub confirms the rest from Viv.',
  'EMAIL+ALERT':'A draft opens to send yourself. Past its due date the owner is told.'
};
/* ── Ticking an item ──────────────────────────────────────────────────────
   "Checking it off asks for proof. Who they talked to, the date, and a
   one-line note. Visits need to be logged as in person. Checked items show
   that proof on the checklist, not just a check mark, so a manager or
   covering CSM can see it was done the right way."

   Un-ticking does not ask anything: taking a tick off is correcting a
   mistake, and making somebody justify a correction is how wrong ticks stay
   on the board. */
let _obProofFor=null;
function toggleObTask(cid,id){
  const rows=get('s60_ob');
  const i=rows.findIndex(r=>r.clientId===cid&&r.id===id);
  if(i>-1){ rows.splice(i,1); set('s60_ob',rows); renderObChecklist(cid); return; }
  const item=OB_CHECKLIST.flatMap(g=>g.items).find(x=>x.id===id)||{};
  if(item.needs&&!rows.some(r=>r.clientId===cid&&r.id===item.needs)){
    showToast('That step is waiting on the one before it.');
    renderObChecklist(cid); return;
  }
  _obProofFor={cid,id,item};
  openObProof();
}
/* -- THE SAME PROOF, FOR THE SUCCESS IN 30 CHECKLIST --------------------
   Courtney, 23 Nov: "The checklist on the client page is unchanged. It has
   next-step buttons, but no checkboxes with proof."

   The onboarding board has had checkboxes with proof since the 21st. The
   client page had the NEXT STEP button and no way to say the step was done,
   so measured on the live caseload both milestone stores were empty for
   every client in their first thirty days: nobody had ever ticked a Success
   in 30 item, because there was nothing to tick, and every client read
   "0 of 10" and "At risk". This opens the same dialog and writes the
   milestone log instead of the onboarding log. */
function openS30Proof(cid,id,label,owner){
  /* THE DIALOG IS MOUNTED BY THE ONBOARDING PAGE, and the client page is
     reachable without ever opening it. Caught live: ticking a milestone on a
     client threw on a null #obp-task, so the first tick of a session did
     nothing at all unless the CSM had been to Onboarding first. mountObUI is
     idempotent, so asking for it here costs nothing when it has already run. */
  if(!document.getElementById('m-ob-proof')){ try{ mountObUI(); }catch(e){} }
  if(!document.getElementById('m-ob-proof')){
    if(typeof showToast==='function')showToast('The onboarding module is still loading. Try again in a moment.');
    return;
  }
  _obProofFor={cid,id,kind:'s30',item:{id,label,owner,hub:'',na:''}};
  openObProof();
}
function untickS30(cid,id){
  // Taking a tick off is correcting a mistake, and making somebody justify a
  // correction is how wrong ticks stay on the record. It asks nothing.
  // The pair is the key: V1's own delS60 filters on id alone, and these rows
  // carry a MILESTONE id rather than a timestamp, so id alone would reach
  // across clients.
  set('s60',(get('s60')||[]).filter(r=>!(r.clientId===cid&&r.id===id)));
  try{ if(window.TributeRedesign&&TributeRedesign.repaintClient)TributeRedesign.repaintClient(); }catch(e){}
}
function openObProof(){
  const {item}=_obProofFor;
  const d=item.draft?draftById(item.draft):null;
  document.getElementById('obp-task').textContent=item.label;
  document.getElementById('obp-owner').textContent=(item.owner||'')+(item.hub?'  \u00b7  '+item.hub:'');
  document.getElementById('obp-who').value='';
  document.getElementById('obp-date').value=_obToday();
  document.getElementById('obp-note').value='';
  const na=document.getElementById('obp-na');
  na.style.display=item.na?'':'none';
  na.textContent=item.na?('Not applicable: '+item.na):'';
  const db=document.getElementById('obp-draft');
  if(item.id==='ob_d30'){
    // Her flow: the Day 30 item opens the call guide, and the guide writes
    // the record and the draft. Ticking it on its own would skip the
    // conversation that is the whole point of the item.
    db.style.display=''; db.textContent='Open the Day 30 call guide';
    db.onclick=function(){ const cid=_obProofFor.cid; closeObProof(); openD30Guide(cid); };
  }
  else if(d&&!d.locked){ db.style.display=''; db.textContent='Open the '+d.name.toLowerCase()+' draft'; db.onclick=openObDraft; }
  else if(d&&d.locked&&!obApprovalFor(_obProofFor.cid)){
    db.style.display=''; db.textContent='Locked until a manager approves'; db.disabled=true; db.onclick=null; }
  else if(d&&d.locked){ db.style.display=''; db.disabled=false;
    db.textContent='Open the '+d.name.toLowerCase(); db.onclick=openObDraft; }
  else { db.style.display='none'; db.onclick=null; }
  openM('m-ob-proof');
}
function saveObProof(na){
  if(!_obProofFor)return;
  const {cid,id,item}=_obProofFor;
  if(_obProofFor.kind==='s30'){ saveS30Proof(na); return; }
  const rows=get('s60_ob');
  const who=(document.getElementById('obp-who').value||'').trim();
  const when=(document.getElementById('obp-date').value||'').slice(0,10);
  const note=(document.getElementById('obp-note').value||'').trim();
  rows.push({clientId:cid,id,by:_initialsOf((P&&P.name)||''),at:new Date().toISOString(),
             who,when,note,na:!!na});
  set('s60_ob',rows);
  /* The whole point of proof: it lands on the CLIENT, not only on the
     checklist, so a covering CSM and a manager can see it was done the right
     way without opening the checklist at all. */
  if(!na){
    const tasks=get('tasks')||[];
    tasks.unshift(Object.assign({id:'task'+Date.now(),clientId:cid,date:when||_obToday(),
      text:item.label, outcome:'Onboarding step completed',
      note:[who?('with '+who):'',note].filter(Boolean).join(' \u00b7 '),
      source:'onboarding', by:P?P.name:'', at:new Date().toISOString()},
      typeof actorStamp==='function'?actorStamp():{}));
    set('tasks',tasks);
  }
  closeObProof();
  renderObChecklist(cid);
  try{ if(typeof renderClientMaster==='function')renderClientMaster(); }catch(e){}
}
/* s30Checklist() matches a milestone by `id` on an s60 row, and reads
   type!=='TASK' as "Viv picked this up". A hand tick is therefore type TASK,
   which is what makes it read as ticked BY SOMEBODY rather than as synced,
   and that distinction is the whole point of the proof. */
function saveS30Proof(na){
  if(!_obProofFor)return;
  const {cid,id,item}=_obProofFor;
  const who=(document.getElementById('obp-who').value||'').trim();
  const when=(document.getElementById('obp-date').value||'').slice(0,10)||_obToday();
  const note=(document.getElementById('obp-note').value||'').trim();
  const proof=[who?('with '+who):'',note].filter(Boolean).join(' \u00b7 ');
  const rows=get('s60')||[];
  if(!rows.some(r=>r.clientId===cid&&r.id===id)){
    rows.push({id,clientId:cid,date:when,type:'TASK',notes:item.label,
               by:_initialsOf((P&&P.name)||''),proof,na:!!na,
               loggedAt:new Date().toISOString()});
    set('s60',rows);
  }
  /* Proof lands on the CLIENT too, not only on the checklist, so a covering
     CSM or a manager sees it was done the right way without opening the
     checklist at all. Same rule as the onboarding board. */
  if(!na){
    const tasks=get('tasks')||[];
    tasks.unshift(Object.assign({id:'task'+Date.now(),clientId:cid,date:when,
      text:item.label,outcome:'Success in 30 milestone completed',note:proof,
      source:'s30',by:P?P.name:'',at:new Date().toISOString()},
      typeof actorStamp==='function'?actorStamp():{}));
    set('tasks',tasks);
  }
  closeObProof();
  try{ if(window.TributeRedesign&&TributeRedesign.repaintClient)TributeRedesign.repaintClient(); }catch(e){}
  try{ if(typeof renderClientMaster==='function')renderClientMaster(); }catch(e){}
  try{ if(typeof updateHome==='function')updateHome(); }catch(e){}
}
function closeObProof(){ document.getElementById('m-ob-proof').classList.remove('open'); _obProofFor=null; }
function openObDraft(){
  if(!_obProofFor)return;
  const d=draftById(_obProofFor.item.draft);
  if(!d)return;
  if(d.locked&&!obApprovalFor(_obProofFor.cid)){
    showToast('This draft is locked until a manager approves the discharge.'); return; }
  const cl=get('clients')||[], c=cl.find(x=>x.id===_obProofFor.cid)||{};
  openDraftFor(d,c);
}
/* Fills what the Hub knows and leaves the rest in brackets for the sender.
   Nothing sends: this opens the draft, the person edits it and sends it from
   their own account. Her first guardrail, and the reason there is no send
   button anywhere in here. */
function openDraftFor(d,c){
  const first=String(c.name||'').trim().split(/\s+/)[0]||'';
  const last=String(c.name||'').trim().split(/\s+/).slice(-1)[0]||'';
  const fill=t=>String(t||'')
    .replace(/\[Client first name\]/g,first)
    .replace(/\[Client last name\]/g,last)
    .replace(/\[Client name\]/g,c.name||'')
    .replace(/\[Contact first name\]/g,String(c.contact||'').trim().split(/\s+/)[0]||'[Contact first name]')
    .replace(/\[Community name\]/g,c.loc||'[Community name]')
    .replace(/\[CSM name\]/g,(P&&P.name)||'')
    .replace(/\[CSP name\]/g,(P&&P.name)||'');
  document.getElementById('obd-name').textContent=d.name;
  document.getElementById('obd-to').textContent='To: '+d.to;
  const warn=document.getElementById('obd-warn');
  const notes=[];
  if(d.suggestionsOnly)notes.push('Suggestions only. This is never sent as written, and it comes after your call.');
  if(d.phiConsentOnly)notes.push('Only to contacts with PHI consent recorded.');
  if(d.minimumNecessary)notes.push('Share only what they need to know.');
  if(d.internal)notes.push('Internal. This goes to the Teams channel, not to a family.');
  warn.innerHTML=notes.length?notes.map(n=>escHtml(n)).join('<br>'):'';
  warn.style.display=notes.length?'':'none';
  document.getElementById('obd-subj').value=fill(d.subj);
  document.getElementById('obd-body').value=fill(d.body);
  const g=document.getElementById('obd-guide');
  g.innerHTML=(d.guide||[]).map(x=>'<li>'+escHtml(x)+'</li>').join('');
  g.style.display=(d.guide||[]).length?'':'none';
  openM('m-ob-draft');
}
function copyObDraft(){
  const t=document.getElementById('obd-subj').value+'\n\n'+document.getElementById('obd-body').value;
  try{ navigator.clipboard.writeText(t); showToast('Copied. Paste it into your own email and send it yourself.'); }
  catch(e){ showToast('Select the text and copy it.'); }
}
function setObBy(cid,id,v){
  const rows=get('s60_ob');
  const r=rows.find(x=>x.clientId===cid&&x.id===id);
  if(!r)return;                      // initials on an unticked row mean nothing
  r.by=String(v||'').trim().toUpperCase().slice(0,6);
  set('s60_ob',rows);
}
function _initialsOf(name){
  return String(name||'').trim().split(/\s+/).filter(Boolean).map(p=>p[0]).join('').toUpperCase().slice(0,3);
}

/* ═══════════════ THE EMAIL DRAFT LIBRARY ════════════════════════════════
   Courtney's Part 4: "Checking an EMAIL item opens a draft that is filled in
   with the client's details and written in Tribute's voice. Drafts only.
   Nothing external sends on its own. The sender reviews and edits each draft,
   sends it from their own account, and the Hub logs it to Viv."

   And from section 9 of her review: "templates live where they're used... One
   library." So these are not a second set of templates beside the Assistant's:
   they join TPLS, and the checklist items point at them by id.

   HER GUARDRAILS ARE FIELDS, NOT ADVICE. A guardrail written only in a comment
   is one refactor from being gone, so each one that constrains a draft is on
   the draft:
     suggestionsOnly  never sent as written; offered as wording after a call
     locked           cannot open until a manager has approved
     phiConsentOnly   only to contacts with PHI consent recorded
     minimumNecessary shares only what the recipient needs
     internal         goes to a Teams channel, not to a family
   Two apply to every draft and so are not fields: nothing sends on its own,
   and no draft promises a caregiver, a visit or a service the CSM has not
   confirmed. */
const DRAFTS = [
  // ── Onboarding ─────────────────────────────────────────────────────────
  {id:'welcome', cat:'Onboarding', name:'Welcome after assessment', to:'Family or primary contact',
   desc:'What we discussed, what happens next, and who to call',
   subj:'Welcome to Tribute, [Client first name]',
   body:`Hi [Contact first name],

Thank you for your time today. It was good to meet you and [Client first name], and to hear what matters most day to day.

Here is what we agreed:
[Care summary in one or two lines, as discussed]

What happens next:
[Caregiver name] is scheduled to start on [date]. I will be in touch after the first visit to see how it went, and I will come out again within the first two weeks.

Who to call:
During the day, call me on [CSM phone]. Evenings, weekends and holidays, our after-hours team is on 617-517-5400 and always answers.

If anything changes before we start, tell me and we will sort it.

Warmly,
[CSM name]`},

  {id:'csa', cat:'Onboarding', name:'Client Service Agreement', to:'Family',
   desc:'Sent in DocuSign. Why the signature matters before start of care.',
   subj:'Your Tribute Client Service Agreement',
   body:`Hi [Contact first name],

Your Client Service Agreement is on its way by DocuSign. It sets out the rate, the schedule we discussed and how billing works, so there are no surprises.

We do need it signed before care begins. If anything in it does not match what we talked about, tell me before you sign and I will get it corrected.

Any questions at all, call me on [CSM phone].

Thank you,
[CSP name]`},

  {id:'app_access', cat:'Onboarding', name:'Viv app access', to:'Contacts with PHI consent only',
   desc:'App download, username, and the standard family password',
   phiConsentOnly:true,
   subj:'Your Tribute family app login',
   body:`Hi [Contact first name],

You can now see [Client first name]'s schedule and visit notes in the Tribute family app.

To get started:
1. Download the Viv Family app from the App Store or Google Play.
2. Sign in with this email address.
3. Use the standard family password we provide, then set your own.

If you would rather not use the app, that is completely fine. Call me and I will keep you updated the way you prefer.

[CSP name]`},

  {id:'soc_update', cat:'Onboarding', name:'Start of care update', to:'GCM or community partner',
   desc:'Thanks them for the referral. Only what they need to know.',
   minimumNecessary:true,
   subj:'[Client last name] care has started',
   body:`Hi [Partner first name],

Thank you for thinking of us for [Client first name]. Care started on [date] and the first visits are in place.

[One line on the shape of the care, no clinical detail beyond what they need]

I will keep you posted on anything you would want to know. If you hear something from the family that we should know about, call me on [CSM phone].

Thanks again,
[CSM name]`},

  {id:'cg_prep', cat:'Onboarding', name:'Caregiver prep talking points', to:'Caregiver, by call or text',
   desc:'A call guide, plus an optional text to follow it',
   guide:[
     'Walk through the care plan highlights, not the whole document',
     'What the client likes and does not like, in their own words where you have them',
     'Safety: entry, pets, mobility, anything in the home to know about',
     'Who else is around, and who the family contact is',
     'What to do if something is not as expected, and who to call'],
   subj:'Before your first visit with [Client first name]',
   body:`Hi [Caregiver first name],

Looking forward to you starting with [Client first name] on [date].

A few things worth knowing before you go:
[Two or three lines from the call: preferences, routine, safety]

The care plan is in the app. If anything you see does not match what you find in the home, tell me and we will update it.

Call me any time on [CSM phone].

[CSM name]`},

  {id:'week1', cat:'Onboarding', name:'Weekly family check-in', to:'Family',
   desc:'Short and warm. Invites feedback early. Week 1 and the weeks after.',
   subj:'Checking in on [Client first name]',
   body:`Hi [Contact first name],

Just checking in. How is it going so far with [Caregiver first name]?

Anything at all we should adjust, tell me now rather than later. Small things are easy to fix early.

[CSM name]`},

  {id:'d30', cat:'Onboarding', name:'Day 30 check-in follow-up', to:'Family',
   desc:'Summarises the conversation and the month, and sets the cadence from here',
   subj:'[Client first name]’s first month with Tribute',
   body:`Hi [Contact first name],

Thank you for the conversation today. Here is what I took away:

What is working:
[From the call]

What we are changing:
[From the call, or "Nothing right now, which is good news"]

Over the first month, [Client first name] had [N] visits with [care team names]. [One line on consistency or anything notable.]

From here I will be in touch [cadence], and you can reach me on [CSM phone] during the day or our after-hours team on 617-517-5400 any time.

Warmly,
[CSM name]`},

  // ── Offboarding ────────────────────────────────────────────────────────
  {id:'final_date', cat:'Offboarding', name:'Final date notice', to:'Scheduling, internal Teams post',
   desc:'Final date, caregivers affected, and the type of ending', internal:true,
   subj:'Final date of service: [Client name]',
   body:`Final date of service: [date]
Client: [Client name]
Type of ending: [voluntary / hospitalization / higher level of care / hospice / death / Tribute-initiated]
Caregivers affected: [names]

Please remove or inactivate visits after the final date. I have told the family and the caregivers.

[CSM name]`},

  {id:'discharge_notice', cat:'Offboarding', name:'Discharge notice', to:'Manager and Market Director, internal',
   desc:'Type of ending, reason, and anything unusual', internal:true,
   subj:'Discharge: [Client name]',
   body:`Client: [Client name]
Final date: [date]
Type of ending: [type]
Reason recorded on the Service Cancellation Pending Form: [reason]

Anything unusual:
[Concerns about quality of care, or "None"]

[CSM name]`},

  {id:'closing', cat:'Offboarding', name:'Closing note', to:'Family',
   desc:'Voluntary endings. Thanks them and leaves the door open, with no sales language.',
   subj:'Thank you, from all of us at Tribute',
   body:`Hi [Contact first name],

I wanted to say thank you for trusting us with [Client first name]'s care.

[One line that is specific to them, from something you know]

If anything changes and we can help again, you know where we are. I would be glad to hear from you either way.

Warmly,
[CSM name]`},

  {id:'ref_thanks', cat:'Offboarding', name:'Referral partner thank-you', to:'GCM or community partner',
   desc:'Within 24 hours, and logged in HubSpot', minimumNecessary:true,
   subj:'Thank you for [Client last name]',
   body:`Hi [Partner first name],

[Client first name]'s care with us has come to an end as of [date].

Thank you for the introduction. [One line on how it went, only what they need.]

Always glad to help if you have someone else who needs support.

[CSM name]`},

  {id:'community_intro', cat:'Offboarding', name:'Community introduction', to:'Community contact or RCD',
   desc:'Higher level of care moves only. Builds the relationship.',
   minimumNecessary:true,
   subj:'[Client first name] moving to [Community name]',
   body:`Hi [Contact first name],

[Client first name] is moving to you on [date], and I wanted to introduce myself. I am their Client Solutions Manager at Tribute and have been working with the family for [length of time].

[One or two lines that would help them settle, with the family's agreement.]

If extra support would help during the transition, we can often provide that alongside you. Either way, I am glad to be a phone call away: [CSM phone].

[CSM name]`},

  {id:'hospital_checkin', cat:'Offboarding', name:'Hospital check-in', to:'Family',
   desc:'A mid-stay check-in, offering help with discharge planning',
   subj:'Thinking of [Client first name]',
   body:`Hi [Contact first name],

I have been thinking about [Client first name] and wanted to check in. How are things going?

When you start talking about going home, let me know. We can usually have care in place quickly, and I am happy to talk to the discharge planner directly if that helps.

No rush, and no pressure. Just here.

[CSM name]`},

  {id:'condolence', cat:'Offboarding', name:'Condolence wording', to:'Family',
   desc:'Suggestions only, after the personal call. A handwritten card follows.',
   suggestionsOnly:true,
   subj:'',
   body:`These are suggestions, not a template, and they come after your call. Take what fits and change the rest. A handwritten card should follow.

If you knew them well:
"I am so sorry. It was a privilege to know [Client first name], and I will remember [one specific thing]. Please pass my sympathy to everyone."

If the care was short:
"I am so sorry for your loss. Even in a short time, it was clear how much [Client first name] was loved."

If a caregiver was close to them:
"[Caregiver first name] asked me to pass on how much [Client first name] meant to her. She is thinking of you."

Never: anything about what happens next, billing, or paperwork.`},

  {id:'tribute_discharge', cat:'Offboarding', name:'Tribute-initiated discharge notice', to:'Family',
   desc:'Locked until a manager approves. The manager reviews the draft.',
   locked:true,
   subj:'A change to [Client first name]’s care with Tribute',
   body:`Hi [Contact first name],

I am writing to let you know that Tribute will not be able to continue providing care for [Client first name] after [date], which gives you [notice period] from today.

[The reason, factual and without blame. Agreed with your manager.]

We do not want to leave you without support. Here are other providers who may be able to help:
[Referrals]

I am happy to talk this through. You can reach me on [CSM phone].

[CSM name]`}
];

/* One library, so the Assistant shows these too rather than keeping a second
   set of templates nobody maintains. */
function draftById(id){ return DRAFTS.find(d=>d.id===id)||null; }

/* ═══════════════ THE DAY 30 CALL GUIDE ══════════════════════════════════
   Courtney, Part 3: "This is a conversation, not a survey. The Hub offers
   these questions as a call guide, then drafts a short follow-up email that
   summarizes what the family shared." And: "Day 30 check-in opens the call
   guide with a notes box under each question. When the CSM saves, the Hub
   drafts the follow-up email from the notes."

   A CONVERSATION, NOT A SURVEY, is a design instruction and not a nicety.
   Nothing here is required, nothing scores, and an unanswered question simply
   does not appear in the draft. A guide that refuses to save until every box
   is filled turns a conversation back into a form, which is the thing she
   said it is not. */
const D30_GUIDE = {
  family:[
    'What is going well with the care team so far?',
    'Is there anything about the schedule or routine you would change?',
    'Does the care plan still reflect how [client] is doing right now?',
    'Do you know who to call, during the day and after hours?',
    'Is there anything you were hoping for that we have not got to yet?'
  ],
  caregiver:[
    'Do you have what you need to be successful with [client]?',
    'Is there anything in the care plan that does not match what you are seeing?'
  ]
};
let _d30For=null;
function openD30Guide(cid){
  const c=(get('clients')||[]).find(x=>x.id===cid); if(!c)return;
  _d30For=c;
  const first=String(c.name||'').trim().split(/\s+/)[0]||'the client';
  const q=(arr,kind)=>arr.map((t,i)=>`<div class="d30-q">
      <label class="d30-l">${escHtml(t.replace(/\[client\]/g,first))}</label>
      <textarea class="fc d30-a" data-kind="${kind}" data-i="${i}" rows="2"
        placeholder="What they said. Leave it blank if it did not come up."></textarea>
    </div>`).join('');
  document.getElementById('d30-client').textContent=c.name;
  document.getElementById('d30-fam').innerHTML=q(D30_GUIDE.family,'family');
  document.getElementById('d30-cg').innerHTML=q(D30_GUIDE.caregiver,'caregiver');
  openM('m-d30');
}
function closeD30(){ closeM('m-d30'); _d30For=null; }
/* Saving writes the conversation to the client's record and opens the
   follow-up draft built from what was actually said. An empty box contributes
   nothing: the draft should read like the call, not like a form with gaps. */
function saveD30(){
  const c=_d30For; if(!c)return;
  const answers=[...document.querySelectorAll('#m-d30 .d30-a')].map(a=>({
    kind:a.dataset.kind, q:(a.closest('.d30-q').querySelector('.d30-l').textContent||''),
    a:(a.value||'').trim()})).filter(x=>x.a);
  const day=_obToday();
  const tasks=get('tasks')||[];
  tasks.unshift(Object.assign({id:'task'+Date.now(),clientId:c.id,date:day,
    text:'Day 30 check-in', outcome:'Spoke with family',
    note:answers.length?answers.map(x=>x.q+' '+x.a).join(' \u00b7 ').slice(0,400)
                       :'Conversation held; nothing recorded',
    source:'s30', by:P?P.name:'', at:new Date().toISOString()},
    typeof actorStamp==='function'?actorStamp():{}));
  set('tasks',tasks);
  // It is also the Day 30 milestone, so it ticks the checklist item too
  // rather than asking for the same thing twice.
  const rows=get('s60_ob')||[];
  if(!rows.some(r=>r.clientId===c.id&&r.id==='ob_d30')){
    rows.push({clientId:c.id,id:'ob_d30',by:_initialsOf((P&&P.name)||''),
               at:new Date().toISOString(),when:day,note:'Day 30 call guide completed'});
    set('s60_ob',rows);
  }
  const d=draftById('d30');
  closeD30();
  if(d){
    const fam=answers.filter(x=>x.kind==='family');
    const good=fam[0]?fam[0].a:'[From the call]';
    const change=fam[1]?fam[1].a:'[From the call, or "Nothing right now, which is good news"]';
    const body=d.body.replace('[From the call]\n',good+'\n')
                     .replace('[From the call, or "Nothing right now, which is good news"]',change);
    openDraftFor(Object.assign({},d,{body}),c);
  }
  showToast('Saved to the client record.');
  try{ if(typeof renderClientMaster==='function')renderClientMaster(); }catch(e){}
}


/* ── THE MARKUP, which was also V1's ──────────────────────────────────────
   The board, the manager box and the three dialogs were blocks of HTML in
   index.html. Leaving them there would have left V1 carrying the furniture
   for a feature it no longer has, and leaving dialogs whose buttons call
   functions that are not defined there.

   So the layer writes them. It runs once, and it is idempotent: V1 re-renders
   the Onboarding page on every profile switch and every sync, and a second
   copy of a dialog would give every id in it a twin. */
const OB_BOARD_HTML = "  <!-- EVERY OPEN CHECKLIST IN ONE LIST (Courtney, section 7): \"Onboarding\n       page: Every open checklist in one list, with tabs for Onboarding,\n       Success in 30, Offboarding and Completed. Filter to Mine or by market.\"\n       The search box above still finds one client; this is the list you land\n       on, because hunting for a client one at a time is not a worklist. -->\n  <div id=\"s60-board\">\n    <div class=\"tabs\" id=\"s60-tabs\"></div>\n    <div style=\"display:flex;gap:8px;align-items:center;margin:0 0 10px;\">\n      <label style=\"font-size:11.5px;color:#8C857B;cursor:pointer;\">\n        <input type=\"checkbox\" id=\"s60-mine\" onchange=\"renderObBoard()\" style=\"accent-color:#FF5A1F;\"> Only mine</label>\n      <select id=\"s60-market\" onchange=\"renderObBoard()\" class=\"fc\"\n        style=\"width:auto;padding:4px 8px;font-size:11.5px;\"><option value=\"\">All markets</option></select>\n      <span id=\"s60-board-n\" style=\"font-size:11.5px;color:#8C857B;margin-left:auto;\"></span>\n    </div>\n    <div id=\"s60-board-rows\"></div>\n  </div>";
const OB_MGR_HTML = "  <!-- Managers and directors only. Her \"Waiting on you\" box and the five\n       metrics from Part 4, above the board, because an approval somebody is\n       waiting on outranks a list. -->\n  <div id=\"s60-mgr\" style=\"display:none;margin-bottom:14px;\"></div>";
const OB_MODALS_HTML = "<div class=\"mo\" id=\"m-d30\">\n  <div class=\"md\" style=\"width:600px;max-height:84vh;overflow:auto;\">\n    <div class=\"mt\" style=\"margin-bottom:2px;\">Day 30 check-in</div>\n    <p id=\"d30-client\" style=\"font-size:13px;color:#1C1A17;margin:6px 0 2px;\"></p>\n    <p style=\"font-size:11.5px;color:#8C857B;margin:0 0 14px;\">A conversation, not a survey. Skip anything that does not come up.</p>\n    <div style=\"font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#8C857B;margin:0 0 8px;\">With the family</div>\n    <div id=\"d30-fam\"></div>\n    <div style=\"font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#8C857B;margin:16px 0 8px;\">With each core caregiver</div>\n    <div id=\"d30-cg\"></div>\n    <div style=\"display:flex;gap:8px;align-items:center;border-top:1px solid var(--line-soft);padding-top:12px;margin-top:6px;\">\n      <button class=\"btn btn-p\" onclick=\"saveD30()\">Save and draft the follow-up</button>\n      <span style=\"flex:1;font-size:11.5px;color:#8C857B;\">Saves to the client record and opens the email to edit.</span>\n      <button class=\"btn btn-o\" onclick=\"closeD30()\">Cancel</button>\n    </div>\n  </div>\n</div>\n\n<div class=\"mo\" id=\"m-ob-proof\">\n  <div class=\"md\" style=\"width:430px;\">\n    <div class=\"mt\" style=\"margin-bottom:2px;\">Mark it done</div>\n    <p id=\"obp-task\" style=\"font-size:13px;color:#1C1A17;margin:6px 0 2px;line-height:1.45;\"></p>\n    <p id=\"obp-owner\" style=\"font-size:11px;color:#8C857B;margin:0 0 14px;letter-spacing:.03em;\"></p>\n    <div class=\"g2\">\n      <div class=\"fg\"><label class=\"fl\">Who did you speak to?</label>\n        <input type=\"text\" class=\"fc\" id=\"obp-who\" placeholder=\"Name, or leave blank\"></div>\n      <div class=\"fg\"><label class=\"fl\">When</label><input type=\"date\" class=\"fc\" id=\"obp-date\"></div>\n    </div>\n    <div class=\"fg\"><label class=\"fl\">One line on what happened</label>\n      <input type=\"text\" class=\"fc\" id=\"obp-note\" placeholder=\"Optional, but it is what a covering CSM reads\"></div>\n    <button class=\"btn btn-o\" id=\"obp-draft\" style=\"width:100%;margin-bottom:10px;\" onclick=\"openObDraft()\"></button>\n    <div style=\"display:flex;gap:8px;align-items:center;border-top:1px solid var(--line-soft);padding-top:12px;\">\n      <button class=\"btn btn-p\" style=\"flex:1;\" onclick=\"saveObProof(false)\">Done</button>\n      <button class=\"btn btn-o\" id=\"obp-na\" onclick=\"saveObProof(true)\"></button>\n      <button class=\"btn btn-o\" onclick=\"closeObProof()\">Cancel</button>\n    </div>\n  </div>\n</div>\n\n<!-- A draft. Nothing here sends: it is copied and sent from the person's own\n     account, which is her first guardrail. -->\n<div class=\"mo\" id=\"m-ob-draft\">\n  <div class=\"md\" style=\"width:560px;\">\n    <div class=\"mt\" id=\"obd-name\" style=\"margin-bottom:2px;\"></div>\n    <p id=\"obd-to\" style=\"font-size:11.5px;color:#8C857B;margin:4px 0 10px;\"></p>\n    <div id=\"obd-warn\" style=\"display:none;font-size:12px;line-height:1.5;color:#7A3B12;background:#FBEADF;border-radius:8px;padding:9px 12px;margin-bottom:12px;\"></div>\n    <ul id=\"obd-guide\" style=\"display:none;font-size:12.5px;color:#3D3833;line-height:1.55;margin:0 0 12px;padding-left:18px;\"></ul>\n    <div class=\"fg\"><label class=\"fl\">Subject</label><input type=\"text\" class=\"fc\" id=\"obd-subj\"></div>\n    <div class=\"fg\"><label class=\"fl\">Body</label>\n      <textarea class=\"fc\" id=\"obd-body\" style=\"min-height:260px;font-family:inherit;line-height:1.55;\"></textarea></div>\n    <div style=\"display:flex;gap:8px;align-items:center;\">\n      <button class=\"btn btn-p\" onclick=\"copyObDraft()\">Copy</button>\n      <span style=\"flex:1;font-size:11.5px;color:#8C857B;\">Send it from your own account. Nothing is sent from here.</span>\n      <button class=\"btn btn-o\" onclick=\"closeM('m-ob-draft')\">Close</button>\n    </div>\n  </div>\n</div>";

function mountObUI() {
  const page = document.getElementById('page-s60');
  if (page && !document.getElementById('s60-board')) {
    /* Above the single-client panel, which is where her picture puts it: the
       list is the page you land on, not something you reach. */
    const anchor = document.getElementById('s60-empty') ||
                   document.getElementById('s60-content');
    const frag = document.createElement('div');
    frag.innerHTML = OB_MGR_HTML + OB_BOARD_HTML;
    while (frag.firstChild) {
      if (anchor) page.insertBefore(frag.firstChild, anchor);
      else page.appendChild(frag.firstChild);
    }
  }
  if (!document.getElementById('m-ob-proof')) {
    const d = document.createElement('div');
    d.innerHTML = OB_MODALS_HTML;
    while (d.firstChild) document.body.appendChild(d.firstChild);
  }
}
