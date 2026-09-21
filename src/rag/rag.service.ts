import { Injectable, Logger } from '@nestjs/common';
import { DocumentLoaderService } from './document-loader.service';
import { ChunkerService } from './chunker.service';
import { EmbeddingService } from './embedding.service';
import { QdrantService } from './qdrant.service';
import { RetrievedChunk } from './interfaces/retrieved-chunk.interface';
import { SearchDocumentationArgs } from '../ai/tools/rag/dto/search-documentation.schema';
import { IndexDocumentationResult } from './interfaces/index-documentation-result.interface';
import { RerankerService } from './reranker.service';

@Injectable()
export class RagService {
  constructor(
    private readonly documentLoaderService: DocumentLoaderService,
    private readonly chunkerService: ChunkerService,
    private readonly embeddingService: EmbeddingService,
    private readonly qdrantService: QdrantService,
    private readonly rerankerService: RerankerService
  ) {}

  private readonly logger = new Logger(RagService.name);

  /** Сколько чанков отдаём LLM. */
  private static readonly TOP_K = 3;

  /**
   * Минимальный cosine score. Значение не откалибровано на реальных вопросах —
   * смотреть similarity в логах searchDocumentation и корректировать.
   */
  private static readonly MIN_SIMILARITY = 0.5;

  /**
   * Полная переиндексация docs/rag: старые чанки этих документов удаляются,
   * затем записываются новые.
   */
  async makeIndexDocumentation(): Promise<IndexDocumentationResult> {
    const documents = await this.documentLoaderService.loadDocuments();
    const chunks = documents.flatMap(document => this.chunkerService.chunkDocument(document));
    const sources = documents.map(document => document.source);

    const embeddings = await this.embeddingService.embedChunks(chunks);

    await this.qdrantService.deleteBySources(sources);
    await this.qdrantService.upsertChunks(chunks, embeddings);

    this.logger.log(`Проиндексировано документов: ${documents.length}, чанков: ${chunks.length}`);

    return { documents: sources, chunksCount: chunks.length };
  }

  async searchDocumentation(params: SearchDocumentationArgs): Promise<RetrievedChunk[]> {
    const queryEmbedding = await this.embeddingService.embedQuery(params.query);
    const candidates = await this.qdrantService.search(queryEmbedding, 10, RagService.MIN_SIMILARITY);

    this.logger.log(
      `Qdrant "${params.query}": ` +
        `[${candidates
          .map(chunk => `${chunk.source}#${chunk.heading ?? '-'}=${chunk.similarity.toFixed(3)}`)
          .join(', ')}]`
    );

    const reranked = await this.rerankerService.rerank(params.query, candidates);

    this.logger.log(
      `Reranked "${params.query}": ` +
        `[${reranked
          .map(chunk => `${chunk.source}#${chunk.heading ?? '-'}=` + `${chunk.rerankScore.toFixed(3)}`)
          .join(', ')}]`
    );

    return reranked.slice(0, RagService.TOP_K);
  }
}
