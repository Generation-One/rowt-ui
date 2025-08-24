import { BaseComponent } from './base-component.js';
import { createElement, querySelector } from '../utils/dom-helpers.js';
import * as QRCode from 'qrcode';
import type { Link } from '../types/api.js';

export interface QRCodePageConfig {
  link: Link;
  shortUrl: string;
  onClose: () => void;
}

export interface QRCodeOptions {
  size: number;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  foregroundColor: string;
  backgroundColor: string;
  margin: number;
}

export class QRCodeModalComponent extends BaseComponent {
  private config: QRCodePageConfig;
  private qrOptions: QRCodeOptions;
  private qrCanvas: HTMLCanvasElement | null = null;
  private qrContainer: HTMLElement | null = null;
  private linkUrlEl: HTMLElement | null = null;
  private urlParams: { key: string; value: string }[] = [];

  constructor(container: HTMLElement, config: QRCodePageConfig) {
    super(container);
    this.config = config;
    this.qrOptions = {
      size: 320,
      errorCorrectionLevel: 'M',
      foregroundColor: '#000000',
      backgroundColor: '#ffffff',
      margin: 4
    };
  }

  render(): void {
    this.checkDestroyed();
    this.clear();

    const pageContent = createElement('div', { className: 'qr-page-content' });

    // Header
    const header = this.createHeader();
    pageContent.appendChild(header);

    // Main content area with QR code and controls
    const contentArea = createElement('div', { className: 'qr-content-area' });

    // QR Code display area
    const qrSection = createElement('div', { className: 'qr-display-section' });
    const qrTitle = createElement('h3', {
      textContent: 'QR Code',
      className: 'qr-section-title'
    });

    this.qrContainer = createElement('div', { className: 'qr-container' });

    qrSection.appendChild(qrTitle);
    qrSection.appendChild(this.qrContainer);

    // Controls section
    const controlsSection = this.createControlsSection();

    // Parameters section
    const paramsSection = this.createParamsSection();

    // Download section
    const downloadSection = this.createDownloadSection();

    contentArea.appendChild(qrSection);
    contentArea.appendChild(controlsSection);
    contentArea.appendChild(paramsSection);
    contentArea.appendChild(downloadSection);

    pageContent.appendChild(contentArea);
    this.container.appendChild(pageContent);

    // Generate initial QR code
    this.generateQRCode();
  }

  private createHeader(): HTMLElement {
    const header = createElement('div', { className: 'qr-page-header' });

    // Back button and navigation
    const navigation = createElement('div', { className: 'qr-navigation' });
    const backBtn = this.createIconButton('←', 'qr-back-btn', () => {
      this.config.onClose();
    });
    backBtn.setAttribute('title', 'Back to Links');

    const navText = createElement('span', {
      textContent: 'Back to Links',
      className: 'qr-nav-text'
    });

    navigation.appendChild(backBtn);
    navigation.appendChild(navText);

    const titleSection = createElement('div', { className: 'qr-title-section' });
    const title = createElement('h1', {
      textContent: 'QR Code Generator',
      className: 'qr-page-title'
    });

    const linkInfo = createElement('div', { className: 'qr-link-info' });
    const linkTitle = createElement('div', {
      textContent: this.config.link.title || 'Untitled Link',
      className: 'qr-link-title'
    });
    this.linkUrlEl = createElement('div', {
      textContent: this.config.shortUrl,
      className: 'qr-link-url'
    });

    linkInfo.appendChild(linkTitle);
    if (this.linkUrlEl) linkInfo.appendChild(this.linkUrlEl);

    titleSection.appendChild(title);
    titleSection.appendChild(linkInfo);

    header.appendChild(navigation);
    header.appendChild(titleSection);

    return header;
  }

