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
        <div>
          <p className="pc-kicker">Puzzle solver</p>
          <div className="pc-title-line">
            {icon && <span className="pc-title-icon" aria-hidden="true">{icon}</span>}
            <h1>{title}</h1>
          </div>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </header>
      <div className="pc-puzzle-content">{children}</div>
    </div>
  )
}
