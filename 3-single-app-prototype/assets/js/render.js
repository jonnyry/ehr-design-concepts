// render.js — data helpers and patient data preparation for HTML templates.
// Module content lives in modules/*.html; this file shapes patient JSON into
// the data objects those templates bind to via data-field / data-list / data-if.
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
    if (now.getMonth() < b.getMonth() ||
        (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
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
    return '<span class="tag ' + t[0] + '">' + (labelOverride || t[1]) + '</span>';
  }

  // ── Banner ─────────────────────────────────────────────────────────────────

  function renderBanner(p) {
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
        var cls  = f.type === 'alert' ? 'pb-flag--alert' : 'pb-flag--info';
        var icon = f.type === 'alert' ? '⚠' : '●';
        return '<span class="pb-flag ' + cls + '" title="' + f.title + '">' + icon + ' ' + f.label + '</span>';
      }).join('');
    }

    if (grid) {
      var c = p.contact || {}, d = p.demographics || {}, alerts = p.clinicalAlerts || [];
      grid.innerHTML =
        '<div class="pb-detail-block">' +
          '<h3 class="pb-detail-heading">Contact</h3>' +
          '<dl class="pb-stacked">' +
            '<div><dt>Phone</dt><dd>' + (c.phone || '—') + '</dd></div>' +
            (c.altPhone  ? '<div><dt>Alt. phone</dt><dd>' + c.altPhone + '</dd></div>' : '') +
            '<div><dt>Address</dt><dd>' + (c.address || '—').replace(/,\s*/g, '<br>') + '</dd></div>' +
            (c.nextOfKin ? '<div><dt>Next of kin</dt><dd>' + c.nextOfKin + '</dd></div>' : '') +
          '</dl>' +
        '</div>' +
        '<div class="pb-detail-block">' +
          '<h3 class="pb-detail-heading">Demographics</h3>' +
          '<dl class="pb-stacked">' +
            (d.bloodGroup    ? '<div><dt>Blood group</dt><dd>'       + d.bloodGroup    + '</dd></div>' : '') +
            (d.maritalStatus ? '<div><dt>Marital status</dt><dd>'    + d.maritalStatus + '</dd></div>' : '') +
            (d.occupation    ? '<div><dt>Occupation</dt><dd>'        + d.occupation    + '</dd></div>' : '') +
            (d.languages     ? '<div><dt>Preferred language</dt><dd>'+ d.languages     + '</dd></div>' : '') +
          '</dl>' +
        '</div>' +
        '<div class="pb-detail-block">' +
          '<h3 class="pb-detail-heading">Clinical alerts</h3>' +
          (alerts.length
            ? '<ul class="pb-alerts">' + alerts.map(function (a) { return '<li>' + a + '</li>'; }).join('') + '</ul>'
            : '<p style="color:var(--text-muted);font-size:16px">No alerts recorded.</p>') +
        '</div>';
    }

    var banner  = document.getElementById('patientBanner');
    var submenu = document.getElementById('patientSubmenu');
    if (banner)  banner.removeAttribute('hidden');
    if (submenu) submenu.removeAttribute('hidden');
  }

  // ── Find Patient results ───────────────────────────────────────────────────

  function renderFindResults(patients, currentMrn) {
    if (!patients.length) {
      return '<tr><td colspan="7" style="padding:20px;color:var(--text-muted);text-align:center">No patients found.</td></tr>';
    }
    return patients.map(function (p) {
      var hl = p.mrn === currentMrn ? ' find-results__row--highlight' : '';
      return '<tr class="find-results__row' + hl + '">' +
        '<th scope="row"><strong>' + p.surname + ', ' + p.forename + '</strong>' +
          (p.title ? ' <span class="muted">(' + p.title + ')</span>' : '') + '</th>' +
        '<td class="mono">' + p.mrn + '</td>' +
        '<td class="mono">' + fmtDate(p.dob) + '</td>' +
        '<td>' + p.sex + '</td>' +
        '<td class="mono">' + maskPhone(p.phone) + '</td>' +
        '<td>' + fmtDate(p.lastSeen) + '</td>' +
        '<td><a href="#" class="row-action" data-action="open-patient" data-mrn="' + p.mrn + '">Open record</a></td>' +
      '</tr>';
    }).join('');
  }

  // ── prepareData ── shapes patient record for each module's HTML template ──
  // Each function returns a flat data object; bind() in app.js applies it
  // to the fetched HTML fragment via data-field / data-list / data-if hooks.

  var prepareData = {};

  prepareData.summary = function (p) {
    return {
      problems: (p.problems || []).map(function (x) {
        return {
          name:      x.name,
          detail:    [x.code, x.detail].filter(Boolean).join(' · '),
          statusTag: statusTag(x.status)
        };
      }),
      medications: ((p.medications || {}).current || []).map(function (x) {
        return { name: x.name, doseDate: x.dose + '. Since ' + fmtDate(x.since) + '.' };
      }),
      hasVitals:  !!p.vitals,
      vitalsDate: p.vitals ? fmtDate(p.vitals.date) : '',
      vitalsBy:   p.vitals ? p.vitals.recordedBy : '',
      vitalRows: (p.vitals ? p.vitals.measurements : []).map(function (m) {
        return {
          name:      m.name,
          valueHtml: m.flag ? '<span class="value-flag">' + m.value + '</span>' : m.value,
          reference: m.reference
        };
      }),
      vitalsNote: (p.vitals && p.vitals.note) || '',
      recentEncounters: (p.encounters || []).slice(0, 4).map(function (e) {
        return { type: e.type, dateClinician: fmtDate(e.date) + ' · ' + e.clinician };
      }),
      allergies: (p.allergies || []).map(function (a) {
        return { substance: a.substance, severityConfirmed: a.severity + ' · confirmed ' + a.confirmed };
      })
    };
  };

  prepareData.encounters = function (p) {
    return {
      encounters: (p.encounters || []).map(function (e) {
        return {
          date: fmtDate(e.date), type: e.type,
          clinician: e.clinician, notes: e.notes,
          statusTag: statusTag(e.status)
        };
      })
    };
  };

  prepareData.prescribing = function (p) {
    var meds = p.medications || {};
    return {
      currentMeds: (meds.current || []).map(function (m) {
        return {
          name: m.name, dose: m.dose,
          startedBy:    'Started ' + fmtDate(m.since) + ' · ' + m.prescribedBy,
          indication:   m.indication || '',
          hasIndication: !!m.indication,
          statusTag:    statusTag('active', 'Active')
        };
      }),
      stoppedMeds: (meds.stopped || []).map(function (m) {
        return {
          name:         m.name,
          stoppedDetail: 'Stopped ' + fmtDate(m.stoppedDate) + ' by ' + m.stoppedBy,
          reason:       m.reason,
          statusTag:    statusTag('resolved', 'Stopped')
        };
      }),
      hasAllergies:    !!(p.allergies && p.allergies.length),
      allergyAlertHtml: (p.allergies || []).map(function (a) {
        return '<strong style="color:var(--red)">' + a.substance + ' — ' + a.severity.toUpperCase() +
               '</strong><br>' + a.reaction + '. Confirmed ' + a.confirmed + '.';
      }).join('<br><br>'),
      hasCautions: !!(p.prescribingCautions && p.prescribingCautions.length),
      cautions: (p.prescribingCautions || []).map(function (c) {
        return { label: c.label, detail: c.detail };
      })
    };
  };

  prepareData.labs = function (p) {
    var labs = p.labs || {}, pend = labs.pending || [];
    return {
      hasPending:  !!pend.length,
      pendingIntro: pend.length + ' result' + (pend.length !== 1 ? 's' : '') +
                    ' need' + (pend.length === 1 ? 's' : '') + ' your attention.',
      pendingResults: pend.map(function (r) {
        return {
          name:      r.name,
          result:    r.result,
          dates:     'Ordered ' + fmtDate(r.orderedDate) + ' · Result ' + fmtDate(r.resultDate),
          statusTag: statusTag('overdue', 'Review required')
        };
      }),
      historyResults: (labs.history || []).map(function (r) {
        return { name: r.name, result: r.result, reference: r.reference, date: fmtDate(r.date), orderedBy: r.orderedBy };
      })
    };
  };

  prepareData.vaccinations = function (p) {
    var vacc = p.vaccinations || {};
    return {
      isPregnant: (p.flags || []).some(function (f) { return f.label === 'Pregnant'; }),
      schedule: (vacc.schedule || []).map(function (s) {
        return {
          name:        s.name,
          doseInfo:    s.doseInfo + (s.clinician ? '<br>' + s.clinician : ''),
          statusTag:   statusTag(s.status),
          actionLabel: s.status === 'due' ? 'Record' : 'History'
        };
      }),
      history: (vacc.history || []).map(function (h) {
        return { vaccine: h.vaccine, dose: h.dose, date: fmtDate(h.date), batch: h.batch, by: h.by };
      })
    };
  };

  prepareData.documents = function (p) {
    return {
      documents: (p.documents || []).map(function (d) {
        return { name: d.name, type: d.type, date: fmtDate(d.date), addedBy: d.addedBy };
      })
    };
  };

  prepareData.comms = function (p) {
    var comms = p.comms || {}, c = p.contact || {};
    return {
      referrals: (comms.referrals || []).map(function (r) {
        return {
          name:      r.name,
          toAndDate: 'Referred to ' + r.to + '<br>Sent ' + fmtDate(r.sentDate) + ' · ' + r.sentBy +
                     (r.completedDate ? '<br>Completed ' + fmtDate(r.completedDate) : ''),
          statusTag: statusTag(r.status)
        };
      }),
      messages: (comms.messages || []).map(function (m) {
        return {
          fromTo:    '<strong>' + m.from + '</strong> → ' + m.to,
          dateCh:    fmtDate(m.date) + ' · ' + m.channel,
          text:      '“' + m.text + '”',
          statusTag: statusTag('signed', 'Sent')
        };
      }),
      hasPatientPhone: !!c.phone,
      patientPhone:    c.phone || '',
      hasAltPhone:     !!c.altPhone,
      patientAltPhone: c.altPhone || '',
      hasNoContacts:   !c.phone && !c.altPhone,
      hasContacts:     !!(comms.contacts && comms.contacts.length),
      contacts: (comms.contacts || []).map(function (ct) {
        return { label: ct.label, phone: ct.phone };
      })
    };
  };

  // ── Exports ────────────────────────────────────────────────────────────────

  window.renderBanner      = renderBanner;
  window.renderFindResults = renderFindResults;
  window.prepareData       = prepareData;

})(window);
