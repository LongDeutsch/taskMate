import { useState } from "react";
import { User } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { resolveAvatarUrl } from "@/shared/lib/avatar-url";

type UserAvatarProps = {
  avatar?: string | null;
  className?: string;
  iconClassName?: string;
  cacheBust?: string | number;
};

export function UserAvatar({ avatar, className, iconClassName, cacheBust }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const base = resolveAvatarUrl(avatar);

  const src =
    base && cacheBust != null && !base.startsWith("data:")
      ? `${base}${base.includes("?") ? "&" : "?"}v=${cacheBust}`
      : base;

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-muted text-muted-foreground",
          className
        )}
      >
        <User className={cn("size-5", iconClassName)} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={cn("rounded-full object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
