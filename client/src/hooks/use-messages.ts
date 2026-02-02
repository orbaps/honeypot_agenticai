import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type CreateMessageRequest } from "@shared/schema";

export function useMessages(conversationId: number | null) {
  return useQuery({
    queryKey: [api.messages.list.path, conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const url = buildUrl(api.messages.list.path, { id: conversationId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return api.messages.list.responses[200].parse(await res.json());
    },
    enabled: !!conversationId,
    refetchInterval: 1000, // Frequent polling for live chat
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, content, sender }: CreateMessageRequest) => {
      const url = buildUrl(api.messages.create.path, { id: conversationId });
      const res = await fetch(url, {
        method: api.messages.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, sender }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return api.messages.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.messages.list.path, variables.conversationId] });
      // Also refetch conversation to get updated stats if any
      queryClient.invalidateQueries({ queryKey: [api.conversations.get.path, variables.conversationId] });
    },
  });
}
