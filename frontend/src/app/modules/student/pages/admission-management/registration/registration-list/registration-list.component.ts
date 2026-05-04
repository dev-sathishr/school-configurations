import { Component, computed, inject, Input, OnInit, signal, ViewChild } from '@angular/core';
import { API } from '../../../../../../core/api/endpoints';
import { STATUS_BADGES, statusLabel } from '../../../../../../core/constants/enums';
import { PermissionService } from '../../../../../../core/services/permission.service';
import { TableComponent } from '../../../../../../shared/components/table/table.component';
import { ButtonComponent } from '../../../../../../shared/components/button/button.component';
import { ModalComponent } from '../../../../../../shared/components/modal/modal.component';
import { ColumnConfig } from '../../../../../../shared/components/table/services/table-filter.service';
import { RegistrationFormComponent } from '../registration-form/registration-form.component';

@Component({
  selector: 'app-registration-list',
  templateUrl: './registration-list.component.html',
  imports: [TableComponent, ButtonComponent, ModalComponent, RegistrationFormComponent],
})
export class RegistrationListComponent implements OnInit {
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
  modalTitle    = 'New Registration';
  modalId       = '';
  modalViewMode = false;

  private readonly _profileId = signal('');
  readonly extraParams = computed(() => ({ profile_id: this._profileId() }));

  columns: ColumnConfig[] = [
    { key: 'registration_no',   label: 'Registration No', sortable: true },
    { key: 'registration_date', label: 'Date',            type: 'date', sortable: true },
    { key: 'enquiry_no',        label: 'Enquiry No',      sortable: false },
    { key: 'sanctioned_class',  label: 'Sanctioned Class', sortable: false },
    { key: 'academic_year',     label: 'Academic Year',   sortable: false },
    { key: 'is_active',         label: 'Status',          type: 'badge', badgeMap: STATUS_BADGES, sortable: true },
  ];

  displayKeyMap: Record<string, string> = {
    registration_no:   'registration_no',
    registration_date: 'registration_date',
    enquiry_no:        'enquiry_no',
    sanctioned_class:  'sanctioned_class',
    academic_year:     'academic_year',
    is_active:         'is_active',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['enquiry_no']       = row.enquiry?.enquiry_no || '-';
    mapped['sanctioned_class'] = row.sanctioned_class?.name || '-';
    mapped['academic_year']    = row.academic_year?.label   || '-';
    mapped['is_active']        = statusLabel(row.is_active);
    return mapped;
  };

  ngOnInit(): void {
    this.apiUrl    = API.studentRegistrations.base(this.profileId);
    this.deleteUrl = API.studentRegistrations.deleteMultiple(this.profileId);
    this._profileId.set(this.profileId);
  }

  openCreate(): void {
    this.modalId       = '';
    this.modalViewMode = false;
    this.modalTitle    = 'New Registration';
    this.modalVisible  = true;
  }

  onEdit(row: any): void {
    this.modalId       = row.id;
    this.modalViewMode = false;
    this.modalTitle    = 'Edit Registration';
    this.modalVisible  = true;
  }

  onView(row: any): void {
    this.modalId       = row.id;
    this.modalViewMode = true;
    this.modalTitle    = 'View Registration';
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
