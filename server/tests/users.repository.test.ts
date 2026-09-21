const { UsersRepository } = require("../src/modules/users/users.repository");

describe("Nest users repository", () => {
  let database;
  let repository;
  beforeEach(() => {
    database = { query: jest.fn() };
    repository = new UsersRepository(database);
  });

  test("combined filters are parameterized identically in count and page queries", async () => {
    database.query
      .mockResolvedValueOnce({ rows: [{ total: 11 }] })
      .mockResolvedValueOnce({ rows: [{ id: "user-id" }] });
    const query = { page: 3, limit: 5, role: "trainer", status: "active", keyword: "O'Reilly" };
    await expect(repository.listUsers(query)).resolves.toEqual({ rows: [{ id: "user-id" }], total: 11 });
    const [countSql, countValues] = database.query.mock.calls[0];
    const [pageSql, pageValues] = database.query.mock.calls[1];
    expect(countSql).toContain(
      "deleted_at IS NULL AND role = $1 AND status = $2 AND (email ILIKE $3 OR full_name ILIKE $3)",
    );
    expect(pageSql).toContain("LIMIT $4 OFFSET $5");
    expect(countValues).toEqual(["trainer", "active", "%O'Reilly%"]);
    expect(pageValues).toEqual([...countValues, 5, 10]);
    expect(pageSql).not.toContain("O'Reilly");
    expect(pageSql).not.toContain("password_hash");
  });

  test("unfiltered pagination starts at the first placeholders", async () => {
    database.query.mockResolvedValueOnce({ rows: [{ total: 0 }] }).mockResolvedValueOnce({ rows: [] });
    await expect(repository.listUsers({ page: 1, limit: 20 })).resolves.toEqual({ rows: [], total: 0 });
    expect(database.query.mock.calls[1][0]).toContain("LIMIT $1 OFFSET $2");
    expect(database.query.mock.calls[1][1]).toEqual([20, 0]);
  });

  test("auth lookups honor supplied transaction and exclude deleted users", async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [{ id: "user-id", password_hash: "hash" }] }) };
    await repository.findByEmail("Member@example.com", client);
    await repository.findAuthById("user-id", client);
    expect(database.query).not.toHaveBeenCalled();
    expect(client.query.mock.calls[0]).toEqual([
      expect.stringContaining("lower(email) = lower($1) AND deleted_at IS NULL"),
      ["Member@example.com"],
    ]);
    expect(client.query.mock.calls[1][0]).toContain("password_hash");
    expect(client.query.mock.calls[1][0]).toContain("deleted_at IS NULL");
  });

  test("public lookup excludes password hash and returns null for missing user", async () => {
    database.query.mockResolvedValue({ rows: [] });
    await expect(repository.findById("missing")).resolves.toBeNull();
    expect(database.query.mock.calls[0][0]).not.toContain("password_hash");
    expect(database.query.mock.calls[0][1]).toEqual(["missing"]);
  });

  test("profile patch preserves omitted fields and only updates the requested user", async () => {
    database.query.mockResolvedValue({ rows: [{ id: "user-id", full_name: "New name" }] });
    await repository.updateProfile("user-id", { fullName: "New name" });
    const [sql, values] = database.query.mock.calls[0];
    expect(sql).toContain("phone = COALESCE($3, phone)");
    expect(sql).toContain("WHERE id = $1 AND deleted_at IS NULL");
    expect(values).toEqual([
      "user-id",
      "New name",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  test("status update retains old and new records on the supplied transaction", async () => {
    const oldUser = { id: "user-id", status: "active" };
    const updated = { ...oldUser, status: "locked" };
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [oldUser] })
        .mockResolvedValueOnce({ rows: [updated] }),
    };
    await expect(repository.setStatus(client, "user-id", "locked")).resolves.toEqual({ oldUser, user: updated });
    expect(client.query.mock.calls[1]).toEqual([expect.stringContaining("deleted_at IS NULL"), ["user-id", "locked"]]);
    expect(database.query).not.toHaveBeenCalled();
  });
});

export {};
