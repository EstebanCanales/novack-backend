import { Test, TestingModule } from '@nestjs/testing';
import { UpdateVisitorProfileImageUseCase } from './update-visitor-profile-image.use-case';
import { IVisitorRepository } from '../../../../domain/repositories/visitor.repository.interface';
import { StructuredLoggerService } from '../../../../infrastructure/logging/structured-logger.service';
import { NotFoundException } from '@nestjs/common';
import { Visitor } from '../../../../domain/entities/visitor.entity';

// Mocks
const mockVisitorRepository = {
  findById: jest.fn(),
  save: jest.fn(),
};
const mockLoggerService = {
  setContext: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
};

describe('UpdateVisitorProfileImageUseCase', () => {
  let useCase: UpdateVisitorProfileImageUseCase;

  beforeEach(async () => {
    mockVisitorRepository.findById.mockReset();
    mockVisitorRepository.save.mockReset();
    mockLoggerService.log.mockReset();
    mockLoggerService.warn.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateVisitorProfileImageUseCase,
        { provide: IVisitorRepository, useValue: mockVisitorRepository },
        { provide: StructuredLoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    useCase = module.get<UpdateVisitorProfileImageUseCase>(UpdateVisitorProfileImageUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  // TODO: Add tests for visitor not found, successful image URL update.
});
