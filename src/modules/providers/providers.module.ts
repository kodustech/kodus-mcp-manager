import { Module } from '@nestjs/common';
import { ProviderFactory } from './provider.factory';

@Module({
  providers: [ProviderFactory],
  exports: [ProviderFactory],
})
export class ProvidersModule {}
