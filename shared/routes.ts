
import { z } from "zod";
import { insertConversationSchema, insertMessageSchema, conversations, messages, scamReports } from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  conversations: {
    list: {
      method: 'GET' as const,
      path: '/api/conversations',
      responses: {
        200: z.array(z.custom<typeof conversations.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/conversations',
      input: z.object({ title: z.string().optional() }),
      responses: {
        201: z.custom<typeof conversations.$inferSelect>(),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/conversations/:id',
      responses: {
        200: z.custom<typeof conversations.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/conversations/:id',
      input: z.object({
        isAgentActive: z.boolean().optional(),
        status: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof conversations.$inferSelect>(),
      },
    },
    clear: {
        method: 'POST' as const,
        path: '/api/conversations/:id/clear',
        responses: {
            200: z.object({ success: z.boolean() }),
        }
    }
  },
  messages: {
    list: {
      method: 'GET' as const,
      path: '/api/conversations/:id/messages',
      responses: {
        200: z.array(z.custom<typeof messages.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/conversations/:id/messages',
      input: z.object({
        content: z.string(),
        sender: z.enum(['scammer', 'agent']),
      }),
      responses: {
        201: z.custom<typeof messages.$inferSelect>(),
      },
    },
  },
  reports: {
    list: {
      method: 'GET' as const,
      path: '/api/conversations/:id/reports',
      responses: {
        200: z.array(z.custom<typeof scamReports.$inferSelect>()),
      },
    },
    generate: {
      method: 'POST' as const,
      path: '/api/conversations/:id/generate-report',
      responses: {
        200: z.any(), // Returns PDF blob/buffer
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
