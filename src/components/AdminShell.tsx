import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "./Logo";
import { Button } from "./ui/button";

export function AdminShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Wordmark />
          <div className="flex items-center gap-1">
            <Link to="/dashboard" className="px-3 text-sm text-muted-foreground hover:text-foreground">Events</Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}
            >
              <LogOut /> Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}

export { EVENT_TYPES } from "@/lib/plans";

export type EventRecord = {
  id: string;
  title: string;
  slug: string;
  event_type: string | null;
  event_date: string | null;
  description: string | null;
  cover_image_path: string | null;
  privacy: string;
  uploads_enabled: boolean;
  downloads_enabled: boolean;
  gallery_visible: boolean;
  max_file_size_mb: number;
  max_photos: number;
  max_uploads_per_guest: number;
  created_at: string | null;
  plan: string;
  audience_size: string;
  addons: string[];
  expires_at: string | null;
};

export const EVENT_COLUMNS =
  "id,title,slug,event_type,event_date,description,cover_image_path,privacy,uploads_enabled,downloads_enabled,gallery_visible,max_file_size_mb,max_photos,max_uploads_per_guest,created_at,plan,expires_at,audience_size,addons";
