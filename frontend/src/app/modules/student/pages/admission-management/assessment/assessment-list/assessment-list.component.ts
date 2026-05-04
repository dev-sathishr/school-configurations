import { Component, computed, inject, Input, OnInit, signal, ViewChild } from '@angular/core';
import { API } from '../../../../../../core/api/endpoints';
import {
  ASSESSMENT_TYPE_BADGES,
  ASSESSMENT_RESULT_BADGES,
  STATUS_BADGES,
  statusLabel,
} from '../../../../../../core/constants/enums';
import { PermissionService } from '../../../../../../core/services/permission.service';
import { TableComponent } from '../../../../../../shared/components/table/table.component';
import { ButtonComponent } from '../../../../../../shared/components/button/button.component';
import { ModalComponent } from '../../../../../../shared/components/modal/modal.component';
import { ColumnConfig } from '../../../../../../shared/components/table/services/table-filter.service';
import { AssessmentFormComponent } from '../assessment-form/assessment-form.component';

@Component({
  selector: 'app-assessment-list',
  templateUrl: './assessment-list.component.html',
  imports: [TableComponent, ButtonComponent, ModalComponent, AssessmentFormComponent],
})
export class AssessmentListComponent implements OnInit {
  @Input() profileId      = '';
  @Input() profileName    = '';
  @Input() profileRegNo   = '';
  @Input() profilePhotoUrl = '';
  @Input() readonly       = false;
  @ViewChild(TableComponent) table!: TableComponent;

  readonly ps = inject(PermissionService);

  apiUrl    = '';
  deleteUrl = '';

  modalVisible  = false;
  modalTitle    = 'New Assessment';
  modalId       = '';
  modalViewMode = false;

  private readonly _profileId = signal('');
  readonly extraParams = computed(() => ({ profile_id: this._profileId() }));

  columns: ColumnConfig[] = [
    { key: 'assessment_no',  label: 'Assessment No', sortable: true },
    { key: 'assessment_date', label: 'Date',         type: 'date', sortable: true },
    { key: 'enquiry_no',     label: 'Enquiry No',   sortable: false },
    { key: 'type',           label: 'Type',          type: 'badge', badgeMap: ASSESSMENT_TYPE_BADGES, sortable: true },
    { key: 'result',         label: 'Result',        type: 'badge', badgeMap: ASSESSMENT_RESULT_BADGES, sortable: true },
    { key: 'grade',          label: 'Grade',         sortable: false },
    { key: 'is_active',      label: 'Status',        type: 'badge', badgeMap: STATUS_BADGES, sortable: true },
  ];

  displayKeyMap: Record<string, string> = {
    assessment_no:   'assessment_no',
    assessment_date: 'assessment_date',
    enquiry_no:      'enquiry_no',
    type:            'type',
    result:          'result',
    grade:           'grade',
    is_active:       'is_active',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['enquiry_no'] = row.enquiry?.enquiry_no || '-';
    mapped['grade']      = row.grade || '-';
    mapped['is_active']  = statusLabel(row.is_active);
    return mapped;
  };

  ngOnInit(): void {
    this.apiUrl    = API.studentAssessments.base(this.profileId);
    this.deleteUrl = API.studentAssessments.deleteMultiple(this.profileId);
    this._profileId.set(this.profileId);
  }

  openCreate(): void {
    this.modalId       = '';
    this.modalViewMode = false;
    this.modalTitle    = 'New Assessment';
    this.modalVisible  = true;
  }

  onEdit(row: any): void {
    this.modalId       = row.id;
    this.modalViewMode = false;
    this.modalTitle    = 'Edit Assessment';
    this.modalVisible  = true;
  }

  onView(row: any): void {
    this.modalId       = row.id;
    this.modalViewMode = true;
    this.modalTitle    = 'View Assessment';
    this.modalVisible  = true;
  }

  closeModal(): void {
    this.modalVisible = false;
  }

  onSaved(): void {
    this.modalVisible = false;
    this.table?.reloadCurrentPage();
  }
}
