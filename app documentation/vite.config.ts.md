# vite.config.ts

## Purpose of the File
`vite.config.ts` configures the Vite frontend build tool and local development server. It sets up plugins for React, Tailwind CSS, React Compiler, and defines the local development reverse proxy that routes frontend `/api` requests to the Express backend running on `http://localhost:5000`.

---

## Line-by-Line Code Breakdown

- **L1–L4**: Imports `react` with `reactCompilerPreset`, Babel preset plugin from `@rolldown/plugin-babel`, `defineConfig` from `vite`, and `@tailwindcss/vite`.
- **L7–L12**: Configures Vite plugins:
  - `react()`: Enables JSX/TSX React support with Fast Refresh.
  - `tailwindcss()`: Integrates Tailwind CSS v4 Vite compiler.
  - `babel({ presets: [reactCompilerPreset()] })`: Integrates the React Compiler preset for automated component memoization.
- **L13–L20**: Configures the local development server proxy (`server.proxy`):
  - **L15–L18**: Maps any request matching `/api` to `target: 'http://localhost:5000'` with `changeOrigin: true`. This allows the React client on `localhost:5173` to make seamless fetch calls like `fetch('/api/chat/stream')` without encountering CORS blocks in development.
