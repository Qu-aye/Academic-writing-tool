import mongoose from 'mongoose';

let connectionPromise: Promise<typeof mongoose> | null = null;

export function connectDatabase() {
  let mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is required for persistence.');
  }

  // If you're building the URI from separate components (optional improvement)
  // Uncomment this if you prefer to use MONGODB_USER and MONGODB_PASSWORD separately:
  /*
  const user = process.env.MONGODB_USER;
  const password = process.env.MONGODB_PASSWORD;
  const host = process.env.MONGODB_HOST;
  
  if (user && password && host) {
    const encodedUser = encodeURIComponent(user);
    const encodedPassword = encodeURIComponent(password);
    mongoUri = `mongodb+srv://${encodedUser}:${encodedPassword}@${host}/?retryWrites=true&w=majority`;
  }
  */

  connectionPromise ??= mongoose.connect(mongoUri, {
    dbName: process.env.MONGODB_DB_NAME ?? 'sewornaai',
  });

  return connectionPromise;
}
