module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: 'detect' },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
  overrides: [
    {
      // Node tooling that runs outside the browser bundle: build config, the
      // S3 deploy script, the smoke-test harness. `npm run lint` only covers
      // src/**, but editors lint whatever file is open — without this these
      // files light up with no-undef on require/module/process/__dirname.
      files: ['*.js', '*.cjs', 'dev/**/*.js', 'scripts/**/*.js'],
      env: { node: true },
      parserOptions: { sourceType: 'script' },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    {
      // Same, but ESM.
      files: ['*.mjs', 'scripts/**/*.mjs'],
      env: { node: true },
      parserOptions: { sourceType: 'module' },
    },
    {
      // The smoke test installs jsdom's window/document onto `global`
      // (dev/smoke-test.js:11-17), so browser globals are real here.
      files: ['dev/**/*.js'],
      env: { node: true, browser: true },
    },
  ],
};
