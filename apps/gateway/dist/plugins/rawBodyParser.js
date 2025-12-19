import fp from 'fastify-plugin';
/**
 * A Fastify plugin to parse raw request body.
 * This is useful for proxying requests where the body might be in various formats
 * or needs to be re-streamed to the downstream service.
 */
export const rawBodyParser = fp(async (fastify, options, done) => {
    fastify.addContentTypeParser('*', (request, payload, done) => {
        let body = [];
        payload.on('data', (chunk) => body.push(chunk));
        payload.on('end', () => {
            request.rawBody = Buffer.concat(body);
            done(null, request.rawBody); // Pass the raw body as the parsed body
        });
        payload.on('error', (err) => done(err, undefined));
    });
    done();
}, {
    fastify: '4.x',
    name: 'raw-body-parser'
});
//# sourceMappingURL=rawBodyParser.js.map