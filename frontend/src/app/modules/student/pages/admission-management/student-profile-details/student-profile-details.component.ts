import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../../../../environments/environment';
import { API } from '../../../../../core/api/endpoints';
import { PermissionService } from '../../../../../core/services/permission.service';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { StudentProfileFormComponent } from '../student-profile/student-profile-form/student-profile-form.component';
import { EnquiryListComponent } from '../enquiry/enquiry-list/enquiry-list.component';

type TabKey = 'profile' | 'enquiry';

interface Tab {
  key: TabKey;
  label: string;
  moduleCode: string;
}

@Component({
  selector: 'app-student-profile-details',
  templateUrl: './student-profile-details.component.html',
  imports: [BreadcrumbComponent, StudentProfileFormComponent, EnquiryListComponent],
})
export class StudentProfileDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cdr  = inject(ChangeDetectorRef);
  readonly ps = inject(PermissionService);
  protected readonly cs = inject(CommonService);

  recordId = '';
  mode: 'create' | 'edit' | 'view' = 'create';
  activeTab: TabKey = 'profile';
  studentName  = '';
  studentRegNo = '';
  studentPhotoUrl = '';

  tabs: Tab[] = [
    { key: 'profile', label: 'Student Profile', moduleCode: 'STUDENT_PROFILE' },
    { key: 'enquiry', label: 'Enquiry', moduleCode: 'ENQUIRY' },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    const lastSegment = this.route.snapshot.url.at(-1)?.path ?? '';

    this.recordId = id;
    if (!id) {
      this.mode = 'create';
    } else if (lastSegment === 'edit') {
      this.mode = 'edit';
    } else {
      this.mode = 'view';
    }

    const requestedTab = this.route.snapshot.queryParamMap.get('tab') as TabKey | null;
    const fallbackTab = this.visibleTabs[0]?.key;
    if (requestedTab && (requestedTab === 'profile' || requestedTab === 'enquiry') && this.isTabVisible(requestedTab)) {
      this.activeTab = requestedTab;
    } else if (fallbackTab) {
      this.activeTab = fallbackTab;
    }

    if (id) {
      this.cs.getService({ url: API.studentProfiles.detail(id) }).subscribe({
        next: (res: any) => {
          const d = res?.data;
          if (!d) return;
          this.studentName  = [d.first_name, d.last_name].filter(Boolean).join(' ');
          this.studentRegNo = d.reg_no || '';
          if (d.photo?.id) {
            const token = localStorage.getItem('access_token');
            this.studentPhotoUrl = `${environment.apiUrl}${API.files.detail(d.photo.id)}?token=${token}`;
          }
          this.cdr.detectChanges();
        },
      });
    }
  }

  setTab(key: TabKey): void {
    if (!this.isTabVisible(key)) return;
    this.activeTab = key;
  }

  get visibleTabs(): Tab[] {
    return this.tabs.filter((tab) => {
      if (!this.ps.hasAnyPermission(tab.moduleCode)) return false;
      if (tab.key === 'enquiry') return !!this.recordId;
      return true;
    });
  }

  get currentTab(): Tab | null {
    return this.visibleTabs.find((tab) => tab.key === this.activeTab) || this.visibleTabs[0] || null;
  }

  private isTabVisible(key: TabKey): boolean {
    return this.visibleTabs.some((tab) => tab.key === key);
  }
}
