/**
 * Jest config for the backend integration suite (MAHAT chapter 14).
 *
 * This project is native ESM ("type": "module") and TypeScript source uses
 * explicit `.js` import specifiers. That forces two non-default settings:
 *
 *   1. ESM mode — ts-jest's `default-esm` preset + `useESM`, run under
 *      `NODE_OPTIONS=--experimental-vm-modules` (see the "test" npm script).
 *   2. `moduleNameMapper` strips the `.js` suffix off relative imports so
 *      Jest resolves `../src/app.js` to the actual `app.ts` on disk.
 *
 * A dedicated `tsconfig.jest.json` widens `rootDir` to include `tests/`
 * (the base tsconfig pins rootDir to `src`).
 */
/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true, tsconfig: 'tsconfig.jest.json' }],
  },
  setupFiles: ['<rootDir>/tests/setup-env.ts'],
  globalSetup: '<rootDir>/tests/globalSetup.ts',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  // Integration tests hit a real Postgres; give them headroom over the 5s default.
  testTimeout: 20_000,
}
