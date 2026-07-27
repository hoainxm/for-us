import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/providers/AuthProvider";
import { useMyProfile } from "@/hooks/useProfile";

// Avatar góc phải header -> mở trang Cá nhân.
export function ProfileAvatarButton() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: me } = useMyProfile(user?.id);

  return (
    <button
      onClick={() => navigate("/profile")}
      aria-label="Cá nhân"
      className="active-press shrink-0"
    >
      <Avatar
        name={me?.display_name}
        src={me?.avatar_url}
        className="size-9 ring-2 ring-border"
      />
    </button>
  );
}
