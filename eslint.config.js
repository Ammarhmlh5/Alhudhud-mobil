// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "gateway/*", "node_modules/*"],
  },
  {
    rules: {
      // Enforce type safety
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],

      // React hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Console — allow warn/error in dev, restrict in prod
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Code quality
      'no-unused-expressions': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
]);
