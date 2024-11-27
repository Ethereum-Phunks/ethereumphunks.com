import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

import { Theme, ThemeProperties, ThemeStyles } from '@/models/theme';

/**
 * Service for managing application themes and styles
 */
@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  /**
   * Theme style configurations for dark and light modes
   * Contains color variables and other theme properties
   */
  themeStyles: ThemeStyles = {
    dark: {
      label: 'Dark',
      '--background': '0, 0, 0',
      '--text-color': '255, 255, 255',
      '--dark-text': '255, 255, 255',
      '--highlight': '195, 255, 0',
      '--button-color': '255, 4, 180',

      '--header-text': '255, 4, 180',
      '--header-highlight': '195, 255, 0',

      '--header-text-active': '0, 0, 0',
      '--header-highlight-active': '255, 4, 180'
    },
    light: {
      label: 'Light',
      '--background': '255, 4, 180',
      '--text-color': '0, 0, 0',
      '--dark-text': '0, 0, 0',
      '--highlight': '195, 255, 0',
      '--button-color': '0, 0, 0',

      '--header-text': '0, 0, 0',
      '--header-highlight': '255, 4, 180',

      '--header-text-active': '0, 0, 0',
      '--header-highlight-active': '255, 4, 180'
    }
  }

  /**
   * Initializes theme service and sets up system theme change listener
   * @param document Injected Document object for DOM manipulation
   */
  constructor(
    @Inject(DOCUMENT) private document: Document
  ) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      this.setThemeStyles(e.matches ? 'dark' : 'light');
    });
  }

  /**
   * Applies theme styles to the document
   * @param theme Theme to apply ('dark' or 'light')
   */
  setThemeStyles(theme: Theme) {
    const themeStyles = this.themeStyles[theme as keyof ThemeStyles];
    Object.keys(themeStyles).map((property: string) => {
      this.document.documentElement.style.setProperty(
        property as string,
        themeStyles[property as keyof ThemeProperties]
      );
    });
    this.document.body.dataset['theme'] = theme;
    localStorage.setItem('EtherPhunks_theme', theme);
  }

  /**
   * Gets the initial theme based on stored preference or system setting
   * @returns Theme to use initially ('dark' or 'light')
   */
  getInitialTheme(): Theme {
    let mode = localStorage.getItem('EtherPhunks_theme') as Theme | undefined;
    if (mode) return mode;

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  }
}
