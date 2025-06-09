/**
 * Índice de entidades del dominio
 *
 * Este archivo centraliza la exportación de todas las entidades del dominio
 * para facilitar su importación en otros módulos.
 */

// Entidades principales del negocio
export * from './employee.entity';
export * from './visitor.entity';
export * from './supplier.entity';
export * from './supplier-subscription.entity';
export * from './card.entity';

// Entidades de comunicación y chat
export * from './chat-room.entity';
export * from './chat-message.entity';

// Entidades de seguridad y auditoría
export * from './audit-log.entity';
export * from './refresh-token.entity'; // Added export
export * from './login-attempt.entity'; // Added export
export * from './appointment.entity'; // Added export for Appointment
