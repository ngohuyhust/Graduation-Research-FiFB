// Chuan hoa response thanh cong tra ve client.
function sendSuccess(res, data = null, message = "OK", statusCode = 200) {
  return res.status(statusCode).json({ success: true, data, message });
}

function sendCreated(res, data, message = "Created") {
  return sendSuccess(res, data, message, 201);
}

function sendNoContent(res) {
  return res.status(204).send();
}

function paginate({ items, page, limit, total }) {
  const numericTotal = Number(total || 0);
  return {
    items,
    page,
    limit,
    total: numericTotal,
    totalPages: Math.ceil(numericTotal / limit),
  };
}

module.exports = { sendSuccess, sendCreated, sendNoContent, paginate };
