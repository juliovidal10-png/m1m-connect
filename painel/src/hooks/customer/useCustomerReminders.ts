"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getLocalDateInputValue,
  getLocalTimeInputValue,
} from "@/components/customer/customer-utils";

export type ReminderRecord = {
  id: string;
  companyId: string;
  customerId: string;
  title: string;
  description: string | null;
  remindAt: string;
  responsible: string | null;
  status: string;
  completedAt: string | null;
  notifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type SavedCustomerRecord = {
  id: string;
};

type UseCustomerRemindersParams = {
  isOpen: boolean;
  customerId: string | null;
  responsible: string;
  saveCustomerRecord: () => Promise<SavedCustomerRecord>;
  clearFeedback: () => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
};

export default function useCustomerReminders({
  isOpen,
  customerId,
  responsible,
  saveCustomerRecord,
  clearFeedback,
  showSuccess,
  showError,
}: UseCustomerRemindersParams) {
  const [reminders, setReminders] = useState<
    ReminderRecord[]
  >([]);

  const [reminderTitle, setReminderTitle] =
    useState("");

  const [
    reminderDescription,
    setReminderDescription,
  ] = useState("");

  const [reminderDate, setReminderDate] =
    useState(getLocalDateInputValue);

  const [reminderTime, setReminderTime] =
    useState(getLocalTimeInputValue);

  const [
    reminderResponsible,
    setReminderResponsible,
  ] = useState("Julinho");

  const [
    isLoadingReminders,
    setIsLoadingReminders,
  ] = useState(false);

  const [
    isSavingReminder,
    setIsSavingReminder,
  ] = useState(false);

  const [
    completingReminderId,
    setCompletingReminderId,
  ] = useState<string | null>(null);

  const loadReminders = useCallback(
    async (
      currentCustomerId: string,
      signal?: AbortSignal,
    ) => {
      setIsLoadingReminders(true);

      try {
        const params = new URLSearchParams({
          customerId: currentCustomerId,
        });

        const response = await fetch(
          `/api/reminders?${params.toString()}`,
          {
            cache: "no-store",
            signal,
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Não foi possível carregar os lembretes.",
          );
        }

        setReminders(
          Array.isArray(data) ? data : [],
        );
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        showError(
          error instanceof Error
            ? error.message
            : "Erro ao carregar os lembretes.",
        );
      } finally {
        if (!signal?.aborted) {
          setIsLoadingReminders(false);
        }
      }
    },
    [showError],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setReminders([]);
    setReminderTitle("");
    setReminderDescription("");
    setReminderDate(
      getLocalDateInputValue(),
    );
    setReminderTime(
      getLocalTimeInputValue(),
    );
    setReminderResponsible(
      responsible || "Julinho",
    );
  }, [
    isOpen,
    responsible,
  ]);

  useEffect(() => {
    if (!isOpen || !customerId) {
      return;
    }

    const controller = new AbortController();

    loadReminders(
      customerId,
      controller.signal,
    );

    return () => {
      controller.abort();
    };
  }, [
    isOpen,
    customerId,
    loadReminders,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setReminderResponsible(
      responsible || "Julinho",
    );
  }, [
    isOpen,
    responsible,
  ]);

  const handleCreateReminder =
    useCallback(async () => {
      if (isSavingReminder) {
        return;
      }

      const normalizedTitle =
        reminderTitle.trim();

      if (!normalizedTitle) {
        showError(
          "Informe o título do lembrete.",
        );
        return;
      }

      if (!reminderDate || !reminderTime) {
        showError(
          "Informe a data e o horário do lembrete.",
        );
        return;
      }

      const remindAt = new Date(
        `${reminderDate}T${reminderTime}:00`,
      );

      if (Number.isNaN(remindAt.getTime())) {
        showError(
          "A data ou o horário do lembrete é inválido.",
        );
        return;
      }

      setIsSavingReminder(true);
      clearFeedback();

      try {
        let currentCustomerId = customerId;

        if (!currentCustomerId) {
          const savedCustomer =
            await saveCustomerRecord();

          currentCustomerId = savedCustomer.id;
        }

        const response = await fetch(
          "/api/reminders",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              customerId: currentCustomerId,
              title: normalizedTitle,
              description:
                reminderDescription.trim() ||
                null,
              remindAt: remindAt.toISOString(),
              responsible:
                reminderResponsible.trim() ||
                null,
            }),
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Não foi possível criar o lembrete.",
          );
        }

        setReminderTitle("");
        setReminderDescription("");
        setReminderDate(
          getLocalDateInputValue(),
        );
        setReminderTime(
          getLocalTimeInputValue(),
        );

        showSuccess(
          "Lembrete criado com sucesso.",
        );

        await loadReminders(
          currentCustomerId,
        );
      } catch (error) {
        showError(
          error instanceof Error
            ? error.message
            : "Erro ao criar o lembrete.",
        );
      } finally {
        setIsSavingReminder(false);
      }
    }, [
      isSavingReminder,
      reminderTitle,
      reminderDate,
      reminderTime,
      reminderDescription,
      reminderResponsible,
      customerId,
      saveCustomerRecord,
      clearFeedback,
      showSuccess,
      showError,
      loadReminders,
    ]);

  const handleCompleteReminder =
    useCallback(
      async (reminderId: string) => {
        if (completingReminderId) {
          return;
        }

        setCompletingReminderId(
          reminderId,
        );
        clearFeedback();

        try {
          const response = await fetch(
            "/api/reminders",
            {
              method: "PATCH",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                id: reminderId,
                action: "complete",
              }),
            },
          );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data.error ||
                "Não foi possível concluir o lembrete.",
            );
          }

          setReminders(
            (currentReminders) =>
              currentReminders.filter(
                (reminder) =>
                  reminder.id !==
                  reminderId,
              ),
          );

          showSuccess(
            "Lembrete concluído com sucesso.",
          );
        } catch (error) {
          showError(
            error instanceof Error
              ? error.message
              : "Erro ao concluir o lembrete.",
          );
        } finally {
          setCompletingReminderId(null);
        }
      },
      [
        completingReminderId,
        clearFeedback,
        showSuccess,
        showError,
      ],
    );

  return {
    reminders,
    reminderTitle,
    setReminderTitle,
    reminderDescription,
    setReminderDescription,
    reminderDate,
    setReminderDate,
    reminderTime,
    setReminderTime,
    reminderResponsible,
    setReminderResponsible,
    isLoadingReminders,
    isSavingReminder,
    completingReminderId,
    handleCreateReminder,
    handleCompleteReminder,
  };
}
