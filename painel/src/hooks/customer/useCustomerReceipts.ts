"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

export type CustomerReceiptStatus =
  | "RECEIVED"
  | "CLASSIFIED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "AWAITING_NEW_RECEIPT"
  | "CUSTOMER_NOTIFIED"
  | "FINISHED";

export type CustomerReceipt = {
  id: string;
  status: CustomerReceiptStatus;
  amount?: string | number | null;
  paymentMethod?: string | null;
  identifiedBank?: string | null;
  paidAt?: string | null;
  createdAt: string;
  mediaUrl?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  message?: {
    mediaUrl?: string | null;
    mimeType?: string | null;
  } | null;
};

type UseCustomerReceiptsParams = {
  isOpen: boolean;
  customerId: string | null;
};

export default function useCustomerReceipts({
  isOpen,
  customerId,
}: UseCustomerReceiptsParams) {
  const [receipts, setReceipts] =
    useState<CustomerReceipt[]>([]);

  const [isLoadingReceipts, setIsLoadingReceipts] =
    useState(false);

  const [receiptsError, setReceiptsError] =
    useState("");

  const loadReceipts =
    useCallback(async () => {
      if (!isOpen || !customerId) {
        setReceipts([]);
        setReceiptsError("");
        return;
      }

      setIsLoadingReceipts(true);
      setReceiptsError("");

      try {
        const params =
          new URLSearchParams({
            customerId,
          });

        const response =
          await fetch(
            `/api/payment-receipts?${params.toString()}`,
            {
              cache: "no-store",
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Erro ao carregar os comprovantes.",
          );
        }

        setReceipts(
          Array.isArray(data)
            ? data
            : [],
        );
      } catch (error) {
        console.error(
          "Erro ao carregar comprovantes do cliente:",
          error,
        );

        setReceipts([]);
        setReceiptsError(
          error instanceof Error
            ? error.message
            : "Erro ao carregar os comprovantes.",
        );
      } finally {
        setIsLoadingReceipts(false);
      }
    }, [
      isOpen,
      customerId,
    ]);

  useEffect(() => {
    void loadReceipts();
  }, [loadReceipts]);

  return {
    receipts,
    isLoadingReceipts,
    receiptsError,
    reloadReceipts: loadReceipts,
  };
}
