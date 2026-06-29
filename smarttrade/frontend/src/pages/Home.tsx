import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { FadeIn } from '@/components/ui/Motion';
import {
  ShieldCheckIcon, SpeedIcon, DeliveryIcon, SupportIcon,
  ArrowRightIcon, PackageIcon, CreditCardIcon, StarIcon,
  CheckCircleIcon, TruckIcon, LogoMark, UserIcon, CartIcon,
  SecureIcon,
} from '@/components/ui/Icons';

// ─── Animated floating orb ────────────────────────────────────────────────────

function Orb({ className }: { className: string }) {
  return <div className={`absolute rounded-full blur-3xl opacity-30 ${className}`} />;
}

// ─── Stat counter card ────────────────────────────────────────────────────────

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="glass-card rounded-2xl px-6 py-5 text-center text-white">
      <p className="text-3xl font-extrabold">{value}</p>
      <p className="mt-1 text-sm text-white/70">{label}</p>
    </div>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────

interface FeatureCardProps {
  icon:        React.ReactNode;
  title:       string;
  description: string;
  accent:      string;
}

function FeatureCard({ icon, title, description, accent }: FeatureCardProps) {
  return (
    <div
      className="group relative flex flex-col gap-4 rounded-2xl border border-neutral-100
                 bg-white dark:bg-neutral-100 p-7 shadow-sm transition-all duration-300
                 hover:-translate-y-1 hover:shadow-lg hover:border-primary/20"
    >
      {/* Accent gradient background on hover */}
      <div className={`absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${accent}`} />

      <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/8 text-primary transition-colors duration-300 group-hover:bg-primary/12">
        {icon}
      </div>

      <div className="relative z-10">
        <h3 className="text-lg font-bold text-neutral-900">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">{description}</p>
      </div>
    </div>
  );
}

// ─── Step card ────────────────────────────────────────────────────────────────

function StepCard({ number, icon, title, description }: {
  number: string; icon: React.ReactNode; title: string; description: string;
}) {
  return (
    <div className="relative flex flex-col items-center gap-4 text-center">
      {/* Connector line (hidden for last) */}
      <div className="absolute left-1/2 top-10 -z-10 hidden h-0.5 w-full -translate-y-1/2 bg-gradient-to-r from-primary/30 to-transparent md:block last:hidden" />

      <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/8 text-primary ring-4 ring-white">
        {icon}
        <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
          {number}
        </span>
      </div>

      <div>
        <h3 className="font-bold text-neutral-900">{title}</h3>
        <p className="mt-1 max-w-[180px] text-sm text-neutral-500">{description}</p>
      </div>
    </div>
  );
}

// ─── Testimonial card ─────────────────────────────────────────────────────────

