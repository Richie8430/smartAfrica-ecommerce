import { clsx } from 'clsx';

interface StrengthResult {
  score:  0 | 1 | 2 | 3 | 4;
  label:  string;
  color:  string;
}

function getStrength(password: string): StrengthResult {
  if (!password) return { score: 0, label: '', color: '' };

  let score = 0;
  if (password.length >= 8)         score++;
  if (/[A-Z]/.test(password))       score++;
  if (/[0-9]/.test(password))       score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const levels: StrengthResult[] = [
    { score: 0, label: '',        color: '' },
    { score: 1, label: 'Weak',    color: 'bg-red-400' },
    { score: 2, label: 'Fair',    color: 'bg-amber-400' },
    { score: 3, label: 'Good',    color: 'bg-blue-400' },
    { score: 4, label: 'Strong',  color: 'bg-green-500' },
  ];
  return levels[score] as StrengthResult;
}

export function PasswordStrengthIndicator({ password }: { password: string }) {
  const { score, label, color } = getStrength(password);
  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={clsx(
              'h-1.5 flex-1 rounded-full transition-all duration-300',
              n <= score ? color : 'bg-neutral-200',
            )}
          />
        ))}
      </div>
      {label && (
        <p className="text-xs font-medium text-neutral-500">
          Password strength: <span className="text-neutral-700">{label}</span>
        </p>
      )}
    </div>
  );
}
