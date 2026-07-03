import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddNewTableItemsSizes1783055322685 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'items_sizes',
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
          { name: 'item_id', type: 'int', isNullable: false },
          { name: 'chrt_id', type: 'varchar', isNullable: true },
          { name: 'tech_size', type: 'varchar', isNullable: true },
          { name: 'wb_size', type: 'varchar', isNullable: true },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false
          }
        ]
      })
    );

    await queryRunner.createForeignKeys('items_sizes', [
      new TableForeignKey({
        columnNames: ['item_id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        referencedColumnNames: ['id'],
        referencedTableName: 'items'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('items_sizes');
  }
}
