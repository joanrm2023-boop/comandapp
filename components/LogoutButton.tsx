"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <Button
      variant="outline"
      onClick={handleLogout}
      className="border-red-200 hover:bg-red-50 hover:text-red-700"
    >
      <LogOut className="w-4 h-4 mr-2" />
      Cerrar sesión
    </Button>
  );
}