import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }

  try {
    const dir = path.join(process.cwd(), "_ig-data");
    const [followersRaw, followingRaw] = await Promise.all([
      readFile(path.join(dir, "followers_1.json"), "utf8"),
      readFile(path.join(dir, "following.json"), "utf8"),
    ]);

    return NextResponse.json({
      followers: JSON.parse(followersRaw),
      following: JSON.parse(followingRaw),
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
