"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

export type CustomerTimelineSource =
  | "MESSAGE"
  | "ATTENDANCE"
  | "RECEIPT"
  | "REMINDER";

export type CustomerTimelineItem = {
  id: string;
  source: CustomerTimelineSource;
  type: string;
  title: string;
  description: string | null;
  occurredAt: string;
  actor: {
    id: string | null;
    name: string;
    type: string;
  } | null;
  metadata: Record<string, unknown>;
};

type TimelineResponse = {
  customer: {
    id: string;
    name: string;
    phone: string | null;
  };
  total: number;
  items: CustomerTimelineItem[];
};

type UseCustomerTimelineParams = {
  isOpen: boolean;
  customerId: string | null;
};

export default function useCustomerTimeline({
  isOpen,
  customerId,
}: UseCustomerTimelineParams) {
  const [items, setItems] = useState<
    CustomerTimelineItem[]
  >([]);

  const [total, setTotal] =
    useState(0);

  const [
    isLoadingTimeline,
    setIsLoadingTimeline,
  ] = useState(false);

  const [
    timelineError,
    setTimelineError,
  ] = useState("");

  const loadTimeline =
    useCallback(async () => {
      if (!isOpen || !customerId) {
        setItems([]);
        setTotal(0);
        setTimelineError("");
        return;
      }

      setIsLoadingTimeline(true);
      setTimelineError("");

      try {
        const response = await fetch(
          `/api/customers/${customerId}/timeline?limit=150`,
          {
            cache: "no-store",
          },
        );

        const data =
          (await response.json()) as
            | TimelineResponse
            | {
                error?: string;
              };

        if (!response.ok) {
          throw new Error(
            "error" in data &&
            data.error
              ? data.error
              : "Não foi possível carregar a linha do tempo.",
          );
        }

        const timeline =
          data as TimelineResponse;

        setItems(
          Array.isArray(timeline.items)
            ? timeline.items
            : [],
        );

        setTotal(
          typeof timeline.total ===
            "number"
            ? timeline.total
            : 0,
        );
      } catch (error) {
        setItems([]);
        setTotal(0);

        setTimelineError(
          error instanceof Error
            ? error.message
            : "Erro ao carregar a linha do tempo.",
        );
      } finally {
        setIsLoadingTimeline(false);
      }
    }, [
      isOpen,
      customerId,
    ]);

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline]);

  return {
    timelineItems: items,
    timelineTotal: total,
    isLoadingTimeline,
    timelineError,
    reloadTimeline: loadTimeline,
  };
}
