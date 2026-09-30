import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * items: title_english / color_english / size (product-card).
 * certification_link: varchar → text (может быть длинной).
 */
export class AddTitleColorSizeToItems1789480000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('items');
    if (!table) {
      throw new Error('Table items not found');
    }

    const columns: TableColumn[] = [
      new TableColumn({
        name: 'title_english',
        type: 'varchar',
        isNullable: true
      }),
      new TableColumn({
        name: 'color_english',
        type: 'varchar',
        isNullable: true
      }),
      new TableColumn({
        name: 'size',
        type: 'varchar',
        isNullable: true
      })
    ];

    for (const column of columns) {
      if (!table.findColumnByName(column.name)) {
        await queryRunner.addColumn('items', column);
      }
    }

    if (table.findColumnByName('certification_link')) {
      await queryRunner.query(`
        ALTER TABLE items
        ALTER COLUMN certification_link TYPE text
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('items');

    if (table?.findColumnByName('certification_link')) {
      await queryRunner.query(`
        ALTER TABLE items
        ALTER COLUMN certification_link TYPE varchar
      `);
    }

    for (const name of ['size', 'color_english', 'title_english']) {
      if (table?.findColumnByName(name)) {
        await queryRunner.dropColumn('items', name);
      }
    }
  }
}
