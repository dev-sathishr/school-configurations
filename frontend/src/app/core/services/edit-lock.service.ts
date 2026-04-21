import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API } from '../api/endpoints';
import { CommonService } from '../../shared/services/common/common.service';

@Injectable({ providedIn: 'root' })
export class EditLockService {
  constructor(private cs: CommonService) {}

  acquire(moduleCode: string, recordId: string): Observable<any> {
    return this.cs.postService({
      url: API.editLocks.acquire,
      payload: { module_code: moduleCode, record_id: recordId },
    });
  }

  release(moduleCode: string, recordId: string): Observable<any> {
    return this.cs.postService({
      url: API.editLocks.release,
      payload: { module_code: moduleCode, record_id: recordId },
    });
  }
}

