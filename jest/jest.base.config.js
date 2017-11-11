const path = require('path');
const rootDir = path.join(__dirname, '..');

module.exports = {
    "rootDir": rootDir,
    "testEnvironment": "node",
    "moduleFileExtensions": [
        "ts",
        "tsx",
        "js"
    ],
    "transform": {
        "^.+\\.(ts|tsx)$": "<rootDir>/node_modules/ts-jest/preprocessor.js"
    },
    "testPathIgnorePatterns": [
        "/node_modules/",
        "/playground/"
    ]
};