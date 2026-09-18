import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { ConfigService } from '@nestjs/config';
import { DocumentChunk } from './chunker.service';
import { createHash } from 'node:crypto';

@Injectable()
export class QdrantService implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('QDRANT_URL');

    if (!url) {
      throw new Error('QDRANT_URL не найден');
    }

    this.collectionName = this.configService.get<string>('QDRANT_COLLECTION') ?? 'documentation';

    this.client = new QdrantClient({
      url
    });
  }

  private readonly logger = new Logger(QdrantService.name);

  private readonly collectionName: string;

  private readonly client: QdrantClient;

  async onModuleInit() {
    await this.createCollection();
  }

  private async createCollection() {
    const collections = await this.client.getCollections();

    const exists = collections.collections.some(collection => collection.name === this.collectionName);

    if (exists) {
      this.logger.log(`Коллекция "${this.collectionName}" уже существует`);

      return;
    }

    await this.client.createCollection(this.collectionName, {
      vectors: {
        size: 384,
        distance: 'Cosine'
      }
    });

    this.logger.log(`Коллекция "${this.collectionName}" создана`);
  }

  async upsertChunks(chunks: DocumentChunk[], embeddings: number[][]) {
    if (chunks.length !== embeddings.length) {
      throw new Error(
        `Количество чанков (${chunks.length}) не совпадает с количеством embeddings (${embeddings.length})`
      );
    }

    const points = chunks.map((chunk, index) => ({
      id: this.generateChunkId(chunk),

      vector: embeddings[index],

      payload: {
        content: chunk.content,
        source: chunk.source,
        heading: chunk.heading
      }
    }));

    await this.client.upsert(this.collectionName, {
      wait: true,
      points
    });

    this.logger.log(`В Qdrant записано ${points.length} чанков`);
  }

  private generateChunkId(chunk: DocumentChunk): string {
    return createHash('sha256').update(`${chunk.source}:${chunk.content}`).digest('hex').slice(0, 32);
  }
}
