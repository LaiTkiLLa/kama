import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Items } from '../../items/entities/items.entity';

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

    @OneToMany(() => Items, items => items.sendStatus)
    items: Items[];
}
