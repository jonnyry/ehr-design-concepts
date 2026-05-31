// Recompute sticky offsets so the patient banner sticks beneath the header,
// and the patient sub-menu sticks beneath the banner.
(function () {
  var root = document.documentElement;
  var govHeader = document.querySelector('.gov-header');
  var patientBanner = document.querySelector('.patient-banner');

  function setOffsets() {
    if (!govHeader) return;
    var govH = govHeader.offsetHeight;
    root.style.setProperty('--gov-header-h', govH + 'px');
    root.style.setProperty('--header-total-h', govH + 'px');
    if (patientBanner) {
      var bannerH = patientBanner.offsetHeight;
      root.style.setProperty('--patient-banner-stack-h', (govH + bannerH) + 'px');
    }
  }

  setOffsets();
  window.addEventListener('resize', setOffsets);
  window.addEventListener('load', setOffsets);

  // Recompute when the banner expands or collapses
  var pb = document.getElementById('patientBanner');
  if (pb) {
    var observer = new MutationObserver(setOffsets);
    observer.observe(pb, { attributes: true, attributeFilter: ['class'] });
  }
})();

// Modules panel: close on outside click or Escape
(function () {
  var btn = document.getElementById('modulesBtn');
  var panel = document.getElementById('modulesPanel');
  if (!btn || !panel) return;

  function closeModules() {
    panel.classList.remove('is-open');
    btn.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
  }

  document.addEventListener('click', function (e) {
    if (!panel.classList.contains('is-open')) return;
    if (panel.contains(e.target) || btn.contains(e.target)) return;
    closeModules();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModules();
  });
})();

// Event delegation for all data-action interactions
document.addEventListener('click', function (e) {
  // Auto-close modules panel when clicking any hash-nav link inside it
  var modulesPanel = document.getElementById('modulesPanel');
  if (modulesPanel && modulesPanel.classList.contains('is-open')) {
    var anchor = e.target.closest('a[href^="#/"]');
    if (anchor && modulesPanel.contains(anchor)) {
      var btn = document.getElementById('modulesBtn');
      modulesPanel.classList.remove('is-open');
      btn.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    }
  }

  var el = e.target.closest('[data-action]');
  if (!el) return;

  var action = el.dataset.action;

  if (action === 'modules-toggle') {
    var panel = document.getElementById('modulesPanel');
    var open = !panel.classList.contains('is-open');
    panel.classList.toggle('is-open', open);
    el.setAttribute('aria-expanded', open);
    el.classList.toggle('is-open', open);
  }

  if (action === 'find-open') {
    e.preventDefault();
    var modal = document.getElementById('findPatientModal');
    if (modal) modal.showModal();
  }

  if (action === 'find-open-from-modules') {
    e.preventDefault();
    var panel = document.getElementById('modulesPanel');
    var btn = document.getElementById('modulesBtn');
    panel.classList.remove('is-open');
    btn.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    setTimeout(function () {
      var modal = document.getElementById('findPatientModal');
      if (modal) modal.showModal();
    }, 220);
  }

  if (action === 'find-close') {
    var modal = document.getElementById('findPatientModal');
    if (modal) modal.close();
  }

  if (action === 'open-patient') {
    e.preventDefault();
    var mrn = el.dataset.mrn;
    document.getElementById('findPatientModal').close();
    window.loadPatient(mrn);
  }

  if (action === 'find-filter') {
    e.preventDefault();
    document.querySelectorAll('.chip[data-action="find-filter"]').forEach(function (c) {
      c.classList.remove('chip--active');
    });
    el.classList.add('chip--active');
    app.state.filter = el.dataset.filter || 'all';
    window.refreshFindResults();
  }

  if (action === 'banner-toggle') {
    var banner = document.getElementById('patientBanner');
    var details = document.getElementById('pbDetails');
    var open = banner.classList.toggle('is-expanded');
    el.setAttribute('aria-expanded', open);
    if (open) {
      details.removeAttribute('hidden');
    } else {
      details.setAttribute('hidden', '');
    }
    el.querySelector('.pb-toggle-label').textContent = open ? 'Less' : 'More';
  }
});

// Lightweight data binder for HTML template fragments.
// data-if="key"   — hides element when data[key] is falsy or an empty array
// data-field="key" — sets element innerHTML to data[key]
// data-list="key"  — clones the <template> child for each item in data[key],
//                    recursively binding each clone; shows [data-empty] when empty
function bind(root, data) {
  root.querySelectorAll('[data-if]').forEach(function (el) {
    var v = data[el.dataset.if];
    el.hidden = !v || (Array.isArray(v) && !v.length);
  });
  root.querySelectorAll('[data-field]').forEach(function (el) {
    var v = data[el.dataset.field];
    if (v != null) el.innerHTML = v;
  });
  root.querySelectorAll('[data-list]').forEach(function (container) {
    var items = data[container.dataset.list] || [];
    var tmpl  = container.querySelector('template');
    var empty = container.querySelector('[data-empty]');
    if (!tmpl) return;
    Array.from(container.children).forEach(function (child) {
      if (child.tagName !== 'TEMPLATE' && !child.hasAttribute('data-empty')) {
        container.removeChild(child);
      }
    });
    if (empty) empty.hidden = !!items.length;
    items.forEach(function (item) {
      var frag = document.importNode(tmpl.content, true);
      bind(frag, item);
      container.appendChild(frag);
    });
  });
}

