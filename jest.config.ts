export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/tests/**/*.spec.ts'],
  setupFilesAfterEnv: ['reflect-metadata'], // Add this line
};
