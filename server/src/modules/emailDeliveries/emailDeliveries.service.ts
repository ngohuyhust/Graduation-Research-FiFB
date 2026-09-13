import { Injectable } from "@nestjs/common";
import { EmailDeliveriesRepository } from "./emailDeliveries.repository";
import type { DeliveryQuery } from "./emailDeliveries.validation";
const { paginate } = require("../../utils/responses");




@Injectable()
export class EmailDeliveriesService {
  constructor(private readonly repository: EmailDeliveriesRepository) {}

  async list(query: DeliveryQuery) {
    const deliveries = this.repository.listDeliveries();
    const start = (query.page - 1) * query.limit;
    return paginate({
      items: deliveries.slice(start, start + query.limit),
      page: query.page,
      limit: query.limit,
      total: deliveries.length,
    });
  }
}
