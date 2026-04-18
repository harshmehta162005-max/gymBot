import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  onChange: (val: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({ value, onChange, options, placeholder = 'Select...', className, disabled }) => {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<'down' | 'up'>('down');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If less than 240px below but more space above, open upwards
      if (spaceBelow < 250 && rect.top > spaceBelow) {
        setDirection('up');
      } else {
        setDirection('down');
      }
    }
  }, [open]);

  const selectedOption = options.find((o) => String(o.value) === String(value));

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between text-left disabled:opacity-50 ${className || 'bg-gray-800 border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-brand-500/40'}`}
      >
        <span className="truncate pr-4">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? (direction === 'up' ? '' : 'rotate-180') : (direction === 'up' ? 'rotate-180' : '')}`} />
      </button>

      {open && (
        <div className={`absolute z-[100] left-0 w-full bg-gray-800 border border-gray-700 rounded-xl py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] max-h-60 overflow-y-auto ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`w-full text-left px-4 py-3 sm:py-2.5 text-sm transition-colors hover:bg-gray-700 ${
                String(value) === String(opt.value) ? 'text-brand-400 bg-brand-500/10 font-medium' : 'text-gray-200'
              }`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              <span className="truncate block">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