// ── App state & patient loading ───────────────────────────────────────────────
// Requires an HTTP server (file:// won't work in Chrome due to fetch restrictions).
// To run locally: python -m http.server 8080  or use VS Code Live Server.
var app = {
  state: {
    patient:  null,   // currently loaded patient record object
    patients: [],     // directory loaded from patients.json
    filter:   'all',  // active chip filter in Find modal
  }
};

(function () {
  var TITLES = {
    summary: 'Summary', encounters: 'Encounters', prescribing: 'Prescribing',
    labs: 'Labs', vaccinations: 'Vaccinations', documents: 'Documents',
    comms: 'Comms', templates: 'Templates',
    appointments: 'Appointments', tasks: 'Workflow & Tasks',
    'register-patient': 'Register patient', reporting: 'Reporting', inbox: 'Inbox',
  };

  var PATIENT_ROUTES = { summary: 1, encounters: 1, prescribing: 1, labs: 1, vaccinations: 1, documents: 1, comms: 1, templates: 1 };
  var CLINIC_ROUTES  = { appointments: 1, tasks: 1, 'register-patient': 1, reporting: 1, inbox: 1 };

  // ── Router ──────────────────────────────────────────────────────────────────

  function currentRoute() {
    return window.location.hash.replace(/^#\//, '') || 'summary';
  }

  function navigate(route) {
    var isClinic = !!CLINIC_ROUTES[route];
    if (!PATIENT_ROUTES[route] && !isClinic) route = 'summary';

    document.querySelectorAll('.patient-submenu a[data-route]').forEach(function (a) {
      a.classList.toggle('active', a.dataset.route === route);
    });

    // Clinic routes unload patient context
    if (isClinic) {
      app.state.patient = null;
      var banner  = document.getElementById('patientBanner');
      var submenu = document.getElementById('patientSubmenu');
      if (banner)  banner.setAttribute('hidden', '');
      if (submenu) submenu.setAttribute('hidden', '');
    }

    var patient = app.state.patient;
    var label = patient ? patient.surname + ', ' + patient.forename : 'ClearCare EHR';
    document.title = (TITLES[route] || route) + ' — ' + label;

    var main = document.getElementById('main-content');
    if (!patient && !isClinic && route !== 'templates') {
      main.innerHTML = '<p style="padding:60px 0;text-align:center;color:var(--text-muted)">Search for a patient to begin.</p>';
      return;
    }

    fetch('modules/' + route + '.html')
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      })
      .then(function (html) {
        main.innerHTML = html;
        if (patient && window.prepareData && window.prepareData[route]) {
          bind(main, window.prepareData[route](patient));
        }
        window.scrollTo(0, 0);
      })
      .catch(function () {
        main.innerHTML = '<p style="padding:30px 0;color:var(--text-muted)">Module not available.</p>';
      });
  }

  window.navigate = navigate;

  window.addEventListener('hashchange', function () { navigate(currentRoute()); });

  // ── Patient loading ─────────────────────────────────────────────────────────

  function loadPatient(mrn) {
    fetch('data/records/' + mrn + '.json')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        app.state.patient = data;
        window.renderBanner(data);
        var route = currentRoute();
        if (route === 'summary') {
          navigate('summary');
        } else {
          window.location.hash = '#/summary';
        }
      })
      .catch(function () {
        app.state.patient = null;
        var banner  = document.getElementById('patientBanner');
        var submenu = document.getElementById('patientSubmenu');
        if (banner)  banner.setAttribute('hidden', '');
        if (submenu) submenu.setAttribute('hidden', '');
        document.getElementById('main-content').innerHTML =
          '<p style="padding:30px 0;color:var(--text-muted)">Could not load patient record.</p>';
      });
  }

  window.loadPatient = loadPatient;

  // ── Find Patient search ─────────────────────────────────────────────────────

  function filterPatients(q) {
    var all = app.state.patients;
    var f = app.state.filter;

    var list = all;
    if (f === 'recent') {
      list = all.slice().sort(function (a, b) { return b.lastSeen.localeCompare(a.lastSeen); }).slice(0, 5);
    }
    if (!q) return list;
    q = q.toLowerCase();
    return list.filter(function (p) {
      return (p.surname + ' ' + p.forename).toLowerCase().indexOf(q) !== -1 ||
             p.mrn.toLowerCase().indexOf(q) !== -1 ||
             (p.phone || '').replace(/\s/g, '').indexOf(q.replace(/\s/g, '')) !== -1 ||
             p.dob.indexOf(q) !== -1;
    });
  }

  function refreshFindResults() {
    var q       = (document.getElementById('findSearchInput') || {}).value || '';
    var results = filterPatients(q.trim());
    var tbody   = document.querySelector('.find-results__table tbody');
    var meta    = document.querySelector('.find-results__meta span:first-child');
    var currentMrn = app.state.patient ? app.state.patient.mrn : null;

    if (tbody) tbody.innerHTML = window.renderFindResults(results, currentMrn);
    if (meta) {
      meta.innerHTML = '<strong>' + results.length + '</strong> ' +
        (q.trim() ? 'matching &ldquo;' + q.trim() + '&rdquo;' : 'patients');
    }
  }

  // Wire search input
  var searchInput = document.getElementById('findSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', refreshFindResults);
  }

  // Chip filter clicks (handled via event delegation below — see data-action="find-filter")
  window.refreshFindResults = refreshFindResults;

  // Load the patients directory once
  fetch('data/patients.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      app.state.patients = data;
      refreshFindResults();
    });

  // ── Auto-load default patient (Grace Wanjiru) ───────────────────────────────
  loadPatient('NKB-0049213');

})();
