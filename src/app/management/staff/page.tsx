import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

export default async function ManagementStaffPage() {
  const supabase = await createSupabaseServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role,is_active")
    .eq("id", userData.user.id)
    .single();

  if (!me?.is_active || !["manager", "admin"].includes(me.role)) redirect("/maintenance/new");

  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active, created_at")
    .order("full_name", { ascending: true })
    .limit(500);

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Staff Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create staff placeholders, update roles, and activate/deactivate accounts.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link className="rounded-lg border px-3 py-2 text-sm" href="/management/dashboard">
              Dashboard
            </Link>
            <Link className="rounded-lg border px-3 py-2 text-sm" href="/management/reports">
              Reports
            </Link>
            <SignOutButton />
          </div>
        </header>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Add Staff</h2>
          <form action="/management/staff/create" method="post" className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
            <input
              name="full_name"
              required
              placeholder="Full name"
              className="rounded border px-3 py-2 text-sm md:col-span-2"
            />
            <input name="email" placeholder="Email (optional)" className="rounded border px-3 py-2 text-sm md:col-span-2" />
            <select name="role" defaultValue="maintenance" className="rounded border px-3 py-2 text-sm">
              <option value="maintenance">maintenance</option>
              <option value="manager">manager</option>
              <option value="admin">admin</option>
            </select>
            <button className="rounded border px-3 py-2 text-sm md:col-span-1">Create staff</button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            If email is omitted, a placeholder <code>@travellers.local</code> email is generated.
          </p>
        </section>

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
                  {users.map((u: any) => (
                    <tr key={u.id} className="border-t align-top">
                      <td className="py-2 pr-4">
                        <div className="font-medium">{u.full_name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{u.id}</div>
                      </td>
                      <td className="py-2 pr-4">{u.role}</td>
                      <td className="py-2 pr-4">{u.is_active ? "Yes" : "No"}</td>
                      <td className="py-2 pr-4">{new Date(u.created_at).toLocaleString()}</td>
                      <td className="py-2 pr-0">
                        <form action="/management/staff/update" method="post" className="flex flex-wrap gap-2">
                          <input type="hidden" name="id" value={u.id} />
                          <input
                            name="full_name"
                            defaultValue={u.full_name || ""}
                            className="rounded border px-2 py-1"
                            placeholder="Full name"
                          />
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

