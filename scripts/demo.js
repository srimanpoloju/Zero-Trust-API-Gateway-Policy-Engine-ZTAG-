#!/usr/bin/env node

/**
 * ZTAG Demo Script
 * This script demonstrates the Zero-Trust API Gateway functionality
 * by generating demo tokens, testing policies, and showing rate limiting.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = 'super-secret-jwt-key-change-in-production';

console.log('ZTAG Demo - Zero-Trust API Gateway & Policy Engine\n');
console.log('=' * 60);

// Generate demo tokens
console.log('\n1. GENERATING DEMO TOKENS\n');

function generateToken(userData) {
  return jwt.sign(userData, JWT_SECRET, { expiresIn: '24h' });
}

// Admin token
const adminToken = generateToken({
  sub: 'admin-123',
  email: 'admin@ztag.com',
  role: 'admin',
  tenant: 'demo',
  scopes: ['admin', 'read', 'write']
});
console.log('👑 Admin Token (full access):');
console.log(adminToken);

// User token
const userToken = generateToken({
  sub: 'user-456',
  email: 'user@ztag.com',
  role: 'user',
  tenant: 'demo',
  scopes: ['read']
});
console.log('\n👤 User Token (limited access):');
console.log(userToken);

// Blocked user token
const blockedToken = generateToken({
  sub: 'blocked-789',
  email: 'blocked@ztag.com',
  role: 'blocked',
  tenant: 'demo',
  scopes: []
});
console.log('\n🚫 Blocked User Token (should be denied):');
console.log(blockedToken);

console.log('\n' + '=' * 60);
console.log('\n2. TESTING WITH CURL COMMANDS\n');

// Demo curl commands
const demoCommands = [
  {
    title: '✅ ALLOW: Admin accessing echo service',
    command: `curl -X GET \\
  -H "Authorization: Bearer ${adminToken}" \\
  http://localhost:3001/api/echo/test`
  },
  {
    title: '❌ DENY: Blocked user accessing echo service',
    command: `curl -X GET \\
  -H "Authorization: Bearer ${blockedToken}" \\
  http://localhost:3001/api/echo/test`
  },
  {
    title: '✅ ALLOW: User accessing echo service (first request)',
    command: `curl -X GET \\
  -H "Authorization: Bearer ${userToken}" \\
  http://localhost:3001/api/echo/test`
  },
  {
    title: '🚫 RATE LIMIT: User after 10 requests per minute',
    command: `curl -X GET \\
  -H "Authorization: Bearer ${userToken}" \\
  http://localhost:3001/api/echo/test`
  }
];

demoCommands.forEach((demo, index) => {
  console.log(`${demo.title}`);
  console.log(demo.command);
  console.log('');
});

console.log('\n' + '=' * 60);
console.log('\n3. EXPECTED RESULTS\n');
console.log('Admin Request:');
console.log('  Status: 200 OK');
console.log('  Response: Echo service data with gateway headers');

console.log('\nBlocked User Request:');
console.log('  Status: 403 Forbidden');
console.log('  Response: {"error": {"code": "ACCESS_DENIED", ...}}');

console.log('\nUser Requests (1-10):');
console.log('  Status: 200 OK');
console.log('  Response: Echo service data');

console.log('\nUser Requests (11+):');
console.log('  Status: 429 Too Many Requests');
console.log('  Response: {"error": {"code": "RATE_LIMITED", ...}}');

console.log('\n' + '=' * 60);
console.log('\n4. POLICY MANAGEMENT\n');
console.log('Control Plane UI: http://localhost:3000');
console.log('Policy Engine API: http://localhost:3002');
console.log('Gateway API: http://localhost:3001');

console.log('\n5. HEALTH CHECKS\n');
console.log('Gateway: curl http://localhost:3001/health');
console.log('Policy Engine: curl http://localhost:3002/health');
console.log('Echo Service: curl http://localhost:7070/health');

console.log('\n' + '=' * 60);
console.log('\n🎯 To run the demo:');
console.log('1. Start all services: docker compose up --build');
console.log('2. Wait for services to be ready (~30 seconds)');
console.log('3. Run: pnpm db:migrate && pnpm db:seed');
console.log('4. Copy and paste the curl commands above');
console.log('5. Observe the different access control behaviors');

console.log('\n📚 For more information, see README.md');
