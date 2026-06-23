import mongoose from 'mongoose';

let connectionPromise: Promise<typeof mongoose> | null = null;

export function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required for persistence.');
  }

  connectionPromise ??= mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB_NAME ?? 'sewornaai',
  });

  return connectionPromise;
}
