/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend origin, e.g. http://localhost:8000. */
  readonly VITE_API_BASE_URL?: string;
  /** "true" to use the in-memory mock instead of the backend. */
  readonly VITE_USE_MOCK_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
