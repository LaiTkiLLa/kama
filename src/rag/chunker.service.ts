import { Injectable } from '@nestjs/common';

export interface DocumentChunk {
  content: string;
  source: string;
  heading?: string;
}

@Injectable()
export class ChunkerService {
  chunkDocument(document: { source: string; content: string }): DocumentChunk[] {
    const sections = document.content.split(/(?=^#{1,6}\s)/gm);

    return sections
      .map(section => section.trim())
      .filter(Boolean)
      .map(section => {
        const headingMatch = section.match(/^#{1,6}\s+(.+)/);

        return {
          content: section,
          source: document.source,
          heading: headingMatch?.[1]
        };
      });
  }
}
