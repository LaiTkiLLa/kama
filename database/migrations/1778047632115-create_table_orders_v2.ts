import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateTableOrdersV21778047632115 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'orders_v2',
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
          { name: 'marketplace_order_identification', type: 'varchar', isNullable: true },
          { name: 'marketplace_order_number', type: 'varchar', isNullable: true },
          { name: 'marketplace_order_posting_number', type: 'varchar', isNullable: true },
          { name: 'status', type: 'varchar', isNullable: true },
          { name: 'quantity', type: 'int', isNullable: false },
          { name: 'price', type: 'float', isNullable: true },
          { name: 'old_price', type: 'float', isNullable: true },
          { name: 'payout', type: 'float', isNullable: true },
          { name: 'discount_value', type: 'float', isNullable: true },
          { name: 'discount_percent', type: 'float', isNullable: true },
          { name: 'commission_percent', type: 'float', isNullable: true },
          { name: 'commission_value', type: 'float', isNullable: true },
          { name: 'city', type: 'varchar', isNullable: true },
          { name: 'cluster_from', type: 'varchar', isNullable: true },
          { name: 'cluster_to', type: 'varchar', isNullable: true },
          { name: 'cancel_reason_id', type: 'int', isNullable: true },
          { name: 'item_id', type: 'int', isNullable: false },
          { name: 'warehouse_id', type: 'int', isNullable: false },
          { name: 'marketplace_id', type: 'int', isNullable: false },
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

    await queryRunner.createForeignKeys('orders_v2', [
      new TableForeignKey({
        columnNames: ['item_id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        referencedColumnNames: ['id'],
        referencedTableName: 'items'
      }),
      new TableForeignKey({
        columnNames: ['warehouse_id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        referencedColumnNames: ['id'],
        referencedTableName: 'warehouses'
      }),
      new TableForeignKey({
        columnNames: ['marketplace_id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        referencedColumnNames: ['id'],
        referencedTableName: 'marketplaces'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('orders_v2');
  }
}
