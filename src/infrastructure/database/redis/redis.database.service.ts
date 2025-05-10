import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisDatabaseService implements OnModuleInit {
  private readonly logger = new Logger(RedisDatabaseService.name);
  private redisClient: Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      this.redisClient = new Redis({
        host: this.configService.get('REDIS_HOST', 'localhost'),
        port: this.configService.get('REDIS_PORT', 6379),
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
      });

      this.redisClient.on('connect', () => {
        this.logger.log('Conexión a Redis establecida correctamente');
      });

      this.redisClient.on('error', (error) => {
        this.logger.error(`Error en la conexión a Redis: ${error.message}`);
      });

      await this.testConnection();
    } catch (error) {
      this.logger.error(`Error al inicializar Redis: ${error.message}`);
      throw error;
    }
  }

  async testConnection() {
    try {
      await this.redisClient.ping();
      this.logger.log('Conexión a Redis verificada con éxito');
      return { status: 'ok', message: 'Conexión a Redis establecida' };
    } catch (error) {
      this.logger.error(`Error al verificar conexión a Redis: ${error.message}`);
      throw error;
    }
  }

  // Métodos para gestión de caché de chats
  
  /**
   * Guarda un mensaje de chat en caché
   * @param roomId ID de la sala de chat
   * @param message Mensaje a guardar
   * @param ttl Tiempo de vida en segundos (opcional)
   */
  async saveChatMessage(roomId: string, message: any, ttl?: number): Promise<void> {
    try {
      const key = `chat:message:${roomId}:${message.id}`;
      await this.redisClient.set(key, JSON.stringify(message));
      
      // Añadir mensaje al listado de mensajes de la sala
      await this.redisClient.lpush(`chat:messages:${roomId}`, message.id);
      
      // Mantener solo los últimos 100 mensajes por sala
      await this.redisClient.ltrim(`chat:messages:${roomId}`, 0, 99);
      
      if (ttl) {
        await this.redisClient.expire(key, ttl);
        await this.redisClient.expire(`chat:messages:${roomId}`, ttl);
      }
    } catch (error) {
      this.logger.error(`Error al guardar mensaje en caché: ${error.message}`);
      throw error;
    }
  }

  /**
   * Recupera los mensajes recientes de una sala de chat
   * @param roomId ID de la sala de chat
   * @param limit Número máximo de mensajes a recuperar
   */
  async getChatMessages(roomId: string, limit = 50): Promise<any[]> {
    try {
      // Obtener los IDs de los mensajes más recientes
      const messageIds = await this.redisClient.lrange(`chat:messages:${roomId}`, 0, limit - 1);
      
      if (!messageIds.length) return [];
      
      // Recuperar los mensajes en paralelo
      const pipeline = this.redisClient.pipeline();
      for (const msgId of messageIds) {
        pipeline.get(`chat:message:${roomId}:${msgId}`);
      }
      
      const results = await pipeline.exec();
      
      // Filtrar y parsear los resultados
      return results
        .filter(result => result[1] !== null)
        .map(result => JSON.parse(result[1] as string));
    } catch (error) {
      this.logger.error(`Error al recuperar mensajes de caché: ${error.message}`);
      return [];
    }
  }

  /**
   * Guarda información de una sala de chat en caché
   * @param room Información de la sala
   * @param ttl Tiempo de vida en segundos (opcional)
   */
  async saveChatRoom(room: any, ttl = 3600): Promise<void> {
    try {
      const key = `chat:room:${room.id}`;
      await this.redisClient.set(key, JSON.stringify(room));
      
      if (ttl) {
        await this.redisClient.expire(key, ttl);
      }
    } catch (error) {
      this.logger.error(`Error al guardar sala en caché: ${error.message}`);
      throw error;
    }
  }

  /**
   * Recupera información de una sala de chat
   * @param roomId ID de la sala de chat
   */
  async getChatRoom(roomId: string): Promise<any | null> {
    try {
      const data = await this.redisClient.get(`chat:room:${roomId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Error al recuperar sala de caché: ${error.message}`);
      return null;
    }
  }

  /**
   * Guarda las salas de chat de un usuario
   * @param userId ID del usuario
   * @param userType Tipo de usuario (employee o visitor)
   * @param rooms Lista de salas
   * @param ttl Tiempo de vida en segundos (opcional)
   */
  async saveUserRooms(userId: string, userType: string, rooms: any[], ttl = 3600): Promise<void> {
    try {
      const key = `chat:user:${userType}:${userId}:rooms`;
      await this.redisClient.set(key, JSON.stringify(rooms));
      
      if (ttl) {
        await this.redisClient.expire(key, ttl);
      }
    } catch (error) {
      this.logger.error(`Error al guardar salas de usuario en caché: ${error.message}`);
      throw error;
    }
  }

  /**
   * Recupera las salas de chat de un usuario
   * @param userId ID del usuario
   * @param userType Tipo de usuario (employee o visitor)
   */
  async getUserRooms(userId: string, userType: string): Promise<any[]> {
    try {
      const data = await this.redisClient.get(`chat:user:${userType}:${userId}:rooms`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      this.logger.error(`Error al recuperar salas de usuario de caché: ${error.message}`);
      return [];
    }
  }

  // Métodos para gestión de caché de ubicaciones de tarjetas
  
  /**
   * Guarda la ubicación de una tarjeta
   * @param cardId ID de la tarjeta
   * @param location Objeto con las coordenadas
   * @param ttl Tiempo de vida en segundos (opcional)
   */
  async saveCardLocation(cardId: string, location: any, ttl = 3600): Promise<void> {
    try {
      const key = `card:location:${cardId}`;
      await this.redisClient.set(key, JSON.stringify({
        ...location,
        updated_at: new Date().toISOString()
      }));
      
      if (ttl) {
        await this.redisClient.expire(key, ttl);
      }

      // Guardar también en un conjunto geoespacial para consultas de proximidad
      if (location.latitude && location.longitude) {
        await this.redisClient.geoadd(
          'cards:locations',
          location.longitude,
          location.latitude,
          cardId
        );
      }
    } catch (error) {
      this.logger.error(`Error al guardar ubicación de tarjeta en caché: ${error.message}`);
      throw error;
    }
  }

  /**
   * Recupera la ubicación de una tarjeta
   * @param cardId ID de la tarjeta
   */
  async getCardLocation(cardId: string): Promise<any | null> {
    try {
      const data = await this.redisClient.get(`card:location:${cardId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Error al recuperar ubicación de tarjeta de caché: ${error.message}`);
      return null;
    }
  }

  /**
   * Obtiene las tarjetas cercanas a unas coordenadas
   * @param latitude Latitud
   * @param longitude Longitud
   * @param radius Radio en metros
   */
  async getNearbyCards(latitude: number, longitude: number, radius = 100): Promise<any[]> {
    try {
      const results = await this.redisClient.georadius(
        'cards:locations',
        longitude,
        latitude,
        radius,
        'm', // metros
        'WITHCOORD',
        'WITHDIST',
        'ASC' // ordenados por distancia ascendente
      );
      
      const cards = [];
      
      // Transformar resultados
      for (const result of results as any[]) {
        const cardId = result[0];
        const distance = parseFloat(result[1]);
        const coordinates = result[2];
        
        const cardData = await this.getCardLocation(cardId);
        
        if (cardData) {
          cards.push({
            ...cardData,
            distance_meters: distance,
            coordinates: {
              longitude: parseFloat(coordinates[0]),
              latitude: parseFloat(coordinates[1])
            }
          });
        }
      }
      
      return cards;
    } catch (error) {
      this.logger.error(`Error al buscar tarjetas cercanas: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Método genérico para guardar cualquier dato en caché
   * @param key Clave
   * @param data Datos a guardar
   * @param ttl Tiempo de vida en segundos (opcional)
   */
  async set(key: string, data: any, ttl?: number): Promise<void> {
    try {
      await this.redisClient.set(key, typeof data === 'string' ? data : JSON.stringify(data));
      
      if (ttl) {
        await this.redisClient.expire(key, ttl);
      }
    } catch (error) {
      this.logger.error(`Error al guardar datos en caché: ${error.message}`);
      throw error;
    }
  }

  /**
   * Método genérico para recuperar datos de la caché
   * @param key Clave
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const data = await this.redisClient.get(key);
      if (!data) return null;
      
      try {
        return JSON.parse(data) as T;
      } catch {
        return data as unknown as T;
      }
    } catch (error) {
      this.logger.error(`Error al recuperar datos de caché: ${error.message}`);
      return null;
    }
  }

  /**
   * Elimina una o varias claves de la caché
   * @param keys Lista de claves a eliminar
   */
  async delete(...keys: string[]): Promise<void> {
    try {
      if (keys.length) {
        await this.redisClient.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Error al eliminar datos de caché: ${error.message}`);
      throw error;
    }
  }

  /**
   * Limpia todos los datos de la caché
   */
  async flushAll(): Promise<void> {
    try {
      await this.redisClient.flushall();
      this.logger.log('Caché limpiada completamente');
    } catch (error) {
      this.logger.error(`Error al limpiar caché: ${error.message}`);
      throw error;
    }
  }
}
