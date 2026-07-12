/**
 * Jest config — pure logic only (§4): the rules engine, exporters, date math.
 * No UI tests in v1, so no jest-expo / react-native preset needed; tests run
 * on plain Node, which keeps them fast on an 8 GB machine.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/logic'],
};
