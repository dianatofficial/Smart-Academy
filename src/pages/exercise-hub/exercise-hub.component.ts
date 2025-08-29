
import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/gemini.service';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';

declare var marked: any;
declare var katex: any;

@Component({
  selector: 'app-exercise-hub',
  templateUrl: './exercise-hub.component.html',
  imports: [FormsModule, SafeHtmlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseHubComponent {
  private geminiService = inject(GeminiService);

  fields = ['فنی و مهندسی', 'علوم پایه', 'پزشکی و علوم وابسته', 'سایر رشته‌ها'];
  selectedField = signal(this.fields[0]);
  question = signal('');
  
  loading = signal(false);
  error = signal('');
  result = signal('');
  
  apiKeyError = this.geminiService.apiKeyError;

  async getSolution() {
    if (!this.question() || this.loading()) return;

    this.loading.set(true);
    this.error.set('');
    this.result.set('');

    const systemInstruction = `شما یک پروفسور دانشگاهی برجسته و صبور هستید. به سوال زیر که در حوزه "${this.selectedField()}" پرسیده شده، یک پاسخ کامل، دقیق و گام به گام ارائه دهید. تمام فرمول‌ها و عبارات ریاضی را با سینتکس LaTeX بنویسید. برای فرمول‌های بزرگ و در خط جداگانه از $$...$$ و برای فرمول‌های داخل متن از $...$ استفاده کنید. از تیترها، لیست‌ها و پاراگراف‌بندی مناسب برای خوانایی بهتر استفاده کنید. زبان پاسخ فارسی باشد.`;

    try {
      const responseText = await this.geminiService.generateContent(this.question(), systemInstruction);
      this.result.set(this.renderContent(responseText));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'یک خطای ناشناخته رخ داد.';
      this.error.set(errorMessage);
    } finally {
      this.loading.set(false);
    }
  }

  private renderContent(text: string): string {
    let processedText = text;
    try {
        // First, render LaTeX expressions to HTML strings.
        processedText = processedText.replace(/\$\$(.*?)\$\$/gs, (match, expression) => {
            return katex.renderToString(expression, { displayMode: true, throwOnError: false });
        });
        processedText = processedText.replace(/\$(.*?)\$/g, (match, expression) => {
            return katex.renderToString(expression, { displayMode: false, throwOnError: false });
        });

        // Then, parse the Markdown content which now includes HTML for math.
        return marked.parse(processedText);
    } catch (e) {
        console.error("Error rendering content:", e);
        return marked.parse(text); // Fallback to just markdown
    }
  }
}
