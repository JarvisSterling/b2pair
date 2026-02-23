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

                  <div className="relative my-1">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200" /></div>
                    <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-zinc-400">or</span></div>
                  </div>

                  <button
                    onClick={async () => {
                      const supabase = createClient();
                      await supabase.auth.signInWithOAuth({
                        provider: "linkedin_oidc",
                        options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
                      });
                    }}
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors text-sm font-medium"
                  >
                    <svg className="h-4 w-4 text-[#0077B5]" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    Continue with LinkedIn
                  </button>

                  <button
                    onClick={async () => {
                      const supabase = createClient();
                      await supabase.auth.signInWithOAuth({
                        provider: "google",
                        options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
                      });
                    }}
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors text-sm font-medium"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Continue with Google
                  </button>

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
