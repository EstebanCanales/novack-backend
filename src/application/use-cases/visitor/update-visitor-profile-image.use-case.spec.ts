import { Test, TestingModule } from '@nestjs/testing';
import { UpdateVisitorProfileImageUseCase } from './update-visitor-profile-image.use-case';
import { IVisitorRepository } from '../../../../domain/repositories/visitor.repository.interface';
import { StructuredLoggerService } from '../../../../infrastructure/logging/structured-logger.service';
import { Visitor } from '../../../../domain/entities/visitor.entity';
import { NotFoundException } from '@nestjs/common';

// --- Mocks ---
const mockVisitorRepository = {
  findById: jest.fn(),
  save: jest.fn(),
};
const mockLoggerService = {
  setContext: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(), // Added for completeness, though not directly used in current success/warn paths
};

describe('UpdateVisitorProfileImageUseCase', () => {
  let useCase: UpdateVisitorProfileImageUseCase;
  let repository: IVisitorRepository;

  const visitorId = 'visitor-img-uuid';
  const newImageUrl = 'http://example.com/new-image.jpg';

  // Use a function to get a fresh mock object for each test run
  const getMockExistingVisitor = () => ({
    id: visitorId,
    name: 'Visitor Image Test',
    profile_image_url: 'http://example.com/old-image.jpg',
    // other required fields...
    // Need to ensure all fields that might be spread or accessed are here
    email: 'test@example.com', // Example of another field
    state: 'pendiente',
  } as Visitor);

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateVisitorProfileImageUseCase,
        { provide: IVisitorRepository, useValue: mockVisitorRepository },
        { provide: StructuredLoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    useCase = module.get<UpdateVisitorProfileImageUseCase>(UpdateVisitorProfileImageUseCase);
    repository = module.get<IVisitorRepository>(IVisitorRepository);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should successfully update the visitor profile image URL', async () => {
      const mockVisitor = getMockExistingVisitor();
      mockVisitorRepository.findById.mockResolvedValue(mockVisitor);
      // Mock save to return the visitor with the updated URL
      mockVisitorRepository.save.mockImplementation(async (visitorToSave: Visitor) => {
        // Create a new object to avoid issues with object references in tests
        return { ...visitorToSave };
      });

      const result = await useCase.execute(visitorId, newImageUrl);

      expect(repository.findById).toHaveBeenCalledWith(visitorId);
      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
        id: visitorId,
        profile_image_url: newImageUrl,
      }));
      expect(result.profile_image_url).toEqual(newImageUrl);
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        `Attempting to update profile image URL for visitor id: ${visitorId}`,
        { visitorId, newImageUrl },
      );
      // The use case logs `updatedImageUrl: updatedVisitor.profile_image_url`
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        `Successfully updated profile image URL for visitor id: ${visitorId}`,
        { visitorId, updatedImageUrl: newImageUrl },
      );
    });

    it('should throw NotFoundException if visitor not found', async () => {
      mockVisitorRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(visitorId, newImageUrl)).rejects.toThrow(NotFoundException);
      expect(repository.findById).toHaveBeenCalledWith(visitorId);
      expect(repository.save).not.toHaveBeenCalled();
      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        `Visitor not found for profile image update with id: ${visitorId}`,
        { visitorId },
      );
    });

    it('should propagate errors from repository.findById', async () => {
      const dbError = new Error('DB error findById');
      mockVisitorRepository.findById.mockRejectedValue(dbError);

      await expect(useCase.execute(visitorId, newImageUrl)).rejects.toThrow(dbError);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should propagate errors from repository.save', async () => {
      const mockVisitor = getMockExistingVisitor();
      mockVisitorRepository.findById.mockResolvedValue(mockVisitor);
      const dbError = new Error('DB error save');
      mockVisitorRepository.save.mockRejectedValue(dbError);

      await expect(useCase.execute(visitorId, newImageUrl)).rejects.toThrow(dbError);
      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
        id: visitorId,
        profile_image_url: newImageUrl,
      }));
      // The use case currently does not log an error itself before propagating from save.
      // If it did: expect(mockLoggerService.error).toHaveBeenCalledWith(...);
    });
  });
});
