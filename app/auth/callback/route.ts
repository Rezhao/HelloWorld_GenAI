import { createClient, getUserProfile } from "@/app/utils/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await getUserProfile(user);
      }
      return NextResponse.redirect(`${origin}/home`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
