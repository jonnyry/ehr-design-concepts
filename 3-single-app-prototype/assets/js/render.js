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

  // ── Exports ────────────────────────────────────────────────────────────────

  window.render       = render;
  window.renderBanner = renderBanner;
  window.renderFindResults = renderFindResults;

})(window);
