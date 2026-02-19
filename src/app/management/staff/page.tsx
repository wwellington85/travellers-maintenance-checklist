import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import { createClient } from "@supabase/supabase-js";

function statusText(ok?: string, err?: string) {
  if (ok === "staff_created") return { type: "ok", text: "Staff account created." };
  if (ok === "staff_invited") return { type: "ok", text: "Staff created and invite email sent." };
  if (ok === "staff_updated") return { type: "ok", text: "Staff updated." };
  if (ok === "invite_sent") return { type: "ok", text: "Password setup/reset email sent." };

  if (err === "invalid_input") return { type: "err", text: "Please fill all required fields correctly." };
  if (err === "forbidden_role") return { type: "err", text: "Only admins can assign admin role." };
  if (err === "invite_failed") return { type: "err", text: "Could not send invite email." };
  if (err === "create_failed") return { type: "err", text: "Could not create auth user." };
  if (err === "maintenance_creds_required")
    return { type: "err", text: "Maintenance users require username and password (8+ chars)." };
  if (err === "weak_password") return { type: "err", text: "Password must be at least 8 characters." };
  if (err === "profile_upsert_failed") return { type: "err", text: "Could not save profile." };
  if (err === "profile_update_failed") return { type: "err", text: "Could not update profile." };
  if (err === "email_update_failed") return { type: "err", text: "Could not update email for this user." };
  if (err === "password_update_failed") return { type: "err", text: "Could not update password." };
  if (err === "missing_real_email") return { type: "err", text: "Add a real email first, then send invite." };
  if (err === "missing_id") return { type: "err", text: "Missing staff ID." };

  return null;
}

async function listAuthUsersById() {
  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const byId = new Map<string, { email: string | null }>();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) break;
    const users = data?.users || [];
    users.forEach((u) => byId.set(u.id, { email: u.email || null }));
    if (users.length < perPage) break;
    page += 1;
  }

  return byId;
}

export default async function ManagementStaffPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const supabase = await createSupabaseServerClient();
  const sp = (searchParams ? await searchParams : {}) as Record<string, string | undefined>;

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

  const authById = await listAuthUsersById();
  const editId = sp?.edit || "";
  const notice = statusText(sp?.ok, sp?.err);

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Staff Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Add staff, edit details, and control access.
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

        {notice ? (
          <section
            className={`rounded-xl border p-4 text-sm ${
              notice.type === "ok" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {notice.text}
          </section>
        ) : null}

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Add Staff</h2>
          <form action="/management/staff/create" method="post" className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
            <input
              name="full_name"
              required
              placeholder="Full name"
              className="rounded border px-3 py-2 text-sm md:col-span-2"
            />
            <input
              name="username"
              placeholder="Username (required for maintenance)"
              className="rounded border px-3 py-2 text-sm md:col-span-2"
            />
            <input
              name="password"
              type="password"
              placeholder="Password (required for maintenance)"
              className="rounded border px-3 py-2 text-sm md:col-span-2"
            />
            <input
              name="email"
              placeholder="Email (manager/admin invite)"
              className="rounded border px-3 py-2 text-sm md:col-span-2"
            />
            <select name="role" defaultValue="maintenance" className="rounded border px-3 py-2 text-sm">
              <option value="maintenance">maintenance</option>
              <option value="manager">manager</option>
              {me.role === "admin" ? <option value="admin">admin</option> : null}
            </select>
            <button className="rounded border px-3 py-2 text-sm md:col-span-1">Create staff</button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Maintenance accounts use username + password set by management. Manager/admin accounts can be invited by email.
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
                    <th className="py-2 pr-4">Username</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4">Active</th>
                    <th className="py-2 pr-4">Created</th>
                    <th className="py-2 pr-0">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => {
                    const rowEmail = authById.get(u.id)?.email || "";
                    const isPlaceholderEmail = rowEmail.endsWith("@travellers.local");
                    const username = isPlaceholderEmail ? rowEmail.split("@")[0] : "";
                    const isEditing = editId === u.id;

                    return (
                      <tr key={u.id} className="border-t align-top">
                        {isEditing ? (
                          <>
                            <td className="py-2 pr-4">
                              <input
                                form={`row-${u.id}`}
                                name="full_name"
                                defaultValue={u.full_name || ""}
                                className="w-full rounded border px-2 py-1"
                                placeholder="Full name"
                              />
                            </td>
                            <td className="py-2 pr-4">
                              <input
                                form={`row-${u.id}`}
                                name="username"
                                defaultValue={username}
                                className="w-full rounded border px-2 py-1"
                                placeholder="Username"
                              />
                            </td>
                            <td className="py-2 pr-4">
                              <input
                                form={`row-${u.id}`}
                                name="email"
                                defaultValue={isPlaceholderEmail ? "" : rowEmail}
                                className="w-full rounded border px-2 py-1"
                                placeholder="Email"
                              />
                            </td>
                            <td className="py-2 pr-4">
                              <select form={`row-${u.id}`} name="role" defaultValue={u.role} className="rounded border px-2 py-1">
                                <option value="maintenance">maintenance</option>
                                <option value="manager">manager</option>
                                {me.role === "admin" ? <option value="admin">admin</option> : null}
                              </select>
                            </td>
                            <td className="py-2 pr-4">
                              <select form={`row-${u.id}`} name="is_active" defaultValue={String(u.is_active)} className="rounded border px-2 py-1">
                                <option value="true">active</option>
                                <option value="false">inactive</option>
                              </select>
                            </td>
                            <td className="py-2 pr-4">{new Date(u.created_at).toLocaleString()}</td>
                            <td className="py-2 pr-0">
                              <div className="flex flex-wrap gap-2">
                                <form id={`row-${u.id}`} action="/management/staff/update" method="post" className="flex gap-2">
                                  <input type="hidden" name="id" value={u.id} />
                                  <input
                                    name="password"
                                    type="password"
                                    className="w-40 rounded border px-2 py-1"
                                    placeholder="New password"
                                  />
                                  <button className="rounded border px-2 py-1">Save</button>
                                  <button name="send_invite" value="true" className="rounded border px-2 py-1">
                                    Save + Send invite
                                  </button>
                                </form>
                                <Link className="rounded border px-2 py-1" href="/management/staff">
                                  Cancel
                                </Link>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 pr-4">
                              <div className="font-medium">{u.full_name}</div>
                            </td>
                            <td className="py-2 pr-4">
                              {username ? username : <span className="text-xs text-muted-foreground">—</span>}
                            </td>
                            <td className="py-2 pr-4">
                              {rowEmail ? (
                                isPlaceholderEmail ? (
                                  <span className="text-xs text-muted-foreground">placeholder email</span>
                                ) : (
                                  rowEmail
                                )
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="py-2 pr-4">{u.role}</td>
                            <td className="py-2 pr-4">{u.is_active ? "Yes" : "No"}</td>
                            <td className="py-2 pr-4">{new Date(u.created_at).toLocaleString()}</td>
                            <td className="py-2 pr-0">
                              <div className="flex flex-wrap gap-2">
                                <Link className="rounded border px-2 py-1" href={`/management/staff?edit=${u.id}`}>
                                  Edit
                                </Link>
                                {!isPlaceholderEmail && rowEmail ? (
                                  <form action="/management/staff/send-invite" method="post">
                                    <input type="hidden" name="id" value={u.id} />
                                    <button className="rounded border px-2 py-1">Send invite</button>
                                  </form>
                                ) : null}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
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
