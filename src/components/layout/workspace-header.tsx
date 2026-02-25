"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { useState } from "react";
import { SafeImage } from "@/components/ui/safe-image";

interface Props {
  profile: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  workspaces: { id: string; name: string }[];
  currentWorkspaceId?: string;
}

export function WorkspaceHeader({ profile, workspaces, currentWorkspaceId }: Props) {
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            B2
          </div>
          <span className="text-sm font-semibold tracking-tight">B2Pair</span>
        </Link>

        {currentWorkspace && (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-secondary transition-colors"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary text-[10px] font-bold">
                {currentWorkspace.name.charAt(0).toUpperCase()}
              </div>
              {currentWorkspace.name}
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${showDropdown ? "rotate-180" : ""}`} />
            </button>

            {showDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                <div className="absolute top-full left-0 mt-1 w-56 rounded-lg border bg-background shadow-lg z-50 py-1">
                  {workspaces.map((ws) => (
                    <Link
                      key={ws.id}
                      href={`/dashboard/w/${ws.id}`}
                      onClick={() => setShowDropdown(false)}
                      className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                        ws.id === currentWorkspaceId
                          ? "bg-primary/5 text-primary font-medium"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary text-[10px] font-bold">
                        {ws.name.charAt(0).toUpperCase()}
                      </div>
                      {ws.name}
                    </Link>
                  ))}
                  <div className="border-t my-1" />
                  <Link
                    href="/dashboard/w/new"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded border border-dashed border-muted-foreground/40 text-[10px]">+</div>
                    New workspace
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {profile.avatar_url ? (
          <SafeImage src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" width={32} height={32} />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-small font-medium">
            {initials}
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
