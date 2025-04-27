import { Injectable } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { HttpService } from '@nestjs/axios';

import { catchError, firstValueFrom, map } from 'rxjs';
import FormData from 'form-data';

/**
 * Service for sending messages and photos to Telegram using the Telegram Bot API
 */
@Injectable()
export class TelegramService {

  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN;
  private readonly chatId = '-1002530066767';

  constructor(
    private http: HttpService
  ) {
    // setInterval(() => {
    //   this.sendMessage('Status:', 'Hello, world!');
    // }, 10000);
  }

  /**
   * Sends a text message to the configured Telegram chat
   * @param message The text message to send
   * @returns Promise resolving to the Telegram API response
   */
  async sendMessage(prefix: string, message: string): Promise<void> {
    const apiUrl = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    const params = {
      chat_id: this.chatId,
      text: `${prefix}\n\n${message}`,
      parse_mode: 'HTML',
    };

    try {
      await firstValueFrom(
        this.http.post(apiUrl, params).pipe(
          map((response) => response.data),
          catchError((error) => {
            console.log(error);
            return error;
          }),
        )
      );
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Sends a photo with optional caption to the configured Telegram chat
   * @param image Buffer containing the image data to send
   * @param caption Optional text caption to include with the photo
   * @returns Promise resolving to the Telegram API response
   */
  async sendPhoto(image: Buffer, caption?: string): Promise<AxiosResponse> {
    const apiUrl = `https://api.telegram.org/bot${this.botToken}/sendPhoto`;

    const formData = new FormData();
    formData.append('chat_id', this.chatId);
    formData.append('photo', image);
    if (caption) {
      formData.append('caption', caption);
    }

    return await firstValueFrom(
      this.http.post(apiUrl, formData, {
        headers: formData.getHeaders(),
      }).pipe(
        map((response) => response.data),
        catchError((error) => {
          console.log(error);
          return error;
        }),
      )
    );
  }
}
