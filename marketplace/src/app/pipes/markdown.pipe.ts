import { Pipe, PipeTransform } from '@angular/core';
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  standalone: true,
  name: 'markdown'
})
export class MarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {
    // Configure marked options
    marked.setOptions({
      breaks: true, // Adds <br> on single line breaks
      gfm: true     // GitHub Flavored Markdown
    });
  }

  transform(value: string): SafeHtml {
    if (!value) return '';

    // Convert markdown to HTML and ensure we get a string
    const html = marked.parse(value).toString();

    // Sanitize the HTML to prevent XSS attacks
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
