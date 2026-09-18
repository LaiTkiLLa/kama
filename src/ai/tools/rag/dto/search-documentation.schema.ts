import { z } from 'zod';

export const SearchDocumentationSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1)
    .describe('Поисковый запрос для поиска информации во внутренней документации KAMA.')
});
export type SearchDocumentationArgs = z.infer<typeof SearchDocumentationSchema>;
