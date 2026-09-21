import type { Response } from "express";
// Chuan hoa response thanh cong tra ve client.
export function sendSuccess<T>(res: Response, data: T | null = null, message = "OK", statusCode = 200) {
  return res.status(statusCode).json({ success: true, data, message });
}

export function sendCreated<T>(res: Response, data: T, message = "Created") {
  return sendSuccess(res, data, message, 201);
}

export function sendNoContent(res: Response) {
  return res.status(204).send();
}

export function paginate<T>({ items, page, limit, total }: { items: T[]; page: number; limit: number; total: number }) {
  const numericTotal = Number(total || 0);
  return {
    items,
    page,
    limit,
    total: numericTotal,
    totalPages: Math.ceil(numericTotal / limit),
  };
}
