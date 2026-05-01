import { Component, computed, inject, Input, OnInit, signal, ViewChild } from '@angular/core';
import { API } from '../../../../../../core/api/endpoints';
import { ENQUIRY_STATUS_BADGES } from '../../../../../../core/constants/enums';
import { PermissionService } from '../../../../../../core/services/permission.service';
import { TableComponent } from '../../../../../../shared/components/table/table.component';
import { ButtonComponent } from '../../../../../../shared/components/button/button.component';
import { ModalComponent } from '../../../../../../shared/components/modal/modal.component';
import { ColumnConfig } from '../../../../../../shared/components/table/services/table-filter.service';
import { EnquiryFormComponent } from '../enquiry-form/enquiry-form.component';

@Component({
  selector: 'app-enquiry-list',
  templateUrl: './enquiry-list.component.html',
  imports: [TableComponent, ButtonComponent, ModalComponent, EnquiryFormComponent],
})
export class EnquiryListComponent implements OnInit {
  @Input() profileId = '';
  @Input() profileName = '';
  @Input() profileRegNo = '';
  @Input() profilePhotoUrl = '';
  @Input() readonly = false;
  @ViewChild(TableComponent) table!: TableComponent;

  readonly ps = inject(PermissionService);

  apiUrl    = '';
  deleteUrl = '';

  modalVisible   = false;
  modalTitle     = 'New Enquiry';
  modalEnquiryId = '';
  modalViewMode  = false;

  private readonly _profileId = signal('');
  readonly extraParams = computed(() => ({ profile_id: this._profileId() }));

  columns: ColumnConfig[] = [
    { key: 'enquiry_no',       label: 'Enquiry No',  sortable: true },
    { key: 'enquiry_date',     label: 'Date',         type: 'date', sortable: true },
    { key: 'enquired_by',      label: 'Enquired By',  sortable: true },
    { key: 'enquired_class',   label: 'Class',        sortable: false },
    { key: 'status',           label: 'Status',       type: 'badge', badgeMap: ENQUIRY_STATUS_BADGES, sortable: true },
    { key: 'updated_by_name',  label: 'Updated By',   sortable: false, visible: false },
  ];

  displayKeyMap: Record<string, string> = {
    enquiry_no:      'enquiry_no',
    enquiry_date:    'enquiry_date',
    enquired_by:     'enquired_by',
    enquired_class:  'enquired_class',
    status:          'status',
    updated_by_name: 'updated_by_name',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['enquired_class'] = row.enquired_class?.name || row.enquired_class_label || row.enquired_class || '-';
    return mapped;
  };

  ngOnInit(): void {
    this.apiUrl    = API.studentEnquiries.base(this.profileId);
    this.deleteUrl = API.studentEnquiries.deleteMultiple(this.profileId);
    this._profileId.set(this.profileId);
  }

  openCreate(): void {
    this.modalEnquiryId = '';
    this.modalViewMode  = false;
    this.modalTitle     = 'New Enquiry';
    this.modalVisible   = true;
  }

  onEdit(row: any): void {
    this.modalEnquiryId = row.id;
    this.modalViewMode  = false;
    this.modalTitle     = 'Edit Enquiry';
    this.modalVisible   = true;
  }

  onView(row: any): void {
    this.modalEnquiryId = row.id;
    this.modalViewMode  = true;
    this.modalTitle     = 'View Enquiry';
    this.modalVisible   = true;
  }

  closeModal(): void {
    this.modalVisible = false;
  }

  onSaved(): void {
    this.modalVisible = false;
    this.table?.reloadCurrentPage();
  }
}
