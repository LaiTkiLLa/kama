export interface DocumentChunk {
  /** Текст для embedding и для показа LLM: breadcrumb заголовков + фрагмент секции. */
  content: string;
  /** Имя файла в docs/rag. */
  source: string;
  /** Заголовок секции, из которой взят фрагмент. */
  heading?: string;
}

/** Промежуточная единица разбора markdown в ChunkerService (до деления на чанки). */
export interface Section {
  heading?: string;
  /** Цепочка заголовков от корня документа до текущей секции. */
  breadcrumb: string[];
  body: string;
}
