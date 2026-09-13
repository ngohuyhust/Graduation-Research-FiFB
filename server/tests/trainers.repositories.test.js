const { TrainersRepository } = require("../src/modules/trainers/trainers.repository");
const { TrainerCertificatesRepository } = require("../src/modules/trainerCertificates/trainerCertificates.repository");
const { TrainerConnectionsRepository } = require("../src/modules/trainerConnections/trainerConnections.repository");
const { ReviewsRepository } = require("../src/modules/reviews/reviews.repository");

describe("trainer SQL repository contracts", () => {
  let database;
  beforeEach(() => {
    database = { query: jest.fn() };
  });

  test("trainer discovery preserves active/nondeleted filters and parameterized false verification", async () => {
    const repository = new TrainersRepository(database);
    database.query
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [{ trainer_id: "trainer" }] });
    await repository.list({ page: 2, limit: 5, specialization: "O'Reilly", verified: false });
    const [countSql, countValues] = database.query.mock.calls[0];
    const [pageSql, pageValues] = database.query.mock.calls[1];
    expect(countSql).toContain("u.status = 'active'");
    expect(countSql).toContain("u.deleted_at IS NULL");
    expect(countSql).toContain("tp.is_verified = $2");
    expect(countValues).toEqual(["%O'Reilly%", false]);
    expect(pageValues).toEqual([...countValues, 5, 5]);
    expect(pageSql).toContain("LIMIT $3 OFFSET $4");
    expect(pageSql).not.toContain("O'Reilly");
  });

  test("profile upsert keeps omitted fields and zero years of experience", async () => {
    database.query.mockResolvedValue({ rows: [{ trainer_id: "trainer" }] });
    await new TrainersRepository(database).upsertProfile("trainer", { yearsOfExperience: 0 });
    expect(database.query.mock.calls[0][0]).toContain("COALESCE($4, trainer_profiles.years_of_experience)");
    expect(database.query.mock.calls[0][1]).toEqual(["trainer", null, null, 0]);
  });

  test("certificate decision is conditional on pending state on the supplied transaction", async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    const repository = new TrainerCertificatesRepository(database);
    await expect(
      repository.setReviewStatus(
        client,
        "cert",
        { userId: "admin" },
        { status: "rejected", rejectionReason: "invalid" },
      ),
    ).resolves.toBeNull();
    expect(client.query.mock.calls[0][0]).toContain("WHERE id = $1 AND status = 'pending'");
    expect(client.query.mock.calls[0][1]).toEqual(["cert", "rejected", "admin", "invalid"]);
    expect(database.query).not.toHaveBeenCalled();
  });

  test("connection cancellation and lookup enforce ownership and pending state", async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    database.query.mockResolvedValue({ rows: [] });
    const repository = new TrainerConnectionsRepository(database);
    await repository.cancel("member", "request");
    expect(database.query.mock.calls[0]).toEqual([
      expect.stringContaining("user_id = $2 AND status = 'pending'"),
      ["request", "member"],
    ]);
    await repository.findPendingForTrainer(client, "request", "trainer");
    expect(client.query.mock.calls[0]).toEqual([
      expect.stringContaining("trainer_id = $2 AND status = 'pending'"),
      ["request", "trainer"],
    ]);
    await repository.setDecision(client, "request", "approved");
    expect(client.query.mock.calls[1][0]).toContain("WHERE id = $1 AND status = 'pending'");
  });

  test.each(["trainer", "user"])("%s request list retains participant details and scope", async (role) => {
    database.query.mockResolvedValue({ rows: [] });
    await new TrainerConnectionsRepository(database).listRequests({ id: "actor", role });
    const [sql, params] = database.query.mock.calls[0];
    expect(sql).toContain(role === "trainer" ? "WHERE tcr.trainer_id = $1" : "WHERE tcr.user_id = $1");
    expect(sql).toContain(role === "trainer" ? "user_email" : "trainer_email");
    expect(sql).toContain("connection_status");
    expect(params).toEqual(["actor"]);
  });

  test.each([true, false])("connection list works with chat table available=%s", async (hasChat) => {
    database.query
      .mockResolvedValueOnce({ rows: [{ table_name: hasChat ? "chat_messages" : null }] })
      .mockResolvedValueOnce({ rows: [{ id: "connection", unread_count: 0 }] });
    await new TrainerConnectionsRepository(database).listConnections({ id: "trainer", role: "trainer" });
    const [sql, params] = database.query.mock.calls[1];
    expect(sql).toContain("WHERE utc.trainer_id = $1");
    expect(sql).toContain(hasChat ? "cm.read_at IS NULL" : "0::int AS unread_count");
    expect(params).toEqual(["trainer"]);
  });

  test("review listing only exposes visible reviews and scopes both queries to trainer", async () => {
    database.query.mockResolvedValueOnce({ rows: [{ total: 1 }] }).mockResolvedValueOnce({ rows: [] });
    await new ReviewsRepository(database).listTrainerReviews("trainer", { page: 3, limit: 5 });
    for (const [sql] of database.query.mock.calls) expect(sql).toContain("status = 'visible'");
    expect(database.query.mock.calls[0][1]).toEqual(["trainer"]);
    expect(database.query.mock.calls[1][1]).toEqual(["trainer", 5, 10]);
  });
});
