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
jest.mock("../src/modules/audit/audit.service", () => {
  const actual = jest.requireActual("../src/modules/audit/audit.service");
  const listAuditLogs = jest.fn();
  class AuditService extends actual.AuditService {
    listAuditLogs(...args) {
      return listAuditLogs(...args);
    }
  }
  return { ...actual, AuditService, listAuditLogs };
});
jest.mock("../src/modules/emailDeliveries/emailDeliveries.service", () => {
  const actual = jest.requireActual("../src/modules/emailDeliveries/emailDeliveries.service");
  const list = jest.fn();
  class EmailDeliveriesService extends actual.EmailDeliveriesService {
    list(...args) {
      return list(...args);
    }
  }
  return { ...actual, EmailDeliveriesService, list };
});
const { createApp } = require("../src/app");
const { UsersRepository } = require("../src/modules/users/users.repository");
const { UsersService } = require("../src/modules/users/users.service");
const { UsersModule } = require("../src/modules/users/users.module");
const { AuthModule } = require("../src/modules/auth/auth.module");
const { AdminService } = require("../src/modules/admin/admin.service");
const { signAccessToken } = new (require("../src/modules/auth/jwt.service").JwtService)();
const { createAudit } = require("../src/modules/audit/audit.repository");
const { createNotification } = require("../src/modules/notifications/notifications.repository");
const { TrainerCertificatesService } = require("../src/modules/trainerCertificates/trainerCertificates.service");
const certificates = TrainerCertificatesService.prototype;
const audit = require("../src/modules/audit/audit.service");
const email = require("../src/modules/emailDeliveries/emailDeliveries.service");
const { AppError } = require("../src/utils/errors/AppError");
const id = "6ce85d13-eec0-4aa3-9b8f-905fa1fcd8fb";
const actorId = "d44b9038-7685-40c5-bb65-c075584c83ac";
const user = {
  id,
  email: "member@example.com",
  full_name: "Member",
  role: "user",
  status: "active",
  email_verified_at: "2026-01-01",
  password_hash: "secret",
  weight: "72.5",
  height: "175",
};
let actor;
const token = () => `Bearer ${signAccessToken(actor)}`;

