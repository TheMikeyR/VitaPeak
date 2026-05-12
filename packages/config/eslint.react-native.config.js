import base from './eslint.config.js';
import globals from 'globals';

export default [
  ...base,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, __DEV__: 'readonly' },
    },
  },
];
