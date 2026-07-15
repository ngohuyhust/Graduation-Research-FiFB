// Helper format dung chung trong client.
export function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function asItems(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.items || [];
}

export function asPagination(payload) {
  return {
    page: payload?.page || 1,
    limit: payload?.limit || 20,
    total: payload?.total || asItems(payload).length,
    totalPages: payload?.totalPages || 1,
  };
}
