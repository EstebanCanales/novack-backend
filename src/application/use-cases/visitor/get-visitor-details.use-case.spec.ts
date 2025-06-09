import { Test, TestingModule } from '@nestjs/testing';
import { GetVisitorDetailsUseCase } from './get-visitor-details.use-case';
import { IVisitorRepository } from '../../../../domain/repositories/visitor.repository.interface';
import { StructuredLoggerService } from '../../../../infrastructure/logging/structured-logger.service';
import { NotFoundException } from '@nestjs/common';
import { Visitor } from '../../../../domain/entities/visitor.entity';

// Mock IVisitorRepository
const mockVisitorRepository = {
  findById: jest.fn(),
  // Add other methods as needed by other use cases if creating a shared mock factory
  create: jest.fn(),
  save: jest.fn(),
  findAll: jest.fn(),
  findByEmail: jest.fn(),
  findBySupplier: jest.fn(),
  remove: jest.fn(),
};

// Mock StructuredLoggerService
const mockLoggerService = {
  setContext: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('GetVisitorDetailsUseCase', () => {
  let useCase: GetVisitorDetailsUseCase;

  beforeEach(async () => {
    // Reset mocks before each test
    mockVisitorRepository.findById.mockReset();
    mockLoggerService.log.mockReset();
    mockLoggerService.warn.mockReset();
    // ... reset other mock functions ...

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetVisitorDetailsUseCase,
        { provide: IVisitorRepository, useValue: mockVisitorRepository },
        { provide: StructuredLoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    useCase = module.get<GetVisitorDetailsUseCase>(GetVisitorDetailsUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should return visitor details if found', async () => {
    const mockVisitor = { id: 'some-uuid', name: 'Test Visitor' } as Visitor;
    mockVisitorRepository.findById.mockResolvedValue(mockVisitor);

    const result = await useCase.execute('some-uuid');
    expect(result).toEqual(mockVisitor);
    expect(mockVisitorRepository.findById).toHaveBeenCalledWith('some-uuid');
    expect(mockLoggerService.log).toHaveBeenCalledWith(expect.stringContaining('Attempting to fetch visitor details for id: some-uuid'), { visitorId: 'some-uuid' });
    expect(mockLoggerService.log).toHaveBeenCalledWith(expect.stringContaining('Successfully fetched visitor details for id: some-uuid'), { visitorId: 'some-uuid', visitorName: mockVisitor.name }); // Adjusted based on use case log
  });

  it('should throw NotFoundException if visitor not found', async () => {
    mockVisitorRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('non-existent-uuid')).rejects.toThrow(NotFoundException);
    expect(mockVisitorRepository.findById).toHaveBeenCalledWith('non-existent-uuid');
    expect(mockLoggerService.warn).toHaveBeenCalledWith(expect.stringContaining('Visitor not found with id: non-existent-uuid'), { visitorId: 'non-existent-uuid' });
  });
});