function TestimonialCard({ name, location, text }: { name: string; location: string; text: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-neutral-100 bg-white dark:bg-neutral-100 p-6 shadow-sm">
      <div className="flex gap-1 text-amber-400">
        {Array(5).fill(null).map((_, i) => <StarIcon key={i} size={16} className="fill-current" />)}
      </div>
      <p className="text-sm leading-relaxed text-neutral-600 italic">"{text}"</p>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
          {name[0]}
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-900">{name}</p>
          <p className="text-xs text-neutral-400">{location}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="flex flex-col overflow-hidden">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[85vh] overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-primary-light">
        {/* Background orbs */}
        <Orb className="h-96 w-96 bg-white/20 -top-20 -right-20 animate-[float_6s_ease-in-out_infinite]" />
        <Orb className="h-64 w-64 bg-primary-light/40 bottom-10 left-10 animate-[float_8s_ease-in-out_2s_infinite]" />
        <Orb className="h-48 w-48 bg-white/10 top-1/2 left-1/3 animate-[float_7s_ease-in-out_1s_infinite]" />

        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)', backgroundSize: '64px 64px' }} />

        <div className="relative mx-auto flex min-h-[85vh] max-w-7xl flex-col items-center justify-center gap-12 px-4 py-24 sm:px-6 lg:flex-row lg:gap-16">

          {/* Left: copy */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            {/* Badge */}
            <div
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm"
              style={{ animation: 'fade-up 0.5s cubic-bezier(0,0,0.2,1) both' }}
            >
              <span className="h-2 w-2 animate-[pulse-soft_2s_ease-in-out_infinite] rounded-full bg-green-400" />
              Africa&apos;s trusted marketplace
            </div>

            <h1
              className="text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl"
              style={{ animation: 'fade-up 0.6s 0.1s cubic-bezier(0,0,0.2,1) both' }}
            >
              Shop smarter
              <br />
              <span className="mt-1 block text-primary-light/90">across Africa</span>
            </h1>

            <p
              className="mt-5 max-w-xl text-lg leading-relaxed text-white/75"
              style={{ animation: 'fade-up 0.6s 0.2s cubic-bezier(0,0,0.2,1) both' }}
            >
              Thousands of products, secure Flutterwave payments, biometric-protected
              accounts, and real-time order tracking — all in one place.
            </p>

            <div
              className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
              style={{ animation: 'fade-up 0.6s 0.3s cubic-bezier(0,0,0.2,1) both' }}
            >
              <Link to="/products">
                <Button
                  size="lg"
                  className="!bg-white !text-primary !shadow-xl !shadow-black/20 hover:!bg-neutral-50 hover:scale-105 transition-transform duration-200"
                  rightIcon={<ArrowRightIcon size={18} />}
                >
                  Start shopping
                </Button>
              </Link>
              <Link to="/register">
                <Button
                  size="lg"
                  variant="ghost"
                  className="border border-white/30 !text-white hover:!bg-white/10"
                >
                  Create account
                </Button>
              </Link>
            </div>

            {/* Trust badges */}
            <div
              className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/60 lg:justify-start"
              style={{ animation: 'fade-up 0.6s 0.4s cubic-bezier(0,0,0.2,1) both' }}
            >
              {[
                { icon: <ShieldCheckIcon size={16} />, label: 'Biometric security' },
                { icon: <TruckIcon size={16} />,       label: 'Fast delivery' },
                { icon: <CreditCardIcon size={16} />,  label: 'Secure payments' },
              ].map(({ icon, label }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span className="text-primary-light/80">{icon}</span>
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Right: stats card cluster */}
          <div
            className="grid w-full max-w-xs grid-cols-2 gap-3 lg:max-w-sm"
            style={{ animation: 'fade-up 0.7s 0.2s cubic-bezier(0,0,0.2,1) both' }}
          >
            <StatCard value="50K+" label="Products" />
            <StatCard value="98%"  label="Satisfaction" />
            <StatCard value="200K+" label="Customers" />
            <StatCard value="30+"  label="Countries" />
          </div>
        </div>

        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 64" fill="none" className="w-full" preserveAspectRatio="none">
            <path d="M0 32C240 0 480 64 720 32C960 0 1200 64 1440 32V64H0V32Z" fill="#F8FAFC" />
          </svg>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="bg-neutral-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <FadeIn direction="up">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-primary-light">
                Why SmartTrade Africa?
              </p>
              <h2 className="mt-3 text-3xl font-bold text-neutral-900 sm:text-4xl">
                Built for Africa, secured for everyone
              </h2>
              <p className="mt-4 text-neutral-500">
                We combine cutting-edge security with a seamless shopping experience
                designed specifically for the African market.
              </p>
            </div>
          </FadeIn>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon:        <SecureIcon size={28} />,
                title:       'Biometric Login',
                description: 'Sign in with your fingerprint. Your biometric data never leaves your device.',
                accent:      'bg-gradient-to-br from-primary/4 to-transparent',
                delay:       0,
              },
              {
                icon:        <SpeedIcon size={28} />,
                title:       'Lightning Fast',
                description: 'Optimized for low-bandwidth connections. Loads instantly anywhere in Africa.',
                accent:      'bg-gradient-to-br from-accent/4 to-transparent',
                delay:       100,
              },
              {
                icon:        <DeliveryIcon size={28} />,
                title:       'Real-time Tracking',
                description: 'Follow every step — from warehouse to your doorstep with live updates.',
                accent:      'bg-gradient-to-br from-success/4 to-transparent',
                delay:       200,
              },
              {
                icon:        <SupportIcon size={28} />,
                title:       '24/7 Support',
                description: 'Our team is always available across all time zones to help you.',
                accent:      'bg-gradient-to-br from-primary-light/4 to-transparent',
                delay:       300,
              },
            ].map(({ delay, ...card }) => (
              <FadeIn key={card.title} direction="up" delay={delay}>
                <FeatureCard {...card} />
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-neutral-100 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <FadeIn>
            <div className="mx-auto max-w-xl text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-primary-light">
                How it works
              </p>
              <h2 className="mt-3 text-3xl font-bold text-neutral-900">
                Three steps to your order
              </h2>
            </div>
          </FadeIn>

          <div className="relative mt-16 grid gap-10 md:grid-cols-3">
            {[
              { number: '1', icon: <UserIcon size={28} />,    title: 'Create account',  description: 'Register free and enable biometric sign-in for instant access.' },
              { number: '2', icon: <CartIcon size={28} />,    title: 'Browse & add',    description: 'Find your products, add to cart, and choose your delivery address.' },
              { number: '3', icon: <PackageIcon size={28} />, title: 'Pay & receive',   description: 'Checkout with Flutterwave and track your order to the door.' },
            ].map((step, i) => (
              <FadeIn key={step.title} direction="up" delay={i * 120}>
                <StepCard {...step} />
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social proof ──────────────────────────────────────────────────── */}
      <section className="bg-neutral-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <FadeIn>
            <h2 className="text-center text-3xl font-bold text-neutral-900">
              Loved by shoppers across Africa
            </h2>
          </FadeIn>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              { name: 'Amara K.', location: 'Lagos, Nigeria',  text: 'The biometric login is a game changer. I never have to type my password again!' },
              { name: 'Kwame A.', location: 'Accra, Ghana',    text: 'Fast, reliable, and the customer service is incredible. My go-to marketplace.' },
              { name: 'Fatima D.', location: 'Nairobi, Kenya', text: 'Real-time tracking makes me confident every purchase is safe. Highly recommend.' },
            ].map((t, i) => (
              <FadeIn key={t.name} direction="up" delay={i * 100}>
                <TestimonialCard {...t} />
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-primary py-20 text-white">
        <Orb className="h-64 w-64 bg-white/10 -right-10 top-1/2 -translate-y-1/2 animate-[float_6s_ease-in-out_infinite]" />

        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <FadeIn>
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
              <LogoMark size={36} className="text-white" />
            </div>
            <h2 className="text-3xl font-extrabold sm:text-4xl">
              Ready to start shopping?
            </h2>
            <p className="mt-4 text-lg text-white/75">
              Join 200,000+ smart shoppers across Africa — for free.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/register">
                <Button
                  size="lg"
                  className="!bg-white !text-primary !shadow-lg hover:!bg-neutral-50 hover:scale-105 transition-transform duration-200"
                >
                  Create free account
                </Button>
              </Link>
              <Link to="/products">
                <Button size="lg" variant="ghost" className="border border-white/30 !text-white hover:!bg-white/10">
                  Browse products
                </Button>
              </Link>
            </div>

            {/* Checkmarks */}
            <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-white/70">
              {['No credit card required', 'Free to browse', 'Biometric security included'].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircleIcon size={16} className="text-success" />
                  {t}
                </span>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}

