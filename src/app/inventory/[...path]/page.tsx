import { redirect } from "next/navigation";

export default function InventoryCatchAll() {
  // Old links from other apps/bookmarks land here.
  redirect("/new");
}
