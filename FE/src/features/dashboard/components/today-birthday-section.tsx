import { useQuery } from "@tanstack/react-query";
import { getTodayBirthdays } from "@/shared/api";
import { getTodayDateKey } from "@/shared/lib/birthday";
import { BirthdayCelebrationCard } from "./birthday-celebration-card";

type TodayBirthdaySectionProps = {
  /** Khi có: cá nhân hóa lời chúc nếu user đang đăng nhập trùng sinh nhật hôm nay */
  currentUserId?: string;
  variant?: "default" | "sidebar";
};

function formatBirthdayExtraLine(names: string[]): string {
  if (names.length <= 1) return "";
  return `Hôm nay là sinh nhật của ${names.join(", ")} 🎈`;
}

export function TodayBirthdaySection({ currentUserId, variant = "default" }: TodayBirthdaySectionProps) {
  const todayKey = getTodayDateKey();

  const { data: birthdays = [] } = useQuery({
    queryKey: ["birthdays", "today", todayKey],
    queryFn: getTodayBirthdays,
    staleTime: 0,
    refetchOnMount: "always",
  });

  if (birthdays.length === 0) return null;

  const isSingle = birthdays.length === 1;
  const person = birthdays[0]!;
  const isSelf = !!currentUserId && birthdays.some((b) => b.id === currentUserId);

  const cardProps = { variant, playConfettiOnMount: variant !== "sidebar" };

  if (isSingle) {
    const selfToday = currentUserId === person.id;
    return (
      <BirthdayCelebrationCard
        {...cardProps}
        fullName={person.fullName}
        dateOfBirth={person.dateOfBirth}
        showAge
        titleSuffix={selfToday ? undefined : ` ${person.fullName}`}
        titleUseBan={selfToday}
        subtitle={
          selfToday
            ? "Chúc bạn tuổi mới nhiều năng lượng, ít bug và nhiều task done!"
            : "Chúc tuổi mới nhiều năng lượng, ít bug và nhiều task done!"
        }
        ageLine={
          selfToday
            ? undefined
            : person.age != null
              ? `Hôm nay ${person.fullName} tròn ${person.age} tuổi 🎈`
              : undefined
        }
      />
    );
  }

  return (
    <BirthdayCelebrationCard
      {...cardProps}
      fullName=""
      showAge={false}
      titleSuffix={isSelf ? " bạn" : " các bạn"}
      titleUseBan={isSelf}
      subtitle="Chúc tuổi mới nhiều năng lượng, ít bug và nhiều task done!"
      extraLine={formatBirthdayExtraLine(birthdays.map((b) => b.fullName))}
    />
  );
}
