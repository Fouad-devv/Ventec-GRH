<#macro page title bodyClass="">
<!DOCTYPE html>
<html lang="${locale.currentLanguageTag}" data-theme="dark">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="robots" content="noindex, nofollow"/>
  <title>${title} – VENTEC GRH</title>

  <#-- Google Fonts: Inter -->
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>

  <link rel="stylesheet" href="${url.resourcesPath}/css/styles.css"/>
</head>
<body>

<div class="vt-page">

  <!-- ambient orbs -->
  <div class="vt-orb vt-orb-cyan"   aria-hidden="true"></div>
  <div class="vt-orb vt-orb-purple" aria-hidden="true"></div>
  <div class="vt-orb vt-orb-cyan2"  aria-hidden="true"></div>

  <!-- dot pattern -->
  <div class="vt-dots" aria-hidden="true"></div>

  <!-- theme toggle -->
  <button class="vt-toggle" id="themeToggle" aria-label="Toggle theme" type="button">
    <span class="icon-sun"  aria-hidden="true">&#9728;</span>
    <span class="icon-moon" aria-hidden="true">&#9790;</span>
  </button>

  <!-- ── Left branding panel ── -->
  <aside class="vt-brand">
    <div class="vt-brand-logo">
      <div class="vt-brand-logo-box">V</div>
      <span class="vt-brand-name">VENTEC <span>GRH</span></span>
    </div>

    <h1 class="vt-brand-headline">
      Gérez vos<br/><span>Ressources Humaines</span><br/>avec intelligence
    </h1>
    <p class="vt-brand-sub">
      Plateforme intégrée de gestion du personnel — congés, paie, présences, et bien plus.
    </p>

    <ul class="vt-features">
      <li class="vt-feature"><span class="vt-feature-dot"></span>Gestion des congés et absences</li>
      <li class="vt-feature"><span class="vt-feature-dot"></span>Suivi des présences en temps réel</li>
      <li class="vt-feature"><span class="vt-feature-dot"></span>Tableaux de bord analytiques</li>
      <li class="vt-feature"><span class="vt-feature-dot"></span>Accès sécurisé et centralisé</li>
    </ul>

    <div class="vt-trust">
      <span class="vt-trust-dot">&#9679;</span>
      Connexion sécurisée · Réseau interne VENTEC
    </div>
  </aside>

  <!-- ── Right form panel ── -->
  <main class="vt-form-panel">
    <div class="vt-card">

      <!-- mobile-only logo -->
      <div class="vt-mobile-logo">
        <div class="vt-brand-logo-box">V</div>
        <span class="vt-brand-name">VENTEC <span>GRH</span></span>
      </div>

      <#nested/>

    </div>
  </main>

</div><!-- .vt-page -->

<script>
(function () {
  var STORAGE_KEY = 'vt-theme';
  var html = document.documentElement;
  var btn  = document.getElementById('themeToggle');

  function setTheme(t) {
    html.setAttribute('data-theme', t);
    localStorage.setItem(STORAGE_KEY, t);
  }

  /* init: default dark unless saved */
  var saved = localStorage.getItem(STORAGE_KEY);
  setTheme(saved === 'light' ? 'light' : 'dark');

  btn && btn.addEventListener('click', function () {
    setTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  /* password visibility toggle */
  document.querySelectorAll('[data-eye]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var targetId = btn.getAttribute('data-eye');
      var input    = document.getElementById(targetId);
      if (!input) return;
      var isText = input.type === 'text';
      input.type = isText ? 'password' : 'text';
      btn.setAttribute('aria-label', isText ? 'Afficher le mot de passe' : 'Masquer le mot de passe');
      var eyeIcon = btn.querySelector('.eye-icon');
      if (eyeIcon) eyeIcon.textContent = isText ? '\u{1F441}' : '\u{1F648}';
    });
  });
})();
</script>

</body>
</html>
</#macro>
