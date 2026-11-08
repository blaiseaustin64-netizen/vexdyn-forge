/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEPLOY_API_URL?: string
  readonly VITE_AUTH_API_URL?: string
  /** Injected at build time for production update detection */
  readonly VITE_APP_BUILD_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'https://esm.sh/@codemirror/*'

declare module 'https://esm.sh/@lezer/*'
