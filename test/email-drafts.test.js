// The email draft library, and the guardrails on it.
//
// Courtney, Part 4 of "CSM Hub_Onboarding Offboarding and Success in 30":
// "Checking an EMAIL item opens a draft that is filled in with the client's
// details and written in Tribute's voice. Drafts only. Nothing external sends
// on its own. The sender reviews and edits each draft, sends it from their own
// account, and the Hub logs it to Viv."
//
// Her guardrails are the reason this file exists. A guardrail written only in
// a comment is one refactor away from being gone, so each one that constrains
// a draft is a field on the draft and is asserted here.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

/* SOURCE: the V2 layer, not index.html.
 *
 * This feature moved out of index.html on 23 November. index.html is V1 and
 * V2 is built from it, so a V2 design living there meant changing the hub the
 * team uses today every time Courtney's review moved. The prototype file is
 * the source and v2/ is generated, so both are read and asserted identical:
 * editing the generated copy alone is reverted by the next build with nothing
 * to show for it.
 */
const V1 = fs.readFileSync(path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype/v2-onboarding.js'), 'utf8');
const V2 = fs.readFileSync(path.join(__dirname, '../v2/v2-onboarding.js'), 'utf8');
const PAGE = fs.readFileSync(path.join(__dirname, '../v2/index.html'), 'utf8');
const CODE = V1.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
ok('the shipped copy and the build source agree', V1 === V2);
ok('...and index.html no longer carries the feature',
   !/const DRAFTS = \[/.test(fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8')));

function lift(decl) {
  const i = CODE.indexOf(decl);
  if (i < 0) return null;
  let d = 0, started = false;
  for (let j = i; j < CODE.length; j++) {
    const ch = CODE[j];
    if (ch === '{' || ch === '[') { d++; started = true; }
    else if (ch === '}' || ch === ']') { d--; if (started && d === 0) return CODE.slice(i, j + 1); }
  }
  return null;
}
const DRAFTS = eval(lift('const DRAFTS =').replace(/^const DRAFTS =/, ''));
const by = id => DRAFTS.find(d => d.id === id);

// ── her library, draft for draft ──────────────────────────────────────────
const WANT = ['welcome', 'csa', 'app_access', 'soc_update', 'cg_prep', 'week1', 'd30',
              'final_date', 'discharge_notice', 'closing', 'ref_thanks', 'community_intro',
              'hospital_checkin', 'condolence', 'tribute_discharge'];
ok('all fifteen drafts from her library are here',
   WANT.every(id => !!by(id)) && DRAFTS.length === WANT.length);
ok('each says who it goes to', DRAFTS.every(d => d.to));
ok('each carries a body', DRAFTS.every(d => d.body && d.body.length > 80));
ok('they are filed as Onboarding or Offboarding',
   DRAFTS.every(d => d.cat === 'Onboarding' || d.cat === 'Offboarding'));

// Every checklist item that says EMAIL must point at a draft that exists, or
// ticking it opens nothing and the row is a lie.
const OB = eval(lift('const OB_CHECKLIST =').replace(/^const OB_CHECKLIST =/, ''));
const OFF = eval(lift('const OFF_CHECKLIST =').replace(/^const OFF_CHECKLIST =/, ''));
const OFFT = eval(lift('const OFF_TYPES =').replace(/^const OFF_TYPES =/, ''));
const emailItems = OB.flatMap(g => g.items).concat(OFF).filter(i => /EMAIL/.test(i.hub || ''));
ok('every EMAIL item on a checklist points at a draft',
   emailItems.length > 0 && emailItems.every(i => i.draft && !!by(i.draft)));
ok('every draft named by an ending type exists',
   OFFT.filter(t => t.draft).every(t => !!by(t.draft)));

// ── the guardrails ────────────────────────────────────────────────────────
/* "Condolence wording is offered as suggestions only, never a template
   email." It is the one draft that must never be sent as written. */
ok('the condolence wording is suggestions only', by('condolence').suggestionsOnly === true);
ok('...and says so in the text itself',
   /These are suggestions, not a template/.test(by('condolence').body));
ok('...and carries no subject line, because it is not an email to send',
   by('condolence').subj === '');
ok('...and tells the sender what never to put in it', /Never:/.test(by('condolence').body));

/* "Approval gate. Tribute-initiated discharges stay locked until a manager
   approves." */
ok('the Tribute-initiated discharge notice is locked', by('tribute_discharge').locked === true);
ok('...and offers the family other providers', /other providers/.test(by('tribute_discharge').body));
ok('...and states the notice period', /notice period/.test(by('tribute_discharge').body));

/* "Minimum necessary. Emails to referral partners share only what they need,
   and only contacts with PHI consent get app access." */
ok('app access is for PHI-consented contacts only', by('app_access').phiConsentOnly === true);
ok('the referral partner drafts share only what they need',
   by('soc_update').minimumNecessary === true && by('ref_thanks').minimumNecessary === true &&
   by('community_intro').minimumNecessary === true);
ok('the internal posts are marked internal, so they are not sent to a family',
   by('final_date').internal === true && by('discharge_notice').internal === true);

/* The standing family password is in her document and must not be in this
   repository, which is public. */
ok('no standing password reaches the library',
   !/Tribute\d{4}!/.test(V1) && !/Tribute\d{4}!/.test(V2) && !/Tribute\d{4}!/.test(PAGE));
ok('the app access draft says to use it without repeating it',
   /standard family password/.test(by('app_access').body));

/* "Drafts only. No external email sends without a person reviewing it." There
   is no send path at all: the draft is copied and sent from the person's own
   account. */
ok('nothing in the draft flow sends', !/sendMail|sendDraft|graphSend/.test(lift('function openDraftFor(')));
ok('the dialog says so in words', /Send it from your own account\. Nothing is sent from here\./.test(V1));
/* The lock is a GATE, not a notice. Her rule: "Checklist stays locked until
   manager approval is recorded. The family notice draft is reviewed by the
   manager before sending." So it reads an approval record, and only a manager
   or director can write one. Unconditional, it was decoration. */
ok('a locked draft refuses to open until an approval is recorded',
   /if\(d\.locked&&!obApprovalFor\(_obProofFor\.cid\)\)\{\n?\s*showToast\('This draft is locked until a manager approves/.test(CODE));
ok('...and opens once one is', /else if\(d&&d\.locked\)\{ db\.style\.display=''; db\.disabled=false;/.test(CODE));
ok('only a manager or director can record the approval',
   /if\(!\(P&&\(P\.isManager\|\|P\.isDirector\)\)\)\{ showToast\('Only a manager or director can approve a discharge\.'\)/.test(CODE));
ok('the approval is recorded with who and when',
   /DATA\.shared\.dischargeApprovals\[cid\]=\{by:P\.name,at:new Date\(\)\.toISOString\(\)\};/.test(CODE));
ok('...and is shared, so the CSM\'s Hub sees it too',
   /DATA\.shared\.dischargeApprovals=DATA\.shared\.dischargeApprovals\|\|\{\};/.test(CODE));

// ── what the Hub fills in ─────────────────────────────────────────────────
ok('the client\'s own details are filled in', /\.replace\(\/\\\[Client first name\\\]\/g,first\)/.test(CODE));
// Everything the Hub cannot know stays in brackets, so the sender can see at
// a glance what still needs them.
ok('what it cannot know stays visible as a blank to fill',
   DRAFTS.every(d => !/\[CSM phone\]/.test(d.body) || /\[CSM phone\]/.test(d.body)));
ok('a missing family contact leaves the placeholder rather than an empty space',
   /\|\|'\[Contact first name\]'/.test(CODE));

// ── the voice ─────────────────────────────────────────────────────────────
// House style: no em dashes anywhere in anything a family reads.
ok('no em dashes in any draft', DRAFTS.every(d => !/—/.test(d.body + d.subj)));
ok('the after-hours number is the real one',
   DRAFTS.filter(d => /after.hours/i.test(d.body)).every(d => /617-517-5400/.test(d.body)));
ok('the caregiver prep draft carries her call guide, not just an email',
   (by('cg_prep').guide || []).length >= 4);

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
