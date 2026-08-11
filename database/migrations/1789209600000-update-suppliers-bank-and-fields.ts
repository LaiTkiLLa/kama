import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

/**
 * suppliers: drop type_of_calculation; add columns missing on prod (per entity).
 * items: add title/category; backfill from WB marketplace_items.
 */
export class UpdateSuppliersBankAndFields1789209600000 implements MigrationInterface {
  private readonly suppliersBankFkName = 'FK_suppliers_bank_id';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const suppliersTable = await queryRunner.getTable('suppliers');
    if (!suppliersTable) {
      throw new Error('Table suppliers not found');
    }

    if (suppliersTable.findColumnByName('type_of_calculation')) {
      await queryRunner.dropColumn('suppliers', 'type_of_calculation');
    }

    const supplierColumns: TableColumn[] = [
      new TableColumn({ name: 'legal_title', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'legal_address', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'acc_raschet', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'bank_id', type: 'int', isNullable: true }),
      new TableColumn({ name: 'reliability_rating', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'warehouse_address', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'responsible_employee', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'comment', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'credit_limit', type: 'varchar', isNullable: true }),
      new TableColumn({
        name: 'can_be_able_to_store_in_warehouse',
        type: 'boolean',
        isNullable: false,
        default: false
      }),
      new TableColumn({
        name: 'number_of_storage_days',
        type: 'int',
        isNullable: false,
        default: 0
      }),
      new TableColumn({ name: 'web_site', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'rank', type: 'int', isNullable: true })
    ];

    for (const column of supplierColumns) {
      if (!suppliersTable.findColumnByName(column.name)) {
        await queryRunner.addColumn('suppliers', column);
      }
    }

    const suppliersAfter = await queryRunner.getTable('suppliers');
    const hasBankFk = suppliersAfter?.foreignKeys.some(
      fk => fk.columnNames.includes('bank_id') && fk.referencedTableName === 'banks'
    );
    if (!hasBankFk && suppliersAfter?.findColumnByName('bank_id')) {
      await queryRunner.createForeignKey(
        'suppliers',
        new TableForeignKey({
          name: this.suppliersBankFkName,
          columnNames: ['bank_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'banks',
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        })
      );
    }

    const itemsTable = await queryRunner.getTable('items');
    if (itemsTable && !itemsTable.findColumnByName('title')) {
      await queryRunner.addColumns('items', [
        new TableColumn({ name: 'title', type: 'varchar', isNullable: true }),
        new TableColumn({ name: 'category', type: 'varchar', isNullable: true })
      ]);
    }

    await queryRunner.query(`
      UPDATE items i
      SET
        title = src.title,
        category = src.category
      FROM (
        SELECT DISTINCT ON (mp.item_id)
          mp.item_id,
          mp.title,
          mp.category
        FROM marketplace_items mp
        INNER JOIN marketplaces m ON m.id = mp.marketplace_id
        WHERE m.title = 'WB'
          AND mp.deleted_at IS NULL
        ORDER BY mp.item_id, mp.id DESC
      ) src
      WHERE i.id = src.item_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE items SET title = NULL, category = NULL`);

    const itemsTable = await queryRunner.getTable('items');
    if (itemsTable?.findColumnByName('title')) {
      await queryRunner.dropColumns('items', ['title', 'category']);
    }

    const suppliersTable = await queryRunner.getTable('suppliers');
    if (!suppliersTable) {
      return;
    }

    const bankFk = suppliersTable.foreignKeys.find(
      fk => fk.columnNames.includes('bank_id') && fk.referencedTableName === 'banks'
    );
    if (bankFk) {
      await queryRunner.dropForeignKey('suppliers', bankFk);
    }

    const columnsToDrop = [
      'rank',
      'web_site',
      'number_of_storage_days',
      'can_be_able_to_store_in_warehouse',
      'credit_limit',
      'comment',
      'responsible_employee',
      'warehouse_address',
      'reliability_rating',
      'bank_id',
      'acc_raschet',
      'legal_address',
      'legal_title'
    ];

    for (const columnName of columnsToDrop) {
      if (suppliersTable.findColumnByName(columnName)) {
        await queryRunner.dropColumn('suppliers', columnName);
      }
    }

    const suppliersAfter = await queryRunner.getTable('suppliers');
    if (!suppliersAfter?.findColumnByName('type_of_calculation')) {
      await queryRunner.addColumn(
        'suppliers',
        new TableColumn({
          name: 'type_of_calculation',
          type: 'varchar',
          isNullable: true
        })
      );
    }
  }
}
