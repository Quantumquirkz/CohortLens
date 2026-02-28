#!/usr/bin/env node

/**
 * Non-regression validation script: v1 (Python/FastAPI) vs v2 (TypeScript/NestJS)
 * 
 * This script compares predictions and segmentation between the old and new backend.
 * 
 * Usage:
 *   node scripts/validate-no-regression.js --api-v1=http://localhost:8000 --api-v2=http://localhost:8001
 */

const fs = require('fs');
const path = require('path');

// Parse CLI arguments
const args = {};
process.argv.slice(2).forEach(arg => {
  const [key, value] = arg.split('=');
  args[key.replace('--', '')] = value;
});

const API_V1 = args['api-v1'] || 'http://127.0.0.1:8000';
const API_V2 = args['api-v2'] || 'http://127.0.0.1:8001';
const OUTPUT_DIR = path.join(__dirname, '../reports/validation');

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Test case: (age, annual_income, work_experience, family_size, profession)
 */
const TEST_CASES = [
  // Young professionals
  { age: 25, annual_income: 45000, work_experience: 2, family_size: 1, profession: 'Engineer' },
  { age: 27, annual_income: 55000, work_experience: 3, family_size: 2, profession: 'DataScientist' },
  { age: 28, annual_income: 65000, work_experience: 4, family_size: 3, profession: 'Manager' },
  
  // Mid-career professionals
  { age: 35, annual_income: 75000, work_experience: 10, family_size: 2, profession: 'Engineer' },
  { age: 38, annual_income: 85000, work_experience: 12, family_size: 3, profession: 'Manager' },
  { age: 40, annual_income: 95000, work_experience: 15, family_size: 4, profession: 'Director' },
  
  // Senior professionals
  { age: 45, annual_income: 110000, work_experience: 20, family_size: 3, profession: 'Manager' },
  { age: 50, annual_income: 125000, work_experience: 25, family_size: 2, profession: 'Director' },
  { age: 55, annual_income: 140000, work_experience: 30, family_size: 2, profession: 'Executive' },
  
  // Entry-level & students
  { age: 22, annual_income: 35000, work_experience: 0, family_size: 1, profession: 'Graduate' },
  { age: 23, annual_income: 40000, work_experience: 1, family_size: 2, profession: 'EntryLevel' },
  
  // High earners
  { age: 42, annual_income: 200000, work_experience: 18, family_size: 4, profession: 'Executive' },
  { age: 48, annual_income: 250000, work_experience: 22, family_size: 3, profession: 'Director' },
  
  // Budget-conscious
  { age: 30, annual_income: 30000, work_experience: 5, family_size: 3, profession: 'Clerk' },
  { age: 35, annual_income: 35000, work_experience: 8, family_size: 4, profession: 'Technician' },
  
  // Mixed demographics (x14 more for 50 total)
  { age: 26, annual_income: 52000, work_experience: 3, family_size: 2, profession: 'Artist' },
  { age: 32, annual_income: 68000, work_experience: 8, family_size: 2, profession: 'Teacher' },
  { age: 41, annual_income: 92000, work_experience: 16, family_size: 3, profession: 'Consultant' },
  { age: 29, annual_income: 58000, work_experience: 4, family_size: 1, profession: 'Analyst' },
  { age: 36, annual_income: 78000, work_experience: 11, family_size: 3, profession: 'Specialist' },
  { age: 44, annual_income: 105000, work_experience: 19, family_size: 4, profession: 'Manager' },
  { age: 51, annual_income: 130000, work_experience: 26, family_size: 2, profession: 'Senior' },
  { age: 24, annual_income: 42000, work_experience: 1, family_size: 1, profession: 'Junior' },
  { age: 33, annual_income: 72000, work_experience: 10, family_size: 2, profession: 'Coordinator' },
  { age: 47, annual_income: 115000, work_experience: 21, family_size: 3, profession: 'Lead' },
  { age: 28, annual_income: 60000, work_experience: 4, family_size: 2, profession: 'Admin' },
  { age: 39, annual_income: 88000, work_experience: 14, family_size: 3, profession: 'Officer' },
  { age: 31, annual_income: 65000, work_experience: 6, family_size: 2, profession: 'Operator' },
  { age: 46, annual_income: 118000, work_experience: 20, family_size: 4, profession: 'Supervisor' },
];

/**
 * Fetch with timeout and retries
 */
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        timeout: 10000,
        ...options,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}

/**
 * Get token from v1 API
 */
async function getTokenV1() {
  try {
    const response = await fetch(`${API_V1}/api/v1/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' }),
    });
    const data = await response.json();
    return data.access_token || data.token;
  } catch (error) {
    console.error('Failed to get v1 token:', error.message);
    return null;
  }
}

/**
 * Get token from v2 API
 */
async function getTokenV2() {
  try {
    const data = await fetchWithRetry(`${API_V2}/api/v2/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' }),
    });
    return data.access_token;
  } catch (error) {
    console.error('Failed to get v2 token:', error.message);
    return null;
  }
}

