export default function Card({ children, className = '' }) {
  return <section className={`glass rounded-lg p-5 ${className}`}>{children}</section>
}
