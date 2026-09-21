import { Injectable } from '@nestjs/common';
import { DocumentChunk, Section } from './interfaces/document-chunk.interface';

/**
 * Режет markdown на чанки для embedding.
 *
 * 1. Секция = текст от заголовка до следующего заголовка любого уровня.
 * 2. К каждому чанку добавляется breadcrumb родительских заголовков,
 *    чтобы фрагмент был понятен без соседей («Master Data > Поставщики — SKU»).
 * 3. Секция длиннее MAX_CHUNK_CHARS делится по абзацам (пустая строка) —
 *    embedding-модель обрезает вход (~128 токенов), хвост длинной секции
 *    иначе в вектор не попадает.
 */
@Injectable()
export class ChunkerService {
  /**
   * ~128 токенов XLM-R sentencepiece для русского текста ≈ 500–600 символов.
   * Лимит только на тело фрагмента, breadcrumb добавляется сверху.
   */
  private static readonly MAX_CHUNK_CHARS = 500;

  private static readonly HEADING_RE = /^(#{1,6})\s+(.+?)\s*$/;

  chunkDocument(document: { source: string; content: string }): DocumentChunk[] {
    return this.splitIntoSections(document.content).flatMap(section =>
      this.splitSection(section).map(body => ({
        content: this.buildContent(section.breadcrumb, body),
        source: document.source,
        heading: section.heading,
        section: section.breadcrumb[0]
      }))
    );
  }

  private splitIntoSections(markdown: string): Section[] {
    const sections: Section[] = [];
    // Стек заголовков: индекс = уровень - 1.
    const headingStack: string[] = [];
    let current: Section = { breadcrumb: [], body: '' };

    for (const line of markdown.split('\n')) {
      const match = line.match(ChunkerService.HEADING_RE);

      if (!match) {
        current.body += `${line}\n`;

        continue;
      }

      sections.push(current);

      const level = match[1].length;
      const heading = match[2];

      headingStack.length = level - 1;
      headingStack[level - 1] = heading;

      current = {
        heading,
        breadcrumb: headingStack.filter(Boolean),
        body: ''
      };
    }

    sections.push(current);

    return sections
      .map(section => ({ ...section, body: section.body.trim() }))
      .filter(section => section.body);
  }

  private splitSection(section: Section): string[] {
    if (section.body.length <= ChunkerService.MAX_CHUNK_CHARS) {
      return [section.body];
    }

    const paragraphs = section.body
      .split(/\n\s*\n/)
      .map(paragraph => paragraph.trim())
      .filter(Boolean)
      .flatMap(paragraph => this.splitLongParagraph(paragraph));

    const parts: string[] = [];
    let buffer = '';

    for (const paragraph of paragraphs) {
      const candidate = buffer ? `${buffer}\n\n${paragraph}` : paragraph;

      if (candidate.length <= ChunkerService.MAX_CHUNK_CHARS) {
        buffer = candidate;

        continue;
      }

      if (buffer) {
        parts.push(buffer);
      }

      buffer = paragraph;
    }

    if (buffer) {
      parts.push(buffer);
    }

    return parts;
  }

  /**
   * Абзац длиннее лимита (обычно длинный список) делим по строкам.
   */
  private splitLongParagraph(paragraph: string): string[] {
    if (paragraph.length <= ChunkerService.MAX_CHUNK_CHARS) {
      return [paragraph];
    }

    const parts: string[] = [];
    let buffer = '';

    for (const line of paragraph.split('\n')) {
      const candidate = buffer ? `${buffer}\n${line}` : line;

      if (candidate.length <= ChunkerService.MAX_CHUNK_CHARS || !buffer) {
        buffer = candidate;

        continue;
      }

      parts.push(buffer);
      buffer = line;
    }

    if (buffer) {
      parts.push(buffer);
    }

    return parts;
  }

  private buildContent(breadcrumb: string[], body: string): string {
    if (!breadcrumb.length) {
      return body;
    }

    return `${breadcrumb.join(' > ')}\n\n${body}`;
  }
}
