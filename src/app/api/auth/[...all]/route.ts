import { getAuth } from "@/lib/auth";

// Sign-in, sign-out and session endpoints under /api/auth/* (RF002)
export function GET(request: Request) {
  return getAuth().handler(request);
}

export function POST(request: Request) {
  return getAuth().handler(request);
}
