import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ImageService {

  constructor(private http: HttpClient) {}

  /**
   * Fetches an image by URL and returns it as a Blob
   * @param url URL of the image to fetch
   * @returns Observable resolving to the Blob of the image
   */
  public fetchImageBlob(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob' });
  }

  /**
   * Fetches an image by URL and returns it as a Base64 string
   * @param url URL of the image to fetch
   * @returns Observable resolving to the Base64 string of the image
   */
  public fetchImageBase64(url: string): Observable<string> {
    return this.http.get(url, { responseType: 'text' });
  }

  /**
   * Fetches an image by SHA and converts it to a blob URL
   * @param sha SHA hash of the image to fetch
   * @returns ArrayBuffer of the image
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
