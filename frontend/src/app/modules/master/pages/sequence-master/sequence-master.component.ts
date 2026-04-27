import { Component, OnInit, ViewChild } from '@angular/core';
import { PermissionService } from '../../../../core/services/permission.service';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SequenceCodeListComponent } from '../sequence-code/sequence-code-list/sequence-code-list.component';
import { SequenceCodeFormComponent } from '../sequence-code/sequence-code-form/sequence-code-form.component';
import { SequenceControlListComponent } from '../sequence-control/sequence-control-list/sequence-control-list.component';
import { SequenceControlFormComponent } from '../sequence-control/sequence-control-form/sequence-control-form.component';

type SequenceTabKey = 'sequence-code' | 'sequence-control';

interface SequenceFormComponent {
  openCreate(): void;
  openEdit(id: string): void;
  openView(id: string): void;
}

interface SequenceTabConfig {
  key: SequenceTabKey;
  label: string;
  entityLabel: string;
  moduleCode: string;
}

@Component({
  selector: 'app-sequence-master',
  templateUrl: './sequence-master.component.html',
  standalone: true,
  imports: [
    BreadcrumbComponent,
    ButtonComponent,
    SequenceCodeListComponent,
    SequenceCodeFormComponent,
    SequenceControlListComponent,
    SequenceControlFormComponent,
  ],
})
export class SequenceMasterComponent implements OnInit {
  @ViewChild(SequenceCodeListComponent) sequenceCodeList?: SequenceCodeListComponent;
  @ViewChild(SequenceControlListComponent) sequenceControlList?: SequenceControlListComponent;
  @ViewChild(SequenceCodeFormComponent) sequenceCodeForm?: SequenceCodeFormComponent;
  @ViewChild(SequenceControlFormComponent) sequenceControlForm?: SequenceControlFormComponent;

  readonly tabs: SequenceTabConfig[] = [
    { key: 'sequence-code', label: 'Sequence Codes', entityLabel: 'Sequence Code', moduleCode: 'SEQUENCE_CODES' },
    { key: 'sequence-control', label: 'Sequence Controls', entityLabel: 'Sequence Control', moduleCode: 'SEQUENCE_CONTROLS' },
  ];

  activeTab: SequenceTabKey = 'sequence-code';

  constructor(public ps: PermissionService) {}

  ngOnInit(): void {
    if (this.visibleTabs.length > 0) {
      this.activeTab = this.visibleTabs[0].key;
    }
  }

  get visibleTabs(): SequenceTabConfig[] {
    return this.tabs.filter((tab) => this.ps.hasAnyPermission(tab.moduleCode));
  }

  get currentTab(): SequenceTabConfig | null {
    return this.visibleTabs.find((tab) => tab.key === this.activeTab) || this.visibleTabs[0] || null;
  }

  setActiveTab(tabKey: SequenceTabKey): void {
    this.activeTab = tabKey;
  }

  addNew(): void {
    if (!this.currentTab || !this.ps.canCreate(this.currentTab.moduleCode)) return;
    this.activeForm?.openCreate();
  }

  editSelected(row: any): void {
    if (!this.currentTab || !this.ps.canEdit(this.currentTab.moduleCode)) return;
    if (row?.id) this.activeForm?.openEdit(row.id);
  }

  viewSelected(row: any): void {
    if (!this.currentTab || !this.ps.canView(this.currentTab.moduleCode)) return;
    if (row?.id) this.activeForm?.openView(row.id);
  }

  onSequenceCodeSaved(): void {
    this.sequenceCodeList?.reload();
  }

  onSequenceControlSaved(): void {
    this.sequenceControlList?.reload();
  }

  private get activeForm(): SequenceFormComponent | undefined {
    if (this.activeTab === 'sequence-code') return this.sequenceCodeForm;
    return this.sequenceControlForm;
  }
}
