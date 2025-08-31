import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { randomUUID } from "crypto"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateRequestId(): string {
  return randomUUID()
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK'
  }).format(amount)
}

export function formatXP(amount: number): string {
  return new Intl.NumberFormat('cs-CZ').format(amount) + ' XP'
}

export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'COMMON':
      return 'text-gray-500'
    case 'UNCOMMON':
      return 'text-green-500'
    case 'RARE':
      return 'text-blue-500'
    case 'EPIC':
      return 'text-purple-500'
    case 'LEGENDARY':
      return 'text-orange-500'
    default:
      return 'text-gray-500'
  }
}

export function getRarityBgColor(rarity: string): string {
  switch (rarity) {
    case 'COMMON':
      return 'bg-gray-100'
    case 'UNCOMMON':
      return 'bg-green-100'
    case 'RARE':
      return 'bg-blue-100'
    case 'EPIC':
      return 'bg-purple-100'
    case 'LEGENDARY':
      return 'bg-orange-100'
    default:
      return 'bg-gray-100'
  }
}

export function calculateLevel(xp: number): { level: number; progress: number } {
  // Simple level calculation: each level requires level * 100 XP
  let level = 1
  let xpForCurrentLevel = 0
  
  while (xp >= level * 100) {
    xpForCurrentLevel += level * 100
    xp -= level * 100
    level++
  }
  
  const xpForNextLevel = level * 100
  const progress = Math.round((xp / xpForNextLevel) * 100)
  
  return { level, progress }
}

export function sanitizeForLog(message: string): string {
  // Remove potential PII from log messages
  return message
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{3}\b/g, '[PHONE]')
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]')
}
