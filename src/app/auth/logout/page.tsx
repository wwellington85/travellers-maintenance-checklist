export default function LogoutPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Sign out</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Click below to sign out of your account.
        </p>

        <form action="/auth/logout" method="post" className="mt-6">
          <button className="w-full rounded-lg bg-black px-4 py-2 text-white">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
