import { ArrowRight, Zap, Calendar, Users, MessageSquare, BarChart3, Shield, Globe, UserCog, Layers, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 glass">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary text-white text-small font-bold">
              B2
            </div>
            <span className="text-h3 font-bold tracking-tight">B2Pair</span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button className="gradient-primary text-white border-0">
                  Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/auth/sign-in">
                  <Button variant="ghost" className="text-muted-foreground hover:text-foreground">Sign in</Button>
                </Link>
                <Link href="/auth/sign-up">
                  <Button className="gradient-primary text-white border-0 shadow-lg shadow-primary/25">
                    Get started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-36 pb-24 px-6">
        {/* Background effects */}
        <div className="absolute inset-0 dot-pattern opacity-30" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

        <div className="relative mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-caption text-primary animate-fade-in">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered B2B matchmaking
          </div>

          <h1 className="text-display tracking-tight animate-slide-up sm:text-[72px] sm:leading-[1.02]">
            <span className="gradient-text">Turn your events</span>
            <br />
            into high-value
            <br />
            connections
          </h1>

          <p className="mt-8 text-body text-muted-foreground leading-relaxed max-w-xl mx-auto sm:text-[18px] animate-slide-up" style={{ animationDelay: "100ms" }}>
            Create your event, share the link, and let our AI connect the right people automatically. Smart matchmaking for conferences, trade shows, and B2B events.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <Link href="/auth/sign-up">
              <Button size="lg" className="gradient-primary text-white border-0 text-[15px] h-13 px-8 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow">
                Create your first event
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="outline" size="lg" className="text-[15px] h-13 px-8 border-border-strong">
                See how it works
              </Button>
            </Link>
          </div>

          <p className="mt-5 text-caption text-muted-foreground animate-fade-in" style={{ animationDelay: "300ms" }}>
            Free to start &middot; No credit card required
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="relative border-y border-border py-12 px-6">
        <div className="mx-auto max-w-4xl grid grid-cols-3 gap-8">
          <div className="text-center">
            <p className="text-h1 font-bold tracking-tight gradient-text">10x</p>
            <p className="mt-1 text-caption text-muted-foreground">More relevant meetings</p>
          </div>
          <div className="text-center">
            <p className="text-h1 font-bold tracking-tight gradient-text">85%</p>
            <p className="mt-1 text-caption text-muted-foreground">Match satisfaction rate</p>
          </div>
          <div className="text-center">
            <p className="text-h1 font-bold tracking-tight gradient-text">2min</p>
            <p className="mt-1 text-caption text-muted-foreground">Event setup time</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-caption font-semibold text-primary uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-h1 font-bold tracking-tight sm:text-[44px] sm:leading-[1.1]">
              Three steps to better events
            </h2>
            <p className="mt-4 text-body text-muted-foreground max-w-lg mx-auto">
              Set up in minutes. Your participants do the rest.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Create your event",
                description: "Set up your event page, define participant types, and configure matching rules. Takes under 2 minutes.",
                icon: <Layers className="h-5 w-5" />,
              },
              {
                step: "02",
                title: "Share the link",
                description: "Participants register through your event page. They pick their role, create a profile, and they're in.",
                icon: <Globe className="h-5 w-5" />,
              },
              {
                step: "03",
                title: "AI does the matching",
                description: "Our algorithm scores every pair and recommends the most valuable connections. One-click meeting scheduling.",
                icon: <Zap className="h-5 w-5" />,
              },
            ].map((item) => (
              <div key={item.step} className="group relative rounded-xl border border-border bg-card p-8 glow-card">
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary text-white">
                    {item.icon}
                  </div>
                  <span className="text-caption font-bold text-muted-foreground">{item.step}</span>
                </div>
                <h3 className="text-h2 font-semibold mb-3">{item.title}</h3>
                <p className="text-body text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Features - Organizers */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-surface/50" />
        <div className="relative mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-caption font-semibold text-primary uppercase tracking-widest mb-3">For organizers</p>
            <h2 className="text-h1 font-bold tracking-tight sm:text-[44px] sm:leading-[1.1]">
              Everything you need to run
              <br />
              world-class B2B events
            </h2>
          </div>

          {/* Bento Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Large card */}
            <div className="sm:col-span-2 rounded-xl border border-border bg-card p-8 glow-card">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl gradient-primary text-white">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-h2 font-semibold mb-2">AI Matchmaking Engine</h3>
              <p className="text-body text-muted-foreground leading-relaxed max-w-md">
                Multi-factor scoring based on intent, industry, expertise, and complementarity. Configurable weights and filters. Your participants get the most relevant connections, automatically.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-8 glow-card">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Globe className="h-5 w-5" />
              </div>
              <h3 className="text-h3 font-semibold mb-2">Custom Event Pages</h3>
              <p className="text-caption text-muted-foreground leading-relaxed">
                Beautiful registration pages with your branding, participant types, and custom sections.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-8 glow-card">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UserCog className="h-5 w-5" />
              </div>
              <h3 className="text-h3 font-semibold mb-2">Flexible Roles</h3>
              <p className="text-caption text-muted-foreground leading-relaxed">
                Define custom roles like Buyer, Seller, Speaker, Sponsor. Each with their own permissions.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-8 glow-card">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="text-h3 font-semibold mb-2">Meeting Scheduling</h3>
              <p className="text-caption text-muted-foreground leading-relaxed">
                One-click booking with availability, auto-scheduling, reminders, and conflict detection.
              </p>
            </div>

            <div className="sm:col-span-2 lg:col-span-1 rounded-xl border border-border bg-card p-8 glow-card">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="text-h3 font-semibold mb-2">Event Analytics</h3>
              <p className="text-caption text-muted-foreground leading-relaxed">
                Track registrations, match rates, meetings scheduled. Prove event ROI with real data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Participants */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-caption font-semibold text-primary uppercase tracking-widest mb-3">For participants</p>
            <h2 className="text-h1 font-bold tracking-tight sm:text-[44px] sm:leading-[1.1]">
              Your participants will love it
            </h2>
            <p className="mt-4 text-body text-muted-foreground max-w-lg mx-auto">
              A smooth, modern experience that makes networking feel effortless.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-8 glow-card">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="text-h3 font-semibold mb-2">Smart Recommendations</h3>
              <p className="text-caption text-muted-foreground leading-relaxed">
                AI-powered match suggestions with explanations. Browse recommendations or the full directory.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-8 glow-card">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h3 className="text-h3 font-semibold mb-2">In-app Messaging</h3>
              <p className="text-caption text-muted-foreground leading-relaxed">
                Chat with matches before the event. Share files and prepare for productive meetings.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-8 glow-card">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="text-h3 font-semibold mb-2">Privacy Controls</h3>
              <p className="text-caption text-muted-foreground leading-relaxed">
                Control what's visible on your profile. Email, phone, company details, all configurable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-surface/50" />
        <div className="absolute inset-0 dot-pattern opacity-20" />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="text-h1 font-bold tracking-tight sm:text-[44px] sm:leading-[1.1]">
            Ready to run
            <br />
            <span className="gradient-text">smarter events?</span>
          </h2>
          <p className="mt-6 text-body text-muted-foreground max-w-md mx-auto">
            Create your first event in under 2 minutes. Your participants register through your custom event page. The AI handles the rest.
          </p>
          <div className="mt-10">
            <Link href="/auth/sign-up">
              <Button size="lg" className="gradient-primary text-white border-0 text-[15px] h-13 px-10 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow">
                Create your first event
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-primary text-white text-small font-bold">
              B2
            </div>
            <span className="text-caption font-semibold">B2Pair</span>
          </div>
          <p className="text-caption text-muted-foreground">
            &copy; {new Date().getFullYear()} B2Pair. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
