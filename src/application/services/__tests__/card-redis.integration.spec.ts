import { Test, TestingModule } from '@nestjs/testing';
import { CardService } from '../card.service';
import { RedisDatabaseService } from '../../../infrastructure/database/redis/redis.database.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Card, CardLocation, Supplier, Visitor } from '../../../domain/entities';
// StructuredLoggerService will be provided by LoggingModule
import { LoggingModule } from 'src/infrastructure/logging/logging.module';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Import ConfigModule and ConfigService

// Mock for REDIS_CLIENT_TYPE
const mockRedisClient = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  scan: jest.fn().mockResolvedValue(['0', []]),
  on: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue(undefined),
  status: 'ready',
  ping: jest.fn().mockResolvedValue('PONG'),
  lPush: jest.fn(),
  lTrim: jest.fn(),
  expire: jest.fn(),
  lRange: jest.fn(),
  multi: jest.fn(() => ({ exec: jest.fn() })), // Simplified multi mock
  geoAdd: jest.fn(),
  geoSearchWith: jest.fn(),
  // Add any other methods used by RedisDatabaseService if it becomes real
};


describe('CardService with Redis Integration', () => {
  let service: CardService;
  let redisDatabaseService: RedisDatabaseService; // This will be the real service

  // Mock del repositorio
  const mockCardRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockLocationRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  // RedisDatabaseService will be real, so its methods will be spied on if needed, not fully mocked here.

  beforeEach(async () => {
    jest.clearAllMocks(); // Clear all mocks

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        LoggingModule, // Import LoggingModule to provide StructuredLoggerService
        ConfigModule.forRoot({ isGlobal: true }), // Ensure ConfigService is available
      ],
      providers: [
        CardService,
        RedisDatabaseService, // Provide the real RedisDatabaseService
        {
          provide: getRepositoryToken(Card),
          useValue: mockCardRepository,
        },
        {
          provide: getRepositoryToken(CardLocation),
          useValue: mockLocationRepository,
        },
        {
          provide: getRepositoryToken(Supplier),
          useValue: {}, // Keep mocks for unrelated repositories
        },
        {
          provide: getRepositoryToken(Visitor),
          useValue: {}, // Keep mocks for unrelated repositories
        },
        {
          provide: 'REDIS_CLIENT_TYPE', // Provide the mock Redis client for RedisDatabaseService
          useValue: mockRedisClient,
        },
        // ConfigService is provided by ConfigModule.forRoot()
        // StructuredLoggerService is provided by LoggingModule
      ],
    }).compile();

    service = module.get<CardService>(CardService);
    redisDatabaseService = module.get<RedisDatabaseService>(RedisDatabaseService); // Get the real instance

    // Reset specific mocks for redisDatabaseService if its methods are called directly in tests
    // For example, if testing fallback logic when redis is down:
    jest.spyOn(redisDatabaseService, 'saveCardLocation').mockResolvedValue(undefined);
    jest.spyOn(redisDatabaseService, 'getCardLocation').mockResolvedValue(null);
    jest.spyOn(redisDatabaseService, 'getNearbyCards').mockResolvedValue([]);


  });

  describe('recordLocation', () => {
    it('should record a card location and cache it in Redis', async () => {
      // Setup
      const cardId = 'card123';
      const card = {
        id: cardId,
        card_number: 'CARD-123',
        latitude: null,
        longitude: null,
        accuracy: null,
      };
      const latitude = 40.7128;
      const longitude = -74.006;
      const accuracy = 10.5;

      const mockLocation = {
        id: 'loc456',
        card,
        latitude,
        longitude,
        accuracy,
        timestamp: new Date(),
      };

      mockCardRepository.findOne.mockResolvedValue(card);
      mockLocationRepository.create.mockReturnValue(mockLocation);
      mockLocationRepository.save.mockResolvedValue(mockLocation);
      mockCardRepository.save.mockResolvedValue({
        ...card,
        latitude,
        longitude,
        accuracy,
      });
      // redisDatabaseService.saveCardLocation is already spied on and mocked via beforeEach
      // mockRedisDatabaseService.saveCardLocation.mockResolvedValue(undefined); // No longer using mockRedisDatabaseService

      // Ejecutar
      const result = await service.recordLocation(cardId, latitude, longitude, accuracy);

      // Verificar
      expect(mockCardRepository.findOne).toHaveBeenCalledWith({
        where: { id: cardId },
        relations: expect.arrayContaining(['supplier']),
      });
      expect(mockLocationRepository.create).toHaveBeenCalledWith({
        card,
        latitude,
        longitude,
        accuracy,
        timestamp: expect.any(Date),
      });
      expect(mockCardRepository.save).toHaveBeenCalledWith({
        ...card,
        latitude,
        longitude,
        accuracy,
      });
      expect(mockLocationRepository.save).toHaveBeenCalledWith(mockLocation);
      expect(redisDatabaseService.saveCardLocation).toHaveBeenCalledWith( // Check the spy on the real service
        cardId,
        expect.objectContaining({
          id: mockLocation.id,
          latitude,
          longitude,
          accuracy,
          timestamp: expect.any(Date),
          card_number: card.card_number,
        })
      );
      expect(result).toEqual(mockLocation);
    });
  });

  describe('getLastLocation', () => {
    it('should get last location from cache if available', async () => {
      // Setup
      const cardId = 'card123';
      const cachedLocation = {
        id: 'loc456',
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 10.5,
        timestamp: new Date().toISOString(),
        card_number: 'CARD-123',
      };

      // redisDatabaseService.getCardLocation is spied on
      // mockRedisDatabaseService.getCardLocation.mockResolvedValue(cachedLocation); // No longer using mockRedisDatabaseService
      (redisDatabaseService.getCardLocation as jest.Mock).mockResolvedValue(cachedLocation);


      // Ejecutar
      const result = await service.getLastLocation(cardId);

      // Verificar
      expect(redisDatabaseService.getCardLocation).toHaveBeenCalledWith(cardId); // Check the spy
      expect(mockLocationRepository.findOne).not.toHaveBeenCalled(); // No debería buscar en DB
      expect(result).toEqual(cachedLocation);
    });

    it('should fetch location from database if not in cache', async () => {
      // Setup
      const cardId = 'card123';
      const card = {
        id: cardId,
        card_number: 'CARD-123',
      };
      const dbLocation = {
        id: 'loc456',
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 10.5,
        timestamp: new Date(),
      };

      // mockRedisDatabaseService.getCardLocation.mockResolvedValue(null); // No longer using mockRedisDatabaseService
      (redisDatabaseService.getCardLocation as jest.Mock).mockResolvedValue(null);
      mockLocationRepository.findOne.mockResolvedValue(dbLocation);
      mockCardRepository.findOne.mockResolvedValue(card);

      // Ejecutar
      const result = await service.getLastLocation(cardId);

      // Verificar
      expect(redisDatabaseService.getCardLocation).toHaveBeenCalledWith(cardId); // Check the spy
      expect(mockLocationRepository.findOne).toHaveBeenCalled();
      expect(redisDatabaseService.saveCardLocation).toHaveBeenCalledWith( // Check the spy
        cardId,
        expect.objectContaining({
          id: dbLocation.id,
          latitude: dbLocation.latitude,
          longitude: dbLocation.longitude,
        })
      );
      expect(result).toEqual(dbLocation);
    });
  });

  describe('getNearbyCards', () => {
    it('should get nearby cards from Redis if available', async () => {
      // Setup
      const latitude = 40.7128;
      const longitude = -74.006;
      const radius = 100;
      const nearbyCards = [
        {
          id: 'card123',
          card_number: 'CARD-123',
          latitude: 40.715,
          longitude: -74.004,
          distance_meters: 50,
        },
        {
          id: 'card456',
          card_number: 'CARD-456',
          latitude: 40.710,
          longitude: -74.009,
          distance_meters: 80,
        },
      ];

      // redisDatabaseService.getNearbyCards is spied on
      // mockRedisDatabaseService.getNearbyCards.mockResolvedValue(nearbyCards); // No longer using mockRedisDatabaseService
      (redisDatabaseService.getNearbyCards as jest.Mock).mockResolvedValue(nearbyCards);


      // Ejecutar
      const result = await service.getNearbyCards(latitude, longitude, radius);

      // Verificar
      expect(redisDatabaseService.getNearbyCards).toHaveBeenCalledWith( // Check the spy
        latitude,
        longitude,
        radius
      );
      expect(mockCardRepository.find).not.toHaveBeenCalled(); // No debería buscar en DB
      expect(result).toEqual(nearbyCards);
    });

    it('should fall back to database query if Redis fails', async () => {
      // Setup
      const latitude = 40.7128;
      const longitude = -74.006;
      const radius = 100;
      const dbCards = [
        {
          id: 'card123',
          card_number: 'CARD-123',
          latitude: 40.715,
          longitude: -74.004,
        },
        {
          id: 'card456',
          card_number: 'CARD-456',
          latitude: 40.710,
          longitude: -74.009,
        },
      ];

      // mockRedisDatabaseService.getNearbyCards.mockRejectedValue(new Error('Redis error')); // No longer using mockRedisDatabaseService
      (redisDatabaseService.getNearbyCards as jest.Mock).mockRejectedValue(new Error('Redis error'));
      mockCardRepository.find.mockResolvedValue(dbCards);

      // Ejecutar
      const result = await service.getNearbyCards(latitude, longitude, radius);

      // Verificar
      expect(redisDatabaseService.getNearbyCards).toHaveBeenCalledWith( // Check the spy
        latitude,
        longitude,
        radius
      );
      expect(mockCardRepository.find).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('distance_meters'); // Debe calcular la distancia
    });
  });
}); 