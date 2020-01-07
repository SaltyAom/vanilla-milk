module.exports = {
    roots: ["<rootDir>"],
    transform: {
        "^.+\\.tsx?$": "ts-jest"
    },
    testRegex: "(/__tests__/.*|(\\.|/)(test))\\.ts?$",
    moduleFileExtensions: ["ts", "js", "json", "node"]
}
