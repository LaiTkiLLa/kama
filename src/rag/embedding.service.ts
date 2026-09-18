import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InferenceClient } from '@huggingface/inference';
import { DocumentChunk } from './interfaces/document-chunk.interface';

/**
 * Embeddings через Hugging Face Inference API.
 * Только векторизация: поиск и работа с Qdrant — в RagService / QdrantService.
 */
@Injectable()
export class EmbeddingService {
  constructor(private readonly configService: ConfigService) {}

  /** Размерность вектора модели; должна совпадать с размером коллекции Qdrant. */
  static readonly VECTOR_SIZE = 384;

  private readonly model = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2';

  private client?: InferenceClient;

  /**
   * Embeddings для массива чанков (индексация).
   */
  async embedChunks(chunks: DocumentChunk[]): Promise<number[][]> {
    if (!chunks.length) {
      return [];
    }

    const result = await this.getClient().featureExtraction({
      inputs: chunks.map(chunk => chunk.content),
      model: this.model,
      provider: 'hf-inference'
    });

    return result as number[][];
  }

  /**
   * Embedding пользовательского вопроса (поиск).
   */
  async embedQuery(query: string): Promise<number[]> {
    const result = await this.getClient().featureExtraction({
      inputs: query,
      model: this.model,
      provider: 'hf-inference'
    });

    return result as number[];
  }

  private getClient(): InferenceClient {
    if (this.client) {
      return this.client;
    }

    const hfToken = this.configService.get<string>('huggingFaceToken');

    if (!hfToken) {
      throw new Error('HUGGING_FACE_TOKEN не задан — embeddings недоступны');
    }

    this.client = new InferenceClient(hfToken);

    return this.client;
  }
}
