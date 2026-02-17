import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Staff Login</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to submit maintenance checklists or view reports.
        </p>

        <div className="mt-6">
          <LoginForm redirectTo="/maintenance/new" />
        </div>
      </div>
    </main>
  );
}
