/**
 * Space Mission Control — Grid Canvas Camera Controller
 * 
 * Manages canvas viewport transformations for zooming and panning.
 * Computes coordinate conversions between screen space and world space.
 */

export class CameraController {
  constructor(canvas) {
    this.canvas = canvas;
    this.zoom = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isPanningState = false;
    this.startX = 0;
    this.startY = 0;
  }

  /**
   * Apply camera transformation to the canvas 2D rendering context
   */
  applyTransform(ctx) {
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.zoom, this.zoom);
  }

  /**
   * Convert screen coordinates (mouse click) to grid world coordinates
   */
  screenToWorld(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (screenX - rect.left - this.offsetX) / this.zoom;
    const y = (screenY - rect.top - this.offsetY) / this.zoom;
    return { x, y };
  }

  /**
   * Convert grid world coordinates to screen coordinates
   */
  worldToScreen(worldX, worldY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = worldX * this.zoom + this.offsetX + rect.left;
    const y = worldY * this.zoom + this.offsetY + rect.top;
    return { x, y };
  }

  /**
   * Zoom toward the mouse cursor position
   */
  handleWheel(event) {
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Convert mouse to world position before zoom change
    const worldX = (mouseX - this.offsetX) / this.zoom;
    const worldY = (mouseY - this.offsetY) / this.zoom;

    // Apply zoom
    const zoomFactor = event.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.min(Math.max(this.zoom * zoomFactor, 0.3), 5.0);

    this.zoom = newZoom;

    // Reposition offset so that world coordinates under cursor stay under cursor
    this.offsetX = mouseX - worldX * this.zoom;
    this.offsetY = mouseY - worldY * this.zoom;
  }

  /**
   * Start panning from the current mouse position
   */
  handleMouseDown(event) {
    // Standard middle click, or left click with Space/Alt/Ctrl, or left click when dragging viewport
    this.isPanningState = true;
    this.startX = event.clientX - this.offsetX;
    this.startY = event.clientY - this.offsetY;
  }

  /**
   * Update panning coordinates
   */
  handleMouseMove(event) {
    if (!this.isPanningState) return;
    this.offsetX = event.clientX - this.startX;
    this.offsetY = event.clientY - this.startY;
  }

  /**
   * Stop panning
   */
  handleMouseUp() {
    this.isPanningState = false;
  }

  /**
   * Fit the grid bounds centered inside the canvas dimensions
   */
  fitToScreen(worldWidth, worldHeight, canvasWidth, canvasHeight) {
    const padding = 40;
    const scaleX = (canvasWidth - padding) / worldWidth;
    const scaleY = (canvasHeight - padding) / worldHeight;
    this.zoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 3.0);
    this.offsetX = (canvasWidth - worldWidth * this.zoom) / 2;
    this.offsetY = (canvasHeight - worldHeight * this.zoom) / 2;
  }

  /**
   * Center camera on a specific world coordinate
   */
  centerOn(worldX, worldY, canvasWidth, canvasHeight) {
    this.offsetX = canvasWidth / 2 - worldX * this.zoom;
    this.offsetY = canvasHeight / 2 - worldY * this.zoom;
  }

  /**
   * Query panning status
   */
  isPanning() {
    return this.isPanningState;
  }
}
