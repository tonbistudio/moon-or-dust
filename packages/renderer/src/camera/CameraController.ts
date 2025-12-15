import { Container } from 'pixi.js'

export interface CameraConfig {
  viewportWidth: number
  viewportHeight: number
  minZoom: number
  maxZoom: number
}

export class CameraController {
  private readonly container: Container
  private config: CameraConfig

  private currentZoom = 1

  constructor(container: Container, config: CameraConfig) {
    this.container = container
    this.config = config
  }

  pan(dx: number, dy: number): void {
    this.container.x += dx
    this.container.y += dy
    this.clampPosition()
  }

  zoom(factor: number, pivotX: number, pivotY: number): void {
    const newZoom = this.currentZoom * factor

    // Clamp zoom
    if (newZoom < this.config.minZoom || newZoom > this.config.maxZoom) {
      return
    }

    // Calculate world position under mouse before zoom
    const worldBefore = this.screenToWorld(pivotX, pivotY)

    // Apply zoom
    this.currentZoom = newZoom
    this.container.scale.set(this.currentZoom)

    // Calculate world position under mouse after zoom
    const worldAfter = this.screenToWorld(pivotX, pivotY)

    // Adjust position to keep mouse over same world point
    this.container.x += (worldAfter.x - worldBefore.x) * this.currentZoom
    this.container.y += (worldAfter.y - worldBefore.y) * this.currentZoom

    this.clampPosition()
  }

  setZoom(level: number): void {
    const clampedLevel = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, level))
    this.currentZoom = clampedLevel
    this.container.scale.set(this.currentZoom)
    this.clampPosition()
  }

  centerOn(worldX: number, worldY: number): void {
    this.container.x = this.config.viewportWidth / 2 - worldX * this.currentZoom
    this.container.y = this.config.viewportHeight / 2 - worldY * this.currentZoom
    this.clampPosition()
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.container.x) / this.currentZoom,
      y: (screenY - this.container.y) / this.currentZoom,
    }
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX * this.currentZoom + this.container.x,
      y: worldY * this.currentZoom + this.container.y,
    }
  }

  setViewport(width: number, height: number): void {
    this.config = {
      ...this.config,
      viewportWidth: width,
      viewportHeight: height,
    }
    this.clampPosition()
  }

  private clampPosition(): void {
    // Optional: Add bounds clamping to prevent scrolling too far
    // For now, allow free scrolling
  }

  getZoom(): number {
    return this.currentZoom
  }

  getPosition(): { x: number; y: number } {
    return {
      x: this.container.x,
      y: this.container.y,
    }
  }
}
