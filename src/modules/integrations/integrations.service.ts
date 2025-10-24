import { InjectRepository } from '@nestjs/typeorm';
import { MCPIntegrationEntity } from './entities/mcp-integration.entity';
import { Repository } from 'typeorm';
import { MCPIntegrationAuthType } from './enums/integration.enum';
import { EncryptionUtils } from 'src/common/utils/encryption';
import { CreateIntegrationDto } from '../mcp/dto/create-integration.dto';
import { MCPIntegrationInterface } from './interfaces/mcp-integration.interface';
import { StringRecordDto } from 'src/common/dto';
import { CustomClient } from 'src/clients/custom';

type IntegrationFilters = Partial<
    Pick<
        MCPIntegrationInterface,
        'id' | 'active' | 'name' | 'authType' | 'organizationId'
    >
>;

export class IntegrationsService {
    constructor(
        @InjectRepository(MCPIntegrationEntity)
        private readonly integrationRepository: Repository<MCPIntegrationEntity>,

        private readonly encryptionUtils: EncryptionUtils,
    ) {}

    private entityToInterface(
        entity: MCPIntegrationEntity,
    ): MCPIntegrationInterface {
        if (!entity) {
            return null;
        }

        const { authType, auth, headers, ...rest } = entity;

        const baseProps = {
            ...rest,
            headers: this.decryptAndParse<Record<string, string>>(headers, {}),
        };

        const parsedAuth = this.decryptAndParse<any>(auth, {});

        switch (authType) {
            case MCPIntegrationAuthType.NONE:
                return {
                    ...baseProps,
                    authType: MCPIntegrationAuthType.NONE,
                };

            case MCPIntegrationAuthType.BEARER_TOKEN:
                return {
                    ...baseProps,
                    authType: MCPIntegrationAuthType.BEARER_TOKEN,
                    bearerToken: parsedAuth.bearerToken,
                };

            case MCPIntegrationAuthType.API_KEY:
                return {
                    ...baseProps,
                    authType: MCPIntegrationAuthType.API_KEY,
                    apiKey: parsedAuth.apiKey,
                    apiKeyHeader: parsedAuth.apiKeyHeader,
                };

            case MCPIntegrationAuthType.BASIC:
                return {
                    ...baseProps,
                    authType: MCPIntegrationAuthType.BASIC,
                    basicUser: parsedAuth.basicUser,
                    basicPassword: parsedAuth.basicPassword,
                };

            default:
                throw new Error(`Unhandled authType: ${authType}`);
        }
    }

    private encryptAuth(
        authType: MCPIntegrationAuthType,
        dto: CreateIntegrationDto,
    ): string {
        let authPayload = {};

        switch (authType) {
            case MCPIntegrationAuthType.BEARER_TOKEN:
                if (!dto.bearerToken) {
                    throw new Error(
                        'Bearer token is required for BEARER_TOKEN auth type',
                    );
                }
                authPayload = { bearerToken: dto.bearerToken };
                break;

            case MCPIntegrationAuthType.API_KEY:
                if (!dto.apiKey || !dto.apiKeyHeader) {
                    throw new Error(
                        'API Key and API Key Header are required for API_KEY auth type',
                    );
                }
                authPayload = {
                    apiKey: dto.apiKey,
                    apiKeyHeader: dto.apiKeyHeader,
                };
                break;

            case MCPIntegrationAuthType.BASIC:
                if (!dto.basicUser) {
                    throw new Error(
                        'Basic User is required for BASIC auth type',
                    );
                }
                authPayload = {
                    basicUser: dto.basicUser,
                    basicPassword: dto.basicPassword,
                };
                break;

            case MCPIntegrationAuthType.NONE:
                authPayload = {};
                break;

            default:
                throw new Error(`Unhandled authType: ${authType}`);
        }

        return this.encryptionUtils.encrypt(JSON.stringify(authPayload));
    }

    private encryptRecordDto(record: StringRecordDto[] | undefined): string {
        if (!record || record.length === 0) {
            return this.encryptionUtils.encrypt(JSON.stringify({}));
        }

        const recordObj = record.reduce(
            (acc, { key, value }) => {
                acc[key] = value;
                return acc;
            },
            {} as Record<string, string>,
        );

        return this.encryptionUtils.encrypt(JSON.stringify(recordObj));
    }

