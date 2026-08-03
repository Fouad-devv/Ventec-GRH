<#import "template.ftl" as layout>

<@layout.page title="Mot de passe oublié">

  <div class="vt-card-header">
    <h2 class="vt-card-title">Réinitialiser</h2>
    <p class="vt-card-sub">Entrez votre e-mail pour recevoir un lien de réinitialisation</p>
  </div>

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

  <form action="${url.loginAction}" method="post">

    <div class="vt-form-group">
      <label class="vt-label" for="username">
        <#if !realm.loginWithEmailAllowed>Nom d'utilisateur
        <#elseif !realm.registrationEmailAsUsername>Identifiant ou e-mail
        <#else>Adresse e-mail
        </#if>
      </label>
      <div class="vt-input-wrap">
        <span class="vt-input-icon" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>
        </span>
        <input
          class="vt-input has-icon"
          id="username"
          name="username"
          type="text"
          autocomplete="username"
          autofocus
          value="${auth.attemptedUsername!''}"
          aria-required="true"
        />
      </div>
      <#if messagesPerField.existsError('username')>
        <div class="vt-field-error">
          <span aria-hidden="true">&#9888;</span>
          ${kcSanitize(messagesPerField.getFirstError('username'))?no_esc}
        </div>
      </#if>
    </div>

    <button class="vt-btn vt-btn-primary" type="submit" style="margin-bottom:.75rem;">
      Envoyer le lien
      <span class="vt-btn-arrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </span>
    </button>

    <a class="vt-back" href="${url.loginUrl}">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      Retour à la connexion
    </a>

  </form>

</@layout.page>
