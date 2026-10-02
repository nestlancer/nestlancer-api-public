// @ts-check

/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        // Type must be one of the defined values
        'type-enum': [
            2,
            'always',
            [
                'feat',
                'fix',
                'chore',
                'docs',
                'refactor',
                'test',
                'ci',
                'perf',
                'build',
                'revert',
                'style',
            ],
        ],
        // Subject must be lower-case
        'subject-case': [2, 'always', 'lower-case'],
        // Header max length
        'header-max-length': [2, 'always', 100],
        // Body max line length
        'body-max-line-length': [1, 'always', 200],
        // Scope should be lower-case
        'scope-case': [2, 'always', 'lower-case'],
        // Scope can match service/lib names
        'scope-enum': [
            1,
            'always',
            [
                // Gateways
                'gateway',
                'ws-gateway',
                // Services
                'auth',
                'users',
                'requests',
                'quotes',
                'projects',
                'progress',
                'payments',
                'messaging',
                'notifications',
                'media',
                'portfolio',
                'blog',
                'contact',
                'admin',
                'webhooks',
                'health',
                // Workers
                'email-worker',
                'notification-worker',
                'audit-worker',
                'media-worker',
                'analytics-worker',
                'webhook-worker',
                'cdn-worker',
                'outbox-poller',
                // Libraries
                'common',
                'config',
                'database',
                'cache',
                'queue',
                'outbox',
                'auth-lib',
                'logger',
                'metrics',
                'tracing',
                'health-lib',
                'idempotency',
                'audit',
                'alerts',
                'middleware',
                'storage',
                'mail',
                'crypto',
                'websocket',
                'pdf',
                'search',
                'circuit-breaker',
                'turnstile',
                'testing',
                // Infrastructure
                'docker',
                'k8s',
                'terraform',
                'ci',
                'prisma',
                'deps',
                'root',
            ],
        ],
    },
};
