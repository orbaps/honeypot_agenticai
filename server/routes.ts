
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { generateAgentResponse } from "./agent";
import { analyzeMessageForIntel } from "./scam_detection";
import { generatePDFReport } from "./report";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // === Conversations ===
  app.get(api.conversations.list.path, async (req, res) => {
    const convs = await storage.getConversations();
    res.json(convs);
  });

  app.post(api.conversations.create.path, async (req, res) => {
    const conv = await storage.createConversation({
        title: req.body.title || "New Scam Chat",
        status: "active",
        isAgentActive: true
    });
    res.status(201).json(conv);
  });

  app.get(api.conversations.get.path, async (req, res) => {
    const conv = await storage.getConversation(Number(req.params.id));
    if (!conv) return res.status(404).json({ message: "Conversation not found" });
    res.json(conv);
  });

  app.patch(api.conversations.update.path, async (req, res) => {
    const conv = await storage.updateConversation(Number(req.params.id), req.body);
    res.json(conv);
  });

  app.post(api.conversations.clear.path, async (req, res) => {
    await storage.clearConversationMessages(Number(req.params.id));
    res.json({ success: true });
  });

  // === Messages ===
  app.get(api.messages.list.path, async (req, res) => {
    const msgs = await storage.getMessages(Number(req.params.id));
    res.json(msgs);
  });

  app.post(api.messages.create.path, async (req, res) => {
    const conversationId = Number(req.params.id);
    const { content, sender } = req.body;

    // 1. Save the incoming message
    const newMessage = await storage.createMessage({
      conversationId,
      content,
      sender,
      metadata: {},
    });

    // 2. If message is from 'scammer', run intel detection
    if (sender === 'scammer') {
      const intel = analyzeMessageForIntel(content);
      for (const item of intel) {
        await storage.createScamReport({
            conversationId,
            intelType: item.type,
            intelValue: item.value,
            context: item.context
        });
      }
    }

    // 3. If agent is active and sender is scammer, trigger agent response
    const conversation = await storage.getConversation(conversationId);
    if (conversation?.isAgentActive && sender === 'scammer') {
       // We process this asynchronously so the API returns quickly, 
       // OR we can await it if we want the "typing" delay to be handled by frontend polling.
       // For a demo, let's await it or fire-and-forget. 
       // To ensure the frontend sees it soon, we'll await it but with a small delay simulation inside generateAgentResponse if needed.
       
       // Get recent history for context
       const history = await storage.getMessages(conversationId);
       
       try {
           const agentResponse = await generateAgentResponse(history, conversation);
           
           if (agentResponse) {
               await storage.createMessage({
                   conversationId,
                   sender: 'agent',
                   content: agentResponse.content,
                   metadata: agentResponse.metadata
               });
           }
       } catch (error) {
           console.error("Agent generation failed:", error);
       }
    }

    res.status(201).json(newMessage);
  });

  // === Reports ===
  app.get(api.reports.list.path, async (req, res) => {
    const reports = await storage.getScamReports(Number(req.params.id));
    res.json(reports);
  });

  app.post(api.reports.generate.path, async (req, res) => {
    const conversationId = Number(req.params.id);
    const conversation = await storage.getConversation(conversationId);
    const messages = await storage.getMessages(conversationId);
    const reports = await storage.getScamReports(conversationId);
    
    if (!conversation) return res.status(404).send("Conversation not found");

    const pdfBuffer = await generatePDFReport(conversation, messages, reports);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=scam-report-${conversationId}.pdf`);
    res.send(pdfBuffer);
  });

  // Seed Data (if empty)
  const existingConvs = await storage.getConversations();
  if (existingConvs.length === 0) {
      console.log("Seeding database...");
      const conv = await storage.createConversation({
          title: "Suspected IRS Scam",
          status: "active",
          scamScore: 45,
          isAgentActive: false, // Manual mode first
          scammerName: "+1 (555) 012-3456"
      });
      
      await storage.createMessage({
          conversationId: conv.id,
          sender: "scammer",
          content: "Hello, this is Officer John from the IRS. You have pending tax dues of $5000. Pay immediately or police will come."
      });
      
      await storage.createScamReport({
          conversationId: conv.id,
          intelType: "phone",
          intelValue: "5550123456",
          context: "Caller ID"
      });
  }

  return httpServer;
}
