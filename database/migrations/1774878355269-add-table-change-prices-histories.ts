import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddTableChangePricesHistories1774878355269 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'change_prices_histories',
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
          { name: 'old_price', type: 'float', isNullable: true },
          { name: 'new_price', type: 'float', isNullable: true },
          { name: 'old_discount', type: 'float', isNullable: true },
          { name: 'new_discount', type: 'float', isNullable: true },
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('change_prices_histories');
  }
}
