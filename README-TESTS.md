# Pruebas Automatizadas - Novack Backend

Este documento describe las pruebas automatizadas implementadas para el backend de Novack y cómo ejecutarlas.

## Estructura de Pruebas

Las pruebas están organizadas siguiendo la estructura de la aplicación:

- **Servicios**: Pruebas para la capa de aplicación que contiene la lógica de negocio
- **Controladores**: Pruebas para la capa de interfaz que maneja las solicitudes HTTP
- **Guardias**: Pruebas para los elementos de seguridad como autenticación

## Tests Implementados

### Servicios

| Servicio           | Archivo de Test                                                   | Descripción                                                                                                |
| ------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| FileStorageService | `src/application/services/__tests__/file-storage.service.spec.ts` | Prueba la funcionalidad de carga de archivos a S3, manejo de errores y el almacenamiento local de respaldo |
| AuthService        | `src/application/services/__tests__/auth.service.spec.ts`         | Prueba la autenticación, validación de credenciales y bloqueo de cuentas                                   |
| EmployeeService    | `src/application/services/__tests__/employee.service.spec.ts`     | Prueba la gestión de empleados, incluyendo CRUD y actualización de imágenes de perfil                      |
| SupplierService    | `src/application/services/__tests__/supplier.service.spec.ts`     | Prueba la gestión de proveedores, incluyendo CRUD                                                          |
| VisitorService     | `src/application/services/__tests__/visitor.service.spec.ts`      | Prueba la gestión de visitantes, incluyendo registro, asignación de tarjetas y checkout                    |

### Controladores

| Controlador             | Archivo de Test                                                         | Descripción                                                         |
| ----------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------- |
| DatabaseResetController | `src/interface/controllers/__tests__/database-reset.controller.spec.ts` | Prueba la funcionalidad de reseteo de base de datos para desarrollo |
| EmployeeController      | `src/interface/controllers/__tests__/employee.controller.spec.ts`       | Prueba los endpoints de gestión de empleados                        |

### Guardias

| Guardia   | Archivo de Test                                       | Descripción                                              |
| --------- | ----------------------------------------------------- | -------------------------------------------------------- |
| AuthGuard | `src/application/guards/__tests__/auth.guard.spec.ts` | Prueba la validación de tokens JWT y protección de rutas |

## Cómo Ejecutar las Pruebas

### Ejecutar Todas las Pruebas

Para ejecutar todas las pruebas de la aplicación:

```bash
pnpm run test:all
```

Este comando ejecutará el script `test-plan/run-all-tests.sh` que corre todas las pruebas y guarda los resultados en la carpeta `test-results/`.

### Ejecutar Tests Específicos

También puedes ejecutar pruebas específicas usando los siguientes comandos:

```bash
# Pruebas de servicios
pnpm run pnpm:test:s3            # FileStorageService
pnpm run pnpm:test:auth          # AuthService
pnpm run pnpm:test:employee      # EmployeeService
pnpm run pnpm:test:supplier      # SupplierService
pnpm run pnpm:test:visitor       # VisitorService

# Pruebas de controladores
pnpm run pnpm:test:db-reset      # DatabaseResetController
pnpm run pnpm:test:employee-controller  # EmployeeController

# Pruebas de guardias
pnpm run pnpm:test:guard         # AuthGuard
```

### Probar Conexión a S3

Para verificar la conexión a AWS S3:

```bash
pnpm run test:s3-connection
```

## Cobertura de Pruebas

Para generar un informe de cobertura de todas las pruebas:

```bash
pnpm run pnpm:test:cov
```

Este comando generará un informe detallado en la carpeta `coverage/`.

## Consideraciones para Desarrollo

- Los mocks y fixtures están definidos dentro de cada archivo de prueba
- Las pruebas utilizan jest como framework de testing
- Se implementan pruebas unitarias aislando las dependencias mediante mocks
- Para pruebas de integración o e2e, configurar con la bandera `--runInBand`

## Troubleshooting

Si encuentras problemas al ejecutar las pruebas:

1. Verifica que las variables de entorno estén configuradas correctamente en `.env`
2. Asegúrate de tener las dependencias instaladas con `pnpm install`
3. Los logs de error se guardan en la carpeta `test-results/` para su análisis
4. Para problemas con S3, ejecuta `pnpm run test:s3-connection` para diagnosticar la conexión
