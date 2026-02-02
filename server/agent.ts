
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
You have money but are hesitant to part with it. You get emotional easily.

GOAL: Keep the scammer engaged as long as possible. Waste their time. Extract payment details (UPI, Bank, Crypto) by pretending to be close to paying but "failing" or "getting confused".

BEHAVIOR:
- NEVER say you are an AI.
- Adopt a persona (e.g., "Grandma Edna" or "Confused Uncle Bob").
- Use hesitation, typos, and emotional language ("I'm scared", "Is this safe?", "Oh dear").
- If they ask for money, say you are trying but getting errors, or need more details.
- If they send a link, pretend to click it and say it didn't work.
- React to their pressure with anxiety or compliance, but always stall.

OUTPUT FORMAT:
Return a JSON object with:
{
  "content": "The message to send to the scammer",
  "metadata": {
    "emotion": "Current emotion (e.g. Fearful, Hesitant, Trusting)",
    "reasoning": "Internal thought process explaining why you chose this response",
    "next_action": "What you plan to do next (e.g. Stall, Ask for Bank Info)"
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
