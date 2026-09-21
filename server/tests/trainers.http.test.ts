const request = require("supertest");
jest.mock("../src/db/pool", () => ({ withTransaction: (callback) => callback({ query: jest.fn() }) }));
jest.mock("../src/modules/audit/audit.repository", () => {
  const actual = jest.requireActual("../src/modules/audit/audit.repository");
  const createAudit = jest.fn();
  class AuditRepository extends actual.AuditRepository {
    createAudit(...args) {
      return createAudit(...args);
    }
  }
  return { ...actual, AuditRepository, createAudit };
});
jest.mock("../src/modules/notifications/notifications.repository", () => {
  const actual = jest.requireActual("../src/modules/notifications/notifications.repository");
  const createNotification = jest.fn();
  class NotificationsRepository extends actual.NotificationsRepository {
    createNotification(...args) {
      return createNotification(...args);
    }
  }
  return { ...actual, NotificationsRepository, createNotification };
});
const { createApp } = require("../src/app");
const { UsersRepository } = require("../src/modules/users/users.repository");
const { TrainersRepository } = require("../src/modules/trainers/trainers.repository");
const { TrainerCertificatesRepository } = require("../src/modules/trainerCertificates/trainerCertificates.repository");
const { TrainerConnectionsRepository } = require("../src/modules/trainerConnections/trainerConnections.repository");
const { ReviewsRepository } = require("../src/modules/reviews/reviews.repository");
const { signAccessToken } = new (require("../src/modules/auth/jwt.service").JwtService)();
const { createAudit } = require("../src/modules/audit/audit.repository");
const { createNotification } = require("../src/modules/notifications/notifications.repository");
const trainerId = "6ce85d13-eec0-4aa3-9b8f-905fa1fcd8fb";
const userId = "d44b9038-7685-40c5-bb65-c075584c83ac";
const itemId = "b18cfd54-c056-4c53-b5c0-4e7890f7521d";
const pending = { id: itemId, trainer_id: trainerId, user_id: userId, status: "pending" };
const profile = { trainer_id: trainerId, is_verified: false };
const token = (actor) => `Bearer ${signAccessToken(actor)}`;

function stub(repository, method, result) {
  return jest.spyOn(repository, method).mockResolvedValue(result);
}

