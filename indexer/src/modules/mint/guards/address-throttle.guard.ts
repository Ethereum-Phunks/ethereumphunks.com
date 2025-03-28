import { Reflector } from '@nestjs/core';
import { Injectable, ExecutionContext, Inject, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModuleOptions, ThrottlerStorage, ThrottlerException } from '@nestjs/throttler';

import { THROTTLER_OPTIONS } from '@nestjs/throttler/dist/throttler.constants';
import { SupabaseService } from '@/services/supabase.service';

const BASE_PENALTY_TIMEOUT = 10 * 1000; // 10 seconds base timeout
const PENALTY_TIMEOUT_INCREMENT = 20 * 1000; // 20 seconds increment

/**
 * Guard that implements rate limiting based on Ethereum addresses.
 * Extends the base ThrottlerGuard to provide address-specific throttling with penalty timeouts.
 * Penalties increase with each violation:
 * 1st: 10s
 * 2nd: 30s (10s + 20s)
 * 3rd: 50s (10s + 40s)
 * 4th: 70s (10s + 60s)
 * etc...
 */
@Injectable()
export class IPThrottlerGuard extends ThrottlerGuard {

  private readonly logger = new Logger(IPThrottlerGuard.name);
  private penaltyTimeouts: Map<string, number> = new Map();
  private violationCounts: Map<string, number> = new Map();
  private lastViolationTime: Map<string, number> = new Map();
  private keyVersion: Map<string, number> = new Map();

