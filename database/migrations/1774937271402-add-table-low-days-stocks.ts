import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddTableLowDaysStocks1774937271402 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'low_days_stocks',
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
          { name: 'article', type: 'varchar', isNullable: false },
          { name: 'days_stock_fullfillment', type: 'float', isNullable: true },
          { name: 'days_stock_country', type: 'float', isNullable: true },
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('low_days_stocks');
  }
}
