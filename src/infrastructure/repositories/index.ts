/**
 * Índice de repositorios
 * 
 * Este archivo exporta todas las implementaciones de repositorios de infraestructura
 * para facilitar su importación y registro en los módulos.
 */

// Repositorios principales
export * from './employee.repository';
export * from './visitor.repository'; // Added export
export * from './appointment.repository'; // Added export
// Otros repositorios se añadirán a medida que se implementen
// export * from './supplier.repository'; // Example for when it's created
// export * from './card.repository'; // Example for when it's created


/**
 * Array con todos los proveedores de repositorios para inyección de dependencias
 */
import { EmployeeRepository } from './employee.repository';
import { VisitorRepository } from './visitor.repository'; // Added import
import { AppointmentRepository } from './appointment.repository'; // Added import

export const REPOSITORIES = [
  EmployeeRepository,
  VisitorRepository, // Added to array
  AppointmentRepository, // Added to array
  // Agregar otros repositorios aquí
  // SupplierRepository,
  // CardRepository,
];