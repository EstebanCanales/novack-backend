import { Injectable } from '@nestjs/common';
import { CreateSensorDto } from '../dtos/sensor';
import { UpdateSensorDto } from '../dtos/sensor';

@Injectable()
export class SensorService {
  create(createSensorDto: CreateSensorDto) {
    return 'This action adds a new sensor';
  }

  findAll() {
    return 'This action returns all sensors';
  }

  findOne(id: string) {
    return `This action returns a #${id} sensor`;
  }

  update(id: string, updateSensorDto: UpdateSensorDto) {
    return `This action updates a #${id} sensor`;
  }

  remove(id: string) {
    return `This action removes a #${id} sensor`;
  }
}

