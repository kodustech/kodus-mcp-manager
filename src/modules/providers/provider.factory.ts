import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MCPProvider } from './interfaces/provider.interface';
import { ComposioProvider } from './composio.provider';

export type ProviderType = string;

@Injectable()
export class ProviderFactory {
  private providers: Map<string, MCPProvider> = new Map();

  constructor(private configService: ConfigService) {
    const providersNames = this.configService.get('providers')?.split(',');
    if (!providersNames || !providersNames.length) return;

    providersNames.forEach((providerName: ProviderType) => {
      if (this.providers.get(providerName)) return;
      const providerInstance = this.createProvider(providerName);
      this.providers.set(providerName, providerInstance);
    });
  }

  getProvider(type: ProviderType): MCPProvider {
    return this.providers.get(type);
  }

  getProviders(): MCPProvider[] {
    return Array.from(this.providers.values());
  }

  private createProvider(type: ProviderType): MCPProvider {
    const strategies = {
      composio: ComposioProvider,
    };

    return new strategies[type](this.configService);
  }
}
