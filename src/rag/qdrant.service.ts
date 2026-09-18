import { Injectable, Logger } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { RetrievedChunk } from './interfaces/retrieved-chunk.interface';
import { DocumentChunk } from './interfaces/document-chunk.interface';
import { EmbeddingService } from './embedding.service';

/**
 * Векторное хранилище чанков документации. Qdrant — внешний сервис
 * (отдельный docker вне этого репозитория), адрес — QDRANT_URL.
 *
 * Подключение ленивое: приложение стартует без Qdrant / без QDRANT_URL,
 * коллекция проверяется/создаётся при первом обращении (индексация или поиск),
 * ошибка доходит до вызывающего — cron'ы маркетплейсов от Qdrant не зависят.
 */
@Injectable()
export class QdrantService {
  constructor(private readonly configService: ConfigService) {
    this.collectionName = this.configService.get<string>('qdrantCollection') ?? 'documentation';

    const url = this.configService.get<string>('qdrantUrl');

    if (!url) {
      this.logger.warn('QDRANT_URL не задан — индексация и поиск по документации недоступны');

      return;
    }

    this.client = new QdrantClient({ url });
  }

  private readonly logger = new Logger(QdrantService.name);

  private readonly collectionName: string;

  private readonly client?: QdrantClient;

  /** Memoized promise: коллекция проверяется/создаётся один раз за жизнь процесса. */
  private collectionReady?: Promise<void>;

  async search(queryEmbedding: number[], topK: number, minSimilarity: number): Promise<RetrievedChunk[]> {
    const client = await this.getReadyClient();

    const result = await client.query(this.collectionName, {
      query: queryEmbedding,
      limit: topK,
      score_threshold: minSimilarity,
      with_payload: true
    });

    return result.points.map(point => ({
      content: point.payload?.content as string,
      source: point.payload?.source as string,
      heading: point.payload?.heading as string | undefined,
      similarity: point.score
    }));
  }

  /**
   * Удаляет все точки указанных документов.
   * Вызывается перед upsert при переиндексации, чтобы изменённые/удалённые
   * секции не оставались в коллекции (id зависит от содержимого чанка).
   */
  async deleteBySources(sources: string[]) {
    if (!sources.length) {
      return;
    }

    const client = await this.getReadyClient();

    await client.delete(this.collectionName, {
      wait: true,
      filter: {
        must: [{ key: 'source', match: { any: sources } }]
      }
    });

    this.logger.log(`Из Qdrant удалены чанки документов: ${sources.join(', ')}`);
  }

  async upsertChunks(chunks: DocumentChunk[], embeddings: number[][]) {
    if (chunks.length !== embeddings.length) {
      throw new Error(
        `Количество чанков (${chunks.length}) не совпадает с количеством embeddings (${embeddings.length})`
      );
    }

    if (!chunks.length) {
      return;
    }

    const client = await this.getReadyClient();

    const points = chunks.map((chunk, index) => ({
      id: this.generateChunkId(chunk),
      vector: embeddings[index],
      payload: {
        content: chunk.content,
        source: chunk.source,
        heading: chunk.heading
      }
    }));

    await client.upsert(this.collectionName, {
      wait: true,
      points
    });

    this.logger.log(`В Qdrant записано ${points.length} чанков`);
  }

  /**
   * Клиент с гарантированно существующей коллекцией.
   * Без QDRANT_URL — понятная ошибка вместо TypeError на undefined-клиенте.
   */
  private async getReadyClient(): Promise<QdrantClient> {
    if (!this.client) {
      throw new Error('QDRANT_URL не задан — Qdrant недоступен');
    }

    this.collectionReady ??= this.ensureCollection(this.client).catch((error: unknown) => {
      // Сбросить, чтобы следующий вызов повторил попытку (Qdrant мог быть временно недоступен).
      this.collectionReady = undefined;

      throw error;
    });

    await this.collectionReady;

    return this.client;
  }

  private async ensureCollection(client: QdrantClient) {
    const { exists } = await client.collectionExists(this.collectionName);

    if (exists) {
      return;
    }

    await client.createCollection(this.collectionName, {
      vectors: {
        size: EmbeddingService.VECTOR_SIZE,
        distance: 'Cosine'
      }
    });

    // Индекс по payload.source — для фильтра в deleteBySources.
    await client.createPayloadIndex(this.collectionName, {
      field_name: 'source',
      field_schema: 'keyword',
      wait: true
    });

    this.logger.log(`Коллекция "${this.collectionName}" создана`);
  }

  /**
   * Детерминированный id: sha256(source:content), первые 32 hex —
   * Qdrant парсит как UUID в simple-формате.
   */
  private generateChunkId(chunk: DocumentChunk): string {
    return createHash('sha256').update(`${chunk.source}:${chunk.content}`).digest('hex').slice(0, 32);
  }
}
