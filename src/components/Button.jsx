export default function Button({ children, className = '', variant = 'primary', ...props }) {
  const variants = {
    primary: 'bg-cyan-300 text-slate-950 hover:bg-cyan-200',
    secondary: 'bg-slate-800 text-slate-50 hover:bg-slate-700 border border-slate-600',
    danger: 'bg-red-600 text-white hover:bg-red-500',
    ghost: 'bg-transparent text-slate-100 hover:bg-slate-800 border border-slate-700',
  }

  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 py-3 text-base font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
