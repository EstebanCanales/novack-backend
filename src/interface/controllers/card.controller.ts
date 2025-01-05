import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CardService } from '../../application/services/card.service';
import { CreateCardDto } from '../../application/dtos/card/create-card.dto';
import { UpdateCardDto } from '../../application/dtos/card/update-card.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/application/guards/jwt-auth.guard';

@ApiTags('cards')
@Controller('cards')
@UseGuards(JwtAuthGuard)
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva tarjeta' })
  @ApiResponse({
    status: 201,
    description: 'La tarjeta ha sido creada exitosamente',
  })
  create(@Body() createCardDto: CreateCardDto) {
    return this.cardService.create(createCardDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las tarjetas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de todas las tarjetas',
  })
  findAll() {
    return this.cardService.findAll();
  }

  @Get('available')
  @ApiOperation({ summary: 'Obtener todas las tarjetas disponibles' })
  @ApiResponse({
    status: 200,
    description: 'Lista de tarjetas disponibles',
  })
  findAvailable() {
    return this.cardService.findAvailableCards();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una tarjeta por ID' })
  @ApiResponse({
    status: 200,
    description: 'La tarjeta ha sido encontrada',
  })
  findOne(@Param('id') id: string) {
    return this.cardService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una tarjeta' })
  @ApiResponse({
    status: 200,
    description: 'La tarjeta ha sido actualizada',
  })
  update(@Param('id') id: string, @Body() updateCardDto: UpdateCardDto) {
    return this.cardService.update(id, updateCardDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una tarjeta' })
  @ApiResponse({
    status: 200,
    description: 'La tarjeta ha sido eliminada',
  })
  remove(@Param('id') id: string) {
    return this.cardService.remove(id);
  }

  @Post(':card_id/assign/:visitor_id')
  @ApiOperation({ summary: 'Asignar una tarjeta a un visitante' })
  @ApiResponse({
    status: 200,
    description: 'La tarjeta ha sido asignada al visitante',
  })
  assignToVisitor(
    @Param('card_id') card_id: string,
    @Param('visitor_id') visitor_id: string,
  ) {
    return this.cardService.assignToVisitor(card_id, visitor_id);
  }

  @Post(':id/unassign')
  @ApiOperation({ summary: 'Desasignar una tarjeta de un visitante' })
  @ApiResponse({
    status: 200,
    description: 'La tarjeta ha sido desasignada del visitante',
  })
  unassignFromVisitor(@Param('id') id: string) {
    return this.cardService.unassignFromVisitor(id);
  }
}
