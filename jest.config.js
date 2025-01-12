module.exports = {
  preset: "jest-preset-angular",
  setupFilesAfterEnv: ["<rootDir>/setup-jest.ts"],
  globalSetup: "jest-preset-angular/global-setup",
  modulePathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/dist/"],
  moduleNameMapper: {
    "^@myrmidon/gve-snapshot-view$":
      "<rootDir>/node_modules/@myrmidon/gve-snapshot-view",
    "^@myrmidon/gve-(.*)$":
      "<rootDir>/projects/myrmidon/gve-$1/src/public-api.ts",
  },
  coverageReporters: ["html", "text", "lcovonly"],
};
