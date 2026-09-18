import { DocumentChunk } from './document-chunk.interface';

export interface RetrievedChunk extends DocumentChunk {
  similarity: number;
}
