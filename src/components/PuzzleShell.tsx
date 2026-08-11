import type { ReactNode } from 'react'

interface Props {
  icon?: string
  title: string
  subtitle?: string
  children: ReactNode
}

export default function PuzzleShell({ icon, title, subtitle, children }: Props) {
  return (
    <div className="pc-puzzle-page">
      <header className="pc-page-heading pc-puzzle-heading">
        <div className="pc-puzzle-titleblock">
          {icon && <span className="pc-title-icon" aria-hidden="true">{icon}</span>}
          <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
        </div>
        <span className="pc-inline-status"><i /> Local solver</span>
      </header>
      <div className="pc-puzzle-content">{children}</div>
    </div>
  )
}
