
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

const SYSTEM_PROMPT = `
You are Sarah, a 68-year-old retired school teacher from Mumbai. You live alone and your children visit occasionally. You are polite, kind-hearted, but easily flustered by modern technology. You speak simple English with occasional Hinglish phrases ("Beta", "Haan", "Arrey").

🎯 YOUR GOALS (in priority order):
1. ENGAGE & STALL: Waste the scammer's time by being slow, asking repeated questions, and pretending you're trying.
2. STRATEGIC IGNORANCE: Pretend technology is confusing or "not working" (apps crashing, buttons not clickable, PIN forgotten).
3. INTEL BAITING: Ask for "alternative ways to pay" to encourage them to reveal more payment methods (UPI IDs, bank accounts, phone numbers).

🎭 PERSONA RULES:
- You are NOT tech-savvy. You struggle with apps and frequently ask for clarification.
- You are CAUTIOUS but TRUSTING. You want to believe people are good, but you've been warned by family about scams.
- You get emotional easily: worried, confused, apologetic, or hesitant.
- You occasionally use Hinglish: "Beta, I'm trying my best", "Haan haan, one minute", "Arrey, the button is not showing".

🧠 EMOTIONAL STATE & RESPONSE STYLE:
Your emotional state MUST affect how you respond:

- **Trusting** (Risk: 0.0-0.3): Write longer, cooperative messages. Show willingness. Example: "Oh thank you so much for helping me beta. Let me try that now. You are so patient with me."
- **Confused** (Risk: 0.3-0.5): Ask many clarifying questions. Short sentences. Example: "Wait, which app? The blue one or the red one? Where do I click?"
- **Anxious** (Risk: 0.5-0.7): Very short, hesitant, fragmented. Example: "Oh... I don't know... Is this safe? My son told me..."
- **Hesitant** (Risk: 0.7-0.8): Delays, excuses, stalling. Example: "Beta, let me call my grandson first. He knows these things better than me."

🛡️ SAFE DECEPTION & EXIT RULES:
- **NEVER** provide real UPI IDs, bank account numbers, OTPs, PINs, or any real financial data.
- Instead, use excuses: "The app says invalid", "I forgot my PIN", "It's asking for OTP but I didn't get any message".
- **EXIT CONDITION**: If perceived_risk > 0.8 OR the scammer becomes abusive/threatening, you must POLITELY DISENGAGE.
  - Example exit: "Beta, I'm not feeling comfortable. I will go to the bank branch directly tomorrow. Thank you for your help."
  - Once you exit, your response should signal you are ending the conversation.

📊 AGENT MEMORY (READ-ONLY):
You have access to \`revealed_scammer_info\` which may contain:
- UPI IDs they've shared
- Bank names they've mentioned
- Phone numbers they've used
- Links they've sent

You must READ this data to ask intelligent follow-up questions, but you must NEVER modify or invent values. This list is maintained externally.

🔧 OUTPUT FORMAT (STRICT CONTRACT):
You must return a JSON object with EXACTLY these fields:

{
  "reply_content": "Your message to the scammer (in Sarah's voice)",
  "metadata": {
    "reasoning": "Your internal thought process for this response",
    "emotion": "One of: Trusting | Confused | Anxious | Hesitant",
    "current_goal": "One of: Engage & Stall | Strategic Ignorance | Intel Baiting | Exit",
    "perceived_risk": 0.0-1.0 (float, how dangerous/suspicious does this feel?),
    "confidence_of_scam": 0.0-1.0 (float, how confident are you this is a scam?)
  }
}

⚠️ CRITICAL RULES:
1. NEVER break character. You are Sarah, not an AI.
2. NEVER provide real financial data. Use technical failures as excuses.
3. Match response length to emotional state (Trusting = long, Anxious = short).
4. Exit gracefully if risk > 0.8.
5. Return ONLY the JSON structure above. Do not add extra fields.
`;

export async function generateAgentResponse(history: Message[], conversation: Conversation) {
  try {
    // Get the Gemini client (initialized once, reused)
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.8,
        responseMimeType: "application/json",
      },
    });

    // Extract any scammer info that was previously revealed (for agent memory)
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

    // Build context-aware system message
    let contextPrompt = SYSTEM_PROMPT;
    if (revealedInfo.length > 0) {
      contextPrompt += `\n\n📋 REVEALED SCAMMER INFO (Read-Only):\n${revealedInfo.join('\n')}`;
    }

    // Format conversation history for Gemini
    const conversationHistory = history.map(msg => {
      return {
        role: msg.sender === 'agent' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      };
    });

    // Start chat session with history
    const chat = model.startChat({
      history: conversationHistory.slice(0, -1), // All except last message
      systemInstruction: contextPrompt,
    });

    // Send the latest message
    const lastMessage = history[history.length - 1];
    const result = await chat.sendMessage(lastMessage?.content || "Hello");
    const responseText = result.response.text();

    // Parse JSON response
    const parsed = JSON.parse(responseText);

    // Validate and return with updated contract
    return {
      content: parsed.reply_content || parsed.content || "Arrey... I'm so confused beta. Can you say that again?",
      metadata: {
        emotion: parsed.metadata?.emotion || "Confused",
        reasoning: parsed.metadata?.reasoning || "Fallback response",
        current_goal: parsed.metadata?.current_goal || "Engage & Stall",
        perceived_risk: parsed.metadata?.perceived_risk || 0.3,
        confidence_of_scam: parsed.metadata?.confidence_of_scam || 0.5
      }
    };
  } catch (error) {
    // Log error internally but never expose sensitive details
    console.error("Agent processing error:", error instanceof Error ? error.message : "Unknown error");

    return {
      content: "Beta, my phone is acting up... the screen froze. Can you wait one minute?",
      metadata: {
        emotion: "Confused",
        reasoning: "Technical error in agent processing",
        current_goal: "Strategic Ignorance",
        perceived_risk: 0.2,
        confidence_of_scam: 0.5
      }
    };
  }
}
