
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { generateAgentResponse } from "./agent";
import { analyzeMessageForIntel } from "./scam_detection";
import { generatePDFReport } from "./report";
import { getOrCreateSession } from "./sessions";


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
    // ========================================================================
    // PHASE 2.1: ENFORCE conversation_id VALIDATION
    // ========================================================================
    const { conversation_id, content, sender, apiKey } = req.body;

    // Validate conversation_id
    if (!conversation_id) {
      return res.status(400).json({
        error: "conversation_id is required"
      });
    }

    // Validate message content
    if (!content || typeof content !== "string") {
      return res.status(400).json({
        error: "message is required"
      });
    }

    // Use conversation_id from body (phase 2.1 requirement) or fallback to URL param
    const conversationId = Number(conversation_id) || Number(req.params.id);

    // ========================================================================
    // PHASE 2.2: ATTACH SESSION STORE
    // ========================================================================
    const session = getOrCreateSession(conversation_id);
    console.log("📦 Active session:", session.conversation_id, "| has_initiated:", session.agent_state.has_initiated);


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

        // PHASE 2.6: Sync to session extracted_intel
        const type = item.type?.toLowerCase() || "";
        if (type.includes("upi") && !session.extracted_intel.upi_ids.includes(item.value)) {
          session.extracted_intel.upi_ids.push(item.value);
          console.log(`📊 [Session Intel] Added UPI: ${item.value}`);
        }
        if ((type.includes("bank") || type.includes("account")) && !session.extracted_intel.bank_accounts.includes(item.value)) {
          session.extracted_intel.bank_accounts.push(item.value);
          console.log(`📊 [Session Intel] Added Bank: ${item.value}`);
        }
        if ((type.includes("link") || type.includes("url")) && !session.extracted_intel.phishing_links.includes(item.value)) {
          session.extracted_intel.phishing_links.push(item.value);
          console.log(`📊 [Session Intel] Added Link: ${item.value}`);
        }
        if (type.includes("phone") && !session.extracted_intel.phone_numbers.includes(item.value)) {
          session.extracted_intel.phone_numbers.push(item.value);
          console.log(`📊 [Session Intel] Added Phone: ${item.value}`);
        }
      }
    }

    // 3. Trigger word detection & Handoff logic
    const TRIGGER_WORDS = ['bank', 'upi', 'payment', 'amount', 'ifsc', 'code', 'id', 'account', 'transfer', 'send', 'money'];
    const messageText = content?.toLowerCase() || '';
    const hasTriggerWord = TRIGGER_WORDS.some(word => messageText.includes(word));

    const conversation = await storage.getConversation(conversationId);

    // Track if this is a fresh handoff (API key OR trigger word)
    const wasJustActivated = (
      (apiKey === "DEMO_KEY" && !conversation?.isAgentActive) ||  // Manual handoff
      (hasTriggerWord && !conversation?.isAgentActive && sender === 'scammer')  // Auto-activate
    );

    // Auto-activate if handoff is initiated
    if (wasJustActivated) {
      await storage.updateConversation(conversationId, { isAgentActive: true });
      console.log(`🤖 Agent activated ${apiKey === "DEMO_KEY" ? 'via API key' : `via trigger word in "${content}"`}`);
    }

    const updatedConversation = await storage.getConversation(conversationId);

    // 5. Agent turn control logic
    // Agent should respond in two cases:
    // a) Fresh handoff → agent initiates the conversation
    // b) Agent is active and scammer sent a message → agent responds
    // PHASE 2.8.3: Check if session is still active
    // Note: We DON'T block with hardcoded messages (national summit requirement)
    // Instead, agent will continue to respond via LLM in EXIT state
    const shouldAgentRespond = updatedConversation?.isAgentActive && (
      wasJustActivated ||  // Fresh handoff = agent initiates
      sender === 'scammer'  // Scammer message = agent responds
    );


    if (shouldAgentRespond) {
      const history = await storage.getMessages(conversationId);

      console.log(`🤖 Calling LLM agent (session-aware, initiated: ${session.agent_state.has_initiated})...`);

      try {
        // PHASE 2.3: Pass session to agent
        const agentResponse = await generateAgentResponse(
          history,
          updatedConversation,
          session  // Session replaces isInitiating flag
        );

        if (agentResponse) {
          // Save agent message
          await storage.createMessage({
            conversationId,
            sender: 'agent',
            content: agentResponse.content,
            metadata: agentResponse.metadata
          });

          // PHASE 2.4, 2.5, 2.7: Update session state
          if (agentResponse.session_updates) {
            session.agent_state.has_initiated = agentResponse.session_updates.has_initiated;
            session.agent_state.current_goal = agentResponse.session_updates.current_goal;
            session.agent_state.last_reply = agentResponse.session_updates.last_reply;

            // PHASE 2.8: Mark session inactive if exit
            if (agentResponse.session_updates.should_exit) {
              session.is_active = false;
              await storage.updateConversation(conversationId, { isAgentActive: false });
              console.log(`🛑 Session ${session.conversation_id} marked inactive (EXIT_SAFELY)`);
            }

            console.log(`✅ Session updated: goal=${session.agent_state.current_goal}, has_initiated=${session.agent_state.has_initiated}`);
          }

          console.log(`✅ Agent responded: "${agentResponse.content.substring(0, 50)}..."`);
        }
      } catch (error) {
        console.error("❌ AGENT FAILED:", error);
        console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);
        console.error("Error message:", error instanceof Error ? error.message : String(error));
        console.error("Stack trace:", error instanceof Error ? error.stack : 'No stack');

        // Create error message so user can see the failure
        await storage.createMessage({
          conversationId,
          sender: 'agent',
          content: `[AGENT ERROR: ${error instanceof Error ? error.message : 'LLM call failed - check GEMINI_API_KEY'}]`,
          metadata: { error: true, errorMessage: String(error) }
        });
      }
    }

    // PHASE 3.4 & 3.5: Return structured response with extracted intel and confidence
    // PHASE 4.1 & 4.2: Add UI state for reactive frontend
    const riskScore = computeRiskScore(session);
    const intelCount =
      session.extracted_intel.upi_ids.length +
      session.extracted_intel.bank_accounts.length +
      session.extracted_intel.phishing_links.length +
      session.extracted_intel.phone_numbers.length;

    const responsePayload = {
      ...newMessage,
      extracted_intel: {
        upi_ids: session.extracted_intel.upi_ids,
        bank_accounts: session.extracted_intel.bank_accounts,
        phishing_links: session.extracted_intel.phishing_links,
        phone_numbers: session.extracted_intel.phone_numbers
      },
      confidence_score: computeConfidenceScore(session),
      ui_state: {
        risk_score: riskScore,
        risk_label: getRiskLabel(riskScore),
        agent_status: session.is_active ? "ACTIVE" : "EXITED",
        intel_count: intelCount,
        session_status: session.is_active ? "ACTIVE" : "COMPLETED",
        current_goal: session.agent_state.current_goal || "STANDBY"
      }
    };

    res.status(201).json(responsePayload);
  });

  // PHASE 4.2: Risk score computation (judge-friendly, explainable)
  function computeRiskScore(session: any): number {
    let score = 0.2; // Base suspicion

    // Incremental risk based on extracted intel
    if (session.extracted_intel.phone_numbers.length > 0) score += 0.15;
    if (session.extracted_intel.upi_ids.length > 0) score += 0.25;
    if (session.extracted_intel.bank_accounts.length > 0) score += 0.2;
    if (session.extracted_intel.phishing_links.length > 0) score += 0.2;

    // Exit state = confirmed scam
    if (session.agent_state.current_goal === "EXIT_SAFELY" || !session.is_active) {
      score = 1.0;
    }

    return Math.min(score, 1.0);
  }

  // PHASE 4.2: Risk label mapping for UI
  function getRiskLabel(score: number): string {
    if (score < 0.3) return "SAFE";
    if (score < 0.6) return "CAUTION";
    return "HIGH RISK";
  }


  // PHASE 3.5: Confidence scoring function
  function computeConfidenceScore(session: any): number {
    let score = 0;

    // Rule-based scoring
    if (session.extracted_intel.upi_ids.length > 0) score += 0.4;
    if (session.extracted_intel.bank_accounts.length > 0) score += 0.3;
    if (session.extracted_intel.phishing_links.length > 0) score += 0.3;

    // Bonus for multiple pieces of evidence
    const totalIntel =
      session.extracted_intel.upi_ids.length +
      session.extracted_intel.bank_accounts.length +
      session.extracted_intel.phishing_links.length;

    if (totalIntel >= 3) score = Math.min(score + 0.1, 1.0);

    return Math.min(score, 1.0);
  }


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
