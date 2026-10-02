// @ts-check

/** @type {import('eslint').Linter.Config} */
module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
        ecmaVersion: 2021,
    },
    plugins: ['@typescript-eslint', 'import', 'prettier'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:import/typescript',
        'plugin:prettier/recommended',
    ],
    env: {
        node: true,
        jest: true,
        es2021: true,
    },
    ignorePatterns: [
        'dist/',
        'coverage/',
        'node_modules/',
        '.turbo/',
        'prisma/generated/',
        '*.js',
        '!.eslintrc.js',
        '!commitlint.config.js',
    ],
    rules: {
        // TypeScript
        '@typescript-eslint/no-unused-vars': [
            'warn',
            {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
            },
        ],
        '@typescript-eslint/explicit-function-return-type': [
            'warn',
            {
                allowExpressions: true,
                allowTypedFunctionExpressions: true,
                allowHigherOrderFunctions: true,
                allowDirectConstAssertionInArrowFunctions: true,
            },
        ],
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-empty-interface': 'warn',
        '@typescript-eslint/no-inferrable-types': 'off',

        // Import ordering
        'import/order': [
            'warn',
            {
                groups: [
                    'builtin',
                    'external',
                    'internal',
                    ['parent', 'sibling'],
                    'index',
                    'object',
                    'type',
                ],
                pathGroups: [
                    {
                        pattern: '@nestjs/**',
                        group: 'external',
                        position: 'before',
                    },
                    {
                        pattern: '@nestlancer/**',
                        group: 'internal',
                        position: 'before',
                    },
                ],
                pathGroupsExcludedImportTypes: ['builtin'],
                'newlines-between': 'always',
                alphabetize: {
                    order: 'asc',
                    caseInsensitive: true,
                },
            },
        ],
        'import/no-duplicates': 'error',

        // General
        'no-console': 'warn',
        'no-return-await': 'error',
        'no-throw-literal': 'error',
        'prefer-const': 'error',
        'no-var': 'error',
        eqeqeq: ['error', 'always'],

        // Prettier
        'prettier/prettier': [
            'error',
            {},
            {
                usePrettierrc: true,
            },
        ],
    },
    overrides: [
        {
            files: ['**/*.spec.ts', '**/*.test.ts', '**/tests/**/*.ts'],
            rules: {
                '@typescript-eslint/no-explicit-any': 'off',
                '@typescript-eslint/explicit-function-return-type': 'off',
                'no-console': 'off',
            },
        },
    ],
};
