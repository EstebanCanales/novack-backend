import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardService } from '../services/card.service';
import { CardController } from '../../interface/controllers/card.controller';
import { Card, Supplier, Visitor } from 'src/domain/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Card, Supplier, Visitor])],
  controllers: [CardController],
  providers: [CardService],
  exports: [CardService],
})
export class CardModule {}
