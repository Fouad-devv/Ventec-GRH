<#import "template.ftl" as layout>

<@layout.page title="Information">

  <div style="text-align:center;padding:.5rem 0 1.5rem;">
    <#if message?has_content && message.type == 'success'>
      <div class="vt-info-icon success" aria-hidden="true">&#10003;</div>
    <#else>
      <div class="vt-info-icon" aria-hidden="true">&#8505;</div>
    </#if>

    <h2 class="vt-card-title" style="margin-bottom:.5rem;">
      <#if message?has_content && message.type == 'success'>
        E-mail envoyé !
      <#else>
        Information
      </#if>
    </h2>

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
      </a>
    <#elseif actionUri?has_content>
      <a class="vt-btn vt-btn-primary" href="${actionUri}" style="display:inline-flex;width:auto;padding:.7rem 2rem;">
        Continuer
      </a>
    <#elseif client.baseUrl?has_content>
      <a class="vt-btn vt-btn-secondary" href="${client.baseUrl}" style="display:inline-flex;width:auto;padding:.7rem 2rem;">
        Retour à l'application
      </a>
    </#if>
  </div>

</@layout.page>
