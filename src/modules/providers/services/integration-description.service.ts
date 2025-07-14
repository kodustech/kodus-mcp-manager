import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

interface IntegrationDescriptions {
  [provider: string]: {
    integrations: {
      [appName: string]: string;
    };
  };
}

@Injectable()
export class IntegrationDescriptionService {
  private descriptions: IntegrationDescriptions;

  constructor() {
    this.loadDescriptions();
  }

  private loadDescriptions(): void {
    try {
      const filePath = join(process.cwd(), 'src/config/integration-descriptions.json');
      const fileContent = readFileSync(filePath, 'utf8');
      this.descriptions = JSON.parse(fileContent);
    } catch (error) {
      console.warn('Erro ao carregar descrições das integrações:', error);
      this.descriptions = {};
    }
  }

  getDescription(provider: string, appName: string): string {
    const providerDescriptions = this.descriptions[provider];
    if (!providerDescriptions) {
      return this.generateFallbackDescription(appName);
    }

    const description = providerDescriptions.integrations[appName];
    if (!description) {
      return this.generateFallbackDescription(appName);
    }

    return description;
  }

  private generateFallbackDescription(appName: string): string {
    const formattedAppName = appName.charAt(0).toUpperCase() + appName.slice(1);
    return `Integração com ${formattedAppName} para automação e gerenciamento de tarefas.`;
  }
} 