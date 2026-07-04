/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __APP_BUILD_ID__: string;

interface ImportMetaEnv {
  readonly VITE_WS_URL?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_FEEDBACK_FORM_BASE?: string;
  readonly VITE_FEEDBACK_ENTRY_PLAYERS?: string;
  readonly VITE_FEEDBACK_ENTRY_MINUTES?: string;
  readonly VITE_FEEDBACK_ENTRY_LEVELS?: string;
  readonly VITE_FEEDBACK_ENTRY_DIFFICULTY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
