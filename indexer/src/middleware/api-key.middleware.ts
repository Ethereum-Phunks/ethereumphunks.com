import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {

  /**
   * Middleware function to validate the API key in the request headers.
   * If the API key is invalid, it sends a 401 Unauthorized response with a JSON message.
   * Otherwise, it calls the next middleware in the chain.
   * @param req - The Express request object.
   * @param res - The Express response object.
   * @param next - The next middleware function.
   */
  use(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey !== process.env.API_PRIVATE_KEY) {
      res.status(401).json({ message: 'Invalid API key' });
      return;
    }
    next();
  }
}
