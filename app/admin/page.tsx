import { redirect } from "next/navigation";

// El Dashboard pasó al perfil propietario; /admin lleva directo al menú
export default function AdminInicio() {
  redirect("/admin/menu");
}