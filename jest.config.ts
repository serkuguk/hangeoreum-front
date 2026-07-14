import type { Config } from 'jest';
import { createCjsPreset } from 'jest-preset-angular/presets/index.js';

const config: Config = {
  ...createCjsPreset(),
  setupFilesAfterEnv: ['<rootDir>/src/setup.jest.ts'],
  testMatch: ['**/+(*.)+(spec).+(ts)'],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@pages/(.*)$': '<rootDir>/src/app/features/$1',
    '^@core/(.*)$': '<rootDir>/src/app/core/$1',
    '^@layouts/(.*)$': '<rootDir>/src/app/layouts/$1',
    '^@features/(.*)$': '<rootDir>/src/app/features/$1',
    '^@components/(.*)$': '<rootDir>/src/app/components/$1',
    '^@shared/(.*)$': '<rootDir>/src/app/shared/$1',
  },
};

export default config;