  private createControlsSection(): HTMLElement {
    const section = createElement('div', { className: 'qr-controls-section' });
    const title = createElement('h3', {
      textContent: 'Customization',
      className: 'qr-section-title'
    });

    const controls = createElement('div', { className: 'qr-controls' });
    
    // Size control
    const sizeControl = this.createRangeControl(
      'Size',
      'size',
      this.qrOptions.size,
      128,
      512,
      32,
      (value) => {
        this.qrOptions.size = value;
        this.generateQRCode();
      }
    );
    
    // Error correction level
    const errorLevelControl = this.createSelectControl(
      'Error Correction',
      'errorLevel',
      this.qrOptions.errorCorrectionLevel,
      [
        { value: 'L', label: 'Low (~7%)' },
        { value: 'M', label: 'Medium (~15%)' },
        { value: 'Q', label: 'Quartile (~25%)' },
        { value: 'H', label: 'High (~30%)' }
      ],
      (value) => {
        this.qrOptions.errorCorrectionLevel = value as 'L' | 'M' | 'Q' | 'H';
        this.generateQRCode();
      }
    );
    
    // Color controls
    const colorControls = createElement('div', { className: 'qr-color-controls' });
    
    const fgColorControl = this.createColorControl(
      'Foreground Color',
      'fgColor',
      this.qrOptions.foregroundColor,
      (value) => {
        this.qrOptions.foregroundColor = value;
        this.generateQRCode();
      }
    );
    
    const bgColorControl = this.createColorControl(
      'Background Color',
      'bgColor',
      this.qrOptions.backgroundColor,
      (value) => {
        this.qrOptions.backgroundColor = value;
        this.generateQRCode();
      }
    );
    
    colorControls.appendChild(fgColorControl);
    colorControls.appendChild(bgColorControl);
    
    controls.appendChild(sizeControl);
    controls.appendChild(errorLevelControl);
    controls.appendChild(colorControls);

    section.appendChild(title);
    section.appendChild(controls);

    return section;
  }

  private createParamsSection(): HTMLElement {
    const section = createElement('div', { className: 'qr-controls-section' });
    const title = createElement('h3', {
      textContent: 'URL Parameters',
      className: 'qr-section-title'
    });

    const info = createElement('p', {
      className: 'qr-params-info',
      textContent: 'Optionally add key=value parameters. They will be appended to the short URL and encoded into the QR code.'
    });

    const list = createElement('div', { className: 'qr-params-list' });

    const addRow = () => {
      const rowIndex = this.urlParams.length;
      this.urlParams.push({ key: '', value: '' });
      const row = this.createParamRow(rowIndex);
      list.appendChild(row);
    };

    const addBtn = this.createButton('Add Parameter', 'qr-add-param-btn', () => {
      addRow();
    });

    section.appendChild(title);
    section.appendChild(info);
    section.appendChild(list);
    section.appendChild(addBtn);

    // Start with one empty row for convenience
    if (this.urlParams.length === 0) addRow();

    return section;
  }

  private createParamRow(index: number): HTMLElement {
    const row = createElement('div', { className: 'qr-param-row' });

    const keyInput = createElement('input', {
      className: 'qr-param-input',
      attributes: { type: 'text', placeholder: 'key' }
    }) as HTMLInputElement;

    const valueInput = createElement('input', {
      className: 'qr-param-input',
      attributes: { type: 'text', placeholder: 'value' }
    }) as HTMLInputElement;

    const removeBtn = this.createButton('🗑️', 'qr-remove-param-btn', () => {
      this.urlParams.splice(index, 1);
      row.remove();
      this.updateEffectiveUrl();
    });

    const onChange = () => {
      this.urlParams[index] = { key: keyInput.value.trim(), value: valueInput.value.trim() };
      this.updateEffectiveUrl();
    };

    keyInput.addEventListener('input', onChange);
    valueInput.addEventListener('input', onChange);

    row.appendChild(keyInput);
    row.appendChild(valueInput);
    row.appendChild(removeBtn);

    return row;
  }

