import { Component, ChangeDetectionStrategy, signal, inject, computed } from '@angular/core';
import { GeminiService } from '../../services/gemini.service';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';

declare var marked: any;
declare var pdfjsLib: any;

type ExtractionMode = 'handwriting' | 'pdf' | 'audio' | 'video';

interface ModeConfig {
  title: string;
  icon: string;
  accept: string;
  supported: boolean;
  unsupportedMessage?: string;
}

@Component({
  selector: 'app-text-extraction-hub',
  templateUrl: './text-extraction-hub.component.html',
  imports: [SafeHtmlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextExtractionHubComponent {
  private geminiService = inject(GeminiService);

  modeConfigs: Record<ExtractionMode, ModeConfig> = {
    handwriting: {
      title: 'از جزوه دست‌نویس',
      icon: 'M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12A2.25 2.25 0 0120.25 20.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z',
      accept: 'image/*',
      supported: true
    },
    pdf: {
      title: 'از PDF',
      icon: 'M8 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8zM9 7h6v2H9V7zm0 4h6v2H9v-2zm0 4h3v2H9v-2z',
      accept: 'application/pdf',
      supported: true
    },
    audio: {
      title: 'از فایل صوتی',
      icon: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zm0 16a5 5 0 0 1-5-5H5a7 7 0 0 0 6 6.92V22h2v-2.08A7 7 0 0 0 19 12h-2a5 5 0 0 1-5 5z',
      accept: 'audio/*',
      supported: false,
      unsupportedMessage: 'استخراج متن از فایل‌های صوتی یک فرآیند پیچیده است که در حال حاضر توسط API سمت کاربر Gemini پشتیبانی نمی‌شود. ما در حال بررسی راهکارهای جایگزین برای ارائه این قابلیت در آینده هستیم.'
    },
    video: {
      title: 'از ویدئو',
      icon: 'M15 8v8H5V8h10m1-2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4V7a1 1 0 0 0-1-1z',
      accept: 'video/*',
      supported: false,
      unsupportedMessage: 'استخراج متن از فایل‌های ویدئویی نیازمند پردازش سنگین در سمت سرور است و در حال حاضر در این محیط قابل پیاده‌سازی نیست. از حالت‌های دیگر استفاده کنید.'
    }
  };
  
  mode = signal<ExtractionMode>('handwriting');
  
  selectedFile = signal<File | null>(null);
  selectedFileName = computed(() => this.selectedFile()?.name || '');
  imageBases64 = signal<string[]>([]);
  imagePreviewUrl = signal<string | null>(null);
  isDragging = signal(false);

  loading = signal(false);
  loadingMessage = signal('');
  error = signal('');
  result = signal('');
  
  apiKeyError = this.geminiService.apiKeyError;
  
  currentModeConfig = computed(() => this.modeConfigs[this.mode()]);
  isProcessingSupported = computed(() => this.currentModeConfig().supported);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.handleFile(file);
    }
  }

  private handleFile(file: File): void {
      this.resetStateBeforeUpload();

      if (!file.type.match(this.currentModeConfig().accept.replace('*', '.*'))) {
          this.error.set(`لطفا یک فایل از نوع ${this.currentModeConfig().accept} انتخاب کنید.`);
          return;
      }

      this.selectedFile.set(file);
      
      if (this.mode() === 'pdf') {
        this.handlePdfFile(file);
      } else if (this.mode() === 'handwriting') {
        this.handleImageFile(file);
      }
  }

  private handleImageFile(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
        const result = e.target?.result as string;
        this.imageBases64.set([result.split(',')[1]]);
        this.imagePreviewUrl.set(result);
    };
    reader.readAsDataURL(file);
  }

  private async handlePdfFile(file: File): Promise<void> {
    this.loading.set(true);
    this.loadingMessage.set('در حال آماده‌سازی کتابخانه PDF...');
    try {
      await this.ensurePdfJs();

      if (typeof pdfjsLib === 'undefined') {
        throw new Error('PDF.js library was not loaded correctly.');
      }
      
      const fileReader = new FileReader();
      
      fileReader.onload = async (e) => {
          try {
              const typedarray = new Uint8Array(e.target!.result as ArrayBuffer);
              const pdf = await pdfjsLib.getDocument(typedarray).promise;
              const numPages = pdf.numPages;
              const pageImages: string[] = [];
              const canvas = document.getElementById('pdf-canvas') as HTMLCanvasElement;
              const context = canvas.getContext('2d');

              if (!context) {
                throw new Error('امکان دسترسی به زمینه رندر فایل وجود ندارد.');
              }
              
              for (let i = 1; i <= numPages; i++) {
                this.loadingMessage.set(`درحال پردازش صفحه ${i} از ${numPages}...`);
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 });
                
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport: viewport }).promise;
                
                const dataUrl = canvas.toDataURL('image/jpeg');
                if (i === 1) {
                    this.imagePreviewUrl.set(dataUrl);
                }
                pageImages.push(dataUrl.split(',')[1]);
              }
              
              this.imageBases64.set(pageImages);
              this.loading.set(false);
          } catch (pdfError) {
              console.error('Error processing PDF file:', pdfError);
              this.error.set('خطا در پردازش فایل PDF. ممکن است فایل شما خراب یا ناسازگار باشد.');
              this.loading.set(false);
          }
      };
      
      fileReader.onerror = () => {
          this.error.set('خطا در خواندن فایل.');
          this.loading.set(false);
      };
      
      fileReader.readAsArrayBuffer(file);

    } catch (scriptError) {
        console.error('Error with PDF.js setup:', scriptError);
        this.error.set('خطا در بارگذاری یا اجرای کتابخانه مورد نیاز برای پردازش PDF.');
        this.loading.set(false);
    }
  }

  async extractText() {
    if (!this.selectedFile() || this.loading() || !this.isProcessingSupported() || this.imageBases64().length === 0) return;

    this.loading.set(true);
    this.loadingMessage.set('در حال ارسال داده‌ها به هوش مصنوعی...');
    this.error.set('');
    this.result.set('');

    const systemInstruction = this.getSystemInstruction();
    const prompt = this.imageBases64().length > 1 
      ? "این مجموعه ای از تصاویر صفحات یک سند است. لطفاً متن را از تمام صفحات به ترتیب استخراج کرده و آنها را در یک سند واحد و منسجم ترکیب کنید."
      : "لطفا محتوای این تصویر را استخراج کن.";
      
    const mimeType = 'image/jpeg';
    
    try {
        const imageParts = this.imageBases64().map(base64 => ({
            inlineData: { data: base64, mimeType: mimeType }
        }));
        
        const responseText = await this.geminiService.generateContent(prompt, systemInstruction, imageParts);
        this.result.set(marked.parse(responseText));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'یک خطای ناشناخته رخ داد.';
      this.error.set(errorMessage);
    } finally {
      this.loading.set(false);
      this.loadingMessage.set('');
    }
  }
  
  private getSystemInstruction(): string {
      switch(this.mode()) {
          case 'handwriting':
              return "شما یک هوش مصنوعی پیشرفته با تخصص ویژه در تحلیل و استخراج متن از دست‌نوشته‌های پیچیده هستید. وظیفه شما این است که متن تصویر زیر را با بالاترین دقت ممکن بازنویسی کنید. به جزئیات، علائم نگارشی و ساختار اصلی کاملاً وفادار بمانید. خروجی باید فقط و فقط متن استخراج شده باشد و با استفاده از Markdown فرمت‌بندی شود.";
          case 'pdf':
              return "شما یک متخصص استخراج متن (OCR) هستید. شما مجموعه‌ای از تصاویر را دریافت می‌کنید که صفحات متوالی یک سند هستند. متن، فرمول‌ها، جداول و ساختار کلی را از تمام صفحات با دقت استخراج کرده، به ترتیب صحیح ترکیب کنید و کل محتوا را با استفاده از Markdown به صورت یک سند واحد فرمت‌بندی نمایید.";
          default:
              return "متن را از تصویر ورودی استخراج کن.";
      }
  }

  setMode(newMode: ExtractionMode) {
      this.mode.set(newMode);
      this.resetStateBeforeUpload();
  }

  private resetStateBeforeUpload() {
    this.selectedFile.set(null);
    this.imageBases64.set([]);
    this.imagePreviewUrl.set(null);
    this.result.set('');
    this.error.set('');
    this.isDragging.set(false);
    this.loading.set(false);
    this.loadingMessage.set('');
  }

  getModeKeys(): ExtractionMode[] {
    return Object.keys(this.modeConfigs) as ExtractionMode[];
  }

  // --- Drag and Drop Handlers ---
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  // --- Dynamic Script Loading for PDF.js ---
  private loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${url}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
        document.head.appendChild(script);
    });
  }

  private async ensurePdfJs(): Promise<void> {
    if (typeof pdfjsLib !== 'undefined' && pdfjsLib.GlobalWorkerOptions.workerSrc) {
        return;
    }
    await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');

    if (typeof pdfjsLib === 'undefined') {
      throw new Error('pdf.js script failed to load.');
    }
    
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
  }
}
