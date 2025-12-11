import { InjectRepository } from '@nestjs/typeorm';
import { CustomClient } from 'src/clients/custom';
import { StringRecordDto } from 'src/common/dto';
import { EncryptionUtils } from 'src/common/utils/encryption';
import { Repository } from 'typeorm';
import { CreateIntegrationDto } from '../mcp/dto/create-integration.dto';
import { MCPIntegrationEntity } from './entities/mcp-integration.entity';
import {
    MCPIntegrationAuthType,
    MCPIntegrationOAuthStatus,
} from './enums/integration.enum';
import { IntegrationOAuthService } from './integration-oauth.service';
import {
    MCPIntegrationInterface,
    MCPIntegrationUniqueFields,
} from './interfaces/mcp-integration.interface';

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
        private readonly integrationOAuthService: IntegrationOAuthService,
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

        return {
            ...baseProps,
            ...parsedAuth,
            authType,
        };
    }

    private encryptAuth(
        authType: MCPIntegrationAuthType,
        data: CreateIntegrationDto,
    ): string {
        let authPayload = {};

        switch (authType) {
            case MCPIntegrationAuthType.BEARER_TOKEN:
                if (!data || !data.bearerToken) {
                    throw new Error(
                        'Bearer token is required for BEARER_TOKEN auth type',
                    );
                }
                authPayload = { bearerToken: data.bearerToken };
                break;

            case MCPIntegrationAuthType.API_KEY:
                if (!data || !data.apiKey || !data.apiKeyHeader) {
                    throw new Error(
                        'API Key and API Key Header are required for API_KEY auth type',
                    );
                }
                authPayload = {
                    apiKey: data.apiKey,
                    apiKeyHeader: data.apiKeyHeader,
                };
                break;

            case MCPIntegrationAuthType.BASIC:
                if (!data || !data.basicUser) {
                    throw new Error(
                        'Basic User is required for BASIC auth type',
                    );
                }
                authPayload = {
                    basicUser: data.basicUser,
                    basicPassword: data.basicPassword,
                };
                break;

            case MCPIntegrationAuthType.OAUTH2:
                if (!data) {
                    throw new Error('Missing config data for OAUTH2 auth type');
                }

                authPayload = {
                    clientId: data.clientId,
                    clientSecret: data.clientSecret,
                    oauthScopes: data.oauthScopes,
                    dynamicRegistration: data.dynamicRegistration,
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

        // Remove OAuth state if it exists when editing an integration
        await this.integrationOAuthService.deleteOAuthState(organizationId, id);

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
        await this.integrationOAuthService.deleteOAuthState(
            organizationId,
            integrationId,
        );

        await this.integrationRepository.delete({
            id: integrationId,
            organizationId,
        });
    }

    async getIntegrationById(
        integrationId: string,
        organizationId: string,
    ): Promise<MCPIntegrationInterface | null> {
        let entity = await this.integrationRepository.findOne({
            where: {
                id: integrationId,
                organizationId,
            },
        });

        if (entity) {
            await this.integrationOAuthService.refreshIntegrationOAuthIfNeeded(
                entity,
            );
        }

        return this.entityToInterface(entity);
    }

    async getValidAccessToken(
        integrationId: string,
        organizationId: string,
    ): Promise<{
        accessToken: string;
        integration: MCPIntegrationInterface;
    }> {
        let entity = await this.integrationRepository.findOne({
            where: {
                id: integrationId,
                organizationId,
            },
        });

        if (!entity) {
            throw new Error('Integration not found');
        }

        if (entity.authType !== MCPIntegrationAuthType.OAUTH2) {
            return {
                accessToken: '',
                integration: this.entityToInterface(entity),
            };
        }

        await this.integrationOAuthService.refreshIntegrationOAuthIfNeeded(
            entity,
        );

        const baseIntegration = this.entityToInterface(entity);

        const oauthState = await this.integrationOAuthService.getOAuthState(
            organizationId,
            entity.id,
        );

        if (!oauthState || !oauthState.tokens?.accessToken) {
            throw new Error('No access token available for this integration');
        }

        const integration = {
            ...baseIntegration,
            ...oauthState,
        } as MCPIntegrationInterface;

        return {
            accessToken: oauthState.tokens.accessToken,
            integration,
        };
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

        let entity = await queryBuilder.getOne();

        if (entity) {
            await this.integrationOAuthService.refreshIntegrationOAuthIfNeeded(
                entity,
            );
        }

        return entity ? this.entityToInterface(entity) : null;
    }

    async initiateOAuthFlow(params: {
        organizationId: string;
        integrationId: string;
    }) {
        const { organizationId, integrationId } = params;

        const entity = await this.integrationRepository.findOne({
            where: {
                id: integrationId,
                organizationId,
            },
        });

        if (!entity) {
            throw new Error('Integration not found');
        }

        const integration = this.entityToInterface(entity);

        if (integration.authType !== MCPIntegrationAuthType.OAUTH2) {
            throw new Error('Integration is not OAuth2');
        }

        const { baseUrl, oauthScopes, dynamicRegistration } = integration;

        const config = this.decryptAndParse<
            MCPIntegrationUniqueFields<MCPIntegrationAuthType.OAUTH2>
        >(entity.auth, {} as any);

        const { clientId, clientSecret } = config;

        const oauthInit = await this.integrationOAuthService.initiateOAuth({
            baseUrl,
            oauthScopes,
            dynamicRegistration,
            clientId,
            clientSecret,
        });

        await this.integrationOAuthService.saveOAuthState(
            organizationId,
            integrationId,
            MCPIntegrationOAuthStatus.PENDING,
            {
                clientId: oauthInit.clientId,
                clientSecret: oauthInit.clientSecret,
                oauthScopes,
                dynamicRegistration,
                asMetadata: oauthInit.as,
                rsMetadata: oauthInit.rs,
                redirectUri: oauthInit.redirectUri,
                codeChallenge: oauthInit.codeChallenge,
                codeVerifier: oauthInit.codeVerifier,
                state: oauthInit.state,
                tokens: undefined,
            },
        );

        const updatedAuth = this.encryptAuth(integration.authType, {
            baseUrl,
            clientId: oauthInit.clientId,
            clientSecret: oauthInit.clientSecret,
            oauthScopes,
            dynamicRegistration,
        });

        await this.integrationRepository.update(
            {
                id: integrationId,
                organizationId,
            },
            {
                auth: updatedAuth,
            },
        );

        return oauthInit.authUrl;
    }

    async finalizeOAuthFlow(params: {
        organizationId: string;
        integrationId: string;
        code: string;
        state: string;
    }) {
        const { organizationId, integrationId, code, state } = params;

        const entity = await this.integrationRepository.findOne({
            where: {
                id: integrationId,
                organizationId,
            },
        });

        if (!entity) {
            throw new Error('Integration not found');
        }

        const integration = this.entityToInterface(entity);

        if (integration.authType !== MCPIntegrationAuthType.OAUTH2) {
            throw new Error('Integration is not OAuth2');
        }

        const { baseUrl } = integration;

        const config = this.decryptAndParse<
            MCPIntegrationUniqueFields<MCPIntegrationAuthType.OAUTH2>
        >(entity.auth, {} as any);

        const oauthState = await this.integrationOAuthService.getOAuthState(
            organizationId,
            integrationId,
        );

        if (!oauthState) {
            throw new Error('OAuth metadata missing for connection');
        }

        const { clientId, clientSecret } = config;
        const {
            redirectUri,
            codeVerifier,
            state: storedState,
            asMetadata,
        } = oauthState;

        const { token_endpoint: tokenEndpoint } = asMetadata;

        if (
            !clientId ||
            !tokenEndpoint ||
            !redirectUri ||
            !codeVerifier ||
            !storedState
        ) {
            throw new Error('OAuth metadata missing for connection');
        }

        if (state !== storedState) {
            throw new Error('Invalid state parameter');
        }

        const tokens =
            await this.integrationOAuthService.exchangeAuthorizationCode({
                baseUrl,
                tokenEndpoint,
                clientId,
                clientSecret,
                code,
                codeVerifier,
                redirectUri,
                state,
            });

        await this.integrationOAuthService.saveOAuthState(
            organizationId,
            integrationId,
            MCPIntegrationOAuthStatus.ACTIVE,
            {
                ...oauthState,
                tokens,
            },
        );

        return { message: 'OAuth integration finalized' };
    }
}
