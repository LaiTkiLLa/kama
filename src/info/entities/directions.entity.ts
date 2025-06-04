import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({
    name: 'directions'
})
export class Directions {
    @PrimaryGeneratedColumn('identity', {
        generatedIdentity: 'ALWAYS'
    })
    id: number;

    @Column({
        type: 'varchar',
        nullable: false
    })
    title: string;

    @CreateDateColumn({
        type: 'timestamp',
        nullable: false,
        name: 'created_at',
        default: new Date()
    })
    createdAt: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        nullable: false,
        name: 'updated_at',
        default: new Date()
    })
    updatedAt: Date;
}
