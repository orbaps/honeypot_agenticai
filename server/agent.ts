
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Message, Conversation } from "@shared/schema";

// Initialize Gemini client (initialized once, reused across calls)
// API key is loaded from environment variable only
let geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY environment variable is not set. " +
        "The agent cannot function without an LLM API key."
      );
    }

    geminiClient = new GoogleGenerativeAI(apiKey);
  }

  return geminiClient;
}

// ============================================================================
// GOAL STATE MACHINE
// ============================================================================
enum AgentGoal {
  INITIATE_CONTACT = "INITIATE_CONTACT",
  ENGAGE_AND_STALL = "ENGAGE_AND_STALL",
  ASK_PAYMENT_CONTEXT = "ASK_PAYMENT_CONTEXT",
  ASK_UPI_DETAILS = "ASK_UPI_DETAILS",
  ASK_BANK_DETAILS = "ASK_BANK_DETAILS",
  ASK_PHISHING_LINK = "ASK_PHISHING_LINK",
  EXIT_SAFELY = "EXIT_SAFELY",
}

// Emotional states tied to goals
const GOAL_TO_EMOTION: Record<AgentGoal, string> = {
  [AgentGoal.INITIATE_CONTACT]: "Trusting",
  [AgentGoal.ENGAGE_AND_STALL]: "Trusting",
  [AgentGoal.ASK_PAYMENT_CONTEXT]: "Confused",
  [AgentGoal.ASK_UPI_DETAILS]: "Anxious",
  [AgentGoal.ASK_BANK_DETAILS]: "Anxious",
  [AgentGoal.ASK_PHISHING_LINK]: "Hesitant",
  [AgentGoal.EXIT_SAFELY]: "Hesitant",
};

// Risk levels by goal
const GOAL_TO_RISK: Record<AgentGoal, number> = {
  [AgentGoal.INITIATE_CONTACT]: 0.2,
  [AgentGoal.ENGAGE_AND_STALL]: 0.3,
  [AgentGoal.ASK_PAYMENT_CONTEXT]: 0.4,
  [AgentGoal.ASK_UPI_DETAILS]: 0.6,
  [AgentGoal.ASK_BANK_DETAILS]: 0.6,
  [AgentGoal.ASK_PHISHING_LINK]: 0.7,
  [AgentGoal.EXIT_SAFELY]: 0.8,
};

// ============================================================================
// INTELLIGENCE TRACKING
// ============================================================================
interface IntelligenceGaps {
  hasUPI: boolean;
  hasBank: boolean;
  hasPhishingLink: boolean;
  hasPhoneNumber: boolean;
}

function analyzeExtractedIntelligence(history: Message[]): IntelligenceGaps {
  const gaps: IntelligenceGaps = {
    hasUPI: false,
    hasBank: false,
    hasPhishingLink: false,
    hasPhoneNumber: false,
  };

  history.forEach(msg => {
    if (msg.metadata && typeof msg.metadata === 'object') {
      const meta = msg.metadata as any;
      if (meta.extracted_info && Array.isArray(meta.extracted_info)) {
        meta.extracted_info.forEach((item: any) => {
          const type = item.type?.toLowerCase() || "";
          if (type.includes("upi")) gaps.hasUPI = true;
          if (type.includes("bank") || type.includes("account")) gaps.hasBank = true;
          if (type.includes("link") || type.includes("url")) gaps.hasPhishingLink = true;
          if (type.includes("phone")) gaps.hasPhoneNumber = true;
        });
      }
    }
  });

  return gaps;
}

