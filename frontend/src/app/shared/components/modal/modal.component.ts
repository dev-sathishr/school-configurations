import {
  Component, EventEmitter, HostListener, Input, Output,
  OnDestroy, ElementRef, ViewChild, AfterViewInit, NgZone, ChangeDetectorRef, ChangeDetectionStrategy,
} from '@angular/core';

export interface ModalRect { x: number; y: number; w: number; h: number; }

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent implements AfterViewInit, OnDestroy {
  @Input() visible = false;
  @Input() title = '';
  @Input() size: 'small' | 'medium' | 'large' | 'full' = 'medium';
  @Input() closeOnBackdrop = false;
  @Input() closeOnEsc = true;
  @Input() showClose = true;
  @Input() draggable = false;

  @Output() onClose = new EventEmitter<void>();

  @ViewChild('panel') panelRef!: ElementRef<HTMLElement>;

  // Window state
  windowed   = false;   // true once user drags or clicks undock
  minimized  = false;
  maximized  = false;

  rect: ModalRect = { x: 0, y: 0, w: 800, h: 560 };
  private preMaxRect: ModalRect = { x: 0, y: 0, w: 800, h: 560 };

  // Drag state
  private dragging  = false;
  private dragOffX  = 0;
  private dragOffY  = 0;

  // Resize state
  resizing      = false;
  private resizeDir = '';
  private resizeStart!: { mx: number; my: number; rect: ModalRect };

  private readonly MIN_W = 380;
  private readonly MIN_H = 220;

  private boundMouseMove!: (e: MouseEvent) => void;
  private boundMouseUp!:   (e: MouseEvent) => void;

  constructor(private zone: NgZone, private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp   = this.onMouseUp.bind(this);
  }

  ngOnDestroy(): void {
    this.detachListeners();
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.visible && this.closeOnEsc && !this.minimized) this.close();
  }

  onBackdropClick(): void {
    if (this.closeOnBackdrop) this.close();
  }

  close(): void {
    this.windowed  = false;
    this.minimized = false;
    this.maximized = false;
    this.onClose.emit();
  }

  // ── Size class for non-windowed mode ─────────────────────────────
  get sizeClass(): string {
    return { small: 'max-w-md', medium: 'max-w-2xl', large: 'max-w-4xl', full: 'max-w-6xl' }[this.size];
  }

  // ── Default size in px for the windowed rect ──────────────────────
  private get defaultW(): number {
    return { small: 480, medium: 720, large: 960, full: 1100 }[this.size];
  }

  // ── Undock: switch from centered overlay to windowed ─────────────
  undock(): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w  = Math.min(this.defaultW, vw - 40);
    const h  = Math.min(560, vh - 60);
    this.rect     = { x: Math.round((vw - w) / 2), y: Math.round((vh - h) / 2), w, h };
    this.windowed  = true;
    this.minimized = false;
    this.maximized = false;
    this.cdr.markForCheck();
  }

  // ── Maximize / Restore ────────────────────────────────────────────
  toggleMaximize(): void {
    if (!this.windowed) { this.undock(); }
    if (this.minimized) { this.minimized = false; }
    if (this.maximized) {
      this.rect      = { ...this.preMaxRect };
      this.maximized = false;
    } else {
      this.preMaxRect = { ...this.rect };
      this.rect       = { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
      this.maximized  = true;
    }
    this.cdr.markForCheck();
  }

  // ── Minimize / Restore ────────────────────────────────────────────
  toggleMinimize(): void {
    if (!this.windowed) { this.undock(); }
    this.minimized = !this.minimized;
    if (this.minimized) this.maximized = false;
    this.cdr.markForCheck();
  }

  restoreFromMinimized(): void {
    this.minimized = false;
    this.cdr.markForCheck();
  }

  // ── Panel style ───────────────────────────────────────────────────
  get panelStyle(): Record<string, string> {
    if (!this.windowed) return {};
    if (this.minimized) {
      return {
        position: 'fixed',
        left:   '16px',
        bottom: '16px',
        width:  '260px',
        height: '48px',
        zIndex: '1000',
      };
    }
    return {
      position: 'fixed',
      left:   this.rect.x + 'px',
      top:    this.rect.y + 'px',
      width:  this.rect.w + 'px',
      height: this.rect.h + 'px',
      zIndex: '1000',
    };
  }

  // ── Drag ──────────────────────────────────────────────────────────
  onHeaderMouseDown(e: MouseEvent): void {
    if (!this.draggable || this.maximized || (e.target as HTMLElement).closest('button')) return;
    if (!this.windowed) this.undock();
    this.dragging = true;
    this.dragOffX = e.clientX - this.rect.x;
    this.dragOffY = e.clientY - this.rect.y;
    this.attachListeners();
    e.preventDefault();
  }

  // ── Resize ────────────────────────────────────────────────────────
  onResizeMouseDown(e: MouseEvent, dir: string): void {
    if (this.maximized) return;
    if (!this.windowed) this.undock();
    this.resizing    = true;
    this.resizeDir   = dir;
    this.resizeStart = { mx: e.clientX, my: e.clientY, rect: { ...this.rect } };
    this.attachListeners();
    e.preventDefault();
    e.stopPropagation();
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.dragging) {
      const x = e.clientX - this.dragOffX;
      const y = e.clientY - this.dragOffY;
      this.rect = {
        ...this.rect,
        x: Math.max(0, Math.min(x, window.innerWidth  - this.rect.w)),
        y: Math.max(0, Math.min(y, window.innerHeight - this.rect.h)),
      };
      this.zone.run(() => this.cdr.markForCheck());
    } else if (this.resizing) {
      const dx  = e.clientX - this.resizeStart.mx;
      const dy  = e.clientY - this.resizeStart.my;
      const r   = { ...this.resizeStart.rect };
      const dir = this.resizeDir;

      if (dir.includes('e')) { r.w = Math.max(this.MIN_W, r.w + dx); }
      if (dir.includes('s')) { r.h = Math.max(this.MIN_H, r.h + dy); }
      if (dir.includes('w')) {
        const newW = Math.max(this.MIN_W, r.w - dx);
        r.x = r.x + r.w - newW;
        r.w = newW;
      }
      if (dir.includes('n')) {
        const newH = Math.max(this.MIN_H, r.h - dy);
        r.y = r.y + r.h - newH;
        r.h = newH;
      }
      this.rect = r;
      this.zone.run(() => this.cdr.markForCheck());
    }
  }

  private onMouseUp(): void {
    this.dragging  = false;
    this.resizing  = false;
    this.resizeDir = '';
    this.detachListeners();
    this.zone.run(() => this.cdr.markForCheck());
  }

  private attachListeners(): void {
    document.addEventListener('mousemove', this.boundMouseMove, { passive: true });
    document.addEventListener('mouseup',   this.boundMouseUp);
  }

  private detachListeners(): void {
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup',   this.boundMouseUp);
  }
}
