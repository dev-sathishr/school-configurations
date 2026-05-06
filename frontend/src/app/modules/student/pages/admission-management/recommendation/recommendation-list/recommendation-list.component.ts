import { Component, computed, inject, Input, OnInit, signal, ViewChild } from '@angular/core';
import { API } from '../../../../../../core/api/endpoints';
import { RECOMMENDER_CATEGORY_BADGES, STATUS_BADGES, statusLabel } from '../../../../../../core/constants/enums';
import { LocationContextService } from '../../../../../../core/services/location-context.service';
import { PermissionService } from '../../../../../../core/services/permission.service';
import { TableComponent } from '../../../../../../shared/components/table/table.component';
import { ButtonComponent } from '../../../../../../shared/components/button/button.component';
import { ModalComponent } from '../../../../../../shared/components/modal/modal.component';
import { ColumnConfig } from '../../../../../../shared/components/table/services/table-filter.service';
import { RecommendationFormComponent } from '../recommendation-form/recommendation-form.component';

@Component({
  selector: 'app-recommendation-list',
  templateUrl: './recommendation-list.component.html',
  imports: [TableComponent, ButtonComponent, ModalComponent, RecommendationFormComponent],
})
export class RecommendationListComponent implements OnInit {
  @Input() profileId      = '';
  @Input() profileName    = '';
  @Input() profileRegNo   = '';
  @Input() profilePhotoUrl = '';
  @Input() readonly       = false;
  @ViewChild(TableComponent) table!: TableComponent;

  readonly ps           = inject(PermissionService);
  readonly locationCtx  = inject(LocationContextService);

  apiUrl    = '';
  deleteUrl = '';

  modalVisible  = false;
  modalTitle    = 'Add Recommendation';
  modalId       = '';
  modalViewMode = false;

  private readonly _profileId = signal('');
  readonly extraParams = computed(() => ({ profile_id: this._profileId(), ...this.locationCtx.scopeExtraParams() }));

  columns: ColumnConfig[] = [
    { key: 'recommender_name',     label: 'Recommender',   sortable: true },
    { key: 'recommender_category', label: 'Category',      type: 'badge', badgeMap: RECOMMENDER_CATEGORY_BADGES, sortable: false },
    { key: 'recommender_contact',  label: 'Contact No',    sortable: false },
    { key: 'enquiry_no',           label: 'Enquiry No',    sortable: false },
    { key: 'is_active',            label: 'Status',        type: 'badge', badgeMap: STATUS_BADGES, sortable: true },
  ];

  displayKeyMap: Record<string, string> = {
    recommender_name:     'recommender_name',
    recommender_category: 'recommender_category',
    recommender_contact:  'recommender_contact',
    enquiry_no:           'enquiry_no',
    is_active:            'is_active',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['recommender_name']     = row.recommender?.name     || '-';
    mapped['recommender_category'] = row.recommender?.category || '-';
    mapped['recommender_contact']  = row.recommender?.contact_no || '-';
    mapped['enquiry_no']           = row.enquiry?.enquiry_no   || '-';
    mapped['is_active']            = statusLabel(row.is_active);
    return mapped;
  };

  ngOnInit(): void {
    this.apiUrl    = API.studentRecommendations.base(this.profileId);
    this.deleteUrl = API.studentRecommendations.deleteMultiple(this.profileId);
    this._profileId.set(this.profileId);
  }

  openCreate(): void {
    this.modalId       = '';
    this.modalViewMode = false;
    this.modalTitle    = 'Add Recommendation';
    this.modalVisible  = true;
  }

  onEdit(row: any): void {
    this.modalId       = row.id;
    this.modalViewMode = false;
    this.modalTitle    = 'Edit Recommendation';
    this.modalVisible  = true;
  }

  onView(row: any): void {
    this.modalId       = row.id;
    this.modalViewMode = true;
    this.modalTitle    = 'View Recommendation';
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
