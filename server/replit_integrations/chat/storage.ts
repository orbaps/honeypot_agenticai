import { db } from "../../db";
import { conversations, messages } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IChatStorage {
  getConversation(id: number): Promise<typeof conversations.$inferSelect | undefined>;
  getAllConversations(): Promise<(typeof conversations.$inferSelect)[]>;
  createConversation(title: string): Promise<typeof conversations.$inferSelect>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<(typeof messages.$inferSelect)[]>;
  createMessage(conversationId: number, sender: string, content: string): Promise<typeof messages.$inferSelect>;
}

// NOTE: This Replit integration is not used in production deployments
// It's kept for compatibility but will throw errors if called without a database
export const chatStorage: IChatStorage = {
  async getConversation(id: number) {
    if (!db) throw new Error("Database not initialized - set DATABASE_URL");
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  },

  async getAllConversations() {
    if (!db) throw new Error("Database not initialized - set DATABASE_URL");
    return db.select().from(conversations).orderBy(desc(conversations.createdAt));
  },

  async createConversation(title: string) {
    if (!db) throw new Error("Database not initialized - set DATABASE_URL");
    const [conversation] = await db.insert(conversations).values({ title }).returning();
    return conversation;
  },

  async deleteConversation(id: number) {
    if (!db) throw new Error("Database not initialized - set DATABASE_URL");
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
  },

  async getMessagesByConversation(conversationId: number) {
    if (!db) throw new Error("Database not initialized - set DATABASE_URL");
    return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  },

  async createMessage(conversationId: number, sender: string, content: string) {
    if (!db) throw new Error("Database not initialized - set DATABASE_URL");
    const [message] = await db.insert(messages).values({ conversationId, sender, content }).returning();
    return message;
  },
};
