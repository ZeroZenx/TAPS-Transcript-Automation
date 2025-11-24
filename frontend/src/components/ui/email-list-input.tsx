import { useState } from 'react';
import { Input } from './input';
import { Button } from './button';
import { Plus, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EmailListInputProps {
  value: string; // Comma-separated emails
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function EmailListInput({
  value,
  onChange,
  placeholder = 'email@example.com',
  label,
  className,
}: EmailListInputProps) {
  // Parse comma-separated string into array
  const emails = value
    ? value.split(',').map(e => e.trim()).filter(e => e)
    : [];

  const [newEmail, setNewEmail] = useState('');

  const addEmail = () => {
    const trimmed = newEmail.trim();
    if (!trimmed) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return; // Invalid email, don't add
    }

    // Check for duplicates
    if (emails.includes(trimmed.toLowerCase())) {
      setNewEmail('');
      return;
    }

    // Add to list
    const updated = [...emails, trimmed.toLowerCase()];
    onChange(updated.join(', '));
    setNewEmail('');
  };

  const removeEmail = (index: number) => {
    const updated = emails.filter((_, i) => i !== index);
    onChange(updated.join(', '));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEmail();
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="text-sm font-medium">{label}</label>
      )}
      
      {/* Display existing emails */}
      {emails.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {emails.map((email, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
            >
              <span>{email}</span>
              <button
                type="button"
                onClick={() => removeEmail(index)}
                className="hover:bg-primary/20 rounded p-0.5"
                aria-label={`Remove ${email}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new email input */}
      <div className="flex gap-2">
        <Input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={addEmail}
          size="sm"
          variant="outline"
          disabled={!newEmail.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Enter email and press Enter or click + to add. Separate multiple emails with commas or add them one by one.
      </p>
    </div>
  );
}

