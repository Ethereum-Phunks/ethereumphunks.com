import { Component, effect, input, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';

import { LazyLoadImageModule } from 'ng-lazyload-image';

import { Phunk } from '@/models/db';
import { Web3Service } from '@/services/web3.service';
import { fromHex } from 'viem';

/**
 * Mapping of MIME types to simple string types
 */
export const MIME_TYPE_MAP: Record<string, string> = {
  'text/plain': 'text',
  'text/html': 'html',
  'application/json': 'json',
  'message/vnd.tic+json': 'json',
  'image/png': 'image',
  'image/svg+xml': 'image',
  'image/jpg': 'image',
  'image/jpeg': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  '': 'text', // fallback for empty mimetype
};

/**
 * Type for the result of decodeDataURI
 */
export type DecodedData = {
  type: (typeof MIME_TYPE_MAP)[keyof typeof MIME_TYPE_MAP];
  mimeType: string;
  data: string;
};

@Component({
  selector: 'app-phunk-billboard',
  standalone: true,
  imports: [
    CommonModule,
    LazyLoadImageModule,
    RouterModule
  ],
  templateUrl: './phunk-billboard.component.html',
  styleUrls: ['./phunk-billboard.component.scss']
})
export class PhunkBillboardComponent {

  phunk = input.required<Phunk | null>();
  contentData = signal<DecodedData | null>(null);

  private blobUrl: string | null = null;

  constructor(
    private web3Svc: Web3Service,
    private sanitizer: DomSanitizer
  ) {
    effect(() => {
      const phunk = this.phunk();
      if (!phunk) return;

      untracked(() => {
        this.processImage(phunk);
      });
    });

    // Listen for resize messages from iframe
    window.addEventListener('message', this.handleIframeMessage.bind(this));
  }

  /**
   * Cleanup function that runs on component destroy
   * Revokes any blob URLs and removes event listeners
   */
  ngOnDestroy() {
    if (this.blobUrl) URL.revokeObjectURL(this.blobUrl);
    window.removeEventListener('message', this.handleIframeMessage.bind(this));
  }

  /**
   * Processes a phunk's image data from the blockchain
   * @param phunk The phunk object containing the hash ID
   */
  async processImage(phunk: Phunk | null) {
    const inscriptionTx = await this.web3Svc.getTransactionL1(phunk?.hashId as string);
    const txData = fromHex(inscriptionTx.input || inscriptionTx.data, 'string');
    const cleanData = txData.replace(/\x00/g, '').replace(/^0x/, '');
    this.contentData.set(this.decodeDataURI(cleanData));
  }

  /**
   * Decodes a data URI string into content type, mime type and data
   * Handles base64 encoded data and various content types
   * @param dataURI The data URI string to decode
   * @returns DecodedData object containing type, mimeType and processed data
   */
  decodeDataURI(dataURI: string): DecodedData {
    if (!dataURI) return { type: 'unsupported', mimeType: '', data: 'No Data URI' };
    if (dataURI.startsWith('https://')) return { type: 'url', mimeType: '', data: dataURI };

    const match = dataURI.match(/^data:([^;,]*)(;[^,]*)?,(.*)$/);
    if (!match) return { type: 'unsupported', mimeType: '', data: 'Invalid Data URI' };

    const mimeType = match[1] || '';
    const isBase64 = match[2]?.includes('base64');
    let data = match[3];

    const makeDataURI = (type: string, d: string, base64 = false) =>
      `data:${type}${base64 ? ';base64' : ''},${d}`;

    const mappedType = MIME_TYPE_MAP[mimeType] || 'unsupported';
    switch (mappedType) {
      case 'image':
        return { type: 'image', mimeType, data: makeDataURI(mimeType, data, isBase64) };
      case 'video':
        return { type: 'video', mimeType, data: makeDataURI(mimeType, data, isBase64) };
      case 'html':
        try {
          const decoded = isBase64 ? atob(data) : decodeURIComponent(data);
          // Inject responsive script and centering styles into the HTML
          const injectContent = `
            <style>
              html, body {
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                width: 100%;
                background: none;
              }
              body > * {
                margin: 0 auto;
                max-width: 100%;
              }
            </style>
            <script>
              (function() {
                function updateParent() {
                  const height = document.documentElement.scrollHeight;
                  window.parent.postMessage({ type: 'resize', height: height }, '*');
                }

                function setupObserver() {
                  if (document.body) {
                    // Update on load
                    window.addEventListener('load', updateParent);

                    // Setup observer once body is available
                    const observer = new MutationObserver(updateParent);
                    observer.observe(document.body, {
                      childList: true,
                      subtree: true
                    });
                  } else {
                    // If body is not yet available, wait and try again
                    setTimeout(setupObserver, 10);
                  }
                }

                // Start the setup process
                setupObserver();
              })();
            </script>
          `;
          const enhancedHTML = decoded.includes('</head>')
            ? decoded.replace('</head>', `${injectContent}</head>`)
            : `<head>${injectContent}</head>${decoded}`;

          return { type: 'html', mimeType, data: this.sanitizer.bypassSecurityTrustHtml(enhancedHTML) as string };
        } catch (error) {
          console.error('Error processing HTML content:', error);
          return { type: 'unsupported', mimeType, data: 'Error processing HTML content' };
        }
      case 'json':
        try {
          const decoded = isBase64 ? atob(data) : decodeURIComponent(data);
          const json = JSON.parse(decoded);
          return { type: 'json', mimeType, data: JSON.stringify(json, null, 2) };
        } catch {
          return { type: 'unsupported', mimeType, data: 'Error parsing JSON' };
        }
      case 'text':
        try {
          const decoded = isBase64 ? atob(data) : decodeURIComponent(data);
          return { type: 'text', mimeType, data: decoded };
        } catch {
          return { type: 'unsupported', mimeType, data: 'Error decoding text' };
        }
      default:
        return { type: 'unsupported', mimeType, data: `Unsupported MIME type: ${mimeType}` };
    }
  }

  /**
   * Handles resize messages from the iframe content
   * @param event MessageEvent containing resize data
   */
  private handleIframeMessage(event: MessageEvent) {
    if (event.data?.type === 'resize') {
      const wrapper = document.querySelector('.html-wrapper') as HTMLElement;
      if (wrapper) {
        // wrapper.style.height = `${event.data.height}px`;
        // wrapper.style.paddingBottom = '0';
      }
    }
  }
}
