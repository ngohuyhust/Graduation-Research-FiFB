import { Injectable } from "@nestjs/common";
import { ExerciseTaxonomyRepository } from "./exerciseTaxonomy.repository";
import type { TaxonomyKind } from "./exerciseTaxonomy.validation";
const { invalidateByPrefix } = require("../../utils/cache");

@Injectable()
export class ExerciseTaxonomyService {
  constructor(private readonly repository: ExerciseTaxonomyRepository) {}

  async list(kind: TaxonomyKind) {
    return { items: await this.repository.list(kind) };
  }

  async create(kind: TaxonomyKind, name: string) {
    const item = await this.repository.create(kind, name);
    await invalidateByPrefix("taxonomy:");
    return { item };
  }
}
