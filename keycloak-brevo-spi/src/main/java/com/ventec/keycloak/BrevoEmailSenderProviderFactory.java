package com.ventec.keycloak;

import org.keycloak.Config;
import org.keycloak.email.EmailSenderProvider;
import org.keycloak.email.EmailSenderProviderFactory;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;

public class BrevoEmailSenderProviderFactory implements EmailSenderProviderFactory {

    @Override
    public EmailSenderProvider create(KeycloakSession session) {
        return new BrevoEmailSenderProvider();
    }

    @Override
    public String getId() {
        return "smtp";
    }

    @Override
    public void init(Config.Scope config) {}

    @Override
    public void postInit(KeycloakSessionFactory factory) {}

    @Override
    public void close() {}
}
