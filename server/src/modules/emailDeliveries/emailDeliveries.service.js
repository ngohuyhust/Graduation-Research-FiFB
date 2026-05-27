const { paginate } = require("../../utils/responses");
const repository = require("./emailDeliveries.repository");

async function list(query) {
  const deliveries = repository.listDeliveries();
  const start = (query.page - 1) * query.limit;
  return paginate({
    items: deliveries.slice(start, start + query.limit),
    page: query.page,
    limit: query.limit,
    total: deliveries.length,
  });
}

module.exports = { list };
