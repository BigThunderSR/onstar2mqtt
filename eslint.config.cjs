const globals = require("globals");
const js = require("@eslint/js");

module.exports = [
    {
        ignores: ["**/index.cjs"],
    },
    js.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.commonjs,
                ...globals.mocha,
            },
            ecmaVersion: 2022,
            sourceType: "commonjs",
        },
        rules: {
            "no-useless-assignment": "off",
        },
    },
];