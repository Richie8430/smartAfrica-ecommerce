import type { Config } from 'jest';

const transform = {
  '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }] as [string, Record<string, unknown>],
};

const moduleNameMapper = {
  // isomorphic-dompurify → jsdom → @exodus/bytes uses ESM export{} syntax that
  // Jest's CommonJS mode can't parse.  Redirect to a CJS-compatible stub.
  '^isomorphic-dompurify$':           '<rootDir>/tests/__mocks__/isomorphic-dompurify.ts',
  '^@/(.*)$':             '<rootDir>/src/$1',
  '^(\\.{1,2}/.*)\\.js$': '$1',
};

const config: Config = {
  testTimeout: 30000,

  projects: [
    {
      displayName:     'unit',
      preset:          'ts-jest',
      testEnvironment: 'node',
      testMatch:       ['<rootDir>/tests/unit/**/*.test.ts'],
      moduleNameMapper,
      transform,
    },
    {
      displayName:        'integration',
      preset:             'ts-jest',
      testEnvironment:    'node',
      testMatch:          [
        '<rootDir>/tests/integration/**/*.test.ts',
        '<rootDir>/tests/security/**/*.test.ts',
      ],
      setupFiles:         ['<rootDir>/tests/global-env-setup.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      moduleNameMapper,
      transform,
    },
  ],

  collectCoverageFrom: ['src/**/*.ts', '!src/types/**'],
};

export default config;
