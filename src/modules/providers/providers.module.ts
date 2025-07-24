import { Module } from '@nestjs/common';
import { ProviderFactory } from './provider.factory';
import { IntegrationDescriptionService } from './services/integration-description.service';

@Module({
  providers: [ProviderFactory, IntegrationDescriptionService],
  exports: [ProviderFactory, IntegrationDescriptionService],
})
export class ProvidersModule {}
