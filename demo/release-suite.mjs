/**
 * JsonQL Release Validation Suite
 * 
 * This script verifies that all queries in the demo library compile and 
 * execute successfully against the 50k dataset.
 * 
 * Usage: node demo/release-suite.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initEngine } from '../dist/esm/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Colors for terminal output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

async function runSuite() {
  console.log(`${BOLD}${BLUE}=== JsonQL Release Validation Suite ===${RESET}\n`);

  try {
    // 1. Load Resources
    console.log(`${YELLOW}Loading dataset and query library...${RESET}`);
    const dataset = JSON.parse(fs.readFileSync(path.join(__dirname, 'dataset.json'), 'utf8'));
    const library = JSON.parse(fs.readFileSync(path.join(__dirname, 'queries.json'), 'utf8'));
    
    console.log(`- Dataset: ${dataset.length.toLocaleString()} records`);
    let totalQueries = 0;
    library.forEach(cat => totalQueries += cat.queries.length);
    console.log(`- Library: ${totalQueries} queries in ${library.length} categories\n`);

    // 2. Initialize Engine
    console.log(`${YELLOW}Initializing Engine...${RESET}`);
    const startInit = performance.now();
    const engine = initEngine(dataset, {
      indexes: ['country', 'category', 'active', 'id']
    });
    console.log(`- Engine ready in ${(performance.now() - startInit).toFixed(2)}ms\n`);

    // 3. Execute Tests
    let passed = 0;
    let failed = 0;
    const failures = [];

    for (const category of library) {
      console.log(`${BOLD}${category.category}${RESET}`);
      
      for (const item of category.queries) {
        process.stdout.write(`  Testing: ${item.label.padEnd(30)} `);
        
        try {
          const startSearch = performance.now();
          const result = engine.search(item.query);
          const elapsed = performance.now() - startSearch;
          
          passed++;
          console.log(`${GREEN}PASS${RESET} (${elapsed.toFixed(2)}ms, ${result.total} matches)`);
        } catch (err) {
          failed++;
          console.log(`${RED}FAIL${RESET}`);
          failures.push({
            label: item.label,
            query: item.query,
            error: err.message
          });
        }
      }
      console.log('');
    }

    // 4. Final Report
    console.log(`${BOLD}=== Validation Summary ===${RESET}`);
    console.log(`${GREEN}Passed: ${passed}${RESET}`);
    if (failed > 0) {
      console.log(`${RED}Failed: ${failed}${RESET}\n`);
      console.log(`${BOLD}${RED}Failure Details:${RESET}`);
      failures.forEach((f, i) => {
        console.log(`${i+1}. ${f.label}`);
        console.log(`   Query: ${f.query}`);
        console.log(`   Error: ${RED}${f.error}${RESET}\n`);
      });
      process.exit(1);
    } else {
      console.log(`\n${BOLD}${GREEN}ALL QUERIES PASSED SUCCESSFULY! RELEASE READY.${RESET}`);
      process.exit(0);
    }

  } catch (err) {
    console.error(`${RED}Critical Suite Error:${RESET}`, err);
    process.exit(1);
  }
}

runSuite();
