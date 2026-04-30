import { Pipe, PipeTransform } from '@angular/core';

/** Formats a number in Indian currency style: ₹1,20,000 */
@Pipe({ name: 'inrCurrency', standalone: true })
export class InrCurrencyPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') return '—';
    const num = Number(value);
    if (isNaN(num)) return '—';
    return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }
}
