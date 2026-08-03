<#import "template.ftl" as layout>

<@layout.page title="Erreur">

  <div style="text-align:center;padding:.5rem 0 1.5rem;">
    <div class="vt-info-icon" style="background:var(--error-bg);border-color:var(--error-border);" aria-hidden="true">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--error-text)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    </div>

    <h2 class="vt-card-title" style="margin-bottom:.5rem;color:var(--error-text);">
      Une erreur s'est produite
    </h2>

    <#if message?has_content>
      <div class="vt-alert vt-alert-error" style="text-align:left;margin-bottom:1.5rem;">
        <span class="vt-alert-icon">&#9888;</span>
        <span>${kcSanitize(message.summary)?no_esc}</span>
      </div>
    </#if>

    <#if client?? && client.baseUrl?has_content>
      <a class="vt-btn vt-btn-secondary" href="${client.baseUrl}"
         style="display:inline-flex;width:auto;padding:.7rem 2rem;margin-bottom:.75rem;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Retour à l'application
      </a><br/>
    </#if>

    <a class="vt-back" href="${url.loginUrl}" style="justify-content:center;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      Retour à la connexion
    </a>
  </div>

</@layout.page>
