import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { DoctypeConfigService, DoctypeConfig } from '../doctype-config.service';
import { DynamicPageListComponent } from '../dynamic-page-list/dynamic-page-list.component';
import { DynamicModalListComponent } from '../dynamic-modal-list/dynamic-modal-list.component';
import { DynamicTabGroupComponent } from '../dynamic-tab-group/dynamic-tab-group.component';

@Component({
  selector: 'app-dynamic-list',
  templateUrl: './dynamic-list.component.html',
  imports: [CommonModule, BreadcrumbComponent, LoaderComponent,
    DynamicPageListComponent, DynamicModalListComponent, DynamicTabGroupComponent],
})
export class DynamicListComponent implements OnInit {
  private readonly route         = inject(ActivatedRoute);
  private readonly cdr           = inject(ChangeDetectorRef);
  private readonly doctypeConfig = inject(DoctypeConfigService);

  config: DoctypeConfig | null = null;
  loading  = true;
  notFound = false;

  ngOnInit(): void {
    const slug = this.route.snapshot.params['slug'] as string;
    this.doctypeConfig.get(slug).subscribe({
      next: (doc) => {
        if (!doc) { this.notFound = true; this.loading = false; this.cdr.detectChanges(); return; }
        this.config  = doc;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.notFound = true; this.loading = false; this.cdr.detectChanges(); },
    });
  }
}
