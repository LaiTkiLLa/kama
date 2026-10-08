import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

/**
 * stocks_v2 — дневные снимки остатков по размеру МП.
 * FK только на marketplace_item_sizes (+ warehouse / marketplace).
 * Без marketplace_item_id. Листинговый stocks не трогаем.
 * См. docs/adr/0001-stocks-v2-size-grain.md
 */
export class CreateStocksV21789510000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'stocks_v2',
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
          { name: 'marketplace_id', type: 'int', isNullable: false },
          { name: 'warehouse_id', type: 'int', isNullable: false },
          { name: 'marketplace_item_size_id', type: 'int', isNullable: false },
          {
            name: 'current_value',
            type: 'int',
            isNullable: false,
            default: 0
          },
          {
            name: 'reserved',
            type: 'int',
            isNullable: false,
            default: 0
          },
          {
            name: 'promised',
            type: 'int',
            isNullable: false,
            default: 0
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'now()'
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'now()'
          }
        ]
      }),
      true
    );

    await queryRunner.createForeignKeys('stocks_v2', [
      new TableForeignKey({
        name: 'FK_stocks_v2_marketplace_item_size',
        columnNames: ['marketplace_item_size_id'],
        referencedTableName: 'marketplace_item_sizes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE'
      }),
      new TableForeignKey({
        name: 'FK_stocks_v2_warehouse',
        columnNames: ['warehouse_id'],
        referencedTableName: 'warehouses',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT'
      }),
      new TableForeignKey({
        name: 'FK_stocks_v2_marketplace',
        columnNames: ['marketplace_id'],
        referencedTableName: 'marketplaces',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE'
      })
    ]);

    await queryRunner.createIndex(
      'stocks_v2',
      new TableIndex({
        name: 'IDX_stocks_v2_marketplace_item_size_id',
        columnNames: ['marketplace_item_size_id']
      })
    );

    await queryRunner.createIndex(
      'stocks_v2',
      new TableIndex({
        name: 'IDX_stocks_v2_warehouse_id',
        columnNames: ['warehouse_id']
      })
    );

    await queryRunner.createIndex(
      'stocks_v2',
      new TableIndex({
        name: 'IDX_stocks_v2_marketplace_id',
        columnNames: ['marketplace_id']
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('stocks_v2', true, true, true);
  }
}
