"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Permissions {
  can_book_meetings: boolean;
  can_message: boolean;
  can_view_directory: boolean;
}

const DEFAULT_PERMS: Permissions = {
  can_book_meetings: true,
  can_message: true,
  can_view_directory: true,
};

export function useParticipantPerms(eventId: string): Permissions {
  const [perms, setPerms] = useState<Permissions>(DEFAULT_PERMS);

  useEffect(() => {
    if (!eventId) return;
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      supabase
        .from("participants")
        .select("participant_type_id")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .single()
        .then(({ data: participant }) => {
          if (participant?.participant_type_id) {
            supabase
              .from("event_participant_types")
              .select("permissions")
              .eq("id", participant.participant_type_id)
              .single()
              .then(({ data: pType }) => {
                if (pType?.permissions) {
                  setPerms({ ...DEFAULT_PERMS, ...pType.permissions });
                }
              });
          }
        });
    });
  }, [eventId]);

  return perms;
}
