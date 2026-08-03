import type { Config } from 'jest';
import { createEsmPreset } from 'jest-preset-angular/presets/index.js';

const preset = createEsmPreset({diagnostics: false});

const config: Config = {
  ...preset,
  resolver: '<rootDir>/jest.resolver.cjs',
  setupFilesAfterEnv: ['<rootDir>/src/setup.jest.ts'],
  testMatch: ['**/+(*.)+(spec).+(ts)'],
  transformIgnorePatterns: ['node_modules/(?!.*tslib)'],
  moduleNameMapper: {
    ...preset.moduleNameMapper,
    '^@core/(.*)$': '<rootDir>/src/app/core/$1',
    '^@layouts/(.*)$': '<rootDir>/src/app/layouts/$1',
    '^@features/(.*)$': '<rootDir>/src/app/features/$1',
    '^@shared/(.*)$': '<rootDir>/src/app/shared/$1',
  },
};

export default config;
