<#import "template.ftl" as layout>

<@layout.page title="Connexion">

  <div class="vt-card-header">
    <h2 class="vt-card-title">Bon retour !</h2>
    <p class="vt-card-sub">Connectez-vous à votre espace VENTEC GRH</p>
  </div>

  <#-- ── Alert messages ── -->
  <#if message?has_content>
    <#assign msgType = message.type>
    <div class="vt-alert <#if msgType == 'error'>vt-alert-error<#elseif msgType == 'success'>vt-alert-success<#else>vt-alert-info</#if>"
         role="alert" aria-live="polite">
      <span class="vt-alert-icon">
        <#if msgType == 'error'>&#9888;<#elseif msgType == 'success'>&#10003;<#else>&#8505;</#if>
      </span>
      <span>${kcSanitize(message.summary)?no_esc}</span>
    </div>
  </#if>

  <#-- ── Login form ── -->
  <form id="kc-form-login" action="${url.loginAction}" method="post" novalidate>

    <#-- Username / Email -->
    <div class="vt-form-group">
      <label class="vt-label" for="username">
        <#if !realm.loginWithEmailAllowed>Nom d'utilisateur
        <#elseif !realm.registrationEmailAsUsername>Identifiant ou e-mail
        <#else>Adresse e-mail
        </#if>
      </label>
      <div class="vt-input-wrap">
        <span class="vt-input-icon" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
        </span>
        <input
          class="vt-input has-icon"
          id="username"
          name="username"
          type="text"
          autocomplete="username"
          autocapitalize="off"
          spellcheck="false"
          autofocus
          value="${login.username!''}"
          aria-required="true"
        />
      </div>
      <#if messagesPerField.existsError('username','password') && !messagesPerField.existsError('password')>
        <div class="vt-field-error">
          <span aria-hidden="true">&#9888;</span>
          ${kcSanitize(messagesPerField.getFirstError('username'))?no_esc}
        </div>
      </#if>
    </div>

    <#-- Password -->
    <div class="vt-form-group">
      <label class="vt-label" for="password">Mot de passe</label>
      <div class="vt-input-wrap">
        <span class="vt-input-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
        </span>
        <input
          class="vt-input has-icon has-toggle"
          id="password"
          name="password"
          type="password"
          autocomplete="current-password"
          aria-required="true"
        />
        <button class="vt-eye" type="button" data-eye="password" aria-label="Afficher le mot de passe">
          <svg class="eye-open" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          <svg class="eye-off" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        </button>
      </div>
      <#if messagesPerField.existsError('username','password')>
        <div class="vt-field-error">
          <span aria-hidden="true">&#9888;</span>
          ${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}
        </div>
      </#if>
    </div>

    <#-- Remember me + Forgot password -->
    <div class="vt-check-row">
      <#if realm.rememberMe && !usernameEditDisabled??>
        <label class="vt-check-label">
          <input type="checkbox" name="rememberMe" <#if login.rememberMe??>checked</#if>/>
          Se souvenir de moi
        </label>
      <#else>
        <span></span>
      </#if>

      <#if realm.resetPasswordAllowed>
        <a class="vt-forgot" href="${url.loginResetCredentialsUrl}">Mot de passe oublié ?</a>
      </#if>
    </div>

    <input type="hidden" id="id-hidden-input" name="credentialId"
           <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>

    <button class="vt-btn vt-btn-primary" type="submit" name="login">
      Se connecter
      <span class="vt-btn-arrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </span>
    </button>

  </form>

</@layout.page>