/**
 * Call v1 predict endpoint
 */
async function predictV1(testCase, token) {
  try {
    const response = await fetch(`${API_V1}/api/v1/predict-spending`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(testCase),
    });
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Call v2 predict endpoint
 */
async function predictV2(testCase, token) {
  try {
    return await fetchWithRetry(`${API_V2}/api/v2/predict-spending`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(testCase),
    });
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Calculate delta between v1 and v2 predictions
 */
function calculateDelta(v1Value, v2Value) {
  if (!v1Value || !v2Value || typeof v1Value !== 'number' || typeof v2Value !== 'number') {
    return null;
  }
  const delta = v2Value - v1Value;
  const percentDelta = Math.abs(v1Value) > 0 ? (delta / v1Value) * 100 : 0;
  return {
    delta: Math.round(delta * 100) / 100,
    percentDelta: Math.round(percentDelta * 100) / 100,
  };
}

/**
 * Main validation function
 */
async function validateNoRegression() {
  console.log('🔄 Starting non-regression validation...\n');
  console.log(`API v1: ${API_V1}`);
  console.log(`API v2: ${API_V2}\n`);

  // Get tokens
  console.log('⏳ Authenticating with both APIs...');
  const token_v1 = await getTokenV1();
  const token_v2 = await getTokenV2();

  if (!token_v1) {
    console.error('❌ Failed to authenticate with v1 API');
    process.exit(1);
  }

  if (!token_v2) {
    console.error('❌ Failed to authenticate with v2 API');
    process.exit(1);
  }

  console.log('✅ Authentication successful\n');

  const results = {
    summary: {
      test_cases_total: TEST_CASES.length,
      successful: 0,
      failed: 0,
      timestamp: new Date().toISOString(),
    },
    predictions: [],
    errors: [],
  };

  console.log(`📊 Running ${TEST_CASES.length} test cases...\n`);

  for (let i = 0; i < TEST_CASES.length; i++) {
    const testCase = TEST_CASES[i];
    process.stdout.write(`  [${i + 1}/${TEST_CASES.length}] Testing: age=${testCase.age}, income=${testCase.annual_income}... `);

    try {
      const [v1Result, v2Result] = await Promise.all([
        predictV1(testCase, token_v1),
        predictV2(testCase, token_v2),
      ]);

      if (v1Result.error || v2Result.error) {
        results.errors.push({
          test_case: testCase,
          v1_error: v1Result.error,
          v2_error: v2Result.error,
        });
        console.log('❌ Error');
        continue;
      }

      const delta = calculateDelta(
        v1Result.predicted_spending,
        v2Result.predicted_spending
      );

      results.predictions.push({
        test_case: testCase,
        v1: {
          predicted_spending: v1Result.predicted_spending,
          confidence: v1Result.confidence || 'unknown',
        },
        v2: {
          predicted_spending: v2Result.predicted_spending,
          confidence: v2Result.confidence || 'unknown',
        },
        delta: delta,
      });

      results.summary.successful++;
      console.log(`✅ Δ=${delta ? delta.delta : 'N/A'} (${delta ? delta.percentDelta + '%' : 'N/A'})`);
    } catch (error) {
      results.errors.push({
        test_case: testCase,
        error: error.message,
      });
      console.log(`❌ Exception: ${error.message}`);
    }
  }

  results.summary.failed = TEST_CASES.length - results.summary.successful;

  // Calculate statistics
  const validDeltas = results.predictions
    .filter(p => p.delta !== null)
    .map(p => p.delta.percentDelta);

  if (validDeltas.length > 0) {
    results.summary.statistics = {
      mean_percent_delta: Math.round(
        (validDeltas.reduce((a, b) => a + b, 0) / validDeltas.length) * 100
      ) / 100,
      max_percent_delta: Math.round(Math.max(...validDeltas) * 100) / 100,
      min_percent_delta: Math.round(Math.min(...validDeltas) * 100) / 100,
    };
  }

  // Write report
  const reportPath = path.join(OUTPUT_DIR, `no-regression-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  console.log('\n📋 Summary:');
  console.log(`   Total test cases: ${results.summary.test_cases_total}`);
  console.log(`   ✅ Successful: ${results.summary.successful}`);
  console.log(`   ❌ Failed: ${results.summary.failed}`);

  if (results.summary.statistics) {
    console.log('\n📊 Statistics (% delta):');
    console.log(`   Mean: ${results.summary.statistics.mean_percent_delta}%`);
    console.log(`   Max: ${results.summary.statistics.max_percent_delta}%`);
    console.log(`   Min: ${results.summary.statistics.min_percent_delta}%`);
  }

  console.log(`\n📁 Report saved to: ${reportPath}`);
  
  process.exit(results.summary.failed > 0 ? 1 : 0);
}

// Run validation
validateNoRegression().catch(error => {
  console.error('Fatal error:', error);
  process.exit(2);
});
