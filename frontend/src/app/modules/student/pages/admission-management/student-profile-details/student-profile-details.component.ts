import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../../../../environments/environment';
import { API } from '../../../../../core/api/endpoints';
import { PermissionService } from '../../../../../core/services/permission.service';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { StudentProfileFormComponent } from '../student-profile/student-profile-form/student-profile-form.component';
import { EnquiryListComponent } from '../enquiry/enquiry-list/enquiry-list.component';
import { RecommendationListComponent } from '../recommendation/recommendation-list/recommendation-list.component';
import { AssessmentListComponent } from '../assessment/assessment-list/assessment-list.component';
import { RegistrationListComponent } from '../registration/registration-list/registration-list.component';

type TabKey = 'profile' | 'enquiry' | 'recommendation' | 'assessment' | 'registration';

interface Tab {
  key: TabKey;
  label: string;
  moduleCode: string;
}

@Component({
  selector: 'app-student-profile-details',
  templateUrl: './student-profile-details.component.html',
  imports: [BreadcrumbComponent, StudentProfileFormComponent, EnquiryListComponent, RecommendationListComponent, AssessmentListComponent, RegistrationListComponent],
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
  enquiryCount = 0;

  tabs: Tab[] = [
    { key: 'profile',         label: 'Student Profile', moduleCode: 'STUDENT_PROFILE' },
    { key: 'enquiry',         label: 'Enquiry',         moduleCode: 'ENQUIRY' },
    { key: 'recommendation',  label: 'Recommendation',  moduleCode: 'RECOMMENDATIONS' },
    { key: 'assessment',      label: 'Assessment',      moduleCode: 'ASSESSMENTS' },
    { key: 'registration',    label: 'Registration',    moduleCode: 'REGISTRATIONS' },
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
    const usable = this.visibleTabs.filter((t) => !this.isTabDisabled(t.key));
    const fallbackTab = usable[0]?.key;
    if (requestedTab && (['profile', 'enquiry', 'recommendation', 'assessment', 'registration'] as string[]).includes(requestedTab) && this.isTabVisible(requestedTab) && !this.isTabDisabled(requestedTab)) {
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
      this.refreshEnquiryCount();
    }
  }

  /**
   * Recommendation + Assessment depend on at least one enquiry existing for the
   * student. We track the count here so the tabs disable correctly when the
   * profile has no enquiry yet, and refresh it whenever the enquiry tab emits
   * a save so newly-created enquiries unlock the downstream tabs immediately.
   */
  refreshEnquiryCount(): void {
    if (!this.recordId) {
      this.enquiryCount = 0;
      return;
    }
    this.cs.getService({ url: API.studentEnquiries.base(this.recordId), params: { page: 1, size: 1 } }).subscribe({
      next: (res: any) => {
        this.enquiryCount = Number(res?.pagination?.total_count ?? (res?.data?.length || 0));
        this.cdr.detectChanges();
      },
    });
  }

  setTab(key: TabKey): void {
    if (!this.isTabVisible(key)) return;
    if (this.isTabDisabled(key)) return;
    this.activeTab = key;
  }

  get visibleTabs(): Tab[] {
    // Permission-gated visibility only. Disabled state (record not saved /
    // no enquiry yet) is handled separately so the tabs still render — they
    // just can't be activated until prerequisites are met.
    return this.tabs.filter((tab) => this.ps.hasAnyPermission(tab.moduleCode));
  }

  /**
   * Tabs render even when not yet usable, but stay disabled until their
   * prerequisites are satisfied. Enquiry needs a saved profile;
   * Recommendation and Assessment also need at least one enquiry to exist.
   */
  isTabDisabled(key: TabKey): boolean {
    if (key === 'enquiry') return !this.recordId;
    if (key === 'recommendation' || key === 'assessment' || key === 'registration') {
      return !this.recordId || this.enquiryCount <= 0;
    }
    return false;
  }

  get currentTab(): Tab | null {
    const usable = this.visibleTabs.filter((t) => !this.isTabDisabled(t.key));
    return usable.find((tab) => tab.key === this.activeTab) || usable[0] || null;
  }

  private isTabVisible(key: TabKey): boolean {
    return this.visibleTabs.some((tab) => tab.key === key);
  }
}
