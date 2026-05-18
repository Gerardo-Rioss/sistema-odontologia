/**
 * Interfaz genérica para el patrón Repository.
 *
 * Proporciona operaciones CRUD estándar que cualquier repositorio
 * concreto debe implementar. El tipo genérico T representa la entidad.
 */
export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(params?: { skip?: number; take?: number }): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}
