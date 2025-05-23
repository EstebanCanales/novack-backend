# Guía de implementación de Clean Architecture

## Estructura de directorios

```
src/
├── domain/              # Capa de Dominio
│   ├── entities/        # Entidades del negocio
│   ├── repositories/    # Interfaces de repositorios
│   ├── services/        # Servicios de dominio
│   └── value-objects/   # Objetos de valor
│
├── application/         # Capa de Aplicación
│   ├── use-cases/       # Casos de uso por entidad
│   ├── dtos/            # Objetos de transferencia de datos
│   ├── services/        # Servicios de aplicación
│   ├── mappers/         # Mapeadores de entidades a DTOs
│   └── interfaces/      # Interfaces de servicios
│
├── infrastructure/      # Capa de Infraestructura
│   ├── repositories/    # Implementaciones de repositorios
│   ├── database/        # Configuración de bases de datos
│   ├── services/        # Implementaciones servicios externos
│   └── logging/         # Servicios de logging
│
└── interface/           # Capa de Interface
    ├── controllers/     # Controladores REST
    ├── websockets/      # Controladores WebSockets
    ├── middlewares/     # Middlewares específicos
    └── serializers/     # Serializadores de respuesta
```

## Principios a seguir

1. **Independencia de frameworks**: El dominio y la lógica de aplicación no deben depender de frameworks externos.
2. **Inversión de dependencias**: Usar interfaces (contratos) para hacer que las capas superiores no dependan de las inferiores.
3. **Regla de dependencia**: Las dependencias de código solo pueden apuntar hacia adentro.
4. **Entidades**: Las entidades encapsulan la lógica de negocio crítica.

## Pasos para refactorizar

1. **Identificar entidades y reglas de negocio**

   - Mover todas las entidades a `domain/entities/`
   - Definir interfaces en `domain/repositories/`

2. **Implementar casos de uso**

   - Crear clases específicas en `application/use-cases/` para cada funcionalidad
   - Separar la lógica de servicio en operaciones más pequeñas

3. **Implementar repositorios**

   - Crear implementaciones en `infrastructure/repositories/`
   - Conectar con TypeORM u otras tecnologías

4. **Adaptar controladores**
   - Migrar controladores para usar casos de uso en lugar de servicios directamente
   - Separar la lógica de presentación de la lógica de negocio

## Ejemplo de refactorización

### 1. Entidad (Domain)

```typescript
// domain/entities/employee.entity.ts
export class Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  // ... otros campos
}
```

### 2. Repositorio (Domain - Interface)

```typescript
// domain/repositories/employee.repository.interface.ts
export interface IEmployeeRepository {
  findAll(): Promise<Employee[]>;
  findById(id: string): Promise<Employee | null>;
  // ... otros métodos
}
```

### 3. Caso de Uso (Application)

```typescript
// application/use-cases/employee/get-employee.use-case.ts
@Injectable()
export class GetEmployeeUseCase {
  constructor(private employeeRepository: IEmployeeRepository) {}

  async execute(id: string): Promise<Employee> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) throw new NotFoundException();
    return employee;
  }
}
```

### 4. Implementación del Repositorio (Infrastructure)

```typescript
// infrastructure/repositories/employee.repository.ts
@Injectable()
export class EmployeeRepository implements IEmployeeRepository {
  constructor(
    @InjectRepository(Employee)
    private employeeRepo: Repository<Employee>,
  ) {}

  async findById(id: string): Promise<Employee | null> {
    return this.employeeRepo.findOne({ where: { id } });
  }
  // ... otros métodos
}
```

### 5. Controlador (Interface)

```typescript
// interface/controllers/employee.controller.ts
@Controller('employees')
export class EmployeeController {
  constructor(
    private getEmployeeUseCase: GetEmployeeUseCase,
    // ... otros casos de uso
  ) {}

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.getEmployeeUseCase.execute(id);
  }
  // ... otros endpoints
}
```

## Proveedores para inyección de dependencias

En el módulo principal, configure los proveedores para inyectar las implementaciones concretas:

```typescript
@Module({
  providers: [
    // Casos de uso
    GetEmployeeUseCase,

    // Repositorios (vinculando interface con implementación)
    {
      provide: IEmployeeRepository,
      useClass: EmployeeRepository,
    },
  ],
})
export class EmployeeModule {}
```

## Beneficios

1. **Testabilidad**: Fácil crear mocks de dependencias para testing
2. **Mantenibilidad**: Cada capa tiene una responsabilidad clara
3. **Flexibilidad**: Cambiar implementaciones sin afectar la lógica de negocio
4. **Escalabilidad**: Organización que facilita el crecimiento del proyecto
