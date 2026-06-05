import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { FadeIn } from '@/components/ui/Motion';
import { SearchIcon, HomeIcon, ArrowRightIcon } from '@/components/ui/Icons';

export default function NotFound() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/products?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 text-center">
      <FadeIn className="flex flex-col items-center">
        {/* CSS-only illustration */}
        <div className="relative mb-8 select-none" aria-hidden="true">
          <p className="text-[9rem] font-black leading-none text-neutral-100">404</p>
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ animation: 'float 4s ease-in-out infinite' }}
          >
            <div className="rounded-2xl bg-white shadow-xl border border-neutral-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="h-2.5 w-32 rounded bg-neutral-100" />
                <div className="h-2.5 w-24 rounded bg-neutral-50" />
                <div className="h-2.5 w-28 rounded bg-neutral-100" />
              </div>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-neutral-900">Page not found</h1>
        <p className="mt-2 max-w-sm text-neutral-500">
          We couldn't find the page you were looking for. Try searching for what you need.
        </p>

        {/* Search */}
        <form
          onSubmit={handleSearch}
          className="mt-6 flex w-full max-w-sm items-center gap-2"
          role="search"
          aria-label="Search products"
        >
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              aria-label="Search products"
              className="h-10 w-full rounded-brand border border-neutral-200 bg-white pl-9 pr-3 text-sm placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button type="submit" aria-label="Submit search" rightIcon={<ArrowRightIcon size={15} aria-hidden="true" />}>
            Search
          </Button>
        </form>

        <Link to="/" className="mt-6">
          <Button variant="ghost" leftIcon={<HomeIcon size={16} aria-hidden="true" />}>
            Back to home
          </Button>
        </Link>
      </FadeIn>
    </div>
  );
}
