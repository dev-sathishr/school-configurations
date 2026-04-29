import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, NgZone, OnDestroy, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonService } from '../../services/common/common.service';
import { ModalComponent } from '../modal/modal.component';
import { FormFieldComponent, SelectOption } from '../form-field/form-field.component';
import { ButtonComponent } from '../button/button.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { API } from '../../../core/api/endpoints';
import { ADDRESS_TYPE_OPTIONS } from '../../../core/constants/enums';

export interface Address {
  id?: string;
  address_type: string;
  address_line1: string;
  address_line2: string;
  pincode: string;
  post_office: string;
  city: string;
  state: string;
  country: string;
}

@Component({
  selector: 'app-address',
  templateUrl: './address.component.html',
  host: { class: 'block' },
  imports: [ReactiveFormsModule, ModalComponent, FormFieldComponent, ButtonComponent, ConfirmDialogComponent],
})
export class AddressComponent implements AfterViewInit, OnDestroy {
  @Input() addresses: Address[] = [];
  @Input() errorMessage = '';
  @Output() addressesChange = new EventEmitter<Address[]>();

  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  showModal = false;
  editIndex: number | null = null;
  form!: FormGroup;
  submitted = false;

  // Pincode
  postOfficeOptions: SelectOption[] = [];
  pincodeLoading = false;

  // Delete confirm
  showDeleteConfirm = false;
  deleteIndex: number | null = null;

  // Map
  private map: google.maps.Map | null = null;
  private marker: google.maps.Marker | null = null;
  private geocoder: google.maps.Geocoder | null = null;
  private autocomplete: google.maps.places.Autocomplete | null = null;
  private mapInitialized = false;
  private fillingFromMap = false; // prevents forward geocode when map itself filled the form
  private forwardGeocodeTimer: any = null;
  locating = false;
  mapError = '';

  // Default center: India
  private defaultCenter = { lat: 20.5937, lng: 78.9629 };
  private defaultZoom = 5;

  addressTypes: SelectOption[] = ADDRESS_TYPE_OPTIONS;

