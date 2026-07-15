// Khai bao schema validate input cho module reviews.
const { z } = require("zod");

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(1).max(2000).optional(),
});

module.exports = { reviewSchema };
