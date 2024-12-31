import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitorService } from '../services/visitor.service';
import { VisitorController } from '../../interface/controllers/visitor.controller';
import { Visitor, Supplier, Card } from 'src/domain/entities';
import { CardService } from '../services/card.service';

@Module({
    imports: [TypeOrmModule.forFeature([Visitor, Supplier, Card])],
    controllers: [VisitorController],
    providers: [VisitorService, CardService],
    exports: [VisitorService],
})
export class VisitorModule {} 