// Khai bao schema validate input cho module favorites.
const { z } = require("zod");

const favoriteSchema = z.object({ exerciseId: z.string().uuid() });

module.exports = { favoriteSchema };
