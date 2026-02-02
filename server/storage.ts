
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

// Database-backed storage
export class DatabaseStorage implements IStorage {
  async getConversations(): Promise<Conversation[]> {
    if (!db) throw new Error("Database not initialized");
    return await db.select().from(conversations).orderBy(desc(conversations.createdAt));
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    if (!db) throw new Error("Database not initialized");
    const [newConversation] = await db.insert(conversations).values(conversation).returning();
    return newConversation;
  }

  async updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation> {
    if (!db) throw new Error("Database not initialized");
    const [updated] = await db.update(conversations)
      .set(updates)
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    if (!db) throw new Error("Database not initialized");
    return await db.select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    if (!db) throw new Error("Database not initialized");
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async getScamReports(conversationId: number): Promise<ScamReport[]> {
    if (!db) throw new Error("Database not initialized");
    return await db.select()
      .from(scamReports)
      .where(eq(scamReports.conversationId, conversationId));
  }

  async createScamReport(report: any): Promise<ScamReport> {
    if (!db) throw new Error("Database not initialized");
    const [newReport] = await db.insert(scamReports).values(report).returning();
    return newReport;
  }

  async clearConversationMessages(conversationId: number): Promise<void> {
    if (!db) throw new Error("Database not initialized");
    await db.delete(messages).where(eq(messages.conversationId, conversationId));
    await db.delete(scamReports).where(eq(scamReports.conversationId, conversationId));
  }
}

// In-memory storage (fallback when no database)
export class InMemoryStorage implements IStorage {
  private conversations: Map<number, Conversation> = new Map();
  private messages: Map<number, Message[]> = new Map();
  private scamReports: Map<number, ScamReport[]> = new Map();
  private nextConvId = 1;
  private nextMsgId = 1;
  private nextReportId = 1;

  async getConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const newConv: Conversation = {
      id: this.nextConvId++,
      title: conversation.title || "New Conversation",
      scammerName: conversation.scammerName || null,
      status: conversation.status || "active",
      scamScore: conversation.scamScore || null,
      isAgentActive: conversation.isAgentActive ?? true,
      createdAt: new Date(),
    };
    this.conversations.set(newConv.id, newConv);
    return newConv;
  }

  async updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation> {
    const existing = this.conversations.get(id);
    if (!existing) throw new Error("Conversation not found");
    const updated = { ...existing, ...updates };
    this.conversations.set(id, updated);
    return updated;
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    return this.messages.get(conversationId) || [];
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const newMsg: Message = {
      id: this.nextMsgId++,
      conversationId: message.conversationId,
      sender: message.sender,
      content: message.content,
      metadata: message.metadata || null,
      createdAt: new Date(),
    };

    const convMsgs = this.messages.get(message.conversationId) || [];
    convMsgs.push(newMsg);
    this.messages.set(message.conversationId, convMsgs);

    return newMsg;
  }

  async getScamReports(conversationId: number): Promise<ScamReport[]> {
    return this.scamReports.get(conversationId) || [];
  }

  async createScamReport(report: any): Promise<ScamReport> {
    const newReport: ScamReport = {
      id: this.nextReportId++,
      ...report,
      createdAt: new Date(),
    };

    const convReports = this.scamReports.get(report.conversationId) || [];
    convReports.push(newReport);
    this.scamReports.set(report.conversationId, convReports);

    return newReport;
  }

  async clearConversationMessages(conversationId: number): Promise<void> {
    this.messages.delete(conversationId);
    this.scamReports.delete(conversationId);
  }
}

// Auto-select storage based on database availability
export const storage: IStorage = db
  ? new DatabaseStorage()
  : new InMemoryStorage();

if (db) {
  console.log("✅ Using DatabaseStorage");
} else {
  console.log("✅ Using InMemoryStorage");
}
