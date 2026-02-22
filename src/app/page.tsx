import { ArrowRight, Zap, Calendar, Users, MessageSquare, BarChart3, Shield } from "lucide-react";
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
                Get started
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
            Connect the right people
            <br />
            at your business events
          </h1>

          <p className="mt-6 text-body text-muted-foreground leading-relaxed max-w-xl mx-auto sm:text-[17px]">
            AI-powered matchmaking that understands what your attendees need
            and connects them with the people who matter most. More meetings,
            better connections, measurable ROI.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/auth/sign-up">
              <Button size="lg" className="text-[15px] h-12 px-8">
                Start for free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="secondary" size="lg" className="text-[15px] h-12 px-8">
                See how it works
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-caption text-muted-foreground">
            Free for events up to 50 participants. No credit card required.
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
            <p className="text-caption text-muted-foreground">Average setup time</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-h1 font-semibold tracking-tight sm:text-display">
              Everything you need for
              <br />
              meaningful connections
            </h2>
            <p className="mt-4 text-body text-muted-foreground max-w-lg mx-auto">
              From AI matching to meeting scheduling, B2Pair handles the entire
              networking experience so you can focus on what matters.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="AI Matchmaking"
              description="Multi-factor scoring algorithm that matches attendees based on intent, industry, expertise, and complementarity."
            />
            <FeatureCard
              icon={<Calendar className="h-5 w-5" />}
              title="Smart Scheduling"
              description="One-click meeting requests with availability management, conflict detection, and automated reminders."
            />
            <FeatureCard
              icon={<Users className="h-5 w-5" />}
              title="Participant Directory"
              description="Searchable directory with rich profiles, expertise tags, and quick actions to connect."
            />
            <FeatureCard
              icon={<MessageSquare className="h-5 w-5" />}
              title="Real-time Messaging"
              description="In-app chat between matched participants with instant delivery and conversation history."
            />
            <FeatureCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="Analytics Dashboard"
              description="Track engagement, meeting completion rates, match effectiveness, and attendee satisfaction."
            />
            <FeatureCard
              icon={<Shield className="h-5 w-5" />}
              title="Organizer Control"
              description="Full control over matching rules, registration approval, participant management, and event settings."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-surface">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-h1 font-semibold tracking-tight sm:text-display">
              How it works
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <StepCard
              step="1"
              title="Create your event"
              description="Set up your event in minutes. Configure matching rules, branding, and registration settings."
            />
            <StepCard
              step="2"
              title="Invite participants"
              description="Share your event link. Attendees register and complete their profile with interests and goals."
            />
            <StepCard
              step="3"
              title="Let AI connect them"
              description="Our algorithm generates personalized match recommendations. Participants schedule meetings with one click."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-h1 font-semibold tracking-tight sm:text-display">
            Ready to transform your events?
          </h2>
          <p className="mt-4 text-body text-muted-foreground">
            Create your first event in under 2 minutes. Free for up to 50 participants.
          </p>
          <div className="mt-8">
            <Link href="/auth/sign-up">
              <Button size="lg" className="text-[15px] h-12 px-8">
                Get started for free
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
