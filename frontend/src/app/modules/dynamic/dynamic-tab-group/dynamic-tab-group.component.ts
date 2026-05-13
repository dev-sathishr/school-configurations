import { ChangeDetectorRef, Component, inject, OnInit, QueryList, ViewChildren } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { DoctypeConfigService, DoctypeConfig } from '../doctype-config.service';
import { PermissionService } from '../../../core/services/permission.service';
import { DynamicPageListComponent } from '../dynamic-page-list/dynamic-page-list.component';
import { DynamicModalListComponent } from '../dynamic-modal-list/dynamic-modal-list.component';

@Component({
  selector: 'app-dynamic-tab-group',
  templateUrl: './dynamic-tab-group.component.html',
  imports: [CommonModule, BreadcrumbComponent, LoaderComponent, ButtonComponent,
    HasPermissionDirective, DynamicPageListComponent, DynamicModalListComponent],
})
export class DynamicTabGroupComponent implements OnInit {
  @ViewChildren(DynamicModalListComponent) modalLists!: QueryList<DynamicModalListComponent>;
  @ViewChildren(DynamicPageListComponent)  pageLists!:  QueryList<DynamicPageListComponent>;

  private readonly route         = inject(ActivatedRoute);
  private readonly cdr           = inject(ChangeDetectorRef);
  private readonly doctypeConfig = inject(DoctypeConfigService);
  private readonly ps            = inject(PermissionService);

  config: DoctypeConfig | null = null;
  childConfigs: DoctypeConfig[] = [];
  loading          = true;
  notFound         = false;
  activeTab        = 0;
  parentModuleCode = '';

  get activeChild(): DoctypeConfig | null {
    return this.childConfigs[this.activeTab] ?? null;
  }

  get activeChildLabel(): string {
    return this.activeChild?.label ?? '';
  }

  triggerNew(): void {
    const child = this.activeChild;
    if (!child) return;
    if (child.display_mode === 'modal') {
      this.modalLists.find(c => c.slugOverride === child.slug)?.openNew();
    } else {
      this.pageLists.find(c => c.slugOverride === child.slug)?.addNew();
    }
  }

  private resolveModuleCode(slug: string): string {
    for (const menu of this.ps.menus) {
      const mod = menu.modules.find((m: any) => m.route_path?.endsWith(`/${slug}`));
      if (mod?.name) return mod.name;
    }
    return slug.toUpperCase().replace(/-/g, '_');
  }

  ngOnInit(): void {
    const slug = this.route.snapshot.params['slug'] as string;
    this.parentModuleCode = this.resolveModuleCode(slug);
    this.doctypeConfig.get(slug).subscribe({
      next: (doc) => {
        if (!doc) { this.notFound = true; this.loading = false; this.cdr.detectChanges(); return; }
        this.config = doc;
        const children = doc.tab_children ?? [];
        if (children.length === 0) { this.loading = false; this.cdr.detectChanges(); return; }
        let loaded = 0;
        this.childConfigs = new Array(children.length);
        for (let i = 0; i < children.length; i++) {
          const idx = i;
          this.doctypeConfig.get(children[idx]).subscribe({
            next: (childDoc) => {
              if (childDoc) this.childConfigs[idx] = childDoc;
              loaded++;
              if (loaded === children.length) {
                this.childConfigs = this.childConfigs.filter(Boolean);
                this.loading = false;
                this.cdr.detectChanges();
              }
            },
            error: () => {
              loaded++;
              if (loaded === children.length) {
                this.childConfigs = this.childConfigs.filter(Boolean);
                this.loading = false;
                this.cdr.detectChanges();
              }
            },
          });
        }
      },
      error: () => { this.notFound = true; this.loading = false; this.cdr.detectChanges(); },
    });
  }

  selectTab(index: number): void {
    this.activeTab = index;
  }
}
