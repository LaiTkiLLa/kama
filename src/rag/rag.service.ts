import { Injectable } from '@nestjs/common';
import { DocumentLoaderService } from './document-loader.service';
import { ChunkerService } from './chunker.service';
import { EmbeddingService } from './embedding.service';
import { QdrantService } from './qdrant.service';

@Injectable()
export class RagService {
  constructor(
    private readonly documentLoaderService: DocumentLoaderService,
    private readonly chunkerService: ChunkerService,
    private readonly embeddingService: EmbeddingService,
    private readonly qdrantService: QdrantService
  ) {}

  async makeDocumentationChunks() {
    const documents = await this.documentLoaderService.loadDocuments();

    return documents.flatMap(document => this.chunkerService.chunkDocument(document));
  }

  async makeIndexDocumentation() {
    console.log('start');
    const chunks = await this.makeDocumentationChunks();
    console.log('first');
    const embeddings = await this.embeddingService.embedChunks(chunks);
    console.log('second');
    await this.qdrantService.upsertChunks(chunks, embeddings);
    console.log('end');
  }
}
