import { NoteItem, UserProfile } from '../types.js';

export const initialUserProfile: UserProfile = {
  name: 'Sayyed Muhammad Ali',
  role: 'Software & Hardware Engineer',
  plan: 'Executive Pro Plan',
  avatar: 'MA',
};

// Start with empty notes as requested by user ("in the memory remove everything")
export const initialNotes: NoteItem[] = [];

class MemoryStore {
  private notes: NoteItem[] = [...initialNotes];
  private userProfile: UserProfile = { ...initialUserProfile };

  public getNotes(): NoteItem[] {
    return this.notes;
  }

  // Alias for backward compatibility
  public getMemories(): NoteItem[] {
    return this.notes;
  }

  public getProfile(): UserProfile {
    return this.userProfile;
  }

  public updateProfile(updated: Partial<UserProfile>): UserProfile {
    this.userProfile = { ...this.userProfile, ...updated };
    return this.userProfile;
  }

  public addNote(item: { title?: string; content?: string; category?: NoteItem['category']; tags?: string[]; isPinned?: boolean }): NoteItem {
    const newNote: NoteItem = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: item.title || 'Untitled Note',
      content: item.content || '',
      category: item.category || 'General',
      tags: item.tags || [],
      isPinned: item.isPinned || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.notes.unshift(newNote);
    return newNote;
  }

  // Alias
  public addMemory(item: any): NoteItem {
    return this.addNote({
      title: item.key || item.title || 'Untitled Note',
      content: item.value || item.content || '',
      category: item.category || 'General',
      tags: item.tags || [],
    });
  }

  public updateNote(id: string, updates: Partial<NoteItem>): NoteItem | null {
    const idx = this.notes.findIndex((n) => n.id === id);
    if (idx === -1) return null;
    this.notes[idx] = {
      ...this.notes[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.notes[idx];
  }

  public deleteNote(id: string): boolean {
    const lenBefore = this.notes.length;
    this.notes = this.notes.filter((n) => n.id !== id);
    return this.notes.length < lenBefore;
  }

  // Alias
  public deleteMemory(id: string): boolean {
    return this.deleteNote(id);
  }

  public searchNotes(query: string): NoteItem[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.notes;
    return this.notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  public getContextString(): string {
    if (this.notes.length === 0) return 'No saved notes in Notepad.';
    return this.notes
      .map((n) => `- [${n.category || 'NOTE'}] ${n.title}: ${n.content}`)
      .join('\n');
  }
}

export const memoryStore = new MemoryStore();
