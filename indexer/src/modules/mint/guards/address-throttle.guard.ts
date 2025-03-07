import { Injectable, ExecutionContext, Inject, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModuleOptions, ThrottlerStorage, ThrottlerException } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { THROTTLER_OPTIONS } from '@nestjs/throttler/dist/throttler.constants';

const PENALTY_TIMEOUT = 60000; // 1 minute

/**
 * Guard that implements rate limiting based on Ethereum addresses.
 * Extends the base ThrottlerGuard to provide address-specific throttling with penalty timeouts.
 */
@Injectable()
export class AddressThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(AddressThrottlerGuard.name);
  // Store addresses that are in penalty timeout
  private penaltyTimeouts: Map<string, number> = new Map();

  constructor(
    @Inject(THROTTLER_OPTIONS) protected readonly options: ThrottlerModuleOptions,
    protected readonly storageService: ThrottlerStorage,
    protected readonly reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  /**
   * Generates a unique throttling key for each request based on the Ethereum address.
   * This overrides the default IP-based throttling to use address-based throttling instead.
   *
   * @param context - The execution context containing the request
   * @returns A unique string key combining a prefix and the lowercase Ethereum address
   */
  protected getKeyForRequest(context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest();
    const address = request.query?.address?.toLowerCase() || 'anonymous';

    // Create a unique key that includes the address
    const key = `address-throttle-${address}`;
    this.logger.debug(`Using throttle key: ${key}`);

    return key;
  }

  /**
   * Main guard method that checks if a request should be allowed through based on rate limits
   * and penalty timeouts. Implements sophisticated error handling and logging.
   *
   * @param context - The execution context containing request and response
   * @returns A promise resolving to true if the request is allowed, throws an exception otherwise
   * @throws HttpException when rate limits are exceeded or during penalty timeout
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get the request and extract the address
    const request = context.switchToHttp().getRequest();
    const address = request.query?.address?.toLowerCase() || 'anonymous';
    const response = context.switchToHttp().getResponse();

    // Check if the address is in penalty timeout
    if (this.isInPenaltyTimeout(address)) {
      const timeLeft = this.getPenaltyTimeLeft(address);

      // Set the Retry-After header (in seconds)
      response.header('Retry-After', String(Math.ceil(timeLeft / 1000)));

      // Use WARN level to ensure it's visible in logs
      this.logger.warn(`⛔ PENALTY ACTIVE: Address ${address} is in penalty timeout for ${Math.ceil(timeLeft / 1000)} more seconds`);

      // Throw an exception to stop the request flow
      throw new HttpException({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'Too Many Requests',
        message: `You have exceeded the rate limit and are in a penalty timeout. Please wait ${Math.ceil(timeLeft / 1000)} seconds before trying again.`,
        address: address,
        retryAfter: Math.ceil(timeLeft / 1000),
        penaltyTimeout: true
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    // Get the throttler options for this request
    const { limit, ttl } = this.getThrottlerOptions(context);
    this.logger.debug(`Throttle check for address: ${address} with limit: ${limit}, ttl: ${ttl}ms`);

    try {
      // Use a try-catch to intercept ThrottlerException before it's handled by NestJS
      try {
        // Call the parent's canActivate method
        return await super.canActivate(context);
      } catch (throttlerError) {
        if (throttlerError instanceof ThrottlerException) {
          // Log the rate limit exceeded with WARN level
          this.logger.warn(`⛔ RATE LIMIT EXCEEDED: Address ${address} exceeded limit of ${limit} requests per ${ttl/1000} seconds`);

          // Apply the penalty timeout
          this.applyPenaltyTimeout(address, PENALTY_TIMEOUT);

          // Log the penalty application
          this.logger.warn(`⛔ PENALTY APPLIED: Address ${address} placed in ${PENALTY_TIMEOUT/1000} second penalty timeout`);

          // Set the Retry-After header (in seconds)
          const retryAfterSeconds = PENALTY_TIMEOUT / 1000;
          response.header('Retry-After', String(retryAfterSeconds));

          // Throw an exception to stop the request flow
          throw new HttpException({
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            error: 'Too Many Requests',
            message: `Rate limit exceeded. You have been placed in a 1 minute penalty timeout.`,
            address: address,
            retryAfter: retryAfterSeconds,
            penaltyTimeout: true
          }, HttpStatus.TOO_MANY_REQUESTS);
        }
        // Re-throw other errors
        throw throttlerError;
      }
    } catch (error) {
      if (error instanceof HttpException) {
        // Re-throw our custom HttpExceptions
        throw error;
      }

      // For unexpected errors, log them and apply a penalty
      this.logger.error('Unexpected error in throttling:', error);

      // Apply the penalty timeout
      this.applyPenaltyTimeout(address, PENALTY_TIMEOUT);

      // Set the Retry-After header (in seconds)
      const retryAfterSeconds = PENALTY_TIMEOUT / 1000;
      response.header('Retry-After', String(retryAfterSeconds));

      // Throw an exception to stop the request flow
      throw new HttpException({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'Too Many Requests',
        message: `Rate limit exceeded. You have been placed in a 1 minute penalty timeout.`,
        address: address,
        retryAfter: retryAfterSeconds,
        penaltyTimeout: true
      }, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  /**
   * Applies a penalty timeout to a specific address for a given duration.
   * Sets up automatic cleanup of the penalty after it expires.
   *
   * @param address - The Ethereum address to apply the penalty to
   * @param duration - The duration of the penalty in milliseconds
   */
  private applyPenaltyTimeout(address: string, duration: number): void {
    const expiryTime = Date.now() + duration;
    this.penaltyTimeouts.set(address, expiryTime);
    this.logger.debug(`Applied penalty timeout for address ${address} until ${new Date(expiryTime).toISOString()}`);

    // Set a timeout to remove the penalty after it expires
    setTimeout(() => {
      this.penaltyTimeouts.delete(address);
      this.logger.debug(`Penalty timeout for address ${address} has expired`);
    }, duration);
  }

  /**
   * Checks if an address is currently under a penalty timeout.
   * Automatically cleans up expired penalties.
   *
   * @param address - The Ethereum address to check
   * @returns True if the address is under an active penalty timeout, false otherwise
   */
  private isInPenaltyTimeout(address: string): boolean {
    if (!this.penaltyTimeouts.has(address)) {
      return false;
    }

    const expiryTime = this.penaltyTimeouts.get(address);
    const now = Date.now();

    // If the penalty has expired, remove it
    if (now >= expiryTime) {
      this.penaltyTimeouts.delete(address);
      return false;
    }

    return true;
  }

  /**
   * Calculates the remaining time in milliseconds for an address's penalty timeout.
   *
   * @param address - The Ethereum address to check
   * @returns The number of milliseconds remaining in the penalty timeout, or 0 if no timeout exists
   */
  private getPenaltyTimeLeft(address: string): number {
    if (!this.penaltyTimeouts.has(address)) {
      return 0;
    }

    const expiryTime = this.penaltyTimeouts.get(address);
    const now = Date.now();

    return Math.max(0, expiryTime - now);
  }

  /**
   * Retrieves throttling configuration options from the execution context.
   * Falls back to default values if no specific configuration is found.
   *
   * @param context - The execution context to extract options from
   * @returns An object containing the limit and ttl (time-to-live) values for throttling
   */
  private getThrottlerOptions(context: ExecutionContext): { limit: number; ttl: number } {
    try {
      // Get the throttler options from the handler metadata
      const handler = context.getHandler();
      const classRef = context.getClass();

      // Try to get the throttler options from the handler or class metadata
      // Default to 5 requests per 60 seconds if not found
      const throttlers = this.reflector.getAllAndOverride('throttlers', [
        handler,
        classRef,
      ]) || [];

      // Find the address throttler or use the first one
      const throttler = throttlers.find(t => t.name === 'address') || throttlers[0] || { limit: 5, ttl: 60000 };

      return { limit: throttler.limit, ttl: throttler.ttl };
    } catch (error) {
      this.logger.error('Error getting throttler options:', error);
      // Default values if we can't get the options
      return { limit: 5, ttl: 60000 };
    }
  }
}
