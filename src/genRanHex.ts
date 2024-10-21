import { randomBytes } from "node:crypto";

export function genRanHex(numBytes: number): string {
  return randomBytes(numBytes).toString("hex");
}