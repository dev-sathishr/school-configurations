import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { PermissionService } from '../../../../../core/services/permission.service';
import { API } from '../../../../../core/api/endpoints';
import { PROFILE_STATUS_BADGES } from '../../../../../core/constants/enums';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { RelationListComponent } from '../../../../../shared/components/relation/relation-list.component';
import { RelationFormComponent } from '../../../../../shared/components/relation/relation-form.component';

type DetailTab = 'profile' | 'enquiry' | 'admission';

interface TabConfig {
  key: DetailTab;
  label: string;
}

@Component({
  selector: 'app-student-profile-detail',
  templateUrl: './student-profile-detail.component.html',
  imports: [BreadcrumbComponent, ButtonComponent, LoaderComponent, RelationListComponent, RelationFormComponent],
})
export class StudentProfileDetailComponent implements OnInit {
  @ViewChild('familyList') familyList?: RelationListComponent;
  @ViewChild('familyForm') familyForm?: RelationFormComponent;

  private readonly route = inject(ActivatedRoute);
  private readonly cs = inject(CommonService);
  readonly ps = inject(PermissionService);

  loading = signal(true);
  profile = signal<any>(null);
  activeTab = signal<DetailTab>('profile');

  statusBadges = PROFILE_STATUS_BADGES;

  readonly tabs: TabConfig[] = [
    { key: 'profile',   label: 'Student Profile' },
    { key: 'enquiry',   label: 'Enquiry' },
    { key: 'admission', label: 'Admission' },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.cs.navigate({ url: '/student/admission' }); return; }

    this.cs.getService({ url: API.studentProfiles.detail(id) }).subscribe({
      next: (res: any) => {
        this.profile.set(res?.data ?? null);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.cs.navigate({ url: '/student/admission' });
      },
    });
  }

  setTab(key: DetailTab): void {
    this.activeTab.set(key);
  }

  editProfile(): void {
    const id = this.profile()?.id;
    if (id) this.cs.navigate({ url: `/student/admission/${id}/edit` });
  }

  back(): void {
    this.cs.navigate({ url: '/student/admission' });
  }

  get statusBadge() {
    const s = this.profile()?.status;
    return this.statusBadges[s] ?? { label: s, class: '' };
  }

  get familyApiBaseUrl(): string {
    const id = this.profile()?.id;
    return id ? `${API.studentProfiles.base}/${id}/family` : '';
  }
}
