#!/usr/bin/env node

/**
 * Performance Baseline Test for CohortLens API v2
 * 
 * Measures p50, p95, p99 latencies for core endpoints
 * Target: p95 < 500ms for predict/segment, < 2.5s with Groq
 * 
 * Usage:
 *   node scripts/performance-baseline.js --api=http://localhost:8001 --duration=30
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

const args = {};
process.argv.slice(2).forEach(arg => {
  const [key, value] = arg.split('=');
  args[key.replace('--', '')] = value;
});

const API_URL = args['api'] || 'http://127.0.0.1:8001';
const DURATION_SECONDS = parseInt(args['duration'] || '30', 10);
const OUTPUT_DIR = path.join(__dirname, '../reports/performance');
const CONCURRENT_REQUESTS = parseInt(args['concurrent'] || '10', 10);

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

class PerformanceTest {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      api_url: API_URL,
      duration_seconds: DURATION_SECONDS,
      concurrent_requests: CONCURRENT_REQUESTS,
      endpoints: {},
      summary: {},
    };
    this.token = null;
    this.testEndTime = null;
  }

  /**
   * Make HTTP request and measure latency
   */
  async request(method, path, body = null) {
    const url = new URL(path, API_URL);
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
        },
        timeout: 15000,
      };

      const req = http.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const duration = Date.now() - startTime;
          try {
            const json = data ? JSON.parse(data) : {};
            resolve({
              statusCode: res.statusCode,
              duration,
              success: res.statusCode >= 200 && res.statusCode < 300,
              error: null,
              body: json,
            });
          } catch (err) {
            resolve({
              statusCode: res.statusCode,
              duration,
              success: false,
              error: `JSON parse error: ${err.message}`,
              body: null,
            });
          }
        });
      });

      req.on('error', (err) => {
        const duration = Date.now() - startTime;
        resolve({
          statusCode: 0,
          duration,
          success: false,
          error: err.message,
          body: null,
        });
      });

      req.on('timeout', () => {
        req.abort();
        const duration = Date.now() - startTime;
        resolve({
          statusCode: 0,
          duration,
          success: false,
          error: 'Request timeout',
          body: null,
        });
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  /**
   * Get auth token
   */
  async authenticate() {
    console.log('🔐 Authenticating...');
    const res = await this.request('POST', '/api/v2/auth/token', {
      username: 'admin',
      password: 'admin',
    });

    if (!res.success) {
      throw new Error(`Auth failed: ${res.error}`);
    }

    this.token = res.body.access_token;
    console.log('✅ Authenticated\n');
  }

  /**
   * Calculate percentiles
   */
  calculatePercentiles(durations) {
    const sorted = [...durations].sort((a, b) => a - b);
    const len = sorted.length;

    return {
      min: sorted[0],
      max: sorted[len - 1],
      mean: Math.round(sorted.reduce((a, b) => a + b, 0) / len),
      p50: sorted[Math.floor(len * 0.5)],
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)],
      count: len,
    };
  }

  /**
   * Run load test for single endpoint
   */
  async benchmarkEndpoint(name, method, path, body = null, expectedDuration = 500) {
    console.log(`\n📊 Benchmarking: ${name}`);
    console.log(`   Target p95: ${expectedDuration}ms`);

    const durations = [];
    const errors = [];
    let requestCount = 0;

    const startTime = Date.now();
    this.testEndTime = startTime + (DURATION_SECONDS * 1000);

    while (Date.now() < this.testEndTime) {
      const promises = [];

      for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
        promises.push(
          this.request(method, path, body).then(result => {
            requestCount++;
            if (result.success) {
              durations.push(result.duration);
            } else {
              errors.push(result.error);
            }
            return result;
          })
        );
      }

      await Promise.all(promises);
      process.stdout.write(`\r   Requests: ${requestCount}, Errors: ${errors.length}`);
    }

    console.log('\r' + ' '.repeat(50) + '\r');

    const stats = this.calculatePercentiles(durations);
    const successRate = ((durations.length / requestCount) * 100).toFixed(2);

    console.log(`   ✓ Requests: ${requestCount}`);
    console.log(`   ✓ Success rate: ${successRate}%`);
    console.log(`   ✓ Min: ${stats.min}ms`);
    console.log(`   ✓ p50: ${stats.p50}ms`);
    console.log(`   ✓ p95: ${stats.p95}ms (target: ${expectedDuration}ms)`);
    console.log(`   ✓ p99: ${stats.p99}ms`);
    console.log(`   ✓ Max: ${stats.max}ms`);

    const passed = stats.p95 <= expectedDuration;
    console.log(`   ${passed ? '✅ PASSED' : '⚠️  FAILED'}`);

    this.results.endpoints[name] = {
      method,
      path,
      duration_seconds: DURATION_SECONDS,
      concurrent_requests: CONCURRENT_REQUESTS,
      stats,
      target_p95: expectedDuration,
      passed,
      success_rate: parseFloat(successRate),
      total_requests: requestCount,
      errors: errors.slice(0, 10), // Keep first 10 errors
    };

    return passed;
  }

  /**
   * Run all benchmarks
   */
  async runAll() {
    console.log('🚀 CohortLens Performance Baseline Test');
    console.log(`📝 API: ${API_URL}`);
    console.log(`⏱️  Duration: ${DURATION_SECONDS}s per endpoint`);
    console.log(`🔄 Concurrency: ${CONCURRENT_REQUESTS} requests/batch\n`);

    try {
      await this.authenticate();

      const results = [];

      // Health check (< 100ms expected)
      results.push(await this.benchmarkEndpoint(
        'GET /api/v2/health',
        'GET',
        '/api/v2/health',
        null,
        100
      ));

      // Usage check (< 150ms expected)
      results.push(await this.benchmarkEndpoint(
        'GET /api/v2/usage',
        'GET',
        '/api/v2/usage',
        null,
        150
      ));

      // Predict (< 500ms expected)
      results.push(await this.benchmarkEndpoint(
        'POST /api/v2/predict-spending',
        'POST',
        '/api/v2/predict-spending',
        {
          age: 35,
          annual_income: 75000,
          work_experience: 10,
          family_size: 3,
          profession: 'Engineer',
        },
        500
      ));

      // Segment small batch (< 300ms expected)
      const smallBatch = Array.from({ length: 10 }, (_, i) => ({
        CustomerID: `c${i}`,
        Age: 25 + (i % 30),
        'Annual Income ($)': 40000 + (i * 5000),
        'Spending Score (1-100)': (i * 10) % 100,
      }));

      results.push(await this.benchmarkEndpoint(
        'POST /api/v2/segment (10 items)',
        'POST',
        '/api/v2/segment',
        smallBatch,
        300
      ));

      // Segment large batch (< 800ms expected)
      const largeBatch = Array.from({ length: 100 }, (_, i) => ({
        CustomerID: `c${i}`,
        Age: 25 + (i % 30),
        'Annual Income ($)': 40000 + (i * 5000),
        'Spending Score (1-100)': (i * 10) % 100,
      }));

      results.push(await this.benchmarkEndpoint(
        'POST /api/v2/segment (100 items)',
        'POST',
        '/api/v2/segment',
        largeBatch,
        800
      ));

      // Recommendations (with Groq: < 2500ms, without: < 300ms)
      results.push(await this.benchmarkEndpoint(
        'POST /api/v2/recommendations/natural',
        'POST',
        '/api/v2/recommendations/natural',
        { query: 'What are the best segments for upselling?' },
        2500
      ));

      // Summary
      this.results.summary = {
        total_endpoints: results.length,
        passed_endpoints: results.filter(r => r).length,
        failed_endpoints: results.filter(r => !r).length,
        overall_status: results.every(r => r) ? 'PASS' : 'FAIL',
      };

      console.log('\n' + '='.repeat(60));
      console.log('📊 Overall Summary');
      console.log('='.repeat(60));
      console.log(`Total endpoints tested: ${this.results.summary.total_endpoints}`);
      console.log(`✅ Passed: ${this.results.summary.passed_endpoints}`);
      console.log(`⚠️  Failed: ${this.results.summary.failed_endpoints}`);
      console.log(`Status: ${this.results.summary.overall_status}`);

      // Save report
      const reportPath = path.join(OUTPUT_DIR, `baseline-${new Date().toISOString().split('T')[0]}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
      console.log(`\n📁 Report saved: ${reportPath}`);

      process.exit(this.results.summary.overall_status === 'PASS' ? 0 : 1);
    } catch (error) {
      console.error('\n❌ Fatal error:', error.message);
      process.exit(2);
    }
  }
}

// Run
new PerformanceTest().runAll();
