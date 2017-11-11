const baseConfig = require('./jest.base.config');

module.exports = Object.assign(baseConfig, {
    "testMatch": [
        "<rootDir>/__tests__/*.(spec).(ts|tsx|js)"
    ]
});