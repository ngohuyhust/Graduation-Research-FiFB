const { paginate } = require("../../utils/responses");
const repository = require("./audit.repository");

async function listAuditLogs(query) {
  const result = await repository.listAuditLogs(query);
  return paginate({ items: result.rows, page: query.page, limit: query.limit, total: result.total });
}

module.exports = { listAuditLogs };
