import { Component, EventEmitter, HostListener, inject, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { MenuService } from 'src/app/modules/layout/services/menu.service';
import { ThemeService } from 'src/app/core/services/theme.service';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  imports: [NgClass],
})
export class ModalComponent {
  private menuService = inject(MenuService);
  private themeService = inject(ThemeService);

  get isSidebarLayout(): boolean {
    return this.themeService.theme().menuStyle === 'sidebar';
  }

  get sidebarExpanded(): boolean {
    return this.isSidebarLayout && this.menuService.showSideBar;
  }

  get sidebarCollapsed(): boolean {
    return this.isSidebarLayout && !this.menuService.showSideBar;
  }
  @Input() visible = false;
  @Input() title = '';
  @Input() size: 'small' | 'medium' | 'large' | 'full' = 'medium';
  @Input() closeOnBackdrop = true;
  @Input() closeOnEsc = true;
  @Input() showClose = true;

  @Output() onClose = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.visible && this.closeOnEsc) this.close();
  }

  onBackdropClick(): void {
    if (this.closeOnBackdrop) this.close();
  }

  close(): void {
    this.onClose.emit();
  }

  get sizeClass(): string {
    const sizes = {
      small: 'max-w-md',
      medium: 'max-w-2xl',
      large: 'max-w-4xl',
      full: 'max-w-6xl',
    };
    return sizes[this.size];
  }
}
