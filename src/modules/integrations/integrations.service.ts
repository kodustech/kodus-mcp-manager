import { InjectRepository } from '@nestjs/typeorm';
import { MCPIntegrationEntity } from './entities/mcp-integration.entity';
import { Repository } from 'typeorm';
import { MCPIntegrationAuthType } from './enums/integration.enum';
import { EncryptionUtils } from 'src/common/utils/encryption';
import { CreateIntegrationDto } from '../mcp/dto/create-integration.dto';
import { MCPIntegrationInterface } from './interfaces/mcp-integration.interface';
import { StringRecordDto } from 'src/common/dto';
import { CustomClient } from 'src/clients/custom';
import axios, { AxiosResponse } from 'axios';
import { ConfigService } from '@nestjs/config';
import { generatePKCE, generateState } from 'src/common/utils/oauth';

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

            case MCPIntegrationAuthType.OAUTH2:
                return {
                    ...baseProps,
                    authType: MCPIntegrationAuthType.OAUTH2,
                    clientId: parsedAuth.clientId,
                    clientSecret: parsedAuth.clientSecret,
                    scopes: parsedAuth.scopes,
                    accessToken: parsedAuth.token?.access_token,
                    refreshToken: parsedAuth.token?.refresh_token,
                    tokenExpiry: parsedAuth.token
                        ? parsedAuth.token.received_at +
                          (parsedAuth.token.expires_in || 0) * 1000
                        : undefined,
                };

            default:
                throw new Error(`Unhandled authType: ${authType}`);
        }
    }

    private encryptAuth(
        authType: MCPIntegrationAuthType,
        data: {
            dto?: CreateIntegrationDto;
            oauthData?: {
                clientId: string;
                clientSecret?: string | undefined;
                authorizationEndpoint: string;
                tokenEndpoint: string;
                issuer: string;
                asMetadata: any;
                rsMetadata: any;
                redirectUri: string;
                codeChallengeMethod: string;
                codeChallenge: string;
                codeVerifier: string;
                state: string;
                scopes: string;
                token?: {
                    access_token: string;
                    refresh_token?: string;
                    token_type?: string;
                    expires_in?: number;
                    scope?: string;
                    received_at: number;
                };
            };
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
                if (!oauthData) {
                    throw new Error(
                        'OAuth data is required for OAUTH2 auth type',
                    );
                }

                authPayload = oauthData;
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

    private canonicalResourceUri(baseUrl: string): string {
        const url = new URL(baseUrl);
        const scheme = url.protocol.toLowerCase();
        const host = url.hostname.toLowerCase();
        const port = url.port ? `:${url.port}` : '';
        const path = url.pathname && url.pathname !== '/' ? url.pathname : '';
        const canonical = `${scheme}//${host}${port}${path}`;
        return canonical.endsWith('/') && path
            ? canonical.slice(0, -1)
            : canonical;
    }

    private buildWellKnownUrl(base: string, wellKnownName: string): string {
        const u = new URL(base);
        const origin = u.origin;
        const basePath = u.pathname && u.pathname !== '/' ? u.pathname : '';
        const wellKnownPath = `/.well-known/${wellKnownName}${basePath}`;
        return new URL(wellKnownPath, origin).toString();
    }

    private async discoverOAuth(baseUrl: string) {
        let rsMetadataUrl = this.buildWellKnownUrl(
            baseUrl,
            'oauth-protected-resource',
        );
        let rsResp = await axios.get(rsMetadataUrl, {
            validateStatus: () => true,
        });
        if (rsResp.status >= 400) {
            console.error(
                `Error accessing ${rsMetadataUrl}, code: ${rsResp.status}, attempting with root url`,
            );

            rsMetadataUrl = this.buildWellKnownUrl(
                new URL(baseUrl).origin,
                'oauth-protected-resource',
            );

            rsResp = await axios.get(rsMetadataUrl, {
                validateStatus: () => true,
            });

            if (rsResp.status >= 400) {
                console.error(
                    `Error accessing ${rsMetadataUrl}, code: ${rsResp.status}, attempting to proceed without`,
                );
            }
        }

        const rs = rsResp.data || {};
        const authorizationServers: string[] =
            rs.authorization_servers || rs.authorization_servers?.values || [];
        if (
            rsResp.status < 400 &&
            (!authorizationServers || authorizationServers.length === 0)
        ) {
            throw new Error(
                'authorization_servers not found in resource metadata',
            );
        }

        let asIssuer = authorizationServers?.[0] || baseUrl;
        let asWellKnown = this.buildWellKnownUrl(
            asIssuer,
            'oauth-authorization-server',
        );
        let asResp = await axios.get(asWellKnown, {
            validateStatus: () => true,
        });
        if (asResp.status >= 400) {
            console.error(
                `Error accessing ${asWellKnown}, status: ${asResp.status}, attempting with baseUrl`,
            );

            asIssuer = baseUrl;
            asWellKnown = this.buildWellKnownUrl(
                asIssuer,
                'oauth-authorization-server',
            );
            asResp = await axios.get(asWellKnown, {
                validateStatus: () => true,
            });

            if (asResp.status >= 400) {
                console.error(
                    `Error accessing ${asWellKnown}, status: ${asResp.status}, attempting with root url`,
                );

                asIssuer = new URL(baseUrl).origin;
                asWellKnown = this.buildWellKnownUrl(
                    asIssuer,
                    'oauth-authorization-server',
                );
                asResp = await axios.get(asWellKnown, {
                    validateStatus: () => true,
                });

                if (asResp.status >= 400) {
                    throw new Error(
                        'Failed to fetch authorization server metadata',
                    );
                }
            }
        }
        const as = asResp.data || {};
        const authorizationEndpoint: string = as.authorization_endpoint;
        const tokenEndpoint: string = as.token_endpoint;
        const registrationEndpoint: string | undefined =
            as.registration_endpoint;
        if (!authorizationEndpoint || !tokenEndpoint) {
            throw new Error(
                'Missing endpoints in authorization server metadata',
            );
        }
        return {
            rs,
            as,
            authorizationEndpoint,
            tokenEndpoint,
            registrationEndpoint,
            asIssuer,
        };
    }

    async createOAuth2Integration(
        organizationId: string,
        createIntegrationDto: CreateIntegrationDto,
    ) {
        const {
            baseUrl,
            headers,
            oauthScopes,
            clientId: providedClientId,
            clientSecret: providedClientSecret,
        } = createIntegrationDto;

        const {
            rs,
            as,
            authorizationEndpoint,
            tokenEndpoint,
            registrationEndpoint,
            asIssuer,
        } = await this.discoverOAuth(baseUrl);

        const redirectUri = this.getAndValidateRedirectUri();

        let clientId: string;
        let clientSecret: string | undefined;

        if (providedClientId) {
            clientId = providedClientId;
            clientSecret = providedClientSecret;
        } else if (registrationEndpoint) {
            const regResult = await this.registerClient(
                registrationEndpoint,
                redirectUri,
                oauthScopes,
            );
            clientId = regResult.clientId;
            clientSecret = regResult.clientSecret;
        } else {
            throw new Error(
                'A client_id is required, and dynamic client registration is not supported.',
            );
        }

        const { verifier, challenge } = generatePKCE();
        const state = generateState();

        const authUrl = this.buildAuthorizationUrl({
            authorizationEndpoint,
            clientId,
            redirectUri,
            challenge,
            state,
            baseUrl,
            oauthScopes,
        });

        const encryptedAuth = this.prepareIntegrationAuth({
            clientId,
            clientSecret,
            authorizationEndpoint,
            tokenEndpoint,
            issuer: asIssuer,
            asMetadata: as,
            rsMetadata: rs,
            redirectUri,
            codeChallenge: challenge,
            codeVerifier: verifier,
            state,
            scopes: oauthScopes,
        });

        const encryptedHeaders = this.encryptRecordDto(headers);

        const savedIntegration = await this.saveIntegration({
            organizationId,
            createIntegrationDto,
            encryptedAuth,
            encryptedHeaders,
        });

        return { authUrl, integrationId: savedIntegration.id };
    }

    private getAndValidateRedirectUri(): string {
        const redirectUri = this.configService.get<string>('redirectUri');
        if (!redirectUri) {
            throw new Error('Redirect URI is not configured');
        }
        return redirectUri;
    }

    private async registerClient(
        registrationEndpoint: string,
        redirectUri: string,
        oauthScopes: string,
    ): Promise<{ clientId: string; clientSecret: string | undefined }> {
        const registrationBody: any = {
            application_name: 'Kodus MCP Manager',
            redirect_uris: [redirectUri],
            grant_types: ['authorization_code', 'refresh_token'],
            response_types: ['code'],
            token_endpoint_auth_method: 'none',
            scope: oauthScopes,
        };

        const regResp = await axios.post(
            registrationEndpoint,
            registrationBody,
            {
                headers: { 'Content-Type': 'application/json' },
                validateStatus: () => true,
            },
        );

        if (regResp.status >= 400) {
            throw new Error('Client registration failed');
        }

        const client = regResp.data || {};
        const clientId: string = client.client_id;
        const clientSecret: string | undefined = client.client_secret;

        if (!clientId) {
            throw new Error('Client registration did not return client_id');
        }

        return { clientId, clientSecret };
    }

    private buildAuthorizationUrl(params: {
        authorizationEndpoint: string;
        clientId: string;
        redirectUri: string;
        challenge: string;
        state: string;
        baseUrl: string;
        oauthScopes: string;
    }): string {
        const {
            authorizationEndpoint,
            clientId,
            redirectUri,
            challenge,
            state,
            baseUrl,
            oauthScopes,
        } = params;

        const resource = this.canonicalResourceUri(baseUrl);
        const searchParams = new URLSearchParams({
            response_type: 'code',
            client_id: clientId,
            redirect_uri: redirectUri,
            code_challenge: challenge,
            code_challenge_method: 'S256',
            resource,
            state,
            ...(oauthScopes ? { scope: oauthScopes } : {}),
        });

        return `${authorizationEndpoint}?${searchParams.toString()}`;
    }

    private prepareIntegrationAuth(params: {
        clientId: string;
        clientSecret?: string | undefined;
        authorizationEndpoint: string;
        tokenEndpoint: string;
        issuer: string;
        asMetadata: any;
        rsMetadata: any;
        redirectUri: string;
        codeChallenge: string;
        codeVerifier: string;
        state: string;
        scopes: string;
    }): string {
        const {
            clientId,
            clientSecret,
            authorizationEndpoint,
            tokenEndpoint,
            issuer,
            asMetadata,
            rsMetadata,
            redirectUri,
            codeChallenge,
            codeVerifier,
            state,
            scopes,
        } = params;

        return this.encryptAuth(MCPIntegrationAuthType.OAUTH2, {
            oauthData: {
                clientId,
                clientSecret,
                authorizationEndpoint,
                tokenEndpoint,
                issuer,
                asMetadata,
                rsMetadata,
                redirectUri,
                codeChallengeMethod: 'S256',
                codeChallenge,
                codeVerifier,
                state,
                scopes,
            },
        });
    }

    private async saveIntegration(params: {
        organizationId: string;
        createIntegrationDto: CreateIntegrationDto;
        encryptedAuth: string;
        encryptedHeaders: string;
    }): Promise<any> {
        const {
            organizationId,
            createIntegrationDto,
            encryptedAuth,
            encryptedHeaders,
        } = params;

        const { baseUrl, name, description, logoUrl, protocol } =
            createIntegrationDto;

        const newIntegration = this.integrationRepository.create({
            organizationId,
            baseUrl,
            name: name || new URL(baseUrl).hostname,
            description,
            logoUrl,
            authType: MCPIntegrationAuthType.OAUTH2,
            protocol,
            auth: encryptedAuth,
            headers: encryptedHeaders,
        });

        return this.integrationRepository.save(newIntegration);
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

        if (authType === MCPIntegrationAuthType.OAUTH2) {
            const result = await this.createOAuth2Integration(
                organizationId,
                createIntegrationDto,
            );
            return result;
        }

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

        if (existingIntegration.authType === MCPIntegrationAuthType.OAUTH2) {
            throw new Error('Currently OAuth2 integrations cannot be edited');
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

    private parseTokenResponse(response: AxiosResponse): {
        accessToken: string;
        tokenType?: string;
        expiresIn?: number;
        refreshToken?: string;
        scope?: string;
    } {
        const tokenSet = response.data || {};
        let parsedTokens = tokenSet;
        if (typeof tokenSet === 'string') {
            try {
                parsedTokens = JSON.parse(tokenSet);
            } catch (error) {
                parsedTokens = {};
                const accessMatch = tokenSet.match(
                    /(?:^|&)access_token=([^&]+)/,
                );
                if (accessMatch) {
                    parsedTokens['access_token'] = decodeURIComponent(
                        accessMatch[1],
                    );
                }
                const refreshMatch = tokenSet.match(
                    /(?:^|&)refresh_token=([^&]+)/,
                );
                if (refreshMatch) {
                    parsedTokens['refresh_token'] = decodeURIComponent(
                        refreshMatch[1],
                    );
                }
                const tokenTypeMatch = tokenSet.match(
                    /(?:^|&)token_type=([^&]+)/,
                );
                if (tokenTypeMatch) {
                    parsedTokens['token_type'] = decodeURIComponent(
                        tokenTypeMatch[1],
                    );
                }
                const expiresMatch = tokenSet.match(
                    /(?:^|&)expires_in=([^&]+)/,
                );
                if (expiresMatch) {
                    const n = Number(expiresMatch[1]);
                    parsedTokens['expires_in'] = Number.isNaN(n)
                        ? undefined
                        : n;
                }
                const scopeMatch = tokenSet.match(/(?:^|&)scope=([^&]+)/);
                if (scopeMatch) {
                    parsedTokens['scope'] = decodeURIComponent(scopeMatch[1]);
                }
            }
        }

        if (!parsedTokens.access_token) {
            throw new Error('Access token not found in response');
        }

        return {
            accessToken: parsedTokens.access_token,
            tokenType: parsedTokens.token_type,
            expiresIn: parsedTokens.expires_in,
            refreshToken: parsedTokens.refresh_token,
            scope: parsedTokens.scope,
        };
    }

    async finalizeOAuthFlow(params: {
        organizationId: string;
        integrationId: string;
        code: string;
        state: string;
    }): Promise<{ message: string }> {
        const { organizationId, integrationId, code, state } = params;

        const entity = await this.integrationRepository.findOne({
            where: { id: integrationId, organizationId },
        });

        if (!entity) {
            throw new Error('Integration not found');
        }

        if (entity.authType !== MCPIntegrationAuthType.OAUTH2) {
            throw new Error('Integration is not OAuth2');
        }

        const auth = this.decryptAndParse<any>(entity.auth, {});

        const {
            clientId,
            clientSecret,
            tokenEndpoint,
            redirectUri,
            codeVerifier,
            state: storedState,
        } = auth;

        if (
            !clientId ||
            !tokenEndpoint ||
            !redirectUri ||
            !codeVerifier ||
            !storedState
        ) {
            throw new Error('OAuth metadata missing for integration');
        }

        if (state !== storedState) {
            throw new Error('Invalid state parameter');
        }

        const resource = this.canonicalResourceUri(entity.baseUrl);

        const body = new URLSearchParams({
            client_id: clientId,
            ...(clientSecret ? { client_secret: clientSecret } : {}),
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
            resource,
            state,
        });

        const tokenResp = await axios.post(tokenEndpoint, body.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            validateStatus: () => true,
        });

        if (tokenResp.status >= 400) {
            throw new Error('OAuth token exchange failed');
        }

        const { accessToken, tokenType, refreshToken, expiresIn, scope } =
            this.parseTokenResponse(tokenResp);

        const updatedAuth = {
            ...auth,
            token: {
                access_token: accessToken,
                refresh_token: refreshToken,
                token_type: tokenType,
                expires_in: expiresIn,
                scope,
                received_at: Date.now(),
            },
        };

        entity.auth = this.encryptAuth(MCPIntegrationAuthType.OAUTH2, {
            oauthData: updatedAuth,
        });

        await this.integrationRepository.save(entity);

        return { message: 'OAuth integration finalized' };
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

    private isTokenExpired(
        tokenExpiry?: number,
        bufferMs: number = 5 * 60 * 1000,
    ): boolean {
        if (!tokenExpiry) return false;
        return Date.now() + bufferMs >= tokenExpiry;
    }

    private async refreshOAuthToken(
        integration: MCPIntegrationInterface & { id: string },
    ): Promise<MCPIntegrationInterface> {
        if (integration.authType !== MCPIntegrationAuthType.OAUTH2) {
            throw new Error('Integration is not OAuth2');
        }

        if (!integration.refreshToken) {
            throw new Error('No refresh token available');
        }

        // Get the full entity to access the encrypted auth data
        const entity = await this.integrationRepository.findOne({
            where: { id: integration.id },
        });

        if (!entity) {
            throw new Error('Integration not found');
        }

        const auth = this.decryptAndParse<any>(entity.auth, {});

        if (!auth.tokenEndpoint) {
            throw new Error('No token endpoint available for refresh');
        }

        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: integration.refreshToken,
            client_id: integration.clientId,
            ...(integration.clientSecret
                ? { client_secret: integration.clientSecret }
                : {}),
        });

        try {
            const tokenResp = await axios.post(
                auth.tokenEndpoint,
                body.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    validateStatus: () => true,
                },
            );

            if (tokenResp.status >= 400) {
                throw new Error(
                    `Token refresh failed with status ${tokenResp.status}: ${tokenResp.statusText}`,
                );
            }

            const { accessToken, tokenType, refreshToken, expiresIn, scope } =
                this.parseTokenResponse(tokenResp);
            const now = Date.now();

            // Update the token data in the auth object
            const updatedAuth = {
                ...auth,
                token: {
                    access_token: accessToken,
                    refresh_token: refreshToken || integration.refreshToken, // Use new refresh token if provided, fallback to existing
                    token_type: tokenType,
                    expires_in: expiresIn,
                    scope,
                    received_at: now,
                },
            };

            // Update the entity with the new tokens
            entity.auth = this.encryptAuth(MCPIntegrationAuthType.OAUTH2, {
                oauthData: updatedAuth,
            });

            await this.integrationRepository.save(entity);

            // Return the updated integration
            return this.entityToInterface(entity);
        } catch (error) {
            console.error('Error refreshing OAuth token:', error);
            throw new Error(`Failed to refresh token: ${error.message}`);
        }
    }

    async getRefreshedOauthIntegration(
        integrationId: string,
        organizationId: string,
    ): Promise<MCPIntegrationInterface> {
        const integration = await this.getIntegrationById(
            integrationId,
            organizationId,
        );

        if (!integration) {
            throw new Error('Integration not found');
        }

        if (integration.authType !== MCPIntegrationAuthType.OAUTH2) {
            throw new Error('Integration is not OAuth2');
        }

        // If token is expired or will expire in the next 5 minutes, refresh it
        if (this.isTokenExpired(integration.tokenExpiry)) {
            const refreshed = await this.refreshOAuthToken({
                ...integration,
                id: integrationId,
            } as MCPIntegrationInterface & { id: string });

            if (refreshed.authType !== MCPIntegrationAuthType.OAUTH2) {
                throw new Error(
                    'Failed to refresh token: Invalid integration type after refresh',
                );
            }

            return refreshed;
        }

        return integration;
    }
}