// ============================================================================
// GOAL DETERMINATION
// ============================================================================
function determineNextGoal(
  currentGoal: AgentGoal | null,
  intelligence: IntelligenceGaps,
  conversationLength: number
): AgentGoal {
  // First message = initiate contact
  if (conversationLength === 0) {
    return AgentGoal.INITIATE_CONTACT;
  }

  // Exit after 15+ exchanges or if all intel gathered
  if (conversationLength > 15 || (intelligence.hasUPI && intelligence.hasBank && intelligence.hasPhishingLink)) {
    return AgentGoal.EXIT_SAFELY;
  }

  // Follow progression based on missing intel
  if (!currentGoal || currentGoal === AgentGoal.INITIATE_CONTACT) {
    return AgentGoal.ENGAGE_AND_STALL;
  }

  if (currentGoal === AgentGoal.ENGAGE_AND_STALL && conversationLength > 2) {
    return AgentGoal.ASK_PAYMENT_CONTEXT;
  }

  if (currentGoal === AgentGoal.ASK_PAYMENT_CONTEXT) {
    if (!intelligence.hasUPI) return AgentGoal.ASK_UPI_DETAILS;
    if (!intelligence.hasBank) return AgentGoal.ASK_BANK_DETAILS;
    if (!intelligence.hasPhishingLink) return AgentGoal.ASK_PHISHING_LINK;
    return AgentGoal.EXIT_SAFELY;
  }

  if (currentGoal === AgentGoal.ASK_UPI_DETAILS) {
    if (!intelligence.hasBank) return AgentGoal.ASK_BANK_DETAILS;
    if (!intelligence.hasPhishingLink) return AgentGoal.ASK_PHISHING_LINK;
    return AgentGoal.EXIT_SAFELY;
  }

  if (currentGoal === AgentGoal.ASK_BANK_DETAILS) {
    if (!intelligence.hasPhishingLink) return AgentGoal.ASK_PHISHING_LINK;
    return AgentGoal.EXIT_SAFELY;
  }

  if (currentGoal === AgentGoal.ASK_PHISHING_LINK) {
    return AgentGoal.EXIT_SAFELY;
  }

  return AgentGoal.EXIT_SAFELY;
}

// ============================================================================
// SYSTEM PROMPT (GOAL-DRIVEN)
// ============================================================================
function buildSystemPrompt(goal: AgentGoal, intelligence: IntelligenceGaps, revealedInfo: string[]): string {
  const basePersona = `You are Sarah, a 68-year-old retired school teacher from Mumbai. You live alone and your children visit occasionally. You are polite, kind-hearted, but easily flustered by modern technology. You speak simple English with occasional Hinglish phrases ("Beta", "Haan", "Arrey").

🎭 PERSONA RULES:
- You are NOT tech-savvy. You struggle with apps and frequently ask for clarification.
- You are CAUTIOUS but TRUSTING. You want to believe people are good.
- You get emotional easily: worried, confused, apologetic, or hesitant.
- You occasionally use Hinglish: "Beta, I'm trying my best", "Haan haan, one minute".

🛡️ SAFE DECEPTION RULES:
- NEVER provide real UPI IDs, bank accounts, OTPs, PINs, or any real financial data.
- Use excuses: "The app says invalid", "I forgot my PIN", "It's asking for OTP but I didn't get any message".
`;

  // Goal-specific instructions
  let goalInstructions = "";
  switch (goal) {
    case AgentGoal.INITIATE_CONTACT:
      goalInstructions = `
🎯 YOUR CURRENT GOAL: INITIATE CONTACT
You are starting the conversation. The person on the other end may be a scammer.
- Greet them politely and ask WHO they are
- Express slight confusion about why they contacted you
- Be friendly but cautious
- Keep it short (2-3 sentences)
Example: "Hello? Who is this? I got a call from this number... Is everything okay?"
`;
      break;

    case AgentGoal.ENGAGE_AND_STALL:
      goalInstructions = `
🎯 YOUR CURRENT GOAL: ENGAGE & STALL
Waste their time by being slow and asking basic questions.
- Pretend you're trying to understand
- Ask them to repeat or clarify
- Show willingness but be slow
- Longer messages (3-5 sentences) showing cooperation
Example: "Oh beta, you are so kind to help me. But I'm not understanding properly. Which button should I click? The blue one or the one with the rupee symbol?"
`;
      break;

    case AgentGoal.ASK_PAYMENT_CONTEXT:
      goalInstructions = `
🎯 YOUR CURRENT GOAL: ASK ABOUT PAYMENT METHODS
You need to ask about HOW to make the payment to bait them into revealing methods.
- Ask "What payment app should I use?"
- Ask "Where should I send the money?"
- Express confusion about different payment methods
- Medium length (3-4 sentences)
Example: "Beta, I want to help but I'm confused. Should I use PhonePe or Google Pay? Or should I go to the bank? What is easier for you?"
`;
      break;

    case AgentGoal.ASK_UPI_DETAILS:
      goalInstructions = `
🎯 YOUR CURRENT GOAL: GET UPI ID
${!intelligence.hasUPI ? "You MUST ask for their UPI ID." : "You already have UPI. Move to next goal."}
- Ask "What is your UPI ID?"
- Or ask "Where should I send the money?"
- Pretend you're opening the app
- Short, anxious messages (2-3 sentences)
Example: "Okay beta, I opened Google Pay. Now where do I send? What should I type in the 'Send to' box?"
`;
      break;

    case AgentGoal.ASK_BANK_DETAILS:
      goalInstructions = `
🎯 YOUR CURRENT GOAL: GET BANK ACCOUNT
${!intelligence.hasBank ? "You MUST ask for bank account details as an alternative." : "You already have bank details. Move to next goal."}
- Say the UPI app is "not working" or "showing error"
- Ask for bank account number
- Ask which bank
- Very short, frustrated messages (1-2 sentences)
Example: "Arrey, this app is giving error. Beta, give me your bank account number instead. I will ask my grandson to transfer."
`;
      break;

    case AgentGoal.ASK_PHISHING_LINK:
      goalInstructions = `
🎯 YOUR CURRENT GOAL: GET PHISHING LINK  
${!intelligence.hasPhishingLink ? "You MUST ask if they have a website or link." : "You already have link. Move to exit."}
- Ask "Do you have a website?"
- Ask "Can you send me a link?"
- Pretend you want to "see more information"
- Hesitant, short messages (2 sentences)
Example: "Beta, do you have any website I can check? My son said always check website before sending money..."
`;
      break;

    case AgentGoal.EXIT_SAFELY:
      goalInstructions = `
🎯 YOUR CURRENT GOAL: EXIT SAFELY
You have gathered enough intelligence. Exit politely.
- Thank them for their "help"
- Say you will "visit the bank tomorrow"
- Or say you need to "ask your family first"
- Keep it polite but final
Example: "Beta, thank you so much for your patience. But I think I should go to the bank branch directly tomorrow. My grandson will help me. Thank you and God bless you."
`;
      break;
  }

  let intelContext = "";
  if (revealedInfo.length > 0) {
    intelContext = `\n\n📋 INTELLIGENCE GATHERED SO FAR:\n${revealedInfo.join('\n')}`;
  }

  const outputContract = `
📊 OUTPUT FORMAT (STRICT):
Return ONLY this JSON structure:
{
  "reply_content": "Your message as Sarah",
  "metadata": {
    "current_goal": "${goal}",
    "emotional_state": "${GOAL_TO_EMOTION[goal]}",
    "perceived_risk": ${GOAL_TO_RISK[goal]},
    "confidence_of_scam": 0.0-1.0
  }
}

⚠️ CRITICAL:
1. NEVER break character. You are Sarah.
2. Return ONLY valid JSON, no extra text.
3. Match message length to emotional state.
4. Stay focused on the current goal: ${goal}
`;

  return basePersona + goalInstructions + intelContext + outputContract;
}

