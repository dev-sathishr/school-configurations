import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loader',
  template: `
    <div [class]="wrapperClass">
      <svg class="animate-spin" [class]="sizeClass" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
        </path>
      </svg>
      @if (text) {
        <span [class]="textClass">{{ text }}</span>
      }
    </div>
  `,
})
export class LoaderComponent {
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() text = '';
  @Input() fullPage = false;
  @Input() inline = false;

  get sizeClass(): string {
    const sizes = { small: 'h-4 w-4', medium: 'h-6 w-6', large: 'h-8 w-8' };
    return `${sizes[this.size]} text-primary`;
  }

  get textClass(): string {
    const sizes = { small: 'text-xs', medium: 'text-sm', large: 'text-base' };
    return `${sizes[this.size]} text-muted-foreground`;
  }

  get wrapperClass(): string {
    if (this.inline) return 'inline-flex items-center gap-2';
    if (this.fullPage) return 'flex flex-col items-center justify-center gap-3 py-20';
    return 'flex flex-col items-center justify-center gap-2 py-10';
  }
}
