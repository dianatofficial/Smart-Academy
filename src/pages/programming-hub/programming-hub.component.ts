
import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/gemini.service';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';

declare var marked: any;

@Component({
  selector: 'app-programming-hub',
  templateUrl: './programming-hub.component.html',
  imports: [FormsModule, SafeHtmlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgrammingHubComponent {
  private geminiService = inject(GeminiService);

  fields = ['دیتا ماینینگ', 'یادگیری ماشین', 'مهندسی برق', 'تحلیل‌های هوش مصنوعی', 'الگوریتم‌ها', 'رسم نمودار'];
  selectedField = signal(this.fields[0]);
  request = signal('');
  
  loading = signal(false);
  error = signal('');
  result = signal('');

  apiKeyError = this.geminiService.apiKeyError;

  async getAssistance() {
    if (!this.request() || this.loading()) return;

    this.loading.set(true);
    this.error.set('');
    this.result.set('');

    const systemInstruction = `شما یک مهندس نرم‌افزار ارشد و متخصص در حوزه "${this.selectedField()}" هستید. به درخواست زیر پاسخ دهید. کدها را در بلوک‌های کد Markdown ارائه دهید و توضیحات لازم را برای هر بخش از کد بنویسید. پاسخ شما باید کاملا فنی، دقیق و کاربردی باشد. زبان پاسخ فارسی باشد.`;

    try {
      const responseText = await this.geminiService.generateContent(this.request(), systemInstruction);
      this.result.set(marked.parse(responseText));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'یک خطای ناشناخته رخ داد.';
      this.error.set(errorMessage);
    } finally {
      this.loading.set(false);
    }
  }
}
