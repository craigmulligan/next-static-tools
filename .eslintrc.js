module.exports = {
  env: {
    node: true,
    browser: true,
    es6: true,
    jest: true
  },
  parser: "babel-eslint",
  parserOptions: {
    ecmaVersion: 8,
    ecmaFeatures: {
      jsx: true,
      experimentalObjectRestSpread: true
    },
    sourceType: 'module',
  },
  plugins: ['react'],
  extends: ['eslint:recommended', 'prettier', 'plugin:react/recommended'],
  rules: {
    'linebreak-style': ['error', 'unix']
  }
}
