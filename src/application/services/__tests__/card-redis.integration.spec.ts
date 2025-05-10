import { Test, TestingModule } from '@nestjs/testing';
import { CardService } from '../card.service';
import { RedisDatabaseService } from '../../../infrastructure/database/redis/redis.database.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Card, CardLocation, Supplier, Visitor } from '../../../domain/entities';

describe('CardService with Redis Integration', () => {
  let service: CardService;
  let redisDatabaseService: RedisDatabaseService;

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

  // Mock del servicio de Redis
  const mockRedisDatabaseService = {
    saveCardLocation: jest.fn(),
    getCardLocation: jest.fn(),
    getNearbyCards: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup del módulo de prueba
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardService,
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
          useValue: {},
        },
        {
          provide: getRepositoryToken(Visitor),
          useValue: {},
        },
        {
          provide: RedisDatabaseService,
          useValue: mockRedisDatabaseService,
        },
      ],
    }).compile();

    service = module.get<CardService>(CardService);
    redisDatabaseService = module.get<RedisDatabaseService>(RedisDatabaseService);
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
      mockRedisDatabaseService.saveCardLocation.mockResolvedValue(undefined);

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
      expect(mockRedisDatabaseService.saveCardLocation).toHaveBeenCalledWith(
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

      mockRedisDatabaseService.getCardLocation.mockResolvedValue(cachedLocation);

      // Ejecutar
      const result = await service.getLastLocation(cardId);

      // Verificar
      expect(mockRedisDatabaseService.getCardLocation).toHaveBeenCalledWith(cardId);
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

      mockRedisDatabaseService.getCardLocation.mockResolvedValue(null);
      mockLocationRepository.findOne.mockResolvedValue(dbLocation);
      mockCardRepository.findOne.mockResolvedValue(card);

      // Ejecutar
      const result = await service.getLastLocation(cardId);

      // Verificar
      expect(mockRedisDatabaseService.getCardLocation).toHaveBeenCalledWith(cardId);
      expect(mockLocationRepository.findOne).toHaveBeenCalled();
      expect(mockRedisDatabaseService.saveCardLocation).toHaveBeenCalledWith(
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

      mockRedisDatabaseService.getNearbyCards.mockResolvedValue(nearbyCards);

      // Ejecutar
      const result = await service.getNearbyCards(latitude, longitude, radius);

      // Verificar
      expect(mockRedisDatabaseService.getNearbyCards).toHaveBeenCalledWith(
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

      mockRedisDatabaseService.getNearbyCards.mockRejectedValue(new Error('Redis error'));
      mockCardRepository.find.mockResolvedValue(dbCards);

      // Ejecutar
      const result = await service.getNearbyCards(latitude, longitude, radius);

      // Verificar
      expect(mockRedisDatabaseService.getNearbyCards).toHaveBeenCalledWith(
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