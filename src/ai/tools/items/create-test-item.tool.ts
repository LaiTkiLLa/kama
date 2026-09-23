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

* создать тестовый товар;
* создать тестовый товар с указанными габаритами;
* создать тестовый товар для проверки расчётов;
* создать тестовый товар с указанной категорией;
* создать тестовый товар с указанной себестоимостью;
* создать тестовый товар с указанными параметрами расчёта.

Параметры товара:

Обязательные:

* lengthMasterBox — длина мастер короба в сантиметрах;
* widthMasterBox — ширина мастер короба в сантиметрах;
* heightMasterBox — высота мастер короба в сантиметрах;
* weightMasterBox — вес мастер короба в килограммах;
* lengthItem — длина штучного товара в сантиметрах;
* widthItem — ширина штучного товара в сантиметрах;
* heightItem — высота штучного товара в сантиметрах;
* weightItem — вес штучного товара в килограммах;
* category — категория товара;
* costInYuan — себестоимость товара в юанях;
* costInYuanWhite — себестоимость товара в юанях в белую;
* costCalculationType — тип расчёта таможенной стоимости;
* calculationType — тип расчёта товара;
* downloadCalculationMethod — метод расчёта загрузки;
* multiplicity — кратность товара.

Необязательный:

* title — наименование товара.

Габариты и вес (мастер-короб и штучный товар) могут быть дробными.
Не путай габариты мастер-короба (*MasterBox) с габаритами штучного товара (*Item).

Не вызывай инструмент, если пользователь не указал все обязательные
для создания товара значения. Попроси указать только недостающие значения.

Не придумывай значения длины, ширины, высоты, веса (ни мастер-короба,
ни штучного товара), категории, себестоимости или параметров расчёта.

Для параметров с фиксированными вариантами используй только значения,
разрешённые схемой инструмента. Не придумывай и не изменяй варианты.

Если пользователь не указал наименование товара (title), не запрашивай
его дополнительно — это поле необязательное.

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
