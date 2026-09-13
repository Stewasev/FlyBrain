import assert from "node:assert/strict";
import { parseHash, serializeHash } from "../web/js/hash.js";

assert.deepEqual(parseHash(""), { tour: null, step: null, id: null, color: null, type: null, live: null, embed: false });
assert.deepEqual(parseHash("#t=dimorphism&s=2"), {
  tour: "dimorphism",
  step: 2,
  id: null,
  color: null,
  type: null,
  live: null,
  embed: false,
});
assert.deepEqual(parseHash("#id=12781&c=fruDsx"), {
  tour: null,
  step: null,
  id: 12781,
  color: "fruDsx",
  type: null,
  live: null,
  embed: false,
});
assert.equal(parseHash("#live=vision").live, "vision");
assert.equal(serializeHash({ live: "walk" }), "#live=walk");
assert.equal(parseHash("#type=pC1_1a").type, "pC1_1a");
assert.equal(serializeHash({ type: "pC1_1a" }), "#type=pC1_1a");
assert.equal(parseHash("#c=nope").color, null);

assert.equal(serializeHash({}), "");
assert.equal(serializeHash({ color: "superclass" }), "");
assert.equal(serializeHash({ tour: "courtship", step: 0, color: "superclass" }), "#t=courtship&s=0");
assert.equal(serializeHash({ id: 12781, color: "dimorphism" }), "#id=12781&c=dimorphism");

const round = "#t=vision&s=1&id=99&c=nt";
assert.deepEqual(parseHash(serializeHash(parseHash(round))), parseHash(round));

console.log("ok");
