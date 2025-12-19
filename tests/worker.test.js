const test = require("node:test");
const assert = require("node:assert/strict");

const {
  paginate,
  parseFeedGeneratorUri,
  getFeedGeneratorInfo,
} = require("../dist/worker.js");

test("paginate clamps negative cursor", () => {
  const { slice, nextCursor } = paginate([1, 2, 3], 2, "-2");
  assert.deepEqual(slice, [1, 2]);
  assert.equal(nextCursor, "2");
});

test("getFeedGeneratorInfo uses FEED_GENERATOR_URI did", () => {
  const env = {
    FEED_GENERATOR_URI: "at://did:plc:123/app.bsky.feed.generator/foo",
  };
  const info = getFeedGeneratorInfo(env, "https://example.com");
  assert.equal(info.did, "did:plc:123");
  assert.equal(info.uri, env.FEED_GENERATOR_URI);
});

test("getFeedGeneratorInfo uses FEED_GENERATOR_DID when no uri", () => {
  const env = {
    FEED_GENERATOR_DID: "did:plc:abc",
    FEED_RKEY: "rk",
  };
  const info = getFeedGeneratorInfo(env, "https://example.com");
  assert.equal(info.did, "did:plc:abc");
  assert.equal(info.uri, "at://did:plc:abc/app.bsky.feed.generator/rk");
});

test("parseFeedGeneratorUri rejects invalid format", () => {
  assert.equal(parseFeedGeneratorUri("not-a-uri"), undefined);
});
