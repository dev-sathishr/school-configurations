import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { environment } from 'src/environments/environment';
import { API } from '../../../core/api/endpoints';

export interface UploadedFile {
  id: string;
  original_name: string;
  mime_type: string;
  size: number;
  path: string;
}

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [AngularSvgIconModule],
  template: `
    <div>
      @if (label) {
        <label class="text-foreground mb-1.5 block text-xs font-medium">{{ label }}</label>
      }

      <!-- Avatar / Photo style (compact) -->
      @if (displayStyle === 'avatar' || displayStyle === 'photo') {
        <div class="flex items-center gap-4">
          <!-- Image preview or placeholder -->
          <div class="group relative">
            @if (previewSrc) {
              <img [src]="previewSrc" alt="Preview"
                (click)="openPreview()" (error)="onImageError()"
                [style.width]="sizeStyle" [style.height]="displayStyle === 'photo' ? photoHeight : sizeStyle"
                class="cursor-pointer border object-cover transition-opacity hover:opacity-80"
                [class.rounded-full]="displayStyle === 'avatar'"
                [class.rounded-lg]="displayStyle === 'photo'"
                [class.border-muted/30]="!!currentFile"
                [class.border-dashed]="!currentFile"
                [class.border-primary/30]="!currentFile" />
            } @else {
              <div (click)="fileInput.click()"
                class="flex cursor-pointer items-center justify-center border-2 border-dashed border-muted/40 bg-muted/10 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                [style.width]="sizeStyle" [style.height]="displayStyle === 'photo' ? photoHeight : sizeStyle"
                [class.rounded-full]="displayStyle === 'avatar'"
                [class.rounded-lg]="displayStyle === 'photo'">
                @if (uploading) {
                  <div class="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"></div>
                } @else {
                  <svg class="h-8 w-8 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                  </svg>
                }
              </div>
            }
            <!-- Remove button -->
            @if (previewSrc) {
              <button
                (click)="onRemove($event)"
                class="bg-red-500 absolute -right-1 -top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-white opacity-0 transition-opacity group-hover:opacity-100">
                <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            }
          </div>
          <!-- Text hint -->
          <div>
            @if (allowCamera) {
              <!-- Camera mode: two icon buttons side by side -->
              <div class="flex items-center gap-2">
                <button type="button" (click)="fileInput.click()"
                  class="border-muted/40 text-muted-foreground hover:border-primary hover:text-primary flex h-8 w-8 items-center justify-center rounded-full border transition-colors"
                  title="Upload from device">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                </button>
                <button type="button" (click)="openCamera()"
                  class="border-muted/40 text-muted-foreground hover:border-primary hover:text-primary flex h-8 w-8 items-center justify-center rounded-full border transition-colors"
                  title="Take photo">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                  </svg>
                </button>
                @if (previewSrc) {
                  <button type="button" (click)="onRemove($event)"
                    class="border-red-200 text-red-400 hover:border-red-400 hover:text-red-600 flex h-8 w-8 items-center justify-center rounded-full border transition-colors"
                    title="Remove">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                }
              </div>
            } @else {
              <!-- Standard mode: text links -->
              <button type="button" (click)="fileInput.click()" class="text-primary cursor-pointer text-xs font-medium hover:underline">
                {{ previewSrc ? 'Change' : 'Upload' }}
              </button>
              @if (previewSrc) {
                <button type="button" (click)="onRemove($event)" class="text-red-500 ml-2 cursor-pointer text-xs font-medium hover:underline">
                  Remove
                </button>
              }
            }
            <p class="text-muted-foreground/60 mt-0.5 text-[10px]">{{ acceptHint }}, max {{ maxSize }}MB</p>
          </div>
        </div>
      }

      <!-- Dropzone style (full width — for documents) -->
      @if (displayStyle === 'dropzone') {
        <!-- Uploaded file preview -->
        @if (currentFile) {
          @if (isImage) {
            <div class="group relative mb-2 inline-block">
              <img [src]="fileUrl(currentFile.id)" [alt]="currentFile.original_name"
                class="h-24 w-24 rounded-lg border border-muted/30 object-cover" />
              <button (click)="onRemove($event)"
                class="bg-red-500 absolute -right-2 -top-2 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-white opacity-0 transition-opacity group-hover:opacity-100">
                <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          } @else {
            <div class="border-border bg-muted/10 group relative mb-2 flex items-center gap-3 rounded-lg border px-3 py-2">
              <svg-icon src="assets/icons/heroicons/outline/folder.svg" [svgClass]="'h-5 w-5 text-muted-foreground'"></svg-icon>
              <div class="min-w-0 flex-1">
                <p class="text-foreground truncate text-xs font-medium">{{ currentFile.original_name }}</p>
                <p class="text-muted-foreground text-[10px]">{{ formatSize(currentFile.size) }}</p>
              </div>
              <button (click)="onRemove($event)" class="text-red-500 cursor-pointer opacity-0 transition-opacity group-hover:opacity-100">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          }
        }

        <!-- Pending file preview -->
        @if (!currentFile && pendingPreview) {
          <div class="group relative mb-2 inline-block">
            <img [src]="pendingPreview" alt="Preview" class="h-24 w-24 rounded-lg border border-dashed border-primary/30 object-cover" />
            <button (click)="removePending()"
              class="bg-red-500 absolute -right-2 -top-2 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-white opacity-0 transition-opacity group-hover:opacity-100">
              <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        }
        @if (!currentFile && pendingFile && !isPendingImage) {
          <div class="border-primary/30 bg-muted/10 group relative mb-2 flex items-center gap-3 rounded-lg border border-dashed px-3 py-2">
            <svg-icon src="assets/icons/heroicons/outline/folder.svg" [svgClass]="'h-5 w-5 text-muted-foreground'"></svg-icon>
            <div class="min-w-0 flex-1">
              <p class="text-foreground truncate text-xs font-medium">{{ pendingFile.name }}</p>
              <p class="text-muted-foreground text-[10px]">{{ formatSize(pendingFile.size) }}</p>
            </div>
            <button (click)="removePending()" class="text-red-500 cursor-pointer">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        }

        <!-- Upload area -->
        @if (!currentFile && !pendingFile || multiple) {
          <div
            (click)="fileInput.click()"
            (dragover)="onDragOver($event)"
            (dragleave)="dragOver = false"
            (drop)="onDrop($event)"
            class="border-border hover:border-primary/40 hover:bg-primary/5 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-5 transition-colors"
            [class.border-primary]="dragOver"
            [class.bg-primary/5]="dragOver">
            @if (uploading) {
              <div class="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"></div>
              <p class="text-muted-foreground mt-2 text-xs">Uploading...</p>
            } @else {
              <svg-icon src="assets/icons/heroicons/outline/download.svg" [svgClass]="'h-6 w-6 text-muted-foreground/40 rotate-180'"></svg-icon>
              <p class="text-muted-foreground mt-1 text-xs">
                <span class="text-primary font-medium">Click to upload</span> or drag and drop
              </p>
              <p class="text-muted-foreground/60 mt-0.5 text-[10px]">{{ acceptHint }} (max {{ maxSize }}MB)</p>
            }
          </div>
        }
      }

      <input #fileInput type="file" [accept]="accept" [multiple]="multiple" (change)="onFileSelect($event)" class="hidden" />

      @if (errorMessage) {
        <p class="mt-1 text-xs text-red-500">{{ errorMessage }}</p>
      }

      <!-- Image preview modal -->
      @if (showPreview && previewSrc) {
        <div class="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" (click)="closePreview()">
          <div class="relative max-h-[80vh] max-w-lg" (click)="$event.stopPropagation()">
            <img [src]="previewSrc" alt="Preview" class="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl" />
            <button type="button" (click)="closePreview()"
              class="absolute -right-3 -top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white text-gray-700 shadow-lg hover:bg-gray-100">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      }

      <!-- Camera modal -->
      @if (showCamera) {
        <div class="fixed inset-0 z-[210] flex items-center justify-center bg-black/70 p-4" (click)="closeCamera()">
          <div class="bg-background w-full max-w-sm rounded-xl p-4 shadow-2xl" (click)="$event.stopPropagation()">
            <div class="mb-3 flex items-center justify-between">
              <span class="text-foreground text-sm font-semibold">Take Photo</span>
              <button type="button" (click)="closeCamera()" class="text-muted-foreground hover:text-foreground">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            @if (cameraError) {
              <p class="mb-3 rounded-md bg-red-50 p-2 text-xs text-red-600">{{ cameraError }}</p>
            }
            <div class="relative overflow-hidden rounded-lg bg-black" style="aspect-ratio: 1">
              <video #videoEl autoplay playsinline muted class="h-full w-full object-cover" style="transform: scaleX(-1)"></video>
            </div>
            <canvas #canvasEl class="hidden"></canvas>
            <div class="mt-3 flex justify-center gap-3">
              <button type="button" (click)="capturePhoto()"
                class="bg-primary text-primary-foreground flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium hover:opacity-90">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                </svg>
                Capture
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class FileUploadComponent implements OnChanges, OnDestroy {
  @Input() fieldKey = '';
  @Input() entityType = '';
  @Input() entityId = '';
  @Input() fileType = 'document';
  @Input() accept = 'image/*';
  @Input() maxSize = 2; // MB
  @Input() multiple = false;
  @Input() label = '';
  @Input() displayStyle: 'avatar' | 'photo' | 'dropzone' = 'dropzone';
  @Input() initialFile: UploadedFile | null = null;
  @Input() allowCamera = false;

  @Output() fileUploaded = new EventEmitter<UploadedFile>();
  @Output() fileRemoved = new EventEmitter<string>();

  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLCanvasElement>;

  // Avatar: 100px circle, Photo: 100px wide x 120px tall (passport ratio)
  get sizeStyle(): string { return this.displayStyle === 'avatar' ? '100px' : '100px'; }
  get photoHeight(): string { return '120px'; }

  currentFile: UploadedFile | null = null;
  pendingFile: File | null = null;
  pendingPreview: string | null = null;
  pendingBase64: string | null = null;
  uploading = false;
  showPreview = false;
  dragOver = false;
  errorMessage = '';
  showCamera = false;
  cameraError = '';
  private initialFileProvided = false;
  private cameraStream: MediaStream | null = null;

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    // If parent provided initialFile (even null), use it — skip the separate API call
    if (changes['initialFile']) {
      this.initialFileProvided = true;
      this.currentFile = this.initialFile;
      this.cdr.detectChanges();
    }
    if ((changes['entityId'] || changes['entityType']) && this.entityType && this.entityId) {
      if (!this.initialFileProvided) {
        this.loadExistingFile();
      }
    }
  }

  get isImage(): boolean {
    return this.currentFile?.mime_type?.startsWith('image/') || false;
  }

  get isPendingImage(): boolean {
    return this.pendingFile?.type?.startsWith('image/') || false;
  }

  get previewSrc(): string | null {
    if (this.currentFile && this.isImage) return this.fileUrl(this.currentFile.id);
    if (this.pendingPreview) return this.pendingPreview;
    return null;
  }

  get acceptHint(): string {
    if (this.accept === 'image/*') return 'PNG, JPG, WEBP';
    if (this.accept.includes('.pdf')) return 'PDF, DOC, XLSX';
    return this.accept;
  }

  fileUrl(id: string): string {
    const token = localStorage.getItem('access_token');
    return `${this.apiUrl}${API.files.detail(id)}?token=${token}`;
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) this.handleFile(files[0]);
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
      input.value = '';
    }
  }

  onImageError(): void {
    // File record exists in DB but file is missing on disk — clear stale reference
    this.currentFile = null;
    this.cdr.detectChanges();
  }

  openPreview(): void {
    if (this.previewSrc) this.showPreview = true;
  }

  closePreview(): void {
    this.showPreview = false;
  }

  onRemove(event: MouseEvent): void {
    event.stopPropagation();
    if (this.currentFile) {
      this.removeFile();
    } else {
      this.removePending();
    }
  }

  openCamera(): void {
    this.cameraError = '';
    this.showCamera = true;
    this.cdr.detectChanges();
    setTimeout(() => this.startStream(), 50);
  }

  private startStream(): void {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(stream => {
        this.cameraStream = stream;
        const video = this.videoEl?.nativeElement;
        if (video) {
          video.srcObject = stream;
        }
        this.cdr.detectChanges();
      })
      .catch(() => {
        this.cameraError = 'Camera access denied or not available.';
        this.cdr.detectChanges();
      });
  }

  capturePhoto(): void {
    const video = this.videoEl?.nativeElement;
    const canvas = this.canvasEl?.nativeElement;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror the capture to match the mirrored video preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      this.stopStream();
      this.showCamera = false;
      this.handleFile(file);
      this.cdr.detectChanges();
    }, 'image/jpeg', 0.92);
  }

  closeCamera(): void {
    this.stopStream();
    this.showCamera = false;
    this.cameraError = '';
    this.cdr.detectChanges();
  }

  private stopStream(): void {
    this.cameraStream?.getTracks().forEach(t => t.stop());
    this.cameraStream = null;
  }

  ngOnDestroy(): void {
    this.stopStream();
  }

  get pendingFileData(): { file_data: string; file_name: string; mime_type: string; size: number } | null {
    if (!this.pendingFile || !this.pendingBase64) return null;
    const base64 = this.pendingBase64.includes(',') ? this.pendingBase64.split(',')[1] : this.pendingBase64;
    return { file_data: base64, file_name: this.pendingFile.name, mime_type: this.pendingFile.type, size: this.pendingFile.size };
  }

  private handleFile(file: File): void {
    this.errorMessage = '';

    if (file.size > this.maxSize * 1024 * 1024) {
      this.errorMessage = `File size exceeds ${this.maxSize}MB limit`;
      return;
    }

    this.pendingFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      this.pendingBase64 = result;
      if (file.type.startsWith('image/')) {
        this.pendingPreview = result;
      }
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  clearPending(): void {
    this.pendingFile = null;
    this.pendingPreview = null;
    this.pendingBase64 = null;
  }

  removePending(): void {
    this.clearPending();
    this.cdr.detectChanges();
  }

  removeFile(): void {
    if (!this.currentFile) return;
    const fileId = this.currentFile.id;
    this.http.delete(`${this.apiUrl}${API.files.detail(fileId)}`).subscribe({
      next: () => {
        this.currentFile = null;
        this.fileRemoved.emit(fileId);
        this.cdr.detectChanges();
      },
    });
  }

  private loadExistingFile(): void {
    this.http.get<any>(`${this.apiUrl}${API.files.byEntity(this.entityType, this.entityId)}?file_type=${this.fileType}`).subscribe({
      next: (res) => {
        const files = res.files || [];
        this.currentFile = files.length > 0 ? files[0] : null;
        this.cdr.detectChanges();
      },
    });
  }
}
