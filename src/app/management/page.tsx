import { redirect } from "next/navigation";
import { withBasePath } from "@/lib/app-path";

export default function ManagementIndex() {
  redirect(withBasePath("/management/dashboard"));
}
