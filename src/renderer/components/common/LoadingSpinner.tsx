interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div className={`relative ${sizes[size]}`}>
        <div
          className={`absolute inset-0 rounded-full border-2 border-primary-500/20`}
        />
        <div
          className={`absolute inset-0 rounded-full border-2 border-transparent border-t-primary-500 animate-spin`}
        />
      </div>
    </div>
  );
}
