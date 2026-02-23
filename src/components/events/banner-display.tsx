"use client";

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Check, ArrowRight, Loader2, Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type BannerLayout = "split" | "image-below" | "centered" | "full-bleed";

interface BannerDisplayProps {
  eventName: string;
  startDate: string;
  endDate: string;
  bannerUrl: string | null;
  bannerLayout: BannerLayout;
  bannerSettings?: Record<string, any>;
  eventSlug: string;
  isRegistered?: boolean;
  isLoggedIn?: boolean;
  eventId: string;
  requiresApproval?: boolean;
  participantTypes?: any[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function BannerImage({
  url,
  className,
}: {
  url: string | null;
  className?: string;
}) {
  if (!url) {
    return (
      <div
        className={cn(
          "bg-gradient-to-br from-primary/10 to-primary/5",
          className
        )}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="Event banner" className={cn("object-cover", className)} />
  );
}

function BannerRegisterSection({
  slug,
  isRegistered,
  isLoggedIn,
  eventId,
}: {
  slug: string;
  isRegistered: boolean;
  isLoggedIn: boolean;
  eventId: string;
  requiresApproval: boolean;
  participantTypes: any[];
}) {
  const [showSignIn, setShowSignIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSignIn() {
    setLoading(true);
    setError(null);

    if (!email || !password) {
      setError("Email and password are required");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // Check if registered for this event
    router.push("/dashboard");
    setLoading(false);
  }

  if (isRegistered) {
    return (
      <div className="space-y-3">
        <span className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white text-sm font-semibold rounded-lg">
          <Check className="h-4 w-4" />
          Already Registered
        </span>
        {isLoggedIn && (
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
            >
              Go to Dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <Link
          href={`/events/${slug}/register`}
          className="inline-block px-8 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:brightness-110 transition-all"
        >
          Register now
        </Link>
        {!isLoggedIn && (
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              onClick={() => setShowSignIn(true)}
              className="underline font-medium text-primary hover:text-primary/80"
            >
              Sign In
            </button>
          </p>
        )}
      </div>

      {/* Sign In Modal */}
      {showSignIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSignIn(false)}
          />
          <div className="relative z-10 w-full max-w-md mx-4 animate-scale-in">
            <Card className="text-left bg-white text-zinc-900 shadow-2xl">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-semibold">Sign in</h3>
                  <button
                    onClick={() => setShowSignIn(false)}
                    className="text-zinc-400 hover:text-zinc-600 p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-zinc-500 mb-4">
                  Welcome back! Sign in to access your events.
                </p>

                <div className="space-y-3">
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {error && <p className="text-sm text-red-600">{error}</p>}

                  <Button
                    onClick={handleSignIn}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>

                  <p className="text-center text-xs text-zinc-500">
                    Don&apos;t have an account?{" "}
                    <Link
                      href={`/events/${slug}/register`}
                      className="underline font-medium text-zinc-900"
                    >
                      Register
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

export function BannerDisplay({
  eventName,
  startDate,
  endDate,
  bannerUrl,
  bannerLayout,
  bannerSettings = {},
  eventSlug,
  isRegistered = false,
  isLoggedIn = false,
  eventId,
  requiresApproval = false,
  participantTypes = [],
}: BannerDisplayProps) {
  const dateRange = `${formatDate(startDate)} - ${formatDate(endDate)}`;
  const bgOpacity = (bannerSettings.bgOpacity ?? 30) / 100;
  const blur = bannerSettings.blur ?? 4;
  const overlayOpacity = (bannerSettings.overlayOpacity ?? 50) / 100;

  if (bannerLayout === "split") {
    const gradientOpacity = Math.max(0, 1 - bgOpacity);
    return (
      <div className="relative min-h-[520px] overflow-hidden">
        {bannerUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover scale-110" style={{ filter: `blur(${blur}px)`, opacity: bgOpacity }} />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(255,255,255,${gradientOpacity * 0.4}), rgba(255,255,255,${gradientOpacity * 0.8}))` }} />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/20" />
        )}
        <div className="relative z-10 flex max-w-5xl mx-auto my-14 rounded-xl overflow-hidden shadow-lg bg-background border border-border/60">
          <div className="w-[58%] relative min-h-[380px]">
            <BannerImage url={bannerUrl} className="w-full h-full absolute inset-0" />
          </div>
          <div className="w-[42%] flex flex-col justify-center px-10 py-14">
            <p className="text-sm text-muted-foreground mb-3">{dateRange}</p>
            <h1 className="text-3xl font-bold tracking-tight mb-10">{eventName}</h1>
            <div>
              <BannerRegisterSection slug={eventSlug} isRegistered={isRegistered} isLoggedIn={isLoggedIn} eventId={eventId} requiresApproval={requiresApproval} participantTypes={participantTypes} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (bannerLayout === "image-below") {
    const darkOverlay = Math.max(0.3, 0.9 - bgOpacity * 0.6);
    return (
      <div className="relative min-h-[560px] overflow-hidden">
        {bannerUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover scale-110" style={{ filter: `blur(${blur}px)`, opacity: bgOpacity }} />
            <div className="absolute inset-0" style={{ backgroundColor: `rgba(30,41,59,${darkOverlay})` }} />
          </>
        ) : (
          <div className="absolute inset-0 bg-slate-800" />
        )}
        <div className="relative z-10 max-w-5xl mx-auto pt-14 pb-14 px-6">
          <div className="flex items-center justify-between mb-10 text-white">
            <div>
              <p className="text-sm text-white/60 mb-2">{dateRange}</p>
              <h1 className="text-4xl font-bold tracking-tight">{eventName}</h1>
            </div>
            <BannerRegisterSection slug={eventSlug} isRegistered={isRegistered} isLoggedIn={isLoggedIn} eventId={eventId} requiresApproval={requiresApproval} participantTypes={participantTypes} />
          </div>
          <div className="rounded-xl overflow-hidden shadow-lg">
            <BannerImage url={bannerUrl} className="w-full h-[380px]" />
          </div>
        </div>
      </div>
    );
  }

  if (bannerLayout === "centered") {
    const darkOverlay = Math.max(0.3, 0.9 - bgOpacity * 0.6);
    return (
      <div className="relative min-h-[580px] overflow-hidden">
        {bannerUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover scale-110" style={{ filter: `blur(${blur}px)`, opacity: bgOpacity }} />
            <div className="absolute inset-0" style={{ backgroundColor: `rgba(30,41,59,${darkOverlay})` }} />
          </>
        ) : (
          <div className="absolute inset-0 bg-slate-800" />
        )}
        <div className="relative z-10 max-w-5xl mx-auto pt-14 pb-14 px-6 text-center text-white">
          <h1 className="text-5xl font-bold tracking-tight mb-3">{eventName}</h1>
          <p className="text-sm text-white/60 mb-8">{dateRange}</p>
          <BannerRegisterSection slug={eventSlug} isRegistered={isRegistered} isLoggedIn={isLoggedIn} eventId={eventId} requiresApproval={requiresApproval} participantTypes={participantTypes} />
          <div className="mt-10 rounded-xl overflow-hidden shadow-lg max-w-4xl mx-auto">
            <BannerImage url={bannerUrl} className="w-full h-[380px]" />
          </div>
        </div>
      </div>
    );
  }

  // full-bleed
  return (
    <div className="relative min-h-[520px] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <BannerImage url={bannerUrl} className="w-full h-full" />
      </div>
      <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }} />
      <div className="relative z-10 text-center text-white px-10 py-16">
        <p className="text-sm text-white/70 mb-3">{dateRange}</p>
        <h1 className="text-4xl font-bold tracking-tight mb-8">{eventName}</h1>
        <BannerRegisterSection slug={eventSlug} isRegistered={isRegistered} isLoggedIn={isLoggedIn} eventId={eventId} requiresApproval={requiresApproval} participantTypes={participantTypes} />
      </div>
    </div>
  );
}
