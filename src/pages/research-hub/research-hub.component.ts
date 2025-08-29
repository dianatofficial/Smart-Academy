
import { Component, ChangeDetectionStrategy, signal, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/gemini.service';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';
import type { GroundingChunk } from '@google/genai';

declare var marked: any;
type ResearchMode = 'literature-review' | 'summarizer' | 'paraphraser' | 'proposal';

@Component({
  selector: 'app-research-hub',
  templateUrl: './research-hub.component.html',
  imports: [FormsModule, SafeHtmlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResearchHubComponent {
  private geminiService = inject(GeminiService);

  mode = signal<ResearchMode>('literature-review');
  topic = signal('');
  
  loading = signal(false);
  error = signal('');
  result = signal('');
  sources = signal<GroundingChunk[]>([]);

  apiKeyError = this.geminiService.apiKeyError;
  isModeImplemented = computed(() => this.mode() === 'literature-review');

  async getLiteratureReview() {
    if (!this.topic() || this.loading() || !this.isModeImplemented()) return;

    this.loading.set(true);
    this.error.set('');
    this.result.set('');
    this.sources.set([]);

    const systemInstruction = "شما یک دستیار پژوهشی متخصص هستید. بر اساس موضوع خواسته شده، یک مرور ادبیات جامع و مختصر ارائه دهید. جدیدترین مقالات مرتبط را بیابید، آن‌ها را خلاصه کنید و شکاف‌های پژوهشی موجود را مشخص نمایید. پاسخ شما باید کاملا علمی، موثق و به روز باشد. زبان پاسخ فارسی باشد.";
    const prompt = `مرور ادبیات برای موضوع: "${this.topic()}"`;

    try {
      const response = await this.geminiService.generateWithGoogleSearch(prompt, systemInstruction);
      this.result.set(marked.parse(response.text));
      const metadata = response.candidates?.[0]?.groundingMetadata;
      if (metadata?.groundingChunks) {
        this.sources.set(metadata.groundingChunks);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'یک خطای ناشناخته رخ داد.';
      this.error.set(errorMessage);
    } finally {
      this.loading.set(false);
    }
  }
  
  setMode(newMode: ResearchMode) {
      this.mode.set(newMode);
      this.topic.set('');
      this.result.set('');
      this.sources.set([]);
      this.error.set('');
  }
}
