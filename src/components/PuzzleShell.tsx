import type { PropsWithChildren, ReactNode } from 'react'

interface Props extends PropsWithChildren {
  icon: string
  title: string
  subtitle: string
  actions?: ReactNode
}

export default function PuzzleShell({ icon, title, subtitle, actions, children }: Props) {
  return (
    <main className="section puzzle-page">
      <div className="puzzle-title-row">
        <div className="title-with-icon">
          <span className="large-icon">{icon}</span>
          <div>
            <p className="eyebrow">Puzzle module</p>
            <h1>{title}</h1>
            <p className="muted">{subtitle}</p>
          </div>
        </div>
        {actions}
      </div>
      {children}
    </main>
  )
}
