import request from "supertest";
import { createApp } from "../src/app";
import { UsersRepository } from "../src/modules/users/users.repository";
import { TrainingProfilesService } from "../src/modules/trainingProfiles/trainingProfiles.service";
import { JwtService } from "../src/modules/auth/jwt.service";
import { trainingProfileSchema } from "../src/modules/trainingProfiles/trainingProfiles.validation";

const profile = {
  goal: "strength",
  experienceLevel: "beginner",
  daysPerWeek: 3,
  sessionMinutes: 45,
  location: "home",
  equipmentIds: [],
  priorityMuscleIds: [],
  dislikedExerciseIds: [],
  limitations: "",
};
const id = "6ce85d13-eec0-4aa3-9b8f-905fa1fcd8fb";
describe("private training profiles", () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  let role = "user";
  let save: jest.SpyInstance;
  const token = new JwtService().signAccessToken({ id, role: "user", status: "active" });
  beforeAll(async () => {
    app = await createApp();
    jest.spyOn(app.locals.nest.get(UsersRepository), "findById").mockImplementation(async () => ({
      id,
      role,
      status: "active",
      email_verified_at: new Date(),
    }));
    jest.spyOn(app.locals.nest.get(TrainingProfilesService), "get").mockResolvedValue(null);
    save = jest.spyOn(app.locals.nest.get(TrainingProfilesService), "save").mockResolvedValue(profile);
  });
  afterAll(async () => {
    jest.restoreAllMocks();
    await app.locals.nest.close();
  });
  beforeEach(() => {
    role = "user";
    save.mockClear();
  });
  test("requires authentication and returns null before onboarding", async () => {
    await request(app).get("/api/v1/users/me/training-profile").expect(401);
    const response = await request(app)
      .get("/api/v1/users/me/training-profile")
      .auth(token, { type: "bearer" })
      .expect(200);
    expect(response.body.data.profile).toBeNull();
    expect(response.headers["cache-control"]).toBe("no-store");
  });
  test("saves only the authenticated user's profile", async () => {
    await request(app)
      .put("/api/v1/users/me/training-profile")
      .auth(token, { type: "bearer" })
      .send(profile)
      .expect(200);
    expect(save).toHaveBeenCalledWith(id, profile);
    await request(app)
      .put("/api/v1/users/me/training-profile")
      .auth(token, { type: "bearer" })
      .send({ ...profile, userId: id })
      .expect(400);
  });
  test.each(["admin", "trainer"])("rejects %s access", async (value) => {
    role = value;
    await request(app).get("/api/v1/users/me/training-profile").auth(token, { type: "bearer" }).expect(403);
    await request(app)
      .put("/api/v1/users/me/training-profile")
      .auth(token, { type: "bearer" })
      .send(profile)
      .expect(403);
    expect(save).not.toHaveBeenCalled();
  });
  test.each([
    { daysPerWeek: 0 },
    { daysPerWeek: 1.5 },
    { sessionMinutes: 181 },
    { goal: "invalid" },
    { equipmentIds: [id, id] },
    { priorityMuscleIds: ["wrong"] },
    { limitations: "a".repeat(1001) },
  ])("rejects invalid inputs %j", (change) => {
    expect(trainingProfileSchema.safeParse({ ...profile, ...change }).success).toBe(false);
  });
});
