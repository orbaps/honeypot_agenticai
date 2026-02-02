import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useReports(conversationId: number | null) {
  return useQuery({
    queryKey: [api.reports.list.path, conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const url = buildUrl(api.reports.list.path, { id: conversationId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch reports");
      return api.reports.list.responses[200].parse(await res.json());
    },
    enabled: !!conversationId,
    refetchInterval: 5000,
  });
}

export function useGenerateReport() {
  return useMutation({
    mutationFn: async (conversationId: number) => {
      const url = buildUrl(api.reports.generate.path, { id: conversationId });
      const res = await fetch(url, {
        method: api.reports.generate.method,
        headers: { "Content-Type": "application/json" },
      });
      
      if (!res.ok) throw new Error("Failed to generate report");
      
      // Handle blob response for download
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `scam-report-${conversationId}-${new Date().toISOString()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    },
  });
}
