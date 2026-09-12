// Khai bao schema validate input cho module exerciseTaxonomy.
import { z } from "zod";

export const taxonomySchema = z.object({ name: z.string().trim().min(1).max(120) });

export type TaxonomyPayload = z.infer<typeof taxonomySchema>;
export type TaxonomyKind = "bodyParts" | "equipments" | "muscles";
