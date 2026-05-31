// render.js — generates module HTML from patient data.
// Exposes window.render (module functions) and window.renderBanner.
// Loaded before app.js.

(function (window) {
  'use strict';

  // ── Helpers ────────────────────────────────────────────────────────────────

  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function fmtDate(iso) {
    if (!iso) return '—';
    var p = iso.split('-');
    return p[2] + '-' + MONTHS[parseInt(p[1], 10) - 1] + '-' + p[0];
  }

  function calcAge(dob) {
    var now = new Date(), b = new Date(dob + 'T00:00:00');
    var age = now.getFullYear() - b.getFullYear();
    if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
    return age;
  }

  function maskPhone(phone) {
    if (!phone) return '—';
    return phone.slice(0, -6) + '••• •' + phone.slice(-2);
  }

  function statusTag(status, labelOverride) {
    var map = {
      'active':     ['tag--yellow', 'Active'],
      'monitored':  ['tag--green',  'Monitored'],
      'resolved':   ['tag--grey',   'Resolved'],
      'signed':     ['tag--green',  'Signed'],
      'draft':      ['tag--yellow', 'Draft'],
      'up-to-date': ['tag--green',  'Up to date'],
      'due':        ['tag--yellow', 'Due'],
      'overdue':    ['tag--red',    'Overdue'],
      'pending':    ['tag--yellow', 'Pending'],
      'completed':  ['tag--green',  'Completed'],
    };
    var t = map[status] || ['tag--grey', status];
    return `<span class="tag ${t[0]}">${labelOverride || t[1]}</span>`;
  }

  function noData(label) {
    return `<p style="padding:10px 0;color:var(--text-muted)">No ${label} recorded.</p>`;
  }

  // ── Banner ─────────────────────────────────────────────────────────────────

  function renderBanner(p) {
    // Summary row fields
    var name  = document.querySelector('[data-field="pb-name"]');
    var title = document.querySelector('[data-field="pb-title"]');
    var dob   = document.querySelector('[data-field="pb-dob"]');
    var age   = document.querySelector('[data-field="pb-age"]');
    var mrn   = document.querySelector('[data-field="pb-mrn"]');
    var sex   = document.querySelector('[data-field="pb-sex"]');
    var flags = document.querySelector('[data-field="pb-flags"]');
    var grid  = document.querySelector('[data-field="pb-details-grid"]');

    if (name)  name.textContent  = p.surname + ', ' + p.forename;
    if (title) title.textContent = p.title ? '(' + p.title + ')' : '';
    if (dob)   dob.textContent   = fmtDate(p.dob);
    if (age)   age.textContent   = '(' + calcAge(p.dob) + ' yrs)';
    if (mrn)   mrn.textContent   = p.mrn;
    if (sex)   sex.textContent   = p.sex === 'F' ? 'Female' : 'Male';

    if (flags) {
      flags.innerHTML = (p.flags || []).map(function (f) {
        var cls = f.type === 'alert' ? 'pb-flag--alert' : 'pb-flag--info';
        var icon = f.type === 'alert' ? '⚠' : '●';
        return `<span class="pb-flag ${cls}" title="${f.title}">${icon} ${f.label}</span>`;
      }).join('');
    }

    if (grid) {
      var c = p.contact || {};
      var d = p.demographics || {};
      var alerts = p.clinicalAlerts || [];
      grid.innerHTML = `
        <div class="pb-detail-block">
          <h3 class="pb-detail-heading">Contact</h3>
          <dl class="pb-stacked">
            <div><dt>Phone</dt><dd>${c.phone || '—'}</dd></div>
            ${c.altPhone ? `<div><dt>Alt. phone</dt><dd>${c.altPhone}</dd></div>` : ''}
            <div><dt>Address</dt><dd>${(c.address || '—').replace(/,\s*/g, '<br>')}</dd></div>
            ${c.nextOfKin ? `<div><dt>Next of kin</dt><dd>${c.nextOfKin}</dd></div>` : ''}
          </dl>
        </div>
        <div class="pb-detail-block">
          <h3 class="pb-detail-heading">Demographics</h3>
          <dl class="pb-stacked">
            ${d.bloodGroup    ? `<div><dt>Blood group</dt><dd>${d.bloodGroup}</dd></div>` : ''}
            ${d.maritalStatus ? `<div><dt>Marital status</dt><dd>${d.maritalStatus}</dd></div>` : ''}
            ${d.occupation    ? `<div><dt>Occupation</dt><dd>${d.occupation}</dd></div>` : ''}
            ${d.languages     ? `<div><dt>Preferred language</dt><dd>${d.languages}</dd></div>` : ''}
          </dl>
        </div>
        <div class="pb-detail-block">
          <h3 class="pb-detail-heading">Clinical alerts</h3>
          ${alerts.length
            ? `<ul class="pb-alerts">${alerts.map(a => `<li>${a}</li>`).join('')}</ul>`
            : '<p style="color:var(--text-muted);font-size:16px">No alerts recorded.</p>'}
        </div>`;
    }

    // Show banner and submenu
    var banner  = document.getElementById('patientBanner');
    var submenu = document.getElementById('patientSubmenu');
    if (banner)  banner.removeAttribute('hidden');
    if (submenu) submenu.removeAttribute('hidden');
  }

  // ── Find Patient results ───────────────────────────────────────────────────

  function renderFindResults(patients, currentMrn) {
    if (!patients.length) {
      return `<tr><td colspan="7" style="padding:20px;color:var(--text-muted);text-align:center">No patients found.</td></tr>`;
    }
    return patients.map(function (p) {
      var hl = p.mrn === currentMrn ? ' find-results__row--highlight' : '';
      return `<tr class="find-results__row${hl}">
        <th scope="row"><strong>${p.surname}, ${p.forename}</strong>${p.title ? ` <span class="muted">(${p.title})</span>` : ''}</th>
        <td class="mono">${p.mrn}</td>
        <td class="mono">${fmtDate(p.dob)}</td>
        <td>${p.sex}</td>
        <td class="mono">${maskPhone(p.phone)}</td>
        <td>${fmtDate(p.lastSeen)}</td>
        <td><a href="#" class="row-action" data-action="open-patient" data-mrn="${p.mrn}">Open record</a></td>
      </tr>`;
    }).join('');
  }

  // ── Module render functions ────────────────────────────────────────────────

  var render = {};

  // Summary
  render.summary = function (p) {
    var probs = p.problems || [];
    var meds  = (p.medications && p.medications.current) || [];
    var v     = p.vitals;
    var enc   = p.encounters || [];
    var allg  = p.allergies || [];

    return `
<div class="page-heading">
  <div><span class="caption">Patient record</span><h2>Summary</h2></div>
  <div class="actions">
    <button class="button secondary" type="button">Print summary</button>
    <button class="button" type="button">Start new encounter</button>
  </div>
</div>
<div class="columns">
  <div class="col-main">

    <section>
      <h3 class="section-heading">Active problems</h3>
      ${probs.length ? `<dl class="summary-list">
        ${probs.map(prob => `<div class="sl-row">
          <dt>${prob.name}</dt>
          <dd>${prob.code ? prob.code + ' · ' : ''}${prob.detail}<br>${statusTag(prob.status)}</dd>
          <dd class="sl-actions"><a href="#">Change</a></dd>
        </div>`).join('')}
      </dl>` : noData('problems')}
    </section>

    <section>
      <h3 class="section-heading">Current medication</h3>
      ${meds.length ? `<dl class="summary-list">
        ${meds.map(m => `<div class="sl-row">
          <dt>${m.name}</dt>
          <dd>${m.dose}. Since ${fmtDate(m.since)}.</dd>
          <dd class="sl-actions"><a href="#">Change</a></dd>
        </div>`).join('')}
      </dl>` : noData('medications')}
    </section>

    ${v ? `<section>
      <h3 class="section-heading">Latest vitals</h3>
      <p style="margin:0 0 10px;color:var(--text-muted)">Recorded ${fmtDate(v.date)} by ${v.recordedBy}.</p>
      <table class="data-table">
        <caption>Latest vitals</caption>
        <thead><tr><th scope="col">Measurement</th><th scope="col" class="numeric">Value</th><th scope="col" class="numeric">Reference</th></tr></thead>
        <tbody>
          ${v.measurements.map(m => `<tr>
            <th scope="row">${m.name}</th>
            <td class="numeric">${m.flag ? `<span class="value-flag">${m.value}</span>` : m.value}</td>
            <td class="numeric">${m.reference}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      ${v.note ? `<div class="inset-text">${v.note}</div>` : ''}
    </section>` : ''}

  </div>
  <aside class="col-side" aria-label="Related">

    <section>
      <h3 class="section-heading">Recent encounters</h3>
      ${enc.length ? `<ul class="related-nav">
        ${enc.slice(0, 4).map(e => `<li>
          <a href="#/encounters">${e.type}</a>
          <span class="meta">${fmtDate(e.date)} · ${e.clinician}</span>
        </li>`).join('')}
      </ul>` : noData('encounters')}
    </section>

    <section style="margin-top:30px">
      <h3 class="section-heading">Allergies and intolerances</h3>
      <ul class="related-nav">
        ${allg.length
          ? allg.map(a => `<li><strong>${a.substance}</strong><span class="meta">${a.severity} · confirmed ${a.confirmed}</span></li>`).join('')
          : '<li style="color:var(--text-muted)">No allergies recorded.</li>'}
      </ul>
    </section>

  </aside>
</div>`;
  };

  // Encounters
  render.encounters = function (p) {
    var enc = p.encounters || [];
    return `
<div class="page-heading">
  <div><span class="caption">Patient record</span><h2>Encounters</h2></div>
  <div class="actions"><button class="button" type="button">Start new encounter</button></div>
</div>
${enc.length ? `<section>
  <h3 class="section-heading">All encounters</h3>
  <table class="data-table">
    <caption>All encounters</caption>
    <thead><tr>
      <th scope="col">Date</th><th scope="col">Type</th><th scope="col">Clinician</th>
      <th scope="col">Notes</th><th scope="col">Status</th><th scope="col" aria-label="Actions"></th>
    </tr></thead>
    <tbody>
      ${enc.map(e => `<tr>
        <td>${fmtDate(e.date)}</td>
        <td>${e.type}</td>
        <td>${e.clinician}</td>
        <td>${e.notes}</td>
        <td>${statusTag(e.status)}</td>
        <td><a href="#" style="color:var(--blue);text-decoration:underline">View</a></td>
      </tr>`).join('')}
    </tbody>
  </table>
</section>` : `<section><h3 class="section-heading">All encounters</h3>${noData('encounters')}</section>`}`;
  };

  // Prescribing
  render.prescribing = function (p) {
    var cur  = (p.medications && p.medications.current)  || [];
    var stop = (p.medications && p.medications.stopped)  || [];
    var allg = p.allergies || [];
    var caut = p.prescribingCautions || [];

    return `
<div class="page-heading">
  <div><span class="caption">Patient record</span><h2>Prescribing</h2></div>
  <div class="actions"><button class="button" type="button">Add medication</button></div>
</div>
<div class="columns">
  <div class="col-main">
    <section>
      <h3 class="section-heading">Current medications</h3>
      ${cur.length ? `<dl class="summary-list">
        ${cur.map(m => `<div class="sl-row">
          <dt>${m.name}</dt>
          <dd>${m.dose}<br>Started ${fmtDate(m.since)} · ${m.prescribedBy}
            ${m.indication ? `<br>${m.indication}` : ''}
            <br>${statusTag('active', 'Active')}</dd>
          <dd class="sl-actions"><a href="#">Change</a><br><a href="#" style="color:var(--red)">Stop</a></dd>
        </div>`).join('')}
      </dl>` : noData('current medications')}
    </section>
    <section>
      <h3 class="section-heading">Stopped medications</h3>
      ${stop.length ? `<dl class="summary-list">
        ${stop.map(m => `<div class="sl-row">
          <dt>${m.name}</dt>
          <dd>Stopped ${fmtDate(m.stoppedDate)} by ${m.stoppedBy}<br>Reason: ${m.reason}<br>${statusTag('resolved', 'Stopped')}</dd>
          <dd class="sl-actions"><a href="#">Restart</a></dd>
        </div>`).join('')}
      </dl>` : noData('stopped medications')}
    </section>
  </div>
  <aside class="col-side">
    ${allg.length ? `<section>
      <h3 class="section-heading">Allergy alert</h3>
      <div class="inset-text" style="border-left-color:var(--red)">
        ${allg.map(a => `<strong style="color:var(--red)">${a.substance} — ${a.severity.toUpperCase()}</strong><br>${a.reaction}. Confirmed ${a.confirmed}.`).join('<br><br>')}
      </div>
    </section>` : ''}
    ${caut.length ? `<section style="margin-top:30px">
      <h3 class="section-heading">Prescribing cautions</h3>
      <ul class="related-nav">
        ${caut.map(c => `<li><strong>${c.label}</strong><span class="meta">${c.detail}</span></li>`).join('')}
      </ul>
    </section>` : ''}
  </aside>
</div>`;
  };

  // Labs
  render.labs = function (p) {
    var pend = (p.labs && p.labs.pending)  || [];
    var hist = (p.labs && p.labs.history)  || [];

    return `
<div class="page-heading">
  <div><span class="caption">Patient record</span><h2>Labs</h2></div>
  <div class="actions">
    <button class="button secondary" type="button">Print results</button>
    <button class="button" type="button">Request test</button>
  </div>
</div>
${pend.length ? `<section>
  <h3 class="section-heading">Results awaiting review</h3>
  <div class="inset-text" style="border-left-color:var(--red)">
    <strong>${pend.length} result${pend.length > 1 ? 's' : ''} need${pend.length === 1 ? 's' : ''} your attention.</strong>
  </div>
  <dl class="summary-list">
    ${pend.map(r => `<div class="sl-row">
      <dt>${r.name}</dt>
      <dd>${r.result}<br>Ordered ${fmtDate(r.orderedDate)} · Result ${fmtDate(r.resultDate)}<br>${statusTag('overdue', 'Review required')}</dd>
      <dd class="sl-actions"><a href="#">Review</a></dd>
    </div>`).join('')}
  </dl>
</section>` : ''}
<section>
  <h3 class="section-heading">Previous results</h3>
  ${hist.length ? `<table class="data-table">
    <caption>Previous results</caption>
    <thead><tr>
      <th scope="col">Test</th><th scope="col">Result</th><th scope="col">Reference</th>
      <th scope="col">Date</th><th scope="col">Ordered by</th><th scope="col" aria-label="Actions"></th>
    </tr></thead>
    <tbody>
      ${hist.map(r => `<tr>
        <th scope="row">${r.name}</th>
        <td>${r.result}</td>
        <td>${r.reference}</td>
        <td>${fmtDate(r.date)}</td>
        <td>${r.orderedBy}</td>
        <td><a href="#" style="color:var(--blue);text-decoration:underline">View</a></td>
      </tr>`).join('')}
    </tbody>
  </table>` : noData('previous lab results')}
</section>`;
  };

  // Vaccinations
  render.vaccinations = function (p) {
    var sched = (p.vaccinations && p.vaccinations.schedule) || [];
    var hist  = (p.vaccinations && p.vaccinations.history)  || [];
    var preg  = (p.flags || []).some(f => f.label === 'Pregnant');

    return `
<div class="page-heading">
  <div><span class="caption">Patient record</span><h2>Vaccinations</h2></div>
  <div class="actions"><button class="button" type="button">Record vaccination</button></div>
</div>
${preg ? `<div class="inset-text">Patient is currently pregnant. Review antenatal vaccination schedule.</div>` : ''}
${sched.length ? `<section>
  <h3 class="section-heading">Vaccination status</h3>
  <dl class="summary-list">
    ${sched.map(s => `<div class="sl-row">
      <dt>${s.name}</dt>
      <dd>${s.doseInfo}${s.clinician ? `<br>${s.clinician}` : ''}<br>${statusTag(s.status)}</dd>
      <dd class="sl-actions"><a href="#">${s.status === 'due' ? 'Record' : 'History'}</a></dd>
    </div>`).join('')}
  </dl>
</section>` : ''}
<section>
  <h3 class="section-heading">Vaccination history</h3>
  ${hist.length ? `<table class="data-table">
    <caption>Vaccination history</caption>
    <thead><tr>
      <th scope="col">Vaccine</th><th scope="col">Dose</th><th scope="col">Date given</th>
      <th scope="col">Batch</th><th scope="col">Recorded by</th>
    </tr></thead>
    <tbody>
      ${hist.map(h => `<tr>
        <th scope="row">${h.vaccine}</th>
        <td>${h.dose}</td>
        <td>${fmtDate(h.date)}</td>
        <td class="mono" style="font-size:14px">${h.batch}</td>
        <td>${h.by}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : noData('vaccination history')}
</section>`;
  };

  // Documents
  render.documents = function (p) {
    var docs = p.documents || [];
    return `
<div class="page-heading">
  <div><span class="caption">Patient record</span><h2>Documents</h2></div>
  <div class="actions"><button class="button" type="button">Upload document</button></div>
</div>
<section>
  <h3 class="section-heading">All documents</h3>
  ${docs.length ? `<table class="data-table">
    <caption>All documents</caption>
    <thead><tr>
      <th scope="col">Document</th><th scope="col">Type</th><th scope="col">Date</th>
      <th scope="col">Added by</th><th scope="col" aria-label="Actions"></th>
    </tr></thead>
    <tbody>
      ${docs.map(d => `<tr>
        <th scope="row"><a href="#" style="color:var(--blue);text-decoration:underline">${d.name}</a></th>
        <td>${d.type}</td>
        <td>${fmtDate(d.date)}</td>
        <td>${d.addedBy}</td>
        <td><a href="#" style="color:var(--blue);text-decoration:underline">View</a></td>
      </tr>`).join('')}
    </tbody>
  </table>` : noData('documents')}
</section>`;
  };

  // Comms
  render.comms = function (p) {
    var refs  = (p.comms && p.comms.referrals) || [];
    var msgs  = (p.comms && p.comms.messages)  || [];
    var ctcts = (p.comms && p.comms.contacts)  || [];
    var c     = p.contact || {};

    return `
<div class="page-heading">
  <div><span class="caption">Patient record</span><h2>Comms</h2></div>
  <div class="actions"><button class="button" type="button">New message</button></div>
</div>
<div class="columns">
  <div class="col-main">
    <section>
      <h3 class="section-heading">Referrals</h3>
      ${refs.length ? `<dl class="summary-list">
        ${refs.map(r => `<div class="sl-row">
          <dt>${r.name}</dt>
          <dd>Referred to ${r.to}<br>Sent ${fmtDate(r.sentDate)} · ${r.sentBy}
            ${r.completedDate ? `<br>Completed ${fmtDate(r.completedDate)}` : ''}
            <br>${statusTag(r.status)}</dd>
          <dd class="sl-actions"><a href="#">View</a></dd>
        </div>`).join('')}
      </dl>` : noData('referrals')}
    </section>
    <section>
      <h3 class="section-heading">Messages</h3>
      ${msgs.length ? `<dl class="summary-list">
        ${msgs.map(m => `<div class="sl-row">
          <dt style="font-weight:400"><strong>${m.from}</strong> → ${m.to}<br>
            <span style="font-size:15px;color:var(--text-muted)">${fmtDate(m.date)} · ${m.channel}</span></dt>
          <dd>"${m.text}"</dd>
          <dd class="sl-actions">${statusTag('signed', 'Sent')}</dd>
        </div>`).join('')}
      </dl>` : noData('messages')}
    </section>
  </div>
  <aside class="col-side">
    <section>
      <h3 class="section-heading">Patient contacts</h3>
      <ul class="related-nav">
        ${c.phone ? `<li><strong>Mobile</strong><span class="meta">${c.phone}</span></li>` : ''}
        ${c.altPhone ? `<li><strong>Alt.</strong><span class="meta">${c.altPhone}</span></li>` : ''}
        ${!c.phone ? '<li style="color:var(--text-muted)">No contacts recorded.</li>' : ''}
      </ul>
    </section>
    ${ctcts.length ? `<section style="margin-top:30px">
      <h3 class="section-heading">External contacts</h3>
      <ul class="related-nav">
        ${ctcts.map(ct => `<li><strong>${ct.label}</strong><span class="meta">${ct.phone}</span></li>`).join('')}
      </ul>
    </section>` : ''}
  </aside>
</div>`;
  };

  // Templates — static, no patient data
  render.templates = function () {
    return `
<div class="page-heading">
  <div><span class="caption">Patient record</span><h2>Templates</h2></div>
</div>
<section>
  <h3 class="section-heading">Antenatal</h3>
  <dl class="summary-list">
    <div class="sl-row"><dt>Antenatal review</dt><dd>Routine antenatal visit — BP, weight, fundal height, FHR, urine dipstick, fetal movements.</dd><dd class="sl-actions"><a href="#">Use</a></dd></div>
    <div class="sl-row"><dt>Antenatal booking</dt><dd>First booking visit — history, examination, bloods, dating, risk assessment.</dd><dd class="sl-actions"><a href="#">Use</a></dd></div>
    <div class="sl-row"><dt>Postnatal check — mother</dt><dd>6-week postnatal visit — wound, BP, mental health screen, contraception.</dd><dd class="sl-actions"><a href="#">Use</a></dd></div>
  </dl>
</section>
<section>
  <h3 class="section-heading">Chronic disease</h3>
  <dl class="summary-list">
    <div class="sl-row"><dt>Diabetes review</dt><dd>Quarterly follow-up — HbA1c, BP, weight, foot check, medication review.</dd><dd class="sl-actions"><a href="#">Use</a></dd></div>
    <div class="sl-row"><dt>Hypertension review</dt><dd>Hypertension follow-up — BP (both arms), medication adherence, side effects, lifestyle.</dd><dd class="sl-actions"><a href="#">Use</a></dd></div>
    <div class="sl-row"><dt>Annual chronic disease review</dt><dd>Combined annual review for patients with multiple long-term conditions.</dd><dd class="sl-actions"><a href="#">Use</a></dd></div>
  </dl>
</section>
<section>
  <h3 class="section-heading">General</h3>
  <dl class="summary-list">
    <div class="sl-row"><dt>SOAP note</dt><dd>Generic subjective / objective / assessment / plan structure for any consultation.</dd><dd class="sl-actions"><a href="#">Use</a></dd></div>
    <div class="sl-row"><dt>Urgent / unscheduled visit</dt><dd>Presenting complaint, triage observations, assessment, plan, safety-netting advice.</dd><dd class="sl-actions"><a href="#">Use</a></dd></div>
    <div class="sl-row"><dt>Referral letter</dt><dd>Standard referral — reason, clinical summary, current medications, urgency.</dd><dd class="sl-actions"><a href="#">Use</a></dd></div>
    <div class="sl-row"><dt>Discharge summary</dt><dd>Post-admission summary — diagnosis, treatment, follow-up, medication changes.</dd><dd class="sl-actions"><a href="#">Use</a></dd></div>
  </dl>
</section>`;
  };

  // Appointments
  render.appointments = function () {
    var appts = [
      { time: '08:00', patient: 'MURIITHI, Samuel', mrn: 'NKB-0052104', type: 'Hypertension review',          clinician: 'MWANGI, A. (Dr)',    status: 'completed'   },
      { time: '08:20', patient: 'GITONGA, Alice',   mrn: 'NKB-0044381', type: 'Antenatal review',              clinician: 'MWANGI, A. (Dr)',    status: 'completed'   },
      { time: '08:40', patient: 'NKUROI, David',    mrn: 'NKB-0036847', type: 'Diabetes & hypertension',       clinician: 'OTIENO, J. (Sr)',    status: 'dna'         },
      { time: '09:00', patient: 'KARIMI, Esther',   mrn: 'NKB-0058012', type: 'General consultation',          clinician: 'KARIUKI, P. (Nurse)',status: 'in-progress' },
      { time: '09:20', patient: 'WANJIKU, Mary',    mrn: 'NKB-0038104', type: 'Diabetes follow-up',            clinician: 'OTIENO, J. (Sr)',    status: 'waiting'     },
      { time: '09:40', patient: 'MWENDA, Joseph',   mrn: 'NKB-0033219', type: 'Annual review',                 clinician: 'MWANGI, A. (Dr)',    status: 'booked'      },
      { time: '10:00', patient: '(Walk-in slot)',    mrn: null,          type: '—',                             clinician: '—',                  status: 'free'        },
      { time: '10:20', patient: 'MUTHEE, Rose',     mrn: 'NKB-0022143', type: 'Routine review',                clinician: 'KARIUKI, P. (Nurse)',status: 'booked'      },
      { time: '10:40', patient: 'WANJALA, Peter',   mrn: 'NKB-0041923', type: 'Hypertension follow-up',        clinician: 'MWANGI, A. (Dr)',    status: 'booked'      },
      { time: '11:00', patient: '(Slot free)',       mrn: null,          type: '—',                             clinician: '—',                  status: 'free'        },
      { time: '11:20', patient: 'WANJIRU, Faith',   mrn: 'NKB-0029740', type: 'Child health check',            clinician: 'KARIUKI, P. (Nurse)',status: 'booked'      },
      { time: '11:40', patient: 'WANJIRU, Grace',   mrn: 'NKB-0049213', type: 'Antenatal — blood results',     clinician: 'MWANGI, A. (Dr)',    status: 'booked'      },
    ];
    var apptTag = { completed: ['tag--green','Completed'], 'in-progress': ['tag','In progress'],
                    waiting: ['tag--yellow','Waiting'], booked: ['tag--grey','Booked'], dna: ['tag--red','DNA'] };

    return `
<div class="page-heading">
  <div><span class="caption">Clinic — Monday 31 May 2026</span><h2>Appointments</h2></div>
  <div class="actions">
    <button class="button secondary" type="button">Print list</button>
    <button class="button" type="button">New appointment</button>
  </div>
</div>
<div style="margin-bottom:20px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
  <button type="button" class="chip chip--active">Today</button>
  <button type="button" class="chip">This week</button>
  <span style="margin-left:8px;display:flex;align-items:center;gap:8px;font-size:16px;color:var(--text-muted)">
    Clinician:
    <select style="font:inherit;font-size:16px;padding:4px 8px;border:1px solid var(--border);background:#fff">
      <option>All clinicians</option><option>MWANGI, A. (Dr)</option>
      <option>OTIENO, J. (Sr)</option><option>KARIUKI, P. (Nurse)</option>
    </select>
  </span>
</div>
<table class="data-table">
  <caption>Today's appointments</caption>
  <thead><tr>
    <th scope="col">Time</th><th scope="col">Patient</th><th scope="col">MRN</th>
    <th scope="col">Type</th><th scope="col">Clinician</th><th scope="col">Status</th>
    <th scope="col" aria-label="Actions"></th>
  </tr></thead>
  <tbody>
    ${appts.map(a => {
      var t = apptTag[a.status];
      return `<tr${a.status === 'free' ? ' style="color:var(--text-muted)"' : ''}>
        <td class="mono">${a.time}</td>
        <td>${a.mrn
          ? `<a href="#" style="color:var(--blue);text-decoration:underline;font-weight:700" data-action="open-patient" data-mrn="${a.mrn}">${a.patient}</a>`
          : a.patient}</td>
        <td class="mono" style="font-size:14px">${a.mrn || ''}</td>
        <td>${a.type}</td>
        <td>${a.clinician}</td>
        <td>${t ? `<span class="tag ${t[0]}">${t[1]}</span>` : ''}</td>
        <td>${a.status !== 'free' ? '<a href="#" style="color:var(--blue);text-decoration:underline">Details</a>' : ''}</td>
      </tr>`;
    }).join('')}
  </tbody>
</table>`;
  };

  // Workflow & Tasks
  render.tasks = function () {
    var urgent = [
      { title: 'Review FBC result',            patient: 'WANJIRU, Grace', mrn: 'NKB-0049213', due: 'Today',     assignee: 'MWANGI, A. (Dr)',    type: 'Lab result'   },
      { title: 'Review HbA1c result',           patient: 'WANJIRU, Grace', mrn: 'NKB-0049213', due: 'Today',     assignee: 'MWANGI, A. (Dr)',    type: 'Lab result'   },
      { title: 'Review urine protein result',   patient: 'WANJIRU, Grace', mrn: 'NKB-0049213', due: 'Today',     assignee: 'MWANGI, A. (Dr)',    type: 'Lab result'   },
    ];
    var mine = [
      { title: 'Sign off antenatal note',           patient: 'WANJIRU, Grace', mrn: 'NKB-0049213', due: 'Today',         assignee: 'MWANGI, A. (Dr)',    type: 'Clinical note' },
      { title: 'HbA1c + glucose review',            patient: 'WANJIKU, Mary',  mrn: 'NKB-0038104', due: 'Today',         assignee: 'OTIENO, J. (Sr)',     type: 'Lab result'    },
      { title: 'Contact re: DNA appointment',       patient: 'NKUROI, David',  mrn: 'NKB-0036847', due: 'Tomorrow',      assignee: 'KARIUKI, P. (Nurse)', type: 'Admin'         },
    ];
    var team = [
      { title: 'Batch lab results review (12 patients)', patient: null, mrn: null, due: 'Today',         assignee: 'All clinicians',       type: 'Lab results' },
      { title: 'Update vaccination records (3 patients)',patient: null, mrn: null, due: 'This week',     assignee: 'KARIUKI, P. (Nurse)',  type: 'Admin'       },
      { title: 'Monthly morbidity report',               patient: null, mrn: null, due: '05-Jun-2026',   assignee: 'MWANGI, A. (Dr)',     type: 'Reporting'   },
    ];

    function row(t) {
      return `<div class="sl-row">
        <dt>${t.title}</dt>
        <dd>${t.patient
          ? `Patient: <a href="#" style="color:var(--blue);text-decoration:underline" data-action="open-patient" data-mrn="${t.mrn}">${t.patient}</a><br>`
          : ''}Assigned: ${t.assignee} · Due: <strong>${t.due}</strong><br>
          <span class="tag tag--grey" style="font-size:13px">${t.type}</span></dd>
        <dd class="sl-actions"><a href="#">Complete</a></dd>
      </div>`;
    }

    function badge(n, colour) {
      return `<span style="background:${colour};color:#fff;padding:2px 8px;font-size:14px;font-weight:700;margin-left:8px;vertical-align:middle">${n}</span>`;
    }

    return `
<div class="page-heading">
  <div><span class="caption">Clinic</span><h2>Workflow &amp; Tasks</h2></div>
  <div class="actions"><button class="button" type="button">New task</button></div>
</div>
<section>
  <h3 class="section-heading">Urgent — action today ${badge(urgent.length, 'var(--red)')}</h3>
  <dl class="summary-list">${urgent.map(row).join('')}</dl>
</section>
<section>
  <h3 class="section-heading">My tasks ${badge(mine.length, 'var(--blue)')}</h3>
  <dl class="summary-list">${mine.map(row).join('')}</dl>
</section>
<section>
  <h3 class="section-heading">Team queue</h3>
  <dl class="summary-list">${team.map(row).join('')}</dl>
</section>`;
  };

  // Register patient
  render['register-patient'] = function () {
    return `
<div class="page-heading">
  <div><span class="caption">Patient registration</span><h2>Register patient</h2></div>
</div>
<form>
  <div class="form-columns">
    <div>
      <section class="form-section">
        <h3 class="form-section-heading">Personal details</h3>
        <div class="form-group">
          <label class="form-label" for="reg-surname">Surname <span class="required">*</span></label>
          <input class="form-input" type="text" id="reg-surname" autocomplete="family-name">
        </div>
        <div class="form-group">
          <label class="form-label" for="reg-forename">Forename <span class="required">*</span></label>
          <input class="form-input" type="text" id="reg-forename" autocomplete="given-name">
        </div>
        <div class="form-group">
          <label class="form-label" for="reg-title">Title</label>
          <select class="form-select" style="max-width:160px" id="reg-title">
            <option value="">—</option><option>Mr</option><option>Mrs</option>
            <option>Ms</option><option>Miss</option><option>Dr</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="reg-sex">Sex <span class="required">*</span></label>
          <select class="form-select" style="max-width:200px" id="reg-sex">
            <option value="">Select</option><option>Male</option><option>Female</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="reg-dob">Date of birth <span class="required">*</span></label>
          <span class="form-hint">DD/MM/YYYY</span>
          <input class="form-input" style="max-width:220px" type="date" id="reg-dob">
        </div>
      </section>
      <section class="form-section">
        <h3 class="form-section-heading">Contact details</h3>
        <div class="form-group">
          <label class="form-label" for="reg-phone">Mobile phone <span class="required">*</span></label>
          <input class="form-input" type="tel" id="reg-phone" autocomplete="tel">
        </div>
        <div class="form-group">
          <label class="form-label" for="reg-phone2">Alternative phone</label>
          <input class="form-input" type="tel" id="reg-phone2">
        </div>
        <div class="form-group">
          <label class="form-label" for="reg-address">Address <span class="required">*</span></label>
          <textarea class="form-input" id="reg-address" rows="3" style="resize:vertical"></textarea>
        </div>
      </section>
    </div>
    <div>
      <section class="form-section">
        <h3 class="form-section-heading">Next of kin</h3>
        <div class="form-group">
          <label class="form-label" for="reg-kin-name">Name</label>
          <input class="form-input" type="text" id="reg-kin-name">
        </div>
        <div class="form-group">
          <label class="form-label" for="reg-kin-rel">Relationship</label>
          <input class="form-input" style="max-width:280px" type="text" id="reg-kin-rel" placeholder="e.g. Husband, Mother">
        </div>
        <div class="form-group">
          <label class="form-label" for="reg-kin-phone">Phone</label>
          <input class="form-input" type="tel" id="reg-kin-phone">
        </div>
      </section>
      <section class="form-section">
        <h3 class="form-section-heading">Clinical information</h3>
        <div class="form-group">
          <label class="form-label" for="reg-blood">Blood group</label>
          <select class="form-select" style="max-width:220px" id="reg-blood">
            <option value="">Unknown</option>
            <option>A Rh+</option><option>A Rh−</option><option>B Rh+</option><option>B Rh−</option>
            <option>AB Rh+</option><option>AB Rh−</option><option>O Rh+</option><option>O Rh−</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="reg-allergies">Known allergies</label>
          <span class="form-hint">Drug or environmental allergies, if known.</span>
          <textarea class="form-input" id="reg-allergies" rows="3" style="resize:vertical"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label" for="reg-languages">Preferred language(s)</label>
          <input class="form-input" type="text" id="reg-languages" placeholder="e.g. Kiswahili, English">
        </div>
      </section>
      <section class="form-section">
        <h3 class="form-section-heading">Demographics</h3>
        <div class="form-group">
          <label class="form-label" for="reg-marital">Marital status</label>
          <select class="form-select" style="max-width:220px" id="reg-marital">
            <option value="">—</option><option>Single</option><option>Married</option>
            <option>Divorced</option><option>Widowed</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="reg-occupation">Occupation</label>
          <input class="form-input" type="text" id="reg-occupation">
        </div>
      </section>
    </div>
  </div>
  <div class="inset-text" style="margin-bottom:24px">
    Fields marked <span class="required">*</span> are required.
    The MRN will be assigned automatically on save.
  </div>
  <div style="display:flex;gap:12px;flex-wrap:wrap;padding-bottom:40px">
    <button class="button" type="button">Save registration</button>
    <button class="button secondary" type="button">Cancel</button>
  </div>
</form>`;
  };

  // Reporting
  render.reporting = function () {
    return `
<div class="page-heading">
  <div><span class="caption">Clinic</span><h2>Reporting</h2></div>
  <div class="actions">
    <button class="button secondary" type="button">Export CSV</button>
    <button class="button" type="button">Print report</button>
  </div>
</div>
<div class="stat-cards">
  <div class="stat-card"><div class="stat-card__number">47</div><div class="stat-card__label">Patients registered this month</div></div>
  <div class="stat-card"><div class="stat-card__number">184</div><div class="stat-card__label">Appointments this week</div></div>
  <div class="stat-card stat-card--red"><div class="stat-card__number">12</div><div class="stat-card__label">Outstanding tasks</div></div>
  <div class="stat-card stat-card--yellow"><div class="stat-card__number">3</div><div class="stat-card__label">Lab results pending review</div></div>
</div>
<section>
  <h3 class="section-heading">Activity this week — by clinician</h3>
  <table class="data-table">
    <caption>Activity this week</caption>
    <thead><tr>
      <th scope="col">Clinician</th>
      <th scope="col" class="numeric">Consultations</th>
      <th scope="col" class="numeric">New patients</th>
      <th scope="col" class="numeric">Lab requests</th>
      <th scope="col" class="numeric">Referrals</th>
      <th scope="col" class="numeric">DNA rate</th>
    </tr></thead>
    <tbody>
      <tr><th scope="row">MWANGI, A. (Dr)</th><td class="numeric">38</td><td class="numeric">4</td><td class="numeric">12</td><td class="numeric">2</td><td class="numeric">8%</td></tr>
      <tr><th scope="row">OTIENO, J. (Sr)</th><td class="numeric">31</td><td class="numeric">2</td><td class="numeric">9</td><td class="numeric">1</td><td class="numeric">6%</td></tr>
      <tr><th scope="row">KARIUKI, P. (Nurse)</th><td class="numeric">44</td><td class="numeric">6</td><td class="numeric">3</td><td class="numeric">0</td><td class="numeric">11%</td></tr>
      <tr style="font-weight:700"><th scope="row">Total</th><td class="numeric">113</td><td class="numeric">12</td><td class="numeric">24</td><td class="numeric">3</td><td class="numeric">9%</td></tr>
    </tbody>
  </table>
</section>
<section>
  <h3 class="section-heading">Top diagnoses this month</h3>
  <table class="data-table">
    <caption>Top diagnoses</caption>
    <thead><tr>
      <th scope="col">Diagnosis</th><th scope="col">ICD-10</th>
      <th scope="col" class="numeric">Patients</th><th scope="col" class="numeric">% of total</th>
    </tr></thead>
    <tbody>
      <tr><th scope="row">Hypertension</th><td>I10</td><td class="numeric">84</td><td class="numeric">18%</td></tr>
      <tr><th scope="row">Type 2 diabetes mellitus</th><td>E11</td><td class="numeric">71</td><td class="numeric">15%</td></tr>
      <tr><th scope="row">Antenatal care</th><td>Z34</td><td class="numeric">52</td><td class="numeric">11%</td></tr>
      <tr><th scope="row">Upper respiratory tract infection</th><td>J06</td><td class="numeric">38</td><td class="numeric">8%</td></tr>
      <tr><th scope="row">Malaria</th><td>B54</td><td class="numeric">29</td><td class="numeric">6%</td></tr>
    </tbody>
  </table>
</section>`;
  };

  // Inbox
  render.inbox = function () {
    var msgs = [
      { from: 'OTIENO, J. (Sr)',      subject: 'Lab review — HbA1c results for 3 patients',   preview: 'Please review the HbA1c results for WANJIKU, Mary; NKUROI, David; and MWENDA, Joseph. Results attached.',   date: '2 hours ago', read: false, type: 'Lab result' },
      { from: 'Lab system',           subject: 'Batch results available (12 patients)',         preview: 'New laboratory results are available for 12 patients registered at Nkubu HC. Log in to review and sign off.', date: 'Yesterday',   read: false, type: 'Lab result' },
      { from: 'KARIUKI, P. (Nurse)',  subject: 'Clinic rota update — June 2026',               preview: 'Please see the updated rota for June. Dr MWANGI will be on leave 15–19 June. Cover arrangements below.',      date: '2 days ago',  read: true,  type: 'Admin'     },
      { from: 'System',               subject: 'Monthly report ready — May 2026',              preview: 'The automated morbidity and activity report for May 2026 is available under Reporting.',                       date: '3 days ago',  read: true,  type: 'System'    },
      { from: 'MWANGI, A. (Dr)',      subject: 'Re: Referral — WANJIRU, Grace to Meru L5',    preview: 'Confirmed — referral accepted. Appointment: 12 Jun 2026 at 10:00. Please inform the patient.',                date: '1 week ago',  read: true,  type: 'Referral'  },
    ];
    var unread = msgs.filter(function (m) { return !m.read; }).length;

    return `
<div class="page-heading">
  <div><span class="caption">Clinic</span>
    <h2>Inbox ${unread ? `<span style="background:var(--red);color:#fff;font-size:18px;font-weight:700;padding:2px 10px;vertical-align:middle;margin-left:8px">${unread}</span>` : ''}</h2>
  </div>
  <div class="actions"><button class="button" type="button">New message</button></div>
</div>
<div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
  <button type="button" class="chip chip--active">All</button>
  <button type="button" class="chip">Unread <span style="background:var(--red);color:#fff;padding:1px 6px;font-size:12px;font-weight:700;margin-left:4px">${unread}</span></button>
  <button type="button" class="chip">Lab results</button>
  <button type="button" class="chip">Referrals</button>
  <button type="button" class="chip">System</button>
</div>
<ul class="message-list">
  ${msgs.map(function (m) {
    return `<li class="message-item">
      <span class="message-item__dot${m.read ? ' message-item__dot--read' : ''}"></span>
      <div class="message-item__body">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap">
          <span class="message-item__from">${m.read ? m.from : `<strong>${m.from}</strong>`}</span>
          <span class="message-item__meta">${m.date}</span>
        </div>
        <div class="message-item__subject">${m.read ? m.subject : `<strong>${m.subject}</strong>`}</div>
        <div class="message-item__meta" style="margin-top:3px">${m.preview}</div>
      </div>
      <span class="tag tag--grey" style="font-size:13px;align-self:center;flex:none;white-space:nowrap">${m.type}</span>
    </li>`;
  }).join('')}
</ul>`;
  };

  // ── Exports ────────────────────────────────────────────────────────────────

  window.render       = render;
  window.renderBanner = renderBanner;
  window.renderFindResults = renderFindResults;

})(window);
