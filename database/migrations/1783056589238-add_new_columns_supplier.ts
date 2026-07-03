import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNewColumnsSupplier1783056589238 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'suppliers',
      new TableColumn({
        name: 'contact',
        type: 'varchar',
        isNullable: true
      })
    );
    await queryRunner.addColumn(
      'suppliers',
      new TableColumn({
        name: 'payment_terms',
        type: 'text',
        isNullable: true
      })
    );
    await queryRunner.addColumn(
      'suppliers',
      new TableColumn({
        name: 'type_of_mutual_settlements',
        type: 'text',
        isNullable: true
      })
    );
    await queryRunner.addColumn(
      'suppliers',
      new TableColumn({
        name: 'type_of_calculation',
        type: 'text',
        isNullable: true
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('suppliers', [
      'contact',
      'payment_terms',
      'type_of_mutual_settlements',
      'type_of_calculation'
    ]);
  }
}
