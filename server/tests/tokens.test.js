// Kiem thu tu dong cho tokens.
const { createOpaqueToken, hashToken } = require("../src/utils/tokens");
const { signAccessToken, verifyAccessToken } = require("../src/modules/auth/jwt.service");

describe("token utilities", () => {
  test("hashToken is deterministic and does not expose the raw token", () => {
    const token = createOpaqueToken();
    const hash = hashToken(token);
    expect(hash).toBe(hashToken(token));
    expect(hash).not.toContain(token);
    expect(hash).toHaveLength(64);
  });

  test("access token payload includes user id and role", () => {
    const token = signAccessToken({
      id: "6ce85d13-eec0-4aa3-9b8f-905fa1fcd8fb",
      role: "trainer",
      status: "active",
    });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe("6ce85d13-eec0-4aa3-9b8f-905fa1fcd8fb");
    expect(payload.role).toBe("trainer");
  });
});
