import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist*',
      'src/components/reui/*',
      '!src/components/reui/primitives',
      '!src/components/reui/primitives/**',
      '!src/components/reui/utils',
      '!src/components/reui/utils/**',
      '!src/components/reui/{toast,toast-api,toast-context,use-toast,theme-color-picker,confirm-dialog,error-boundary}.{ts,tsx}',
      'src/app/private/**',
      'src/plugins/**',
      'src/modules/*',
      '!src/modules/base',
      '!src/modules/base/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true, allowExportNames: ['buttonVariants'] },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['tests/**/*.{js,mjs,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ['scripts/**/*.{js,mjs,ts}'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['tests/creator-allocation.test.mjs'],
    rules: {
      'no-loss-of-precision': 'off',
    },
  },
  {
    files: ['src/modules/**/views/data/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['src/components/reui/primitives/*.{ts,tsx}'],
    rules: {
      // Registry primitives intentionally co-export their corresponding hook/variant API.
      // These files are ReUI registry primitives; their upstream API intentionally
      // co-exports component factories, hooks and variant helpers.
      'react-refresh/only-export-components': 'off',
    },
  },
)
