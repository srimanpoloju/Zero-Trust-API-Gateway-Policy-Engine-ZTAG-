import { ProxyService } from '../../src/services/ProxyService';
import { logger } from '../../src/utils/logger';
import { request as undiciRequest } from 'undici';
import { ProxyRequest } from '@ztag/shared';

// Mock undici's request
jest.mock('undici', () => ({
  request: jest.fn(),
}));
const mockUndiciRequest = undiciRequest as jest.MockedFunction<typeof undiciRequest>;

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));
const mockLoggerError = logger.error as jest.Mock;

describe('ProxyService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockTargetUrl = 'http://downstream-service';
  const mockRequestId = 'test-req-id';
  const mockSourceIp = '192.168.1.1';

  it('should proxy a GET request successfully', async () => {
    const mockProxyRequest: ProxyRequest = {
      method: 'GET',
      path: '/data',
      headers: { 'User-Agent': 'test-agent' },
      query: { param1: 'value1' },
    };

    mockUndiciRequest.mockResolvedValueOnce({
      statusCode: 200,
      headers: [['content-type', 'application/json']],
      body: {
        text: async () => '{"status": "ok"}',
      },
    } as any);

    const response = await ProxyService.proxyRequest(
      mockTargetUrl,
      mockProxyRequest,
      mockRequestId,
      mockSourceIp
    );

    expect(mockUndiciRequest).toHaveBeenCalledWith(
      `${mockTargetUrl}/data?param1=value1`,
      expect.objectContaining({
        method: 'GET',
        headers: {
          'User-Agent': 'test-agent',
          'X-Request-ID': mockRequestId,
          'X-Forwarded-For': mockSourceIp,
        },
      })
    );
    expect(response).toEqual({
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: '{"status": "ok"}',
    });
    expect(mockLoggerError).not.toHaveBeenCalled();
  });

  it('should proxy a POST request with body successfully', async () => {
    const mockProxyRequest: ProxyRequest = {
      method: 'POST',
      path: '/submit',
      headers: { 'Content-Type': 'application/json' },
      body: { key: 'value' },
    };

    mockUndiciRequest.mockResolvedValueOnce({
      statusCode: 201,
      headers: [['location', '/new-resource']],
      body: {
        text: async () => '{"id": "new-id"}',
      },
    } as any);

    const response = await ProxyService.proxyRequest(
      mockTargetUrl,
      mockProxyRequest,
      mockRequestId,
      mockSourceIp
    );

    expect(mockUndiciRequest).toHaveBeenCalledWith(
      `${mockTargetUrl}/submit`,
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': mockRequestId,
          'X-Forwarded-For': mockSourceIp,
        },
        body: { key: 'value' },
        duplex: 'half',
      })
    );
    expect(response).toEqual({
      statusCode: 201,
      headers: { location: '/new-resource' },
      body: '{"id": "new-id"}',
    });
  });

  it('should strip specified headers', async () => {
    const mockProxyRequest: ProxyRequest = {
      method: 'GET',
      path: '/sensitive',
      headers: { 'Authorization': 'Bearer token', 'Cookie': 'sessionid=123' },
    };
    const stripHeaders = ['authorization', 'cookie'];

    mockUndiciRequest.mockResolvedValueOnce({
      statusCode: 200,
      headers: [],
      body: {
        text: async () => 'ok',
      },
    } as any);

    await ProxyService.proxyRequest(
      mockTargetUrl,
      mockProxyRequest,
      mockRequestId,
      mockSourceIp,
      stripHeaders
    );

    expect(mockUndiciRequest).toHaveBeenCalledWith(
      `${mockTargetUrl}/sensitive`,
      expect.objectContaining({
        headers: {
          'X-Request-ID': mockRequestId,
          'X-Forwarded-For': mockSourceIp,
        },
      })
    );
  });

  it('should throw an error if undici request fails', async () => {
    const mockProxyRequest: ProxyRequest = {
      method: 'GET',
      path: '/error',
      headers: {},
    };
    mockUndiciRequest.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      ProxyService.proxyRequest(
        mockTargetUrl,
        mockProxyRequest,
        mockRequestId,
        mockSourceIp
      )
    ).rejects.toThrow('Proxy request failed: Network error');
    expect(mockLoggerError).toHaveBeenCalledTimes(1);
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'Proxy request failed'
    );
  });

  it('should not pass host header from client to downstream', async () => {
    const mockProxyRequest: ProxyRequest = {
      method: 'GET',
      path: '/test',
      headers: { 'Host': 'client.com', 'User-Agent': 'test' },
    };

    mockUndiciRequest.mockResolvedValueOnce({
      statusCode: 200,
      headers: [],
      body: { text: async () => 'ok' },
    } as any);

    await ProxyService.proxyRequest(
      mockTargetUrl,
      mockProxyRequest,
      mockRequestId,
      mockSourceIp
    );

    const callArgs = mockUndiciRequest.mock.calls[0][1];
    expect(callArgs?.headers).not.toHaveProperty('Host'); // 'Host' is handled by undici/Fastify
    expect(callArgs?.headers).toHaveProperty('User-Agent', 'test');
  });
});
