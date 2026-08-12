import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Phase 1: supplier-specific поля на items_suppliers + backfill из items.
 *
 * Поля: supplier_minimum_order, box_number, cost_in_yuan, cost_in_yuan_white,
 *       multiplicity, assembling, production.
 *
 * Данные копируются в существующие строки items_suppliers по item_id.
 * Колонки на items НЕ удаляются — directory/PATCH продолжают читать/писать items.
 * ~50 items без items_suppliers — их данные остаются только на items до phase 2.
 *
 * Phase 2 (отложено): drop колонок с items + переключение read/write на items_suppliers.
 */
export class MoveSupplierFieldsToItemsSuppliers1789300000000 implements MigrationInterface {
  private readonly itemsSuppliersColumns: TableColumn[] = [
    new TableColumn({
      name: 'supplier_minimum_order',
      type: 'integer',
      isNullable: true
    }),
    new TableColumn({
      name: 'box_number',
      type: 'varchar',
      isNullable: true
    }),
    new TableColumn({
      name: 'cost_in_yuan',
      type: 'float',
      isNullable: true
    }),
    new TableColumn({
      name: 'cost_in_yuan_white',
      type: 'float',
      isNullable: true
    }),
    new TableColumn({
      name: 'multiplicity',
      type: 'varchar',
      isNullable: true
    }),
    new TableColumn({
      name: 'assembling',
      type: 'integer',
      isNullable: false,
      default: 5
    }),
    new TableColumn({
      name: 'production',
      type: 'integer',
      isNullable: false,
      default: 10
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

    await queryRunner.query(`
      UPDATE items_suppliers isup
      SET
        supplier_minimum_order = i.supplier_minimum_order,
        box_number = i.box_number,
        cost_in_yuan = i.cost_in_yuan,
        cost_in_yuan_white = i.cost_in_yuan_white,
        multiplicity = i.multiplicity,
        assembling = COALESCE(i.assembling, 5),
        production = COALESCE(i.production, 10)
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
