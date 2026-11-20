import mongoose from "mongoose";

/**
 * One cached Mongoose connection.
 * In development Next.js hot-reloads modules, which would open a new connection on
 * every save. Caching the promise on `globalThis` keeps exactly one connection alive.
 */
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const g = globalThis as unknown as { _mongoose?: Cache };
const cache: Cache = g._mongoose ?? { conn: null, promise: null };
g._mongoose = cache;

export async function dbConnect(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.");
  if (!cache.promise) {
    mongoose.set("strictQuery", true);
    cache.promise = mongoose.connect(uri, { bufferCommands: false, serverSelectionTimeoutMS: 8000 });
  }
  try {
    cache.conn = await cache.promise;
  } catch (e) {
    cache.promise = null;
    throw e;
  }
  return cache.conn;
}

/**
 * Runs `fn` inside a MongoDB transaction when the server supports it (Atlas / replica set).
 * A plain local `mongod` is a standalone server and cannot run transactions, so we fall
 * back to running without a session. Callers use conditional atomic updates
 * (e.g. `quantityAvailable: { $gte: qty }`) and manual rollback so they stay safe either way.
 */
export async function withOptionalTransaction<T>(
  fn: (session: mongoose.ClientSession | null) => Promise<T>,
): Promise<T> {
  await dbConnect();
  const session = await mongoose.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result as T;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/replica set|Transaction numbers|transactions are not supported/i.test(msg)) {
      return fn(null);
    }
    throw e;
  } finally {
    await session.endSession();
  }
}