  constructor(private fb: FormBuilder, private cs: CommonService, private cdr: ChangeDetectorRef, private zone: NgZone) {}

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    clearTimeout(this.forwardGeocodeTimer);
    this.destroyMap();
  }

  private createForm(data: any = {}): void {
    this.form = this.fb.group({
      id: [data.id || null],
      address_type: [data.address_type || '', [Validators.required]],
      address_line1: [data.address_line1 || '', [Validators.required, Validators.maxLength(300)]],
      address_line2: [data.address_line2 || '', [Validators.maxLength(300)]],
      pincode: [data.pincode || '', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern(/^\d{6}$/)]],
      post_office: [data.post_office || '', [Validators.required, Validators.maxLength(200)]],
      city: [{ value: data.city || '', disabled: true }, [Validators.maxLength(100)]],
      state: [{ value: data.state || '', disabled: true }, [Validators.maxLength(100)]],
      country: [{ value: data.country || 'India', disabled: true }, [Validators.maxLength(100)]],
    });

    this.postOfficeOptions = [];
    this.submitted = false;

    this.form.get('pincode')?.valueChanges.subscribe((val: string) => {
      this.form.patchValue({ post_office: '' });
      this.postOfficeOptions = [];
      if (val && val.length === 6) this.lookupPincode(val);
    });

    // Forward geocode when address_line1 changes manually (debounced)
    this.form.get('address_line1')?.valueChanges.subscribe(() => {
      if (!this.fillingFromMap) this.scheduleForwardGeocode();
    });
  }

  openAdd(): void {
    this.editIndex = null;
    const defaultType = this.availableAddressTypes[0]?.value || '';
    this.createForm({ address_type: defaultType });
    this.showModal = true;
    this.mapError = '';
    this.initMapAfterOpen();
  }

  openEdit(index: number): void {
    this.editIndex = index;
    this.createForm(this.addresses[index]);
    this.showModal = true;
    this.mapError = '';
    this.initMapAfterOpen(true);
  }

  closeModal(): void {
    this.showModal = false;
    this.destroyMap();
  }

  save(): void {
    this.submitted = true;
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const updated = [...this.addresses];

    // Check for duplicate address type
    const duplicateIndex = updated.findIndex((a, i) => a.address_type === value.address_type && i !== this.editIndex);
    if (duplicateIndex >= 0) {
      const typeLabel = this.getTypeLabel(value.address_type);
      this.cs.showToastr({ type: 'error', message: 'Duplicate address type', description: `A "${typeLabel}" address already exists` });
      return;
    }

    if (this.editIndex !== null) {
      updated[this.editIndex] = value;
    } else {
      updated.push(value);
    }

    this.addresses = updated;
    this.addressesChange.emit(this.addresses);
    this.showModal = false;
    this.destroyMap();
  }

  confirmDelete(index: number): void {
    this.deleteIndex = index;
    this.showDeleteConfirm = true;
  }

  doDelete(): void {
    if (this.deleteIndex !== null) {
      const updated = [...this.addresses];
      updated.splice(this.deleteIndex, 1);
      this.addresses = updated;
      this.addressesChange.emit(this.addresses);
    }
    this.showDeleteConfirm = false;
    this.deleteIndex = null;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deleteIndex = null;
  }

  getTypeLabel(type: string): string {
    return this.addressTypes.find(t => t.value === type)?.label || type;
  }

  get availableAddressTypes(): SelectOption[] {
    const usedTypes = this.addresses
      .filter((_, i) => i !== this.editIndex)
      .map((a) => a.address_type);
    return this.addressTypes.filter((t) => !usedTypes.includes(t.value));
  }

  // --- Map Methods ---

  private initMapAfterOpen(showExisting = false): void {
    this.mapInitialized = false;
    // Wait for modal DOM to render
    setTimeout(() => {
      this.initMap();
      // If editing, forward geocode the existing address to show on map
      if (showExisting && this.mapInitialized) this.forwardGeocodeFromForm();
    }, 150);
  }

  private initMap(): void {
    if (!this.mapContainer?.nativeElement || typeof google === 'undefined') {
      this.mapError = 'Google Maps failed to load. You can still enter the address manually.';
      this.cdr.detectChanges();
      return;
    }

    const container = this.mapContainer.nativeElement;

    this.map = new google.maps.Map(container, {
      center: this.defaultCenter,
      zoom: this.defaultZoom,
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        position: google.maps.ControlPosition.TOP_RIGHT,
        mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE],
      },
      streetViewControl: false,
      fullscreenControl: true,
      fullscreenControlOptions: {
        position: google.maps.ControlPosition.TOP_LEFT,
      },
      zoomControl: true,
      gestureHandling: 'greedy',
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    });

    this.geocoder = new google.maps.Geocoder();

    // Click on map to select location
    this.map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        this.placeMarker(e.latLng);
        this.reverseGeocode(e.latLng);
      }
    });

    // Setup places autocomplete on search input
    if (this.searchInput?.nativeElement) {
      this.autocomplete = new google.maps.places.Autocomplete(this.searchInput.nativeElement, {
        componentRestrictions: { country: 'in' },
        fields: ['geometry', 'address_components', 'formatted_address'],
      });

      this.autocomplete.addListener('place_changed', () => {
        const place = this.autocomplete!.getPlace();
        if (place.geometry?.location) {
          const loc = place.geometry.location;
          this.map?.setCenter(loc);
          this.map?.setZoom(17);
          this.placeMarker(loc);
          if (place.address_components) {
            this.zone.run(() => this.fillFromComponents(place.address_components!));
          } else {
            this.reverseGeocode(loc);
          }
        }
      });
    }

    this.mapInitialized = true;
  }

  private destroyMap(): void {
    if (this.marker) {
      this.marker.setMap(null);
      this.marker = null;
    }
    if (this.autocomplete) {
      google.maps.event.clearInstanceListeners(this.autocomplete);
      this.autocomplete = null;
    }
    if (this.map) {
      google.maps.event.clearInstanceListeners(this.map);
      this.map = null;
    }
    this.mapInitialized = false;
  }

  private placeMarker(location: google.maps.LatLng): void {
    if (this.marker) {
      this.marker.setPosition(location);
    } else {
      this.marker = new google.maps.Marker({
        position: location,
        map: this.map!,
        draggable: true,
        animation: google.maps.Animation.DROP,
      });

      // Drag marker to refine location
      this.marker.addListener('dragend', () => {
        const pos = this.marker!.getPosition();
        if (pos) this.reverseGeocode(pos);
      });
    }
  }

  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.mapError = 'Geolocation is not supported by your browser.';
      this.cdr.detectChanges();
      return;
    }

    this.locating = true;
    this.mapError = '';
    this.cdr.detectChanges();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.zone.run(() => {
          const loc = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
          this.map?.setCenter(loc);
          this.map?.setZoom(17);
          this.placeMarker(loc);
          this.reverseGeocode(loc);
          this.locating = false;
          this.cdr.detectChanges();
        });
      },
      (error) => {
        this.zone.run(() => {
          this.locating = false;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              this.mapError = 'Location permission denied. Please allow location access.';
              break;
            case error.POSITION_UNAVAILABLE:
              this.mapError = 'Location unavailable. Please try again.';
              break;
            default:
              this.mapError = 'Could not get your location. Please try again.';
          }
          this.cdr.detectChanges();
        });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  private reverseGeocode(location: google.maps.LatLng): void {
    if (!this.geocoder) return;

    this.geocoder.geocode({ location }, (results, status) => {
      this.zone.run(() => {
        if (status === 'OK' && results?.[0]) {
          this.fillFromComponents(results[0].address_components);
        }
      });
    });
  }

  private fillFromComponents(components: google.maps.GeocoderAddressComponent[], fromMap = true): void {
    this.fillingFromMap = fromMap;
    let addressLine1 = '';
    let addressLine2 = '';
    let pincode = '';
    let city = '';
    let state = '';
    let country = '';

    for (const comp of components) {
      const types = comp.types;

      if (types.includes('street_number')) {
        addressLine1 = comp.long_name + (addressLine1 ? ', ' + addressLine1 : '');
      } else if (types.includes('route')) {
        addressLine1 = addressLine1 ? addressLine1 + ', ' + comp.long_name : comp.long_name;
      } else if (types.includes('premise') || types.includes('subpremise')) {
        addressLine1 = addressLine1 ? comp.long_name + ', ' + addressLine1 : comp.long_name;
      } else if (types.includes('sublocality_level_2') || types.includes('sublocality_level_3')) {
        addressLine2 = addressLine2 ? addressLine2 + ', ' + comp.long_name : comp.long_name;
      } else if (types.includes('sublocality_level_1') || types.includes('neighborhood')) {
        addressLine2 = addressLine2 ? addressLine2 + ', ' + comp.long_name : comp.long_name;
      } else if (types.includes('locality')) {
        city = comp.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        state = comp.long_name;
      } else if (types.includes('country')) {
        country = comp.long_name;
      } else if (types.includes('postal_code')) {
        pincode = comp.long_name;
      }
    }

    // Fill form fields
    if (addressLine1) this.form.patchValue({ address_line1: addressLine1 });
    if (addressLine2) this.form.patchValue({ address_line2: addressLine2 });
    if (city) this.form.get('city')?.setValue(city);
    if (state) this.form.get('state')?.setValue(state);
    if (country) this.form.get('country')?.setValue(country);

    // Set pincode — this also triggers the pincode lookup for post office
    if (pincode && pincode.length === 6) {
      this.form.patchValue({ pincode });
    }

    this.cdr.detectChanges();

    // Reset flag after a tick so subsequent manual edits trigger forward geocode
    setTimeout(() => (this.fillingFromMap = false), 0);
  }

  // --- Forward Geocoding (form → map) ---

  private scheduleForwardGeocode(): void {
    clearTimeout(this.forwardGeocodeTimer);
    this.forwardGeocodeTimer = setTimeout(() => this.forwardGeocodeFromForm(), 1000);
  }

  private forwardGeocodeFromForm(): void {
    if (!this.geocoder || !this.mapInitialized) return;

    const raw = this.form.getRawValue();
    // Build address string from available fields
    const parts = [raw.address_line1, raw.address_line2, raw.city, raw.state, raw.pincode, raw.country].filter(Boolean);
    if (parts.length < 2) return; // need at least some info

    const address = parts.join(', ');

    this.geocoder.geocode({ address, region: 'in' }, (results, status) => {
      this.zone.run(() => {
        if (status === 'OK' && results?.[0]?.geometry?.location) {
          const loc = results[0].geometry.location;
          this.map?.setCenter(loc);
          this.map?.setZoom(raw.address_line1 ? 17 : 12);
          this.placeMarker(loc);
        }
      });
    });
  }

  private lookupPincode(pincode: string): void {
    this.pincodeLoading = true;
    this.cs.getService({ url: API.pincode.lookup(pincode) }).subscribe({
      next: (res: any) => {
        const data = res.data;
        this.form.get('city')?.setValue(data.city || '');
        this.form.get('state')?.setValue(data.state || '');
        this.form.get('country')?.setValue(data.country || 'India');
        this.postOfficeOptions = (data.post_offices || []).map((po: string) => ({ value: po, label: po }));
        if (data.post_offices?.length === 1) {
          this.form.patchValue({ post_office: data.post_offices[0] });
        }
        this.pincodeLoading = false;
        this.cdr.detectChanges();
        // Show location on map after pincode fills city/state
        if (!this.fillingFromMap) this.forwardGeocodeFromForm();
      },
      error: () => {
        this.form.patchValue({ pincode: '', post_office: '' });
        this.form.get('city')?.setValue('');
        this.form.get('state')?.setValue('');
        this.form.get('country')?.setValue('');
        this.postOfficeOptions = [];
        this.pincodeLoading = false;
        this.cdr.detectChanges();
      },
    });
  }
}
