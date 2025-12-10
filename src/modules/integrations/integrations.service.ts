import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomClient } from 'src/clients/custom';
import { StringRecordDto } from 'src/common/dto';
import { EncryptionUtils } from 'src/common/utils/encryption';
import {
    buildAuthorizationUrl,
    checkAndRefreshOAuth,
    discoverOAuth,
    exchangeCodeForTokens,
    generatePKCE,
    generateState,
    getCanonicalResourceUri,
    registerOauthClient,
} from 'src/common/utils/oauth';
import { Repository } from 'typeorm';
import { CreateIntegrationDto } from '../mcp/dto/create-integration.dto';
import { MCPProviderType } from '../providers/interfaces/provider.interface';
import { MCPIntegrationEntity } from './entities/mcp-integration.entity';
import { MCPIntegrationAuthType } from './enums/integration.enum';
import {
    MCPIntegrationInterface,
    MCPIntegrationUniqueFields,
} from './interfaces/mcp-integration.interface';

type IntegrationFilters = Partial<
    Pick<
        MCPIntegrationInterface,
        'id' | 'active' | 'name' | 'authType' | 'organizationId' | 'provider'
    >
>;

export class IntegrationsService {
    constructor(
        @InjectRepository(MCPIntegrationEntity)
        private readonly integrationRepository: Repository<MCPIntegrationEntity>,

        private readonly encryptionUtils: EncryptionUtils,
        private readonly configService: ConfigService,
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
        data: {
            dto?: CreateIntegrationDto;
            oauthData?: MCPIntegrationUniqueFields<MCPIntegrationAuthType.OAUTH2>;
        },
    ): string {
        const { dto, oauthData } = data;

        let authPayload = {};

        switch (authType) {
            case MCPIntegrationAuthType.BEARER_TOKEN:
                if (!dto || !dto.bearerToken) {
                    throw new Error(
                        'Bearer token is required for BEARER_TOKEN auth type',
                    );
                }
                authPayload = { bearerToken: dto.bearerToken };
                break;

            case MCPIntegrationAuthType.API_KEY:
                if (!dto || !dto.apiKey || !dto.apiKeyHeader) {
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
                if (!dto || !dto.basicUser) {
                    throw new Error(
                        'Basic User is required for BASIC auth type',
                    );
                }
                authPayload = {
                    basicUser: dto.basicUser,
                    basicPassword: dto.basicPassword,
                };
                break;

            case MCPIntegrationAuthType.OAUTH2:
                if (!oauthData && !dto) {
                    throw new Error('Missing data for OAUTH2 auth type');
                }

                authPayload = oauthData
                    ? {
                          clientId: oauthData.clientId,
                          clientSecret: oauthData.clientSecret,
                          oauthScopes: oauthData.oauthScopes,
                          dynamicRegistration: oauthData.dynamicRegistration,
                          asMetadata: oauthData.asMetadata,
                          rsMetadata: oauthData.rsMetadata,
                          redirectUri: oauthData.redirectUri,
                          tokens: oauthData.tokens,
                          codeChallenge: oauthData.codeChallenge,
                          codeVerifier: oauthData.codeVerifier,
                          state: oauthData.state,
                      }
                    : {
                          clientId: dto.clientId,
                          clientSecret: dto.clientSecret,
                          oauthScopes: dto.oauthScopes,
                          dynamicRegistration: dto.dynamicRegistration,
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

        const encryptedAuth = this.encryptAuth(authType, {
            dto: createIntegrationDto,
        });
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
            provider: MCPProviderType.CUSTOM,
            active: authType !== MCPIntegrationAuthType.OAUTH2,
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

        const encryptedAuth = this.encryptAuth(authType, {
            dto: createIntegrationDto,
        });
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
                active: authType !== MCPIntegrationAuthType.OAUTH2,
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

    private async checkAndRefreshOAuth(entity: MCPIntegrationEntity) {
        if (entity.authType !== MCPIntegrationAuthType.OAUTH2) {
            return entity;
        }

        try {
            const auth = this.decryptAndParse<
                MCPIntegrationUniqueFields<MCPIntegrationAuthType.OAUTH2>
            >(entity.auth, {} as any);

            if (!auth || !auth.tokens) {
                return entity;
            }

            const { tokens, clientId, clientSecret, asMetadata, redirectUri } =
                auth;
            const { token_endpoint: tokenEndpoint } = asMetadata;

            const newTokens = await checkAndRefreshOAuth(tokenEndpoint, {
                clientId,
                clientSecret,
                redirectUri,
                tokens,
            });

            if (!newTokens) {
                return entity;
            }

            const updatedAuth = {
                ...auth,
                tokens: newTokens,
            };

            entity.auth = this.encryptAuth(MCPIntegrationAuthType.OAUTH2, {
                oauthData: updatedAuth,
            });

            await this.integrationRepository.save(entity);
        } catch (error) {
            console.error('Error checking/refreshing OAuth token:', error);
        }

        return entity;
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
            entity = await this.checkAndRefreshOAuth(entity);
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
            // Se não for OAuth2, não tem "Access Token" no sentido OAuth,
            // mas retornamos a integração como está.
            return {
                accessToken: '',
                integration: this.entityToInterface(entity),
            };
        }

        entity = await this.checkAndRefreshOAuth(entity);

        const iface = this.entityToInterface(entity);

        if (iface.authType === MCPIntegrationAuthType.OAUTH2) {
            if (!iface.tokens?.accessToken) {
                throw new Error(
                    'No access token available for this integration',
                );
            }
            return {
                accessToken: iface.tokens.accessToken,
                integration: iface,
            };
        }

        return {
            accessToken: '',
            integration: iface,
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
            entity = await this.checkAndRefreshOAuth(entity);
        }

        return entity ? this.entityToInterface(entity) : null;
    }

    private getAndValidateRedirectUri(): string {
        const redirectUri = this.configService.get<string>('redirectUri');
        if (!redirectUri) {
            throw new Error('Redirect URI is not configured');
        }
        return redirectUri;
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

        if (integration.active) {
            throw new Error('Integration is already active');
        }

        if (integration.authType !== MCPIntegrationAuthType.OAUTH2) {
            throw new Error('Integration is not OAuth2');
        }

        const { baseUrl, oauthScopes, dynamicRegistration } = integration;
        let { clientId, clientSecret } = integration;

        const { rs, as } = await discoverOAuth(baseUrl);

        const {
            authorization_endpoint: authorizationEndpoint,
            token_endpoint: tokenEndpoint,
            registration_endpoint: registrationEndpoint,
        } = as;

        if (!authorizationEndpoint || !tokenEndpoint) {
            throw new Error('Missing authorization or token endpoints');
        }

        const redirectUri = this.getAndValidateRedirectUri();

        if (dynamicRegistration && registrationEndpoint) {
            const regResult = await registerOauthClient(
                registrationEndpoint,
                redirectUri,
                oauthScopes,
            );
            clientId = regResult.clientId;
            clientSecret = regResult.clientSecret;
        } else if (!clientId) {
            throw new Error(
                'A client_id is required, and dynamic client registration is not supported.',
            );
        }

        const { verifier, challenge } = generatePKCE();
        const state = generateState();

        const authUrl = buildAuthorizationUrl({
            authorizationEndpoint,
            clientId,
            redirectUri,
            challenge,
            state,
            baseUrl,
            oauthScopes,
        });

        const updatedAuth = this.encryptAuth(integration.authType, {
            oauthData: {
                clientId,
                clientSecret,
                codeChallenge: challenge,
                codeVerifier: verifier,
                state,
                asMetadata: as,
                rsMetadata: rs,
                oauthScopes,
                redirectUri,
                tokens: undefined,
                dynamicRegistration,
            },
        });

        await this.integrationRepository.update(
            {
                id: integrationId,
                organizationId,
            },
            {
                active: false,
                auth: updatedAuth,
            },
        );

        return authUrl;
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

        if (integration.active) {
            throw new Error('Integration is already active');
        }

        if (integration.authType !== MCPIntegrationAuthType.OAUTH2) {
            throw new Error('Integration is not OAuth2');
        }

        const {
            clientId,
            clientSecret,
            baseUrl,
            redirectUri,
            codeVerifier,
            state: storedState,
            asMetadata,
        } = integration;

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

        const resource = getCanonicalResourceUri(baseUrl);

        const tokens = await exchangeCodeForTokens(tokenEndpoint, {
            clientId,
            clientSecret,
            code,
            codeVerifier,
            redirectUri,
            resource,
            state,
        });

        const updatedAuth = this.encryptAuth(integration.authType, {
            oauthData: {
                ...integration,
                tokens,
            },
        });

        await this.integrationRepository.update(
            {
                id: integrationId,
                organizationId,
            },
            {
                active: true,
                auth: updatedAuth,
            },
        );

        return { message: 'OAuth integration finalized' };
    }
}
