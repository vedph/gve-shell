module.exports = {
  preset: "jest-preset-angular",
  setupFilesAfterEnv: ["<rootDir>/setup-jest.ts"],
  // globalSetup: "jest-preset-angular/global-setup",
  modulePathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/dist/"],
  moduleNameMapper: {
    "^@myrmidon/gve-(.*)$":
      "<rootDir>/projects/myrmidon/gve-$1/src/public-api.ts",
  },
  transformIgnorePatterns: ["node_modules/(?!@myrmidon|@angular)"],
  coverageReporters: ["html", "text", "lcovonly"],
};
