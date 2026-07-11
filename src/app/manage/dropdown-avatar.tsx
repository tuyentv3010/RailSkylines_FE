"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useLogoutMutation } from "@/queries/useAuth";
import { getAccessTokenFromLocalStorage, handleErrorApi } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useAccountProfile } from "@/queries/useAccount";
import { toast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";
import { useAppContext } from "@/components/app-provider";

export default function DropdownAvatar() {
  const t = useTranslations("DropdownAvatar");
  const router = useRouter();
  const logoutMutation = useLogoutMutation();
  const { data, isLoading, isError, error } = useAccountProfile();
  const { setIsAuth, setRole, setPermissions } = useAppContext();
  console.log(">>>>", data);
  const account = data?.data?.user;

  const logout = async () => {
    if (logoutMutation.isPending) {
      console.log("Logout mutation is pending, skipping");
      return;
    }

    try {
      await logoutMutation.mutateAsync({
        refreshToken: "", // Refresh token is handled by cookie
        accessToken: getAccessTokenFromLocalStorage() || "",
      });
      localStorage.removeItem("accessToken");
      setIsAuth(false);
      setRole(null);
      setPermissions(null);
      toast({
        description: t("LoggedOut"),
      });
      router.push("/");
    } catch (error: any) {
      console.error("Logout error:", {
        error,
        message: error.message,
        response: error.response?.data,
      });
      handleErrorApi({
        error,
        setError: () => {},
      });
      toast({
        title: t("Error"),
        description: error.message || t("LogoutFailed"),
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="overflow-hidden rounded-full"
      >
        <Avatar>
          <AvatarFallback>...</AvatarFallback>
        </Avatar>
      </Button>
    );
  }

  if (isError) {
    console.error("Account profile error:", {
      error,
      message: error.message,
    });
    return (
      <Button
        variant="outline"
        size="icon"
        className="overflow-hidden rounded-full"
      >
        <Avatar>
          <AvatarFallback>??</AvatarFallback>
        </Avatar>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="overflow-hidden rounded-full"
        >
          <Avatar>
            <AvatarImage
              src={account?.avatar ?? undefined}
              alt={account?.name || t("UnknownUser")}
            />
            <AvatarFallback>
              {account?.name ? account.name.slice(0, 2).toUpperCase() : "??"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span>{account?.name || t("UnknownUser")}</span>
            <span className="text-sm text-muted-foreground">
              {account?.email || t("UnknownUser")}
            </span>
            <span className="text-sm text-muted-foreground">
              {account?.role?.name || t("NoRole")}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {["SUPER_ADMIN", "ADMIN", "STAFF"].includes(
          account?.role?.name ?? ""
        ) && (
          <DropdownMenuItem asChild>
            <Link href="/manage/dashboard" className="cursor-pointer">
              {t("Manage")}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/manage/setting" className="cursor-pointer">
            {t("Settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/booking-history" className="cursor-pointer">
            {t("Support")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="cursor-pointer">
          {t("Logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
