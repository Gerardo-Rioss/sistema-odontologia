import { NotFoundError, ForbiddenError } from "@/lib/errors";

export async function verifyOwnership<T>(
  fetchFn: (id: string) => Promise<T | null>,
  id: string,
  userId: string,
  notFoundMessage: string,
  forbiddenMessage: string
): Promise<T> {
  const entity = await fetchFn(id);

  if (!entity) {
    throw new NotFoundError(notFoundMessage);
  }

  if ((entity as Record<string, unknown>).userId !== userId) {
    throw new ForbiddenError(forbiddenMessage);
  }

  return entity;
}
