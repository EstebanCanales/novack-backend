# Guía de Pruebas

Este documento detalla cómo ejecutar las pruebas del backend de SP Cedes.

## Requisitos previos

Asegúrate de tener instalado:

- Node.js (v18 o superior)
- pnpm

## Ejecución de pruebas

Todos los comandos de prueba se pueden ejecutar con pnpm:

```bash
# Ejecutar todas las pruebas
pnpm pnpm:test

# Ejecutar pruebas con cobertura
pnpm pnpm:test:cov

# Ejecutar pruebas en modo observador
pnpm pnpm:test:watch
```

## Pruebas específicas

Se han creado comandos específicos para probar componentes individuales:

```bash
# Pruebas del servicio de almacenamiento en S3
pnpm pnpm:test:s3

# Pruebas del servicio de autenticación
pnpm pnpm:test:auth

# Pruebas del guard de autenticación
pnpm pnpm:test:guard

# Pruebas del controlador de reset de base de datos
pnpm pnpm:test:db-reset
```

## Puerta trasera para reseteo de base de datos

Se ha implementado un endpoint para resetear la base de datos. Este endpoint solo está disponible en el entorno de desarrollo y requiere una clave secreta para su uso.

### Endpoint

```
POST /database/reset
```

### Body

```json
{
  "secretKey": "valor-de-DB_RESET_SECRET_KEY-o-dev-reset-key"
}
```

### Respuesta exitosa (código 200)

```json
{
  "success": true,
  "message": "Base de datos limpiada correctamente",
  "status": 200
}
```

### Configuración

Para configurar la clave secreta, define la variable de entorno `DB_RESET_SECRET_KEY` en tu archivo .env. Si no se define, se utilizará el valor por defecto "dev-reset-key".

**Importante**: Esta funcionalidad solo debe usarse en entornos de desarrollo. En producción, el endpoint devolverá un error de acceso prohibido.

## Cobertura de pruebas

El reporte de cobertura se genera en el directorio `coverage/` después de ejecutar el comando de cobertura. Puedes abrir el archivo `coverage/lcov-report/index.html` en tu navegador para ver los resultados detallados.

## Consejos para escribir pruebas

1. Cada prueba debe ser independiente y no depender del estado de otras pruebas.
2. Utiliza mocks para servicios externos como S3, bases de datos, etc.
3. Sigue la estructura de archivos existente:
   - `__tests__/` dentro de cada directorio para las pruebas unitarias
   - `test/` en la raíz para pruebas e2e
4. Usa la metodología AAA (Arrange-Act-Assert):
   - Arrange: Configuración de prueba
   - Act: Ejecución del código a probar
   - Assert: Verificación de resultados
