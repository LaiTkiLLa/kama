import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ChangeTableItems1759860923257 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'production_time');
    await queryRunner.dropColumn('items', 'assembly_period');
    await queryRunner.addColumn(
      'items',
      new TableColumn({
        name: 'plan_time',
        type: 'int',
        isNullable: false,
        default: 120
      })
    );
    await queryRunner.addColumn(
      'items',
      new TableColumn({
        name: 'production_and_assembly_time',
        type: 'int',
        isNullable: false,
        default: 35
      })
    );
    await queryRunner.addColumn(
      'items',
      new TableColumn({
        name: 'stocks_in_days',
        type: 'int',
        isNullable: false,
        default: 30
      })
    );
    await queryRunner.addColumn(
      'items',
      new TableColumn({
        name: 'cost_in_yuan',
        type: 'float',
        isNullable: true
      })
    );
    await queryRunner.addColumn(
      'items',
      new TableColumn({
        name: 'cost_in_rub',
        type: 'float',
        isNullable: true
      })
    );
    await queryRunner.addColumn(
      'items',
      new TableColumn({
        name: 'replenishment_period',
        type: 'int',
        isNullable: false,
        default: 60
      })
    );
    await queryRunner.addColumn(
      'items',
      new TableColumn({
        name: 'remaining_balance',
        type: 'int',
        isNullable: false,
        default: 60
      })
    );
    await queryRunner.addColumn(
      'items',
      new TableColumn({
        name: 'frequency_of_sending_cars',
        type: 'int',
        isNullable: false,
        default: 7
      })
    );
    await queryRunner.addColumn(
      'items',
      new TableColumn({
        name: 'daily_growth_percentage',
        type: 'float',
        isNullable: true
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'production_time',
        type: 'int',
        isNullable: false,
        default: 30
      }),
      new TableColumn({
        name: 'assembly_period',
        type: 'int',
        isNullable: false,
        default: 7
      })
    ]);
    await queryRunner.dropColumn('items', 'production_and_assembly_time');
    await queryRunner.dropColumn('items', 'plan_time');
    await queryRunner.dropColumn('items', 'stocks_in_days');
    await queryRunner.dropColumn('items', 'cost_in_yuan');
    await queryRunner.dropColumn('items', 'cost_in_rub');
    await queryRunner.dropColumn('items', 'replenishment_period');
    await queryRunner.dropColumn('items', 'remaining_balance');
    await queryRunner.dropColumn('items', 'frequency_of_sending_cars');
    await queryRunner.dropColumn('items', 'daily_growth_percentage');
  }
}
