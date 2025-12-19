/**
 * ESLint Flat Config (ESLint v9+)
 *
 * Next.js 16 ships `eslint-config-next` as a flat-config-compatible export.
 * We keep config minimal and let Next provide the recommended rules.
 */

const next = require("eslint-config-next");

module.exports = [
  // Next provides an array of flat configs: base + TS + default ignores
  ...next,
  // Next 16's React hooks plugin includes some very strict rules that can flag
  // common patterns in this codebase (e.g. one-time initialization effects).
  // We keep the rest of the Next defaults intact.
  {
    name: "sword/overrides",
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
];


