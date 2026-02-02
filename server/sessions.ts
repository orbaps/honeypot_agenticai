export type Session = {
    conversation_id: string;
    created_at: number;
    last_active: number;

    // agent-related state (will expand later)
    agent_state: {
        has_initiated: boolean;
        current_goal: string | null;
    };

    // extracted intel (empty for now)
    extracted_intel: {
        upi_ids: string[];
        bank_accounts: string[];
        phishing_links: string[];
        phone_numbers: string[];
    };
};

// In-memory session store
const sessions = new Map<string, Session>();

export function getOrCreateSession(conversation_id: string): Session {
    const now = Date.now();

    let session = sessions.get(conversation_id);

    if (!session) {
        session = {
            conversation_id,
            created_at: now,
            last_active: now,
            agent_state: {
                has_initiated: false,
                current_goal: null
            },
            extracted_intel: {
                upi_ids: [],
                bank_accounts: [],
                phishing_links: [],
                phone_numbers: []
            }
        };

        sessions.set(conversation_id, session);
    } else {
        session.last_active = now;
    }

    return session;
}

// Optional: helper for debugging / future cleanup
export function getSessionCount(): number {
    return sessions.size;
}
