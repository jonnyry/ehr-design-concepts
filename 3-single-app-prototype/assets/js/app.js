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

// Hash router — fetches module fragments into #main-content.
// Requires an HTTP server (file:// won't work in Chrome due to fetch restrictions).
// To run locally: python -m http.server 8080  or use VS Code Live Server.
(function () {
  var routes = {
    'summary':      'modules/summary.html',
    'encounters':   'modules/encounters.html',
    'prescribing':  'modules/prescribing.html',
    'labs':         'modules/labs.html',
    'vaccinations': 'modules/vaccinations.html',
    'documents':    'modules/documents.html',
    'comms':        'modules/comms.html',
    'templates':    'modules/templates.html',
  };

  var titles = {
    'summary':      'Summary',
    'encounters':   'Encounters',
    'prescribing':  'Prescribing',
    'labs':         'Labs',
    'vaccinations': 'Vaccinations',
    'documents':    'Documents',
    'comms':        'Comms',
    'templates':    'Templates',
  };

  function currentRoute() {
    return window.location.hash.replace(/^#\//, '') || 'summary';
  }

  function navigate(route) {
    if (!routes[route]) route = 'summary';

    // Update sub-menu active state immediately
    document.querySelectorAll('.patient-submenu a[data-route]').forEach(function (a) {
      a.classList.toggle('active', a.dataset.route === route);
    });

    // Update page title
    document.title = (titles[route] || route) + ' — WANJIRU, Grace — ClearCare EHR';

    fetch(routes[route])
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      })
      .then(function (html) {
        var main = document.getElementById('main-content');
        main.innerHTML = html;
        main.scrollTop = 0;
        window.scrollTo(0, 0);
      })
      .catch(function () {
        document.getElementById('main-content').innerHTML =
          '<p style="padding:30px 0;color:var(--text-muted)">Module not available.</p>';
      });
  }

  window.addEventListener('hashchange', function () {
    navigate(currentRoute());
  });

  // Load the initial route on page load
  navigate(currentRoute());
})();
