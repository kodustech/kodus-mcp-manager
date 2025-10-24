import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MCPIntegrationEntity } from './entities/mcp-integration.entity';
import { UtilsModule } from 'src/common/utils/utils.module';
import { IntegrationsService } from './integrations.service';

@Module({
    imports: [TypeOrmModule.forFeature([MCPIntegrationEntity]), UtilsModule],
    providers: [IntegrationsService],
    exports: [IntegrationsService],
})
export class IntegrationsModule {}