describe("Nest users and admin HTTP contracts", () => {
  let app;
  let repository;
  beforeAll(async () => {
    app = await createApp();
    repository = app.locals.nest.get(UsersRepository);
  });
  afterAll(async () => {
    await app.locals.nest.close();
  });
  beforeEach(() => {
    jest.spyOn(certificates, "listAll");
    jest.spyOn(certificates, "review");
    jest.clearAllMocks();
    actor = { ...user, id: actorId, role: "admin" };
    jest
      .spyOn(repository, "findById")
      .mockImplementation(async (requestedId) => (requestedId === actorId ? actor : user));
    jest.spyOn(repository, "listUsers").mockResolvedValue({ rows: [user], total: 1 });
    jest
      .spyOn(repository, "updateProfile")
      .mockImplementation(async (_id, data) => ({ ...actor, full_name: (data as { fullName: string }).fullName }));
    jest
      .spyOn(repository, "setStatus")
      .mockImplementation(async (_client, _id, status) => ({ oldUser: user, user: { ...user, status } }));
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("users and auth resolve the same repository provider", () => {
    expect(app.locals.nest.select(UsersModule).get(UsersRepository)).toBe(repository);
    expect(app.locals.nest.select(AuthModule).get(UsersRepository)).toBe(repository);
    expect(app.locals.nest.get(UsersService)).toBeInstanceOf(UsersService);
    expect(app.locals.nest.get(AdminService)).toBeInstanceOf(AdminService);
  });

  test("me wins over :id, is available to members, and sanitizes profile", async () => {
    actor.role = "user";
    const response = await request(app).get("/api/users/me").set("Authorization", token()).expect(200);
    expect(repository.findById).toHaveBeenCalledTimes(1);
    expect(response.body).toMatchObject({
      success: true,
      data: { user: { id: actorId, fullName: "Member", weight: 72.5, height: 175 } },
      message: "OK",
    });
    expect(response.body.data.user.password_hash).toBeUndefined();
  });

  test("profile patch uses authenticated ID, trims fields and cannot change role/status", async () => {
    actor.role = "trainer";
    const response = await request(app)
      .patch("/api/users/me")
      .set("Authorization", token())
      .send({ id, fullName: " New Name ", role: "admin", status: "disabled", password_hash: "hacked" })
      .expect(200);
    expect(repository.updateProfile).toHaveBeenCalledWith(actorId, { fullName: "New Name" });
    expect(response.body).toMatchObject({
      data: { user: { fullName: "New Name", role: "trainer" } },
      message: "Profile updated",
    });
  });

  test.each(["/api/users", "/api/admin/users"])("%s keeps filtering, pagination and sanitized rows", async (path) => {
    const response = await request(app)
      .get(path)
      .query({ page: 2, limit: 5, role: "trainer", status: "locked", keyword: " Member " })
      .set("Authorization", token())
      .expect(200);
    expect(repository.listUsers).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
      role: "trainer",
      status: "locked",
      keyword: "Member",
    });
    expect(response.body.data).toMatchObject({ page: 2, limit: 5, total: 1, totalPages: 1 });
    expect(response.body.data.items[0].password_hash).toBeUndefined();
  });

  test("admin can fetch user detail; missing users and profile updates return 404", async () => {
    const found = await request(app).get(`/api/users/${id}`).set("Authorization", token()).expect(200);
    expect(found.body.data.user.id).toBe(id);
    repository.findById.mockImplementation(async (requestedId) => (requestedId === actorId ? actor : null));
    await request(app).get(`/api/users/${id}`).set("Authorization", token()).expect(404);
    repository.updateProfile.mockResolvedValue(null);
    await request(app).patch("/api/users/me").set("Authorization", token()).send({ fullName: "Name" }).expect(404);
  });

  test.each(["/api/users", "/api/admin/users"])(
    "%s status update shares transaction, audit metadata and notification",
    async (path) => {
      const response = await request(app)
        .patch(`${path}/${id}/status`)
        .set("Authorization", token())
        .set("User-Agent", "admin-migration")
        .send({ status: "locked" })
        .expect(200);
      expect(repository.setStatus).toHaveBeenCalledWith(expect.anything(), id, "locked");
      expect(createAudit).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          actorId,
          entityId: id,
          action: "user.locked",
          oldValues: user,
          userAgent: "admin-migration",
          ipAddress: expect.any(String),
        }),
      );
      expect(createNotification).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ recipientId: id, actorId, type: "account_locked", isImportant: true }),
      );
      expect(response.body).toMatchObject({
        success: true,
        data: { user: { status: "locked" } },
        message: "User status updated",
      });
      expect(response.body.data.user.password_hash).toBeUndefined();
    },
  );

  test("status change for missing user has no audit or notification", async () => {
    repository.setStatus.mockResolvedValue({ oldUser: null, user: null });
    await request(app)
      .patch(`/api/admin/users/${id}/status`)
      .set("Authorization", token())
      .send({ status: "disabled" })
      .expect(404);
    expect(createAudit).not.toHaveBeenCalled();
    expect(createNotification).not.toHaveBeenCalled();
  });

  test.each([
    ["get", "/api/users/me"],
    ["patch", "/api/users/me"],
    ["get", "/api/users"],
    ["get", `/api/users/${id}`],
    ["patch", `/api/users/${id}/status`],
    ["get", "/api/admin/users"],
    ["patch", `/api/admin/users/${id}/status`],
    ["get", "/api/admin/certificates"],
    ["patch", `/api/admin/certificates/${id}/review`],
    ["get", "/api/admin/audit-logs"],
    ["get", "/api/admin/email-deliveries"],
  ])("%s %s enforces token, active account and verified email", async (method, path) => {
    await request(app)[method](path).expect(401);
    await request(app)[method](path).set("Authorization", "Bearer invalid").expect(401);
    actor.status = "locked";
    await request(app)[method](path).set("Authorization", token()).expect(403);
    actor.status = "active";
    actor.email_verified_at = null;
    await request(app)[method](path).set("Authorization", token()).expect(403);
  });

  test.each(["user", "trainer"])("%s cannot access user administration or any admin endpoint", async (role) => {
    actor.role = role;
    for (const path of [
      "/api/users",
      `/api/users/${id}`,
      "/api/admin/users",
      "/api/admin/certificates",
      "/api/admin/audit-logs",
      "/api/admin/email-deliveries",
      "/api/admin/exercises",
    ]) {
      await request(app).get(path).set("Authorization", token()).expect(403);
    }
    for (const path of [
      `/api/users/${id}/status`,
      `/api/admin/users/${id}/status`,
      `/api/admin/certificates/${id}/review`,
    ]) {
      await request(app).patch(path).set("Authorization", token()).send({ status: "active" }).expect(403);
    }
    expect(repository.listUsers).not.toHaveBeenCalled();
    expect(repository.setStatus).not.toHaveBeenCalled();
  });

  test.each([
    ["get", "/api/users?limit=101", undefined],
    ["get", "/api/users/invalid-id", undefined],
    ["patch", "/api/users/me", { weight: -1 }],
    ["patch", `/api/users/${id}/status`, { status: "deleted" }],
    ["get", "/api/admin/users?page=0", undefined],
    ["patch", "/api/admin/users/bad-id/status", { status: "active" }],
    ["get", "/api/admin/certificates?status=invalid", undefined],
    ["patch", `/api/admin/certificates/${id}/review`, { status: "rejected" }],
    ["get", "/api/admin/audit-logs?actorId=bad-id", undefined],
    ["get", "/api/admin/email-deliveries?limit=0", undefined],
  ])("%s %s preserves validation errors", async (method, path, body) => {
    const response = await request(app)
      [method](path)
      .set("Authorization", token())
      .set("X-Request-Id", "user-admin-validation")
      .send(body)
      .expect(400);
    expect(response.body).toMatchObject({
      success: false,
      requestId: "user-admin-validation",
      error: { code: "VALIDATION_ERROR" },
    });
    expect(repository.updateProfile).not.toHaveBeenCalled();
    expect(repository.setStatus).not.toHaveBeenCalled();
    expect(certificates.review).not.toHaveBeenCalled();
  });

  test("admin certificate routes preserve service validation, decision and request metadata", async () => {
    certificates.listAll.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0, totalPages: 0 });
    await request(app).get("/api/admin/certificates?status=pending").set("Authorization", token()).expect(200);
    expect(certificates.listAll).toHaveBeenCalledWith({ page: 1, limit: 20, status: "pending" });
    certificates.review.mockResolvedValue({ certificate: { id, status: "rejected" } });
    const response = await request(app)
      .patch(`/api/admin/certificates/${id}/review`)
      .set("Authorization", token())
      .set("User-Agent", "review-migration")
      .send({ status: "rejected", rejectionReason: " Invalid certificate " })
      .expect(200);
    expect(certificates.review).toHaveBeenCalledWith(
      expect.objectContaining({ userId: actorId }),
      id,
      { status: "rejected", rejectionReason: "Invalid certificate" },
      expect.objectContaining({ userAgent: "review-migration" }),
    );
    expect(response.body.message).toBe("Certificate reviewed");
    certificates.review.mockRejectedValue(new AppError("CONFLICT", "Only pending certificates can be reviewed", 409));
    await request(app)
      .patch(`/api/admin/certificates/${id}/review`)
      .set("Authorization", token())
      .send({ status: "approved" })
      .expect(409);
  });

  test("admin audit and delivery listings retain filters and envelope", async () => {
    audit.listAuditLogs.mockResolvedValue({ items: [{ id: "audit-id" }] });
    email.list.mockResolvedValue({ items: [{ id: "delivery-id" }] });
    const logs = await request(app)
      .get(`/api/admin/audit-logs?actorId=${actorId}&entityType=app_user&action=user.locked`)
      .set("Authorization", token())
      .expect(200);
    expect(audit.listAuditLogs).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      actorId,
      entityType: "app_user",
      action: "user.locked",
    });
    expect(logs.body).toEqual({ success: true, data: { items: [{ id: "audit-id" }] }, message: "OK" });
    const deliveries = await request(app)
      .get("/api/admin/email-deliveries?page=2&limit=10")
      .set("Authorization", token())
      .expect(200);
    expect(email.list).toHaveBeenCalledWith({ page: 2, limit: 10 });
    expect(deliveries.body.data.items).toEqual([{ id: "delivery-id" }]);
  });

  test("legacy Express authentication uses the Nest repository before route validation", async () => {
    actor.role = "user";
    // The favorites POST schema requires an exerciseId, so no database write occurs.
    await request(app).post("/api/favorites").expect(401);
    await request(app).post("/api/favorites").set("Authorization", token()).send({}).expect(400);
    expect(repository.findById).toHaveBeenCalledWith(actorId);
  });
});

export {};
