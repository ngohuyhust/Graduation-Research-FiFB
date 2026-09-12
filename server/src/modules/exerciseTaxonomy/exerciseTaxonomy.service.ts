import { Inject, Injectable } from "@nestjs/common";
import type * as TaxonomyRepository from "./exerciseTaxonomy.repository";
import type { TaxonomyKind } from "./exerciseTaxonomy.validation";
const { invalidateByPrefix } = require("../../utils/cache");

export const TAXONOMY_REPOSITORY = Symbol("TAXONOMY_REPOSITORY");

@Injectable()
export class ExerciseTaxonomyService {
  constructor(@Inject(TAXONOMY_REPOSITORY) private readonly repository: typeof TaxonomyRepository) {}

  async list(kind: TaxonomyKind) {
    return { items: await this.repository.list(kind) };
  }

  async create(kind: TaxonomyKind, name: string) {
    const item = await this.repository.create(kind, name);
    await invalidateByPrefix("taxonomy:");
    return { item };
  }
}
