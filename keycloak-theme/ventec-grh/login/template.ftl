<#macro page title bodyClass="">
<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!'fr'}" data-theme="dark">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="robots" content="noindex, nofollow"/>
  <title>${title} – VENTEC GRH</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="${url.resourcesPath}/css/styles.css"/>
</head>
<body>

<div class="vt-page">

  <!-- Ambient orbs -->
  <div class="vt-orb vt-orb-cyan"   aria-hidden="true"></div>
  <div class="vt-orb vt-orb-purple" aria-hidden="true"></div>
  <div class="vt-orb vt-orb-cyan2"  aria-hidden="true"></div>
  <div class="vt-dots" aria-hidden="true"></div>

  <!-- Theme toggle -->
  <button class="vt-toggle" id="themeToggle" aria-label="Toggle theme" type="button">
    <!-- sun icon (shown in dark mode to switch to light) -->
    <svg class="icon-sun" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:none">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
    <!-- moon icon (shown in light mode to switch to dark) -->
    <svg class="icon-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  </button>

  <!-- ── Left branding panel ── -->
  <aside class="vt-brand">
    <div class="vt-brand-logo">
      <div class="vt-brand-logo-box">V</div>
      <span class="vt-brand-name">VENTEC <span>GRH</span></span>
    </div>

    <div class="vt-brand-badge">
      <span class="vt-badge-dot"></span>
      Plateforme RH · Application interne
    </div>

    <h1 class="vt-brand-headline">
      Simplifiez votre<br/>
      <span class="vt-grad-text">Recrutement</span><br/>
      avec intelligence
    </h1>
    <ul class="vt-features">
      <li class="vt-feature">
        <span class="vt-feature-check">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 6 5 9 10 3"/></svg>
        </span>
        Suivi des candidatures en temps réel
      </li>
      <li class="vt-feature">
        <span class="vt-feature-check">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 6 5 9 10 3"/></svg>
        </span>
        Scoring IA automatique des CVs
      </li>
      <li class="vt-feature">
        <span class="vt-feature-check">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 6 5 9 10 3"/></svg>
        </span>
        Pipeline RH structuré en 5 étapes
      </li>
      <li class="vt-feature">
        <span class="vt-feature-check">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 6 5 9 10 3"/></svg>
        </span>
        Accès sécurisé et centralisé
      </li>
    </ul>

    <div class="vt-trust">
      <span class="vt-trust-dot"></span>
      Connexion sécurisée · Réseau interne VENTEC
    </div>
  </aside>

  <!-- ── Right form panel ── -->
  <main class="vt-form-panel">
    <div class="vt-card-wrapper">
      <div class="vt-card">

        <!-- mobile-only logo -->
        <div class="vt-mobile-logo">
          <div class="vt-brand-logo-box">V</div>
          <span class="vt-brand-name">VENTEC <span>GRH</span></span>
        </div>

        <!-- status badge -->
        <div class="vt-status-badge">
          <span class="vt-status-dot"></span>
          Connexion sécurisée · Ventec GRH
        </div>

        <#nested/>

      </div>
    </div>
  </main>

</div><!-- .vt-page -->

<script>
(function () {
  var html = document.documentElement;
  var btn  = document.getElementById('themeToggle');
  var STORAGE_KEY = 'vt-theme';

  function applyTheme(t) {
    html.setAttribute('data-theme', t);
    localStorage.setItem(STORAGE_KEY, t);
    var sun  = btn && btn.querySelector('.icon-sun');
    var moon = btn && btn.querySelector('.icon-moon');
    if (sun)  sun.style.display  = (t === 'dark') ? '' : 'none';
    if (moon) moon.style.display = (t === 'dark') ? 'none' : '';
  }

  /* Priority:
     1. ui_theme URL param passed by the React app via keycloak.login({ extraQueryParams })
     2. Keycloak's own saved preference (vt-theme)
     3. OS / system preference
  */
  var urlTheme  = new URLSearchParams(window.location.search).get('ui_theme');
  var savedTheme = localStorage.getItem(STORAGE_KEY);
  var sysTheme  = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  applyTheme(urlTheme || savedTheme || sysTheme);

  btn && btn.addEventListener('click', function () {
    applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  /* password visibility toggle */
  document.querySelectorAll('[data-eye]').forEach(function (eyeBtn) {
    eyeBtn.addEventListener('click', function () {
      var targetId = eyeBtn.getAttribute('data-eye');
      var input    = document.getElementById(targetId);
      if (!input) return;
      var showing  = input.type === 'text';
      input.type   = showing ? 'password' : 'text';
      eyeBtn.setAttribute('aria-label', showing ? 'Afficher le mot de passe' : 'Masquer le mot de passe');
      var open = eyeBtn.querySelector('.eye-open');
      var off  = eyeBtn.querySelector('.eye-off');
      if (open) open.style.display = showing ? '' : 'none';
      if (off)  off.style.display  = showing ? 'none' : '';
    });
  });
})();
</script>

</body>
</html>
</#macro>
