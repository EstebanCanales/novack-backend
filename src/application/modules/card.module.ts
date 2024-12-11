import { Module } from '@nestjs/common';
import { CardService } from '../services/card.service';
import { CardController } from '../../interface/controllers/card.controller';

@Module({
  controllers: [CardController],
  providers: [CardService],
})
export class CardModule {}
