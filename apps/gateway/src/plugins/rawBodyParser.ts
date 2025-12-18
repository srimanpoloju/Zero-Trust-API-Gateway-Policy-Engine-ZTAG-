import { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyRequest {
    rawBody: Buffer | undefined;
  }
}

/**
 * A Fastify plugin to parse raw request body.
 * This is useful for proxying requests where the body might be in various formats
 * or needs to be re-streamed to the downstream service.
 */
export const rawBodyParser = fp(async (fastify: FastifyInstance, options: any, done: Function) => {
  fastify.addContentTypeParser('*', (request: FastifyRequest, payload: any, done: (err: Error | null, body?: any) => void) => {
    let body: Buffer[] = [];
    payload.on('data', (chunk: Buffer) => body.push(chunk));
    payload.on('end', () => {
      request.rawBody = Buffer.concat(body);
      done(null, request.rawBody); // Pass the raw body as the parsed body
    });
    payload.on('error', (err: Error) => done(err, undefined));
  });

  done();
}, {
  fastify: '4.x',
  name: 'raw-body-parser'
});
