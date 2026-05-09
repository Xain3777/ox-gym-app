import { NextResponse } from "next/server";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { requireAuth } from "@/lib/api-auth";

const COACH_ROLES = ["manager", "admin", "head_coach", "coach"] as const;
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

type MediaSource = {
  name: string;
  url: string;
  type: "machine" | "demo";
};

async function listImages(relativeDir: string, type: MediaSource["type"]): Promise<MediaSource[]> {
  const dir = path.join(process.cwd(), "public", relativeDir);
  const files = await readdir(dir, { withFileTypes: true });

  return files
    .filter((file) => file.isFile() && IMAGE_EXTENSIONS.has(path.extname(file.name).toLowerCase()))
    .map((file) => ({
      name: path.basename(file.name, path.extname(file.name)),
      url: `/${relativeDir.replaceAll("\\", "/")}/${file.name}`,
      type,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function GET() {
  const { error } = await requireAuth([...COACH_ROLES]);
  if (error) return error;

  const [machines, demos] = await Promise.all([
    listImages("gym-machines", "machine").catch(() => []),
    listImages(path.join("exercises", "machines"), "demo").catch(() => []),
  ]);

  return NextResponse.json({ success: true, data: [...machines, ...demos] });
}
