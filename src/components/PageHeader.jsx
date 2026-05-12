export default function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200 sm:text-sm">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-black leading-tight text-white sm:mt-2 sm:text-4xl lg:text-5xl">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300 sm:mt-3 sm:text-lg sm:leading-8">{description}</p>}
      </div>
      {action}
    </div>
  )
}
