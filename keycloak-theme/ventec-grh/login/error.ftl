<#import "template.ftl" as layout>

<@layout.page title="Erreur">

  <div style="text-align:center;padding:.5rem 0 1.5rem;">
    <div class="vt-info-icon" aria-hidden="true"
         style="background:var(--error-bg);border-color:var(--error-border);margin:0 auto 1.5rem;">
      &#9888;
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
        &#8592; Retour à l'application
      </a>
    </#if>

    <br/>
    <a class="vt-back" href="${url.loginUrl}" style="justify-content:center;">
      &#8592; Retour à la connexion
    </a>
  </div>

</@layout.page>
