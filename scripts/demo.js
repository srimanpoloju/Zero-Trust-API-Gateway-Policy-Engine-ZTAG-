#!/usr/bin/env node

/**
 * ZTAG Demo Script
 * This script demonstrates the Zero-Trust API Gateway functionality
 * by generating demo tokens, testing policies, and showing rate limiting.
 *
 * Prerequisites:
 * - Docker Compose stack running (`docker compose up --build`)
 * - Database initialized (`pnpm db:migrate`)
 * - Node.js 18+
 * - pnpm installed
 */

require('dotenv').config(); // Load environment variables from .env
const jwt = require('jsonwebtoken');
const { execSync } = require('child_process');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET?.split(',')[0] || 'super-secret-jwt-key-change-in-production';
const GATEWAY_URL = 'http://localhost:3001';
const POLICY_ENGINE_URL = 'http://localhost:4000'; // Updated port
const ECHO_SERVICE_URL = 'http://localhost:7070';

function runCommand(command, description) {
  console.log(`\n--- ${description} ---`);
  console.log(`Executing: \n${command}`);
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log('Output:\n', output.trim());
    return output.trim();
  } catch (error) {
    console.error('Error executing command:\n', error.stdout?.trim() || error.message);
    return error.stdout?.trim() || error.message;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('ZTAG Demo - Zero-Trust API Gateway & Policy Engine\n');
  console.log('=' .repeat(80));

  console.log('\n1. GENERATING DEMO TOKENS');
  console.log('   Using JWT_SECRET from .env: ' + JWT_SECRET);

  function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  }

  const adminClaims = {
    sub: 'admin-123', email: 'admin@ztag.com', role: 'admin', tenant: 'demo', scopes: ['*']
  };
  const adminToken = generateToken(adminClaims);
  console.log('\n👑 Admin Token (full access):');
  console.log(adminToken);

  const userClaims = {
    sub: 'user-456', email: 'user@ztag.com', role: 'user', tenant: 'demo', scopes: ['read']
  };
  const userToken = generateToken(userClaims);
  console.log('\n👤 User Token (limited access: GET /api/echo/*):');
  console.log(userToken);

  const blockedClaims = {
    sub: 'blocked-789', email: 'blocked@ztag.com', role: 'blocked', tenant: 'demo', scopes: []
  };
  const blockedToken = generateToken(blockedClaims);
  console.log('\n🚫 Blocked User Token (should be denied everywhere):');
  console.log(blockedToken);

  console.log('\n' + '='.repeat(80));
  console.log('\n2. RUNNING DEMO SCENARIOS (ensure docker compose is up and db:migrate ran)\n');
  await sleep(2000); // Give services a moment to warm up


  // --- Scenario 1: Admin ALLOW ---
  const adminAllowCommand = `curl -s -X GET -H "Authorization: Bearer ${adminToken}" ${GATEWAY_URL}/api/echo/hello -o /dev/null -w "HTTP Status: %{http_code}\\n"`;
  runCommand(adminAllowCommand, '✅ Admin: GET /api/echo/hello (Expected: 200 OK - Allowed)');


  // --- Scenario 2: Blocked User DENY ---
  const blockedDenyCommand = `curl -s -X GET -H "Authorization: Bearer ${blockedToken}" ${GATEWAY_URL}/api/echo/test -o /dev/null -w "HTTP Status: %{http_code}\\n"`;
  runCommand(blockedDenyCommand, '❌ Blocked User: GET /api/echo/test (Expected: 403 Forbidden - Denied by policy)');


  // --- Scenario 3: User ALLOW (GET) ---
  const userAllowGetCommand = `curl -s -X GET -H "Authorization: Bearer ${userToken}" ${GATEWAY_URL}/api/echo/world -o /dev/null -w "HTTP Status: %{http_code}\\n"`;
  runCommand(userAllowGetCommand, '✅ User: GET /api/echo/world (Expected: 200 OK - Allowed by policy)');


  // --- Scenario 4: User DENY (POST) ---
  const userDenyPostCommand = `curl -s -X POST -H "Authorization: Bearer ${userToken}" -H "Content-Type: application/json" -d '{"data":"test"}' ${GATEWAY_URL}/api/echo/submit -o /dev/null -w "HTTP Status: %{http_code}\\n"`;
  runCommand(userDenyPostCommand, '❌ User: POST /api/echo/submit (Expected: 403 Forbidden - Denied by policy)');


  // --- Scenario 5: User Rate Limiting ---
  console.log('\n--- 🚫 Rate Limiting Demo (User: 10 req/min on /api/echo/*) ---');
  console.log('   Sending 12 requests...');
  let rateLimitCount = 0;
  for (let i = 1; i <= 12; i++) {
    process.stdout.write(`   Request ${i}... `);
    const rlCommand = `curl -s -X GET -H "Authorization: Bearer ${userToken}" ${GATEWAY_URL}/api/echo/rate-limit-test -w "HTTP Status: %{http_code}\\n" -o /dev/null`;
    const output = execSync(rlCommand, { encoding: 'utf8', stdio: 'pipe' });
    const statusCodeMatch = output.match(/HTTP Status: (\d{3})/);
    const statusCode = statusCodeMatch ? statusCodeMatch[1] : 'N/A';
    console.log(`Status: ${statusCode}`);
    if (statusCode === '429') {
      rateLimitCount++;
    }
    await sleep(200); // Small delay between requests
  }
  if (rateLimitCount > 0) {
    console.log(`   Expected: First 10 requests were 200 OK, subsequent requests were 429 Too Many Requests.`);
    console.log(`   Result: Encountered ${rateLimitCount} rate-limited responses.`);
  } else {
    console.log(`   Result: Did not encounter any rate-limited responses. Ensure rate limit policy is active and you sent enough requests within the window.`);
  }


  console.log('\n' + '='.repeat(80));
  console.log('\n3. ADDITIONAL ACCESS POINTS\n');
  console.log(`   Control Plane UI: ${GATEWAY_URL.replace('3001', '3000')}`);
  console.log(`   Policy Engine API (Swagger): ${POLICY_ENGINE_URL}/documentation`);
  console.log(`   Gateway Metrics (Prometheus): ${GATEWAY_URL}/metrics`);
  console.log(`   Gateway Health: ${GATEWAY_URL}/health`);
  console.log(`   Policy Engine Health: ${POLICY_ENGINE_URL}/health`);
  console.log(`   Echo Service Health: ${ECHO_SERVICE_URL}/health`);
  console.log('\n   Login to Control Plane UI with: admin@ztag.com / password');

  console.log('\n' + '='.repeat(80));
  console.log('\nDemo Complete!');
}

main().catch(err => {
  console.error('\nDemo script failed:', err);
  process.exit(1);
});
