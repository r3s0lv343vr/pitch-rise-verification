import Link from "next/link";
import { signupAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_#12365f_0%,_#020617_55%)] px-4">
      <Card className="w-full max-w-md">
        <h1 className="text-xl font-semibold text-white">Create account</h1>
        <p className="mt-1 text-sm text-slate-400">
          Open registration — classmates can join without builder assistance.
        </p>
        {sp.error === "exists" ? (
          <p className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">Email or username already taken.</p>
        ) : null}
        {sp.error === "invalid" ? (
          <p className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            Fill all fields. Password must be at least 8 characters.
          </p>
        ) : null}
        <form action={signupAction} className="mt-5 space-y-3">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" required />
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" minLength={8} required />
          </div>
          <Button type="submit" className="w-full">
            Create account
          </Button>
        </form>
        <p className="mt-5 text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="text-cyan-300 hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
}
