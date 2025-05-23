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
export * from './sensor.entity';

// Entidades de comunicación y chat
export * from './chat-room.entity';
export * from './chat-message.entity';

// Entidades de seguridad y auditoría
export * from './audit-log.entity';
