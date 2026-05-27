const { z } = require("zod");

const favoriteSchema = z.object({ exerciseId: z.string().uuid() });

module.exports = { favoriteSchema };
