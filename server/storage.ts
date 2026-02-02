
import { db } from "./db";
import {
  conversations,
  messages,
  scamReports,
  type Conversation,
  type Message,
  type ScamReport,
  type InsertConversation,
  type InsertMessage,
} from "@shared/schema";
import { eq, desc, asc } from "drizzle-orm";

export interface IStorage {
  // Conversations
  getConversations(): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation>;
  
  // Messages
  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Reports/Intel
  getScamReports(conversationId: number): Promise<ScamReport[]>;
  createScamReport(report: any): Promise<ScamReport>;
  clearConversationMessages(conversationId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getConversations(): Promise<Conversation[]> {
    return await db.select().from(conversations).orderBy(desc(conversations.createdAt));
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db.insert(conversations).values(conversation).returning();
    return newConversation;
  }

  async updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation> {
    const [updated] = await db.update(conversations)
      .set(updates)
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    return await db.select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt)); // Oldest first for chat history
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async getScamReports(conversationId: number): Promise<ScamReport[]> {
    return await db.select()
      .from(scamReports)
      .where(eq(scamReports.conversationId, conversationId));
  }

  async createScamReport(report: any): Promise<ScamReport> {
    const [newReport] = await db.insert(scamReports).values(report).returning();
    return newReport;
  }

  async clearConversationMessages(conversationId: number): Promise<void> {
    await db.delete(messages).where(eq(messages.conversationId, conversationId));
    await db.delete(scamReports).where(eq(scamReports.conversationId, conversationId));
  }
}

export const storage = new DatabaseStorage();
