export enum MCPIntegrationAuthType {
    NONE = 'none',
    API_KEY = 'api_key',
    BASIC = 'basic',
    BEARER_TOKEN = 'bearer_token',
}

export enum MCPIntegrationProtocol {
    HTTP = 'http',
    STDIO = 'stdio',
    SSE = 'sse',
    WEBSOCKET = 'websocket',
}
