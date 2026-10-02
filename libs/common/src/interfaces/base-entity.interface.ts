/** Base entity interface for common fields */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDeletableEntity extends BaseEntity {
  deletedAt: Date | null;
}
