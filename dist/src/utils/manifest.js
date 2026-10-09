import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
const EntrySchema = z.object({
    source: z.string(),
    target: z.string(),
    mode: z.enum(["markers", "whole", "init-only"]),
    recursive: z.boolean().optional(),
    substitute: z.record(z.string()).optional()
});
const ManifestSchema = z.object({
    user: z.array(EntrySchema),
    project: z.array(EntrySchema)
});
export function parseManifest(raw) {
    return ManifestSchema.parse(raw);
}
export function loadManifest(packageRoot) {
    const root = packageRoot ?? path.dirname(path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url)))));
    const raw = JSON.parse(readFileSync(path.join(root, "manifest.json"), "utf8"));
    return parseManifest(raw);
}
