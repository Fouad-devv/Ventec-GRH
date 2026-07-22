import { createContext, useContext, useEffect, useRef, useState } from 'react';
import keycloak from '../keycloak/keycloak';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading]           = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    keycloak
      .init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
        pkceMethod: 'S256',
        checkLoginIframe: false,
      })
      .then((authenticated) => {
        setIsAuthenticated(authenticated);
        setIsLoading(false);

        if (authenticated) {
          // Refresh the token proactively before it expires
          setInterval(() => {
            keycloak.updateToken(70).catch(() => keycloak.logout());
          }, 60_000);
        }
      })
      .catch(() => setIsLoading(false));
  }, []);

  const login  = ()     => keycloak.login();
  const logout = ()     => keycloak.logout({ redirectUri: window.location.origin });
  const getToken = ()   => keycloak.token;
  const hasRole  = (role) =>
    keycloak.hasRealmRole(role) ||
    keycloak.hasResourceRole(role, import.meta.env.VITE_KEYCLOAK_CLIENT_ID);

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isAuthenticated,
        login,
        logout,
        getToken,
        hasRole,
        userInfo: keycloak.tokenParsed ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
