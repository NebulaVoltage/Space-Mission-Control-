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
    this.zoomAnimationId = null;
    this.targetZoom = undefined;
    this.targetOffsetX = undefined;
    this.targetOffsetY = undefined;
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
   * Clear any active zoom animation and targets
   */
  clearAnimations() {
    if (this.zoomAnimationId) {
      cancelAnimationFrame(this.zoomAnimationId);
      this.zoomAnimationId = null;
    }
    this.targetZoom = undefined;
    this.targetOffsetX = undefined;
    this.targetOffsetY = undefined;
  }

  /**
   * Zoom toward the center of the canvas viewport with a smooth transition
   */
  zoomToCenter(zoomIn, onStep) {
    if (this.zoomAnimationId) {
      cancelAnimationFrame(this.zoomAnimationId);
      this.zoomAnimationId = null;
    }

    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const zoomFactor = zoomIn ? 1.3 : 1 / 1.3;
    const baseZoom = this.targetZoom !== undefined ? this.targetZoom : this.zoom;
    const newZoom = Math.min(Math.max(baseZoom * zoomFactor, 0.3), 5.0);

    if (Math.abs(newZoom - baseZoom) < 0.001) return;

    const currentTargetOffsetX = this.targetOffsetX !== undefined ? this.targetOffsetX : this.offsetX;
    const currentTargetOffsetY = this.targetOffsetY !== undefined ? this.targetOffsetY : this.offsetY;
    const currentTargetZoom = this.targetZoom !== undefined ? this.targetZoom : this.zoom;

    const worldX = (centerX - currentTargetOffsetX) / currentTargetZoom;
    const worldY = (centerY - currentTargetOffsetY) / currentTargetZoom;

    const targetOffsetX = centerX - worldX * newZoom;
    const targetOffsetY = centerY - worldY * newZoom;

    this.targetZoom = newZoom;
    this.targetOffsetX = targetOffsetX;
    this.targetOffsetY = targetOffsetY;

    const startZoom = this.zoom;
    const startOffsetX = this.offsetX;
    const startOffsetY = this.offsetY;
    const startTime = performance.now();
    const duration = 150; // duration in ms

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out

      this.zoom = startZoom + (this.targetZoom - startZoom) * easeProgress;
      this.offsetX = startOffsetX + (this.targetOffsetX - startOffsetX) * easeProgress;
      this.offsetY = startOffsetY + (this.targetOffsetY - startOffsetY) * easeProgress;

      if (onStep) {
        onStep(this.zoom);
      }

      if (progress < 1) {
        this.zoomAnimationId = requestAnimationFrame(animate);
      } else {
        this.zoom = this.targetZoom;
        this.offsetX = this.targetOffsetX;
        this.offsetY = this.targetOffsetY;
        this.targetZoom = undefined;
        this.targetOffsetX = undefined;
        this.targetOffsetY = undefined;
        this.zoomAnimationId = null;
        if (onStep) {
          onStep(this.zoom);
        }
      }
    };

    this.zoomAnimationId = requestAnimationFrame(animate);
  }

  /**
   * Start panning from the current mouse position
   */
  handleMouseDown(event) {
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
    this.clearAnimations();
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
    this.clearAnimations();
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
