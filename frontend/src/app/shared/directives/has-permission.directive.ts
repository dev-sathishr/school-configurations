import { Directive, Input, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { PermissionService } from '../../core/services/permission.service';

@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective implements OnInit {
  private moduleCode = '';
  private permission = '';
  private rendered = false;

  @Input() set appHasPermission(value: [string, string]) {
    this.moduleCode = value[0];
    this.permission = value[1];
    this.updateView();
  }

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.updateView();
  }

  private updateView(): void {
    if (!this.moduleCode || !this.permission) return;

    const hasPermission = this.permissionService.hasModulePermission(this.moduleCode, this.permission);

    if (hasPermission && !this.rendered) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.rendered = true;
    } else if (!hasPermission && this.rendered) {
      this.viewContainer.clear();
      this.rendered = false;
    }
  }
}
