
module.exports = {
  // A map from regular expressions to paths to transformers
  transform: {
    '^.+\.(ts|tsx)$': 'ts-jest',
  },
  // The glob patterns Jest uses to detect test files
  testMatch: ['<rootDir>/apps/*/tests/**/*.test.(ts|js)'],
  // An array of regexp pattern strings that are matched against all source file paths,
  // matched files will skip transformation
  transformIgnorePatterns: ['<rootDir>/node_modules/'],
  // An array of file extensions your modules use
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,
  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: ['<rootDir>/apps/*/src/**/*.ts'],
  // The directory where Jest should output its coverage files
  coverageDirectory: '<rootDir>/coverage',
  // A list of paths to directories that Jest should use to search for files in
  moduleDirectories: ['node_modules', '<rootDir>'],
  // Enable `jest-watch-typeahead`
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  // Allows for a common setup for all test files
  setupFilesAfterEnv: [],
  // Module name mapper for paths, e.g., for @ztag/shared
  moduleNameMapper: {
    "^@ztag/shared/(.*)$": "<rootDir>/packages/shared/src/$1",
    "^@ztag/shared$": "<rootDir>/packages/shared/src/index.ts"
  }
};
