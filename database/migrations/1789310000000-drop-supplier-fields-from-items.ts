import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Phase 2: backfill пропущенных supplier-fields на items_suppliers,
 * assembling/production → nullable без default, drop колонок с items.
 *
 * Предусловие: у всех items есть строка в items_suppliers
 * (orphans закрыты через «Системный поставщик»).
 */
export class DropSupplierFieldsFromItems1789310000000 implements MigrationInterface {
  private readonly itemsColumnsToDrop = [
    'supplier_minimum_order',
    'box_number',
    'cost_in_yuan',
    'cost_in_yuan_white',
    'multiplicity',
    'assembling',
    'production'
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const itemsSuppliersTable = await queryRunner.getTable('items_suppliers');
    if (!itemsSuppliersTable) {
      throw new Error('Table items_suppliers not found');
    }

    if (itemsSuppliersTable.findColumnByName('assembling')) {
      await queryRunner.query(`
        ALTER TABLE items_suppliers
          ALTER COLUMN assembling DROP DEFAULT,
          ALTER COLUMN assembling DROP NOT NULL
      `);
    }

    if (itemsSuppliersTable.findColumnByName('production')) {
      await queryRunner.query(`
        ALTER TABLE items_suppliers
          ALTER COLUMN production DROP DEFAULT,
          ALTER COLUMN production DROP NOT NULL
      `);
    }

    const itemsTable = await queryRunner.getTable('items');
    if (itemsTable?.findColumnByName('cost_in_yuan')) {
      await queryRunner.query(`
        UPDATE items_suppliers isup
        SET
          supplier_minimum_order = COALESCE(i.supplier_minimum_order, isup.supplier_minimum_order),
          box_number = COALESCE(i.box_number, isup.box_number),
          cost_in_yuan = COALESCE(i.cost_in_yuan, isup.cost_in_yuan),
          cost_in_yuan_white = COALESCE(i.cost_in_yuan_white, isup.cost_in_yuan_white),
          multiplicity = COALESCE(i.multiplicity, isup.multiplicity),
          assembling = COALESCE(i.assembling, isup.assembling),
          production = COALESCE(i.production, isup.production)
        FROM items i
        WHERE isup.item_id = i.id
      `);
    }

    if (!itemsTable) {
      throw new Error('Table items not found');
    }

    for (const columnName of this.itemsColumnsToDrop) {
      if (itemsTable.findColumnByName(columnName)) {
        await queryRunner.dropColumn('items', columnName);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const itemsTable = await queryRunner.getTable('items');
    if (!itemsTable) {
      throw new Error('Table items not found');
    }

    const columnsToRestore: TableColumn[] = [
      new TableColumn({ name: 'supplier_minimum_order', type: 'integer', isNullable: true }),
      new TableColumn({ name: 'box_number', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'cost_in_yuan', type: 'float', isNullable: true }),
      new TableColumn({ name: 'cost_in_yuan_white', type: 'float', isNullable: true }),
      new TableColumn({ name: 'multiplicity', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'assembling', type: 'integer', isNullable: false, default: 5 }),
      new TableColumn({ name: 'production', type: 'integer', isNullable: false, default: 10 })
    ];

    for (const column of columnsToRestore) {
      if (!itemsTable.findColumnByName(column.name)) {
        await queryRunner.addColumn('items', column);
      }
    }

    await queryRunner.query(`
      UPDATE items i
      SET
        supplier_minimum_order = src.supplier_minimum_order,
        box_number = src.box_number,
        cost_in_yuan = src.cost_in_yuan,
        cost_in_yuan_white = src.cost_in_yuan_white,
        multiplicity = src.multiplicity,
        assembling = src.assembling,
        production = src.production
      FROM (
        SELECT DISTINCT ON (isup.item_id)
          isup.item_id,
          isup.supplier_minimum_order,
          isup.box_number,
          isup.cost_in_yuan,
          isup.cost_in_yuan_white,
          isup.multiplicity,
          isup.assembling,
          isup.production
        FROM items_suppliers isup
        ORDER BY isup.item_id, isup.id ASC
      ) src
      WHERE i.id = src.item_id
    `);
  }
}
