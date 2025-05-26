"use client";
import { useAccountProfile } from "@/queries/useAccount"; // Replace useAppContext
import menuItems from "@/app/manage/menuItems"; // Named import for the array
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Package2, PanelLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Import types from menuItems.tsx

// Define permission type
interface Permission {
  id: number;
  name: string;
  apiPath: string;
  method: string;
  module: string;
}

// Mapping of href to module for permission checking
const hrefToModuleMap: Record<string, string> = {
  "/manage/dashboard": "REVENUE",
  "/manage/bookings": "BOOKINGS",
  "/manage/trains": "TRAINS",
  "/manage/carriages": "CARRIAGES",
  "/manage/stations": "STATIONS",
  "/manage/trainTrips": "TRAIN_TRIPS",
  "/manage/promotions": "PROMOTIONS",
  "/manage/articles": "ARTICLES",
  "/manage/accounts": "ACCOUNTS",
  "/manage/roles": "ROLES",
  "/manage/permissions": "PERMISSIONS",
};

export default function MobileNavLinks() {
  const pathname = usePathname();
  const { data, isLoading, isError, error } = useAccountProfile();
  console.log(">>>>", data); // Log data for debugging
  const account = data?.data?.user;
  const userPermissions = account?.role?.permissions as
    | Permission[]
    | undefined;

  // Filter menu items based on permissions
  const accessibleMenuItems = menuItems.filter((item: any) => {
    if (isLoading || isError || !userPermissions) return true; // Show all during loading or if permissions are unavailable
    const requiredModule = hrefToModuleMap[item.href];
    return (
      !requiredModule ||
      userPermissions.some((permission) => permission.module === requiredModule)
    );
  });

  if (isLoading) {
    return <div></div>; // Loading state
  }

  if (isError) {
    console.error("Account profile error:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return <div></div>; // Error state
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="icon" variant="outline" className="sm:hidden">
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="sm:max-w-xs">
        <nav className="grid gap-6 text-lg font-medium">
          <Link
            href="/"
            className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
          >
            <Package2 className="h-5 w-5 transition-all group-hover:scale-110" />
            <span className="sr-only">Acme Inc</span>
          </Link>
          {accessibleMenuItems.map((item: any, index: number) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={index}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 px-2.5 hover:text-foreground",
                  {
                    "text-foreground": isActive,
                    "text-muted-foreground": !isActive,
                  }
                )}
              >
                <item.Icon className="h-5 w-5" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
