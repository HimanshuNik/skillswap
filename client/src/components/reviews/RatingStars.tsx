import { useState } from 'react';

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
}

export const RatingStars = ({
  rating,
  maxRating = 5,
  onChange,
  size = 'md',
  readOnly = false,
}: RatingStarsProps) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const starSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  const currentVal = hoverRating !== null ? hoverRating : rating;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxRating }, (_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= currentVal;

        return (
          <button
            key={starValue}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onChange?.(starValue)}
            onMouseEnter={() => !readOnly && setHoverRating(starValue)}
            onMouseLeave={() => !readOnly && setHoverRating(null)}
            className={`transition ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} ${starSizes[size]}`}
            aria-label={`${starValue} star${starValue > 1 ? 's' : ''}`}
          >
            <span
              className={
                isFilled
                  ? 'text-amber-400 drop-shadow-xs'
                  : 'text-slate-300 hover:text-amber-200'
              }
            >
              ★
            </span>
          </button>
        );
      })}
    </div>
  );
};

