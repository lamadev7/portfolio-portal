import { MongoClient, type Db } from "mongodb";

declare global {
  // Reused across hot reloads in dev so each edit doesn't open a new connection pool.
  var __mongoClient: Promise<MongoClient> | undefined;
}

export function hasDatabase(): boolean {
  return Boolean(process.env.MONGODB_URI);
}

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (!globalThis.__mongoClient) {
    globalThis.__mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 })
      .connect()
      .catch((err: unknown) => {
        globalThis.__mongoClient = undefined;
        throw err;
      });
  }
  const client = await globalThis.__mongoClient;
  return client.db(process.env.MONGODB_DB || "portfolio");
}
