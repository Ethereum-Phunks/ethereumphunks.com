import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ImageService {

  constructor(private http: HttpClient) {}

  public fetchImageBlob(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob' });
  }

  public fetchImageBase64(url: string): Observable<string> {
    return this.http.get(url, { responseType: 'text' });
  }

  /**
   * Fetches an image by SHA and converts it to a blob URL
   * @param sha SHA hash of the image to fetch
   * @returns Promise resolving to the blob URL of the image
   */
  public async fetchSupportedImageBySha(sha: string): Promise<ArrayBuffer> {
    // console.log('fetchImageBySha', sha);
    const imageResponse = await fetch(environment.staticUrl + '/static/images/' + sha, {
      cache: 'force-cache',
      headers: {
        'Cache-Control': 'max-age=31536000' // 1 year
      }
    });
    const imageBuffer = await imageResponse.arrayBuffer();
    return imageBuffer;
  }
}
