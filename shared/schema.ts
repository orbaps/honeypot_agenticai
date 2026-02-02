
import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default("New Conversation"),
  scammerName: text("scammer_name"),
  status: text("status").notNull().default("active"), // active, archived
  scamScore: integer("scam_score").default(0),
  isAgentActive: boolean("is_agent_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  sender: text("sender").notNull(), // 'scammer' | 'agent' | 'system'
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // { emotion: string, reasoning: string, extracted_info: any[] }
  createdAt: timestamp("created_at").defaultNow(),
});

export const scamReports = pgTable("scam_reports", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  intelType: text("intel_type").notNull(), // 'upi', 'bank_account', 'phone', 'url', 'crypto_wallet'
  intelValue: text("intel_value").notNull(),
  context: text("context"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod Schemas
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertScamReportSchema = createInsertSchema(scamReports).omit({ id: true, createdAt: true });

export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type ScamReport = typeof scamReports.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type CreateMessageRequest = {
  conversationId: number;
  content: string;
  sender: 'scammer' | 'agent'; // Only allow these for manual creation
};

export type AgentState = {
  emotion: string;
  reasoning: string;
  nextAction: string;
};
