import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Phase 1: supplier-specific поля на items_suppliers + backfill из items.
 * assembling / production — nullable, без default.
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
      isNullable: true
    }),
    new TableColumn({
      name: 'production',
      type: 'integer',
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
    if (!itemsTable?.findColumnByName('cost_in_yuan')) {
      return;
    }

    await queryRunner.query(`
      UPDATE items_suppliers isup
      SET
        supplier_minimum_order = i.supplier_minimum_order,
        box_number = i.box_number,
        cost_in_yuan = i.cost_in_yuan,
        cost_in_yuan_white = i.cost_in_yuan_white,
        multiplicity = i.multiplicity,
        assembling = i.assembling,
        production = i.production
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
