import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../db/database.service";
import type { TaxonomyKind } from "./exerciseTaxonomy.validation";

const tables = {
  bodyParts: "body_parts",
  equipments: "equipments",
  muscles: "muscles",
};


export function resolveTable(kind: TaxonomyKind) {
  return tables[kind];
}

@Injectable()
export class ExerciseTaxonomyRepository {
  constructor(private readonly db: DatabaseService) {}

  async list(kind: TaxonomyKind) {
    const table = resolveTable(kind);
    const result = await this.db.query<{ id: string; name: string }>(`SELECT * FROM ${table} ORDER BY name ASC`);
    return result.rows;
  }

  async create(kind: TaxonomyKind, name: string) {
    const table = resolveTable(kind);
    const result = await this.db.query<{ id: string; name: string }>(
      `INSERT INTO ${table} (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING *`,
      [name],
    );
    return result.rows[0];
  }
}
