"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect to existing settings page for now
// TODO: Build inline configure page
export default function ConfigurePage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/dashboard/events/${params.eventId}/settings`);
  }, [params.eventId, router]);

  return null;
}
