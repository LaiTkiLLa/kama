import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { DocumentLoaderService } from './document-loader.service';
import { ChunkerService } from './chunker.service';
import { EmbeddingService } from './embedding.service';
import { QdrantService } from './qdrant.service';
import { RagController } from './rag.controller';
import { RerankerService } from './reranker.service';

@Module({
  controllers: [RagController],
  providers: [
    RagService,
    DocumentLoaderService,
    ChunkerService,
    EmbeddingService,
    QdrantService,
    RerankerService
  ],
  exports: [RagService]
})
export class RagModule {}
