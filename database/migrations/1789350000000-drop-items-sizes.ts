import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

/**
 * Drop legacy items_sizes.
 *
 * Runtime source размеров: marketplace_item_sizes (WB sync в getWbItems).
 * Entity ItemsSizes уже удалена; directory/list читает marketplaceItemSizes.
 *
 * Backfill в item_characteristics не делаем — размеры МП живут на listing-слое.
 */
export class DropItemsSizes1789350000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('items_sizes', true, true, true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
      }),
      true
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
}