  private getEffectiveUrl(): string {
    const url = new URL(this.config.shortUrl, window.location.origin);
    const params = new URLSearchParams(url.search);

    // Add custom params (skip blanks)
    for (const { key, value } of this.urlParams) {
      if (key) params.set(key, value);
    }

    url.search = params.toString();
    return url.toString();
  }

  private updateEffectiveUrl(): void {
    const effectiveUrl = this.getEffectiveUrl();
    if (this.linkUrlEl) this.linkUrlEl.textContent = effectiveUrl;
    this.generateQRCode();
  }

  private createDownloadSection(): HTMLElement {
    const section = createElement('div', { className: 'qr-download-section' });
    const title = createElement('h3', {
      textContent: 'Download',
      className: 'qr-section-title'
    });

    const buttons = createElement('div', { className: 'qr-download-buttons' });

    const pngBtn = this.createButton('Download PNG', 'btn btn-primary qr-download-btn', () => {
      this.downloadQRCode('png');
    });

    const svgBtn = this.createButton('Download SVG', 'btn btn-secondary qr-download-btn', () => {
      this.downloadQRCode('svg');
    });

    const copyUrlBtn = this.createButton('Copy URL', 'btn btn-secondary qr-download-btn', () => {
      const url = this.getEffectiveUrl();
      navigator.clipboard.writeText(url).then(() => this.showSuccess('URL copied to clipboard'));
    });

    buttons.appendChild(pngBtn);
    buttons.appendChild(svgBtn);
    buttons.appendChild(copyUrlBtn);

    section.appendChild(title);
    section.appendChild(buttons);

    return section;
  }

  private createRangeControl(
    label: string,
    id: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (value: number) => void
  ): HTMLElement {
    const control = createElement('div', { className: 'qr-control' });
    const labelEl = createElement('label', { 
      textContent: `${label}: ${value}px`,
      className: 'qr-control-label',
      attributes: { for: id }
    });
    
    const input = createElement('input', {
      className: 'qr-range-input',
      attributes: {
        type: 'range',
        id: id,
        min: min.toString(),
        max: max.toString(),
        step: step.toString(),
        value: value.toString()
      }
    }) as HTMLInputElement;
    
    input.addEventListener('input', () => {
      const newValue = parseInt(input.value);
      labelEl.textContent = `${label}: ${newValue}px`;
      onChange(newValue);
    });
    
    control.appendChild(labelEl);
    control.appendChild(input);
    
    return control;
  }

  private createSelectControl(
    label: string,
    id: string,
    value: string,
    options: { value: string; label: string }[],
    onChange: (value: string) => void
  ): HTMLElement {
    const control = createElement('div', { className: 'qr-control' });
    const labelEl = createElement('label', { 
      textContent: label,
      className: 'qr-control-label',
      attributes: { for: id }
    });
    
    const select = createElement('select', {
      className: 'qr-select-input',
      attributes: { id: id }
    }) as HTMLSelectElement;
    
    options.forEach(option => {
      const optionEl = createElement('option', {
        textContent: option.label,
        attributes: { value: option.value }
      }) as HTMLOptionElement;
      
      if (option.value === value) {
        optionEl.selected = true;
      }
      
      select.appendChild(optionEl);
    });
    
    select.addEventListener('change', () => {
      onChange(select.value);
    });
    
    control.appendChild(labelEl);
    control.appendChild(select);
    
    return control;
  }

  private createColorControl(
    label: string,
    id: string,
    value: string,
    onChange: (value: string) => void
  ): HTMLElement {
    const control = createElement('div', { className: 'qr-control qr-color-control' });
    const labelEl = createElement('label', { 
      textContent: label,
      className: 'qr-control-label',
      attributes: { for: id }
    });
    
    const input = createElement('input', {
      className: 'qr-color-input',
      attributes: {
        type: 'color',
        id: id,
        value: value
      }
    }) as HTMLInputElement;
    
    input.addEventListener('change', () => {
      onChange(input.value);
    });
    
    control.appendChild(labelEl);
    control.appendChild(input);
    
    return control;
  }

