import type { NextFunction, Request, Response } from 'express';

export async function requireSearchEntitlement(
  _request: Request,
  _response: Response,
  next: NextFunction,
) {
  next();
}
