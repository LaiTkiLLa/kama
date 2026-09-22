import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * items: product-card fields (marketplace-independent).
 * Descriptions, country, certification, material, packaging type.
 */
export class AddProductCardFieldsToItems1789470000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('items');
    if (!table) {
      throw new Error('Table items not found');
    }

    const columns: TableColumn[] = [
      new TableColumn({
        name: 'description_russian',
        type: 'varchar',
        isNullable: true
      }),
      new TableColumn({
        name: 'description_english',
        type: 'varchar',
        isNullable: true
      }),
      new TableColumn({
        name: 'country',
        type: 'varchar',
        isNullable: true
      }),
      new TableColumn({
        name: 'certification_required',
        type: 'boolean',
        isNullable: false,
        default: false
      }),
      new TableColumn({
        name: 'certification_link',
        type: 'varchar',
        isNullable: true
      }),
      new TableColumn({
        name: 'material',
        type: 'varchar',
        isNullable: true
      }),
      new TableColumn({
        name: 'packaging_type',
        type: 'varchar',
        isNullable: true
      })
    ];

    for (const column of columns) {
      if (!table.findColumnByName(column.name)) {
        await queryRunner.addColumn('items', column);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('items');
    const columnNames = [
      'packaging_type',
      'material',
      'certification_link',
      'certification_required',
      'country',
      'description_english',
      'description_russian'
    ];

    for (const name of columnNames) {
      if (table?.findColumnByName(name)) {
        await queryRunner.dropColumn('items', name);
      }
    }
  }
}
