export const config = {
    port: parseInt(process.env.ECHO_SERVICE_PORT || '7070', 10),
    host: process.env.ECHO_SERVICE_HOST || '0.0.0.0',
    logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
};
//# sourceMappingURL=config.js.map