  constructor(
    @Inject(THROTTLER_OPTIONS) protected readonly options: ThrottlerModuleOptions,
    protected readonly storageService: ThrottlerStorage,
    protected readonly reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  /**
   * Generates a unique throttle key for the request
   * @param context - The execution context
   * @returns A string key combining IP and version
   */
  protected generateKey(context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection.remoteAddress;
    const version = this.keyVersion.get(ip) || 0;
    const key = `ip-throttle-${ip}-v${version}`;

    this.logger.debug(`Using throttle key: ${key}`);
    return key;
  }

  /**
   * Calculates the penalty duration based on number of violations
   * @param violations - Number of throttling violations
   * @returns Duration of penalty in milliseconds
   */
  private calculatePenaltyDuration(violations: number): number {
    // First violation gets base timeout
    if (violations === 1) return BASE_PENALTY_TIMEOUT;

    // Subsequent violations add PENALTY_TIMEOUT_INCREMENT for each violation after the first
    // violations = 2: BASE + (1 * INCREMENT)
    // violations = 3: BASE + (2 * INCREMENT)
    // violations = 4: BASE + (3 * INCREMENT)
    const additionalTime = (violations - 1) * PENALTY_TIMEOUT_INCREMENT;
    return BASE_PENALTY_TIMEOUT + additionalTime;
  }

  /**
   * Determines if a request can proceed based on throttling rules
   * @param context - The execution context
   * @returns True if request can proceed, throws exception otherwise
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection.remoteAddress;
    const response = context.switchToHttp().getResponse();

    if (this.isInPenaltyTimeout(ip)) {
      const timeLeft = this.getPenaltyTimeLeft(ip);
      response.header('Retry-After', String(Math.ceil(timeLeft / 1000)));
      const violations = this.violationCounts.get(ip) || 0;

      this.logger.warn(`⛔ PENALTY ACTIVE: IP ${ip} is in penalty timeout for ${Math.ceil(timeLeft / 1000)} more seconds (Violation count: ${violations})`);

      throw new HttpException({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'Too Many Requests',
        message: `You have exceeded the rate limit and are in a penalty timeout. Please wait ${Math.ceil(timeLeft / 1000)} seconds before trying again.`,
        ip: ip,
        retryAfter: Math.ceil(timeLeft / 1000),
        penaltyTimeout: true,
        violations: violations
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    try {
      const result = await super.canActivate(context);
      return result;
    } catch (error) {
      if (error instanceof ThrottlerException) {
        this.logger.warn(`⛔ RATE LIMIT EXCEEDED: IP ${ip} exceeded limit`);

        const now = Date.now();
        const lastViolationTime = this.lastViolationTime.get(ip) || 0;
        const timeSinceLastViolation = now - lastViolationTime;

        // Reset violation count if it's been more than 5 minutes since last violation
        if (timeSinceLastViolation > 5 * 60 * 1000) {
          this.violationCounts.delete(ip);
        }

        const violations = (this.violationCounts.get(ip) || 0) + 1;
        this.violationCounts.set(ip, violations);
        this.lastViolationTime.set(ip, now);

        const penaltyDuration = this.calculatePenaltyDuration(violations);

        this.logger.debug(`Applying ${penaltyDuration/1000} second timeout for violation #${violations} (linear increase)`);
        this.applyPenaltyTimeout(ip, penaltyDuration);

        const retryAfterSeconds = Math.ceil(penaltyDuration / 1000);
        response.header('Retry-After', String(retryAfterSeconds));

        throw new HttpException({
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. You have been placed in a ${retryAfterSeconds} second timeout (Violation #${violations}).`,
          ip: ip,
          retryAfter: retryAfterSeconds,
          penaltyTimeout: true,
          violations: violations
        }, HttpStatus.TOO_MANY_REQUESTS);
      }

      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Unexpected error in throttling:', error);
      this.applyPenaltyTimeout(ip, BASE_PENALTY_TIMEOUT);

      const retryAfterSeconds = Math.ceil(BASE_PENALTY_TIMEOUT / 1000);
      response.header('Retry-After', String(retryAfterSeconds));

      throw new HttpException({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'Too Many Requests',
        message: `Rate limit exceeded. You have been placed in a ${retryAfterSeconds} second timeout.`,
        ip: ip,
        retryAfter: retryAfterSeconds,
        penaltyTimeout: true,
        violations: 1
      }, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  /**
   * Applies a penalty timeout for an address
   * @param ip - The IP address to penalize
   * @param duration - Duration of the penalty in milliseconds
   */
  private applyPenaltyTimeout(ip: string, duration: number): void {
    const expiryTime = Date.now() + duration;
    this.penaltyTimeouts.set(ip, expiryTime);

    this.logger.debug(
      `Applied penalty timeout for ip ${ip} until ${new Date(expiryTime).toISOString()} ` +
      `(Violation count: ${this.violationCounts.get(ip)}, Duration: ${Math.ceil(duration / 1000)}s)`
    );

    setTimeout(() => {
      this.penaltyTimeouts.delete(ip);
      // Increment the key version to force a new throttle key after penalty
      const version = (this.keyVersion.get(ip) || 0) + 1;
      this.keyVersion.set(ip, version);
      this.logger.debug(`Penalty timeout for ip ${ip} has expired - using new throttle key version ${version}`);
    }, duration);
  }

  /**
   * Checks if an address is currently in penalty timeout
   * @param ip - The IP address to check
   * @returns True if address is in timeout, false otherwise
   */
  private isInPenaltyTimeout(ip: string): boolean {
    if (!this.penaltyTimeouts.has(ip)) {
      return false;
    }

    const expiryTime = this.penaltyTimeouts.get(ip);
    const now = Date.now();

    if (now >= expiryTime) {
      this.penaltyTimeouts.delete(ip);
      return false;
    }

    return true;
  }

  /**
   * Gets remaining penalty timeout duration for an address
   * @param ip - The IP address to check
   * @returns Remaining timeout in milliseconds
   */
  private getPenaltyTimeLeft(ip: string): number {
    if (!this.penaltyTimeouts.has(ip)) {
      return 0;
    }

    const expiryTime = this.penaltyTimeouts.get(ip);
    const now = Date.now();

    return Math.max(0, expiryTime - now);
  }
}
