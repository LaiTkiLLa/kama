import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnMarketplaceIdentificator1744446843102 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn('warehouses', new TableColumn({
            name: 'marketplace_id',
            isNullable: true,
            type: 'varchar'
        }))
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('warehouses', 'marketplace_id')
    }

}
