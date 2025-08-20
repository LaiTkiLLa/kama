import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

export class AddSuppliersTable1755678261744 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'suppliers',
        columns: [
          {
            name: 'id',
            type: 'int',
            generatedIdentity: 'ALWAYS',
            isPrimary: true,
            isGenerated: true,
            isUnique: true,
            generationStrategy: 'identity'
          },
          {
            name: 'title',
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
    await queryRunner.addColumn(
      'items',
      new TableColumn({
        name: 'supplier_id',
        isNullable: true,
        type: 'int'
      })
    );
    await queryRunner.query(`
      INSERT INTO suppliers (title)
      VALUES 
        ('Paidu'),
        ('DeepFit'),
        ('Avec Sports'),
        ('Huayi sports'),
        ('Yiwulifeng'),
        ('Tianlong reap'),
        ('Miska Sports'),
        ('Gymbo'),
        ('Amyups')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('suppliers');
    await queryRunner.dropColumn('items', 'supplier_id');
  }
}
