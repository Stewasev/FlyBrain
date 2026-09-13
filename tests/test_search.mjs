import assert from "node:assert/strict";
import { neuronsOfType, searchCatalog } from "../web/js/search.js";

const strings = { type: ["", "pC1_1a", "pC1_16b", "LPC1", "T4a"] };
const neurons = [
  { id: 10, type: 1, hasSoma: 1 },
  { id: 11, type: 1, hasSoma: 1 },
  { id: 12, type: 2, hasSoma: 1 },
  { id: 13, type: 3, hasSoma: 1 },
  { id: 14, type: 4, hasSoma: 0 },
  { id: 99, type: 4, hasSoma: 1 },
];

assert.equal(searchCatalog(neurons, strings, "10").exact.id, 10);
assert.deepEqual(searchCatalog(neurons, strings, "pC1").types.map((t) => t.type), ["pC1_1a", "pC1_16b"]);
assert.equal(searchCatalog(neurons, strings, "pC1").types[0].soma, 2);
assert.ok(!searchCatalog(neurons, strings, "pC1").types.some((t) => t.type === "LPC1"));
assert.equal(neuronsOfType(neurons, strings, "T4a").map((n) => n.id).join(), "99");
assert.deepEqual(searchCatalog(neurons, strings, "").types, []);
console.log("ok");