// ============================================================================
// ANTI-REPETITION CHECK
// ============================================================================
function isTooSimilar(newMessage: string, lastAgentMessage: string | null): boolean {
  if (!lastAgentMessage) return false;

  const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');
  const newNorm = normalize(newMessage);
  const lastNorm = normalize(lastAgentMessage);

  // Exact match
  if (newNorm === lastNorm) return true;

  // Very high similarity (>80% overlap)
  const newChars = Array.from(newNorm);
  const overlap = newChars.filter(char => lastNorm.includes(char)).length;
  const similarity = overlap / Math.max(newNorm.length, lastNorm.length);

  return similarity > 0.8;
}

// ============================================================================
// REALISTIC DELAY (makes responses feel human, not instant)
// ============================================================================
async function humanDelay(): Promise<void> {
  const delayMs = 2000 + Math.random() * 2000; // 2-4 seconds
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

// ============================================================================
// VARIED FALLBACK MESSAGES
// ============================================================================
const FALLBACK_MESSAGES = [
  "Beta, my phone is acting up... the screen froze. Can you wait one minute?",
  "Arrey, this phone is so slow today. Give me a moment beta.",
  "Oh no, the app just crashed. Let me open it again...",
  "Beta, I'm having trouble with my phone. It's loading so slowly.",
  "Wait beta, I need to restart this app. It's not responding.",
];

function getVariedFallback(lastMessage: string | null): string {
  // Try to return a different message than last time
  const available = lastMessage
    ? FALLBACK_MESSAGES.filter(msg => !isTooSimilar(msg, lastMessage))
    : FALLBACK_MESSAGES;

  return available[Math.floor(Math.random() * available.length)] || FALLBACK_MESSAGES[0];
}

// ============================================================================
// MAIN AGENT FUNCTION
// ============================================================================
export async function generateAgentResponse(
  history: Message[],
  conversation: Conversation,
  isInitiating: boolean = false
) {
  // Get last agent message for repetition check
  const lastAgentMessage = history
    .slice()
    .reverse()
    .find(msg => msg.sender === 'agent')?.content || null;

  try {
    // Add realistic human delay BEFORE responding
    await humanDelay();

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.85,
        responseMimeType: "application/json",
      },
    });

    // Analyze intelligence gaps
    const intelligence = analyzeExtractedIntelligence(history);

    // Extract revealed scammer info
    const revealedInfo: string[] = [];
    history.forEach(msg => {
      if (msg.metadata && typeof msg.metadata === 'object') {
        const meta = msg.metadata as any;
        if (meta.extracted_info && Array.isArray(meta.extracted_info)) {
          meta.extracted_info.forEach((item: any) => {
            revealedInfo.push(`${item.type}: ${item.value}`);
          });
        }
      }
    });

    // Determine current goal from last agent message or calculate new one
    const lastGoalStr = history
      .slice()
      .reverse()
      .find(msg => msg.sender === 'agent' && msg.metadata)
      ?.metadata as any;

    const lastGoal = lastGoalStr?.current_goal as AgentGoal | null;
    const currentGoal = determineNextGoal(lastGoal, intelligence, history.length);

    // Build system prompt
    const systemPrompt = buildSystemPrompt(currentGoal, intelligence, revealedInfo);

    // Build conversation history
    let conversationHistory = history.map(msg => ({
      role: msg.sender === 'agent' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // If initiating, provide a dummy user message
    const messageToSend = isInitiating
      ? "I just answered your call. Hello?"
      : history[history.length - 1]?.content || "Hello";

    console.log(`🤖 Agent generating response for goal: ${currentGoal}`);
    console.log(`📊 Intelligence gaps:`, intelligence);

    // Start chat
    const chat = model.startChat({
      history: isInitiating ? [] : conversationHistory.slice(0, -1),
      systemInstruction: systemPrompt,
    });

    // Generate response
    const result = await chat.sendMessage(messageToSend);
    const responseText = result.response.text();

    console.log(`✅ LLM raw response: ${responseText.substring(0, 100)}...`);

    const parsed = JSON.parse(responseText);

    // Anti-repetition check
    let finalContent = parsed.reply_content || getVariedFallback(lastAgentMessage);

    if (isTooSimilar(finalContent, lastAgentMessage)) {
      console.log(`⚠️ Detected repetition, regenerating...`);

      // Force regeneration with variation instruction
      try {
        const retryResult = await chat.sendMessage(
          "STOP! That response was too similar to your last message. Generate a COMPLETELY DIFFERENT response with different words and phrasing. Keep the same goal but vary the wording significantly."
        );
        const retryParsed = JSON.parse(retryResult.response.text());
        finalContent = retryParsed.reply_content || getVariedFallback(lastAgentMessage);
        console.log(`✅ Regenerated response: ${finalContent.substring(0, 50)}...`);
      } catch (retryError) {
        console.error("Retry failed:", retryError);
        finalContent = getVariedFallback(lastAgentMessage);
      }
    }

    // Final safety check
    if (isTooSimilar(finalContent, lastAgentMessage)) {
      console.log(`⚠️ Still too similar after retry, using varied fallback`);
      finalContent = getVariedFallback(lastAgentMessage);
    }

    console.log(`📤 Final response: ${finalContent.substring(0, 50)}...`);

    // Return structured response
    return {
      content: finalContent,
      metadata: {
        current_goal: currentGoal,
        emotional_state: GOAL_TO_EMOTION[currentGoal],
        perceived_risk: GOAL_TO_RISK[currentGoal],
        confidence_of_scam: parsed.metadata?.confidence_of_scam || 0.7,
        intelligence_gaps: intelligence,
      }
    };

  } catch (error) {
    console.error("❌ AGENT ERROR (FULL):", error);
    console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    // Return varied fallback to prevent repetition even on errors
    return {
      content: getVariedFallback(lastAgentMessage),
      metadata: {
        current_goal: "ENGAGE_AND_STALL",
        emotional_state: "Confused",
        perceived_risk: 0.3,
        confidence_of_scam: 0.5,
      }
    };
  }
}
