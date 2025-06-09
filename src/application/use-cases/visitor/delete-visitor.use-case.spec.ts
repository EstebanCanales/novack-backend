import { Test, TestingModule } from '@nestjs/testing';
import { DeleteVisitorUseCase } from './delete-visitor.use-case';
import { IVisitorRepository } from '../../../../domain/repositories/visitor.repository.interface';
import { StructuredLoggerService } from '../../../../infrastructure/logging/structured-logger.service';
import { NotFoundException } from '@nestjs/common';
import { Visitor } from '../../../../domain/entities/visitor.entity';

// Mocks
const mockVisitorRepository = {
  findById: jest.fn(),
  remove: jest.fn(),
};
const mockLoggerService = {
  setContext: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
};

describe('DeleteVisitorUseCase', () => {
  let useCase: DeleteVisitorUseCase;

  beforeEach(async () => {
    mockVisitorRepository.findById.mockReset();
    mockVisitorRepository.remove.mockReset();
    mockLoggerService.log.mockReset();
    mockLoggerService.warn.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteVisitorUseCase,
        { provide: IVisitorRepository, useValue: mockVisitorRepository },
        { provide: StructuredLoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    useCase = module.get<DeleteVisitorUseCase>(DeleteVisitorUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  // TODO: Add tests for visitor not found, successful deletion.
});
