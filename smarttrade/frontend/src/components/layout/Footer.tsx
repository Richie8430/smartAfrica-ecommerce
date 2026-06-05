import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-900 text-neutral-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <p className="text-lg font-bold text-white">SmartTrade Africa</p>
            <p className="mt-2 text-sm">Your trusted marketplace across Africa.</p>
          </div>

          {[
            {
              heading: 'Shop',
              links: [
                { label: 'Products',   to: '/products' },
                { label: 'Categories', to: '/products' },
                { label: 'New Arrivals', to: '/products?sort=newest' },
              ],
            },
            {
              heading: 'Account',
              links: [
                { label: 'My Orders',  to: '/account/orders' },
                { label: 'Profile',    to: '/account/profile' },
                { label: 'Security',   to: '/account/security' },
              ],
            },
            {
              heading: 'Legal',
              links: [
                { label: 'Privacy Policy', to: '/privacy' },
                { label: 'Terms of Use',   to: '/terms' },
              ],
            },
          ].map(({ heading, links }) => (
            <div key={heading}>
              <p className="text-sm font-semibold text-white">{heading}</p>
              <ul className="mt-3 flex flex-col gap-2">
                {links.map(({ label, to }) => (
                  <li key={to}>
                    <Link to={to} className="text-sm hover:text-white transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-neutral-800 pt-6 text-center text-xs">
          © {new Date().getFullYear()} SmartTrade Africa. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
