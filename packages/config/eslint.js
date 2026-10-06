import js from '@eslint/js';
import ts from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/generated/**',
      '**/next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        performance: 'readonly',
        AbortSignal: 'readonly',
        TextDecoder: 'readonly',
        Response: 'readonly',
        ReadableStream: 'readonly',
        TextEncoder: 'readonly',
        setTimeout: 'readonly',
      },
    },
  },
  {
    files: ['packages/**/*.{ts,tsx,js}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@kompri/web',
                '@kompri/web/**',
                '@kompri/api',
                '@kompri/api/**',
                '**/apps/**',
              ],
              message: 'Packages cannot depend on applications.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/{examiner,llm,content}/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@kompri/web',
                '@kompri/web/**',
                '@kompri/api',
                '@kompri/api/**',
                '**/apps/**',
                '@kompri/db',
                '**/db/**',
                '@nestjs/*',
                'next',
                'next/*',
                '@prisma/*',
              ],
              message:
                'Core modules must remain independent of apps, databases and frameworks.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/examiner/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', 'fetch'],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@kompri/web',
                '@kompri/web/**',
                '@kompri/api',
                '@kompri/api/**',
                '**/apps/**',
                '@kompri/db',
                '**/db/**',
                '@nestjs/*',
                'next',
                'next/*',
                '@prisma/*',
                'node:*',
                'axios',
                'undici',
              ],
              message: 'Examiner I/O must be injected.',
            },
          ],
        },
      ],
    },
  },
  prettier,
];
