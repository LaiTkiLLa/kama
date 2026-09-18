import { Injectable } from '@nestjs/common';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

@Injectable()
export class DocumentLoaderService {
  private readonly documentsPath = join(process.cwd(), 'docs', 'rag');

  async loadDocuments() {
    const files = await readdir(this.documentsPath);

    const markdownFiles = files.filter(file => file.endsWith('.md'));

    return Promise.all(
      markdownFiles.map(async file => ({
        source: file,
        content: await readFile(join(this.documentsPath, file), 'utf-8')
      }))
    );
  }
}
