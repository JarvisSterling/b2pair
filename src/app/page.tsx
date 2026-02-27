import { ArrowRight, Zap, Calendar, Users, MessageSquare, BarChart3, Shield, Globe, UserCog, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 glass-nav">
        <div className="mx-auto max-w-[1200px] flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-foreground">
              <rect width="24" height="24" rx="6" fill="currentColor" />
              <text x="4" y="17" fill="hsl(var(--primary-foreground))" fontSize="12" fontWeight="700" fontFamily="var(--font-geist-sans)">B2</text>
            </svg>
            <span className="text-[15px] font-semibold">B2Pair</span>
          </Link>

          <div className="hidden sm:flex items-center gap-8 text-[14px] text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-foreground transition-colors">How it works</Link>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button size="sm" className="rounded-lg h-9 px-4 text-[13px]">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/auth/sign-in">
                  <Button variant="ghost" size="sm" className="text-[13px] text-muted-foreground">Sign In</Button>
                </Link>
                <Link href="/auth/sign-up">
                  <Button size="sm" className="rounded-lg h-9 px-4 text-[13px]">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-[160px] pb-[120px] px-6 relative overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 grid-bg opacity-40" />
        {/* Gradient orbs */}
        <div className="absolute top-[100px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-[200px] left-1/3 w-[300px] h-[300px] bg-purple/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative mx-auto max-w-[800px] text-center">
          {/* Badge */}
          <Link href="#features" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-[13px] text-muted-foreground hover:text-foreground hover:border-border-strong transition-all mb-8 animate-fade-in">
            <span className="gradient-badge font-medium">New</span>
            AI matchmaking for B2B events
            <ChevronRight className="h-3 w-3" />
          </Link>

          <h1 className="text-display animate-slide-up sm:text-[80px]">
            Connect the
            <br />
            right people.
          </h1>

          <p className="mt-6 text-body-lg text-muted-foreground max-w-[560px] mx-auto animate-slide-up" style={{ animationDelay: "80ms" }}>
            B2Pair matches your event attendees with the people they should actually meet. Powered by AI. Scheduled in one click.
          </p>

          <div className="mt-10 flex items-center justify-center gap-3 animate-slide-up" style={{ animationDelay: "160ms" }}>
            <Link href="/auth/sign-up">
              <Button size="lg" className="rounded-lg h-12 px-8 text-[15px] font-medium">
                Start Building
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="outline" size="lg" className="rounded-lg h-12 px-8 text-[15px] font-medium">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Metrics bar */}
      <section className="border-y border-border">
        <div className="mx-auto max-w-[1200px] grid grid-cols-3 divide-x divide-border">
          {[
            { value: "10x", label: "More relevant meetings" },
            { value: "85%", label: "Match satisfaction rate" },
            { value: "2min", label: "Event setup time" },
          ].map((m) => (
            <div key={m.value} className="py-10 px-8 text-center">
              <p className="text-[40px] font-bold tracking-tight leading-none font-mono">{m.value}</p>
              <p className="mt-2 text-caption text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-[120px] px-6">
        <div className="mx-auto max-w-[1200px]">
          <div className="max-w-[600px] mb-16">
            <p className="text-caption font-mono text-muted-foreground uppercase tracking-wider mb-3">How it works</p>
            <h2 className="text-h1 tracking-tight">Three commands.<br />Zero friction.</h2>
          </div>

          <div className="grid gap-px bg-border sm:grid-cols-3 rounded-lg overflow-hidden border border-border">
            {[
              {
                num: "01",
                title: "Create",
                desc: "Set up your event with participant types, matching rules, and branding. Deploy your event page in under 2 minutes.",
                icon: <Globe className="h-5 w-5" />,
              },
              {
                num: "02",
                title: "Invite",
                desc: "Share one link. Participants register, pick their role, and build a profile. No app downloads required.",
                icon: <Users className="h-5 w-5" />,
              },
              {
                num: "03",
                title: "Match",
                desc: "AI scores every participant pair on intent, industry, and expertise. One-click scheduling handles the rest.",
                icon: <Zap className="h-5 w-5" />,
              },
            ].map((step) => (
              <div key={step.num} className="bg-card p-10">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-caption font-mono text-muted-foreground">{step.num}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-foreground mb-5">
                  {step.icon}
                </div>
                <h3 className="text-h2 mb-3">{step.title}</h3>
                <p className="text-body text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-[120px] px-6 border-t border-border">
        <div className="mx-auto max-w-[1200px]">
          <div className="max-w-[600px] mb-16">
            <p className="text-caption font-mono text-muted-foreground uppercase tracking-wider mb-3">Features</p>
            <h2 className="text-h1 tracking-tight">Everything you need.<br />Nothing you don&apos;t.</h2>
          </div>

          {/* Feature grid */}
          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3 rounded-lg overflow-hidden border border-border">
            {[
              { icon: <Zap className="h-5 w-5" />, title: "AI Matching", desc: "Multi-factor scoring on intent, industry, expertise, and complementarity. Configurable weights." },
              { icon: <Globe className="h-5 w-5" />, title: "Event Pages", desc: "Custom branded registration pages. One link for participants to register and build profiles." },
              { icon: <UserCog className="h-5 w-5" />, title: "Custom Roles", desc: "Buyer, Seller, Speaker, Sponsor — each with unique permissions and approval workflows." },
              { icon: <Calendar className="h-5 w-5" />, title: "Scheduling", desc: "Availability management, one-click booking, conflict detection, and automatic reminders." },
              { icon: <BarChart3 className="h-5 w-5" />, title: "Analytics", desc: "Track registrations, match rates, meetings booked, and satisfaction scores in real-time." },
              { icon: <MessageSquare className="h-5 w-5" />, title: "Messaging", desc: "Built-in chat between matched participants. Share context before you meet in person." },
              { icon: <Users className="h-5 w-5" />, title: "Management", desc: "Approve registrations, view engagement metrics, and control the entire attendee lifecycle." },
              { icon: <Shield className="h-5 w-5" />, title: "Privacy", desc: "Participants control exactly what's visible. Granular privacy settings for every profile field." },
              { icon: <Zap className="h-5 w-5" />, title: "Real-time", desc: "Live updates on matches, messages, and meeting confirmations via WebSocket connections." },
            ].map((f) => (
              <div key={f.title} className="bg-card p-8 group">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-muted-foreground group-hover:text-foreground transition-colors mb-5">
                  {f.icon}
                </div>
                <h3 className="text-h3 mb-2">{f.title}</h3>
                <p className="text-body text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-[120px] px-6 border-t border-border relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-[600px] text-center">
          <h2 className="text-h1 tracking-tight">
            Start matching<br />in minutes.
          </h2>
          <p className="mt-5 text-body-lg text-muted-foreground max-w-[440px] mx-auto">
            Free to start. No credit card. Create your first event and see the matches roll in.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link href="/auth/sign-up">
              <Button size="lg" className="rounded-lg h-12 px-8 text-[15px] font-medium">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="mx-auto max-w-[1200px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-foreground">
              <rect width="24" height="24" rx="6" fill="currentColor" />
              <text x="4" y="17" fill="hsl(var(--primary-foreground))" fontSize="12" fontWeight="700" fontFamily="var(--font-geist-sans)">B2</text>
            </svg>
            <span className="text-[13px] font-medium text-muted-foreground">B2Pair</span>
          </div>
          <p className="text-[13px] text-muted-foreground">
            &copy; {new Date().getFullYear()} B2Pair
          </p>
        </div>
      </footer>
    </div>
  );
}
