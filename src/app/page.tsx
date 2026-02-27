import { ArrowRight, Zap, Calendar, Users, MessageSquare, BarChart3, Shield, Globe, UserCog, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 glass">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-[13px] shadow-sm">
              B2
            </div>
            <span className="text-[18px] font-bold tracking-tight text-foreground">B2Pair</span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button className="rounded-full px-6">
                  Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/auth/sign-in">
                  <Button variant="ghost" className="text-muted-foreground">Sign in</Button>
                </Link>
                <Link href="/auth/sign-up">
                  <Button className="rounded-full px-6 shadow-md shadow-primary/20">
                    Get started free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-40 pb-28 px-6 bg-gradient-hero">
        <div className="mx-auto max-w-4xl text-center">
          {/* Pill */}
          <div className="mb-8 inline-flex items-center gap-2.5 rounded-full bg-primary/8 border border-primary/15 px-5 py-2 text-[13px] font-medium text-primary animate-fade-in">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered event matchmaking
          </div>

          <h1 className="text-display tracking-tight text-foreground animate-slide-up sm:text-[76px] sm:leading-[1]">
            The right people,
            <br />
            <span className="text-gradient">the right meetings</span>
          </h1>

          <p className="mt-8 text-body-lg text-muted-foreground max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "100ms" }}>
            B2Pair is the matchmaking platform for event organizers who want to deliver 
            exceptional networking experiences. Create your event, share a link, and let AI 
            connect attendees with their most valuable contacts.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <Link href="/auth/sign-up">
              <Button size="lg" className="rounded-full text-[16px] h-14 px-10 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all">
                Create your first event
                <ArrowRight className="ml-2.5 h-4.5 w-4.5" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="outline" size="lg" className="rounded-full text-[16px] h-14 px-10 border-border-strong">
                How it works
              </Button>
            </Link>
          </div>

          <div className="mt-6 flex items-center justify-center gap-6 text-caption text-muted-foreground animate-fade-in" style={{ animationDelay: "400ms" }}>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Free to start</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> No credit card</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> 2-min setup</span>
          </div>
        </div>
      </section>

      {/* Logos / Social Proof */}
      <section className="py-16 px-6 border-b border-border">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-3 gap-12 text-center">
            <div>
              <p className="text-[48px] font-extrabold tracking-tight text-foreground leading-none">10x</p>
              <p className="mt-2 text-body text-muted-foreground">More relevant meetings</p>
            </div>
            <div>
              <p className="text-[48px] font-extrabold tracking-tight text-foreground leading-none">85%</p>
              <p className="mt-2 text-body text-muted-foreground">Match satisfaction</p>
            </div>
            <div>
              <p className="text-[48px] font-extrabold tracking-tight text-foreground leading-none">2min</p>
              <p className="mt-2 text-body text-muted-foreground">Event setup time</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-28 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-20">
            <p className="text-caption font-semibold text-primary uppercase tracking-[0.15em] mb-4">How it works</p>
            <h2 className="text-h1 tracking-tight sm:text-[48px] sm:leading-[1.08]">
              Simpler than you think
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                num: "01",
                title: "Create your event",
                desc: "Set up your event page with participant types, matching rules, and branding. Takes under 2 minutes.",
                color: "bg-primary/8 text-primary",
              },
              {
                num: "02",
                title: "Invite participants",
                desc: "Share your event link. Attendees register, pick their role, and build their profile in one flow.",
                color: "bg-accent/8 text-accent",
              },
              {
                num: "03",
                title: "AI matches them",
                desc: "Our algorithm scores every pair and surfaces the best connections. One-click meeting scheduling does the rest.",
                color: "bg-warning/8 text-warning",
              },
            ].map((step) => (
              <div key={step.num} className="relative">
                <div className={`inline-flex items-center justify-center h-12 w-12 rounded-2xl ${step.color} text-[15px] font-bold mb-6`}>
                  {step.num}
                </div>
                <h3 className="text-h2 mb-3">{step.title}</h3>
                <p className="text-body text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features - Organizers */}
      <section className="py-28 px-6 bg-gradient-section">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-20">
            <p className="text-caption font-semibold text-primary uppercase tracking-[0.15em] mb-4">For organizers</p>
            <h2 className="text-h1 tracking-tight sm:text-[48px] sm:leading-[1.08]">
              Your entire event toolkit
            </h2>
            <p className="mt-5 text-body-lg text-muted-foreground max-w-xl mx-auto">
              From registration to post-event analytics, everything you need in one platform.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Hero card - spans 2 */}
            <div className="sm:col-span-2 bg-card rounded-2xl border border-border p-10 card-hover shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-6">
                <Zap className="h-7 w-7" />
              </div>
              <h3 className="text-h2 mb-3">AI Matchmaking Engine</h3>
              <p className="text-body-lg text-muted-foreground leading-relaxed max-w-lg">
                Multi-factor scoring based on intent, industry, expertise, and complementarity. 
                Configurable weights and filters so every event gets the perfect matching logic.
              </p>
            </div>

            <FeatureCard
              icon={<Globe className="h-5 w-5" />}
              title="Event Pages"
              description="Beautiful, branded registration pages. Share one link and you're done."
            />

            <FeatureCard
              icon={<UserCog className="h-5 w-5" />}
              title="Custom Roles"
              description="Buyer, Seller, Speaker, Sponsor. Each with their own permissions and flows."
            />

            <FeatureCard
              icon={<Calendar className="h-5 w-5" />}
              title="Scheduling"
              description="Availability management, one-click booking, reminders, and conflict detection."
            />

            <FeatureCard
              icon={<Users className="h-5 w-5" />}
              title="Management"
              description="Approve registrations, view engagement, and control who connects with whom."
            />

            <FeatureCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="Analytics"
              description="Track matches, meetings, satisfaction, and engagement. Prove ROI with real data."
            />

            <FeatureCard
              icon={<MessageSquare className="h-5 w-5" />}
              title="Messaging"
              description="Built-in chat so participants can connect before, during, and after the event."
            />
          </div>
        </div>
      </section>

      {/* For Participants */}
      <section className="py-28 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-20">
            <p className="text-caption font-semibold text-accent uppercase tracking-[0.15em] mb-4">For participants</p>
            <h2 className="text-h1 tracking-tight sm:text-[48px] sm:leading-[1.08]">
              Networking that actually works
            </h2>
            <p className="mt-5 text-body-lg text-muted-foreground max-w-xl mx-auto">
              No more wandering the floor hoping to bump into the right person.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div className="bg-card rounded-2xl border border-border p-8 card-hover shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/8 text-accent mb-6">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="text-h2 mb-3">Smart Matches</h3>
              <p className="text-body text-muted-foreground leading-relaxed">
                AI suggests your most valuable connections with clear explanations of why you should meet.
              </p>
            </div>

            <div className="bg-card rounded-2xl border border-border p-8 card-hover shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/8 text-accent mb-6">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h3 className="text-h2 mb-3">Direct Chat</h3>
              <p className="text-body text-muted-foreground leading-relaxed">
                Message your matches before the event. Share context, align on goals, and make meetings count.
              </p>
            </div>

            <div className="bg-card rounded-2xl border border-border p-8 card-hover shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/8 text-accent mb-6">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="text-h2 mb-3">Your Privacy</h3>
              <p className="text-body text-muted-foreground leading-relaxed">
                Full control over what's visible. Email, phone, company details—share exactly what you want.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/[0.03]" />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="text-h1 tracking-tight sm:text-[48px] sm:leading-[1.08]">
            Ready to transform
            <br />
            your events?
          </h2>
          <p className="mt-6 text-body-lg text-muted-foreground max-w-md mx-auto">
            Join organizers who are delivering measurably better networking experiences. Free to start, no strings attached.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/sign-up">
              <Button size="lg" className="rounded-full text-[16px] h-14 px-10 shadow-lg shadow-primary/20">
                Create your first event
                <ArrowRight className="ml-2.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-[12px]">
              B2
            </div>
            <span className="text-[15px] font-semibold">B2Pair</span>
          </div>
          <p className="text-caption text-muted-foreground">
            &copy; {new Date().getFullYear()} B2Pair. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border p-8 card-hover shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/8 text-primary mb-5">
        {icon}
      </div>
      <h3 className="text-h3 font-semibold mb-2">{title}</h3>
      <p className="text-caption text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
