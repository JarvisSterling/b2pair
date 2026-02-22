"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
export default function Page() {
  const params = useParams();
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/events/" + params.eventId + "/participants"); }, [params.eventId, router]);
  return null;
}
