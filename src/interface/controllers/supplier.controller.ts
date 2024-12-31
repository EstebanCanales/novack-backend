import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { SupplierService } from '../../application/services/supplier.service';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
} from '../../application/dtos/supplier';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('suppliers')
@Controller('suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear un nuevo proveedor',
  })
  @ApiBody({ type: CreateSupplierDto })
  create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.supplierService.create(createSupplierDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener todos los proveedores',
  })
  findAll() {
    return this.supplierService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener un proveedor por ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID UUID del proveedor',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'El proveedor ha sido encontrado.' })
  @ApiResponse({ status: 400, description: 'ID con formato inválido.' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado en db.' })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.supplierService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar un proveedor' })
  @ApiParam({
    name: 'id',
    description: 'ID UUID del proveedor a actualizar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateSupplierDto })
  @ApiResponse({
    status: 200,
    description: 'El proveedor ha sido actualizado exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos o ID con formato incorrecto.',
  })
  @ApiResponse({
    status: 404,
    description: 'Proveedor no encontrado en el sistema.',
  })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.supplierService.update(id, updateSupplierDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un proveedor' })
  @ApiParam({
    name: 'id',
    description: 'ID UUID del proveedor a eliminar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'El proveedor ha sido eliminado exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description: `Operación inválida.`,
  })
  @ApiResponse({
    status: 404,
    description: 'Proveedor no encontrado en el sistema.',
  })
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.supplierService.remove(id);
  }
}
