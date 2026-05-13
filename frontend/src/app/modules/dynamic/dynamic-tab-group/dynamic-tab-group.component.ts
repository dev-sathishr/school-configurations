import { ChangeDetectorRef, Component, inject, OnInit, QueryList, ViewChildren } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { DoctypeConfigService, DoctypeConfig } from '../doctype-config.service';
import { PermissionService } from '../../../core/services/permission.service';
import { DynamicPageListComponent } from '../dynamic-page-list/dynamic-page-list.component';
import { DynamicModalListComponent } from '../dynamic-modal-list/dynamic-modal-list.component';

@Component({
  selector: 'app-dynamic-tab-group',
  templateUrl: './dynamic-tab-group.component.html',
  imports: [CommonModule, BreadcrumbComponent, LoaderComponent, ButtonComponent,
    DynamicPageListComponent, DynamicModalListComponent],
})
export class DynamicTabGroupComponent implements OnInit {
  @ViewChildren(DynamicModalListComponent) modalLists!: QueryList<DynamicModalListComponent>;
  @ViewChildren(DynamicPageListComponent)  pageLists!:  QueryList<DynamicPageListComponent>;

  private readonly route         = inject(ActivatedRoute);
  private readonly cdr           = inject(ChangeDetectorRef);
  private readonly doctypeConfig = inject(DoctypeConfigService);
  readonly ps                    = inject(PermissionService);

  config: DoctypeConfig | null = null;
  childConfigs: DoctypeConfig[] = [];
  childModuleCodes: string[] = [];
  loading  = true;
  notFound = false;
  activeTab = 0;

  get activeChild(): DoctypeConfig | null {
    return this.childConfigs[this.activeTab] ?? null;
  }

  get activeChildLabel(): string {
    return this.activeChild?.label ?? '';
  }

  get activeChildModuleCode(): string {
    return this.childModuleCodes[this.activeTab] ?? '';
  }

  get visibleChildConfigs(): { config: DoctypeConfig; moduleCode: string; originalIndex: number }[] {
    return this.childConfigs
      .map((c, i) => ({ config: c, moduleCode: this.childModuleCodes[i] ?? '', originalIndex: i }))
      .filter(({ moduleCode }) => this.ps.hasAnyPermission(moduleCode));
  }

  triggerNew(): void {
    const child = this.activeChild;
    if (!child || !this.ps.canCreate(this.activeChildModuleCode)) return;
    if (child.display_mode === 'modal') {
      this.modalLists.find(c => c.slugOverride === child.slug)?.openNew();
    } else {
      this.pageLists.find(c => c.slugOverride === child.slug)?.addNew();
    }
  }

  private resolveChildModuleCode(childSlug: string): string {
    const allModules = this.ps.menus.flatMap((m: any) => m.modules);
    const match = allModules.find((m: any) =>
      m.name?.toUpperCase() === childSlug.toUpperCase().replace(/-/g, '_') ||
      m.display_name?.toUpperCase() === childSlug.toUpperCase().replace(/-/g, '_') ||
      m.name?.toUpperCase().replace(/[\s_]+/g, '') === childSlug.toUpperCase().replace(/[-_]+/g, '')
    );
    if (match) return match.name;
    return childSlug.toUpperCase().replace(/-/g, '_');
  }

  ngOnInit(): void {
    const slug = this.route.snapshot.params['slug'] as string;
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
                this.childModuleCodes = this.childConfigs.map(c => this.resolveChildModuleCode(c.slug));
                this.activeTab = this.visibleChildConfigs[0]?.originalIndex ?? 0;
                this.loading = false;
                this.cdr.detectChanges();
              }
            },
            error: () => {
              loaded++;
              if (loaded === children.length) {
                this.childConfigs = this.childConfigs.filter(Boolean);
                this.childModuleCodes = this.childConfigs.map(c => this.resolveChildModuleCode(c.slug));
                this.activeTab = this.visibleChildConfigs[0]?.originalIndex ?? 0;
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
