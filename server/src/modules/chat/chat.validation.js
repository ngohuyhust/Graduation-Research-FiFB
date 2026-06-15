const { z } = require("zod");

const connectionParam = z.object({ connectionId: z.string().uuid() });
const messageSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  messageType: z.enum(["text", "image"]).default("text"),
});
const messageQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

module.exports = { connectionParam, messageSchema, messageQuery };
