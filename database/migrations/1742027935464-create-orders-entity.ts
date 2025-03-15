import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateOrdersEntity1742027935464 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'orders',
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
          { name: 'sum', type: 'float', isNullable: false, default: 0 },
          { name: 'quantity', type: 'int', isNullable: false },
          { name: 'marketplace_order_identification', type: 'varchar', isNullable: true },
          { name: 'is_canceled', type: 'varchar', isNullable: true },
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
    await queryRunner.dropTable('orders');
  }
}
