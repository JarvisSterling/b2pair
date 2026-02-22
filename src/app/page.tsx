import { ArrowRight, Zap, Calendar, Users, MessageSquare, BarChart3, Shield, Globe, UserCog, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 glass">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-small font-bold">
              B2
            </div>
            <span className="text-h3 font-semibold tracking-tight">B2Pair</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/sign-in">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button>
                Create your event
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="mx-auto max-w-3xl text-center animate-fade-in">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-caption text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Now in beta
          </div>

          <h1 className="text-display tracking-tight text-foreground sm:text-[48px] sm:leading-[1.08]">
            Turn your events into
            <br />
            high-value connections
          </h1>

          <p className="mt-6 text-body text-muted-foreground leading-relaxed max-w-xl mx-auto sm:text-[17px]">
            The AI-powered matchmaking platform for event organizers.
            Create your event, share the link, and let our algorithm
            connect the right people automatically.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/auth/sign-up">
              <Button size="lg" className="text-[15px] h-12 px-8">
                Create your first event
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="secondary" size="lg" className="text-[15px] h-12 px-8">
                See how it works
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-caption text-muted-foreground">
            Free to start. No credit card required.
          </p>
        </div>
      </section>

      {/* Social proof strip */}
      <section className="border-y border-border py-8 px-6">
        <div className="mx-auto max-w-4xl flex items-center justify-center gap-12 text-center">
          <div>
            <p className="text-h1 font-semibold tracking-tight">10x</p>
            <p className="text-caption text-muted-foreground">More relevant meetings</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <p className="text-h1 font-semibold tracking-tight">85%</p>
            <p className="text-caption text-muted-foreground">Match satisfaction rate</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <p className="text-h1 font-semibold tracking-tight">2min</p>
            <p className="text-caption text-muted-foreground">Event setup time</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-6 bg-surface">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-h1 font-semibold tracking-tight sm:text-display">
              Three steps to better events
            </h2>
            <p className="mt-4 text-body text-muted-foreground max-w-lg mx-auto">
              Set up in minutes. Your participants do the rest.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <StepCard
              step="1"
              title="Create your event"
              description="Set up your event page, define participant types (Buyer, Seller, Speaker), and configure matching rules."
            />
            <StepCard
              step="2"
              title="Share the link"
              description="Participants register through your event page. They pick their role, create a profile, and they're in."
            />
            <StepCard
              step="3"
              title="AI does the matching"
              description="Our algorithm scores every participant pair and recommends the most valuable connections. They schedule meetings with one click."
            />
          </div>
        </div>
      </section>

      {/* For Organizers */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-h1 font-semibold tracking-tight sm:text-display">
              Built for event organizers
            </h2>
            <p className="mt-4 text-body text-muted-foreground max-w-lg mx-auto">
              Everything you need to run B2B matchmaking events, from
              registration to post-event analytics.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Globe className="h-5 w-5" />}
              title="Custom Event Pages"
              description="Beautiful registration pages with your event details, participant types, and custom sections. Share one link."
            />
            <FeatureCard
              icon={<UserCog className="h-5 w-5" />}
              title="Flexible Participant Types"
              description="Define custom roles like Buyer, Seller, Speaker, Sponsor. Each with their own permissions and approval settings."
            />
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="AI Matchmaking Engine"
              description="Multi-factor scoring based on intent, industry, expertise, and complementarity. Configurable weights and filters."
            />
            <FeatureCard
              icon={<Calendar className="h-5 w-5" />}
              title="Meeting Scheduling"
              description="Participants set availability and book meetings with one click. Auto-scheduling, reminders, and conflict detection."
            />
            <FeatureCard
              icon={<Users className="h-5 w-5" />}
              title="Participant Management"
              description="Approve registrations, view profiles, track engagement. Full control over who attends and how they connect."
            />
            <FeatureCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="Event Analytics"
              description="Track registrations, match rates, meetings scheduled, and participant satisfaction. Prove event ROI."
            />
          </div>
        </div>
      </section>

      {/* For Participants */}
      <section className="py-20 px-6 bg-surface">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-h1 font-semibold tracking-tight sm:text-display">
              Your participants will love it
            </h2>
            <p className="mt-4 text-body text-muted-foreground max-w-lg mx-auto">
              A smooth, modern experience that makes networking feel effortless.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="Smart Recommendations"
              description="AI-powered match suggestions with explanations. Swipe through recommendations or browse the full directory."
            />
            <FeatureCard
              icon={<MessageSquare className="h-5 w-5" />}
              title="In-app Messaging"
              description="Chat with matches before the event. Share files, exchange contacts, and prepare for productive meetings."
            />
            <FeatureCard
              icon={<Shield className="h-5 w-5" />}
              title="Privacy Controls"
              description="Participants control what's visible on their profile. Email, phone, company details, all configurable."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-h1 font-semibold tracking-tight sm:text-display">
            Ready to run smarter events?
          </h2>
          <p className="mt-4 text-body text-muted-foreground">
            Create your first event in under 2 minutes. Your participants register
            through your custom event page. The AI handles the rest.
          </p>
          <div className="mt-8">
            <Link href="/auth/sign-up">
              <Button size="lg" className="text-[15px] h-12 px-8">
                Create your first event
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground text-small font-bold">
              B2
            </div>
            <span className="text-caption font-medium">B2Pair</span>
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
    <div className="rounded-lg border border-border bg-card p-6 transition-shadow duration-150 hover:shadow-md">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary/5 text-primary">
        {icon}
      </div>
      <h3 className="text-h3 font-semibold mb-2">{title}</h3>
      <p className="text-caption text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-body font-semibold">
        {step}
      </div>
      <h3 className="text-h3 font-semibold mb-2">{title}</h3>
      <p className="text-caption text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
