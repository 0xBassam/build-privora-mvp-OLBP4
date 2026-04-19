module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2021,
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': 'off',
    'no-process-exit': 'off',
    eqeqeq: ['error', 'always'],
    'no-var': 'error',
    'prefer-const': 'warn',
    curly: ['error', 'all'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
  },
  ignorePatterns: ['node_modules/', 'coverage/', 'test-report/'],
};
