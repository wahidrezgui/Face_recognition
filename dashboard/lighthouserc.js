module.exports = {
  ci: {
    collect: {
      url: ["http://localhost:3000/login", "http://localhost:3000/dashboard"],
      numberOfRuns: 1,
      startServerCommand: "npm run start",
      startServerReadyPattern: "Ready",
      startServerReadyTimeout: 120000,
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.7 }],
        "categories:accessibility": ["warn", { minScore: 0.9 }],
      },
    },
  },
};
