import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddNewJoins1785844954781 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    /**
     * ============================================================
     * 1. Проверяем, что marketplace_items однозначно соответствует
     *    старым item + marketplace
     * ============================================================
     */
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM marketplace_items
          GROUP BY item_id, marketplace_id
          HAVING COUNT(*) > 1
        ) THEN
          RAISE EXCEPTION
            'Migration aborted: duplicate marketplace_items for item_id + marketplace_id';
        END IF;
      END $$;
    `);

    /**
     * ============================================================
     * 2. Добавляем marketplace_item_id в stocks
     * ============================================================
     */

    await queryRunner.addColumn(
      'stocks',
      new TableColumn({
        name: 'marketplace_item_id',
        type: 'integer',
        isNullable: true
      })
    );

    /**
     * ============================================================
     * 3. Заполняем marketplace_item_id в stocks
     *
     * Старое:
     *
     * stocks.item_id
     * stocks.marketplace_id
     *
     * Новое:
     *
     * stocks.marketplace_item_id
     * ============================================================
     */

    await queryRunner.query(`
      UPDATE stocks s
      SET marketplace_item_id = mi.id
      FROM marketplace_items mi
      WHERE mi.item_id = s.item_id
        AND mi.marketplace_id = s.marketplace_id
    `);

    /**
     * Проверяем, что все stocks нашли marketplace_item
     */

    await queryRunner.query(`
      DO $$
      DECLARE
        missing_count integer;
      BEGIN
        SELECT COUNT(*)
        INTO missing_count
        FROM stocks
        WHERE marketplace_item_id IS NULL;

        IF missing_count > 0 THEN
          RAISE EXCEPTION
            'Migration aborted: % stocks rows have no marketplace_item_id',
            missing_count;
        END IF;
      END $$;
    `);

    /**
     * ============================================================
     * 4. Добавляем FK stocks -> marketplace_items
     * ============================================================
     */

    await queryRunner.createForeignKey(
      'stocks',
      new TableForeignKey({
        name: 'FK_stocks_marketplace_item',
        columnNames: ['marketplace_item_id'],
        referencedTableName: 'marketplace_items',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      })
    );

    await queryRunner.createIndex(
      'stocks',
      new TableIndex({
        name: 'IDX_stocks_marketplace_item_id',
        columnNames: ['marketplace_item_id']
      })
    );

    /**
     * ============================================================
     * 5. Добавляем marketplace_item_id в orders_v2
     * ============================================================
     */

    await queryRunner.addColumn(
      'orders_v2',
      new TableColumn({
        name: 'marketplace_item_id',
        type: 'integer',
        isNullable: true
      })
    );

    /**
     * ============================================================
     * 6. Заполняем marketplace_item_id в orders_v2
     * ============================================================
     */

    await queryRunner.query(`
      UPDATE orders_v2 o
      SET marketplace_item_id = mi.id
      FROM marketplace_items mi
      WHERE mi.item_id = o.item_id
        AND mi.marketplace_id = o.marketplace_id
    `);

    /**
     * Проверяем, что все orders нашли marketplace_item
     */

    await queryRunner.query(`
      DO $$
      DECLARE
        missing_count integer;
      BEGIN
        SELECT COUNT(*)
        INTO missing_count
        FROM orders_v2
        WHERE marketplace_item_id IS NULL;

        IF missing_count > 0 THEN
          RAISE EXCEPTION
            'Migration aborted: % orders_v2 rows have no marketplace_item_id',
            missing_count;
        END IF;
      END $$;
    `);

    /**
     * ============================================================
     * 7. Добавляем FK orders_v2 -> marketplace_items
     * ============================================================
     */

    await queryRunner.createForeignKey(
      'orders_v2',
      new TableForeignKey({
        name: 'FK_orders_v2_marketplace_item',
        columnNames: ['marketplace_item_id'],
        referencedTableName: 'marketplace_items',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      })
    );

    await queryRunner.createIndex(
      'orders_v2',
      new TableIndex({
        name: 'IDX_orders_v2_marketplace_item_id',
        columnNames: ['marketplace_item_id']
      })
    );

    /**
     * ============================================================
     * 8. Контрольная проверка stocks
     *
     * Количество строк должно совпадать.
     * Суммы current_value / reserved / promised
     * тоже должны совпадать.
     * ============================================================
     */

    await queryRunner.query(`
      DO $$
      DECLARE
        old_count bigint;
        new_count bigint;

        old_current bigint;
        new_current bigint;

        old_reserved bigint;
        new_reserved bigint;

        old_promised bigint;
        new_promised bigint;
      BEGIN

        SELECT COUNT(*)
        INTO old_count
        FROM stocks;

        SELECT COUNT(*)
        INTO new_count
        FROM stocks
        WHERE marketplace_item_id IS NOT NULL;

        IF old_count <> new_count THEN
          RAISE EXCEPTION
            'Stocks migration failed: rows before = %, rows after = %',
            old_count,
            new_count;
        END IF;


        SELECT COALESCE(SUM(current_value), 0)
        INTO old_current
        FROM stocks;

        SELECT COALESCE(SUM(current_value), 0)
        INTO new_current
        FROM stocks
        WHERE marketplace_item_id IS NOT NULL;

        IF old_current <> new_current THEN
          RAISE EXCEPTION
            'Stocks migration failed: current_value before = %, after = %',
            old_current,
            new_current;
        END IF;


        SELECT COALESCE(SUM(reserved), 0)
        INTO old_reserved
        FROM stocks;

        SELECT COALESCE(SUM(reserved), 0)
        INTO new_reserved
        FROM stocks
        WHERE marketplace_item_id IS NOT NULL;

        IF old_reserved <> new_reserved THEN
          RAISE EXCEPTION
            'Stocks migration failed: reserved before = %, after = %',
            old_reserved,
            new_reserved;
        END IF;


        SELECT COALESCE(SUM(promised), 0)
        INTO old_promised
        FROM stocks;

        SELECT COALESCE(SUM(promised), 0)
        INTO new_promised
        FROM stocks
        WHERE marketplace_item_id IS NOT NULL;

        IF old_promised <> new_promised THEN
          RAISE EXCEPTION
            'Stocks migration failed: promised before = %, after = %',
            old_promised,
            new_promised;
        END IF;

      END $$;
    `);

    /**
     * ============================================================
     * 9. Контрольная проверка orders_v2
     *
     * Проверяем количество заказов и количество товара.
     * ============================================================
     */

    await queryRunner.query(`
      DO $$
      DECLARE
        old_count bigint;
        new_count bigint;

        old_quantity bigint;
        new_quantity bigint;
      BEGIN

        SELECT COUNT(*)
        INTO old_count
        FROM orders_v2;

        SELECT COUNT(*)
        INTO new_count
        FROM orders_v2
        WHERE marketplace_item_id IS NOT NULL;

        IF old_count <> new_count THEN
          RAISE EXCEPTION
            'Orders migration failed: rows before = %, rows after = %',
            old_count,
            new_count;
        END IF;


        SELECT COALESCE(SUM(quantity), 0)
        INTO old_quantity
        FROM orders_v2;

        SELECT COALESCE(SUM(quantity), 0)
        INTO new_quantity
        FROM orders_v2
        WHERE marketplace_item_id IS NOT NULL;

        IF old_quantity <> new_quantity THEN
          RAISE EXCEPTION
            'Orders migration failed: quantity before = %, after = %',
            old_quantity,
            new_quantity;
        END IF;

      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    /**
     * orders_v2
     */

    await queryRunner.dropIndex('orders_v2', 'IDX_orders_v2_marketplace_item_id');

    await queryRunner.dropForeignKey('orders_v2', 'FK_orders_v2_marketplace_item');

    await queryRunner.dropColumn('orders_v2', 'marketplace_item_id');

    /**
     * stocks
     */

    await queryRunner.dropIndex('stocks', 'IDX_stocks_marketplace_item_id');

    await queryRunner.dropForeignKey('stocks', 'FK_stocks_marketplace_item');

    await queryRunner.dropColumn('stocks', 'marketplace_item_id');
  }
}
