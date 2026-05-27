const { z } = require("zod");

const taxonomySchema = z.object({ name: z.string().trim().min(1).max(120) });

module.exports = { taxonomySchema };
