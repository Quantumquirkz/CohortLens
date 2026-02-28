module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'tests',
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../src/$1',
    '^@cohortlens/contracts$': '<rootDir>/../../packages/contracts/src',
  },
  collectCoverageFrom: [
    '../src/**/*.(t|j)s',
  ],
  coverageDirectory: '../coverage-e2e',
};
