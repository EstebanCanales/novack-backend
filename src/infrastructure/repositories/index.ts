/**
 * Índice de repositorios
 * 
 * Este archivo exporta todas las implementaciones de repositorios de infraestructura
 * para facilitar su importación y registro en los módulos.
 */

// Repositorios principales
export * from './employee.repository';
// Otros repositorios se añadirán a medida que se implementen

/**
 * Array con todos los proveedores de repositorios para inyección de dependencias
 */
import { EmployeeRepository } from './employee.repository';

export const REPOSITORIES = [
  EmployeeRepository,
  // Agregar otros repositorios aquí
]; 