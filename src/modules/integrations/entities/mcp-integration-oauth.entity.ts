import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';

@Entity({
    schema: 'mcp-manager',
    name: 'mcp_integration_oauth',
})
@Unique(['integrationId'])
export class MCPIntegrationOAuthEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'integrationId', type: 'uuid' })
    integrationId: string;

    @Column({ name: 'auth', type: 'text', nullable: true })
    auth?: string;

    @CreateDateColumn({ name: 'createdAt' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updatedAt' })
    updatedAt: Date;
}
