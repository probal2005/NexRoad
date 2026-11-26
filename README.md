# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Local demo login

Create dedicated demo users in your local Supabase Auth instance with the emails shown on the login page. Use their local test passwords in the ignored `.env.development.local` file.

```dotenv
VITE_LOCAL_DEMO_CUSTOMER_PASSWORD=
VITE_LOCAL_DEMO_TECHNICIAN_PASSWORD=
VITE_LOCAL_DEMO_ADMIN_PASSWORD=
```

Restart Vite and open the app on localhost. When the app and Supabase both use loopback URLs, a configured demo button fills and displays that account's password. Use the eye button to hide it again. The public app offers password-free role previews with sample data. Keep production credentials out of all `VITE_*` variables.
