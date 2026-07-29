export type ReminderInfo = {
  label: string;
  color:
    | "red"
    | "orange"
    | "green"
    | "gray";
  overdue: boolean;
};

export function getReminderInfo(
  remindAt: Date | string,
): ReminderInfo {
  const reminder =
    remindAt instanceof Date
      ? remindAt
      : new Date(remindAt);

  const now = new Date();

  const diff =
    reminder.getTime() - now.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < 0) {
    const overdue = Math.abs(diff);

    if (overdue < hour) {
      const minutes = Math.max(
        1,
        Math.floor(overdue / minute),
      );

      return {
        label: `Atrasado há ${minutes} min`,
        color: "red",
        overdue: true,
      };
    }

    if (overdue < day) {
      const hours = Math.floor(
        overdue / hour,
      );

      return {
        label: `Atrasado há ${hours} h`,
        color: "red",
        overdue: true,
      };
    }

    const days = Math.floor(
      overdue / day,
    );

    return {
      label: `Atrasado há ${days} dias`,
      color: "red",
      overdue: true,
    };
  }

  const today = new Date();

  if (
    reminder.toDateString() ===
    today.toDateString()
  ) {
    return {
      label: `Hoje às ${reminder.toLocaleTimeString(
        "pt-BR",
        {
          hour: "2-digit",
          minute: "2-digit",
        },
      )}`,
      color: "orange",
      overdue: false,
    };
  }

  const tomorrow = new Date();

  tomorrow.setDate(
    tomorrow.getDate() + 1,
  );

  if (
    reminder.toDateString() ===
    tomorrow.toDateString()
  ) {
    return {
      label: `Amanhã às ${reminder.toLocaleTimeString(
        "pt-BR",
        {
          hour: "2-digit",
          minute: "2-digit",
        },
      )}`,
      color: "green",
      overdue: false,
    };
  }

  const days = Math.ceil(diff / day);

  return {
    label: `Em ${days} dias`,
    color: "gray",
    overdue: false,
  };
}