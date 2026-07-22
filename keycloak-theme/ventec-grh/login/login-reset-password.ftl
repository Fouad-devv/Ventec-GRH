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
        <input
          class="vt-input"
          id="username"
          name="username"
          type="text"
          autocomplete="username"
          autofocus
          value="${(auth.attemptedUsername!'')?html}"
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
    </button>

    <a class="vt-back" href="${url.loginUrl}">
      &#8592; Retour à la connexion
    </a>

  </form>

</@layout.page>
