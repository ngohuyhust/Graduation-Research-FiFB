// Chua cac schema validate dung lai nhieu noi.
const { z } = require("zod");

const uuidParam = z.object({ id: z.string().uuid() });
const trainerIdParam = z.object({ trainerId: z.string().uuid() });

const paginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

module.exports = { uuidParam, trainerIdParam, paginationQuery };
