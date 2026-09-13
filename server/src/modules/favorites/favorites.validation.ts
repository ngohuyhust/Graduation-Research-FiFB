// Khai bao schema validate input cho module favorites.
import { z } from "zod";

export const favoriteSchema = z.object({ exerciseId: z.string().uuid() });

export type FavoritePayload = z.infer<typeof favoriteSchema>;
