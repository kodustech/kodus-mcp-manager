import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MCPProvider } from './interfaces/provider.interface';
import { ComposioProvider } from './composio/composio.provider';
import { IntegrationDescriptionService } from './services/integration-description.service';

export type ProviderType = string;

@Injectable()
export class ProviderFactory {
  private providers: Map<ProviderType, MCPProvider> = new Map();

  constructor(
    private configService: ConfigService,
    private integrationDescriptionService: IntegrationDescriptionService,
  ) {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    const enabledProviders = this.configService
      .get<string>('providers', 'composio')
      .split(',')
      .map((provider) => provider.trim());

    for (const provider of enabledProviders) {
      switch (provider) {
        case 'composio':
          this.providers.set(
            'composio',
            new ComposioProvider(this.configService, this.integrationDescriptionService),
          );
          break;
        default:
          throw new Error(`Provider ${provider} não suportado`);
      }
    }
  }

  getProvider(type: ProviderType): MCPProvider {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`Provider ${type} não encontrado`);
    }
    return provider;
  }

  getProviders(): MCPProvider[] {
    return Array.from(this.providers.values());
  }
}
