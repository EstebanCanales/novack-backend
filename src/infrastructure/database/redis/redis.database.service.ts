import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import * as crypto from 'crypto';

@Injectable()
export class RedisDatabaseService implements OnModuleInit {
  private readonly logger = new Logger(RedisDatabaseService.name);
  private redisClient: RedisClientType;
  private encryptionKey: Buffer;

  constructor(private configService: ConfigService) {
    // Crear una clave de encriptación basada en una variable de entorno o generar una
    const encryptionKeyStr = this.configService.get<string>('REDIS_ENCRYPTION_KEY', 'defaultEncryptionKey123456789');
    // Crear una clave de 32 bytes (256 bits) usando una función hash
    this.encryptionKey = crypto.createHash('sha256').update(String(encryptionKeyStr)).digest();
  }

  async onModuleInit() {
    try {
      // En entorno de pruebas, es posible que ya tengamos un cliente mock asignado
      if (!this.redisClient) {
        // Determinar si se debe usar TLS basado en una variable de entorno o el entorno
        const useTLS = this.configService.get<string>('REDIS_TLS', 'false') === 'true';
        
        // Obtener configuraciones comunes
        const username = this.configService.get('REDIS_USERNAME', 'default');
        const password = this.configService.get('REDIS_PASSWORD', 'veryhardpassword');
        const host = this.configService.get('REDIS_HOST', 'localhost');
        const port = parseInt(this.configService.get('REDIS_PORT', '6379'));
        
        // Configuración para Redis Cloud usando la biblioteca redis oficial
        const clientOptions: any = {
          username,
          password
        };
        
        // Configurar las opciones de socket según si TLS está habilitado o no
        if (useTLS) {
          clientOptions.socket = {
            host,
            port,
            tls: true,
            reconnectStrategy: (retries: number) => {
              const delay = Math.min(retries * 50, 2000);
              this.logger.log(`Reintento de conexión a Redis Cloud en ${delay}ms`);
              return delay;
            }
          };
        } else {
          clientOptions.socket = {
            host,
            port,
            reconnectStrategy: (retries: number) => {
              const delay = Math.min(retries * 50, 2000);
              this.logger.log(`Reintento de conexión a Redis Cloud en ${delay}ms`);
              return delay;
            }
          };
        }
        
        this.redisClient = createClient(clientOptions);

        this.redisClient.on('connect', () => {
          this.logger.log('Conexión a Redis Cloud establecida correctamente');
        });

        this.redisClient.on('error', (error) => {
          this.logger.error(`Error en la conexión a Redis Cloud: ${error.message}`);
        });

        await this.redisClient.connect();
      }

      await this.testConnection();
    } catch (error) {
      this.logger.error(`Error al inicializar Redis Cloud: ${error.message}`);
      throw error;
    }
  }

