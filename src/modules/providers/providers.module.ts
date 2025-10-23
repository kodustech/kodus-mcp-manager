import { Module } from '@nestjs/common';
import { ProviderFactory } from './provider.factory';
import { IntegrationDescriptionService } from './services/integration-description.service';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
    imports: [IntegrationsModule],
    providers: [ProviderFactory, IntegrationDescriptionService],
    exports: [ProviderFactory, IntegrationDescriptionService],
})
export class ProvidersModule {}
