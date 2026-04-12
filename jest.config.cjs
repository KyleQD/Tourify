/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@tourify/api-contracts$': '<rootDir>/packages/api-contracts/src/index.ts',
  },
  testMatch: [
    '<rootDir>/lib/**/__tests__/**/*.test.ts',
    '<rootDir>/lib/**/*.test.ts',
    '<rootDir>/app/api/**/__tests__/**/*.test.ts',
  ],
}
