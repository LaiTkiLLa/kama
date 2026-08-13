import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Phase 3: supplier-link поля на items_suppliers + backfill из items.
 * Колонки на items не drop — dual-write до отдельного подтверждения.
 *
 * На связь: payment, dimensions_fact, dimensions_master_box, volume.
 * payment на items был NOT NULL DEFAULT 10; на связи — nullable, без default.
 *
 * Не переносятся (остаются на items, drop позже):
 * volume_master_box, volume_per_unit, weight_per_unit, density.
 */
export class MoveLogisticsFieldsToItemsSuppliers1789320000000 implements MigrationInterface {
  private readonly itemsSuppliersColumns: TableColumn[] = [
    new TableColumn({
      name: 'payment',
      type: 'integer',
      isNullable: true
    }),
    new TableColumn({
      name: 'dimensions_fact',
      type: 'varchar',
      isNullable: true
    }),
    new TableColumn({
      name: 'dimensions_master_box',
      type: 'varchar',
      isNullable: true
    }),
    new TableColumn({
      name: 'volume',
      type: 'varchar',
      isNullable: true
    })
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const itemsSuppliersTable = await queryRunner.getTable('items_suppliers');
    if (!itemsSuppliersTable) {
      throw new Error('Table items_suppliers not found');
    }

    for (const column of this.itemsSuppliersColumns) {
      if (!itemsSuppliersTable.findColumnByName(column.name)) {
        await queryRunner.addColumn('items_suppliers', column);
      }
    }

    const itemsTable = await queryRunner.getTable('items');
    if (!itemsTable?.findColumnByName('payment')) {
      return;
    }

    await queryRunner.query(`
      UPDATE items_suppliers isup
      SET
        payment = i.payment,
        dimensions_fact = i.dimensions_fact,
        dimensions_master_box = i.dimensions_master_box,
        volume = i.volume
      FROM items i
      WHERE isup.item_id = i.id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const itemsSuppliersTable = await queryRunner.getTable('items_suppliers');
    if (!itemsSuppliersTable) {
      return;
    }

    for (const column of this.itemsSuppliersColumns) {
      if (itemsSuppliersTable.findColumnByName(column.name)) {
        await queryRunner.dropColumn('items_suppliers', column.name);
      }
    }
  }
}
