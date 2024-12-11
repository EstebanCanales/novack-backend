import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Put, 
  Delete 
} from '@nestjs/common';
import { SupplierService } from '../../application/services/supplier.service';
import { Supplier } from '../../domain/entities';

@Controller('suppliers')
export class SupplierController {
  constructor(
    private readonly suppliersService: SupplierService
  ) {}

  @Post()
  async create(@Body() supplierData: Partial<Supplier>) {
    return this.suppliersService.create(supplierData);
  }

  @Get()
  async findAll() {
    return this.suppliersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string, 
    @Body() supplierData: Partial<Supplier>
  ) {
    return this.suppliersService.update(id, supplierData);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}
