// Mock manual para @composio/core
const MockComposio = jest.fn().mockImplementation((config) => {
  return {
    config: config,
    authConfigs: {
      list: jest.fn(),
      get: jest.fn(),
    },
    connectedAccounts: {
      list: jest.fn(),
      get: jest.fn(),
      initiate: jest.fn(),
    },
    tools: {
      get: jest.fn(),
    },
  };
});

const AuthScheme = {
  OAuth2: jest.fn().mockReturnValue({ config: 'mock-oauth2' }),
  OAuth1: jest.fn().mockReturnValue({ config: 'mock-oauth1' }),
  APIKey: jest.fn().mockReturnValue({ config: 'mock-api-key' }),
  Basic: jest.fn().mockReturnValue({ config: 'mock-basic' }),
  BearerToken: jest.fn().mockReturnValue({ config: 'mock-bearer' }),
  GoogleServiceAccount: jest.fn().mockReturnValue({ config: 'mock-gsa' }),
  NoAuth: jest.fn().mockReturnValue({ config: 'mock-no-auth' }),
  BasicWithJWT: jest.fn().mockReturnValue({ config: 'mock-basic-jwt' }),
  ComposioLink: jest.fn().mockReturnValue({ config: 'mock-composio-link' }),
  CalcomAuth: jest.fn().mockReturnValue({ config: 'mock-calcom' }),
};

module.exports = {
  Composio: MockComposio,
  AuthScheme: AuthScheme,
  ConnectedAccountRetrieveResponse: {},
};
