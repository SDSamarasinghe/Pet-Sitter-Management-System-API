export interface PaginationQuery {
  page?: string | number;
  limit?: string | number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 10;

export function parsePagination(query: PaginationQuery): {
  page: number;
  limit: number;
  skip: number;
  search: string;
  sortBy?: string;
  sortOrder: 1 | -1;
} {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limitRaw = parseInt(String(query.limit ?? DEFAULT_LIMIT), 10) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, limitRaw));
  const skip = (page - 1) * limit;
  const search = (query.search ?? '').toString().trim();
  const sortBy = query.sortBy?.toString();
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  return { page, limit, skip, search, sortBy, sortOrder };
}

export function isPaginatedRequest(query: PaginationQuery): boolean {
  return query.page !== undefined || query.limit !== undefined;
}

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
