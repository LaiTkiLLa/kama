import { Injectable } from '@nestjs/common';
import { AiTool } from '../ai-tool.interface';
import { RagService } from '../../../rag/rag.service';
import { SearchDocumentationSchema } from './dto/search-documentation.schema';

@Injectable()
export class SearchDocumentationTool implements AiTool {
  readonly name = 'search_documentation';
  readonly schema = SearchDocumentationSchema;

  readonly description = `
Ищет информацию во внутренней документации KAMA.

Используй этот tool, когда пользователь спрашивает:

* как работает функциональность системы;
* как устроен определённый процесс;
* что означает термин, поле или настройка;
* какие правила или инструкции описаны в документации;
* как выполнить действие, если инструкция может находиться во внутренней документации;
* описание структуры, логики или назначения компонентов системы.

Используй этот tool, если ответ можно найти во внутренней документации.

Не используй этот tool для получения текущих данных из базы данных:
* заказов;
* остатков;
* товаров;
* статистики;
* цен;
* выплат.

Для получения текущих данных используй соответствующие tools.

В query передавай содержательный поисковый запрос,
сформулированный на основе вопроса пользователя.

Не добавляй в query информацию, которой нет в вопросе пользователя.
`;

  readonly parameters = SearchDocumentationSchema;

  constructor(private readonly ragService: RagService) {}

  async execute(args: unknown) {
    const validatedArgs = SearchDocumentationSchema.parse(args);

    return this.ragService.searchDocumentation(validatedArgs);
  }
}
