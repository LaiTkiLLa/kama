import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

/**
 * Supplier-link per size variant:
 * - item_characteristic_id NULL → товар без размерных вариаций (one-size / без «Размер»)
 * - item_characteristic_id NOT NULL → одна строка на размер (FK → item_characteristics)
 *
 * Soft delete: deleted_at (как у item_characteristics / marketplace_items).
 *
 * Backfill: существующие строки с размерными item_characteristics «Размер»
 * разворачиваются в N строк (копия полей); исходная строка удаляется.
 *
 * Важно: старый UNIQUE (item_id, supplier_id) снимается ДО INSERT разворота.
 */
export class AddSizeAndDeletedAtToItemsSuppliers1789440000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'items_suppliers',
      new TableColumn({
        name: 'item_characteristic_id',
        type: 'int',
        isNullable: true
      })
    );

    await queryRunner.addColumn(
      'items_suppliers',
      new TableColumn({
        name: 'deleted_at',
        type: 'timestamptz',
        isNullable: true
      })
    );

    await queryRunner.createForeignKey(
      'items_suppliers',
      new TableForeignKey({
        columnNames: ['item_characteristic_id'],
        referencedTableName: 'item_characteristics',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      })
    );

    // Table unique constraint (не обычный index) — DROP CONSTRAINT.
    await queryRunner.query(`
      ALTER TABLE items_suppliers
      DROP CONSTRAINT IF EXISTS "UQ_items_suppliers_item_supplier"
    `);
    // Дублирующий unique index из create-migration.
    await queryRunner.query(`DROP INDEX IF EXISTS "items_suppliers_unique_idx"`);

    await queryRunner.query(`
      INSERT INTO items_suppliers (
        item_id,
        supplier_id,
        item_characteristic_id,
        supplier_minimum_order,
        box_number,
        cost_in_yuan,
        cost_in_yuan_white,
        multiplicity,
        assembling,
        production,
        payment,
        dimensions_fact,
        dimensions_master_box,
        volume
      )
      SELECT
        isup.item_id,
        isup.supplier_id,
        ic.id,
        isup.supplier_minimum_order,
        isup.box_number,
        isup.cost_in_yuan,
        isup.cost_in_yuan_white,
        isup.multiplicity,
        isup.assembling,
        isup.production,
        isup.payment,
        isup.dimensions_fact,
        isup.dimensions_master_box,
        isup.volume
      FROM items_suppliers isup
      INNER JOIN item_characteristics ic
        ON ic.item_id = isup.item_id
       AND ic.deleted_at IS NULL
      INNER JOIN characteristics c
        ON c.id = ic.characteristic_id
       AND c.name = 'Размер'
       AND c.deleted_at IS NULL
      WHERE isup.item_characteristic_id IS NULL
        AND isup.deleted_at IS NULL
    `);

    await queryRunner.query(`
      DELETE FROM items_suppliers isup
      WHERE isup.item_characteristic_id IS NULL
        AND isup.deleted_at IS NULL
        AND EXISTS (
          SELECT 1
          FROM item_characteristics ic
          INNER JOIN characteristics c ON c.id = ic.characteristic_id
          WHERE ic.item_id = isup.item_id
            AND ic.deleted_at IS NULL
            AND c.name = 'Размер'
            AND c.deleted_at IS NULL
        )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_items_suppliers_item_supplier_no_size_active"
      ON items_suppliers (item_id, supplier_id)
      WHERE item_characteristic_id IS NULL AND deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_items_suppliers_item_supplier_size_active"
      ON items_suppliers (item_id, supplier_id, item_characteristic_id)
      WHERE item_characteristic_id IS NOT NULL AND deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_items_suppliers_item_characteristic_id"
      ON items_suppliers (item_characteristic_id)
      WHERE item_characteristic_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_items_suppliers_item_characteristic_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_items_suppliers_item_supplier_size_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_items_suppliers_item_supplier_no_size_active"`);

    const table = await queryRunner.getTable('items_suppliers');
    const fk = table?.foreignKeys.find(fk => fk.columnNames.includes('item_characteristic_id'));
    if (fk) {
      await queryRunner.dropForeignKey('items_suppliers', fk);
    }

    await queryRunner.query(`
      DELETE FROM items_suppliers
      WHERE item_characteristic_id IS NOT NULL
    `);

    await queryRunner.dropColumn('items_suppliers', 'deleted_at');
    await queryRunner.dropColumn('items_suppliers', 'item_characteristic_id');

    await queryRunner.query(`
      ALTER TABLE items_suppliers
      ADD CONSTRAINT "UQ_items_suppliers_item_supplier" UNIQUE (item_id, supplier_id)
    `);
  }
}