    private decryptAndParse<T>(
        encrypted: string | null | undefined,
        defaultValue: T,
    ): T {
        if (!encrypted) {
            return defaultValue;
        }

        try {
            const decrypted = this.encryptionUtils.decrypt(encrypted);
            return JSON.parse(decrypted) as T;
        } catch (error) {
            console.error('Failed to decrypt or parse data:', error);
            return defaultValue;
        }
    }

    async validateIntegration(
        integrationData: CreateIntegrationDto,
    ): Promise<boolean> {
        try {
            const headers = integrationData.headers
                ? integrationData.headers.reduce(
                      (acc, { key, value }) => {
                          acc[key] = value;
                          return acc;
                      },
                      {} as Record<string, string>,
                  )
                : {};

            const client = new CustomClient({
                ...integrationData,
                headers,
            } as MCPIntegrationInterface);

            await client.getTools();

            return true;
        } catch (error) {
            console.error('Integration validation failed:', error);
            return false;
        }
    }

    async createIntegration(
        organizationId: string,
        createIntegrationDto: CreateIntegrationDto,
    ) {
        const {
            baseUrl,
            name,
            description,
            authType,
            headers,
            protocol,
            logoUrl,
        } = createIntegrationDto;

        const encryptedAuth = this.encryptAuth(authType, createIntegrationDto);
        const encryptedHeaders = this.encryptRecordDto(headers);

        const newIntegration = this.integrationRepository.create({
            organizationId,
            baseUrl,
            name,
            description,
            logoUrl,
            authType,
            protocol,
            auth: encryptedAuth,
            headers: encryptedHeaders,
        });

        const savedIntegration =
            await this.integrationRepository.save(newIntegration);

        return savedIntegration;
    }

    async editIntegration(
        organizationId: string,
        id: string,
        createIntegrationDto: CreateIntegrationDto,
    ) {
        const existingIntegration = await this.integrationRepository.findOne({
            where: { id, organizationId },
        });

        if (!existingIntegration) {
            throw new Error('Integration not found');
        }

        const {
            baseUrl,
            name,
            description,
            authType,
            headers,
            protocol,
            logoUrl,
        } = createIntegrationDto;

        const encryptedAuth = this.encryptAuth(authType, createIntegrationDto);
        const encryptedHeaders = this.encryptRecordDto(headers);

        await this.integrationRepository.update(
            { id, organizationId },
            {
                baseUrl,
                name,
                description,
                logoUrl,
                authType,
                protocol,
                auth: encryptedAuth,
                headers: encryptedHeaders,
            },
        );

        const updatedIntegration = await this.integrationRepository.findOne({
            where: { id, organizationId },
        });

        return updatedIntegration;
    }

    async deleteIntegration(
        organizationId: string,
        integrationId: string,
    ): Promise<void> {
        await this.integrationRepository.delete({
            id: integrationId,
            organizationId,
        });
    }

    async getIntegrationById(
        integrationId: string,
        organizationId: string,
    ): Promise<MCPIntegrationInterface | null> {
        const entity = await this.integrationRepository.findOne({
            where: {
                id: integrationId,
                organizationId,
            },
        });

        return this.entityToInterface(entity);
    }

    private buildQuery(filters: IntegrationFilters) {
        const queryBuilder =
            this.integrationRepository.createQueryBuilder('mcp_integration');

        const keys = ['active', 'name', 'authType', 'organizationId'] as const;
        for (const key of keys) {
            if (filters[key] !== undefined) {
                queryBuilder.andWhere(`mcp_integration.${key} = :${key}`, {
                    [key]: filters[key],
                });
            }
        }

        return queryBuilder;
    }

    async find(filters: IntegrationFilters) {
        const queryBuilder = this.buildQuery(filters);

        const entities = await queryBuilder.getMany();

        return entities.map((entity) => this.entityToInterface(entity));
    }

    async findOne(filters: IntegrationFilters) {
        const queryBuilder = this.buildQuery(filters);

        const entities = await queryBuilder.getOne();

        return entities ? this.entityToInterface(entities) : null;
    }
}
