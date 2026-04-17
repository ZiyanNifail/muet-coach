export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#FAF9F7' }}
    >
      {children}
    </div>
  )
}
