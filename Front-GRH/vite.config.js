import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // Load ALL vars from the root .env (empty prefix = no filter)
  const env = loadEnv(mode, '../', '');

  return {
    envDir: '../',
    plugins: [react(), tailwindcss()],
    define: {
      // Derive Vite-exposed vars from the shared backend vars so .env has no duplicates
      'import.meta.env.VITE_KEYCLOAK_REALM': JSON.stringify(env.KEYCLOAK_REALM),
      'import.meta.env.VITE_KEYCLOAK_CLIENT_ID': JSON.stringify(env.KEYCLOAK_CLIENT_ID),
    },
  };
});