  async testConnection() {
    try {
      await this.redisClient.ping();
      this.logger.log('Conexión a Redis Cloud verificada con éxito');
      return { status: 'ok', message: 'Conexión a Redis Cloud establecida' };
    } catch (error) {
      this.logger.error(`Error al verificar conexión a Redis Cloud: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cifra un valor para almacenarlo de forma segura
   * @param value Dato a cifrar
   */
  private encrypt(value: string): string {
    try {
      // Generar un IV aleatorio de 16 bytes
      const iv = crypto.randomBytes(16);
      // Crear un cifrador usando la clave y el IV
      const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
      // Cifrar el valor
      let encrypted = cipher.update(value, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      // Retornar el IV y el valor cifrado juntos
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      this.logger.error(`Error al cifrar datos: ${error.message}`);
      // En caso de error, retornar el valor original
      return value;
    }
  }

  /**
   * Descifra un valor previamente cifrado
   * @param encryptedValue Valor cifrado
   */
  private decrypt(encryptedValue: string): string {
    try {
      // Separar el IV y el valor cifrado
      const [ivHex, encryptedHex] = encryptedValue.split(':');
      if (!ivHex || !encryptedHex) {
        return encryptedValue; // El valor no está en el formato esperado
      }
      // Convertir el IV y el valor cifrado a buffers
      const iv = Buffer.from(ivHex, 'hex');
      // Crear un descifrador usando la clave y el IV
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
      // Descifrar el valor
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.logger.error(`Error al descifrar datos: ${error.message}`);
      // En caso de error, retornar el valor original
      return encryptedValue;
    }
  }

  /**
   * Determina si un valor debe ser cifrado por contener información sensible
   * @param key Clave Redis
   * @param value Valor a evaluar
   */
  private shouldEncrypt(key: string, value: any): boolean {
    if (typeof value !== 'string' && typeof value !== 'object') {
      return false;
    }
    
    // Lista de prefijos de claves sensibles que deben ser cifradas
    const sensitivePrefixes = [
      'user:',
      'auth:',
      'chat:message:',
      'payment:',
      'card:',
    ];
    
    // Verificar si la clave corresponde a datos sensibles
    return sensitivePrefixes.some(prefix => key.startsWith(prefix));
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
      
      // Cifrar el contenido del mensaje si contiene información sensible
      const messageToSave = { ...message };
      if (messageToSave.content) {
        messageToSave.content = this.encrypt(messageToSave.content);
      }
      
      await this.redisClient.set(key, JSON.stringify(messageToSave));
      
      // Añadir mensaje al listado de mensajes de la sala
      await this.redisClient.lPush(`chat:messages:${roomId}`, message.id);
      
      // Mantener solo los últimos 100 mensajes por sala
      await this.redisClient.lTrim(`chat:messages:${roomId}`, 0, 99);
      
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
      // Asegurarse de que el límite sea un número entero válido
      const validLimit = Math.max(1, Math.min(parseInt(String(limit), 10) || 50, 100));
      
      // Obtener los IDs de los mensajes más recientes
      // Asegurarse de que los parámetros sean números enteros
      const messageIds = await this.redisClient.lRange(
        `chat:messages:${roomId}`, 
        0, 
        validLimit - 1
      );
      
      if (!messageIds || !messageIds.length) return [];
      
      // En lugar de usar multi.exec, recuperar los mensajes uno por uno
      const messages = [];
      for (const msgId of messageIds) {
        try {
          const data = await this.redisClient.get(`chat:message:${roomId}:${msgId}`);
          if (data) {
            const message = JSON.parse(String(data));
            
            // Descifrar el contenido del mensaje si está cifrado
            if (message && message.content && typeof message.content === 'string' && message.content.includes(':')) {
              message.content = this.decrypt(message.content);
            }
            messages.push(message);
          }
        } catch (e) {
          this.logger.error(`Error al obtener mensaje ${msgId}: ${e.message}`);
          // Continuar con el siguiente mensaje
        }
      }
      
      return messages;
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
      if (!data) return null;
      
      try {
        return JSON.parse(data as string);
      } catch (e) {
        this.logger.error(`Error al parsear sala: ${e.message}`);
        return null;
      }
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
      if (!data) return [];
      
      try {
        return JSON.parse(data as string);
      } catch (e) {
        this.logger.error(`Error al parsear salas: ${e.message}`);
        return [];
      }
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
      
      // Las ubicaciones son datos sensibles, cifrar la información
      const locationToSave = {
        ...location,
        updated_at: new Date().toISOString()
      };
      
      // Cifrar los datos de ubicación
      if (location.latitude && location.longitude) {
        locationToSave.latitude = this.encrypt(location.latitude.toString());
        locationToSave.longitude = this.encrypt(location.longitude.toString());
      }
      
      await this.redisClient.set(key, JSON.stringify(locationToSave));
      
      if (ttl) {
        await this.redisClient.expire(key, ttl);
      }

      // Guardar también en un conjunto geoespacial para consultas de proximidad
      if (location.latitude && location.longitude) {
        await this.redisClient.geoAdd('cards:locations', {
          longitude: location.longitude,
          latitude: location.latitude,
          member: cardId
        });
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
      if (!data) return null;
      
      try {
        const location = JSON.parse(data as string);
        
        // Descifrar los datos de ubicación
        if (location.latitude && typeof location.latitude === 'string' && location.latitude.includes(':')) {
          location.latitude = parseFloat(this.decrypt(location.latitude));
        }
        
        if (location.longitude && typeof location.longitude === 'string' && location.longitude.includes(':')) {
          location.longitude = parseFloat(this.decrypt(location.longitude));
        }
        
        return location;
      } catch (e) {
        this.logger.error(`Error al parsear ubicación: ${e.message}`);
        return null;
      }
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
      const results = await this.redisClient.sendCommand([
        'GEOSEARCH', 
        'cards:locations', 
        'FROMLONLAT', 
        longitude.toString(), 
        latitude.toString(), 
        'BYRADIUS', 
        radius.toString(), 
        'm',
        'COUNT', 
        '50'
      ]) as unknown as string[];
      
      if (!results || !results.length) return [];
      
      // Usar sendCommand para ejecutar GEOSEARCH con WITHDIST y WITHCOORD
      const cardsWithDistances = await this.redisClient.sendCommand([
        'GEOSEARCH', 
        'cards:locations', 
        'FROMLONLAT', 
        longitude.toString(), 
        latitude.toString(), 
        'BYRADIUS', 
        radius.toString(), 
        'm', 
        'WITHDIST', 
        'WITHCOORD',
        'COUNT', 
        '50'
      ]) as unknown as Array<[string, string, [string, string]]>;
      
      if (!cardsWithDistances || !cardsWithDistances.length) return [];
      
      const cards = [];
      
      // Transformar resultados
      for (const result of cardsWithDistances) {
        // result es un array [miembro, distancia, [lon, lat]]
        if (Array.isArray(result) && result.length >= 3) {
          const cardId = result[0].toString();
          const distance = parseFloat(result[1]);
          const coordinates = {
            longitude: parseFloat(result[2][0]),
            latitude: parseFloat(result[2][1])
          };
          
          const cardData = await this.getCardLocation(cardId);
          
          if (cardData) {
            cards.push({
              ...cardData,
              distance_meters: distance,
              coordinates
            });
          }
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
      const shouldEncryptData = this.shouldEncrypt(key, data);
      
      let valueToStore: string;
      if (shouldEncryptData) {
        if (typeof data === 'string') {
          valueToStore = this.encrypt(data);
        } else {
          valueToStore = this.encrypt(JSON.stringify(data));
        }
      } else {
        valueToStore = typeof data === 'string' ? data : JSON.stringify(data);
      }
      
      const options: any = {};
      if (ttl) {
        options.EX = ttl;
      }
      
      await this.redisClient.set(key, valueToStore, options);
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
      
      const shouldBeEncrypted = this.shouldEncrypt(key, data);
      
      if (shouldBeEncrypted && typeof data === 'string' && data.includes(':')) {
        const decrypted = this.decrypt(data);
        try {
          return JSON.parse(decrypted) as T;
        } catch {
          return decrypted as unknown as T;
        }
      }
      
      try {
        return JSON.parse(data as string) as T;
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
        await this.redisClient.del(keys);
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
      await this.redisClient.flushAll();
      this.logger.log('Caché limpiada completamente');
    } catch (error) {
      this.logger.error(`Error al limpiar caché: ${error.message}`);
      throw error;
    }
  }
}
