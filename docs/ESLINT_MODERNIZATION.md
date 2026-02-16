# ESLint Configuration Modernization

## Summary

Modernized the ESLint configuration to use native flat config directly, removing all legacy compatibility layers. This eliminates blockers for future ESLint v10 migration and reduces devDependencies significantly.

## Changes Made

### 1. Removed `FlatCompat` / `@eslint/eslintrc`

**Before:** Used `FlatCompat` from `@eslint/eslintrc` to bridge the old eslintrc configuration format, solely to access `eslint:recommended`:

```js
const { FlatCompat } = require("@eslint/eslintrc");
const compat = new FlatCompat({ ... });
module.exports = [
    ...compat.extends("eslint:recommended"),
    { ... }
];
```

**After:** Uses `js.configs.recommended` directly from `@eslint/js`, which is the native flat config way:

```js
const js = require("@eslint/js");
module.exports = [
    js.configs.recommended,
    { ... }
];
```

### 2. Removed Babel Parser and Plugin

**Before:** Used `@babel/eslint-parser` and `@babel/eslint-plugin` with a `.babelrc` config file.

**After:** Removed entirely. The codebase is plain CommonJS Node.js — no JSX, no experimental syntax, no transpilation. ESLint's built-in parser handles it natively.

**Files removed:**

- `.babelrc`

**Packages removed:**

- `@babel/eslint-parser`
- `@babel/eslint-plugin`
- `@babel/plugin-syntax-class-properties`
- `@babel/preset-env`

### 3. Removed Unused ESLint Plugins

**`eslint-plugin-import`** — Was registered in the config via `fixupPluginRules()` but had zero rules enabled. Provided no value.

**`eslint-plugin-n`** and **`eslint-plugin-promise`** — Were listed in `devDependencies` but never referenced in `eslint.config.cjs` at all.

**Packages removed:**

- `eslint-plugin-import`
- `eslint-plugin-n`
- `eslint-plugin-promise`
- `@eslint/compat` (only needed for `fixupPluginRules`)

### 4. Fixed `sourceType` and `ecmaVersion`

| Setting       | Before     | After        | Reason                                              |
| ------------- | ---------- | ------------ | --------------------------------------------------- |
| `sourceType`  | `"module"` | `"commonjs"` | All source files use `require()` / `module.exports` |
| `ecmaVersion` | `2018`     | `2022`       | Node.js 22 supports well beyond ES2018              |

### 5. Removed Unnecessary Global Declarations

**Before:**

```js
globals: {
    ...globals.node,
    ...globals.browser,
    ...Object.fromEntries(Object.entries(globals.browser).map(([key]) => [key, "off"])),
    ...globals.commonjs,
    ...globals.mocha,
    setInterval: "readonly",
    clearInterval: "readonly",
}
```

**After:**

```js
globals: {
    ...globals.node,
    ...globals.commonjs,
    ...globals.mocha,
}
```

- `globals.browser` was added then immediately overridden to `"off"` — a no-op.
- `setInterval` / `clearInterval` are already included in `globals.node`.

### 6. Fixed Super-Linter CI Workflow

Removed `ESLINT_USE_FLAT_CONFIG: false` from `.github/workflows/super-linter.yml`. This line was forcing ESLint to look for the legacy `.eslintrc.*` format, which conflicts with the project's `eslint.config.cjs`. Flat config is the default in ESLint v9+.

## DevDependencies Before vs After

### Removed (9 packages)

- `@babel/eslint-parser`
- `@babel/eslint-plugin`
- `@babel/plugin-syntax-class-properties`
- `@babel/preset-env`
- `@eslint/compat`
- `@eslint/eslintrc`
- `eslint-plugin-import`
- `eslint-plugin-n`
- `eslint-plugin-promise`

### Remaining (5 packages)

- `@eslint/js`
- `c8`
- `eslint`
- `globals`
- `mocha`

**Net result:** 243 packages pruned from `node_modules`.

## ESLint v10 Readiness

This modernization removes the primary blockers for a future ESLint v10 upgrade:

| ESLint v10 Requirement               | Status                               |
| ------------------------------------ | ------------------------------------ |
| No old config format / `FlatCompat`  | Solved                               |
| No `ESLINT_USE_FLAT_CONFIG=false`    | Solved                               |
| No `eslint-env` comments in source   | Already clean                        |
| Node.js >= v20.19                    | Using Node.js 22                     |
| Plugin peer dependency compatibility | No third-party ESLint plugins remain |

**Remaining v10 considerations** (for when upgrading `eslint` and `@eslint/js` to v10):

- `eslint:recommended` adds 3 new rules: `no-unassigned-vars`, `no-useless-assignment`, `preserve-caught-error`.
  - `no-useless-assignment` has been disabled in `eslint.config.cjs` to preserve intentional clarity assignments in `src/index.js`.
  - The other two rules produced no violations in the current codebase.
- Config lookup algorithm changes (searches from file, not cwd) — unlikely to affect this project since `eslint.config.cjs` is at the repo root.

## Additional Notes

- `package-lock.json` was regenerated from scratch after the dependency removal to eliminate any orphaned entries.
- Renovate and Dependabot configs are generic and required no changes — they will simply stop proposing updates for the removed packages.
- The `Dockerfile` uses `npm ci --omit=dev`, so it was never affected by devDependency changes. Docker build confirmed successful.

## Verification

All checks pass after these changes:

| Check                                                      | Result                                         |
| ---------------------------------------------------------- | ---------------------------------------------- |
| `npx eslint src test`                                      | 0 errors                                       |
| `npm test`                                                 | 436/436 passing                                |
| `npm run coverage`                                         | 93.96% statement coverage                      |
| Docker build                                               | Succeeds                                       |
| Lint rules (old vs new)                                    | Identical — same 61 `eslint:recommended` rules |
| All source file `require()` chains                         | Resolve correctly                              |
| All 9 production dependencies                              | Resolve correctly                              |
| Stale references to removed packages                       | None in active code                            |
| CI workflows (`ci.yml`, `ci-test.yml`, `super-linter.yml`) | No issues                                      |
| Renovate / Dependabot configs                              | No package-specific refs to removed deps       |
