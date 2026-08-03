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
        <span class="vt-input-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
        </span>
        <input
          class="vt-input has-icon has-toggle"
          id="password-new"
          name="password-new"
          type="password"
          autocomplete="new-password"
          autofocus
          aria-required="true"
        />
        <button class="vt-eye" type="button" data-eye="password-new" aria-label="Afficher le mot de passe">
          <svg class="eye-open" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          <svg class="eye-off" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
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
        <span class="vt-input-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
        </span>
        <input
          class="vt-input has-icon has-toggle"
          id="password-confirm"
          name="password-confirm"
          type="password"
          autocomplete="new-password"
          aria-required="true"
        />
        <button class="vt-eye" type="button" data-eye="password-confirm" aria-label="Afficher le mot de passe">
          <svg class="eye-open" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          <svg class="eye-off" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
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
          <span class="vt-btn-arrow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </span>
        </button>
        <button class="vt-btn vt-btn-secondary" type="submit" name="cancel-aia" value="true">
          Annuler
        </button>
      </div>
    <#else>
      <button class="vt-btn vt-btn-primary" type="submit">
        Enregistrer le mot de passe
        <span class="vt-btn-arrow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </span>
      </button>
    </#if>

  </form>

</@layout.page>
