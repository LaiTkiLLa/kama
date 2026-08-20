import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';

/** Платформа taxonomy; не привязана к конкретному кабинету (WB / Ozon Tamov / …). */
export type MarketplaceCategoryPlatform = 'WB' | 'Ozon' | 'Yandex';

export type MarketplaceCategoryNodeType = 'wb_parent' | 'wb_subject' | 'ozon_category' | 'ozon_type';

@Entity({
  name: 'marketplace_categories'
})
export class MarketplaceCategories {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({ type: 'varchar', nullable: false })
  platform: MarketplaceCategoryPlatform;

  @Column({ type: 'varchar', name: 'node_type', nullable: false })
  nodeType: MarketplaceCategoryNodeType;

  /** subjectID | description_category_id | type_id в API маркетплейса */
  @Column({ type: 'bigint', name: 'external_id', nullable: false })
  externalId: string;

  @Column({ type: 'varchar', nullable: false })
  title: string;

  @Column({ type: 'int', name: 'parent_id', nullable: true })
  parentId: number | null;

  @Column({ type: 'boolean', name: 'is_disabled', nullable: false, default: false })
  isDisabled: boolean;

  @Column({ type: 'boolean', name: 'is_visible', nullable: true })
  isVisible: boolean | null;

  /** Leaf-узел для выбора при create (wb_subject, ozon_type). */
  @Column({ type: 'boolean', name: 'is_selectable', nullable: false, default: false })
  isSelectable: boolean;

  @CreateDateColumn({
    type: 'timestamptz',
    nullable: false,
    name: 'created_at',
    default: () => 'now()'
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    nullable: false,
    name: 'updated_at',
    default: () => 'now()'
  })
  updatedAt: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'deleted_at'
  })
  deletedAt: Date | null;

  @ManyToOne(() => MarketplaceCategories, category => category.children, {
    onDelete: 'SET NULL'
  })
  @JoinColumn({ name: 'parent_id' })
  parent: MarketplaceCategories | null;

  @OneToMany(() => MarketplaceCategories, category => category.parent)
  children: MarketplaceCategories[];
}
