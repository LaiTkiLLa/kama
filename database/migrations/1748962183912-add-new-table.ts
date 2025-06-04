import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey } from 'typeorm';

export class AddNewTable1748962183912 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'statuses',
        columns: [
          {
            name: 'id',
            isNullable: false,
            type: 'int',
            generationStrategy: 'identity',
            generatedIdentity: 'ALWAYS',
            isPrimary: true,
            isGenerated: true,
            isUnique: true
          },
          {
            name: 'title',
            isNullable: false,
            type: 'varchar'
          },
          {
            name: 'type',
            isNullable: false,
            type: 'varchar'
          },
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
    await queryRunner.createTable(
      new Table({
        name: 'directions',
        columns: [
          {
            name: 'id',
            isNullable: false,
            type: 'int',
            generationStrategy: 'identity',
            generatedIdentity: 'ALWAYS',
            isPrimary: true,
            isGenerated: true,
            isUnique: true
          },
          {
            name: 'title',
            isNullable: false,
            type: 'varchar'
          },
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
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'can_be_send_status_id',
        isNullable: true,
        type: 'int'
      }),
      new TableColumn({
        name: 'direction_id',
        default: 1,
        isNullable: false,
        type: 'int'
      })
    ]);
    await queryRunner.createForeignKeys('items', [
      new TableForeignKey({
        columnNames: ['direction_id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        referencedColumnNames: ['id'],
        referencedTableName: 'directions'
      }),
      new TableForeignKey({
        columnNames: ['can_be_send_status_id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        referencedColumnNames: ['id'],
        referencedTableName: 'statuses'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'can_be_send_status_id');
    await queryRunner.dropColumn('items', 'direction_id');
    await queryRunner.dropTable('directions');
    await queryRunner.dropTable('statuses');
  }
}
