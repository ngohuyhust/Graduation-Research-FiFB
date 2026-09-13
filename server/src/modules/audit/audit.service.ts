import { Injectable } from "@nestjs/common";
import { AuditRepository } from "./audit.repository";
import type { AuditQuery } from "./audit.validation";
const { paginate } = require("../../utils/responses");

@Injectable()
export class AuditService {
  constructor(private readonly repository: AuditRepository) {}

  async listAuditLogs(query: AuditQuery) {
    const result = await this.repository.listAuditLogs(query);
    return paginate({ items: result.rows, page: query.page, limit: query.limit, total: result.total });
  }
}
