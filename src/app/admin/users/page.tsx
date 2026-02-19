import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import { withBasePath } from "@/lib/app-path";

export default async function AdminUsersPage() {
  const supabase = await createSupabaseServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role,is_active")
    .eq("id", userData.user.id)
    .single();

  if (!me?.is_active || me.role !== "admin") redirect("/maintenance/new");

  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">User Admin</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Set roles and activate/deactivate accounts.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link className="rounded-lg border px-3 py-2 text-sm" href="/management/dashboard">
              Dashboard
            </Link>
            <SignOutButton />
          </div>
        </header>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          {error ? (
            <p className="text-sm text-red-600">{error.message}</p>
          ) : users && users.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-600">
                  <tr>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4">Active</th>
                    <th className="py-2 pr-4">Created</th>
                    <th className="py-2 pr-0">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t align-top">
                      <td className="py-2 pr-4">
                        <div className="font-medium">{u.full_name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{u.id}</div>
                      </td>
                      <td className="py-2 pr-4">{u.role}</td>
                      <td className="py-2 pr-4">{u.is_active ? "Yes" : "No"}</td>
                      <td className="py-2 pr-4">{new Date(u.created_at).toLocaleString()}</td>
                      <td className="py-2 pr-0">
                        <form action={withBasePath("/admin/users/update")} method="post" className="flex flex-wrap gap-2">
                          <input type="hidden" name="id" value={u.id} />
                          <select name="role" defaultValue={u.role} className="rounded border px-2 py-1">
                            <option value="maintenance">maintenance</option>
                            <option value="manager">manager</option>
                            <option value="admin">admin</option>
                          </select>
                          <select name="is_active" defaultValue={String(u.is_active)} className="rounded border px-2 py-1">
                            <option value="true">active</option>
                            <option value="false">inactive</option>
                          </select>
                          <button className="rounded border px-2 py-1">Save</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No users found.</p>
          )}
        </section>
      </div>
    </main>
  );
}
