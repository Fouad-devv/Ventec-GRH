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
        <input
          class="vt-input"
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
        <input
          class="vt-input has-toggle"
          id="password"
          name="password"
          type="password"
          autocomplete="current-password"
          aria-required="true"
        />
        <button class="vt-eye" type="button" data-eye="password" aria-label="Afficher le mot de passe">
          <span class="eye-icon">&#128065;</span>
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

    <#-- Hidden fields -->
    <input type="hidden" id="id-hidden-input" name="credentialId"
           <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>

    <button class="vt-btn vt-btn-primary" type="submit" name="login">
      Se connecter
    </button>

  </form>

</@layout.page>
