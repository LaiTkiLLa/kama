import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

/**
 * Каноническая модель характеристик товаров (schema-only):
 * characteristics → characteristic_values (справочник)
 * items → item_characteristics (фактическое value на товаре)
 *
 * Без seed/backfill из items_sizes — перенос данных и API cutover отдельным шагом.
 * items_sizes не трогаем.
 */
export class CreateItemCharacteristics1789330000000 implements MigrationInterface {
  private readonly timestampColumns = [
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
    },
    {
      name: 'deleted_at',
      type: 'timestamptz',
      isNullable: true
    }
  ];

  private readonly identityPrimaryKey = {
    name: 'id',
    isPrimary: true,
    generatedIdentity: 'ALWAYS' as const,
    generationStrategy: 'identity' as const,
    isUnique: true,
    isGenerated: true,
    type: 'int'
  };

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'characteristics',
        columns: [
          this.identityPrimaryKey,
          { name: 'name', type: 'varchar', isNullable: false },
          { name: 'type', type: 'varchar', isNullable: false },
          ...this.timestampColumns
        ]
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'characteristic_values',
        columns: [
          this.identityPrimaryKey,
          { name: 'characteristic_id', type: 'int', isNullable: false },
          { name: 'value', type: 'varchar', isNullable: false },
          ...this.timestampColumns
        ]
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'item_characteristics',
        columns: [
          this.identityPrimaryKey,
          { name: 'item_id', type: 'int', isNullable: false },
          { name: 'characteristic_id', type: 'int', isNullable: false },
          { name: 'value', type: 'varchar', isNullable: false },
          ...this.timestampColumns
        ]
      }),
      true
    );

    await queryRunner.createForeignKeys('characteristic_values', [
      new TableForeignKey({
        columnNames: ['characteristic_id'],
        referencedTableName: 'characteristics',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      })
    ]);

    await queryRunner.createForeignKeys('item_characteristics', [
      new TableForeignKey({
        columnNames: ['item_id'],
        referencedTableName: 'items',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }),
      new TableForeignKey({
        columnNames: ['characteristic_id'],
        referencedTableName: 'characteristics',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      })
    ]);

    await queryRunner.createIndex(
      'characteristic_values',
      new TableIndex({
        name: 'IDX_characteristic_values_characteristic_id',
        columnNames: ['characteristic_id']
      })
    );

    await queryRunner.createIndex(
      'item_characteristics',
      new TableIndex({
        name: 'IDX_item_characteristics_item_id',
        columnNames: ['item_id']
      })
    );

    await queryRunner.createIndex(
      'item_characteristics',
      new TableIndex({
        name: 'IDX_item_characteristics_characteristic_id',
        columnNames: ['characteristic_id']
      })
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_characteristics_name_active"
      ON characteristics (name)
      WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_characteristic_values_characteristic_id_value_active"
      ON characteristic_values (characteristic_id, value)
      WHERE deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_characteristic_values_characteristic_id_value_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_characteristics_name_active"`);
    await queryRunner.dropTable('item_characteristics', true, true, true);
    await queryRunner.dropTable('characteristic_values', true, true, true);
    await queryRunner.dropTable('characteristics', true, true, true);
  }
}
