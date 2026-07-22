<#import "template.ftl" as layout>

<@layout.page title="Nouveau mot de passe">

  <div class="vt-card-header">
    <h2 class="vt-card-title">Nouveau mot de passe</h2>
    <p class="vt-card-sub">Choisissez un mot de passe sécurisé pour votre compte</p>
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
    <input type="text" name="username" autocomplete="username"
           value="${username!''}" readonly style="display:none;"/>

    <#-- New password -->
    <div class="vt-form-group">
      <label class="vt-label" for="password-new">Nouveau mot de passe</label>
      <div class="vt-input-wrap">
        <input
          class="vt-input has-toggle"
          id="password-new"
          name="password-new"
          type="password"
          autocomplete="new-password"
          autofocus
          aria-required="true"
        />
        <button class="vt-eye" type="button" data-eye="password-new" aria-label="Afficher le mot de passe">
          <span class="eye-icon">&#128065;</span>
        </button>
      </div>
      <#if messagesPerField.existsError('password')>
        <div class="vt-field-error">
          <span aria-hidden="true">&#9888;</span>
          ${kcSanitize(messagesPerField.getFirstError('password'))?no_esc}
        </div>
      </#if>
    </div>

    <#-- Confirm password -->
    <div class="vt-form-group">
      <label class="vt-label" for="password-confirm">Confirmer le mot de passe</label>
      <div class="vt-input-wrap">
        <input
          class="vt-input has-toggle"
          id="password-confirm"
          name="password-confirm"
          type="password"
          autocomplete="new-password"
          aria-required="true"
        />
        <button class="vt-eye" type="button" data-eye="password-confirm" aria-label="Afficher le mot de passe">
          <span class="eye-icon">&#128065;</span>
        </button>
      </div>
      <#if messagesPerField.existsError('password-confirm')>
        <div class="vt-field-error">
          <span aria-hidden="true">&#9888;</span>
          ${kcSanitize(messagesPerField.getFirstError('password-confirm'))?no_esc}
        </div>
      </#if>
    </div>

    <#if isAppInitiatedAction??>
      <div style="display:flex;gap:.75rem;margin-top:.25rem;">
        <button class="vt-btn vt-btn-primary" type="submit" name="login-actions-submit">
          Enregistrer
        </button>
        <button class="vt-btn vt-btn-secondary" type="submit" name="cancel-aia" value="true">
          Annuler
        </button>
      </div>
    <#else>
      <button class="vt-btn vt-btn-primary" type="submit">
        Enregistrer le mot de passe
      </button>
    </#if>

  </form>

</@layout.page>
