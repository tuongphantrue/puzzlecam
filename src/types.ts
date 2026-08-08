import type { ComponentType } from 'react'

export type PuzzleStatus = 'ready' | 'prototype' | 'planned'

export interface PuzzleDefinition {
  id: string
  name: string
  icon: string
  description: string
  status: PuzzleStatus
  component: ComponentType
}
