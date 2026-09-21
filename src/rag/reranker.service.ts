import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InferenceClient } from '@huggingface/inference';
import { RerankedChunk, RetrievedChunk } from './interfaces/retrieved-chunk.interface';

@Injectable()
export class RerankerService {
  private readonly model = 'BAAI/bge-reranker-v2-m3';

  private client?: InferenceClient;

  constructor(private readonly configService: ConfigService) {}

  async rerank(query: string, chunks: RetrievedChunk[]): Promise<RerankedChunk[]> {
    if (!chunks.length) {
      return [];
    }

    const results = await Promise.all(
      chunks.map(async chunk => {
        const result = await this.getClient().textClassification({
          model: this.model,
          inputs: `${query}\n${chunk.content}`,
          parameters: {
            top_k: 1,
            function_to_apply: 'sigmoid'
          }
        });

        const score = result[0]?.score ?? 0;

        return {
          ...chunk,
          rerankScore: score
        };
      })
    );

    return results.sort((a, b) => b.rerankScore - a.rerankScore);
  }

  private getClient(): InferenceClient {
    if (this.client) {
      return this.client;
    }

    const hfToken = this.configService.get<string>('huggingFaceToken');

    if (!hfToken) {
      throw new Error('HUGGING_FACE_TOKEN не задан — reranker недоступен');
    }

    this.client = new InferenceClient(hfToken);

    return this.client;
  }
}
