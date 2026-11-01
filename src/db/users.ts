import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, name?: string, role?: string) {
  const result = await db.insert(users)
    .values({
      uid,
      email,
      name,
      role,
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email,
        ...(name ? { name } : {}),
        ...(role ? { role } : {}),
      },
    })
    .returning();

  return result[0];
}
