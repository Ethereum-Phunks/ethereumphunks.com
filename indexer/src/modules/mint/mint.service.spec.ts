// indexer/src/modules/mint/mint.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { MintService } from './mint.service';

const ITERATIONS = 100_000;
const BUCKETS = 10_000;

describe('MintService', () => {
  let service: MintService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MintService],
    }).compile();

    service = module.get<MintService>(MintService);
  });

  it('should generate numbers between 0 and 9999 with good distribution', async () => {
    const iterations = ITERATIONS;
    const buckets = new Array(BUCKETS).fill(0);
    const results = new Set<number>();

    // Run the random function many times
    for (let i = 0; i < iterations; i++) {
      const result = await service.getRandom('test-slug', 'test-address');
      buckets[result.random]++;
      results.add(result.random);
    }

    const maxValue = Math.max(...Array.from(results));
    const minValue = Math.min(...Array.from(results));
    const expectedPerBucket = iterations / BUCKETS;
    const tolerance = expectedPerBucket * 0.5; // Allow 50% deviation
    const outOfRangeBuckets = buckets.filter(
      count => count < (expectedPerBucket - tolerance) || count > (expectedPerBucket + tolerance)
    ).length;
    const coverage = results.size / BUCKETS;

    // Log statistics before assertions
    console.log({
      totalIterations: iterations,
      uniqueValues: results.size,
      coverage: `${(coverage * 100).toFixed(2)}%`,
      minValue,
      maxValue,
      averageHitsPerBucket: iterations / BUCKETS,
      outOfRangeBuckets,
      outOfRangeBucketsPercentage: `${((outOfRangeBuckets / BUCKETS) * 100).toFixed(2)}%`,
      tolerance: `±${(tolerance / expectedPerBucket * 100).toFixed(2)}%`,
      expectedPerBucket: expectedPerBucket
    });

    // Test 1: Check range
    expect(maxValue).toBeLessThan(10000);
    expect(minValue).toBeGreaterThanOrEqual(0);

    // Test 2: Check distribution
    expect(outOfRangeBuckets / BUCKETS).toBeLessThan(0.1);

    // Test 3: Check coverage
    expect(coverage).toBeGreaterThan(0.9);
  });
});
