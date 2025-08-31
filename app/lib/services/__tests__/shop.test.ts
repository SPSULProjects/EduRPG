import { describe, it, expect } from 'vitest'
import { ShopService } from '../shop'

describe('ShopService', () => {
  describe('getItems', () => {
    it('should be defined', () => {
      expect(ShopService.getItems).toBeDefined()
    })
  })

  describe('createItem', () => {
    it('should be defined', () => {
      expect(ShopService.createItem).toBeDefined()
    })
  })

  describe('toggleItem', () => {
    it('should be defined', () => {
      expect(ShopService.toggleItem).toBeDefined()
    })
  })

  describe('buyItem', () => {
    it('should be defined', () => {
      expect(ShopService.buyItem).toBeDefined()
    })
  })

  describe('getUserBalance', () => {
    it('should be defined', () => {
      expect(ShopService.getUserBalance).toBeDefined()
    })
  })

  describe('getShopStats', () => {
    it('should be defined', () => {
      expect(ShopService.getShopStats).toBeDefined()
    })
  })
})
