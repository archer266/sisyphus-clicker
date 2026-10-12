import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  plugins: [{
    name: 'offline-desktop-csp', apply: 'build',
    transformIndexHtml() {
      return [{tag:'meta',attrs:{'http-equiv':'Content-Security-Policy',content:"default-src 'self' blob: data:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'self'"},injectTo:'head-prepend'}];
    }
  }]
});
