import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InferenceClient } from '@huggingface/inference';
import { DocumentChunk } from './chunker.service';

export interface RetrievedChunk extends DocumentChunk {
  similarity: number;
}

@Injectable()
export class EmbeddingService {
  constructor(private configService: ConfigService) {}

  private logger: Logger = new Logger(EmbeddingService.name);
  private readonly model = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2';

  /**
   * Находит наиболее похожие чанки документации
   * по вопросу пользователя.
   */
  // async search(query: string, chunks: DocumentChunk[], topK = 3): Promise<RetrievedChunk[]> {
  //   const client = this.getClient();
  //
  //   // Получаем embeddings всех чанков документации
  //   const embeddings = await this.embedChunks(client, chunks);
  //
  //   // Получаем embedding вопроса
  //   const queryEmbedding = await this.embedQuery(client, query);
  //
  //   // Считаем similarity для каждого чанка
  //   const results: RetrievedChunk[] = chunks.map((chunk, index) => ({
  //     ...chunk,
  //     similarity: this.cosineSimilarity(queryEmbedding, embeddings[index])
  //   }));
  //
  //   // Самые похожие сверху
  //   return results.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  // }

  /**
   * Получает embeddings для массива чанков.
   */
  async embedChunks(chunks: DocumentChunk[]): Promise<number[][]> {
    const client = this.getClient();

    const texts = chunks.map(chunk => chunk.content);

    const result = await client.featureExtraction({
      inputs: texts,
      model: this.model,
      provider: 'hf-inference'
    });

    return result as number[][];
  }

  /**
   * Получает embedding для пользовательского вопроса.
   */
  private async embedQuery(client: InferenceClient, query: string): Promise<number[]> {
    const result = await client.featureExtraction({
      inputs: query,
      model: this.model,
      provider: 'hf-inference'
    });

    return result as number[];
  }

  /**
   * Создаёт HF-клиент.
   */
  private getClient(): InferenceClient {
    const hfToken = this.configService.get<string>('huggingFaceToken');

    if (!hfToken) {
      this.logger.error('Не найден токен Hugging Face');
      throw new Error('Hugging Face token не найден');
    }

    return new InferenceClient(hfToken);
  }

  /**
   * Cosine similarity двух векторов.
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Размеры векторов не совпадают: ${a.length} !== ${b.length}`);
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] ** 2;
      normB += b[i] ** 2;
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
