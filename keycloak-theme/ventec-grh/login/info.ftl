<#import "template.ftl" as layout>

<@layout.page title="Information">

  <div style="text-align:center;padding:.5rem 0 1.5rem;">
    <#if message?has_content && message.type == 'success'>
      <div class="vt-info-icon success" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h2 class="vt-card-title" style="margin-bottom:.5rem;">E-mail envoyé !</h2>
    <#else>
      <div class="vt-info-icon" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
      </div>
      <h2 class="vt-card-title" style="margin-bottom:.5rem;">Information</h2>
    </#if>

    <#if message?has_content>
      <p style="color:var(--text-muted);font-size:.9rem;line-height:1.6;margin-bottom:1.5rem;">
        ${kcSanitize(message.summary)?no_esc}
      </p>
    </#if>

    <#if requiredActions??>
      <ul style="list-style:none;padding:0;margin-bottom:1.5rem;">
        <#list requiredActions as reqAction>
          <li style="color:var(--text-muted);font-size:.875rem;padding:.25rem 0;">
            ${kcSanitize(msg("requiredAction.${reqAction}"))?no_esc}
          </li>
        </#list>
      </ul>
    </#if>

    <#if skipLink??>
      <!-- intentionally empty -->
    <#elseif pageRedirectUri?has_content>
      <a class="vt-btn vt-btn-primary" href="${pageRedirectUri}" style="display:inline-flex;width:auto;padding:.7rem 2rem;">
        Continuer
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </a>
    <#elseif actionUri?has_content>
      <a class="vt-btn vt-btn-primary" href="${actionUri}" style="display:inline-flex;width:auto;padding:.7rem 2rem;">
        Continuer
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </a>
    <#elseif client.baseUrl?has_content>
      <a class="vt-btn vt-btn-secondary" href="${client.baseUrl}" style="display:inline-flex;width:auto;padding:.7rem 2rem;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Retour à l'application
      </a>
    </#if>
  </div>

</@layout.page>
