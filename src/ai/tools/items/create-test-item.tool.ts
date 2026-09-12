import { Injectable } from '@nestjs/common';
import { AiTool } from '../ai-tool.interface';
import { CreateTestItemSchema } from './dto/create-test-item.schema';
import { ItemsAiToolsService } from '../../../items/services/items-ai-tools.service';

@Injectable()
export class CreateTestItemTool implements AiTool {
  readonly name = 'create_test_item';
  readonly schema = CreateTestItemSchema;

  readonly description = `
Создаёт тестовый (расчётный) товар в системе.
Это не реальная карточка на маркетплейсе — товар нужен для проверки расчётов.

Используй этот инструмент, когда пользователь просит:
- создать тестовый товар;
- создать тестовый товар с указанными габаритами;
- создать тестовый товар для проверки расчётов;
- создать тестовый товар с указанной категорией.

Параметры товара (все обязательны):
- length — длина в сантиметрах;
- width — ширина в сантиметрах;
- height — высота в сантиметрах;
- weight — вес в килограммах;
- category — категория товара.

Габариты могут быть дробными.

Не вызывай инструмент, если пользователь не указал все необходимые
для создания товара значения. Попроси указать только недостающие.

Не придумывай значения длины, ширины, высоты, веса или категории.

После успешного создания инструмент возвращает артикул созданного товара (article).
Сообщи пользователю этот артикул.
`;

  readonly parameters = CreateTestItemSchema;

  constructor(private readonly itemsAiService: ItemsAiToolsService) {}

  async execute(args: unknown) {
    const validatedArgs = CreateTestItemSchema.parse(args);

    return this.itemsAiService.createTestItem(validatedArgs);
  }
}
