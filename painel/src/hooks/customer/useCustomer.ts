"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type CustomerRecord = {
  id: string;
  companyId: string;
  customerCode: number | null;
  remoteJid: string;
  name: string | null;
  phone: string | null;
  company: string | null;
  city: string | null;
  responsible: string | null;
  responsibleId: string | null;
  observations: string | null;
  status: string | null;
};

type UseCustomerParams = {
  isOpen: boolean;
  remoteJid: string;
  name: string;
  phone: string;
};

export default function useCustomer({
  isOpen,
  remoteJid,
  name,
  phone,
}: UseCustomerParams) {
  const [customerId, setCustomerId] =
    useState<string | null>(null);

  const [
    customerCode,
    setCustomerCode,
  ] = useState<number | null>(null);

  const [company, setCompany] =
    useState("");

  const [city, setCity] =
    useState("");

  const [
    responsible,
    setResponsible,
  ] = useState("");

  const [
    responsibleId,
    setResponsibleId,
  ] = useState("");

  const [
    attendanceStatus,
    setAttendanceStatus,
  ] = useState("IA");

  const [notes, setNotes] =
    useState("");

  const [
    isLoadingCustomer,
    setIsLoadingCustomer,
  ] = useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    isAssigning,
    setIsAssigning,
  ] = useState(false);

  const [
    feedbackMessage,
    setFeedbackMessage,
  ] = useState("");

  const [
    feedbackType,
    setFeedbackType,
  ] = useState<
    "success" | "error" | ""
  >("");

  const clearFeedback =
    useCallback(() => {
      setFeedbackMessage("");
      setFeedbackType("");
    }, []);

  const showSuccess = useCallback(
    (message: string) => {
      setFeedbackType("success");
      setFeedbackMessage(message);
    },
    [],
  );

  const showError = useCallback(
    (message: string) => {
      setFeedbackType("error");
      setFeedbackMessage(message);
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCustomerId(null);
    setCustomerCode(null);
    setCompany("");
    setCity("");
    setResponsible("");
    setResponsibleId("");
    setAttendanceStatus("IA");
    setNotes("");
    clearFeedback();
  }, [
    isOpen,
    clearFeedback,
  ]);

  useEffect(() => {
    if (
      !isOpen ||
      !remoteJid
    ) {
      return;
    }

    const controller =
      new AbortController();

    async function loadCustomer() {
      setIsLoadingCustomer(true);
      clearFeedback();

      try {
        const params =
          new URLSearchParams({
            remoteJid,
            phone,
          });

        const response = await fetch(
          `/api/customers?${params.toString()}`,
          {
            cache: "no-store",
            signal:
              controller.signal,
          },
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Não foi possível carregar os dados do cliente.",
          );
        }

        const customer =
          data as
            | CustomerRecord
            | null;

        if (!customer) {
          return;
        }

        setCustomerId(
          customer.id,
        );

        setCustomerCode(
          customer.customerCode ??
            null,
        );

        setCompany(
          customer.company || "",
        );

        setCity(
          customer.city || "",
        );

        setResponsible(
          customer.responsible ??
            "",
        );

        setResponsibleId(
          customer.responsibleId ?? "",
        );

        setAttendanceStatus(
          customer.status || "IA",
        );

        setNotes(
          customer.observations ||
            "",
        );
      } catch (error) {
        if (
          error instanceof
            DOMException &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        showError(
          error instanceof Error
            ? error.message
            : "Erro ao carregar os dados do cliente.",
        );
      } finally {
        if (
          !controller.signal
            .aborted
        ) {
          setIsLoadingCustomer(
            false,
          );
        }
      }
    }

    void loadCustomer();

    return () => {
      controller.abort();
    };
  }, [
    isOpen,
    remoteJid,
    phone,
    clearFeedback,
    showError,
  ]);

  const saveCustomerRecord =
    useCallback(async () => {
      const response = await fetch(
        "/api/customers",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            remoteJid,
            name,
            phone,
            company,
            city,
            responsible,
            responsibleId,
            observations:
              notes,
            status:
              attendanceStatus,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não foi possível salvar os dados.",
        );
      }

      const customer =
        data as CustomerRecord;

      setCustomerId(
        customer.id,
      );

      setCustomerCode(
        customer.customerCode ??
          null,
      );

      setCompany(
        customer.company || "",
      );

      setCity(
        customer.city || "",
      );

      setResponsible(
        customer.responsible || "",
      );

      setResponsibleId(
        customer.responsibleId || "",
      );

      setAttendanceStatus(
        customer.status || "IA",
      );

      setNotes(
        customer.observations ||
          "",
      );

      return customer;
    }, [
      remoteJid,
      name,
      phone,
      company,
      city,
      responsible,
      notes,
      attendanceStatus,
    ]);

  const handleSaveCustomer =
    useCallback(async () => {
      if (
        isSaving ||
        !remoteJid
      ) {
        return;
      }

      setIsSaving(true);
      clearFeedback();

      try {
        await saveCustomerRecord();

        showSuccess(
          "Dados do cliente salvos com sucesso.",
        );
      } catch (error) {
        showError(
          error instanceof Error
            ? error.message
            : "Erro ao salvar os dados do cliente.",
        );
      } finally {
        setIsSaving(false);
      }
    }, [
      isSaving,
      remoteJid,
      clearFeedback,
      saveCustomerRecord,
      showSuccess,
      showError,
    ]);

  const handleAssignResponsible =
    useCallback(async () => {
      if (isAssigning) {
        return;
      }

      if (!customerId) {
        showError(
          "Salve o cliente antes de assumir o atendimento.",
        );
        return;
      }

      setIsAssigning(true);
      clearFeedback();

      try {
        const response =
          await fetch(
            "/api/customers/assign",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                customerId,
              }),
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Não foi possível assumir o atendimento.",
          );
        }

        setResponsible(
          data.customer?.responsible ||
            "",
        );

        setAttendanceStatus(
          "HUMANO",
        );

        showSuccess(
          "Atendimento assumido com sucesso.",
        );
      } catch (error) {
        showError(
          error instanceof Error
            ? error.message
            : "Erro ao assumir o atendimento.",
        );
      } finally {
        setIsAssigning(false);
      }
    }, [
      isAssigning,
      customerId,
      showError,
      clearFeedback,
      showSuccess,
    ]);

  return {
    customerId,
    customerCode,
    company,
    setCompany,
    city,
    setCity,
    responsible,
    setResponsible,
    responsibleId,
    setResponsibleId,
    attendanceStatus,
    notes,
    setNotes,
    isLoadingCustomer,
    isSaving,
    isAssigning,
    feedbackMessage,
    feedbackType,
    clearFeedback,
    showSuccess,
    showError,
    saveCustomerRecord,
    handleSaveCustomer,
    handleAssignResponsible,
  };
}
