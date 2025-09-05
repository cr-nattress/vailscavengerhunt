/// <reference types="vite/client" />

// Augment the Vite env typing with our custom variables
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

// Ensure ImportMeta has the env property available
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
