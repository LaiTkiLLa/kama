import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey } from 'typeorm';

export class AddSuppliersItemsTable1783662907066 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'items_suppliers',
        columns: [
          {
            name: 'id',
            isPrimary: true,
            generatedIdentity: 'ALWAYS',
            generationStrategy: 'identity',
            isUnique: true,
            isGenerated: true,
            type: 'int'
          },
          {
            name: 'item_id',
            type: 'integer',
            isNullable: false
          },
          {
            name: 'supplier_id',
            type: 'integer',
            isNullable: false
          }
        ],
        uniques: [
          {
            name: 'UQ_items_suppliers_item_supplier',
            columnNames: ['item_id', 'supplier_id']
          }
        ]
      })
    );

    await queryRunner.createForeignKeys('items_suppliers', [
      new TableForeignKey({
        columnNames: ['item_id'],
        referencedTableName: 'items',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE'
      }),
      new TableForeignKey({
        columnNames: ['supplier_id'],
        referencedTableName: 'suppliers',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE'
      })
    ]);
    /**
     * Переносим старые связи
     *
     * Было:
     * items.supplier_id
     *
     * Станет:
     * items_suppliers.item_id
     * items_suppliers.supplier_id
     */

    await queryRunner.query(`
      INSERT INTO items_suppliers(item_id, supplier_id)
      SELECT id, supplier_id
      FROM items
      WHERE supplier_id IS NOT NULL;
    `);

    await queryRunner.dropColumn('items', 'supplier_id');

    await queryRunner.query(`
  CREATE UNIQUE INDEX items_suppliers_unique_idx
  ON items_suppliers(item_id, supplier_id);
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'items',
      new TableColumn({
        name: 'supplier_id',
        type: 'integer',
        isNullable: true
      })
    );

    await queryRunner.query(`
      UPDATE items i
      SET supplier_id = s.supplier_id
      FROM (
        SELECT DISTINCT ON (item_id)
          item_id,
          supplier_id
        FROM items_suppliers
      ) s
      WHERE i.id = s.item_id;
    `);

    await queryRunner.dropTable('items_suppliers');
  }
}