  private async generateQRCode(): Promise<void> {
    if (!this.qrContainer) return;

    try {
      // Clear previous QR code
      this.qrContainer.innerHTML = '';

      // Create canvas element
      this.qrCanvas = createElement('canvas', {
        className: 'qr-canvas'
      }) as HTMLCanvasElement;

      // Generate QR code with proper aspect ratio
      const dataUrl = this.getEffectiveUrl();
      await QRCode.toCanvas(this.qrCanvas, dataUrl, {
        width: this.qrOptions.size,
        margin: this.qrOptions.margin,
        color: {
          dark: this.qrOptions.foregroundColor,
          light: this.qrOptions.backgroundColor
        },
        errorCorrectionLevel: this.qrOptions.errorCorrectionLevel
      });

      // Ensure canvas maintains square aspect ratio in CSS
      this.qrCanvas.style.width = `${this.qrOptions.size}px`;
      this.qrCanvas.style.height = `${this.qrOptions.size}px`;
      this.qrCanvas.style.maxWidth = '100%';
      this.qrCanvas.style.height = 'auto';
      this.qrCanvas.style.aspectRatio = '1';

      this.qrContainer.appendChild(this.qrCanvas);

    } catch (error) {
      console.error('Failed to generate QR code:', error);
      this.showQRError('Failed to generate QR code. Please try again.');
    }
  }

  private showQRError(message: string): void {
    if (!this.qrContainer) return;
    
    this.qrContainer.innerHTML = '';
    const errorEl = createElement('div', { 
      className: 'qr-error',
      textContent: message
    });
    this.qrContainer.appendChild(errorEl);
  }

  private sanitizeFilename(title: string): string {
    // Remove or replace non-filesystem safe characters
    return title
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Remove invalid characters
      .replace(/\s+/g, '-') // Replace spaces with dashes
      .replace(/[^\w\-\.]/g, '') // Keep only word characters, dashes, and dots
      .replace(/-+/g, '-') // Replace multiple dashes with single dash
      .replace(/^-|-$/g, '') // Remove leading/trailing dashes
      .toLowerCase() || 'qr-code'; // Fallback if empty
  }

  private async downloadQRCode(format: 'png' | 'svg'): Promise<void> {
    try {
      const baseFilename = this.config.link.title
        ? this.sanitizeFilename(this.config.link.title)
        : `qr-${this.config.link.shortCode || 'code'}`;
      const filename = `${baseFilename}.${format}`;

      if (format === 'png') {
        if (!this.qrCanvas) {
          throw new Error('QR code not generated');
        }

        // Download PNG from canvas
        const link = createElement('a', {
          attributes: {
            href: this.qrCanvas.toDataURL('image/png'),
            download: filename
          }
        }) as HTMLAnchorElement;

        link.click();

      } else if (format === 'svg') {
        // Generate SVG
        const dataUrl = this.getEffectiveUrl();
        const svgString = await QRCode.toString(dataUrl, {
          type: 'svg',
          width: this.qrOptions.size,
          margin: this.qrOptions.margin,
          color: {
            dark: this.qrOptions.foregroundColor,
            light: this.qrOptions.backgroundColor
          },
          errorCorrectionLevel: this.qrOptions.errorCorrectionLevel
        });

        // Download SVG
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        const link = createElement('a', {
          attributes: {
            href: url,
            download: filename
          }
        }) as HTMLAnchorElement;

        link.click();
        URL.revokeObjectURL(url);
      }

      this.showSuccess(`QR code downloaded as ${filename}`);

    } catch (error) {
      console.error('Failed to download QR code:', error);
      this.showError('Failed to download QR code. Please try again.');
    }
  }
}
