import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Перенос цен items → marketplace_items.
 *
 * Mapping (текущая модель 1 item row ≈ 1 mp row на том же marketplace_id):
 * - WB:   price_wb → price, discount_wb → discount
 * - Ozon: price_ozon → price, price_with_discount_ozon → price_with_discount
 *
 * Также drop legacy change_prices_histories и price-колонок с items.
 * Схлопывание items — отдельная миграция позже.
 */
export class MovePricesToMarketplaceItems1786522800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    /**
     * 1. Колонки на marketplace_items
     */
    await queryRunner.addColumns('marketplace_items', [
      new TableColumn({
        name: 'price',
        type: 'float',
        isNullable: true
      }),
      new TableColumn({
        name: 'discount',
        type: 'float',
        isNullable: true
      }),
      new TableColumn({
        name: 'price_with_discount',
        type: 'float',
        isNullable: true
      })
    ]);

    /**
     * 2. Backfill WB
     */
    await queryRunner.query(`
      UPDATE marketplace_items mi
      SET
        price = i.price_wb,
        discount = i.discount_wb,
        updated_at = now()
      FROM items i, marketplaces m
      WHERE mi.item_id = i.id
        AND m.id = mi.marketplace_id
        AND m.title = 'WB'
    `);

    /**
     * 3. Backfill Ozon
     */
    await queryRunner.query(`
      UPDATE marketplace_items mi
      SET
        price = i.price_ozon,
        price_with_discount = i.price_with_discount_ozon,
        updated_at = now()
      FROM items i, marketplaces m
      WHERE mi.item_id = i.id
        AND m.id = mi.marketplace_id
        AND m.title = 'Озон'
    `);

    /**
     * 4. Verification
     */
    await queryRunner.query(`
      DO $$
      DECLARE
        missing_wb_price integer;
        missing_ozon_price integer;
        orphan_mp_items integer;
      BEGIN
        SELECT COUNT(*)
        INTO missing_wb_price
        FROM marketplace_items mi
        INNER JOIN items i ON i.id = mi.item_id
        INNER JOIN marketplaces m ON m.id = mi.marketplace_id
        WHERE m.title = 'WB'
          AND i.price_wb IS NOT NULL
          AND mi.price IS NULL;

        IF missing_wb_price > 0 THEN
          RAISE EXCEPTION
            'Migration aborted: % WB marketplace_items missing price after backfill',
            missing_wb_price;
        END IF;

        SELECT COUNT(*)
        INTO missing_ozon_price
        FROM marketplace_items mi
        INNER JOIN items i ON i.id = mi.item_id
        INNER JOIN marketplaces m ON m.id = mi.marketplace_id
        WHERE m.title = 'Озон'
          AND i.price_ozon IS NOT NULL
          AND mi.price IS NULL;

        IF missing_ozon_price > 0 THEN
          RAISE EXCEPTION
            'Migration aborted: % Ozon marketplace_items missing price after backfill',
            missing_ozon_price;
        END IF;

        SELECT COUNT(*)
        INTO orphan_mp_items
        FROM marketplace_items mi
        LEFT JOIN items i ON i.id = mi.item_id
        WHERE i.id IS NULL;

        IF orphan_mp_items > 0 THEN
          RAISE EXCEPTION
            'Migration aborted: % marketplace_items without items row',
            orphan_mp_items;
        END IF;
      END $$;
    `);

    /**
     * 5. Drop change_prices_histories
     */
    const historyTable = await queryRunner.getTable('change_prices_histories');
    if (historyTable) {
      await queryRunner.dropTable('change_prices_histories', true, true, true);
    }

    /**
     * 6. Drop price columns from items
     */
    await queryRunner.dropColumns('items', [
      'price_wb',
      'discount_wb',
      'price_ozon',
      'price_with_discount_ozon'
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({ name: 'price_wb', type: 'float', isNullable: true }),
      new TableColumn({ name: 'discount_wb', type: 'float', isNullable: true }),
      new TableColumn({ name: 'price_ozon', type: 'float', isNullable: true }),
      new TableColumn({
        name: 'price_with_discount_ozon',
        type: 'float',
        isNullable: true
      })
    ]);

    await queryRunner.query(`
      UPDATE items i
      SET
        price_wb = mi.price,
        discount_wb = mi.discount
      FROM marketplace_items mi
      INNER JOIN marketplaces m ON m.id = mi.marketplace_id
      WHERE mi.item_id = i.id
        AND m.title = 'WB'
    `);

    await queryRunner.query(`
      UPDATE items i
      SET
        price_ozon = mi.price,
        price_with_discount_ozon = mi.price_with_discount
      FROM marketplace_items mi
      INNER JOIN marketplaces m ON m.id = mi.marketplace_id
      WHERE mi.item_id = i.id
        AND m.title = 'Озон'
    `);

    await queryRunner.dropColumns('marketplace_items', ['price', 'discount', 'price_with_discount']);
  }
}
