
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  navLinks = [
    { path: '/exercise-hub', label: 'حل تمرین' },
    { path: '/text-extraction-hub', label: 'استخراج متن' },
    { path: '/programming-hub', label: 'برنامه‌نویسی' },
    { path: '/research-hub', label: 'دستیار پژوهش' }
  ];
}
