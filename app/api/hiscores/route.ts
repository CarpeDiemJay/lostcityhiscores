import { NextResponse } from "next/server";

/**
 * GET /api/hiscores?username=...
 * Proxies the Lost City API to fetch hiscores for a given username.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  if (!username) {
    return NextResponse.json({ error: "Missing username parameter" }, { status: 400 });
  }

  try {
    const url = `https://2004.lostcity.rs/api/hiscores/player/${encodeURIComponent(username)}`;
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: `Lost City API returned ${res.status}` }, { status: 500 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Error proxying Lost City API:", err);
    return NextResponse.json({ error: "Failed to fetch hiscores" }, { status: 500 });
  }
}
