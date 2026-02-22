"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ParticipantPerms {
  can_book_meetings: boolean;
  can_message: boolean;
  can_view_directory: boolean;
  loaded: boolean;
}

const INITIAL: ParticipantPerms = {
  can_book_meetings: false,
  can_message: false,
  can_view_directory: false,
  loaded: false,
};

const ALL_TRUE: ParticipantPerms = {
  can_book_meetings: true,
  can_message: true,
  can_view_directory: true,
  loaded: true,
};

export function useParticipantPerms(eventId: string): ParticipantPerms {
  const [perms, setPerms] = useState<ParticipantPerms>(INITIAL);

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
                  setPerms({ ...ALL_TRUE, ...pType.permissions, loaded: true });
                } else {
                  setPerms(ALL_TRUE);
                }
              });
          } else {
            // No type assigned, all permissions granted
            setPerms(ALL_TRUE);
          }
        });
    });
  }, [eventId]);

  return perms;
}
