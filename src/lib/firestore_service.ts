import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { UserProfile, MemoryItem, Message } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Standardized error handler mandated by Firebase Integration specification
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('[Firestore Error]', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ==========================================
// User Profile Persistence
// ==========================================

export async function saveUserProfileToFirestore(user: UserProfile): Promise<void> {
  const userId = auth.currentUser?.uid || user.email.replace(/[.@]/g, '_');
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        uid: auth.currentUser?.uid || userId,
        email: user.email.trim().toLowerCase(),
        name: user.name || '',
        displayName: user.name || '',
        avatar: user.avatar || '',
        photoURL: user.avatar || '',
        role: user.role || 'Member',
        plan: user.plan || 'Free Plan',
        isAdmin: Boolean(user.isAdmin),
        isPro: Boolean(user.isPro),
        age: user.age || '25',
        dob: user.dob || '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getUserProfileFromFirestore(userId: string): Promise<Partial<UserProfile> | null> {
  const path = `users/${userId}`;
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data() as Partial<UserProfile>;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// ==========================================
// Memories Persistence
// ==========================================

export async function saveMemoryToFirestore(userId: string, memory: MemoryItem): Promise<void> {
  const memoryId = memory.id || `mem_${Date.now()}`;
  const path = `memories/${memoryId}`;
  try {
    await setDoc(doc(db, 'memories', memoryId), {
      id: memoryId,
      userId: auth.currentUser?.uid || userId,
      title: memory.title || 'Untitled Memory',
      content: memory.content || '',
      category: memory.category || 'general',
      tags: memory.tags || [],
      timestamp: memory.timestamp || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getMemoriesFromFirestore(userId: string): Promise<MemoryItem[]> {
  const path = 'memories';
  try {
    const uid = auth.currentUser?.uid || userId;
    const q = query(collection(db, 'memories'), where('userId', '==', uid));
    const snapshot = await getDocs(q);
    const results: MemoryItem[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      results.push({
        id: data.id || d.id,
        title: data.title || '',
        detail: data.detail || data.content || '',
        category: data.category || 'general',
        content: data.content || data.detail || '',
        color: 'secondary',
        tags: data.tags || [],
        timestamp: data.timestamp || 'Just now',
      });
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function deleteMemoryFromFirestore(memoryId: string): Promise<void> {
  const path = `memories/${memoryId}`;
  try {
    await deleteDoc(doc(db, 'memories', memoryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// Projects / Artifacts Persistence
// ==========================================

export async function saveProjectArtifactToFirestore(userId: string, project: {
  id: string;
  title: string;
  description: string;
  status: string;
}): Promise<void> {
  const path = `projects/${project.id}`;
  try {
    await setDoc(doc(db, 'projects', project.id), {
      id: project.id,
      userId: auth.currentUser?.uid || userId,
      title: project.title,
      description: project.description,
      status: project.status || 'active',
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// Chat Messages Persistence
// ==========================================

export async function saveChatMessageToFirestore(
  userId: string,
  sessionId: string,
  message: Message
): Promise<void> {
  const path = `chat_sessions/${sessionId}/messages/${message.id}`;
  try {
    const msgRef = doc(db, 'chat_sessions', sessionId, 'messages', message.id);
    await setDoc(msgRef, {
      id: message.id,
      userId: auth.currentUser?.uid || userId,
      sessionId,
      sender: message.sender,
      content: message.content,
      timestamp: message.timestamp,
      modelsConsensus: message.modelsConsensus || [],
      latency: message.latency || 0,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToMemories(
  userId: string,
  onUpdate: (memories: MemoryItem[]) => void,
  onError?: (err: Error) => void
) {
  const path = 'memories';
  const uid = auth.currentUser?.uid || userId;
  const q = query(collection(db, 'memories'), where('userId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: MemoryItem[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        items.push({
          id: data.id || d.id,
          title: data.title || '',
          detail: data.detail || data.content || '',
          category: data.category || 'general',
          content: data.content || data.detail || '',
          color: 'secondary',
          tags: data.tags || [],
          timestamp: data.timestamp || 'Just now',
        });
      });
      onUpdate(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (err: any) {
        onError?.(err);
      }
    }
  );
}
