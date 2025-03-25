export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");

  if (!username) {
    return new Response(JSON.stringify({ error: "Missing username" }), {
      status: 400,
    });
  }

  try {
    const res = await fetch(`https://2004.lostcity.rs/api/hiscores/player/${encodeURIComponent(username)}`);
    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Failed to fetch hiscores" }), {
      status: 500,
    });
  }
}
