// Kiem thu tu dong cho reviews repository.
jest.mock("../src/db/pool", () => ({
  query: jest.fn(),
}));

const { query } = require("../src/db/pool");
const { ReviewsRepository } = require("../src/modules/reviews/reviews.repository");
const { DatabaseService } = require("../src/db/database.service");
const repository = new ReviewsRepository(new DatabaseService());

describe("reviews repository", () => {
  test("review eligibility requires an active trainer connection", async () => {
    query.mockResolvedValue({ rows: [] });

    await repository.hasConnection("user-id", "trainer-id");

    expect(query.mock.calls[0][0]).toContain("status = 'active'");
  });
});
