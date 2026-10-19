/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEPLOY_API_URL?: string
  readonly VITE_AUTH_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'https://esm.sh/@codemirror/*'

declare module 'https://esm.sh/@lezer/*'