describe("Nest trainer-related HTTP contracts", () => {
  let app, trainers, certificates, connections, reviews, users, actor;
  beforeAll(async () => {
    app = await createApp();
    [trainers, certificates, connections, reviews, users] = [
      TrainersRepository,
      TrainerCertificatesRepository,
      TrainerConnectionsRepository,
      ReviewsRepository,
      UsersRepository,
    ].map((type) => app.locals.nest.get(type));
  });
  afterAll(async () => {
    await app.locals.nest.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    actor = { id: userId, role: "user", status: "active", email_verified_at: "2026-01-01" };
    jest.spyOn(users, "findById").mockImplementation(async () => actor);
    stub(trainers, "list", { rows: [profile], total: 1 });
    stub(trainers, "findById", profile);
    stub(trainers, "upsertProfile", profile);
    stub(trainers, "findProfileForUpdate", profile);
    stub(trainers, "markVerified", { ...profile, is_verified: true });
    stub(certificates, "ensureTrainerProfile", true);
    stub(certificates, "create", pending);
    stub(certificates, "listByTrainer", [pending]);
    stub(certificates, "listAll", { rows: [pending], total: 1 });
    stub(certificates, "findById", pending);
    stub(certificates, "setReviewStatus", { ...pending, status: "approved" });
    stub(connections, "findTrainerProfile", profile);
    stub(connections, "findPending", null);
    stub(connections, "findActiveConnection", null);
    stub(connections, "createRequest", pending);
    stub(connections, "cancel", { ...pending, status: "cancelled" });
    stub(connections, "findPendingForTrainer", pending);
    stub(connections, "setDecision", { ...pending, status: "approved" });
    stub(connections, "createConnection", undefined);
    stub(connections, "listRequests", [pending]);
    stub(connections, "listConnections", [{ id: itemId, unread_count: 2 }]);
    stub(reviews, "hasConnection", true);
    stub(reviews, "findMine", null);
    stub(reviews, "createMine", { id: itemId, rating: 5 });
    stub(reviews, "updateMine", { id: itemId, rating: 4 });
    stub(reviews, "listTrainerReviews", { rows: [{ id: itemId, rating: 5 }], total: 1 });
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("public trainer list preserves parsed filters and pagination", async () => {
    const response = await request(app)
      .get("/api/trainers?specialization=%20Strength%20&verified=true&page=2&limit=5")
      .expect(200);
    expect(trainers.list).toHaveBeenCalledWith({ specialization: "Strength", verified: true, page: 2, limit: 5 });
    expect(response.body).toEqual({
      success: true,
      data: { items: [profile], page: 2, limit: 5, total: 1, totalPages: 1 },
      message: "OK",
    });
  });

  test("public detail keeps response and not-found behavior", async () => {
    const found = await request(app).get(`/api/trainers/${trainerId}`).expect(200);
    expect(found.body.data).toEqual({ trainer: profile });
    trainers.findById.mockResolvedValue(null);
    const missing = await request(app).get(`/api/trainers/${trainerId}`).expect(404);
    expect(missing.body.error.message).toBe("Trainer not found");
  });

  test("trainer profile uses authenticated identity and strips verification fields", async () => {
    actor = { ...actor, id: trainerId, role: "trainer" };
    const response = await request(app)
      .put("/api/trainers/me/profile")
      .set("Authorization", token(actor))
      .send({ bio: " Coach ", yearsOfExperience: 0, trainerId: userId, is_verified: true })
      .expect(200);
    expect(trainers.upsertProfile).toHaveBeenCalledWith(trainerId, { bio: "Coach", yearsOfExperience: 0 });
    expect(response.body.message).toBe("Trainer profile saved");
  });

  test("own certificates GET/POST use trainer identity and preserve envelopes", async () => {
    actor = { ...actor, id: trainerId, role: "trainer" };
    const list = await request(app).get("/api/trainers/me/certificates").set("Authorization", token(actor)).expect(200);
    expect(certificates.listByTrainer).toHaveBeenCalledWith(trainerId);
    expect(list.body.data).toEqual({ certificates: [pending] });
    const created = await request(app)
      .post("/api/trainers/me/certificates")
      .set("Authorization", token(actor))
      .send({ title: " CPT ", issuedAt: "2025-01-01", trainerId: userId, status: "approved" })
      .expect(201);
    expect(certificates.create).toHaveBeenCalledWith(expect.anything(), trainerId, {
      title: "CPT",
      issuedAt: "2025-01-01",
    });
    expect(created.body).toEqual({ success: true, data: { certificate: pending }, message: "Certificate submitted" });
    certificates.ensureTrainerProfile.mockResolvedValue(false);
    await request(app)
      .post("/api/trainers/me/certificates")
      .set("Authorization", token(actor))
      .send({ title: "CPT" })
      .expect(409);
  });

  test("admin certificate approval updates trainer verification, audits and notification", async () => {
    actor.role = "admin";
    await request(app).get("/api/admin/certificates?status=pending").set("Authorization", token(actor)).expect(200);
    expect(certificates.listAll).toHaveBeenCalledWith({ page: 1, limit: 20, status: "pending" });
    const response = await request(app)
      .patch(`/api/admin/certificates/${itemId}/review`)
      .set("Authorization", token(actor))
      .set("User-Agent", "trainer-migration")
      .send({ status: "approved" })
      .expect(200);
    expect(response.body.message).toBe("Certificate reviewed");
    expect(trainers.markVerified).toHaveBeenCalledWith(expect.anything(), trainerId, userId);
    expect(createAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: "trainer.verify", entityId: trainerId, userAgent: "trainer-migration" }),
    );
    expect(createAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: "certificate.approved", entityId: itemId }),
    );
    expect(createNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ recipientId: trainerId, type: "certificate_approved" }),
    );
  });

  test("admin certificate rejection records reason without verifying trainer", async () => {
    actor.role = "admin";
    certificates.setReviewStatus.mockResolvedValue({ ...pending, status: "rejected" });
    await request(app)
      .patch(`/api/admin/certificates/${itemId}/review`)
      .set("Authorization", token(actor))
      .send({ status: "rejected", rejectionReason: " Invalid " })
      .expect(200);
    expect(certificates.setReviewStatus).toHaveBeenCalledWith(expect.anything(), itemId, expect.anything(), {
      status: "rejected",
      rejectionReason: "Invalid",
    });
    expect(trainers.markVerified).not.toHaveBeenCalled();
  });

  test.each(["missing", "reviewed", "concurrent"])("certificate %s cannot produce a second approval", async (state) => {
    actor.role = "admin";
    if (state === "missing") certificates.findById.mockResolvedValue(null);
    if (state === "reviewed") certificates.findById.mockResolvedValue({ ...pending, status: "approved" });
    if (state === "concurrent") certificates.setReviewStatus.mockResolvedValue(null);
    await request(app)
      .patch(`/api/admin/certificates/${itemId}/review`)
      .set("Authorization", token(actor))
      .send({ status: "approved" })
      .expect(state === "missing" ? 404 : 409);
    expect(trainers.markVerified).not.toHaveBeenCalled();
    expect(createNotification).not.toHaveBeenCalled();
    expect(createAudit).not.toHaveBeenCalled();
  });

  test("sending request preserves payload and notifies selected trainer", async () => {
    const response = await request(app)
      .post("/api/trainer-connection-requests")
      .set("Authorization", token(actor))
      .send({ trainerId, goalSnapshot: " Strength ", message: " Hello " })
      .expect(201);
    expect(connections.createRequest).toHaveBeenCalledWith(expect.anything(), userId, {
      trainerId,
      goalSnapshot: "Strength",
      message: "Hello",
    });
    expect(response.body).toEqual({
      success: true,
      data: { request: pending },
      message: "Trainer connection request sent",
    });
    expect(createNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ recipientId: trainerId, actorId: userId, type: "trainer_request_pending" }),
    );
  });

  test.each([
    ["self", 400],
    ["missing", 404],
    ["pending", 409],
    ["connected", 409],
  ])("%s connection request is rejected", async (state, status) => {
    if (state === "missing") connections.findTrainerProfile.mockResolvedValue(null);
    if (state === "pending") connections.findPending.mockResolvedValue({ exists: 1 });
    if (state === "connected") connections.findActiveConnection.mockResolvedValue({ exists: 1 });
    await request(app)
      .post("/api/trainer-connection-requests")
      .set("Authorization", token(actor))
      .send({ trainerId: state === "self" ? userId : trainerId })
      .expect(status);
    expect(connections.createRequest).not.toHaveBeenCalled();
    expect(createNotification).not.toHaveBeenCalled();
  });

  test.each(["user", "trainer"])("%s request and connection lists are scoped by authenticated user", async (role) => {
    actor.role = role;
    const requests = await request(app)
      .get("/api/trainer-connection-requests")
      .set("Authorization", token(actor))
      .expect(200);
    const active = await request(app)
      .get("/api/trainer-connection-requests/connections")
      .set("Authorization", token(actor))
      .expect(200);
    expect(connections.listRequests).toHaveBeenCalledWith(actor);
    expect(connections.listConnections).toHaveBeenCalledWith(actor);
    expect(requests.body.data).toEqual({ requests: [pending] });
    expect(active.body.data.connections[0].unread_count).toBe(2);
  });

  test("cancellation requires a pending request owned by actor", async () => {
    const response = await request(app)
      .patch(`/api/trainer-connection-requests/${itemId}/cancel`)
      .set("Authorization", token(actor))
      .expect(200);
    expect(connections.cancel).toHaveBeenCalledWith(userId, itemId);
    expect(response.body.message).toBe("Request cancelled");
    connections.cancel.mockResolvedValue(null);
    await request(app)
      .patch(`/api/trainer-connection-requests/${itemId}/cancel`)
      .set("Authorization", token(actor))
      .expect(404);
  });

  test.each(["approved", "rejected"])("trainer decision %s keeps ownership and side effects", async (status) => {
    actor = { ...actor, id: trainerId, role: "trainer" };
    const path = status === "approved" ? "approve" : "reject";
    const response = await request(app)
      .patch(`/api/trainer-connection-requests/${itemId}/${path}`)
      .set("Authorization", token(actor))
      .send(status === "rejected" ? { rejectReason: " No capacity " } : {})
      .expect(200);
    expect(connections.findPendingForTrainer).toHaveBeenCalledWith(expect.anything(), itemId, trainerId);
    expect(connections.setDecision).toHaveBeenCalledWith(
      expect.anything(),
      itemId,
      status,
      status === "rejected" ? "No capacity" : undefined,
    );
    if (status === "approved") expect(connections.createConnection).toHaveBeenCalledWith(expect.anything(), pending);
    else expect(connections.createConnection).not.toHaveBeenCalled();
    expect(createNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ recipientId: userId, type: `trainer_request_${status}` }),
    );
    expect(response.body.message).toBe(`Request ${status}`);
  });

  test.each([
    ["owner", 404],
    ["connected", 409],
    ["concurrent", 409],
  ])("approval rejects %s conflict without creating connection", async (state, status) => {
    actor = { ...actor, id: trainerId, role: "trainer" };
    if (state === "owner") connections.findPendingForTrainer.mockResolvedValue(null);
    if (state === "connected") connections.findActiveConnection.mockResolvedValue({ exists: 1 });
    if (state === "concurrent") connections.setDecision.mockResolvedValue(null);
    await request(app)
      .patch(`/api/trainer-connection-requests/${itemId}/approve`)
      .set("Authorization", token(actor))
      .expect(status);
    expect(connections.createConnection).not.toHaveBeenCalled();
    expect(createNotification).not.toHaveBeenCalled();
  });

  test("public reviews preserve pagination; connected users can create and update a review", async () => {
    const list = await request(app).get(`/api/trainers/${trainerId}/reviews?page=2&limit=5`).expect(200);
    expect(list.body.data).toMatchObject({ page: 2, limit: 5, total: 1 });
    const created = await request(app)
      .post(`/api/trainers/${trainerId}/reviews`)
      .set("Authorization", token(actor))
      .send({ rating: 5, comment: " Great " })
      .expect(201);
    expect(reviews.hasConnection).toHaveBeenCalledWith(userId, trainerId);
    expect(reviews.createMine).toHaveBeenCalledWith(userId, trainerId, { rating: 5, comment: "Great" });
    expect(created.body.message).toBe("Review saved");
    reviews.findMine.mockResolvedValue({ id: itemId });
    await request(app)
      .post(`/api/trainers/${trainerId}/reviews`)
      .set("Authorization", token(actor))
      .send({ rating: 4 })
      .expect(201);
    expect(reviews.updateMine).toHaveBeenCalledWith(userId, trainerId, { rating: 4 });
  });

  test("unconnected user cannot write a review", async () => {
    reviews.hasConnection.mockResolvedValue(false);
    await request(app)
      .post(`/api/trainers/${trainerId}/reviews`)
      .set("Authorization", token(actor))
      .send({ rating: 5 })
      .expect(403);
    expect(reviews.findMine).not.toHaveBeenCalled();
    expect(reviews.createMine).not.toHaveBeenCalled();
  });

  test.each([
    ["put", "/api/trainers/me/profile"],
    ["get", "/api/trainers/me/certificates"],
    ["post", "/api/trainers/me/certificates"],
    ["get", "/api/trainer-connection-requests"],
    ["get", "/api/trainer-connection-requests/connections"],
    ["post", "/api/trainer-connection-requests"],
    ["patch", `/api/trainer-connection-requests/${itemId}/cancel`],
    ["patch", `/api/trainer-connection-requests/${itemId}/approve`],
    ["patch", `/api/trainer-connection-requests/${itemId}/reject`],
    ["post", `/api/trainers/${trainerId}/reviews`],
  ])("%s %s retains authentication and account guards", async (method, path) => {
    await request(app)[method](path).expect(401);
    actor.role = "trainer";
    actor.status = "locked";
    await request(app)[method](path).set("Authorization", token(actor)).expect(403);
    actor.status = "active";
    actor.email_verified_at = null;
    await request(app)[method](path).set("Authorization", token(actor)).expect(403);
  });

  test.each(["user", "admin"])("%s cannot use trainer-only endpoints", async (role) => {
    actor.role = role;
    for (const [method, path] of [
      ["put", "/api/trainers/me/profile"],
      ["get", "/api/trainers/me/certificates"],
      ["post", "/api/trainers/me/certificates"],
      ["patch", `/api/trainer-connection-requests/${itemId}/approve`],
      ["patch", `/api/trainer-connection-requests/${itemId}/reject`],
    ]) {
      await request(app)[method](path).set("Authorization", token(actor)).expect(403);
    }
  });

  test.each([
    ["get", "/api/trainers?limit=101", undefined],
    ["get", "/api/trainers/bad-id", undefined],
    ["put", "/api/trainers/me/profile", { yearsOfExperience: -1 }],
    ["post", "/api/trainers/me/certificates", { title: " " }],
    ["post", "/api/trainer-connection-requests", { trainerId: "bad-id" }],
    ["patch", "/api/trainer-connection-requests/bad-id/cancel", {}],
    ["patch", `/api/trainer-connection-requests/${itemId}/reject`, { rejectReason: " " }],
    ["get", `/api/trainers/${trainerId}/reviews?page=0`, undefined],
    ["post", `/api/trainers/${trainerId}/reviews`, { rating: 6 }],
  ])("%s %s keeps validation error envelope", async (method, path, body) => {
    actor.role = "trainer";
    const response = await request(app)
      [method](path)
      .set("Authorization", token(actor))
      .set("X-Request-Id", "trainer-validation")
      .send(body)
      .expect(400);
    expect(response.body).toMatchObject({
      success: false,
      requestId: "trainer-validation",
      error: { code: "VALIDATION_ERROR" },
    });
  });
});

export {};
