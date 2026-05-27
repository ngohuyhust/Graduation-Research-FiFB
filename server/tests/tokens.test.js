const { createOpaqueToken, hashToken } = require("../src/utils/tokens");

describe("token utilities", () => {
  test("hashToken is deterministic and does not expose the raw token", () => {
    const token = createOpaqueToken();
    const hash = hashToken(token);
    expect(hash).toBe(hashToken(token));
    expect(hash).not.toContain(token);
    expect(hash).toHaveLength(64);
  });
});
