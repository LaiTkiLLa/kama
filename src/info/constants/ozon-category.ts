/**
 * Whitelist категорий Ozon для справочника.
 * Расширение: добавить запись с title + typeId + isParent.
 *
 * typeId:
 * - isParent: true  → description_category_id (уровень category в дереве Ozon)
 * - isParent: false → type_id (leaf для create; parent description_category_id берётся из API-дерева)
 *
 * Sync: одно дерево из API, в БД попадают только записи из списка (title — для warn при расхождении с API).
 */
export type OzonCategoryWhitelistEntry = {
  title: string;
  typeId: number;
  isParent: boolean;
};

export const OZON_CATEGORY: OzonCategoryWhitelistEntry[] = [
  {
    title: 'Балансир спортивный',
    typeId: 970725247,
    isParent: false
  },
  {
    title: 'Беговая дорожка',
    typeId: 94241,
    isParent: false
  },
  {
    title: 'Блок для йоги',
    typeId: 95916,
    isParent: false
  },
  {
    title: 'Гантели',
    typeId: 115947377,
    isParent: false
  },
  {
    title: 'Гиря',
    typeId: 115947379,
    isParent: false
  },
  {
    title: 'Коврик для йоги, фитнеса',
    typeId: 95918,
    isParent: false
  },
  {
    title: 'Кольцо для пилатеса',
    typeId: 95919,
    isParent: false
  },
  {
    title: 'Массажер спортивный',
    typeId: 970672227,
    isParent: false
  },
  {
    title: 'Медицинбол',
    typeId: 93554,
    isParent: false
  },
  {
    title: 'Ролик для пресса',
    typeId: 95926,
    isParent: false
  },
  {
    title: 'Степпер',
    typeId: 115945775,
    isParent: false
  },
  {
    title: 'Тренажер-реформер для пилатеса',
    typeId: 971290276,
    isParent: false
  },
  {
    title: 'Турник',
    typeId: 115945779,
    isParent: false
  },
  {
    title: 'Утяжелители',
    typeId: 95932,
    isParent: false
  },
  {
    title: 'Фитбол',
    typeId: 95921,
    isParent: false
  },
  {
    title: 'Фитнес-резинка',
    typeId: 970700415,
    isParent: false
  },
  {
    title: 'Эспандер',
    typeId: 115947437,
    isParent: false
  },
  {
    title: 'Фитнес и йога',
    typeId: 17028709,
    isParent: true
  },
  {
    title: 'Туристическая посуда',
    typeId: 17028698,
    isParent: true
  },
  {
    title: 'Тренажеры',
    typeId: 17028706,
    isParent: true
  },
  {
    title: 'Аксессуары и инвентарь для тяжелой атлетики',
    typeId: 17028707,
    isParent: true
  },
  {
    title: 'Мячи, воланы, снаряды',
    typeId: 17029006,
    isParent: true
  }
];
