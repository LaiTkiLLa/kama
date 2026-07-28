import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddNewTables1785246085134 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'banks',
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
          {
            name: 'title',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'acc_bik',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'acc_korschet',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'address',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'swift',
            type: 'varchar',
            isNullable: true
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

    await queryRunner.createTable(
      new Table({
        name: 'contaminants',
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
          {
            name: 'title',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'country',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'type',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'legal_title',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'legal_address',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'acc_raschet',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'inn',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'kpp',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'contact',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'payment_terms',
            type: 'text',
            isNullable: true
          },
          {
            name: 'reliability_rating',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'warehouse_address',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'responsible_employee',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'comment',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'type_of_mutual_settlements',
            type: 'text',
            isNullable: true
          },
          {
            name: 'bank_id',
            type: 'integer',
            isNullable: true
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
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true
          }
        ]
      }),
      true
    );

    await queryRunner.createForeignKeys('contaminants', [
      new TableForeignKey({
        columnNames: ['bank_id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        referencedColumnNames: ['id'],
        referencedTableName: 'banks'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('contaminants', true);
    await queryRunner.dropTable('banks', true);
  }
}
