import { Component, OnInit, ViewChild } from '@angular/core';
import { PermissionService } from '../../../../../core/services/permission.service';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { ClassGeneralFormComponent } from '../class-general/class-general-form/class-general-form.component';
import { ClassGeneralListComponent } from '../class-general/class-general-list/class-general-list.component';
import { ClassLevelFormComponent } from '../class-level/class-level-form/class-level-form.component';
import { ClassLevelListComponent } from '../class-level/class-level-list/class-level-list.component';

type ClassMasterTabKey = 'class-general' | 'class-level';

interface ClassMasterFormComponent {
  openCreate(): void;
  openEdit(id: string): void;
  openView(id: string): void;
}

interface ClassMasterTabConfig {
  key: ClassMasterTabKey;
  label: string;
  entityLabel: string;
  moduleCode: string;
}

@Component({
  selector: 'app-class-master',
  templateUrl: './class-master.component.html',
  standalone: true,
  imports: [
    BreadcrumbComponent,
    ButtonComponent,
    ClassGeneralListComponent,
    ClassGeneralFormComponent,
    ClassLevelListComponent,
    ClassLevelFormComponent,
  ],
})
export class ClassMasterComponent implements OnInit {
  @ViewChild(ClassGeneralListComponent) classGeneralList?: ClassGeneralListComponent;
  @ViewChild(ClassLevelListComponent) classLevelList?: ClassLevelListComponent;
  @ViewChild(ClassGeneralFormComponent) classGeneralForm?: ClassGeneralFormComponent;
  @ViewChild(ClassLevelFormComponent) classLevelForm?: ClassLevelFormComponent;

  readonly tabs: ClassMasterTabConfig[] = [
    {
      key: 'class-general',
      label: 'Class General',
      entityLabel: 'Class General',
      moduleCode: 'CLASSES',
    },
    {
      key: 'class-level',
      label: 'Class Level',
      entityLabel: 'Class Level',
      moduleCode: 'CLASS_LEVELS',
    },
  ];

  activeTab: ClassMasterTabKey = 'class-general';

  constructor(public ps: PermissionService) {}

  ngOnInit(): void {
    if (this.visibleTabs.length > 0) {
      this.activeTab = this.visibleTabs[0].key;
    }
  }

  get visibleTabs(): ClassMasterTabConfig[] {
    return this.tabs.filter((tab) => this.ps.hasAnyPermission(tab.moduleCode));
  }

  get currentTab(): ClassMasterTabConfig | null {
    return this.visibleTabs.find((tab) => tab.key === this.activeTab) || this.visibleTabs[0] || null;
  }

  setActiveTab(tabKey: ClassMasterTabKey): void {
    this.activeTab = tabKey;
  }

  addNew(): void {
    if (!this.currentTab || !this.ps.canCreate(this.currentTab.moduleCode)) return;
    this.openFormForActiveTab('create');
  }

  editSelected(row: any): void {
    if (!this.currentTab || !this.ps.canEdit(this.currentTab.moduleCode)) return;
    this.openFormForActiveTab('edit', row?.id);
  }

  viewSelected(row: any): void {
    if (!this.currentTab || !this.ps.canView(this.currentTab.moduleCode)) return;
    this.openFormForActiveTab('view', row?.id);
  }

  onClassGeneralSaved(): void {
    this.classGeneralList?.reload();
  }

  onClassLevelSaved(): void {
    this.classLevelList?.reload();
  }

  private get activeForm(): ClassMasterFormComponent | undefined {
    if (this.activeTab === 'class-general') return this.classGeneralForm;
    return this.classLevelForm;
  }

  private openFormForActiveTab(mode: 'create' | 'edit' | 'view', id?: string): void {
    const formComponent = this.activeForm;
    if (!formComponent) return;

    if (mode === 'create') {
      formComponent.openCreate();
      return;
    }

    if (!id) return;
    if (mode === 'edit') {
      formComponent.openEdit(id);
      return;
    }
    formComponent.openView(id);
  }
}
