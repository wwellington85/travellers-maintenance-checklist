export default function SignOutButton() {
  return (
    <form action="/auth/logout" method="post">
      <button className="rounded-lg border px-3 py-2 text-sm">
        Sign out
      </button>
    </form>
  );
}
