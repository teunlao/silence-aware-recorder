import type { Config } from 'jest';

const config: Config = {
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  moduleFileExtensions: ['ts', 'js', 'tsx', 'jsx'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testMatch: [
    '**/__tests__/**/*.(ts|js|tsx|jsx)',
    '**/?(*.)(spec|test).ts?(x)',
  ],
  testEnvironment: 'node',
};

export default config;
