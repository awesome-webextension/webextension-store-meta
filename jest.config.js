module.exports = {
  testEnvironment: "node",
  collectCoverageFrom: [
    "lib/**/*.js",
    "!lib/**/fixtures.js",
    "!**/node_modules/**",
  ],
};
