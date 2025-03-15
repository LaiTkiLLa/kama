import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateTableStocks1741969018545 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'stocks',
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
          { name: 'current_value', type: 'int', default: 0, isNullable: false },
          { name: 'reserved', type: 'int', default: 0, isNullable: false },
          { name: 'promised', type: 'int', default: 0, isNullable: false },
          { name: 'warehouse_id', type: 'int', isNullable: false },
          { name: 'marketplace_id', type: 'int', isNullable: false },
          { name: 'item_id', type: 'int', isNullable: false },
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
    new TableForeignKey({
      columnNames: ['item_id'],
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      referencedColumnNames: ['id'],
      referencedTableName: 'items'
    });
    new TableForeignKey({
      columnNames: ['warehouse_id'],
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      referencedColumnNames: ['id'],
      referencedTableName: 'warehouses'
    });
    new TableForeignKey({
      columnNames: ['marketplace_id'],
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      referencedColumnNames: ['id'],
      referencedTableName: 'marketplaces'
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('stocks');
  }
}
