# 🎭 Honeypot Agentic AI

An intelligent honeypot system that uses AI to engage scammers in realistic conversations while extracting actionable intelligence.

## 🎯 Features

- **Agentic AI**: Goal-driven agent with emotional states and strategic decision-making
- **Persona System**: "Sarah" - a 68 y/o retired teacher who responds realistically
- **Intel Extraction**: Automatically detects and logs UPI IDs, bank details, phone numbers
- **Risk Assessment**: Real-time confidence scoring and perceived risk analysis
- **Safe Deception**: Never provides real financial data - uses technical failures as excuses

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Google Gemini API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Guptaharshal1515/honeypot_agenticai.git
cd honeypot_agenticai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
```env
GEMINI_API_KEY=your-gemini-api-key-here
DATABASE_URL=postgresql://user:password@localhost:5432/scamguard
PORT=5000
```

4. Set up the database:
```bash
npm run db:push
```

5. Run the development server:
```bash
npm run dev
```

6. Open http://localhost:5000

## 🎮 Usage

### Scammer View
Navigate to `/scammer` to simulate a scammer's perspective and interact with the AI agent.

### Monitor Dashboard
Navigate to `/dashboard` to monitor live conversations, view extracted intelligence, and analyze agent behavior.

## 🧠 Agent Intelligence

The agent uses **Google Gemini (gemini-1.5-flash)** with:
- **4 Emotional States**: Trusting → Confused → Anxious → Hesitant
- **3 Strategic Goals**: Engage & Stall, Strategic Ignorance, Intel Baiting
- **Exit Logic**: Politely disengages when risk > 0.8

## 🛡️ Security

- API keys stored in environment variables only
- No hardcoded secrets
- Safe for public GitHub repositories
- `.env` excluded from version control

## 📊 Tech Stack

- **Frontend**: React, TailwindCSS, Framer Motion
- **Backend**: Express, TypeScript
- **Database**: PostgreSQL, Drizzle ORM
- **AI**: Google Gemini API
- **UI Components**: Shadcn/UI, Radix UI

## 📝 License

MIT

## ⚠️ Disclaimer

This project is for educational and research purposes only. Use responsibly and ethically.
