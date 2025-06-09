import { Test, TestingModule } from '@nestjs/testing';
import { GetAllVisitorsUseCase } from './get-all-visitors.use-case';
import { IVisitorRepository } from '../../../../domain/repositories/visitor.repository.interface';
import { StructuredLoggerService } from '../../../../infrastructure/logging/structured-logger.service';

// Mocks (can be shared or defined per file if specific behaviors are needed)
const mockVisitorRepository = {
  findAll: jest.fn(),
};

const mockLoggerService = {
  setContext: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('GetAllVisitorsUseCase', () => {
  let useCase: GetAllVisitorsUseCase;

  beforeEach(async () => {
    mockVisitorRepository.findAll.mockReset();
    mockLoggerService.log.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllVisitorsUseCase,
        { provide: IVisitorRepository, useValue: mockVisitorRepository },
        { provide: StructuredLoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    useCase = module.get<GetAllVisitorsUseCase>(GetAllVisitorsUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  // TODO: Add more tests
  // e.g., it('should return an array of visitors', async () => { ... });
  // e.g., it('should log the operation and count', async () => { ... });
});
