"use client";

/**
 * Admin Attention Hook
 *
 * Fetches and manages attention items for the attention panel.
 * Fixes: AUX-ATTN-001, AUX-NOTIF-001
 */

import { useState, useEffect, useCallback } from "react";
import { useActingContext } from "@/hooks/use-acting-context";
import {
  type AttentionItem,
  type AttentionState,
} from "@/lib/admin/attention/admin-attention-types";

export function useAdminAttention() {
  const { actingHeaders } = useActingContext();
  const [state, setState] = useState<AttentionState>({ status: "loading" });

  const fetchAttention = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/attention", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...actingHeaders,
        },
      });

      if (!res.ok) {
        // If endpoint doesn't exist, return empty state
        if (res.status === 404) {
          setState({ status: "ready", items: [], unreadCount: 0 });
          return;
        }
        throw new Error(`Failed to fetch attention items: ${res.status}`);
      }

      const data = await res.json();
      const items: AttentionItem[] = data.items ?? [];

      setState({
        status: "ready",
        items,
        unreadCount: items.filter((i) => !i.read).length,
      });
    } catch (error) {
      console.warn("Attention fetch failed:", error);
      // Graceful fallback — empty attention
      setState({ status: "ready", items: [], unreadCount: 0 });
    }
  }, [actingHeaders]);

  useEffect(() => {
    fetchAttention();
  }, [fetchAttention]);

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setState((prev) => {
      if (prev.status !== "ready") return prev;
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.id === id ? { ...item, read: true } : item
        ),
        unreadCount: prev.unreadCount - 1,
      };
    });

    try {
      await fetch(`/api/admin/attention/${id}/read`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch {
      // Optimistic update already applied
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setState((prev) => {
      if (prev.status !== "ready") return prev;
      return {
        ...prev,
        items: prev.items.map((item) => ({ ...item, read: true })),
        unreadCount: 0,
      };
    });

    try {
      await fetch("/api/admin/attention/read-all", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch {
      // Optimistic update already applied
    }
  }, []);

  const handleAction = useCallback(
    async (itemId: string, actionId: string) => {
      try {
        await fetch(`/api/admin/attention/${itemId}/action`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ actionId }),
        });
      } catch {
        // Action failed silently
      }
    },
    []
  );

  return {
    state,
    markAsRead,
    markAllAsRead,
    handleAction,
    refresh: fetchAttention,
  };
}
