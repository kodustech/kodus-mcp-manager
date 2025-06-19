import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export enum MCPConnectionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
}

@Entity('mcp_connections')
export class MCPConnectionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organizationId' })
  organizationId: string;

  @Column({ name: 'integrationId' })
  integrationId: string;

  @Column({ name: 'provider' })
  provider: string;

  @Column({ name: 'status' })
  status: string;

  @Column({ name: 'appName' })
  appName: string;

  @Column({ name: 'mcpUrl', nullable: true })
  mcpUrl?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deletedAt' })
  deletedAt: Date;
}
