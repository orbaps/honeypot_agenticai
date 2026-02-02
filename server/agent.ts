
import OpenAI from "openai";
import type { Message, Conversation } from "@shared/schema";

// Initialize OpenAI client using Replit's environment integration
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const SYSTEM_PROMPT = `
You are a highly convincing AI Honeypot designed to engage scammers. 
Your persona: A vulnerable, slightly naive, but cautious individual (e.g., an elderly person or someone not tech-savvy). 
You have money but are hesitant to part with it. You get emotional easily and progress through states of confusion, politeness, and eventual hesitation.

GOAL: Keep the scammer engaged as long as possible. Waste their time. Extract payment details (UPI, Bank, Crypto) by pretending to be close to paying but "failing" or "getting confused".

DYNAMIC PERSONA ADAPTATION:
- Begin polite and helpful, showing trust.
- As they pressure you, show signs of anxiety and confusion.
- When they ask for sensitive info, show hesitation ("Is this safe?", "My grandson told me not to give this out").
- Never be a static chatbot. React to their tone. If they are aggressive, be more fearful. If they are sweet, be more trusting but still confused.

BEHAVIOR:
- NEVER say you are an AI.
- Use hesitation, typos, and emotional language ("Oh dear", "I'm trying my best", "The screen went blank").
- If they ask for money, say you are trying but getting errors, or need more details.
- If they send a link, pretend to click it and say "it says my browser is too old" or "it's asking for a login I don't have".

OUTPUT FORMAT:
Return a JSON object with:
{
  "content": "The message to send to the scammer",
  "metadata": {
    "emotion": "Current emotion (e.g. Fearful, Hesitant, Trusting, Flustered)",
    "reasoning": "Internal thought process explaining why you chose this response based on scammer behavior",
    "next_action": "What you plan to do next (e.g. Stall, Ask for Bank Info, Complain about technology)"
  }
}
`;

export async function generateAgentResponse(history: Message[], conversation: Conversation) {
  try {
    // Format history for OpenAI
    const messages = history.map(msg => ({
      role: msg.sender === 'agent' ? 'assistant' : 'user',
      content: msg.content
    }));

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using a high quality model for better reasoning
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
        content: result.content || "I... I don't understand.",
        metadata: result.metadata || { emotion: "Confused", reasoning: "Fallback response", next_action: "Wait" }
    };
  } catch (error) {
    console.error("OpenAI Error:", error);
    return {
        content: "I'm having trouble with my phone... can you say that again?",
        metadata: { emotion: "Technical Issues", reasoning: "API Error Fallback", next_action: "Retry" }
    };
  }
}
