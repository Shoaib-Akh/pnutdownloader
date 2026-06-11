/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  transform: {
    '^.+\\.js$': '<rootDir>/tests/esmToCjsTransformer.cjs'
  },
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/shared/**/*.js',
    'src/main/services/**/*.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  verbose: true
}
