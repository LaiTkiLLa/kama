import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { DocumentLoaderService } from './document-loader.service';
import { ChunkerService } from './chunker.service';
import { EmbeddingService } from './embedding.service';
import { QdrantService } from './qdrant.service';
import { RagController } from './rag.controller';

@Module({
  controllers: [RagController],
  providers: [RagService, DocumentLoaderService, ChunkerService, EmbeddingService, QdrantService],
  exports: [EmbeddingService, QdrantService]
})
export class RagModule {}
