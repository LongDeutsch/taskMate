import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getUserById } from "@/shared/api";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { UserProfileView } from "@/features/users/components/user-profile-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: authUser } = useAuth();

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["users", id],
    queryFn: () => getUserById(id!),
    enabled: !!id,
  });

  if (!id) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          User không hợp lệ.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Không tìm thấy user.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/users">Quay lại Users</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6 pb-28 md:pb-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/users" aria-label="Quay lại danh sách Users">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">{user.fullName}</h1>
          <p className="text-sm text-muted-foreground">Hồ sơ thành viên</p>
        </div>
      </div>

      <UserProfileView user={user} isOwnProfile={authUser?.id === user.id} />
    </div>
  );
}
